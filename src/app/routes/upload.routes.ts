import { Router } from 'express';
import { uploadImage, uploadMultipleImages } from '../controllers/upload.controller';
import { upload } from '../middleware/upload';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/single', upload.single('image'), uploadImage);
router.post('/multiple', upload.array('images', 5), uploadMultipleImages);

export default router;