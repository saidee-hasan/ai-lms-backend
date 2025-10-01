import { Request, Response } from 'express';
import { Course } from '../models/course.model';
import { CourseService } from '../services/course.service';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../middleware/auth';

export const createCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const courseData = req.body;
  const instructorId = req.user!.id;

  const course = await CourseService.createCourse(courseData, instructorId);

  res.status(201).json({
    success: true,
    data: { course }
  });
});

export const getCourses = asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const { category, level, instructor } = req.query;

  const filters: any = {};
  if (category) filters.category = category;
  if (level) filters.level = level;
  if (instructor) filters.instructor = instructor;

  const result = await CourseService.getCourses(page, limit, filters);

  res.json({
    success: true,
    data: result
  });
});

export const getCourse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const course = await CourseService.getCourseById(id);

  res.json({
    success: true,
    data: { course }
  });
});

export const updateCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;
  const instructorId = req.user!.id;

  const course = await CourseService.updateCourse(id, updateData, instructorId);

  res.json({
    success: true,
    data: { course }
  });
});

export const deleteCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const instructorId = req.user!.id;

  const course = await Course.findOne({ _id: id, instructor: instructorId });
  
  if (!course) {
    throw new AppError('Course not found or access denied', 404);
  }

  await Course.findByIdAndDelete(id);

  res.json({
    success: true,
    message: 'Course deleted successfully'
  });
});

export const enrollCourse = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const studentId = req.user!.id;

  const course = await CourseService.enrollStudent(id, studentId);

  res.json({
    success: true,
    message: 'Enrolled in course successfully',
    data: { course }
  });
});

export const getMyCourses = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  const courses = await Course.find({ studentsEnrolled: userId })
    .populate('instructor', 'name email avatar')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const total = await Course.countDocuments({ studentsEnrolled: userId });

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