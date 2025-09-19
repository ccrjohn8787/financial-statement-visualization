import { FinnhubClient } from '../lib/finnhub';
import { DataValidator, extractValidatedMetric } from './dataValidation';

/**
 * FinScope Enhanced Metrics Service
 * Extracts all 6 FinScope metrics from Finnhub data
 */

export interface FinScopeMetric {
  concept: string;
  label: string;
  value: number | null;
  unit: string;
  periodEnd: string;
  fiscalPeriod: string;
  fiscalYear: number;
  change?: {
    value: number | null;
    percentage: number | null;
    period: string;
  } | null;
  source: 'Finnhub' | 'SEC EDGAR' | 'Calculated';
  confidence: 'high' | 'medium' | 'low';
}

export interface CompanyFinScopeData {
  company: {
    cik: string;
    ticker: string;
    name: string;
    sic: string;
    fiscalYearEnd: string;
  };
  metrics: FinScopeMetric[];
  lastUpdated: string;
  source: string;
  disclaimer: string;
}

export class FinScopeMetricsService {
  private finnhubClient: FinnhubClient;

  constructor(finnhubApiKey: string) {
    this.finnhubClient = new FinnhubClient(finnhubApiKey);
  }

  async getCompanyMetrics(ticker: string): Promise<CompanyFinScopeData> {
    try {
      const [companyProfile, financials] = await Promise.all([
        this.finnhubClient.getCompanyProfile(ticker.toUpperCase()),
        this.finnhubClient.getCompanyFinancials(ticker.toUpperCase())
      ]);

      // Validate the raw data first
      const validation = DataValidator.validateCompanyData(ticker, companyProfile, financials);
      
      // Debug logging with validation results
      console.log(`📊 [DEBUG] Data validation for ${ticker}:`);
      if (!validation.isValid) {
        console.warn(`⚠️ [${ticker}] Data validation issues:`, validation.issues);
      }
      console.log(DataValidator.generateValidationReport(ticker, validation.validatedMetrics));

      const metrics = this.extractFinScopeMetrics(companyProfile, financials, ticker);

      return {
        company: {
          cik: '0000000000', // TODO: Get real CIK from profile or SEC lookup
          ticker: ticker.toUpperCase(),
          name: companyProfile.name,
          sic: '0000', // TODO: Get real SIC from profile
          fiscalYearEnd: '1231' // TODO: Get real fiscal year end
        },
        metrics,
        lastUpdated: new Date().toISOString(),
        source: 'Finnhub API Enhanced',
        disclaimer: 'FinScope provides financial data and analysis for educational purposes only. Not investment advice.'
      };
    } catch (error) {
      console.error(`Failed to get metrics for ${ticker}:`, error);
      throw new Error(`Unable to retrieve financial data for ${ticker}`);
    }
  }

