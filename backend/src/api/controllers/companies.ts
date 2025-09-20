import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import type { IFinancialDataProvider } from '../../providers';
import { DataNotFoundError } from '../../providers';
import { ApiError } from '../middleware';
import type {
  CompanySearchQuery,
  OverviewQuery,
  RefreshRequest,
  CompanySearchResult,
  CompanyOverview,
  MetricOverview,
} from '../types';
import { FINANCIAL_CONCEPTS } from '../types';
import { addIngestJob, getJobStatus } from '../../lib/queue';

export class CompaniesController {
  constructor(
    private prisma: PrismaClient,
    private provider: IFinancialDataProvider
  ) {}

  // GET /api/companies/search?q=AAPL&limit=10
  search = async (req: Request, res: Response) => {
    const { q, limit } = req.query as CompanySearchQuery;

    try {
      // Search in local database first
      const companies = await this.prisma.company.findMany({
        where: {
          OR: [
            { ticker: { contains: q.toUpperCase(), mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
            { cik: { contains: q.padStart(10, '0') } },
          ],
        },
        take: parseInt(limit, 10),
        orderBy: [
          // Prioritize exact ticker matches
          { ticker: 'asc' },
          { name: 'asc' },
        ],
      });

      const results: CompanySearchResult[] = companies.map(company => ({
        cik: company.cik,
        ticker: company.ticker,
        name: company.name,
        sic: company.sic || undefined,
        sector: undefined, // TODO: Add sector mapping from SIC
        industry: undefined,
      }));

      // If we don't have enough results, could try provider search
      // but SEC EDGAR doesn't have search functionality
      
      res.json({
        data: results,
        meta: {
          total: results.length,
          query: q,
          limit,
        },
      });
    } catch (error) {
      throw new ApiError(500, 'SEARCH_ERROR', 'Failed to search companies');
    }
  };

  // GET /api/companies/:ticker
  getByTicker = async (req: Request, res: Response) => {
    const { ticker } = req.params;

    if (!ticker) {
      throw new ApiError(400, 'INVALID_TICKER', 'Ticker parameter is required');
    }

    try {
      const company = await this.prisma.company.findUnique({
        where: { ticker: ticker.toUpperCase() },
      });

      if (!company) {
        throw new DataNotFoundError('Database', ticker);
      }

      res.json({
        data: {
          cik: company.cik,
          ticker: company.ticker,
          name: company.name,
          sic: company.sic,
          fiscalYearEnd: company.fiscalYearEnd,
          createdAt: company.createdAt.toISOString(),
          updatedAt: company.updatedAt.toISOString(),
        },
      });
    } catch (error) {
      if (error instanceof DataNotFoundError) {
        throw new ApiError(404, 'COMPANY_NOT_FOUND', `Company with ticker ${ticker} not found`);
      }
      throw error;
    }
  };

  // GET /api/companies/:ticker/overview?range=3y&refresh=false
  getOverview = async (req: Request, res: Response) => {
    const { ticker } = req.params;
    const { range, refresh } = req.query as OverviewQuery;

    if (!ticker) {
      throw new ApiError(400, 'INVALID_TICKER', 'Ticker parameter is required');
    }

    try {
      // Get company info
      const company = await this.prisma.company.findUnique({
        where: { ticker: ticker.toUpperCase() },
      });

      if (!company) {
        throw new ApiError(404, 'COMPANY_NOT_FOUND', `Company with ticker ${ticker} not found`);
      }

      // Key metrics for dashboard
      const dashboardConcepts = [
        'Revenues',
        'NetIncomeLoss',
        'CashAndCashEquivalentsAtCarryingValue',
        'LongTermDebtNoncurrent',
      ];

      // Get latest metrics from metric views
      const latestMetrics = await this.prisma.metricView.findMany({
        where: {
          cik: company.cik,
          metric: { in: dashboardConcepts },
        },
        orderBy: [
          { metric: 'asc' },
          { periodEnd: 'desc' },
        ],
        distinct: ['metric'],
      });

      // Calculate changes (QoQ and YoY)
      const metricsWithChanges: MetricOverview[] = await Promise.all(
        latestMetrics.map(async (metric) => {
          const change = await this.calculateChange(company.cik, metric.metric, metric.periodEnd);

          return {
            concept: metric.metric,
            label: FINANCIAL_CONCEPTS[metric.metric as keyof typeof FINANCIAL_CONCEPTS] || metric.metric,
            value: Number(metric.value),
            unit: this.getMetricUnit(metric.metric),
            periodEnd: metric.periodEnd.toISOString(),
            fiscalPeriod: metric.fiscalPeriod,
            fiscalYear: metric.fiscalYear,
            change,
          };
        })
      );

      const overview: CompanyOverview = {
        company: {
          cik: company.cik,
          ticker: company.ticker,
          name: company.name,
          sic: company.sic || undefined,
          fiscalYearEnd: company.fiscalYearEnd || undefined,
        },
        metrics: metricsWithChanges,
        lastUpdated: company.updatedAt.toISOString(),
        source: 'SEC EDGAR',
        disclaimer: 'This information is for educational purposes only and should not be considered as investment advice.',
      };

      res.json({ data: overview });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'OVERVIEW_ERROR', 'Failed to fetch company overview');
    }
  };

  // POST /api/companies/:ticker/refresh
  refresh = async (req: Request, res: Response) => {
    const { ticker } = req.params;
    const { force, concepts } = req.body as RefreshRequest;

    if (!ticker) {
      throw new ApiError(400, 'INVALID_TICKER', 'Ticker parameter is required');
    }

    try {
      // Get company CIK
      const company = await this.prisma.company.findUnique({
        where: { ticker: ticker.toUpperCase() },
        select: { cik: true },
      });

      if (!company) {
        throw new ApiError(404, 'COMPANY_NOT_FOUND', `Company with ticker ${ticker} not found`);
      }

      // Add ingestion job
      const job = await addIngestJob({
        cik: company.cik,
        ticker: ticker.toUpperCase(),
        force,
      });

      res.json({
        data: {
          jobId: job.id,
          status: 'queued',
          message: `Data refresh queued for ${ticker}`,
        },
      });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'REFRESH_ERROR', 'Failed to queue data refresh');
    }
  };

