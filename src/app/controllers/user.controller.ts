import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { redisClient } from '../config/redis';
import { sendOTPEmail } from '../utils/email';
import { AuthRequest } from '../middleware/auth';

// OTP generate function
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// OTP expiration time (5 minutes in seconds)
const OTP_EXPIRY_TIME = 5 * 60; // 5 minutes

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('User already exists', 400);
  }

  // Create user
  const user = await User.create({ name, email, password, role });

  // Generate tokens
  const accessToken = generateToken(user._id.toString());
  const refreshToken = generateRefreshToken(user._id.toString());

  await redisClient.setEx(`refresh_token:${user._id}`, 7 * 24 * 60 * 60, refreshToken);

  // ✅ AUTO SEND OTP AFTER REGISTRATION (5 minutes expiry)
  const otp = generateOTP();
  const otpExpiry = Math.floor(Date.now() / 1000) + OTP_EXPIRY_TIME;
  
  await redisClient.setEx(`verification_otp:${user._id}`, OTP_EXPIRY_TIME, otp);
  await redisClient.set(`otp_expiry:${user._id}`, otpExpiry.toString());
  
  console.log(`📧 Registration OTP for ${user.email}: ${otp} (Expires in 5 minutes)`);
  
  // Production-এ email send করুন
  if (process.env.NODE_ENV === 'production') {
    try {
      await sendOTPEmail(user.email, otp);
    } catch (emailError) {
      console.log('⚠️ OTP email sending failed, but continuing...');
    }
  }

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
    message: 'Registration successful! OTP sent to your email. Valid for 5 minutes.',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: false
      },
      otpInfo: {
        expiresIn: OTP_EXPIRY_TIME,
        message: 'OTP valid for 5 minutes'
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

  let otpInfo = null;

  // ✅ AUTO SEND OTP AFTER LOGIN (if not verified) - 5 minutes expiry
  if (!user.isVerified) {
    const otp = generateOTP();
    const otpExpiry = Math.floor(Date.now() / 1000) + OTP_EXPIRY_TIME;
    
    await redisClient.setEx(`verification_otp:${user._id}`, OTP_EXPIRY_TIME, otp);
    await redisClient.set(`otp_expiry:${user._id}`, otpExpiry.toString());
    
    console.log(`📧 Login OTP for ${user.email}: ${otp} (Expires in 5 minutes)`);
    
    otpInfo = {
      expiresIn: OTP_EXPIRY_TIME,
      message: 'OTP valid for 5 minutes'
    };

    if (process.env.NODE_ENV === 'production') {
      try {
        await sendOTPEmail(user.email, otp);
      } catch (emailError) {
        console.log('⚠️ OTP email sending failed, but continuing...');
      }
    }
  }

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
    message: user.isVerified ? 'Login successful!' : 'Login successful! OTP sent for verification.',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified
      },
      ...(otpInfo && { otpInfo })
    }
  });
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  
  if (userId) {
    await redisClient.del(`refresh_token:${userId}`);
    await redisClient.del(`verification_otp:${userId}`);
    await redisClient.del(`otp_expiry:${userId}`);
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

  const decoded = verifyRefreshToken(refreshToken) as { id: string };
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

  const otp = generateOTP();
  const otpExpiry = Math.floor(Date.now() / 1000) + OTP_EXPIRY_TIME;

  await redisClient.setEx(`verification_otp:${user._id}`, OTP_EXPIRY_TIME, otp);
  await redisClient.set(`otp_expiry:${user._id}`, otpExpiry.toString());
  
  console.log(`📧 Manual OTP for ${user.email}: ${otp} (Expires in 5 minutes)`);
  
  if (process.env.NODE_ENV === 'production') {
    try {
      await sendOTPEmail(user.email, otp);
    } catch (emailError) {
      console.log('⚠️ OTP email sending failed');
      throw new AppError('Failed to send OTP email', 500);
    }
  }

  res.json({
    success: true,
    message: 'OTP sent successfully. Valid for 5 minutes.',
    data: {
      expiresIn: OTP_EXPIRY_TIME,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_TIME * 1000).toISOString()
    }
  });
});

