import { Course, ICourse } from '../models/course.model';
import { AppError } from '../utils/AppError';
import { redisClient } from '../config/redis';

export class CourseService {
  static async createCourse(courseData: Partial<ICourse>, instructorId: string): Promise<ICourse> {
    const course = new Course({
      ...courseData,
      instructor: instructorId
    });

    return await course.save();
  }

  static async getCourseById(courseId: string): Promise<ICourse> {
    const cachedCourse = await redisClient.get(`course:${courseId}`);
    if (cachedCourse) {
      return JSON.parse(cachedCourse);
    }

    const course = await Course.findById(courseId)
      .populate('instructor', 'name email avatar')
      .populate('studentsEnrolled', 'name email');

    if (!course) {
      throw new AppError('Course not found', 404);
    }

    // Cache for 1 hour
    await redisClient.setEx(`course:${courseId}`, 3600, JSON.stringify(course));

    return course;
  }

  static async getCourses(page: number = 1, limit: number = 10, filters: any = {}) {
    const skip = (page - 1) * limit;

    const query: any = { isPublished: true };
    
    if (filters.category) query.category = filters.category;
    if (filters.level) query.level = filters.level;
    if (filters.instructor) query.instructor = filters.instructor;

    const courses = await Course.find(query)
      .populate('instructor', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Course.countDocuments(query);

    return {
      courses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async updateCourse(courseId: string, updateData: Partial<ICourse>, instructorId: string): Promise<ICourse> {
    const course = await Course.findOne({ _id: courseId, instructor: instructorId });
    
    if (!course) {
      throw new AppError('Course not found or access denied', 404);
    }

    Object.assign(course, updateData);
    await course.save();

    // Clear cache
    await redisClient.del(`course:${courseId}`);

    return course;
  }

  static async enrollStudent(courseId: string, studentId: string): Promise<ICourse> {
    const course = await Course.findById(courseId);
    
    if (!course) {
      throw new AppError('Course not found', 404);
    }

    if (course.studentsEnrolled.includes(studentId as any)) {
      throw new AppError('Already enrolled in this course', 400);
    }

    course.studentsEnrolled.push(studentId as any);
    await course.save();

    return course;
  }
}