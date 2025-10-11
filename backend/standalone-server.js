const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
require('dotenv').config({ path: './config.env' });

const app = express();
const PORT = process.env.PORT || 5000;

// In-memory storage (for development/demo purposes)
let users = [];
let reports = [];
let userIdCounter = 1;
let reportIdCounter = 1;

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

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// JWT Helper functions
const generateTokens = (user) => {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE,
  });

  return { accessToken, refreshToken };
};

// Auth middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token is required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = users.find(u => u._id === decoded.userId && u.isActive);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or user not found'
      });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Health check
app.get('/health', async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: 'In-Memory Storage',
    users: users.length,
    reports: reports.length
  });
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, role = 'user' } = req.body;

    // Validation
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Check if phone already exists
    const existingPhone = users.find(u => u.phone === phone);
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'User with this phone number already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user
    const user = {
      _id: userIdCounter++,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      role,
      isActive: true,
      isVerified: false,
      refreshTokens: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.push(user);

    // Generate tokens
    const tokens = generateTokens(user);

    // Add refresh token to user
    user.refreshTokens.push(tokens.refreshToken);

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        ...tokens,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    // Find user
    const user = users.find(u => u.email === email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Add refresh token to user
    user.refreshTokens.push(tokens.refreshToken);

    // Remove password from response
    const { password: _, ...userResponse } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        ...tokens,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { password: _, ...userResponse } = req.user;
    res.json({
      success: true,
      data: {
        user: userResponse,
      },
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone } = req.body;
    
    // Update user
    req.user.name = name || req.user.name;
    req.user.phone = phone || req.user.phone;
    req.user.updatedAt = new Date().toISOString();

    const { password: _, ...userResponse } = req.user;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: userResponse,
      },
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      req.user.refreshTokens = req.user.refreshTokens.filter(token => token !== refreshToken);
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Admin endpoint to update user password (for development)
app.put('/api/auth/admin/update-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    
    const user = users.find(u => u.email === email.toLowerCase());
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Hash new password
    user.password = await bcrypt.hash(newPassword, 12);
    user.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Report Routes
app.post('/api/report', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { description, wasteType, urgency, lat, lng, address, estimatedQuantity } = req.body;

    if (!description || !wasteType) {
      return res.status(400).json({
        success: false,
        message: 'Description and waste type are required',
      });
    }

    const report = {
      _id: reportIdCounter++,
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      description,
      wasteType,
      urgency: urgency || 'medium',
      status: 'pending',
      location: {
        lat: parseFloat(lat) || 0,
        lng: parseFloat(lng) || 0
      },
      address: address || '',
      estimatedQuantity: estimatedQuantity || '',
      photoUrl: req.file ? `/uploads/${req.file.filename}` : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    reports.push(report);

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
      message: 'Internal server error',
    });
  }
});

