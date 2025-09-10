import { PrismaClient } from '@prisma/client';
import type { IFinancialDataProvider, FinancialData } from '../providers';
import { DataProviderError } from '../providers';
import { redis } from '../lib/redis';

export interface IngestionOptions {
  force?: boolean;
  concepts?: string[];
  maxAge?: number; // Hours before data is considered stale
}

export interface IngestionResult {
  success: boolean;
  cik: string;
  ticker?: string;
  metricsIngested: number;
  errors?: string[];
  source: string;
  lastUpdated: Date;
}

/**
 * Service for ingesting financial data using the provider abstraction
 * Handles caching, database storage, and error recovery
 */
export class IngestionService {
  private prisma: PrismaClient;
  private provider: IFinancialDataProvider;

  constructor(prisma: PrismaClient, provider: IFinancialDataProvider) {
    this.prisma = prisma;
    this.provider = provider;
  }

  /**
   * Ingest financial data for a company
   */
  async ingestCompanyData(
    cik: string,
    options: IngestionOptions = {}
  ): Promise<IngestionResult> {
    const normalizedCik = this.normalizeCIK(cik);
    const cacheKey = `ingestion:${normalizedCik}`;
    const maxAge = options.maxAge || 24; // Default 24 hours

    try {
      // Check if we should skip ingestion (unless forced)
      if (!options.force) {
        const shouldSkip = await this.shouldSkipIngestion(normalizedCik, maxAge);
        if (shouldSkip) {
          const existingData = await this.getExistingData(normalizedCik);
          if (existingData) {
            return {
              success: true,
              cik: normalizedCik,
              ticker: existingData.ticker,
              metricsIngested: existingData.metricCount,
              source: 'cache',
              lastUpdated: existingData.lastUpdated,
            };
          }
        }
      }

      // Mark ingestion as in progress
      await redis.setEx(`${cacheKey}:lock`, 300, Date.now().toString()); // 5-minute lock

      // Fetch data from provider
      console.log(`Ingesting data for CIK ${normalizedCik} using ${this.provider.name}`);
      const financialData = await this.provider.getFinancialData(normalizedCik, {
        concepts: options.concepts,
      });

      // Store in database
      const result = await this.storeFinancialData(financialData);

      // Update cache
      await this.updateCache(normalizedCik, result);

      // Clear lock
      await redis.del(`${cacheKey}:lock`);

      return result;

    } catch (error) {
      // Clear lock on error
      await redis.del(`${cacheKey}:lock`);

      if (error instanceof DataProviderError) {
        return {
          success: false,
          cik: normalizedCik,
          metricsIngested: 0,
          errors: [error.message],
          source: this.provider.name,
          lastUpdated: new Date(),
        };
      }

      throw error; // Re-throw unexpected errors
    }
  }

  /**
   * Ingest latest metrics for dashboard
   */
  async ingestLatestMetrics(
    cik: string,
    concepts: string[]
  ): Promise<IngestionResult> {
    const normalizedCik = this.normalizeCIK(cik);

    try {
      console.log(`Ingesting latest metrics for CIK ${normalizedCik}`);
      const financialData = await this.provider.getLatestMetrics(normalizedCik, concepts);

      // Store only the latest metrics
      const result = await this.storeFinancialData(financialData, true);

      return result;

    } catch (error) {
      if (error instanceof DataProviderError) {
        return {
          success: false,
          cik: normalizedCik,
          metricsIngested: 0,
          errors: [error.message],
          source: this.provider.name,
          lastUpdated: new Date(),
        };
      }

      throw error;
    }
  }

