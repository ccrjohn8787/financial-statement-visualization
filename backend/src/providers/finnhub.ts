/**
 * Finnhub Data Provider
 * 
 * Provides comprehensive financial data including:
 * - Financial statements (Income Statement, Balance Sheet, Cash Flow)
 * - Company profiles and search
 * - Real-time stock prices
 * - SEC filings access
 * - Free tier: 60 requests/minute
 * 
 * API Documentation: https://finnhub.io/docs/api
 */

import { 
  CompanyMetadata, 
  FinancialData, 
  FinancialMetric, 
  RealTimePrice,
  ProviderCapabilities,
  DataProviderError,
  RateLimitError,
  DataNotFoundError
} from './types';
import type { IFinancialDataProvider, GetFinancialDataOptions } from './base';

export interface FinnhubConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
}

interface FinnhubProfile {
  country: string;
  currency: string;
  exchange: string;
  finnhubIndustry: string;
  ipo: string;
  logo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
}

interface FinnhubFinancials {
  symbol: string;
  metric: {
    [key: string]: number;
  };
  metricType: string;
  series: {
    annual: {
      currentRatio: Array<{ period: string; v: number }>;
      salesPerShare: Array<{ period: string; v: number }>;
      bookValue: Array<{ period: string; v: number }>;
      // Add other metrics as needed
    };
    quarterly: {
      [key: string]: Array<{ period: string; v: number }>;
    };
  };
}

interface FinnhubQuote {
  c: number; // Current price
  d: number; // Change
  dp: number; // Percent change
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price of the day
  pc: number; // Previous close price
  t: number; // Timestamp
}

interface FinnhubSymbolSearch {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

interface FinnhubFinancialStatement {
  symbol: string;
  cik: string;
  year: number;
  quarter: number;
  data: Array<{
    concept: string;
    label: string;
    unit: string;
    value: number;
  }>;
}

export class FinnhubProvider implements IFinancialDataProvider {
  readonly name = 'Finnhub';
  readonly capabilities: ProviderCapabilities = {
    hasSecFilings: true,
    hasFundamentals: true,
    hasRealTimeData: true,
    hasPeerData: false,
    hasHistoricalData: true,
    hasRatioData: true,
    hasAnalystData: false,
    hasEconomicData: false,
    hasNewsData: false,
    maxHistoryYears: 30,
    rateLimitPerMinute: 60, // Free tier limit
    rateLimitPerDay: undefined,
  };

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  constructor(config: FinnhubConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://finnhub.io/api/v1';
    this.timeout = config.timeout || 10000;
  }

  configure(options: Record<string, any>): void {
    // Configuration handled in constructor
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test with a simple quote request
      await this.makeRequest('/quote', { symbol: 'AAPL' });
      return true;
    } catch {
      return false;
    }
  }

  async searchCompanies(query: string): Promise<CompanyMetadata[]> {
    try {
      const response: FinnhubSymbolSearch = await this.makeRequest('/search', { q: query });
      
      if (!response.result || response.count === 0) {
        return [];
      }

      // Filter for US stocks and take top 10
      const usStocks = response.result
        .filter(item => item.type === 'Common Stock' && !item.symbol.includes('.'))
        .slice(0, 10);

      const companies: CompanyMetadata[] = [];
      
      // Get profile data for each symbol (rate limit friendly - batch requests)
      for (const stock of usStocks) {
        try {
          const profile = await this.getCompanyMetadata(stock.symbol);
          companies.push(profile);
        } catch (error) {
          // Skip if individual company fails
          continue;
        }
      }

      return companies;
    } catch (error) {
      this.handleError(error, 'searchCompanies');
      return [];
    }
  }

  async getCompanyMetadata(ticker: string): Promise<CompanyMetadata> {
    try {
      const response: FinnhubProfile = await this.makeRequest('/stock/profile2', { symbol: ticker });
      
      if (!response.name || !response.ticker) {
        throw new DataNotFoundError(this.name, ticker);
      }

      return {
        cik: '', // Finnhub doesn't provide CIK in profile
        ticker: response.ticker,
        name: response.name,
        sector: response.finnhubIndustry || '',
        industry: response.finnhubIndustry || '',
        // Finnhub doesn't provide SIC or fiscal year end in profile
      };
    } catch (error) {
      throw this.handleError(error, 'getCompanyMetadata');
    }
  }

