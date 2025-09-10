/**
 * Alpha Vantage Data Provider
 * 
 * Provides real-time market data for fundamental analysis:
 * - Real-time stock quotes
 * - Company overview and fundamental data
 * - Free tier: 5 requests/minute, 100/day
 * 
 * API Documentation: https://www.alphavantage.co/documentation/
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

export interface AlphaVantageConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  tier?: 'free' | 'premium';
}

interface AVQuote {
  '01. symbol': string;
  '02. open': string;
  '03. high': string;
  '04. low': string;
  '05. price': string;
  '06. volume': string;
  '07. latest trading day': string;
  '08. previous close': string;
  '09. change': string;
  '10. change percent': string;
}

// Removed AVTechnicalIndicator - focusing on fundamental analysis only

export class AlphaVantageProvider implements IFinancialDataProvider {
  readonly name = 'Alpha Vantage';
  readonly capabilities: ProviderCapabilities = {
    hasSecFilings: false,
    hasFundamentals: false,
    hasRealTimeData: true,
    hasPeerData: false,
    hasHistoricalData: true,
    hasRatioData: false,
    hasAnalystData: false,
    hasEconomicData: false,
    hasNewsData: false,
    // Removed technical data - focusing on fundamental analysis only
    maxHistoryYears: 20,
    rateLimitPerMinute: 5,  // Free tier
    rateLimitPerDay: 100,   // Free tier
  };

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly tier: 'free' | 'premium';

  constructor(config: AlphaVantageConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://www.alphavantage.co/query';
    this.timeout = config.timeout || 10000;
    this.tier = config.tier || 'free';

    // Update rate limits based on tier
    if (this.tier === 'premium') {
      this.capabilities.rateLimitPerMinute = 75;
      this.capabilities.rateLimitPerDay = 1000;
    }
  }

  configure(options: Record<string, any>): void {
    // Configuration handled in constructor
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Test with a simple quote request
      const response = await this.makeRequest({
        function: 'GLOBAL_QUOTE',
        symbol: 'AAPL'
      });
      return !response['Error Message'] && !response['Note'];
    } catch {
      return false;
    }
  }

  // Basic provider interface implementations (limited functionality)
  async searchCompanies(query: string): Promise<CompanyMetadata[]> {
    try {
      const response = await this.makeRequest({
        function: 'SYMBOL_SEARCH',
        keywords: query
      });

      if (!response['bestMatches']) {
        return [];
      }

      return response['bestMatches'].slice(0, 5).map((match: any) => ({
        cik: '', // Alpha Vantage doesn't provide CIK
        ticker: match['1. symbol'],
        name: match['2. name'],
        sic: '',
        sector: match['4. type'],
      }));
    } catch (error) {
      this.handleError(error, 'searchCompanies');
      return [];
    }
  }

  async getCompanyMetadata(ticker: string): Promise<CompanyMetadata> {
    try {
      const response = await this.makeRequest({
        function: 'OVERVIEW',
        symbol: ticker
      });

      if (response['Error Message'] || !response['Symbol']) {
        throw new DataNotFoundError(this.name, ticker);
      }

      return {
        cik: response['CIK'] || '',
        ticker: response['Symbol'],
        name: response['Name'],
        sic: response['GICS'] || '',
        sector: response['Sector'],
        industry: response['Industry'],
        fiscalYearEnd: response['FiscalYearEnd'],
      };
    } catch (error) {
      throw this.handleError(error, 'getCompanyMetadata');
    }
  }

  async getFinancialData(): Promise<FinancialData> {
    throw new DataProviderError(
      'Alpha Vantage does not provide comprehensive financial statement data',
      this.name,
      'NOT_SUPPORTED'
    );
  }

  async getLatestMetrics(cik: string, concepts: string[]): Promise<FinancialData> {
    throw new DataProviderError(
      'Alpha Vantage does not provide SEC filing metrics',
      this.name,
      'NOT_SUPPORTED'
    );
  }

  // Enhanced methods for real-time data and technical indicators
  async getRealTimePrice(ticker: string): Promise<RealTimePrice> {
    try {
      const response = await this.makeRequest({
        function: 'GLOBAL_QUOTE',
        symbol: ticker
      });

      const quote = response['Global Quote'] as AVQuote;
      
      if (!quote || response['Error Message']) {
        throw new DataNotFoundError(this.name, ticker);
      }

      const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));

      return {
        ticker: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent,
        volume: parseInt(quote['06. volume']),
        timestamp: new Date(quote['07. latest trading day']),
      };
    } catch (error) {
      throw this.handleError(error, 'getRealTimePrice');
    }
  }

  // Removed technical indicator methods - focusing on fundamental analysis only

  async getIntradayPrices(
    ticker: string,
    interval: '1min' | '5min' | '15min' | '30min' | '60min' = '5min'
  ): Promise<Array<{
    timestamp: Date;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>> {
    try {
      const response = await this.makeRequest({
        function: 'TIME_SERIES_INTRADAY',
        symbol: ticker,
        interval,
        outputsize: 'compact' // Latest 100 data points
      });

      const seriesKey = `Time Series (${interval})`;
      const timeSeries = response[seriesKey];

      if (!timeSeries || response['Error Message']) {
        throw new DataNotFoundError(this.name, ticker);
      }

      return Object.entries(timeSeries).map(([timestamp, data]: [string, any]) => ({
        timestamp: new Date(timestamp),
        open: parseFloat(data['1. open']),
        high: parseFloat(data['2. high']),
        low: parseFloat(data['3. low']),
        close: parseFloat(data['4. close']),
        volume: parseInt(data['5. volume']),
      })).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      throw this.handleError(error, 'getIntradayPrices');
    }
  }

  private async makeRequest(params: Record<string, string>): Promise<any> {
    const url = new URL(this.baseUrl);
    url.searchParams.append('apikey', this.apiKey);

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
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
          `Alpha Vantage API error: ${response.statusText}`,
          this.name,
          'API_ERROR',
          response.status
        );
      }

      const data = await response.json();

      // Check for API-specific error responses
      if (data['Error Message']) {
        throw new DataProviderError(
          `Alpha Vantage error: ${data['Error Message']}`,
          this.name,
          'API_ERROR'
        );
      }

      if (data['Note'] && data['Note'].includes('call frequency')) {
        throw new RateLimitError(this.name);
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
        `Alpha Vantage ${operation} failed: ${error.message}`,
        this.name,
        'OPERATION_FAILED'
      );
    }

    throw new DataProviderError(
      `Alpha Vantage ${operation} failed with unknown error`,
      this.name,
      'UNKNOWN_ERROR'
    );
  }
}