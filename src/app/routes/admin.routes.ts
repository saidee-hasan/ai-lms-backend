import { Router } from 'express';
import { getAdminStats, getUsers, updateUser, deleteUser } from '../controllers/admin.controller';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { updateProfileValidation } from '../validations/user.validation';

const router = Router();

router.use(authenticate, authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/users', getUsers);
router.patch('/users/:id', validate(updateProfileValidation), updateUser);
router.delete('/users/:id', deleteUser);

export default router;