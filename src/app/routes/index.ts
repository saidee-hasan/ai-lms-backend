import { Router } from 'express';
import userRoutes from './user.routes';
import courseRoutes from './course.routes';
import adminRoutes from './admin.routes';

export const routes = Router();

routes.use('/users', userRoutes);
routes.use('/courses', courseRoutes);
routes.use('/admin', adminRoutes);