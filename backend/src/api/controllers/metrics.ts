import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../middleware';
import type { MetricQuery, MetricTimeSeries } from '../types';
import { FINANCIAL_CONCEPTS } from '../types';

export class MetricsController {
  constructor(private prisma: PrismaClient) {}

  // GET /api/companies/:ticker/metrics/:concept?frequency=quarterly&range=3y
  getMetricTimeSeries = async (req: Request, res: Response) => {
    const { ticker, concept } = req.params;
    const { frequency, range, start_date, end_date } = req.query as MetricQuery;

    try {
      // Validate concept
      if (!(concept in FINANCIAL_CONCEPTS)) {
        throw new ApiError(
          400,
          'INVALID_CONCEPT',
          `Invalid financial concept: ${concept}. Valid concepts: ${Object.keys(FINANCIAL_CONCEPTS).join(', ')}`
        );
      }

      // Get company CIK
      const company = await this.prisma.company.findUnique({
        where: { ticker: ticker.toUpperCase() },
        select: { cik: true, name: true },
      });

      if (!company) {
        throw new ApiError(404, 'COMPANY_NOT_FOUND', `Company with ticker ${ticker} not found`);
      }

      // Calculate date range
      const dateRange = this.calculateDateRange(range, start_date, end_date);

      // Build frequency filter
      const fiscalPeriodFilter = this.buildFiscalPeriodFilter(frequency);

      // Fetch time series data
      const facts = await this.prisma.fact.findMany({
        where: {
          cik: company.cik,
          concept,
          periodEnd: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
          ...(fiscalPeriodFilter && { fiscalPeriod: fiscalPeriodFilter }),
        },
        orderBy: { periodEnd: 'desc' },
        take: 50, // Limit to prevent huge responses
      });

      if (facts.length === 0) {
        throw new ApiError(
          404,
          'NO_DATA_FOUND',
          `No data found for ${concept} for ${ticker} in the specified time range`
        );
      }

      // Transform to API format
      const timeSeries: MetricTimeSeries = {
        concept,
        label: FINANCIAL_CONCEPTS[concept as keyof typeof FINANCIAL_CONCEPTS],
        unit: this.getDisplayUnit(facts[0].unit),
        data: facts.map(fact => ({
          periodEnd: fact.periodEnd.toISOString(),
          value: Number(fact.value),
          fiscalPeriod: fact.fiscalPeriod,
          fiscalYear: fact.fiscalYear,
          filingAccession: fact.filingAccession,
          form: fact.form,
        })),
        metadata: {
          dataPoints: facts.length,
          periodRange: {
            start: facts[facts.length - 1].periodEnd.toISOString(),
            end: facts[0].periodEnd.toISOString(),
          },
          frequency: this.detectFrequency(facts.map(f => f.fiscalPeriod)),
        },
      };

      res.json({ data: timeSeries });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'METRICS_ERROR', 'Failed to fetch metric time series');
    }
  };

  // GET /api/companies/:ticker/metrics/:concept/peers
  getPeerComparison = async (req: Request, res: Response) => {
    const { ticker, concept } = req.params;

    try {
      // Validate concept
      if (!(concept in FINANCIAL_CONCEPTS)) {
        throw new ApiError(400, 'INVALID_CONCEPT', `Invalid financial concept: ${concept}`);
      }

      // Get company info
      const company = await this.prisma.company.findUnique({
        where: { ticker: ticker.toUpperCase() },
        select: { cik: true, sic: true, name: true },
      });

      if (!company) {
        throw new ApiError(404, 'COMPANY_NOT_FOUND', `Company with ticker ${ticker} not found`);
      }

      if (!company.sic) {
        throw new ApiError(
          400,
          'NO_SIC_CODE',
          'Company does not have SIC code for peer comparison'
        );
      }

      // Find peer companies (same SIC code)
      const peers = await this.prisma.company.findMany({
        where: {
          sic: company.sic,
          cik: { not: company.cik }, // Exclude the company itself
        },
        take: 5, // Limit to top 5 peers
        orderBy: { name: 'asc' },
      });

      if (peers.length === 0) {
        throw new ApiError(404, 'NO_PEERS_FOUND', 'No peer companies found with same SIC code');
      }

      // Get latest metric for target company and peers
      const allCiks = [company.cik, ...peers.map(p => p.cik)];
      
      const latestMetrics = await this.prisma.metricView.findMany({
        where: {
          cik: { in: allCiks },
          metric: concept,
        },
        include: {
          company: {
            select: { ticker: true, name: true },
          },
        },
        orderBy: { periodEnd: 'desc' },
        distinct: ['cik'],
      });

      // Transform to comparison format
      const comparison = {
        concept,
        label: FINANCIAL_CONCEPTS[concept as keyof typeof FINANCIAL_CONCEPTS],
        target: {
          company: { ticker: ticker.toUpperCase(), name: company.name },
          value: latestMetrics.find(m => m.cik === company.cik)?.value || null,
          periodEnd: latestMetrics.find(m => m.cik === company.cik)?.periodEnd?.toISOString(),
        },
        peers: latestMetrics
          .filter(m => m.cik !== company.cik)
          .map(metric => ({
            company: {
              ticker: metric.company.ticker,
              name: metric.company.name,
            },
            value: Number(metric.value),
            periodEnd: metric.periodEnd.toISOString(),
          })),
        metadata: {
          sicCode: company.sic,
          totalPeers: peers.length,
          dataDate: new Date().toISOString(),
        },
      };

      res.json({ data: comparison });
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, 'PEER_COMPARISON_ERROR', 'Failed to fetch peer comparison');
    }
  };

  private calculateDateRange(range: string, startDate?: string, endDate?: string) {
    const end = endDate ? new Date(endDate) : new Date();
    let start: Date;

    if (startDate) {
      start = new Date(startDate);
    } else {
      const years = parseInt(range.replace('y', ''));
      start = new Date(end);
      start.setFullYear(start.getFullYear() - years);
    }

    return { start, end };
  }

  private buildFiscalPeriodFilter(frequency: string) {
    switch (frequency) {
      case 'quarterly':
        return { in: ['Q1', 'Q2', 'Q3', 'Q4'] };
      case 'annual':
        return { in: ['FY'] };
      case 'all':
      default:
        return undefined;
    }
  }

  private detectFrequency(fiscalPeriods: string[]): 'quarterly' | 'annual' | 'mixed' {
    const quarters = fiscalPeriods.filter(fp => ['Q1', 'Q2', 'Q3', 'Q4'].includes(fp));
    const annual = fiscalPeriods.filter(fp => fp === 'FY');

    if (quarters.length > 0 && annual.length > 0) {
      return 'mixed';
    } else if (quarters.length > 0) {
      return 'quarterly';
    } else {
      return 'annual';
    }
  }

  private getDisplayUnit(unit: string): string {
    if (unit.toLowerCase().includes('usd')) {
      return 'USD';
    }
    if (unit.toLowerCase().includes('shares')) {
      return 'shares';
    }
    return 'pure';
  }
}