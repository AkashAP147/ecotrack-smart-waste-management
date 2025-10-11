import Joi from 'joi';

// User validation schemas
export const registerSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Name is required',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
    }),
  
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
    }),
  
  password: Joi.string()
    .min(6)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.empty': 'Password is required',
    }),
  
  phone: Joi.string()
    .pattern(/^\+?[\d\s-()]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
      'string.empty': 'Phone number is required',
    }),
  
  role: Joi.string()
    .valid('user', 'admin', 'collector')
    .default('user'),
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required',
    }),
});

export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'string.empty': 'Refresh token is required',
    }),
});

// Report validation schemas
export const createReportSchema = Joi.object({
  lat: Joi.number()
    .min(-90)
    .max(90)
    .required()
    .messages({
      'number.min': 'Latitude must be between -90 and 90',
      'number.max': 'Latitude must be between -90 and 90',
      'any.required': 'Latitude is required',
    }),
  
  lng: Joi.number()
    .min(-180)
    .max(180)
    .required()
    .messages({
      'number.min': 'Longitude must be between -180 and 180',
      'number.max': 'Longitude must be between -180 and 180',
      'any.required': 'Longitude is required',
    }),
  
  description: Joi.string()
    .trim()
    .min(10)
    .max(500)
    .required()
    .messages({
      'string.min': 'Description must be at least 10 characters long',
      'string.max': 'Description cannot exceed 500 characters',
      'string.empty': 'Description is required',
    }),
  
  wasteType: Joi.string()
    .valid('organic', 'plastic', 'paper', 'metal', 'glass', 'electronic', 'hazardous', 'mixed', 'other')
    .default('other'),
  
  urgency: Joi.string()
    .valid('low', 'medium', 'high', 'critical')
    .default('medium'),
  
  address: Joi.string()
    .trim()
    .max(200)
    .optional(),
  
  estimatedQuantity: Joi.string()
    .trim()
    .max(100)
    .optional(),
});

export const updateReportStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'assigned', 'in_progress', 'collected', 'resolved', 'cancelled')
    .required()
    .messages({
      'any.only': 'Status must be one of: pending, assigned, in_progress, collected, resolved, cancelled',
      'any.required': 'Status is required',
    }),
  
  collectorNotes: Joi.string()
    .trim()
    .max(500)
    .optional(),
  
  adminNotes: Joi.string()
    .trim()
    .max(500)
    .optional(),
  
  actualQuantity: Joi.string()
    .trim()
    .max(100)
    .optional(),
  
  wasteTypeConfirmed: Joi.string()
    .valid('organic', 'plastic', 'paper', 'metal', 'glass', 'electronic', 'hazardous', 'mixed', 'other')
    .optional(),
});

export const assignCollectorSchema = Joi.object({
  collectorId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Collector ID must be a valid MongoDB ObjectId',
      'any.required': 'Collector ID is required',
    }),
});

// Query validation schemas
export const reportQuerySchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'assigned', 'in_progress', 'collected', 'resolved', 'cancelled')
    .optional(),
  
  wasteType: Joi.string()
    .valid('organic', 'plastic', 'paper', 'metal', 'glass', 'electronic', 'hazardous', 'mixed', 'other')
    .optional(),
  
  urgency: Joi.string()
    .valid('low', 'medium', 'high', 'critical')
    .optional(),
  
  area: Joi.string()
    .trim()
    .max(100)
    .optional(),
  
  lat: Joi.number()
    .min(-90)
    .max(90)
    .optional(),
  
  lng: Joi.number()
    .min(-180)
    .max(180)
    .optional(),
  
  radius: Joi.number()
    .min(100)
    .max(50000)
    .default(5000)
    .optional(),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional(),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .optional(),
  
  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'urgency', 'status')
    .default('createdAt')
    .optional(),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc')
    .optional(),
});

// File validation
export const fileValidation = {
  allowedMimeTypes: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
  maxFileSize: 5 * 1024 * 1024, // 5MB
};

// Validation middleware
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors,
      });
    }

    req.body = value;
    next();
  };
};

// Query validation middleware
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Query validation error',
        errors,
      });
    }

    req.query = value;
    next();
  };
};
