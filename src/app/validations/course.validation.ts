import { z } from 'zod';

export const createCourseValidation = z.object({
  body: z.object({
    title: z.string().min(5, 'Title must be at least 5 characters'),
    description: z.string().min(10, 'Description must be at least 10 characters'),
    price: z.number().min(0, 'Price cannot be negative'),
    discount: z.number().min(0).max(100).default(0),
    category: z.string().min(1, 'Category is required'),
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    requirements: z.array(z.string()).default([]),
    learningOutcomes: z.array(z.string()).default([])
  })
});

export const updateCourseValidation = z.object({
  body: z.object({
    title: z.string().min(5).optional(),
    description: z.string().min(10).optional(),
    price: z.number().min(0).optional(),
    discount: z.number().min(0).max(100).optional(),
    category: z.string().optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    isPublished: z.boolean().optional()
  })
});

export const createMilestoneValidation = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    order: z.number().min(0, 'Order must be non-negative')
  })
});

export const addVideoValidation = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    url: z.string().url('Invalid URL'),
    duration: z.number().min(0, 'Duration must be non-negative'),
    thumbnail: z.string().url('Invalid URL').optional()
  })
});