import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import path from 'path';

// Import configuration
import config from './config';

// Import routes
import authRoutes from './routes/auth';
import reportRoutes from './routes/report';
import collectorRoutes from './routes/collector';
import mlRoutes from './routes/ml';

// Import services for initialization checks
import { checkS3Connection } from './services/s3';
import { isFirebaseInitialized } from './services/fcm';

const app = express();

// Detect serverless environment
const isServerless = process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compression middleware
app.use(compression());

// Logging middleware
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(process.cwd(), config.upload.uploadPath)));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'EcoTrack API Server',
    version: '1.0.0',
    environment: config.nodeEnv,
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      reports: '/api/report',
      collectors: '/api/collector',
      ml: '/api/ml'
    },
    documentation: 'Visit /health for server status'
  });
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    
    // Check external services
    const s3Status = await checkS3Connection();
    const fcmStatus = isFirebaseInitialized();

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: config.nodeEnv,
      services: {
        database: dbStatus,
        s3: s3Status ? 'connected' : 'disconnected',
        fcm: fcmStatus ? 'connected' : 'disconnected',
      },
    };

    const httpStatus = dbStatus === 'connected' ? 200 : 503;
    res.status(httpStatus).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/collector', collectorRoutes);
app.use('/api/ml', mlRoutes);

// Serve frontend in production (only for non-serverless environments)
if (config.nodeEnv === 'production' && !isServerless) {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err);

  // Multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 10 files.',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e: any) => ({
      field: e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired',
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = config.nodeEnv === 'production' 
    ? 'Internal server error' 
    : err.message || 'Internal server error';

  return res.status(statusCode).json({
    success: false,
    message,
    ...(config.nodeEnv !== 'production' && { stack: err.stack }),
  });
});

// Database connection
const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoUri);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    if (!isServerless) {
      process.exit(1);
    } else {
      throw error; // Let serverless handle the error
    }
  }
};

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('\n🔄 Received shutdown signal, closing server gracefully...');
  
  if (server) {
    server.close(() => {
      console.log('✅ HTTP server closed');
      
      mongoose.connection.close().then(() => {
        console.log('✅ MongoDB connection closed');
        process.exit(0);
      });
    });
  } else {
    mongoose.connection.close().then(() => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  }

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  if (!isServerless) {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  if (!isServerless) {
    process.exit(1);
  }
});

// Initialize database connection for serverless
const initializeApp = async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }
};

// Start server (only in non-serverless environments)
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Start HTTP server
    const server = app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
      console.log(`📝 Environment: ${config.nodeEnv}`);
      console.log(`🔗 Health check: http://localhost:${config.port}/health`);
      
      if (config.nodeEnv === 'development') {
        console.log(`🌐 API Base URL: http://localhost:${config.port}/api`);
      }
    });

    return server;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    if (!isServerless) {
      process.exit(1);
    } else {
      throw error;
    }
  }
};

// Initialize for serverless or start server for local development
let server: any;
if (process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  // Serverless environment - just initialize the app
  initializeApp().catch((error) => {
    console.error('❌ Failed to initialize app:', error);
  });
} else {
  // Local development - start the server
  startServer().then((s) => {
    server = s;
  }).catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}

export default app;
