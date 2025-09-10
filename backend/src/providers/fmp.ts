/**
 * Financial Modeling Prep (FMP) Data Provider
 * 
 * Provides enhanced financial data including:
 * - Financial ratios and calculated metrics
 * - Real-time stock prices
 * - Peer comparison data
 * - Analyst estimates
 * 
 * API Documentation: https://financialmodelingprep.com/developer/docs
 */

import { 
  CompanyMetadata, 
  FinancialData, 
  FinancialMetric, 
  FinancialRatio,
  RealTimePrice,
  AnalystEstimate,
  PeerCompany,
  ProviderCapabilities,
  DataProviderError,
  RateLimitError,
  DataNotFoundError
} from './types';
import type { IFinancialDataProvider, GetFinancialDataOptions } from './base';

export interface FMPConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

interface FMPCompanyProfile {
  symbol: string;
  companyName: string;
  cik: string;
  industry: string;
  sector: string;
  description: string;
  beta: number;
  price: number;
  lastDiv: number;
  range: string;
  changes: number;
  changesPercentage: string;
  exchangeShortName: string;
  country: string;
  currency: string;
  ipoDate: string;
  dcf: number;
  dcfDiff: number;
  image: string;
  isin: string;
  cusip: string;
  fiscalYearEnd: string;
}

interface FMPRatio {
  symbol: string;
  date: string;
  period: string;
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  daysOfSalesOutstanding: number;
  daysOfInventoryOutstanding: number;
  operatingCycle: number;
  daysOfPayablesOutstanding: number;
  cashCycle: number;
  grossProfitMargin: number;
  operatingProfitMargin: number;
  pretaxProfitMargin: number;
  netProfitMargin: number;
  effectiveTaxRate: number;
  returnOnAssets: number;
  returnOnEquity: number;
  returnOnCapitalEmployed: number;
  netIncomePerEBT: number;
  ebtPerEbit: number;
  ebitPerRevenue: number;
  debtRatio: number;
  debtEquityRatio: number;
  longTermDebtToCapitalization: number;
  totalDebtToCapitalization: number;
  interestCoverage: number;
  cashFlowToDebtRatio: number;
  companyEquityMultiplier: number;
  receivablesTurnover: number;
  payablesTurnover: number;
  inventoryTurnover: number;
  fixedAssetTurnover: number;
  assetTurnover: number;
  operatingCashFlowPerShare: number;
  freeCashFlowPerShare: number;
  cashPerShare: number;
  payoutRatio: number;
  operatingCashFlowSalesRatio: number;
  freeCashflowOperatingCashFlowRatio: number;
  cashFlowCoverageRatios: number;
  shortTermCoverageRatios: number;
  capitalExpenditureCoverageRatio: number;
  dividendPaidAndCapexCoverageRatio: number;
  priceBookValueRatio: number;
  priceToBookRatio: number;
  priceToSalesRatio: number;
  priceEarningsRatio: number;
  priceToFreeCashFlowsRatio: number;
  priceToOperatingCashFlowsRatio: number;
  priceCashFlowRatio: number;
  priceEarningsToGrowthRatio: number;
  priceSalesRatio: number;
  dividendYield: number;
  enterpriseValueMultiple: number;
  priceFairValue: number;
}

interface FMPQuote {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: number;
  priceAvg50: number;
  priceAvg200: number;
  exchange: string;
  volume: number;
  avgVolume: number;
  open: number;
  previousClose: number;
  eps: number;
  pe: number;
  earningsAnnouncement: string;
  sharesOutstanding: number;
  timestamp: number;
}

