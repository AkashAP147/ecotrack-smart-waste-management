import { Request, Response } from 'express';
import { predictWasteType, batchPredictWasteType, getModelInfo, validatePrediction } from '../services/ml_stub';

/**
 * Predict waste type from uploaded image
 */
export const predictWaste = async (req: Request, res: Response) => {
  try {
    const photo = req.file;

    if (!photo) {
      return res.status(400).json({
        success: false,
        message: 'Image file is required',
      });
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(photo.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.',
      });
    }

    // Predict waste type
    const prediction = await predictWasteType(photo.filename, photo.buffer);
    
    // Validate prediction confidence
    const validation = validatePrediction(prediction);

    res.json({
      success: true,
      data: {
        prediction: {
          predictedType: prediction.predictedType,
          confidence: prediction.confidence,
          alternatives: prediction.alternatives,
        },
        validation,
        metadata: {
          filename: photo.filename,
          fileSize: photo.size,
          mimeType: photo.mimetype,
        },
      },
    });
  } catch (error) {
    console.error('ML prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during waste type prediction',
    });
  }
};

/**
 * Batch predict waste types from multiple images
 */
export const batchPredictWaste = async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one image file is required',
      });
    }

    if (files.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 files allowed per batch',
      });
    }

    // Validate file types
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const invalidFiles = files.filter(file => !allowedMimeTypes.includes(file.mimetype));
    
    if (invalidFiles.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some files have invalid types. Only JPEG, PNG, GIF, and WebP images are allowed.',
        invalidFiles: invalidFiles.map(file => file.filename),
      });
    }

    // Prepare files for prediction
    const fileData = files.map(file => ({
      filename: file.filename,
      buffer: file.buffer,
    }));

    // Batch predict
    const predictions = await batchPredictWasteType(fileData);

    // Validate predictions and combine with metadata
    const results = predictions.map((prediction, index) => {
      const file = files[index];
      const validation = validatePrediction(prediction);

      return {
        filename: file.filename,
        prediction: {
          predictedType: prediction.predictedType,
          confidence: prediction.confidence,
          alternatives: prediction.alternatives,
        },
        validation,
        metadata: {
          fileSize: file.size,
          mimeType: file.mimetype,
        },
      };
    });

    res.json({
      success: true,
      data: {
        results,
        summary: {
          totalFiles: files.length,
          averageConfidence: predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length,
          highConfidencePredictions: predictions.filter(p => p.confidence >= 0.8).length,
          lowConfidencePredictions: predictions.filter(p => p.confidence < 0.4).length,
        },
      },
    });
  } catch (error) {
    console.error('Batch ML prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during batch waste type prediction',
    });
  }
};

/**
 * Get ML model information
 */
export const getModelInformation = async (req: Request, res: Response) => {
  try {
    const modelInfo = getModelInfo();

    res.json({
      success: true,
      data: {
        model: modelInfo,
      },
    });
  } catch (error) {
    console.error('Get model info error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching model information',
    });
  }
};

/**
 * Predict waste type from image URL
 */
export const predictFromUrl = async (req: Request, res: Response) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required',
      });
    }

    // Validate URL format
    try {
      new URL(imageUrl);
    } catch (urlError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid URL format',
      });
    }

    // Extract filename from URL for prediction
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1] || 'unknown.jpg';

    // Predict waste type (in a real implementation, you'd download the image)
    const prediction = await predictWasteType(filename);
    
    // Validate prediction confidence
    const validation = validatePrediction(prediction);

    res.json({
      success: true,
      data: {
        prediction: {
          predictedType: prediction.predictedType,
          confidence: prediction.confidence,
          alternatives: prediction.alternatives,
        },
        validation,
        metadata: {
          imageUrl,
          extractedFilename: filename,
        },
      },
    });
  } catch (error) {
    console.error('URL prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during URL-based prediction',
    });
  }
};

/**
 * Get prediction confidence thresholds
 */
export const getConfidenceThresholds = async (req: Request, res: Response) => {
  try {
    const { getConfidenceThresholds } = await import('../services/ml_stub');
    const thresholds = getConfidenceThresholds();

    res.json({
      success: true,
      data: {
        thresholds,
        description: {
          high: 'Very confident predictions - can be trusted for automatic processing',
          medium: 'Moderately confident predictions - may need review for critical decisions',
          low: 'Low confidence predictions - manual review recommended',
          reject: 'Below this threshold, predictions should be rejected',
        },
      },
    });
  } catch (error) {
    console.error('Get confidence thresholds error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching confidence thresholds',
    });
  }
};

/**
 * Get supported waste types
 */
export const getSupportedWasteTypes = async (req: Request, res: Response) => {
  try {
    const wasteTypes = [
      {
        type: 'organic',
        description: 'Food waste, garden waste, biodegradable materials',
        examples: ['fruit peels', 'vegetable scraps', 'leaves', 'food leftovers'],
      },
      {
        type: 'plastic',
        description: 'Plastic bottles, bags, containers, packaging',
        examples: ['water bottles', 'shopping bags', 'food containers', 'plastic wrap'],
      },
      {
        type: 'paper',
        description: 'Paper products, cardboard, newspapers',
        examples: ['newspapers', 'cardboard boxes', 'office paper', 'magazines'],
      },
      {
        type: 'metal',
        description: 'Metal cans, foil, scrap metal',
        examples: ['aluminum cans', 'steel cans', 'metal foil', 'wire'],
      },
      {
        type: 'glass',
        description: 'Glass bottles, jars, windows',
        examples: ['wine bottles', 'glass jars', 'broken glass', 'mirrors'],
      },
      {
        type: 'electronic',
        description: 'Electronic devices, batteries, cables',
        examples: ['old phones', 'computers', 'batteries', 'cables'],
      },
      {
        type: 'hazardous',
        description: 'Dangerous materials requiring special handling',
        examples: ['chemicals', 'paint', 'medical waste', 'toxic substances'],
      },
      {
        type: 'mixed',
        description: 'Multiple waste types combined',
        examples: ['general trash', 'mixed recyclables', 'composite materials'],
      },
      {
        type: 'other',
        description: 'Unclassified or unknown waste types',
        examples: ['unidentifiable items', 'rare materials', 'composite objects'],
      },
    ];

    res.json({
      success: true,
      data: {
        wasteTypes,
        totalTypes: wasteTypes.length,
      },
    });
  } catch (error) {
    console.error('Get supported waste types error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching supported waste types',
    });
  }
};

/**
 * Health check for ML service
 */
export const mlHealthCheck = async (req: Request, res: Response) => {
  try {
    // Test prediction with a simple filename
    const testPrediction = await predictWasteType('test_bottle.jpg');
    
    const isHealthy = testPrediction && typeof testPrediction.predictedType === 'string';

    res.json({
      success: true,
      data: {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        testPrediction: isHealthy ? {
          predictedType: testPrediction.predictedType,
          confidence: testPrediction.confidence,
        } : null,
      },
    });
  } catch (error) {
    console.error('ML health check error:', error);
    res.status(500).json({
      success: false,
      message: 'ML service is unhealthy',
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
};
