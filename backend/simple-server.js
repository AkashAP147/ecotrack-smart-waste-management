const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'development'
  });
});

// Mock API endpoints for demonstration
app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        _id: '507f1f77bcf86cd799439011',
        name: 'Demo User',
        email: req.body.email,
        role: 'user'
      },
      accessToken: 'demo-access-token',
      refreshToken: 'demo-refresh-token'
    }
  });
});

app.post('/api/auth/register', (req, res) => {
  res.json({
    success: true,
    message: 'Registration successful',
    data: {
      user: {
        _id: '507f1f77bcf86cd799439012',
        name: req.body.name,
        email: req.body.email,
        role: req.body.role || 'user'
      },
      accessToken: 'demo-access-token',
      refreshToken: 'demo-refresh-token'
    }
  });
});

app.get('/api/auth/profile', (req, res) => {
  res.json({
    success: true,
    data: {
      user: {
        _id: '507f1f77bcf86cd799439011',
        name: 'Demo User',
        email: 'demo@ecotrack.com',
        role: 'user'
      }
    }
  });
});

app.get('/api/report/me', (req, res) => {
  res.json({
    success: true,
    data: {
      reports: [
        {
          _id: '507f1f77bcf86cd799439013',
          description: 'Demo waste report',
          status: 'pending',
          urgency: 'medium',
          wasteType: 'plastic',
          createdAt: new Date().toISOString(),
          address: '123 Demo Street'
        }
      ],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalReports: 1
      }
    }
  });
});

// Create new report
app.post('/api/report', (req, res) => {
  res.json({
    success: true,
    message: 'Report created successfully',
    data: {
      report: {
        _id: '507f1f77bcf86cd799439014',
        description: req.body.description || 'Demo waste report',
        status: 'pending',
        urgency: req.body.urgency || 'medium',
        wasteType: req.body.wasteType || 'plastic',
        createdAt: new Date().toISOString(),
        address: req.body.address || '123 Demo Street',
        lat: req.body.lat || 40.7128,
        lng: req.body.lng || -74.0060,
        estimatedQuantity: req.body.estimatedQuantity || 'medium',
        photoUrl: '/uploads/demo-photo.jpg'
      }
    }
  });
});

app.get('/api/report/statistics', (req, res) => {
  res.json({
    success: true,
    data: {
      overview: {
        totalReports: 10,
        pendingReports: 3,
        assignedReports: 2,
        inProgressReports: 1,
        collectedReports: 4,
        resolvedReports: 0,
        criticalReports: 1,
        highUrgencyReports: 2
      }
    }
  });
});

// Get all reports
app.get('/api/report', (req, res) => {
  res.json({
    success: true,
    data: {
      reports: [
        {
          _id: '507f1f77bcf86cd799439013',
          description: 'Demo waste report 1',
          status: 'pending',
          urgency: 'medium',
          wasteType: 'plastic',
          createdAt: new Date().toISOString(),
          address: '123 Demo Street',
          lat: 40.7128,
          lng: -74.0060
        },
        {
          _id: '507f1f77bcf86cd799439014',
          description: 'Demo waste report 2',
          status: 'assigned',
          urgency: 'high',
          wasteType: 'organic',
          createdAt: new Date().toISOString(),
          address: '456 Demo Avenue',
          lat: 40.7589,
          lng: -73.9851
        }
      ],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalReports: 2
      }
    }
  });
});

// Update profile
app.put('/api/auth/profile', (req, res) => {
  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        _id: '507f1f77bcf86cd799439011',
        name: req.body.name || 'Demo User',
        email: req.body.email || 'demo@ecotrack.com',
        phone: req.body.phone || '+1234567890',
        role: 'user'
      }
    }
  });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Catch all
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`🚀 EcoTrack Backend running on port ${PORT}`);
  console.log(`📝 Environment: development (demo mode)`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
});
