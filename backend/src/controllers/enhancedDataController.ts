import { Request, Response } from 'express';
import { ProviderFactory } from '../providers/factory';
import { DataProviderError, RateLimitError } from '../providers/types';
import { FinancialCalculationsService } from '../services/financialCalculations';
import { DataExportService, ExportOptions } from '../services/dataExport';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const TickerParamSchema = z.object({
  ticker: z.string().min(1).max(10).toUpperCase()
});

// Removed TechnicalIndicatorQuerySchema - focusing on fundamental analysis only

const ExportQuerySchema = z.object({
  format: z.enum(['csv', 'excel', 'pdf', 'json']).default('csv'),
  from: z.string().optional(),
  to: z.string().optional(),
  includeRatios: z.string().transform(val => val === 'true').optional(),
  includePerformance: z.string().transform(val => val === 'true').optional(),
  includePeers: z.string().transform(val => val === 'true').optional(),
});

export class EnhancedDataController {
  private factory = ProviderFactory.getInstance();
  private calculationsService: FinancialCalculationsService;
  private exportService: DataExportService;
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
    this.calculationsService = new FinancialCalculationsService(this.prisma);
    this.exportService = new DataExportService(this.prisma);
  }

  /**
   * Get financial ratios for a company
   * GET /api/companies/:ticker/ratios?source=provider|calculated|both
   */
  async getFinancialRatios(req: Request, res: Response) {
    try {
      const { ticker } = TickerParamSchema.parse(req.params);
      const source = req.query.source as string || 'both';
      
      let providerRatios: any[] = [];
      let calculatedRatios: any[] = [];
      let providerName = '';

      // Get ratios from external providers if requested
      if (source === 'provider' || source === 'both') {
        const registry = this.factory.getRegistry();
        const providers = registry.getAll();
        const ratioProviders = providers.filter(p => p.capabilities.hasRatioData);
        
        for (const provider of ratioProviders) {
          try {
            if ('getFinancialRatios' in provider) {
              providerRatios = await (provider as any).getFinancialRatios(ticker);
              providerName = provider.name;
              if (providerRatios.length > 0) break;
            }
          } catch (error) {
            console.warn(`Ratio provider ${provider.name} failed:`, error);
          }
        }
      }

      // Get calculated ratios from XBRL data if requested
      if (source === 'calculated' || source === 'both') {
        try {
          calculatedRatios = await this.calculationsService.calculateAdvancedRatios(ticker, 8);
        } catch (error) {
          console.warn('Advanced ratio calculation failed:', error);
        }
      }

      // Combine and deduplicate ratios
      const allRatios = [...providerRatios, ...calculatedRatios];
      const uniqueRatios = this.deduplicateRatios(allRatios);

      if (uniqueRatios.length === 0) {
        return res.status(404).json({
          success: false,
          error: `No financial ratios found for ${ticker}`
        });
      }

      // Group ratios by category for better organization
      const ratiosByCategory = uniqueRatios.reduce((acc, ratio) => {
        if (!acc[ratio.category]) {
          acc[ratio.category] = [];
        }
        acc[ratio.category].push(ratio);
        return acc;
      }, {} as Record<string, any[]>);

      res.json({
        success: true,
        data: {
          ticker,
          ratios: uniqueRatios,
          ratiosByCategory,
          sources: {
            provider: providerName || null,
            calculated: calculatedRatios.length > 0,
          },
          totalCount: uniqueRatios.length,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      this.handleError(error, res, 'getFinancialRatios');
    }
  }

  /**
   * Get real-time price for a company
   * GET /api/companies/:ticker/price
   */
  async getRealTimePrice(req: Request, res: Response) {
    try {
      const { ticker } = TickerParamSchema.parse(req.params);
      
      const registry = this.factory.getRegistry();
      const providers = registry.getAll();
      
      // Try providers that support real-time data
      const priceProviders = providers.filter(p => p.capabilities.hasRealTimeData);
      
      if (priceProviders.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No providers available for real-time prices'
        });
      }

      let priceData = null;
      let lastError: Error | null = null;

      // Try each price provider until one succeeds
      for (const provider of priceProviders) {
        try {
          if ('getRealTimePrice' in provider) {
            priceData = await (provider as any).getRealTimePrice(ticker);
            if (priceData) break;
          }
        } catch (error) {
          lastError = error as Error;
          console.warn(`Price provider ${provider.name} failed:`, error);
        }
      }

      if (!priceData) {
        return res.status(404).json({
          success: false,
          error: lastError?.message || `No price data found for ${ticker}`
        });
      }

      res.json({
        success: true,
        data: {
          ...priceData,
          source: priceProviders[0].name
        }
      });
    } catch (error) {
      this.handleError(error, res, 'getRealTimePrice');
    }
  }

  // Removed getTechnicalIndicators - focusing on fundamental analysis only

  /**
   * Get peer companies for comparison
   * GET /api/companies/:ticker/peers
   */
  async getPeerCompanies(req: Request, res: Response) {
    try {
      const { ticker } = TickerParamSchema.parse(req.params);
      
      const registry = this.factory.getRegistry();
      const providers = registry.getAll();
      
      // Try providers that support peer data
      const peerProviders = providers.filter(p => p.capabilities.hasPeerData);
      
      if (peerProviders.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'No providers available for peer data'
        });
      }

      let peers = [];
      let lastError: Error | null = null;

      // Try each peer provider until one succeeds
      for (const provider of peerProviders) {
        try {
          if ('getPeerCompanies' in provider) {
            peers = await (provider as any).getPeerCompanies(ticker);
            if (peers.length > 0) break;
          }
        } catch (error) {
          lastError = error as Error;
          console.warn(`Peer provider ${provider.name} failed:`, error);
        }
      }

      if (peers.length === 0) {
        return res.status(404).json({
          success: false,
          error: lastError?.message || `No peer companies found for ${ticker}`
        });
      }

      res.json({
        success: true,
        data: {
          ticker,
          peers,
          source: peerProviders[0].name,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      this.handleError(error, res, 'getPeerCompanies');
    }
  }

  /**
   * Get comprehensive performance metrics for a company
   * GET /api/companies/:ticker/performance
   */
  async getPerformanceMetrics(req: Request, res: Response) {
    try {
      const { ticker } = TickerParamSchema.parse(req.params);
      
      const performanceMetrics = await this.calculationsService.calculatePerformanceMetrics(ticker);

      res.json({
        success: true,
        data: {
          ticker,
          performance: performanceMetrics,
          lastUpdated: new Date().toISOString()
        }
      });
    } catch (error) {
      this.handleError(error, res, 'getPerformanceMetrics');
    }
  }

  /**
   * Export financial data in various formats
   * GET /api/companies/:ticker/export?format=csv&includeRatios=true
   */
  async exportFinancialData(req: Request, res: Response) {
    try {
      const { ticker } = TickerParamSchema.parse(req.params);
      const queryParams = ExportQuerySchema.parse(req.query);

      const options: ExportOptions = {
        ticker,
        format: queryParams.format,
        includeRatios: queryParams.includeRatios || false,
        includePerformance: queryParams.includePerformance || false,
        includePeers: queryParams.includePeers || false,
      };

      // Add date range if provided
      if (queryParams.from || queryParams.to) {
        options.dateRange = {
          from: queryParams.from ? new Date(queryParams.from) : new Date('2020-01-01'),
          to: queryParams.to ? new Date(queryParams.to) : new Date(),
        };
      }

      await this.exportService.streamExport(options, res);
      
    } catch (error) {
      this.handleError(error, res, 'exportFinancialData');
    }
  }

  /**
   * Get provider status and capabilities
   * GET /api/providers/status
   */
  async getProviderStatus(req: Request, res: Response) {
    try {
      const status = await this.factory.getProviderStatus();
      
      const providerInfo = Array.from(status.entries()).map(([name, info]) => ({
        name,
        healthy: info.healthy,
        capabilities: info.capabilities
      }));

      res.json({
        success: true,
        data: {
          providers: providerInfo,
          lastChecked: new Date().toISOString()
        }
      });
    } catch (error) {
      this.handleError(error, res, 'getProviderStatus');
    }
  }

  /**
   * Helper method to deduplicate ratios by name and keep the most recent
   */
  private deduplicateRatios(ratios: any[]): any[] {
    const ratioMap = new Map();
    
    ratios.forEach(ratio => {
      const existing = ratioMap.get(ratio.name);
      if (!existing || ratio.periodEnd > existing.periodEnd) {
        ratioMap.set(ratio.name, ratio);
      }
    });
    
    return Array.from(ratioMap.values())
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
  }

  private handleError(error: unknown, res: Response, operation: string) {
    console.error(`EnhancedDataController.${operation} error:`, error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request parameters',
        details: error.errors
      });
    }

    if (error instanceof RateLimitError) {
      return res.status(429).json({
        success: false,
        error: error.message,
        retryAfter: error.retryAfter
      });
    }

    if (error instanceof DataProviderError) {
      const statusCode = error.statusCode || 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message,
        provider: error.provider,
        code: error.code
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}