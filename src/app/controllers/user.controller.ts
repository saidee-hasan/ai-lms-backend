import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { generateToken, generateRefreshToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { redisClient } from '../config/redis';
import { sendOTPEmail, sendEmail } from '../utils/email';
import otpGenerator from 'otp-generator';
import { AuthRequest } from '../middleware/auth';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User already exists', 400);
  }

  const user = await User.create({ name, email, password, role });

  const accessToken = generateToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  await redisClient.setEx(`refresh_token:${user._id}`, 7 * 24 * 60 * 60, refreshToken);

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new AppError('Invalid credentials', 401);
  }

  user.lastLogin = new Date();
  await user.save();

  const accessToken = generateToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  await redisClient.setEx(`refresh_token:${user._id}`, 7 * 24 * 60 * 60, refreshToken);

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }
  });
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  
  if (userId) {
    await redisClient.del(`refresh_token:${userId}`);
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user?.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: { user }
  });
});

export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { name, avatar } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user?.id,
    { name, avatar },
    { new: true, runValidators: true }
  );

  res.json({
    success: true,
    data: { user }
  });
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    throw new AppError('Refresh token required', 401);
  }

  const decoded = verifyRefreshToken(refreshToken);
  const storedToken = await redisClient.get(`refresh_token:${decoded.id}`);

  if (!storedToken || storedToken !== refreshToken) {
    throw new AppError('Invalid refresh token', 401);
  }

  const newAccessToken = generateToken(decoded.id);

  res.cookie('accessToken', newAccessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000
  });

  res.json({
    success: true,
    message: 'Token refreshed successfully'
  });
});

export const sendVerificationOTP = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user?.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isVerified) {
    throw new AppError('User already verified', 400);
  }

  const otp = otpGenerator.generate(6, {
    digits: true,
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false
  });

  await redisClient.setEx(`verification_otp:${user._id}`, 600, otp);
  await sendOTPEmail(user.email, otp);

  res.json({
    success: true,
    message: 'OTP sent successfully'
  });
});

export const verifyOTP = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { otp } = req.body;
  const user = await User.findById(req.user?.id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const storedOTP = await redisClient.get(`verification_otp:${user._id}`);
  
  if (!storedOTP || storedOTP !== otp) {
    throw new AppError('Invalid OTP', 400);
  }

  user.isVerified = true;
  await user.save();
  await redisClient.del(`verification_otp:${user._id}`);

  res.json({
    success: true,
    message: 'Account verified successfully'
  });
});