  /**
   * Batch ingest multiple companies
   */
  async batchIngest(
    ciks: string[],
    options: IngestionOptions = {}
  ): Promise<IngestionResult[]> {
    const results: IngestionResult[] = [];
    const batchSize = 5; // Process in small batches to respect rate limits

    for (let i = 0; i < ciks.length; i += batchSize) {
      const batch = ciks.slice(i, i + batchSize);
      
      const batchPromises = batch.map(cik => 
        this.ingestCompanyData(cik, options)
          .catch(error => ({
            success: false,
            cik: this.normalizeCIK(cik),
            metricsIngested: 0,
            errors: [error.message],
            source: this.provider.name,
            lastUpdated: new Date(),
          }))
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches for rate limiting
      if (i + batchSize < ciks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  private async shouldSkipIngestion(cik: string, maxAgeHours: number): Promise<boolean> {
    // Check if there's a recent successful ingestion
    const existingData = await this.prisma.company.findUnique({
      where: { cik },
      select: { updatedAt: true },
    });

    if (!existingData) return false;

    const ageHours = (Date.now() - existingData.updatedAt.getTime()) / (1000 * 60 * 60);
    return ageHours < maxAgeHours;
  }

  private async getExistingData(cik: string) {
    const company = await this.prisma.company.findUnique({
      where: { cik },
      include: {
        _count: {
          select: { facts: true },
        },
      },
    });

    if (!company) return null;

    return {
      ticker: company.ticker,
      metricCount: company._count.facts,
      lastUpdated: company.updatedAt,
    };
  }

  private async storeFinancialData(
    data: FinancialData,
    latestOnly = false
  ): Promise<IngestionResult> {
    const { company, metrics } = data;

    // Use transaction for data consistency
    const result = await this.prisma.$transaction(async (tx) => {
      // Upsert company
      const storedCompany = await tx.company.upsert({
        where: { cik: company.cik },
        update: {
          ticker: company.ticker,
          name: company.name,
          sic: company.sic || null,
          fiscalYearEnd: company.fiscalYearEnd || null,
          updatedAt: new Date(),
        },
        create: {
          cik: company.cik,
          ticker: company.ticker,
          name: company.name,
          sic: company.sic || null,
          fiscalYearEnd: company.fiscalYearEnd || null,
        },
      });

      // If latest only, clear existing metric views
      if (latestOnly) {
        await tx.metricView.deleteMany({
          where: { cik: company.cik },
        });
      }

      // Store facts
      const factPromises = metrics.map(metric => 
        tx.fact.upsert({
          where: {
            // Use a composite key for uniqueness
            cik_concept_periodEnd_filingAccession: {
              cik: company.cik,
              concept: metric.concept,
              periodEnd: metric.periodEnd,
              filingAccession: metric.filingAccession || 'unknown',
            }
          },
          update: {
            value: metric.value,
            unit: metric.unit,
          },
          create: {
            cik: company.cik,
            concept: metric.concept,
            taxonomy: 'us-gaap', // Default for now
            unit: metric.unit,
            periodStart: metric.periodStart || null,
            periodEnd: metric.periodEnd,
            value: metric.value,
            instant: metric.instant,
            fiscalYear: metric.fiscalYear,
            fiscalPeriod: metric.fiscalPeriod,
            filingAccession: metric.filingAccession || 'unknown',
            form: metric.form || '10-K',
            amended: false,
          },
        })
      );

      await Promise.all(factPromises);

      // Update metric views for fast queries
      await this.updateMetricViews(tx, company.cik, metrics);

      return {
        success: true,
        cik: company.cik,
        ticker: company.ticker,
        metricsIngested: metrics.length,
        source: data.source,
        lastUpdated: data.lastUpdated,
      };
    });

    return result;
  }

  private async updateMetricViews(tx: any, cik: string, metrics: any[]) {
    // Group metrics by concept and get latest for each
    const latestMetrics = new Map<string, any>();
    
    metrics.forEach(metric => {
      const existing = latestMetrics.get(metric.concept);
      if (!existing || metric.periodEnd > existing.periodEnd) {
        latestMetrics.set(metric.concept, metric);
      }
    });

    // Upsert metric views
    const viewPromises = Array.from(latestMetrics.values()).map(metric =>
      tx.metricView.upsert({
        where: {
          cik_metric_periodEnd: {
            cik,
            metric: metric.concept,
            periodEnd: metric.periodEnd,
          },
        },
        update: {
          value: metric.value,
          fiscalPeriod: metric.fiscalPeriod,
          fiscalYear: metric.fiscalYear,
          updatedAt: new Date(),
        },
        create: {
          cik,
          metric: metric.concept,
          periodEnd: metric.periodEnd,
          value: metric.value,
          fiscalPeriod: metric.fiscalPeriod,
          fiscalYear: metric.fiscalYear,
        },
      })
    );

    await Promise.all(viewPromises);
  }

  private async updateCache(cik: string, result: IngestionResult) {
    const cacheKey = `company:${cik}:overview`;
    const cacheData = {
      ...result,
      cached_at: Date.now(),
    };

    await redis.setEx(cacheKey, 24 * 60 * 60, JSON.stringify(cacheData)); // 24 hour cache
  }

  private normalizeCIK(cik: string): string {
    return cik.replace(/^(CIK)?0*/, '').padStart(10, '0');
  }
}