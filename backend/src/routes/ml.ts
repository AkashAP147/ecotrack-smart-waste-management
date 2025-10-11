import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import {
  predictWaste,
  batchPredictWaste,
  getModelInformation,
  predictFromUrl,
  getConfidenceThresholds,
  getSupportedWasteTypes,
  mlHealthCheck,
} from '../controllers/mlController';
import { optionalAuth } from '../middleware/auth';
import config from '../config';

const router = Router();

// Configure multer for ML predictions (memory storage for temporary processing)
const storage = multer.memoryStorage();

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
    files: 10, // Allow up to 10 files for batch processing
  },
});

/**
 * @route   POST /api/ml/predict
 * @desc    Predict waste type from uploaded image
 * @access  Public (with optional auth for rate limiting)
 */
router.post('/predict', optionalAuth, upload.single('image'), predictWaste);

/**
 * @route   POST /api/ml/predict/batch
 * @desc    Batch predict waste types from multiple images
 * @access  Public (with optional auth for rate limiting)
 */
router.post('/predict/batch', optionalAuth, upload.array('images', 10), batchPredictWaste);

/**
 * @route   POST /api/ml/predict/url
 * @desc    Predict waste type from image URL
 * @access  Public (with optional auth for rate limiting)
 */
router.post('/predict/url', optionalAuth, predictFromUrl);

/**
 * @route   GET /api/ml/model
 * @desc    Get ML model information
 * @access  Public
 */
router.get('/model', getModelInformation);

/**
 * @route   GET /api/ml/thresholds
 * @desc    Get confidence thresholds
 * @access  Public
 */
router.get('/thresholds', getConfidenceThresholds);

/**
 * @route   GET /api/ml/waste-types
 * @desc    Get supported waste types
 * @access  Public
 */
router.get('/waste-types', getSupportedWasteTypes);

/**
 * @route   GET /api/ml/health
 * @desc    Health check for ML service
 * @access  Public
 */
router.get('/health', mlHealthCheck);

export default router;
