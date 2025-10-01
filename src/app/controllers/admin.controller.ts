import { Request, Response } from 'express';
import { User } from '../models/user.model';
import { Course } from '../models/course.model';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../middleware/auth';

export const getAdminStats = asyncHandler(async (req: AuthRequest, res: Response) => {
  const totalUsers = await User.countDocuments();
  const totalCourses = await Course.countDocuments();
  const totalInstructors = await User.countDocuments({ role: 'instructor' });
  const totalStudents = await User.countDocuments({ role: 'student' });

  const recentUsers = await User.find()
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name email role createdAt');

  const recentCourses = await Course.find()
    .populate('instructor', 'name email')
    .sort({ createdAt: -1 })
    .limit(5)
    .select('title instructor studentsEnrolled createdAt');

  res.json({
    success: true,
    data: {
      stats: {
        totalUsers,
        totalCourses,
        totalInstructors,
        totalStudents
      },
      recentUsers,
      recentCourses
    }
  });
});

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const { role } = req.query;

  const query: any = {};
  if (role) query.role = role;

  const users = await User.find(query)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, role, avatar } = req.body;

  const user = await User.findByIdAndUpdate(
    id,
    { name, role, avatar },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    data: { user }
  });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await User.findByIdAndDelete(id);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({
    success: true,
    message: 'User deleted successfully'
  });
});

export const getCourses = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const { status } = req.query;

  const query: any = {};
  if (status) query.isPublished = status === 'published';

  const courses = await Course.find(query)
    .populate('instructor', 'name email')
    .populate('studentsEnrolled', 'name email')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Course.countDocuments(query);

  res.json({
    success: true,
    data: {
      courses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

export const updateCourse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { isPublished, featured } = req.body;

  const course = await Course.findByIdAndUpdate(
    id,
    { isPublished, featured },
    { new: true, runValidators: true }
  ).populate('instructor', 'name email');

  if (!course) {
    throw new AppError('Course not found', 404);
  }

  res.json({
    success: true,
    data: { course }
  });
});