  async getFinancialData(
    cik: string,
    options: GetFinancialDataOptions = {}
  ): Promise<FinancialData> {
    // Finnhub uses ticker symbols, assume cik is ticker for now
    const ticker = cik;
    
    try {
      const [profile, financials] = await Promise.all([
        this.getCompanyMetadata(ticker),
        this.getBasicFinancials(ticker)
      ]);

      // Convert Finnhub metrics to our standard format
      const metrics: FinancialMetric[] = [];
      
      // Process annual data
      if (financials.series?.annual) {
        for (const [metricName, dataPoints] of Object.entries(financials.series.annual)) {
          for (const point of dataPoints) {
            if (point.v !== null && !isNaN(point.v)) {
              metrics.push({
                concept: this.mapFinnhubConcept(metricName),
                value: point.v,
                unit: this.getUnitForConcept(metricName),
                periodEnd: new Date(point.period),
                instant: false,
                fiscalYear: parseInt(point.period.split('-')[0]),
                fiscalPeriod: 'FY',
              });
            }
          }
        }
      }

      // Filter by requested concepts if specified
      let filteredMetrics = metrics;
      if (options.concepts && options.concepts.length > 0) {
        filteredMetrics = metrics.filter(metric => 
          options.concepts!.some(concept => 
            metric.concept.toLowerCase().includes(concept.toLowerCase())
          )
        );
      }

      // Apply date filters
      if (options.startDate) {
        filteredMetrics = filteredMetrics.filter(metric => metric.periodEnd >= options.startDate!);
      }
      if (options.endDate) {
        filteredMetrics = filteredMetrics.filter(metric => metric.periodEnd <= options.endDate!);
      }

      // Apply result limit
      if (options.maxResults && options.maxResults > 0) {
        filteredMetrics = filteredMetrics.slice(0, options.maxResults);
      }

      return {
        company: profile,
        metrics: filteredMetrics,
        lastUpdated: new Date(),
        source: this.name,
      };
    } catch (error) {
      throw this.handleError(error, 'getFinancialData');
    }
  }

  async getLatestMetrics(cik: string, concepts: string[]): Promise<FinancialData> {
    const data = await this.getFinancialData(cik, { 
      concepts,
      maxResults: concepts.length * 2 // Get recent periods for each concept
    });

    // Get the latest value for each requested concept
    const latestMetrics: FinancialMetric[] = [];
    for (const concept of concepts) {
      const conceptMetrics = data.metrics
        .filter(m => m.concept.toLowerCase().includes(concept.toLowerCase()))
        .sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime());
      
      if (conceptMetrics.length > 0) {
        latestMetrics.push(conceptMetrics[0]);
      }
    }

    return {
      ...data,
      metrics: latestMetrics,
    };
  }

  // Enhanced methods
  async getRealTimePrice(ticker: string): Promise<RealTimePrice> {
    try {
      const response: FinnhubQuote = await this.makeRequest('/quote', { symbol: ticker });
      
      if (response.c === 0 || response.c === null) {
        throw new DataNotFoundError(this.name, ticker);
      }

      return {
        ticker,
        price: response.c,
        change: response.d,
        changePercent: response.dp,
        timestamp: new Date(response.t * 1000),
      };
    } catch (error) {
      throw this.handleError(error, 'getRealTimePrice');
    }
  }

  private async getBasicFinancials(ticker: string): Promise<FinnhubFinancials> {
    return await this.makeRequest('/stock/metric', { 
      symbol: ticker,
      metric: 'all'
    });
  }

  private mapFinnhubConcept(finnhubMetric: string): string {
    const conceptMap: Record<string, string> = {
      'revenuePerShareTTM': 'Revenues',
      'netIncomePerShareTTM': 'NetIncomeLoss',
      'bookValue': 'StockholdersEquity',
      'currentRatio': 'CurrentRatio',
      'quickRatio': 'QuickRatio',
      'cashRatio': 'CashRatio',
      'grossMargin': 'GrossProfitMargin',
      'operatingMargin': 'OperatingProfitMargin',
      'netProfitMargin': 'NetProfitMargin',
      'roe': 'ReturnOnEquity',
      'roa': 'ReturnOnAssets',
      'roic': 'ReturnOnInvestedCapital',
      'totalDebtToEquity': 'DebtToEquityRatio',
      'totalDebtToTotalAsset': 'DebtRatio',
      'totalAssetTurnoverTTM': 'AssetTurnover',
    };

    return conceptMap[finnhubMetric] || finnhubMetric;
  }

  private getUnitForConcept(concept: string): string {
    if (concept.includes('Ratio') || concept.includes('Margin') || concept.includes('Return')) {
      return 'pure';
    }
    if (concept.includes('PerShare')) {
      return 'USD/shares';
    }
    return 'USD';
  }

  private async makeRequest(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const url = new URL(endpoint, this.baseUrl);
    url.searchParams.append('token', this.apiKey);

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
          `Finnhub API error: ${response.statusText}`,
          this.name,
          'API_ERROR',
          response.status
        );
      }

      const data = await response.json();

      // Check for API-specific error responses
      if (data.error) {
        throw new DataProviderError(
          `Finnhub error: ${data.error}`,
          this.name,
          'API_ERROR'
        );
      }

      return data;
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
        `Finnhub ${operation} failed: ${error.message}`,
        this.name,
        'OPERATION_FAILED'
      );
    }

    throw new DataProviderError(
      `Finnhub ${operation} failed with unknown error`,
      this.name,
      'UNKNOWN_ERROR'
    );
  }
}