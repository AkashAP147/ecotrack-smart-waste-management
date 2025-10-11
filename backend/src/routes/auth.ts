import { Router } from 'express';
import {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  getProfile,
  updateProfile,
  verifyOTP,
  sendOTP,
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../utils/validators';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../utils/validators';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', validate(registerSchema), register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validate(loginSchema), login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', validate(refreshTokenSchema), refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (remove refresh token)
 * @access  Private
 */
router.post('/logout', authenticate, logout);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post('/logout-all', authenticate, logoutAll);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/profile', authenticate, getProfile);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, updateProfile);

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP to phone number (mock implementation)
 * @access  Public
 */
router.post('/send-otp', sendOTP);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP and mark phone as verified
 * @access  Public
 */
router.post('/verify-otp', verifyOTP);

export default router;
