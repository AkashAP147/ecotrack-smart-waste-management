const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer');
require('dotenv').config({ path: './config.env' });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: true, // Allow all origins for development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  phone: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'collector'], default: 'user' },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  refreshTokens: [String],
  fcmToken: String,
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

// Report Schema
const reportSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  wasteType: { type: String, required: true },
  urgency: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
  status: { type: String, enum: ['pending', 'assigned', 'in_progress', 'collected', 'resolved'], default: 'pending' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number] // [longitude, latitude]
  },
  address: String,
  estimatedQuantity: String,
  photoUrl: String,
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

reportSchema.index({ location: '2dsphere' });
const Report = mongoose.model('Report', reportSchema);

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
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
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
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
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV,
      database: dbStatus
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Check if phone already exists
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'User with this phone number already exists',
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      phone,
      role,
    });

    await user.save();

    // Generate tokens
    const tokens = generateTokens(user);

    // Add refresh token to user
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
        },
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

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
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
    const isPasswordValid = await user.comparePassword(password);
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
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
        },
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
    res.json({
      success: true,
      data: {
        user: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
          role: req.user.role,
          isVerified: req.user.isVerified,
        },
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
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
        },
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
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: refreshToken }
      });
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

// Report Routes
app.post('/api/report', authenticateToken, upload.single('photo'), async (req, res) => {
  try {
    const { description, wasteType, urgency, lat, lng, address, estimatedQuantity } = req.body;

    const report = new Report({
      user: req.user._id,
      description,
      wasteType,
      urgency,
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)]
      },
      address,
      estimatedQuantity,
      photoUrl: req.file ? `/uploads/${req.file.filename}` : null,
    });

    await report.save();
    await report.populate('user', 'name email');

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

    const query = { user: req.user._id };
    if (status) query.status = status;

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('assignedTo', 'name email');

    const totalReports = await Report.countDocuments(query);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalReports / limit),
          totalReports,
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

    const query = {};
    if (status) query.status = status;
    if (wasteType) query.wasteType = wasteType;

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'name email')
      .populate('assignedTo', 'name email');

    const totalReports = await Report.countDocuments(query);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalReports / limit),
          totalReports,
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
    const totalReports = await Report.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });
    const assignedReports = await Report.countDocuments({ status: 'assigned' });
    const inProgressReports = await Report.countDocuments({ status: 'in_progress' });
    const collectedReports = await Report.countDocuments({ status: 'collected' });
    const resolvedReports = await Report.countDocuments({ status: 'resolved' });
    const criticalReports = await Report.countDocuments({ urgency: 'critical' });
    const highUrgencyReports = await Report.countDocuments({ urgency: 'high' });

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
        message: 'Access denied. Admin role required.'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const role = req.query.role;
    const isActive = req.query.isActive;

    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const users = await User.find(query)
      .select('-password')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.put('/api/admin/users/:userId/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/admin/assign-collector', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const { reportId, collectorId } = req.body;

    const report = await Report.findByIdAndUpdate(
      reportId,
      { 
        assignedTo: collectorId,
        status: 'assigned',
        assignedAt: new Date()
      },
      { new: true }
    ).populate('user', 'name email').populate('assignedTo', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Collector assigned successfully',
      data: { report }
    });
  } catch (error) {
    console.error('Assign collector error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Report management routes
app.get('/api/report/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id)
      .populate('user', 'name email phone')
      .populate('assignedTo', 'name email phone');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check permissions
    if (req.user.role === 'user' && report.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { report }
    });
  } catch (error) {
    console.error('Get report by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.put('/api/report/:id/assign', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const { id } = req.params;
    const { collectorId } = req.body;

    const report = await Report.findByIdAndUpdate(
      id,
      { 
        assignedTo: collectorId,
        status: 'assigned',
        assignedAt: new Date()
      },
      { new: true }
    ).populate('user', 'name email').populate('assignedTo', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Collector assigned successfully',
      data: { report }
    });
  } catch (error) {
    console.error('Assign collector to report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.put('/api/report/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check permissions
    if (req.user.role === 'collector' && report.assignedTo?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update reports assigned to you.'
      });
    }

    if (req.user.role === 'user' && report.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const updatedReport = await Report.findByIdAndUpdate(
      id,
      { 
        status,
        notes: notes || report.notes,
        updatedAt: new Date()
      },
      { new: true }
    ).populate('user', 'name email').populate('assignedTo', 'name email');

    res.json({
      success: true,
      message: 'Report status updated successfully',
      data: { report: updatedReport }
    });
  } catch (error) {
    console.error('Update report status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.delete('/api/report/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check permissions
    if (req.user.role === 'user' && report.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (req.user.role === 'collector') {
      return res.status(403).json({
        success: false,
        message: 'Collectors cannot delete reports'
      });
    }

    await Report.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Collector Routes
app.get('/api/collector', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const isActive = req.query.isActive;

    const query = { role: 'collector' };
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const collectors = await User.find(query)
      .select('-password')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        collectors,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalCollectors: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get collectors error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/collector/dashboard', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'collector') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Collector role required.'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const assignedReports = await Report.countDocuments({ 
      assignedTo: req.user._id,
      status: { $in: ['assigned', 'in_progress'] }
    });

    const completedToday = await Report.countDocuments({
      assignedTo: req.user._id,
      status: 'collected',
      updatedAt: { $gte: today, $lt: tomorrow }
    });

    const todayReports = await Report.find({
      assignedTo: req.user._id,
      status: { $in: ['assigned', 'in_progress'] }
    }).populate('user', 'name email').limit(10);

    const recentPickups = await Report.find({
      assignedTo: req.user._id,
      status: 'collected'
    }).populate('user', 'name email').sort({ updatedAt: -1 }).limit(5);

    res.json({
      success: true,
      data: {
        statistics: {
          assignedReports,
          completedToday,
          totalCompleted: recentPickups.length
        },
        todayReports,
        recentPickups
      }
    });
  } catch (error) {
    console.error('Get collector dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/collector/assign-self/:reportId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'collector') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Collector role required.'
      });
    }

    const { reportId } = req.params;

    const report = await Report.findByIdAndUpdate(
      reportId,
      { 
        assignedTo: req.user._id,
        status: 'assigned',
        assignedAt: new Date()
      },
      { new: true }
    ).populate('user', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      message: 'Report assigned to you successfully',
      data: { report }
    });
  } catch (error) {
    console.error('Self assign report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/collector/pickup/:reportId/start', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'collector') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Collector role required.'
      });
    }

    const { reportId } = req.params;

    const report = await Report.findOneAndUpdate(
      { 
        _id: reportId,
        assignedTo: req.user._id,
        status: 'assigned'
      },
      { 
        status: 'in_progress',
        startedAt: new Date()
      },
      { new: true }
    ).populate('user', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found or not assigned to you'
      });
    }

    res.json({
      success: true,
      message: 'Pickup started successfully',
      data: { report }
    });
  } catch (error) {
    console.error('Start pickup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/collector/pickup/:reportId/complete', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'collector') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Collector role required.'
      });
    }

    const { reportId } = req.params;
    const { actualQuantity, wasteTypeConfirmed, notes } = req.body;

    const report = await Report.findOneAndUpdate(
      { 
        _id: reportId,
        assignedTo: req.user._id,
        status: 'in_progress'
      },
      { 
        status: 'collected',
        completedAt: new Date(),
        actualQuantity,
        wasteTypeConfirmed,
        notes: notes || report?.notes
      },
      { new: true }
    ).populate('user', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found or not in progress'
      });
    }

    res.json({
      success: true,
      message: 'Pickup completed successfully',
      data: { report }
    });
  } catch (error) {
    console.error('Complete pickup error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Auth refresh route
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token or user not found'
        });
      }

      const tokens = generateTokens(user);
      
      res.json({
        success: true,
        data: tokens
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Additional ML Routes
app.post('/api/ml/predict/batch', authenticateToken, upload.array('images', 10), async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided'
      });
    }

    const predictions = files.map(() => {
      const wasteTypes = ['plastic', 'organic', 'metal', 'glass', 'paper'];
      const randomType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
      const confidence = Math.random() * 0.4 + 0.6;
      
      return {
        wasteType: randomType,
        confidence: confidence,
        suggestions: [`This appears to be ${randomType} waste`]
      };
    });

    res.json({
      success: true,
      data: { predictions }
    });
  } catch (error) {
    console.error('Batch ML prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.post('/api/ml/predict/url', authenticateToken, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'Image URL is required'
      });
    }

    // Mock ML prediction from URL
    const wasteTypes = ['plastic', 'organic', 'metal', 'glass', 'paper'];
    const randomType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
    const confidence = Math.random() * 0.4 + 0.6;

    res.json({
      success: true,
      data: {
        prediction: {
          wasteType: randomType,
          confidence: confidence,
          suggestions: [`This appears to be ${randomType} waste`]
        },
        validation: {
          imageValid: true,
          format: 'supported'
        },
        metadata: {
          imageUrl,
          processedAt: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('ML prediction from URL error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/ml/model', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        model: {
          name: 'EcoTrack Waste Classifier',
          version: '1.0.0',
          accuracy: 0.92,
          supportedTypes: ['plastic', 'organic', 'metal', 'glass', 'paper'],
          lastTrained: '2024-01-01T00:00:00Z'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/ml/thresholds', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        thresholds: {
          high: 0.8,
          medium: 0.6,
          low: 0.4
        },
        description: {
          high: 'High confidence prediction',
          medium: 'Medium confidence prediction',
          low: 'Low confidence prediction'
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/ml/waste-types', authenticateToken, async (req, res) => {
  try {
    const wasteTypes = [
      { id: 1, name: 'Plastic', category: 'recyclable', color: '#3B82F6' },
      { id: 2, name: 'Organic', category: 'compostable', color: '#10B981' },
      { id: 3, name: 'Metal', category: 'recyclable', color: '#6B7280' },
      { id: 4, name: 'Glass', category: 'recyclable', color: '#8B5CF6' },
      { id: 5, name: 'Paper', category: 'recyclable', color: '#F59E0B' }
    ];

    res.json({
      success: true,
      data: {
        wasteTypes,
        totalTypes: wasteTypes.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Additional Collector Routes
app.get('/api/collector/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const collector = await User.findById(id).select('-password');
    if (!collector || collector.role !== 'collector') {
      return res.status(404).json({
        success: false,
        message: 'Collector not found'
      });
    }

    const assignedReports = await Report.countDocuments({ assignedTo: id });
    const completedReports = await Report.countDocuments({ assignedTo: id, status: 'collected' });
    
    const recentPickups = await Report.find({ assignedTo: id, status: 'collected' })
      .populate('user', 'name email')
      .sort({ updatedAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        collector,
        statistics: {
          assignedReports,
          completedReports,
          successRate: assignedReports > 0 ? (completedReports / assignedReports * 100).toFixed(1) : 0
        },
        recentPickups
      }
    });
  } catch (error) {
    console.error('Get collector by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/collector/:id/route', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { startLat, startLng } = req.query;

    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const collector = await User.findById(id).select('-password');
    if (!collector || collector.role !== 'collector') {
      return res.status(404).json({
        success: false,
        message: 'Collector not found'
      });
    }

    const assignedReports = await Report.find({ 
      assignedTo: id, 
      status: { $in: ['assigned', 'in_progress'] }
    }).populate('user', 'name email');

    // Mock optimized route
    const route = {
      totalDistance: Math.random() * 20 + 5, // 5-25 km
      estimatedTime: Math.random() * 120 + 30, // 30-150 minutes
      waypoints: assignedReports.map(report => ({
        reportId: report._id,
        lat: report.lat,
        lng: report.lng,
        address: report.address,
        estimatedArrival: new Date(Date.now() + Math.random() * 3600000).toISOString()
      }))
    };

    res.json({
      success: true,
      data: {
        collector,
        route,
        statistics: {
          totalReports: assignedReports.length,
          estimatedDuration: route.estimatedTime
        }
      }
    });
  } catch (error) {
    console.error('Get collector route error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.put('/api/collector/:id/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const { id } = req.params;
    const { isActive } = req.body;

    const collector = await User.findOneAndUpdate(
      { _id: id, role: 'collector' },
      { isActive },
      { new: true }
    ).select('-password');

    if (!collector) {
      return res.status(404).json({
        success: false,
        message: 'Collector not found'
      });
    }

    res.json({
      success: true,
      message: `Collector ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: { collector }
    });
  } catch (error) {
    console.error('Update collector status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get collector's assigned reports
app.get('/api/collector/:id/reports', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const urgency = req.query.urgency;

    // Check if user is the collector or admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const query = { assignedTo: id };
    if (status && status !== 'all') query.status = status;
    if (urgency && urgency !== 'all') query.urgency = urgency;

    const reports = await Report.find(query)
      .populate('user', 'name email')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalReports: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get collector reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Collector self-assign to report
app.post('/api/report/:id/assign-self', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'collector') {
      return res.status(403).json({
        success: false,
        message: 'Only collectors can assign themselves to reports'
      });
    }

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    if (report.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Report is not available for assignment'
      });
    }

    const updatedReport = await Report.findByIdAndUpdate(
      id,
      {
        assignedTo: req.user._id,
        status: 'assigned',
        assignedAt: new Date()
      },
      { new: true }
    ).populate('user', 'name email');

    res.json({
      success: true,
      message: 'Successfully assigned to report',
      data: { report: updatedReport }
    });
  } catch (error) {
    console.error('Self-assign report error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

app.get('/api/collector/:id/history', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const status = req.query.status;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    if (req.user.role !== 'admin' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const query = { assignedTo: id };
    if (status) query.status = status;
    if (startDate || endDate) {
      query.updatedAt = {};
      if (startDate) query.updatedAt.$gte = new Date(startDate);
      if (endDate) query.updatedAt.$lte = new Date(endDate);
    }

    const pickups = await Report.find(query)
      .populate('user', 'name email')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ updatedAt: -1 });

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      data: {
        pickups,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalPickups: total,
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get collector history error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Auto-assignment API
app.post('/api/admin/auto-assign', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
      });
    }

    const { 
      prioritizeProximity = true, 
      balanceWorkload = true, 
      considerUrgency = true, 
      maxAssignmentsPerCollector = 5 
    } = req.body;

    // Get pending reports
    let sortCriteria = { createdAt: 1 };
    if (considerUrgency) {
      // Sort by urgency priority (critical first, then high, medium, low)
      sortCriteria = { createdAt: 1 }; // We'll handle urgency sorting in JavaScript
    }
    
    const pendingReports = await Report.find({ status: 'pending' })
      .sort(sortCriteria);
    
    // Sort by urgency if needed
    if (considerUrgency) {
      const urgencyOrder = { critical: 1, high: 2, medium: 3, low: 4 };
      pendingReports.sort((a, b) => {
        const aUrgency = urgencyOrder[a.urgency] || 5;
        const bUrgency = urgencyOrder[b.urgency] || 5;
        return aUrgency - bUrgency;
      });
    }

    // Get active collectors
    const activeCollectors = await User.find({ 
      role: 'collector', 
      isActive: true 
    }).select('name email _id');

    if (pendingReports.length === 0) {
      return res.json({
        success: true,
        message: 'No pending reports to assign',
        data: { assignedCount: 0 }
      });
    }

    if (activeCollectors.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active collectors available'
      });
    }

    // Get current workload for each collector
    const collectorWorkloads = {};
    for (const collector of activeCollectors) {
      const currentAssignments = await Report.countDocuments({
        assignedTo: collector._id,
        status: { $in: ['assigned', 'in_progress'] }
      });
      collectorWorkloads[collector._id.toString()] = currentAssignments;
    }

    let assignedCount = 0;
    const assignments = [];

    // Auto-assign logic
    for (const report of pendingReports) {
      // Find collector with least workload (if balanceWorkload is enabled)
      let selectedCollector;
      
      if (balanceWorkload) {
        selectedCollector = activeCollectors.reduce((best, current) => {
          const currentWorkload = collectorWorkloads[current._id.toString()] || 0;
          const bestWorkload = collectorWorkloads[best._id.toString()] || 0;
          
          // Skip if collector has reached max assignments
          if (currentWorkload >= maxAssignmentsPerCollector) return best;
          
          return currentWorkload < bestWorkload ? current : best;
        });
      } else {
        // Simple round-robin assignment
        selectedCollector = activeCollectors[assignedCount % activeCollectors.length];
      }

      // Check if selected collector can take more assignments
      const currentWorkload = collectorWorkloads[selectedCollector._id.toString()] || 0;
      if (currentWorkload >= maxAssignmentsPerCollector) {
        continue; // Skip this report if no collector available
      }

      // Assign the report
      await Report.findByIdAndUpdate(report._id, {
        assignedTo: selectedCollector._id,
        status: 'assigned',
        assignedAt: new Date()
      });

      // Update workload tracking
      collectorWorkloads[selectedCollector._id.toString()] = currentWorkload + 1;
      
      assignments.push({
        reportId: report._id,
        collectorId: selectedCollector._id,
        collectorName: selectedCollector.name
      });
      
      assignedCount++;
    }

    res.json({
      success: true,
      message: `Successfully auto-assigned ${assignedCount} reports`,
      data: { 
        assignedCount,
        assignments,
        settings: {
          prioritizeProximity,
          balanceWorkload,
          considerUrgency,
          maxAssignmentsPerCollector
        }
      }
    });

  } catch (error) {
    console.error('Auto-assignment error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ML Routes (Mock implementation)
app.post('/api/ml/predict', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    // Mock ML prediction
    const wasteTypes = ['plastic', 'organic', 'metal', 'glass', 'paper'];
    const randomType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
    const confidence = Math.random() * 0.4 + 0.6; // 60-100% confidence

    res.json({
      success: true,
      data: {
        prediction: {
          wasteType: randomType,
          confidence: confidence,
          suggestions: [`This appears to be ${randomType} waste`]
        }
      }
    });
  } catch (error) {
    console.error('ML prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
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
  console.log(`🚀 EcoTrack Real Backend running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🗄️  Database: ${process.env.MONGODB_URI ? 'MongoDB Atlas' : 'Not configured'}`);
});
