import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Report from '../models/Report';
import PickupLog from '../models/PickupLog';
import { optimizeRouteNearestFirst, getRouteStatistics } from '../services/scheduler';

/**
 * Get optimized route for collector
 */
export const getCollectorRoute = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { startLat, startLng } = req.query;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check if user is the collector or admin
    if (user.role !== 'admin' && user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own route.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collector ID',
      });
    }

    // Verify collector exists
    const collector = await User.findById(id);
    if (!collector || collector.role !== 'collector') {
      return res.status(404).json({
        success: false,
        message: 'Collector not found',
      });
    }

    // Get optimized route
    const route = await optimizeRouteNearestFirst(
      id,
      startLat ? parseFloat(startLat as string) : undefined,
      startLng ? parseFloat(startLng as string) : undefined
    );

    // Get route statistics
    const stats = await getRouteStatistics(id);

    res.json({
      success: true,
      data: {
        collector: {
          id: collector._id,
          name: collector.name,
          email: collector.email,
          phone: collector.phone,
        },
        route,
        statistics: stats,
      },
    });
  } catch (error) {
    console.error('Get collector route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching route',
    });
  }
};

/**
 * Get all collectors
 */
export const getCollectors = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const { page = 1, limit = 10, isActive } = req.query;

    // Build query
    const query: any = { role: 'collector' };
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Get collectors with their statistics
    const collectors = await User.find(query)
      .select('-password -refreshTokens')
      .skip(skip)
      .limit(parseInt(limit as string))
      .sort({ createdAt: -1 });

    // Get statistics for each collector
    const collectorsWithStats = await Promise.all(
      collectors.map(async (collector) => {
        const stats = await getRouteStatistics(collector._id.toString());
        return {
          ...collector.toJSON(),
          statistics: stats,
        };
      })
    );

    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit as string));

    res.json({
      success: true,
      data: {
        collectors: collectorsWithStats,
        pagination: {
          currentPage: parseInt(page as string),
          totalPages,
          totalCollectors: total,
          hasNextPage: parseInt(page as string) < totalPages,
          hasPrevPage: parseInt(page as string) > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get collectors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching collectors',
    });
  }
};

/**
 * Get collector by ID
 */
export const getCollectorById = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { id } = req.params;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check permissions
    if (user.role !== 'admin' && user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collector ID',
      });
    }

    const collector = await User.findById(id).select('-password -refreshTokens');
    if (!collector || collector.role !== 'collector') {
      return res.status(404).json({
        success: false,
        message: 'Collector not found',
      });
    }

    // Get collector statistics
    const stats = await getRouteStatistics(id);

    // Get recent pickup logs
    const recentPickups = await PickupLog.find({ collector: id })
      .populate('report', 'description location wasteType urgency')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        collector: collector.toJSON(),
        statistics: stats,
        recentPickups,
      },
    });
  } catch (error) {
    console.error('Get collector by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching collector',
    });
  }
};

/**
 * Update collector status (Admin only)
 */
