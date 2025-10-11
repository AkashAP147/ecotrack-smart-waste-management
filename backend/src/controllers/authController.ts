import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';
import config from '../config';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate JWT tokens for user
 */
const generateTokens = (user: IUser): AuthTokens => {
  const payload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const accessToken = (jwt as any).sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpire,
  });

  const refreshToken = (jwt as any).sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpire,
  });

  return { accessToken, refreshToken };
};

/**
 * Register new user
 */
export const register = async (req: Request, res: Response) => {
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

    // Save refresh token to user
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    // Remove sensitive data from response
    const userResponse = user.toJSON();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: userResponse,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
    });
  }
};

/**
 * Login user
 */
export const login = async (req: Request, res: Response) => {
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

    // Save refresh token to user
    user.refreshTokens.push(tokens.refreshToken);
    await user.save();

    // Remove sensitive data from response
    const userResponse = user.toJSON();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login',
    });
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required',
      });
    }

    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as any;

      // Find user and check if refresh token exists
      const user = await User.findById(decoded.userId);
      if (!user || !user.refreshTokens.includes(refreshToken)) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated',
        });
      }

      // Generate new tokens
      const tokens = generateTokens(user);

      // Replace old refresh token with new one
      const tokenIndex = user.refreshTokens.indexOf(refreshToken);
      user.refreshTokens[tokenIndex] = tokens.refreshToken;
      await user.save();

      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
      });
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during token refresh',
    });
  }
};

/**
 * Logout user
 */
export const logout = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Remove refresh token from user
    if (refreshToken) {
      const tokenIndex = user.refreshTokens.indexOf(refreshToken);
      if (tokenIndex > -1) {
        user.refreshTokens.splice(tokenIndex, 1);
        await user.save();
      }
    }

    res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout',
    });
  }
};

/**
 * Logout from all devices
 */
export const logoutAll = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Clear all refresh tokens
    user.refreshTokens = [];
    await user.save();

    res.json({
      success: true,
      message: 'Logged out from all devices successfully',
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during logout',
    });
  }
};

/**
 * Get current user profile
 */
export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching profile',
    });
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (req: Request, res: Response) => {
  try {
    const user = req.user;
    const { name, phone, fcmToken } = req.body;

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    // Update allowed fields
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (fcmToken !== undefined) user.fcmToken = fcmToken;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: user.toJSON(),
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating profile',
    });
  }
};

/**
 * Mock OTP verification endpoint
 */
export const verifyOTP = async (req: Request, res: Response) => {
  try {
    const { phone, otp } = req.body;

    // Mock OTP verification - in production, integrate with SMS service
    const validOTP = '123456'; // Mock OTP for development

    if (otp !== validOTP) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    // Find user by phone and mark as verified
    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.isVerified = true;
    await user.save();

    res.json({
      success: true,
      message: 'Phone number verified successfully',
      data: {
        user: user.toJSON(),
      },
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during OTP verification',
    });
  }
};

/**
 * Send OTP (mock implementation)
 */
export const sendOTP = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    // Mock OTP sending - in production, integrate with SMS service
    const otp = '123456'; // Mock OTP for development

    // In production, you would:
    // 1. Generate random OTP
    // 2. Store it in database with expiration
    // 3. Send via SMS service

    res.json({
      success: true,
      message: 'OTP sent successfully',
      data: {
        otp: config.nodeEnv === 'development' ? otp : undefined, // Only show in development
        expiresIn: 300, // 5 minutes
      },
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while sending OTP',
    });
  }
};
