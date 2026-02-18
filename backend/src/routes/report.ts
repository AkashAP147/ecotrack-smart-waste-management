/**
 * @route   GET /api/report/image/:id
 * @desc    Get report image by report ID
 * @access  Private (must be authenticated)
 */
import Report from '../models/Report';
router.get('/image/:id', authenticate, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report || !report.photoData || !report.photoContentType) {
      return res.status(404).send('Image not found');
    }
    res.set('Content-Type', report.photoContentType);
    res.send(report.photoData);
  } catch (err) {
    res.status(500).send('Error retrieving image');
  }
});
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  createReport,
  getReports,
  getMyReports,
  getReportById,
  assignCollector,
  updateReportStatus,
  deleteReport,
  getReportStatistics,
} from '../controllers/reportController';
import { authenticate, requireAdmin, requireAdminOrCollector } from '../middleware/auth';
import { validate, validateQuery } from '../utils/validators';
import {
  createReportSchema,
  updateReportStatusSchema,
  assignCollectorSchema,
  reportQuerySchema,
} from '../utils/validators';
import config from '../config';

const router = Router();

// Configure multer for file uploads
// Use memory storage for serverless environments
const isServerless = process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Always use memory storage for uploads so images are available as buffers for DB storage
const storage: multer.StorageEngine = multer.memoryStorage();

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize, // 5MB
    files: 1,
  },
});

/**
 * @route   POST /api/report
 * @desc    Create new waste report
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  upload.single('photo'),
  validate(createReportSchema),
  createReport
);

/**
 * @route   GET /api/report
 * @desc    Get all reports with filtering (Admin/Collector only)
 * @access  Private (Admin/Collector)
 */
router.get(
  '/',
  authenticate,
  requireAdminOrCollector,
  validateQuery(reportQuerySchema),
  getReports
);

/**
 * @route   GET /api/report/me
 * @desc    Get current user's reports
 * @access  Private
 */
router.get('/me', authenticate, getMyReports);

/**
 * @route   GET /api/report/statistics
 * @desc    Get report statistics
 * @access  Private
 */
router.get('/statistics', authenticate, getReportStatistics);

/**
 * @route   GET /api/report/:id
 * @desc    Get single report by ID
 * @access  Private
 */
router.get('/:id', authenticate, getReportById);

/**
 * @route   PUT /api/report/:id/assign
 * @desc    Assign collector to report
 * @access  Private (Admin only)
 */
router.put(
  '/:id/assign',
  authenticate,
  requireAdmin,
  validate(assignCollectorSchema),
  assignCollector
);

/**
 * @route   PUT /api/report/:id/status
 * @desc    Update report status
 * @access  Private (Admin/Collector)
 */
router.put(
  '/:id/status',
  authenticate,
  requireAdminOrCollector,
  validate(updateReportStatusSchema),
  updateReportStatus
);

/**
 * @route   DELETE /api/report/:id
 * @desc    Delete report
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, requireAdmin, deleteReport);

export default router;
