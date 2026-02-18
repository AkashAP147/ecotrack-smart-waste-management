import { Request, Response } from 'express';
import mongoose from 'mongoose';
import path from 'path';
import Report, { IReport } from '../models/Report';
import Image from '../models/Image';
import User from '../models/User';
import PickupLog from '../models/PickupLog';
import { uploadToS3 } from '../services/s3';
import { predictWasteType } from '../services/ml_stub';
import { sendNotificationToDevice, NotificationTemplates } from '../services/fcm';
import config from '../config';

/**
 * Create new waste report
 */
export const createReport = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { lat, lng, description, wasteType, urgency, address, estimatedQuantity } = req.body;

    // Reverse geocode if address is missing or empty
    let resolvedAddress = address;
    if ((!address || address.trim() === '') && lat && lng) {
      try {
        const fetch = (await import('node-fetch')).default;
        const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
        const geoData = await geoRes.json();
        if (geoData && geoData.display_name) {
          resolvedAddress = geoData.display_name;
        } else if (geoData && (geoData.locality || geoData.city)) {
          resolvedAddress = [
            geoData.locality || geoData.city,
            geoData.principalSubdivision,
            geoData.countryName
          ].filter(Boolean).join(', ');
        }
      } catch (geoError) {
        console.warn('Reverse geocoding failed:', geoError);
      }
    }
    const photo = req.file;

    if (!photo) {
      return res.status(400).json({
        success: false,
        message: 'Photo is required',
      });
    }

    // Generate filename for memory storage
    const filename = photo.originalname || `report-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(photo.originalname)}`;

    // Predict waste type using ML stub
    let predictedType = wasteType || 'other';
    let confidence = 0;

    try {
      const prediction = await predictWasteType(filename, photo.buffer);
      if (prediction.confidence > 0.5) {
        predictedType = prediction.predictedType;
        confidence = prediction.confidence;
      }
    } catch (mlError) {
      console.warn('ML prediction failed:', mlError);
    }

    // Store image as Buffer in MongoDB and also save to local disk
    const fs = require('fs');
    const uploadsDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }
    const localPath = path.join(uploadsDir, filename);
    fs.writeFileSync(localPath, photo.buffer);

    // Save image buffer in Image collection
    // Save image buffer in manually created 'image' collection
    const imageDoc = await Image.create({
      buffer: photo.buffer,
      contentType: photo.mimetype,
    });

    const report = new Report({
      user: user._id,
      photo: filename,
      imageId: imageDoc._id,
      photoContentType: photo.mimetype,
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)],
      },
      address: resolvedAddress,
      wasteType: predictedType,
      predictedType,
      confidence,
      description,
      urgency: urgency || 'medium',
      estimatedQuantity,
      photoUrl: `/uploads/${filename}`,
    });

    await report.save();

    // Populate user details
    await report.populate('user', 'name email phone');

    // Send notification to admins for urgent reports
    if (urgency === 'critical' || urgency === 'high') {
      try {
        const admins = await User.find({ role: 'admin', fcmToken: { $exists: true, $ne: null } });
        const notification = NotificationTemplates.urgentReport(address || `${lat}, ${lng}`);
        
        for (const admin of admins) {
          if (admin.fcmToken) {
            await sendNotificationToDevice(admin.fcmToken, notification);
          }
        }
      } catch (notificationError) {
        console.warn('Failed to send urgent report notification:', notificationError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: {
        report,
      },
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating report',
    });
  }
};

/**
 * Get reports with filtering and pagination
 */
export const getReports = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Only admins and collectors can view all reports
    if (user.role !== 'admin' && user.role !== 'collector') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins and collectors can view all reports.',
      });
    }

    const {
      status,
      wasteType,
      urgency,
      area,
      lat,
      lng,
      radius = 5000,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query: any = {};

    if (status) query.status = status;
    if (wasteType) query.wasteType = wasteType;
    if (urgency) query.urgency = urgency;

    // Location-based filtering
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng as string), parseFloat(lat as string)],
          },
          $maxDistance: parseInt(radius as string),
        },
      };
    }

    // Area-based filtering (simple text search in address)
    if (area) {
      query.address = { $regex: area, $options: 'i' };
    }

    // For collectors, only show assigned reports
    if (user.role === 'collector') {
      query.assignedCollector = user._id;
    }

    // Pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const sortOptions: any = {};
    sortOptions[sortBy as string] = sortOrder === 'asc' ? 1 : -1;

    // Execute query
    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('user', 'name email phone')
        .populate('assignedCollector', 'name email phone')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit as string)),
      Report.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit as string));

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          currentPage: parseInt(page as string),
          totalPages,
          totalReports: total,
          hasNextPage: parseInt(page as string) < totalPages,
          hasPrevPage: parseInt(page as string) > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching reports',
    });
  }
};

/**
 * Get user's own reports
 */
export const getMyReports = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { page = 1, limit = 10, status } = req.query;

    // Build query
    const query: any = { user: user._id };
    if (status) query.status = status;

    // Pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Execute query
    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('assignedCollector', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      Report.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit as string));

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          currentPage: parseInt(page as string),
          totalPages,
          totalReports: total,
          hasNextPage: parseInt(page as string) < totalPages,
          hasPrevPage: parseInt(page as string) > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get my reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching your reports',
    });
  }
};

/**
 * Get single report by ID
 */