  // GET /api/companies/:ticker/refresh/:jobId
  getRefreshStatus = async (req: Request, res: Response) => {
    const { jobId } = req.params;

    if (!jobId) {
      throw new ApiError(400, 'INVALID_JOB_ID', 'Job ID parameter is required');
    }

    try {
      const status = await getJobStatus(jobId);

      if (!status) {
        throw new ApiError(404, 'JOB_NOT_FOUND', `Job ${jobId} not found`);
      }

      res.json({ data: status });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'STATUS_ERROR', 'Failed to fetch job status');
    }
  };

  private async calculateChange(cik: string, concept: string, currentPeriodEnd: Date) {
    // Get previous period for comparison
    const previousMetric = await this.prisma.metricView.findFirst({
      where: {
        cik,
        metric: concept,
        periodEnd: { lt: currentPeriodEnd },
      },
      orderBy: { periodEnd: 'desc' },
    });

    if (!previousMetric) {
      return undefined;
    }

    const currentValue = Number(previousMetric.value);
    const previousValue = Number(previousMetric.value);
    
    if (previousValue === 0) {
      return undefined;
    }

    const valueDiff = currentValue - previousValue;
    const percentageDiff = (valueDiff / Math.abs(previousValue)) * 100;

    // Determine period type (QoQ vs YoY based on fiscal periods)
    const periodType = this.determinePeriodType(
      currentPeriodEnd,
      previousMetric.periodEnd
    );

    return {
      value: valueDiff,
      percentage: percentageDiff,
      period: periodType,
    };
  }

  private determinePeriodType(current: Date, previous: Date): string {
    const monthsDiff = Math.abs(
      (current.getFullYear() - previous.getFullYear()) * 12 +
      (current.getMonth() - previous.getMonth())
    );

    if (monthsDiff <= 4) {
      return 'QoQ';
    } else if (monthsDiff >= 11 && monthsDiff <= 13) {
      return 'YoY';
    } else {
      return `${monthsDiff}M`;
    }
  }

  private getMetricUnit(concept: string): string {
    const monetaryConcepts = [
      'Revenues',
      'NetIncomeLoss',
      'CashAndCashEquivalentsAtCarryingValue',
      'LongTermDebtNoncurrent',
      'Assets',
      'Liabilities',
      'StockholdersEquity',
    ];

    if (monetaryConcepts.includes(concept)) {
      return 'USD';
    }

    if (concept === 'EarningsPerShareDiluted') {
      return 'USD per share';
    }

    return 'pure';
  }
}