export const updateCollectorStatus = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { isActive } = req.body;

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collector ID',
      });
    }

    const collector = await User.findById(id);
    if (!collector || collector.role !== 'collector') {
      return res.status(404).json({
        success: false,
        message: 'Collector not found',
      });
    }

    collector.isActive = isActive;
    await collector.save();

    // If deactivating collector, unassign their pending reports
    if (!isActive) {
      await Report.updateMany(
        { 
          assignedCollector: id, 
          status: { $in: ['assigned', 'in_progress'] } 
        },
        { 
          $unset: { assignedCollector: 1, assignedAt: 1 },
          $set: { status: 'pending' }
        }
      );
    }

    res.json({
      success: true,
      message: `Collector ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        collector: collector.toJSON(),
      },
    });
  } catch (error) {
    console.error('Update collector status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating collector status',
    });
  }
};

/**
 * Get collector pickup history
 */
export const getCollectorPickupHistory = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { page = 1, limit = 10, status, startDate, endDate } = req.query;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Check permissions
    if (user.role !== 'admin' && user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid collector ID',
      });
    }

    // Build query
    const query: any = { collector: id };
    if (status) query.status = status;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    // Pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [pickupLogs, total] = await Promise.all([
      PickupLog.find(query)
        .populate('report', 'description location wasteType urgency user')
        .populate('collector', 'name email phone')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
      PickupLog.countDocuments(query),
    ]);

    const totalPages = Math.ceil(total / parseInt(limit as string));

    res.json({
      success: true,
      data: {
        pickupHistory: pickupLogs,
        pagination: {
          currentPage: parseInt(page as string),
          totalPages,
          totalPickups: total,
          hasNextPage: parseInt(page as string) < totalPages,
          hasPrevPage: parseInt(page as string) > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get collector pickup history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching pickup history',
    });
  }
};

/**
 * Start pickup (Collector only)
 */
export const startPickup = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { reportId } = req.body;

    if (!user || user.role !== 'collector') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Collector role required.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(reportId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid report ID',
      });
    }

    // Find report
    const report = await Report.findById(reportId);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Check if collector is assigned to this report
    if (report.assignedCollector?.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this report',
      });
    }

    // Check if pickup already started
    const existingLog = await PickupLog.findOne({ 
      report: reportId, 
      collector: user._id 
    });

    if (existingLog) {
      return res.status(400).json({
        success: false,
        message: 'Pickup already started for this report',
      });
    }

    // Create pickup log
    const pickupLog = new PickupLog({
      report: reportId,
      collector: user._id,
      startTime: new Date(),
      status: 'started',
    });

    await pickupLog.save();

    // Update report status
    report.status = 'in_progress';
    await report.save();

    await pickupLog.populate('report', 'description location wasteType urgency');

    res.json({
      success: true,
      message: 'Pickup started successfully',
      data: {
        pickupLog,
      },
    });
  } catch (error) {
    console.error('Start pickup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while starting pickup',
    });
  }
};

/**
 * Complete pickup (Collector only)
 */
export const completePickup = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { actualQuantity, wasteTypeConfirmed, notes } = req.body;

    if (!user || user.role !== 'collector') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Collector role required.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pickup log ID',
      });
    }

    // Find pickup log
    const pickupLog = await PickupLog.findById(id).populate('report');
    if (!pickupLog) {
      return res.status(404).json({
        success: false,
        message: 'Pickup log not found',
      });
    }

    // Check if collector owns this pickup
    if (pickupLog.collector.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only complete your own pickups',
      });
    }

    // Update pickup log
    pickupLog.status = 'completed';
    pickupLog.endTime = new Date();
    pickupLog.actualQuantity = actualQuantity;
    pickupLog.wasteTypeConfirmed = wasteTypeConfirmed;
    pickupLog.notes = notes;
    await pickupLog.save();

    // Update report
    const report = await Report.findById(pickupLog.report);
    if (report) {
      report.status = 'collected';
      report.collectedAt = new Date();
      report.actualQuantity = actualQuantity;
      if (wasteTypeConfirmed) report.wasteType = wasteTypeConfirmed;
      report.collectorNotes = notes;
      await report.save();
    }

    res.json({
      success: true,
      message: 'Pickup completed successfully',
      data: {
        pickupLog,
      },
    });
  } catch (error) {
    console.error('Complete pickup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while completing pickup',
    });
  }
};

/**
 * Get collector dashboard data
 */
export const getCollectorDashboard = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user || user.role !== 'collector') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Collector role required.',
      });
    }

    // Get statistics
    const stats = await getRouteStatistics(user._id.toString());

    // Get today's assigned reports
    const todayReports = await Report.find({
      assignedCollector: user._id,
      status: { $in: ['assigned', 'in_progress'] },
    })
    .populate('user', 'name phone')
    .sort({ urgency: -1, createdAt: 1 })
    .limit(10);

    // Get recent completed pickups
    const recentPickups = await PickupLog.find({
      collector: user._id,
      status: 'completed',
    })
    .populate('report', 'description wasteType')
    .sort({ endTime: -1 })
    .limit(5);

    res.json({
      success: true,
      data: {
        statistics: stats,
        todayReports,
        recentPickups,
      },
    });
  } catch (error) {
    console.error('Get collector dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching dashboard data',
    });
  }
};
