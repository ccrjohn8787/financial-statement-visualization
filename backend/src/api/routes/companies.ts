import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';
import type { IFinancialDataProvider } from '../../providers';
import { CompaniesController } from '../controllers/companies';
import { 
  validateQuery, 
  validateBody, 
  asyncHandler, 
  cacheControl,
  rateLimit,
} from '../middleware';
import {
  CompanySearchQuerySchema,
  OverviewQuerySchema,
  RefreshRequestSchema,
} from '../types';

export function createCompaniesRouter(
  prisma: PrismaClient,
  provider: IFinancialDataProvider
): Router {
  const router = Router();
  const controller = new CompaniesController(prisma, provider);

  // Company search endpoint
  router.get(
    '/search',
    rateLimit(100, 60 * 1000), // 100 requests per minute
    validateQuery(CompanySearchQuerySchema),
    cacheControl(300), // 5 minutes cache
    asyncHandler(controller.search)
  );

  // Get company by ticker
  router.get(
    '/:ticker',
    rateLimit(200, 60 * 1000), // 200 requests per minute
    cacheControl(1800), // 30 minutes cache
    asyncHandler(controller.getByTicker)
  );

  // Get company overview (dashboard data)
  router.get(
    '/:ticker/overview',
    rateLimit(150, 60 * 1000), // 150 requests per minute
    validateQuery(OverviewQuerySchema),
    cacheControl(900), // 15 minutes cache
    asyncHandler(controller.getOverview)
  );

  // Refresh company data
  router.post(
    '/:ticker/refresh',
    rateLimit(10, 60 * 1000), // 10 refresh requests per minute
    validateBody(RefreshRequestSchema),
    asyncHandler(controller.refresh)
  );

  // Get refresh job status
  router.get(
    '/:ticker/refresh/:jobId',
    rateLimit(50, 60 * 1000), // 50 status checks per minute
    asyncHandler(controller.getRefreshStatus)
  );

  return router;
}