  private extractFinScopeMetrics(
    profile: any, 
    financials: any,
    ticker: string
  ): FinScopeMetric[] {
    const metrics: FinScopeMetric[] = [];
    const currentYear = new Date().getFullYear();
    const periodEnd = new Date().toISOString();
    const context = { ticker, source: 'Finnhub' };

    // 1. Profitability (Net Margin)
    const netMargin = extractValidatedMetric('netMarginTTM', financials.metric.netMarginTTM, context);
    if (netMargin !== null) {
      metrics.push({
        concept: 'Profitability',
        label: 'Net Margin',
        value: netMargin,
        unit: 'Percentage',
        periodEnd,
        fiscalPeriod: 'TTM',
        fiscalYear: currentYear,
        change: null,
        source: 'Finnhub',
        confidence: 'high'
      });
    }

    // 2. Growth (Revenue Growth YoY)
    const revenueGrowth = extractValidatedMetric('revenueGrowthTTMYoy', financials.metric.revenueGrowthTTMYoy, context);
    if (revenueGrowth !== null) {
      metrics.push({
        concept: 'Growth',
        label: 'Revenue Growth (YoY)',
        value: revenueGrowth,
        unit: 'Percentage',
        periodEnd,
        fiscalPeriod: 'TTM',
        fiscalYear: currentYear,
        change: null,
        source: 'Finnhub',
        confidence: 'high'
      });
    }

    // 3. Cash Flow (Free Cash Flow calculated from per-share metrics)
    const freeCashFlowPerShare = extractValidatedMetric('pfcfShareTTM', financials.metric.pfcfShareTTM, context);
    const sharesOutstanding = extractValidatedMetric('shareOutstanding', profile.shareOutstanding, context);
    if (freeCashFlowPerShare !== null && sharesOutstanding !== null) {
      const freeCashFlow = freeCashFlowPerShare * sharesOutstanding * 1000000; // Shares in millions
      metrics.push({
        concept: 'CashFlow',
        label: 'Free Cash Flow',
        value: freeCashFlow,
        unit: 'USD',
        periodEnd,
        fiscalPeriod: 'TTM',
        fiscalYear: currentYear,
        change: null,
        source: 'Calculated',
        confidence: 'medium'
      });
    }

    // 4. Valuation (P/E Ratio)
    const peRatio = extractValidatedMetric('peTTM', financials.metric.peTTM, context);
    if (peRatio !== null) {
      metrics.push({
        concept: 'Valuation',
        label: 'P/E Ratio',
        value: peRatio,
        unit: 'Ratio',
        periodEnd,
        fiscalPeriod: 'TTM',
        fiscalYear: currentYear,
        change: null,
        source: 'Finnhub',
        confidence: 'high'
      });
    }

    // 5. Debt-to-Equity Ratio
    const debtToEquity = extractValidatedMetric('totalDebtToEquityQuarterly', financials.metric.totalDebtToEquityQuarterly, context);
    if (debtToEquity !== null) {
      metrics.push({
        concept: 'DebtToEquity',
        label: 'Debt-to-Equity Ratio',
        value: debtToEquity,
        unit: 'Ratio',
        periodEnd,
        fiscalPeriod: 'Quarterly',
        fiscalYear: currentYear,
        change: null,
        source: 'Finnhub',
        confidence: 'high'
      });
    }

    // 6. ROIC (Return on Invested Capital)
    const roic = extractValidatedMetric('roiTTM', financials.metric.roiTTM, context);
    if (roic !== null) {
      metrics.push({
        concept: 'ROIC',
        label: 'Return on Invested Capital',
        value: roic,
        unit: 'Percentage',
        periodEnd,
        fiscalPeriod: 'TTM',
        fiscalYear: currentYear,
        change: null,
        source: 'Finnhub',
        confidence: 'high'
      });
    }

    // Additional metrics for context (existing ones we already had)
    const revenue = this.calculateRevenue(financials, profile, ticker);
    if (revenue) {
      metrics.push({
        concept: 'Revenues',
        label: 'Revenue',
        value: revenue.value,
        unit: 'USD',
        periodEnd,
        fiscalPeriod: 'TTM',
        fiscalYear: currentYear,
        change: revenue.change,
        source: 'Calculated',
        confidence: 'medium'
      });
    }

    const netIncome = this.calculateNetIncome(financials, profile, ticker);
    if (netIncome) {
      metrics.push({
        concept: 'NetIncomeLoss',
        label: 'Net Income',
        value: netIncome.value,
        unit: 'USD',
        periodEnd,
        fiscalPeriod: 'TTM',
        fiscalYear: currentYear,
        change: null,
        source: 'Calculated',
        confidence: 'medium'
      });
    }

    return metrics;
  }

  private calculateRevenue(financials: any, profile: any, ticker: string) {
    const context = { ticker, source: 'Finnhub' };
    const revenuePerShare = extractValidatedMetric('revenuePerShareTTM', financials.metric.revenuePerShareTTM, context);
    const sharesOutstanding = extractValidatedMetric('shareOutstanding', profile.shareOutstanding, context);
    const growth = extractValidatedMetric('revenueGrowthTTMYoy', financials.metric.revenueGrowthTTMYoy, context);

    if (revenuePerShare === null || sharesOutstanding === null) {
      return null;
    }

    const revenue = revenuePerShare * sharesOutstanding * 1000000; // Shares in millions

    return {
      value: revenue,
      change: growth !== null ? {
        value: null, // Would need historical revenue to calculate absolute change
        percentage: growth,
        period: 'YoY'
      } : null
    };
  }

  private calculateNetIncome(financials: any, profile: any, ticker: string) {
    const context = { ticker, source: 'Finnhub' };
    const eps = extractValidatedMetric('epsInclExtraItemsTTM', financials.metric.epsInclExtraItemsTTM, context);
    const sharesOutstanding = extractValidatedMetric('shareOutstanding', profile.shareOutstanding, context);

    if (eps === null || sharesOutstanding === null) {
      return null;
    }

    const netIncome = eps * sharesOutstanding * 1000000; // Shares in millions

    return {
      value: netIncome,
      change: null // TODO: Calculate from historical data
    };
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.finnhubClient.healthCheck();
    } catch {
      return false;
    }
  }
}

/**
 * Helper function to get metric by concept
 */
export function getMetricByCode(metrics: FinScopeMetric[], concept: string): FinScopeMetric | undefined {
  return metrics.find(metric => metric.concept === concept);
}

/**
 * Helper function to format large numbers for display
 */
export function formatLargeNumber(value: number): string {
  if (Math.abs(value) >= 1e12) {
    return `$${(value / 1e12).toFixed(1)}T`;
  } else if (Math.abs(value) >= 1e9) {
    return `$${(value / 1e9).toFixed(1)}B`;
  } else if (Math.abs(value) >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`;
  } else {
    return `$${value.toFixed(0)}`;
  }
}

/**
 * Helper function to format percentage values
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Helper function to format ratio values
 */
export function formatRatio(value: number): string {
  return `${value.toFixed(1)}x`;
}