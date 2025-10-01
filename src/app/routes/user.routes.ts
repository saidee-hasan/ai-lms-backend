import { Router } from 'express';
import { 
  register, 
  login, 
  logout, 
  getProfile, 
  updateProfile 
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
router.get('/profile', authenticate, getProfile);
router.patch('/profile', authenticate, validate(updateProfileValidation), updateProfile);

export default router;