export class FMPProvider implements IFinancialDataProvider {
  readonly name = 'FMP';
  readonly capabilities: ProviderCapabilities = {
    hasSecFilings: false,
    hasFundamentals: true,
    hasRealTimeData: true,
    hasPeerData: true,
    hasHistoricalData: true,
    hasRatioData: true,
    hasAnalystData: true,
    hasEconomicData: false,
    hasNewsData: false,
    hasTechnicalData: false,
    maxHistoryYears: 30,
    rateLimitPerMinute: 250, // Starter plan limit
    rateLimitPerDay: 250,
  };

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: FMPConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://financialmodelingprep.com/api/v3';
    this.timeout = config.timeout || 10000;
  }

  configure(options: Record<string, any>): void {
    // Configuration handled in constructor
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test with a simple quote request
      await this.makeRequest('/quote/AAPL');
      return true;
    } catch {
      return false;
    }
  }

  async searchCompanies(query: string): Promise<CompanyMetadata[]> {
    try {
      const response = await this.makeRequest('/search', { query, limit: 10 });
      
      if (!Array.isArray(response)) {
        return [];
      }

      return response.map((company: any) => ({
        cik: company.cik || '',
        ticker: company.symbol,
        name: company.name,
        sic: company.cik, // FMP doesn't provide SIC directly
        sector: company.sector,
        industry: company.industry,
        fiscalYearEnd: company.fiscalYearEnd,
      }));
    } catch (error) {
      this.handleError(error, 'searchCompanies');
      return [];
    }
  }

  async getCompanyMetadata(ticker: string): Promise<CompanyMetadata> {
    try {
      const response = await this.makeRequest(`/profile/${ticker}`);
      
      if (!Array.isArray(response) || response.length === 0) {
        throw new DataNotFoundError(this.name, ticker);
      }

      const profile: FMPCompanyProfile = response[0];
      
      return {
        cik: profile.cik,
        ticker: profile.symbol,
        name: profile.companyName,
        sector: profile.sector,
        industry: profile.industry,
        fiscalYearEnd: profile.fiscalYearEnd,
      };
    } catch (error) {
      throw this.handleError(error, 'getCompanyMetadata');
    }
  }

  async getFinancialData(cik: string, options?: { concepts?: string[]; maxAge?: number }): Promise<FinancialData> {
    // FMP uses ticker symbols, not CIK
    const ticker = cik; // Assume ticker for now
    
    try {
      const [profile, ratios] = await Promise.all([
        this.getCompanyMetadata(ticker),
        this.getFinancialRatios(ticker)
      ]);

      // Convert ratios to financial metrics format
      const metrics: FinancialMetric[] = ratios.map(ratio => ({
        concept: ratio.name,
        value: ratio.value,
        unit: 'ratio',
        periodEnd: ratio.periodEnd,
        instant: true,
        fiscalYear: new Date(ratio.periodEnd).getFullYear(),
        fiscalPeriod: ratio.period,
      }));

      return {
        company: profile,
        metrics,
        lastUpdated: new Date(),
        source: this.name,
      };
    } catch (error) {
      throw this.handleError(error, 'getFinancialData');
    }
  }

  async getLatestMetrics(cik: string, concepts: string[]): Promise<FinancialData> {
    const ticker = cik; // Assume ticker for now
    
    try {
      const ratios = await this.getFinancialRatios(ticker);
      
      // Filter by requested concepts if provided
      const filteredRatios = concepts.length > 0 
        ? ratios.filter(ratio => concepts.includes(ratio.name))
        : ratios;

      const metrics: FinancialMetric[] = filteredRatios.map(ratio => ({
        concept: ratio.name,
        value: ratio.value,
        unit: 'ratio',
        periodEnd: ratio.periodEnd,
        instant: true,
        fiscalYear: new Date(ratio.periodEnd).getFullYear(),
        fiscalPeriod: ratio.period,
      }));

      const metadata = await this.getCompanyMetadata(ticker);
      return {
        company: metadata,
        metrics,
        lastUpdated: new Date(),
        source: this.name,
      };
    } catch (error) {
      throw this.handleError(error, 'getLatestMetrics');
    }
  }

  // Enhanced methods for Phase 4 capabilities
  async getFinancialRatios(ticker: string): Promise<FinancialRatio[]> {
    try {
      const response = await this.makeRequest(`/ratios/${ticker}`, { limit: 1 });
      
      if (!Array.isArray(response) || response.length === 0) {
        return [];
      }

      const ratioData: FMPRatio = response[0];
      const periodEnd = new Date(ratioData.date);

      // Convert FMP ratios to our standard format
      const ratios: FinancialRatio[] = [
        {
          name: 'Current Ratio',
          category: 'liquidity',
          value: ratioData.currentRatio,
          formula: 'Current Assets / Current Liabilities',
          description: 'Measures ability to pay short-term obligations',
          period: ratioData.period,
          periodEnd,
        },
        {
          name: 'Return on Equity',
          category: 'profitability',
          value: ratioData.returnOnEquity,
          formula: 'Net Income / Shareholders Equity',
          description: 'Measures profitability relative to shareholders equity',
          period: ratioData.period,
          periodEnd,
        },
        {
          name: 'Debt to Equity',
          category: 'leverage',
          value: ratioData.debtEquityRatio,
          formula: 'Total Debt / Shareholders Equity',
          description: 'Measures financial leverage',
          period: ratioData.period,
          periodEnd,
        },
        {
          name: 'Price to Earnings',
          category: 'valuation',
          value: ratioData.priceEarningsRatio,
          formula: 'Price per Share / Earnings per Share',
          description: 'Measures price relative to earnings',
          period: ratioData.period,
          periodEnd,
        },
        {
          name: 'Gross Profit Margin',
          category: 'profitability',
          value: ratioData.grossProfitMargin,
          formula: '(Revenue - COGS) / Revenue',
          description: 'Measures gross profitability',
          period: ratioData.period,
          periodEnd,
        },
      ].filter(ratio => ratio.value !== null && !isNaN(ratio.value));

      return ratios;
    } catch (error) {
      throw this.handleError(error, 'getFinancialRatios');
    }
  }

  async getRealTimePrice(ticker: string): Promise<RealTimePrice> {
    try {
      const response = await this.makeRequest(`/quote/${ticker}`);
      
      if (!Array.isArray(response) || response.length === 0) {
        throw new DataNotFoundError(this.name, ticker);
      }

      const quote: FMPQuote = response[0];
      
      return {
        ticker: quote.symbol,
        price: quote.price,
        change: quote.change,
        changePercent: quote.changesPercentage,
        volume: quote.volume,
        timestamp: new Date(quote.timestamp * 1000),
      };
    } catch (error) {
      throw this.handleError(error, 'getRealTimePrice');
    }
  }

  async getPeerCompanies(ticker: string): Promise<PeerCompany[]> {
    try {
      // FMP doesn't have a direct peer endpoint, so we'll use industry search
      const profile = await this.getCompanyMetadata(ticker);
      
      if (!profile.industry) {
        return [];
      }

      const response = await this.makeRequest('/stock-screener', {
        industry: profile.industry,
        limit: 10,
        isActivelyTrading: true,
      });

      if (!Array.isArray(response)) {
        return [];
      }

      return response
        .filter((company: any) => company.symbol !== ticker)
        .slice(0, 5)
        .map((company: any) => ({
          cik: company.cik || '',
          ticker: company.symbol,
          name: company.companyName,
          marketCap: company.marketCap,
          similarity: 0.8, // Default similarity score
        }));
    } catch (error) {
      this.handleError(error, 'getPeerCompanies');
      return [];
    }
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const url = new URL(endpoint, this.baseUrl);
    url.searchParams.append('apikey', this.apiKey);

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value.toString());
      }
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FinViz/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new RateLimitError(this.name);
        }
        
        throw new DataProviderError(
          `FMP API error: ${response.statusText}`,
          this.name,
          'API_ERROR',
          response.status
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private handleError(error: unknown, operation: string): never {
    if (error instanceof DataProviderError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new DataProviderError(
        `FMP ${operation} failed: ${error.message}`,
        this.name,
        'OPERATION_FAILED'
      );
    }

    throw new DataProviderError(
      `FMP ${operation} failed with unknown error`,
      this.name,
      'UNKNOWN_ERROR'
    );
  }
}