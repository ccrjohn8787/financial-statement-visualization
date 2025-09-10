import { Router } from 'express';
import { EnhancedDataController } from '../controllers/enhancedDataController';

const router = Router();
const controller = new EnhancedDataController();

/**
 * Enhanced financial data endpoints for Phase 4
 * 
 * These endpoints utilize commercial data providers (FMP, Alpha Vantage)
 * to provide advanced financial insights beyond basic SEC data
 */

// Financial ratios and calculated metrics
router.get('/companies/:ticker/ratios', controller.getFinancialRatios.bind(controller));

// Performance metrics and trend analysis
router.get('/companies/:ticker/performance', controller.getPerformanceMetrics.bind(controller));

// Real-time market data
router.get('/companies/:ticker/price', controller.getRealTimePrice.bind(controller));

// Removed technical indicators - focusing on fundamental analysis only

// Peer company comparisons
router.get('/companies/:ticker/peers', controller.getPeerCompanies.bind(controller));

// Data export
router.get('/companies/:ticker/export', controller.exportFinancialData.bind(controller));

// Provider health and capabilities
router.get('/providers/status', controller.getProviderStatus.bind(controller));

export default router;