app.get('/api/report/me', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;

    let userReports = reports.filter(r => r.user === req.user._id);
    
    if (status) {
      userReports = userReports.filter(r => r.status === status);
    }

    // Sort by creation date (newest first)
    userReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedReports = userReports.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        reports: paginatedReports,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(userReports.length / limit),
          totalReports: userReports.length,
        },
      },
    });
  } catch (error) {
    console.error('Get my reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

app.get('/api/report', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const wasteType = req.query.wasteType;

    let filteredReports = [...reports];
    
    // If user is a collector, exclude their own reports (collectors should only see reports from other users)
    if (req.user.role === 'collector') {
      filteredReports = filteredReports.filter(r => r.user !== req.user._id);
    }
    
    if (status) {
      filteredReports = filteredReports.filter(r => r.status === status);
    }
    
    if (wasteType) {
      filteredReports = filteredReports.filter(r => r.wasteType === wasteType);
    }

    // Sort by creation date (newest first)
    filteredReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedReports = filteredReports.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        reports: paginatedReports,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(filteredReports.length / limit),
          totalReports: filteredReports.length,
        },
      },
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

app.get('/api/report/statistics', authenticateToken, async (req, res) => {
  try {
    const totalReports = reports.length;
    const pendingReports = reports.filter(r => r.status === 'pending').length;
    const assignedReports = reports.filter(r => r.status === 'assigned').length;
    const inProgressReports = reports.filter(r => r.status === 'in_progress').length;
    const collectedReports = reports.filter(r => r.status === 'collected').length;
    const resolvedReports = reports.filter(r => r.status === 'resolved').length;
    const criticalReports = reports.filter(r => r.urgency === 'critical').length;
    const highUrgencyReports = reports.filter(r => r.urgency === 'high').length;

    res.json({
      success: true,
      data: {
        overview: {
          totalReports,
          pendingReports,
          assignedReports,
          inProgressReports,
          collectedReports,
          resolvedReports,
          criticalReports,
          highUrgencyReports,
        },
      },
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Admin Routes
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const role = req.query.role;

    let filteredUsers = [...users];
    
    if (role) {
      filteredUsers = filteredUsers.filter(u => u.role === role);
    }

    // Sort by creation date
    filteredUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Remove passwords from response
    const safeUsers = paginatedUsers.map(({ password, ...user }) => ({
      ...user,
      reportCount: reports.filter(r => r.user === user._id).length,
      lastActive: user.updatedAt,
    }));

    res.json({
      success: true,
      data: {
        users: safeUsers,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(filteredUsers.length / limit),
          totalUsers: filteredUsers.length,
        },
        summary: {
          totalUsers: users.length,
          activeUsers: users.filter(u => u.isActive).length,
          collectors: users.filter(u => u.role === 'collector').length,
          regularUsers: users.filter(u => u.role === 'user').length,
        },
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

app.put('/api/admin/users/:id/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const userId = parseInt(req.params.id);
    const { isActive } = req.body;
    
    const user = users.find(u => u._id === userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.isActive = isActive;
    user.updatedAt = new Date().toISOString();

    const { password, ...safeUser } = user;

    res.json({
      success: true,
      message: 'User status updated successfully',
      data: { user: safeUser },
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

app.post('/api/admin/assign-collector', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.',
      });
    }

    const { reportId, collectorId } = req.body;
    
    const report = reports.find(r => r._id === parseInt(reportId));
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    const collector = users.find(u => u._id === parseInt(collectorId) && u.role === 'collector');
    if (!collector) {
      return res.status(404).json({
        success: false,
        message: 'Collector not found',
      });
    }

    report.assignedCollector = parseInt(collectorId);
    report.status = 'assigned';
    report.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Collector assigned successfully',
      data: { report },
    });
  } catch (error) {
    console.error('Assign collector error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Collector Routes
// Dashboard route must come before parameterized routes
app.get('/api/collector/dashboard', authenticateToken, async (req, res) => {
  try {
    console.log('Collector dashboard accessed by user:', req.user);
    
    if (req.user.role !== 'collector') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Collector role required.',
      });
    }

    // Get collector's assigned reports
    const assignedReports = reports.filter(r => r.assignedCollector === req.user._id);
    const today = new Date().toDateString();
    const todayReports = assignedReports.filter(r => {
      const reportDate = new Date(r.createdAt).toDateString();
      return today === reportDate;
    });

    const completedToday = assignedReports.filter(r => {
      const completedDate = new Date(r.updatedAt).toDateString();
      return today === completedDate && r.status === 'collected';
    }).length;

    const statistics = {
      totalAssigned: assignedReports.length,
      todayAssigned: todayReports.length,
      completed: assignedReports.filter(r => r.status === 'collected').length,
      completedToday: completedToday,
      inProgress: assignedReports.filter(r => r.status === 'in_progress').length,
      pending: assignedReports.filter(r => r.status === 'assigned').length,
      pendingReports: assignedReports.filter(r => r.status === 'assigned').length,
      inProgressReports: assignedReports.filter(r => r.status === 'in_progress').length,
      highPriority: assignedReports.filter(r => r.urgency === 'high' || r.urgency === 'critical').length,
      estimatedTimeRemaining: assignedReports.filter(r => r.status !== 'collected').length * 30, // 30 min per report
    };

    // Recent pickups with better data
    const recentPickups = assignedReports
      .filter(r => r.status === 'collected' || r.status === 'in_progress')
      .slice(0, 5)
      .map(report => ({
        _id: `pickup_${report._id}`,
        report: report._id,
        reportDescription: report.description,
        startTime: report.updatedAt,
        endTime: report.status === 'collected' ? report.updatedAt : null,
        status: report.status === 'collected' ? 'completed' : 'in_progress',
        location: report.location,
        address: report.address,
        duration: report.status === 'collected' ? Math.floor(Math.random() * 60) + 15 : null, // Random duration 15-75 min
      }));

    res.json({
      success: true,
      data: {
        statistics,
        todayReports: todayReports.slice(0, 10),
        recentPickups,
      },
    });
  } catch (error) {
    console.error('Get collector dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

app.get('/api/collector', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const isActive = req.query.isActive;

    let collectors = users.filter(u => u.role === 'collector');
    
    if (isActive !== undefined) {
      collectors = collectors.filter(c => c.isActive === (isActive === 'true'));
    }

    // Sort by creation date
    collectors.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Add statistics for each collector
    const collectorsWithStats = collectors.map(collector => {
      const collectorReports = reports.filter(r => r.assignedCollector === collector._id);
      const { password, ...safeCollector } = collector;
      
      return {
        ...safeCollector,
        statistics: {
          totalAssigned: collectorReports.length,
          completed: collectorReports.filter(r => r.status === 'collected').length,
          inProgress: collectorReports.filter(r => r.status === 'in_progress').length,
          pending: collectorReports.filter(r => r.status === 'assigned').length,
        }
      };
    });

    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedCollectors = collectorsWithStats.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        collectors: paginatedCollectors,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(collectors.length / limit),
          totalCollectors: collectors.length,
        },
      },
    });
  } catch (error) {
    console.error('Get collectors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

app.get('/api/collector/:id', authenticateToken, async (req, res) => {
  try {
    const collectorId = parseInt(req.params.id);
    const collector = users.find(u => u._id === collectorId && u.role === 'collector');
    
    if (!collector) {
      return res.status(404).json({
        success: false,
        message: 'Collector not found',
      });
    }

    // Get collector's statistics
    const collectorReports = reports.filter(r => r.assignedCollector === collectorId);
    const statistics = {
      totalAssigned: collectorReports.length,
      completed: collectorReports.filter(r => r.status === 'collected').length,
      inProgress: collectorReports.filter(r => r.status === 'in_progress').length,
      pending: collectorReports.filter(r => r.status === 'assigned').length,
    };

    // Recent pickups (mock data)
    const recentPickups = collectorReports.slice(0, 5).map(report => ({
      _id: `pickup_${report._id}`,
      report: report._id,
      startTime: report.updatedAt,
      status: report.status === 'collected' ? 'completed' : 'in_progress',
      actualQuantity: report.estimatedQuantity,
    }));

    const { password, ...safeCollector } = collector;

    res.json({
      success: true,
      data: {
        collector: safeCollector,
        statistics,
        recentPickups,
      },
    });
  } catch (error) {
    console.error('Get collector error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

app.get('/api/collector/:id/route', authenticateToken, async (req, res) => {
  try {
    const collectorId = parseInt(req.params.id);
    const collector = users.find(u => u._id === collectorId && u.role === 'collector');
    
    if (!collector) {
      return res.status(404).json({
        success: false,
        message: 'Collector not found',
      });
    }

    // Get assigned reports for route optimization
    const assignedReports = reports.filter(r => 
      r.assignedCollector === collectorId && 
      (r.status === 'assigned' || r.status === 'in_progress')
    );

    // Sort reports by urgency and proximity (mock optimization)
    const sortedReports = assignedReports.sort((a, b) => {
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    });

    // Create route with detailed waypoints
    const route = {
      totalDistance: assignedReports.length * 2.5, // km
      totalTime: assignedReports.length * 30, // minutes
      estimatedTime: assignedReports.length * 30,
      reports: sortedReports.map((report, index) => ({
        report: {
          _id: report._id,
          description: report.description,
          wasteType: report.wasteType,
          urgency: report.urgency,
          status: report.status,
          estimatedQuantity: report.estimatedQuantity,
          address: report.address,
          location: {
            coordinates: [report.location.lng, report.location.lat]
          },
          user: report.userName || 'Unknown User',
          createdAt: report.createdAt,
        },
        estimatedTime: 30, // minutes per stop
        distance: index === 0 ? 0 : 2.5, // km from previous stop
        order: index + 1,
      })),
    };

    const statistics = {
      totalReports: assignedReports.length,
      highPriority: assignedReports.filter(r => r.urgency === 'high' || r.urgency === 'critical').length,
      estimatedWeight: assignedReports.length * 5, // kg
    };

    const { password, ...safeCollector } = collector;

    res.json({
      success: true,
      data: {
        collector: safeCollector,
        route,
        statistics,
      },
    });
  } catch (error) {
    console.error('Get collector route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Collector self-assignment endpoint
app.post('/api/collector/assign-self/:reportId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'collector') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Collector role required.',
      });
    }

    const reportId = parseInt(req.params.reportId);
    const report = reports.find(r => r._id === reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Report is not available for assignment',
      });
    }

    // Assign the report to the collector
    report.assignedCollector = req.user._id;
    report.status = 'assigned';
    report.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      message: 'Report assigned successfully',
      data: { report },
    });
  } catch (error) {
    console.error('Self assign error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Start pickup endpoint
app.post('/api/collector/pickup/:reportId/start', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'collector') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Collector role required.',
      });
    }

    const reportId = parseInt(req.params.reportId);
    const report = reports.find(r => r._id === reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    if (report.assignedCollector !== req.user._id) {
      return res.status(403).json({
        success: false,
        message: 'Report not assigned to you',
      });
    }

    if (report.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        message: 'Report is not in assigned status',
      });
    }

    // Update report status
    report.status = 'in_progress';
    report.updatedAt = new Date().toISOString();
    report.pickupStartTime = new Date().toISOString();

    res.json({
      success: true,
      message: 'Pickup started successfully',
      data: { report },
    });
  } catch (error) {
    console.error('Start pickup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Complete pickup endpoint
app.post('/api/collector/pickup/:reportId/complete', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'collector') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Collector role required.',
      });
    }

    const reportId = parseInt(req.params.reportId);
    const report = reports.find(r => r._id === reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    if (report.assignedCollector !== req.user._id) {
      return res.status(403).json({
        success: false,
        message: 'Report not assigned to you',
      });
    }

    if (report.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Report is not in progress',
      });
    }

    const { actualQuantity, wasteTypeConfirmed, notes } = req.body;

    // Update report status
    report.status = 'collected';
    report.updatedAt = new Date().toISOString();
    report.pickupEndTime = new Date().toISOString();
    report.actualQuantity = actualQuantity || report.estimatedQuantity;
    report.wasteTypeConfirmed = wasteTypeConfirmed || report.wasteType;
    report.collectorNotes = notes || '';

    res.json({
      success: true,
      message: 'Pickup completed successfully',
      data: { report },
    });
  } catch (error) {
    console.error('Complete pickup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

app.put('/api/collector/:id/status', authenticateToken, async (req, res) => {
  try {
    const collectorId = parseInt(req.params.id);
    const { isActive } = req.body;
    
    const collector = users.find(u => u._id === collectorId && u.role === 'collector');
    if (!collector) {
      return res.status(404).json({
        success: false,
        message: 'Collector not found',
      });
    }

    collector.isActive = isActive;
    collector.updatedAt = new Date().toISOString();

    const { password, ...safeCollector } = collector;

    res.json({
      success: true,
      message: 'Collector status updated successfully',
      data: {
        collector: safeCollector,
      },
    });
  } catch (error) {
    console.error('Update collector status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

app.post('/api/collector/pickup/start', authenticateToken, async (req, res) => {
  try {
    const { reportId } = req.body;
    
    if (req.user.role !== 'collector') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Collector role required.',
      });
    }

    const report = reports.find(r => r._id === parseInt(reportId));
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    // Check if report is already assigned to this collector or unassigned
    if (report.assignedCollector && report.assignedCollector !== req.user._id) {
      return res.status(400).json({
        success: false,
        message: 'Report is assigned to another collector',
      });
    }

    // Update report status
    report.status = 'in_progress';
    report.assignedCollector = req.user._id;
    report.updatedAt = new Date().toISOString();

    // Create pickup log
    const pickupLog = {
      _id: `pickup_${Date.now()}`,
      report: report._id,
      collector: req.user._id,
      collectorName: req.user.name,
      startTime: new Date().toISOString(),
      status: 'in_progress',
      reportDetails: {
        description: report.description,
        wasteType: report.wasteType,
        urgency: report.urgency,
        address: report.address,
      },
    };

    res.json({
      success: true,
      message: 'Pickup started successfully',
      data: {
        pickupLog,
        report,
      },
    });
  } catch (error) {
    console.error('Start pickup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

app.put('/api/collector/pickup/:id/complete', authenticateToken, async (req, res) => {
  try {
    const reportId = req.params.id;
    const { actualQuantity, wasteTypeConfirmed, notes } = req.body;
    
    if (req.user.role !== 'collector') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Collector role required.',
      });
    }

    const report = reports.find(r => r._id === parseInt(reportId));
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    if (report.assignedCollector !== req.user._id) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this report',
      });
    }

    // Update report status to collected
    report.status = 'collected';
    report.updatedAt = new Date().toISOString();
    report.completedAt = new Date().toISOString();
    report.actualQuantity = actualQuantity || report.estimatedQuantity;
    report.wasteTypeConfirmed = wasteTypeConfirmed || report.wasteType;
    report.collectorNotes = notes || '';

    // Create completion log
    const pickupLog = {
      _id: `pickup_${Date.now()}`,
      report: report._id,
      collector: req.user._id,
      collectorName: req.user.name,
      completedTime: new Date().toISOString(),
      status: 'completed',
      actualQuantity: actualQuantity || report.estimatedQuantity,
      wasteTypeConfirmed: wasteTypeConfirmed || report.wasteType,
      notes: notes || '',
      duration: Math.floor(Math.random() * 45) + 15, // Random 15-60 minutes
    };

    res.json({
      success: true,
      message: 'Pickup completed successfully',
      data: {
        pickupLog,
        report,
      },
    });
  } catch (error) {
    console.error('Complete pickup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// ML Routes (mock endpoints)
app.post('/api/ml/predict', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    // Mock ML prediction
    const wasteTypes = ['plastic', 'organic', 'metal', 'glass', 'paper'];
    const randomType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
    
    const prediction = {
      wasteType: randomType,
      confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
      alternatives: wasteTypes.filter(t => t !== randomType).slice(0, 2).map(type => ({
        wasteType: type,
        confidence: Math.random() * 0.4 + 0.3
      }))
    };

    res.json({
      success: true,
      data: {
        prediction,
        validation: { isValid: true },
        metadata: { processingTime: Math.random() * 2 + 1 }
      },
    });
  } catch (error) {
    console.error('ML predict error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

app.get('/api/ml/waste-types', authenticateToken, async (req, res) => {
  try {
    const wasteTypes = [
      { id: 1, name: 'Plastic', category: 'recyclable', color: '#3B82F6' },
      { id: 2, name: 'Organic', category: 'biodegradable', color: '#10B981' },
      { id: 3, name: 'Metal', category: 'recyclable', color: '#6B7280' },
      { id: 4, name: 'Glass', category: 'recyclable', color: '#8B5CF6' },
      { id: 5, name: 'Paper', category: 'recyclable', color: '#F59E0B' },
      { id: 6, name: 'Electronic', category: 'hazardous', color: '#EF4444' },
    ];

    res.json({
      success: true,
      data: {
        wasteTypes,
        totalTypes: wasteTypes.length,
      },
    });
  } catch (error) {
    console.error('Get waste types error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
});

// Catch all
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 EcoTrack Standalone Backend running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🗄️  Database: In-Memory Storage (for development)`);
  console.log(`👥 Users: ${users.length} | 📊 Reports: ${reports.length}`);
});