export const verifyOTP = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { otp } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check OTP expiry
  const otpExpiry = await redisClient.get(`otp_expiry:${userId}`);
  const currentTime = Math.floor(Date.now() / 1000);

  if (otpExpiry && currentTime > parseInt(otpExpiry)) {
    await redisClient.del(`verification_otp:${userId}`);
    await redisClient.del(`otp_expiry:${userId}`);
    throw new AppError('OTP has expired. Please request a new one.', 400);
  }

  const storedOTP = await redisClient.get(`verification_otp:${userId}`);
  
  if (!storedOTP || storedOTP !== otp) {
    throw new AppError('Invalid OTP', 400);
  }

  // Verify user
  user.isVerified = true;
  await user.save();
  
  // Clear OTP data
  await redisClient.del(`verification_otp:${userId}`);
  await redisClient.del(`otp_expiry:${userId}`);

  res.json({
    success: true,
    message: 'Account verified successfully!',
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: true
      }
    }
  });
});

// Check OTP expiry time
export const checkOTPExpiry = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const otpExpiry = await redisClient.get(`otp_expiry:${userId}`);
  
  if (!otpExpiry) {
    throw new AppError('No active OTP found', 404);
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const timeRemaining = parseInt(otpExpiry) - currentTime;

  if (timeRemaining <= 0) {
    await redisClient.del(`verification_otp:${userId}`);
    await redisClient.del(`otp_expiry:${userId}`);
    throw new AppError('OTP has expired', 400);
  }

  res.json({
    success: true,
    data: {
      timeRemaining,
      expiresIn: timeRemaining,
      expiresAt: new Date(parseInt(otpExpiry) * 1000).toISOString(),
      message: `OTP valid for ${Math.ceil(timeRemaining / 60)} minutes`
    }
  });
});

// Resend OTP
export const resendOTP = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user?.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (user.isVerified) {
    throw new AppError('User already verified', 400);
  }

  // Clear any existing OTP
  await redisClient.del(`verification_otp:${user._id}`);
  await redisClient.del(`otp_expiry:${user._id}`);

  // Generate new OTP
  const otp = generateOTP();
  const otpExpiry = Math.floor(Date.now() / 1000) + OTP_EXPIRY_TIME;

  await redisClient.setEx(`verification_otp:${user._id}`, OTP_EXPIRY_TIME, otp);
  await redisClient.set(`otp_expiry:${user._id}`, otpExpiry.toString());
  
  console.log(`📧 Resent OTP for ${user.email}: ${otp} (Expires in 5 minutes)`);
  
  if (process.env.NODE_ENV === 'production') {
    try {
      await sendOTPEmail(user.email, otp);
    } catch (emailError) {
      console.log('⚠️ OTP email sending failed');
      throw new AppError('Failed to send OTP email', 500);
    }
  }

  res.json({
    success: true,
    message: 'New OTP sent successfully. Valid for 5 minutes.',
    data: {
      expiresIn: OTP_EXPIRY_TIME,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_TIME * 1000).toISOString()
    }
  });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('User not found with this email', 404);
  }

  const resetToken = generateOTP();
  const tokenExpiry = Math.floor(Date.now() / 1000) + OTP_EXPIRY_TIME;

  await redisClient.setEx(`reset_token:${user._id}`, OTP_EXPIRY_TIME, resetToken);
  await redisClient.set(`reset_token_expiry:${user._id}`, tokenExpiry.toString());

  console.log(`📧 Password Reset OTP for ${user.email}: ${resetToken} (Expires in 5 minutes)`);

  if (process.env.NODE_ENV === 'production') {
    try {
      await sendOTPEmail(user.email, resetToken);
    } catch (emailError) {
      console.log('⚠️ Reset OTP email sending failed');
      throw new AppError('Failed to send reset OTP email', 500);
    }
  }

  res.json({
    success: true,
    message: 'Password reset OTP sent to your email. Valid for 5 minutes.',
    data: {
      expiresIn: OTP_EXPIRY_TIME
    }
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Check reset token expiry
  const tokenExpiry = await redisClient.get(`reset_token_expiry:${user._id}`);
  const currentTime = Math.floor(Date.now() / 1000);

  if (tokenExpiry && currentTime > parseInt(tokenExpiry)) {
    await redisClient.del(`reset_token:${user._id}`);
    await redisClient.del(`reset_token_expiry:${user._id}`);
    throw new AppError('Reset OTP has expired. Please request a new one.', 400);
  }

  const storedOTP = await redisClient.get(`reset_token:${user._id}`);
  
  if (!storedOTP || storedOTP !== otp) {
    throw new AppError('Invalid OTP', 400);
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Clear reset token data
  await redisClient.del(`reset_token:${user._id}`);
  await redisClient.del(`reset_token_expiry:${user._id}`);

  res.json({
    success: true,
    message: 'Password reset successfully'
  });
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError('User not authenticated', 401);
  }

  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', 400);
  }

  // Update to new password
  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully'
  });
});