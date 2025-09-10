import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import { MetricsController } from '../controllers/metrics';
import { 
  validateQuery, 
  asyncHandler, 
  cacheControl,
  rateLimit,
} from '../middleware';
import { MetricQuerySchema } from '../types';

export function createMetricsRouter(prisma: PrismaClient): Router {
  const router = Router();
  const controller = new MetricsController(prisma);

  // Get metric time series
  router.get(
    '/:ticker/metrics/:concept',
    rateLimit(100, 60 * 1000), // 100 requests per minute
    validateQuery(MetricQuerySchema),
    cacheControl(1800), // 30 minutes cache
    asyncHandler(controller.getMetricTimeSeries)
  );

  // Get peer comparison for a metric
  router.get(
    '/:ticker/metrics/:concept/peers',
    rateLimit(50, 60 * 1000), // 50 requests per minute
    cacheControl(3600), // 1 hour cache (peer data changes less frequently)
    asyncHandler(controller.getPeerComparison)
  );

  return router;
}