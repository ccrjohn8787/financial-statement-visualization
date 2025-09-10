import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ApiErrorSchema } from './types';

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Request validation middleware
export const validateQuery = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.query);
      
      if (!result.success) {
        const errors: ValidationError[] = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.input,
        }));
        
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid query parameters', { errors });
      }
      
      req.query = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

export const validateBody = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        const errors: ValidationError[] = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          value: err.input,
        }));
        
        throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid request body', { errors });
      }
      
      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Async error handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error handling middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('API Error:', error);

  // Generate request ID for tracking
  const requestId = req.headers['x-request-id'] as string || 
                   Math.random().toString(36).substring(2, 15);

  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = undefined;

  if (error instanceof ApiError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = error.message;
  } else if (error.name === 'DataProviderError') {
    statusCode = 502;
    code = 'PROVIDER_ERROR';
    message = 'External data provider error';
    details = { provider: (error as any).provider };
  } else if (error.name === 'RateLimitError') {
    statusCode = 429;
    code = 'RATE_LIMIT_EXCEEDED';
    message = 'Rate limit exceeded, please try again later';
    details = { retryAfter: (error as any).retryAfter };
  } else if (error.name === 'DataNotFoundError') {
    statusCode = 404;
    code = 'DATA_NOT_FOUND';
    message = 'Requested data not found';
  }

  const errorResponse = {
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      requestId,
    },
  };

  res.status(statusCode).json(errorResponse);
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2, 15);
  
  req.headers['x-request-id'] = requestId;
  
  console.log(`[${requestId}] ${req.method} ${req.path} - Started`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${requestId}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });
  
  next();
};

// Rate limiting middleware (simple in-memory implementation)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export const rateLimit = (maxRequests: number, windowMs: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    const record = rateLimitStore.get(key);
    
    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }
    
    if (record.count >= maxRequests) {
      const resetIn = Math.ceil((record.resetTime - now) / 1000);
      
      res.set({
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
        'Retry-After': resetIn.toString(),
      });
      
      throw new ApiError(
        429,
        'RATE_LIMIT_EXCEEDED',
        `Too many requests. Try again in ${resetIn} seconds.`,
        { resetIn }
      );
    }
    
    record.count++;
    
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': (maxRequests - record.count).toString(),
      'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
    });
    
    next();
  };
};

// Cache control middleware
export const cacheControl = (maxAge: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    res.set('Cache-Control', `public, max-age=${maxAge}`);
    next();
  };
};