import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { env } from '../config';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      details: err.details,
      ...(env.NODE_ENV === 'development' && { stack: err.stack })
    });
    return;
  }

  // Mongoose duplicate key error
  if ((err as any).code === 11000) {
    const message = 'Duplicate field value entered';
    res.status(400).json({
      success: false,
      message
    });
    return;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values((err as any).errors).map((val: any) => val.message);
    res.status(400).json({
      success: false,
      message: 'Validation Error',
      details: message
    });
    return;
  }

  // Mongoose cast error
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    res.status(404).json({
      success: false,
      message
    });
    return;
  }

  console.error('Error:', err);

  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    ...(env.NODE_ENV === 'development' && { stack: err.stack })
  });
};