export const getReportById = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID',
      });
    }

    const report = await Report.findById(id)
      .populate('user', 'name email phone')
      .populate('assignedCollector', 'name email phone');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Check permissions
    const canView = 
      user.role === 'admin' ||
      user._id.toString() === report.user._id.toString() ||
      (user.role === 'collector' && report.assignedCollector?.toString() === user._id.toString());

    if (!canView) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: {
        report,
      },
    });
  } catch (error) {
    console.error('Get report by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching report',
    });
  }
};

/**
 * Assign collector to report (Admin only)
 */
export const assignCollector = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { collectorId } = req.body;

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(collectorId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID or collector ID',
      });
    }

    // Find report
    const report = await Report.findById(id).populate('user', 'name email phone fcmToken');
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Find collector
    const collector = await User.findById(collectorId);
    if (!collector || collector.role !== 'collector') {
      return res.status(400).json({
        success: false,
        message: 'Invalid collector or user is not a collector',
      });
    }

    // Update report
    report.assignedCollector = collector._id;
    report.status = 'assigned';
    report.assignedAt = new Date();
    await report.save();

    // Send notification to user
    try {
      if ((report.user as any).fcmToken) {
        const notification = NotificationTemplates.reportAssigned(collector.name);
        await sendNotificationToDevice((report.user as any).fcmToken, notification);
      }
    } catch (notificationError) {
      console.warn('Failed to send assignment notification:', notificationError);
    }

    // Send notification to collector
    try {
      if (collector.fcmToken) {
        const notification = NotificationTemplates.newAssignment(1);
        await sendNotificationToDevice(collector.fcmToken, notification);
      }
    } catch (notificationError) {
      console.warn('Failed to send collector notification:', notificationError);
    }

    await report.populate('assignedCollector', 'name email phone');

    res.json({
      success: true,
      message: 'Collector assigned successfully',
      data: {
        report,
      },
    });
  } catch (error) {
    console.error('Assign collector error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while assigning collector',
    });
  }
};

/**
 * Update report status
 */
export const updateReportStatus = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { status, collectorNotes, adminNotes, actualQuantity, wasteTypeConfirmed } = req.body;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID',
      });
    }

    const report = await Report.findById(id).populate('user', 'name email phone fcmToken');
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Check permissions
    const canUpdate = 
      user.role === 'admin' ||
      (user.role === 'collector' && report.assignedCollector?.toString() === user._id.toString());

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Update report
    report.status = status;
    if (collectorNotes !== undefined) report.collectorNotes = collectorNotes;
    if (adminNotes !== undefined) report.adminNotes = adminNotes;
    if (actualQuantity !== undefined) report.actualQuantity = actualQuantity;
    if (wasteTypeConfirmed !== undefined) report.wasteType = wasteTypeConfirmed;

    await report.save();

    // Create pickup log for status changes by collectors
    if (user.role === 'collector' && (status === 'in_progress' || status === 'collected')) {
      try {
        const existingLog = await PickupLog.findOne({ report: report._id, collector: user._id });
        
        if (!existingLog && status === 'in_progress') {
          await new PickupLog({
            report: report._id,
            collector: user._id,
            startTime: new Date(),
            status: 'started',
          }).save();
        } else if (existingLog && status === 'collected') {
          existingLog.status = 'completed';
          existingLog.endTime = new Date();
          existingLog.actualQuantity = actualQuantity;
          existingLog.wasteTypeConfirmed = wasteTypeConfirmed;
          existingLog.notes = collectorNotes;
          await existingLog.save();
        }
      } catch (logError) {
        console.warn('Failed to create pickup log:', logError);
      }
    }

    // Send notification to user for status updates
    try {
      if ((report.user as any).fcmToken && status === 'collected') {
        const notification = NotificationTemplates.reportCollected();
        await sendNotificationToDevice((report.user as any).fcmToken, notification);
      }
    } catch (notificationError) {
      console.warn('Failed to send status update notification:', notificationError);
    }

    res.json({
      success: true,
      message: 'Report status updated successfully',
      data: {
        report,
      },
    });
  } catch (error) {
    console.error('Update report status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating report status',
    });
  }
};

/**
 * Delete report (Admin only)
 */
export const deleteReport = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID',
      });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Delete associated pickup logs
    await PickupLog.deleteMany({ report: report._id });

    // Delete report
    await Report.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Report deleted successfully',
    });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting report',
    });
  }
};

/**
 * Get report statistics
 */
export const getReportStatistics = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    let matchStage: any = {};

    // Filter based on user role
    if (user.role === 'collector') {
      matchStage.assignedCollector = new mongoose.Types.ObjectId(user._id);
    } else if (user.role === 'user') {
      matchStage.user = new mongoose.Types.ObjectId(user._id);
    }
    // Admin can see all statistics

    const stats = await Report.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          pendingReports: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          assignedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] }
          },
          inProgressReports: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
          },
          collectedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'collected'] }, 1, 0] }
          },
          resolvedReports: {
            $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
          },
          criticalReports: {
            $sum: { $cond: [{ $eq: ['$urgency', 'critical'] }, 1, 0] }
          },
          highUrgencyReports: {
            $sum: { $cond: [{ $eq: ['$urgency', 'high'] }, 1, 0] }
          },
        }
      }
    ]);

    const wasteTypeStats = await Report.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$wasteType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {
          totalReports: 0,
          pendingReports: 0,
          assignedReports: 0,
          inProgressReports: 0,
          collectedReports: 0,
          resolvedReports: 0,
          criticalReports: 0,
          highUrgencyReports: 0,
        },
        wasteTypeDistribution: wasteTypeStats,
      },
    });
  } catch (error) {
    console.error('Get report statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching statistics',
    });
  }
};
