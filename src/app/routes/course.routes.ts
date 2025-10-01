import { Router } from 'express';
import { 
  createCourse,
  getCourses,
  getCourse,
  updateCourse,
  deleteCourse,
  enrollCourse,
  getMyCourses
} from '../controllers/course.controller';
import { validate } from '../middleware/validation';
import { authenticate, authorize } from '../middleware/auth';
import { 
  createCourseValidation, 
  updateCourseValidation 
} from '../validations/course.validation';

const router = Router();

router.post('/', authenticate, authorize('instructor', 'admin'), validate(createCourseValidation), createCourse);
router.get('/', getCourses);
router.get('/my-courses', authenticate, getMyCourses);
router.get('/:id', getCourse);
router.patch('/:id', authenticate, authorize('instructor', 'admin'), validate(updateCourseValidation), updateCourse);
router.delete('/:id', authenticate, authorize('instructor', 'admin'), deleteCourse);
router.post('/:id/enroll', authenticate, authorize('student'), enrollCourse);

export default router;