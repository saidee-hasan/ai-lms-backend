import { Router } from 'express';
import { 
  register, 
  login, 
  logout, 
  getProfile, 
  updateProfile,
  refreshToken,
  sendVerificationOTP,
  verifyOTP,
  checkOTPExpiry,
  resendOTP,
  forgotPassword,
  resetPassword,
  changePassword
} from '../controllers/user.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { 
  registerValidation, 
  loginValidation, 
  updateProfileValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation
} from '../validations/user.validation';

const router = Router();

router.post('/register', validate(registerValidation), register);
router.post('/login', validate(loginValidation), login);
router.post('/logout', authenticate, logout);
router.post('/refresh-token', refreshToken);
router.get('/profile', authenticate, getProfile);
router.patch('/profile', authenticate, validate(updateProfileValidation), updateProfile);
router.post('/send-verification-otp', authenticate, sendVerificationOTP);
router.post('/verify-otp', authenticate, verifyOTP);
router.get('/check-otp-expiry', authenticate, checkOTPExpiry);
router.post('/resend-otp', authenticate, resendOTP);
router.post('/forgot-password', validate(forgotPasswordValidation), forgotPassword);
router.post('/reset-password', validate(resetPasswordValidation), resetPassword);
router.post('/change-password', authenticate, validate(changePasswordValidation), changePassword);

export default router;