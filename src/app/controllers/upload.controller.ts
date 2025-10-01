import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middleware/auth';

export const uploadImage = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400);
  }

  res.json({
    success: true,
    data: {
      url: (req.file as any).path,
      publicId: (req.file as any).filename
    }
  });
});

export const uploadMultipleImages = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.files || (req.files as any).length === 0) {
    throw new AppError('No files uploaded', 400);
  }

  const files = (req.files as any).map((file: any) => ({
    url: file.path,
    publicId: file.filename
  }));

  res.json({
    success: true,
    data: { files }
  });
});