import { Router } from 'express';
import { 
  register, 
  login, 
  logout, 
  getProfile, 
  updateProfile,
  refreshToken,
  sendVerificationOTP,
  verifyOTP
} from '../controllers/user.controller';
import { validate } from '../middleware/validation';
import { authenticate } from '../middleware/auth';
import { 
  registerValidation, 
  loginValidation, 
  updateProfileValidation 
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

export default router;