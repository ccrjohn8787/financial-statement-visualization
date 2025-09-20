// Polygon.io MCP Client - Enhanced Historical Data (Free Tier)
// Sprint 5 MCP Integration

import { MCPClient } from './types';
import { getApiKeys } from '../../config/mcpConfig';

export class PolygonClient implements MCPClient {
  name = 'polygon';
  private apiKeys = getApiKeys();
  private lastRequestTime = 0;
  private requestQueue: Array<{ resolve: Function; reject: Function; fn: Function }> = [];
  private processing = false;

  // Free tier: 5 calls per minute
  private readonly RATE_LIMIT_DELAY = 12000; // 12 seconds between requests (5 requests/60s)

  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check - try to get market status
      await this.getMarketStatus();
      return true;
    } catch (error) {
      console.error('Polygon.io MCP health check failed:', error);
      return false;
    }
  }

  getCapabilities(): string[] {
    return [
      'getHistoricalPrices',
      'getMarketStatus',
      'getDailyOHLC',
      'getAggregates',
      'getTickers',
      'getTickerDetails',
      'getRelatedCompanies',
      'getMarketHolidays',
      'getExchanges'
    ];
  }

  async query(method: string, params: any): Promise<any> {
    return this.executeWithRateLimit(async () => {
      switch (method) {
        case 'getHistoricalPrices':
          return this.getHistoricalPrices(params.ticker, params.from, params.to, params.timespan);
        case 'getMarketStatus':
          return this.getMarketStatus();
        case 'getDailyOHLC':
          return this.getDailyOHLC(params.ticker, params.date);
        case 'getAggregates':
          return this.getAggregates(params.ticker, params.timespan, params.from, params.to);
        case 'getTickers':
          return this.getTickers(params.market);
        case 'getTickerDetails':
          return this.getTickerDetails(params.ticker);
        case 'getRelatedCompanies':
          return this.getRelatedCompanies(params.ticker);
        case 'getMarketHolidays':
          return this.getMarketHolidays();
        case 'getExchanges':
          return this.getExchanges();
        default:
          throw new Error(`Unknown method: ${method}`);
      }
    });
  }

  // Rate limiting wrapper for free tier
  private async executeWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ resolve, reject, fn });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.requestQueue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.requestQueue.length > 0) {
      const { resolve, reject, fn } = this.requestQueue.shift()!;

      try {
        // Enforce rate limit
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
          const delay = this.RATE_LIMIT_DELAY - timeSinceLastRequest;
          console.log(`⏳ Polygon.io rate limit: waiting ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        this.lastRequestTime = Date.now();
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.processing = false;
  }

  // Historical price data (free tier: 2 years of data)
  async getHistoricalPrices(
    ticker: string,
    from: string,
    to: string,
    timespan: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year' = 'day'
  ): Promise<any> {
    try {
      // Validate date range for free tier (2 years max)
      const fromDate = new Date(from);
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

      if (fromDate < twoYearsAgo) {
        console.warn(`⚠️ Polygon.io free tier: Adjusting start date from ${from} to ${twoYearsAgo.toISOString().split('T')[0]}`);
        from = twoYearsAgo.toISOString().split('T')[0];
      }

      const response = await this.callPolygonAPI(
        `v2/aggs/ticker/${ticker}/range/1/${timespan}/${from}/${to}`,
        { adjusted: 'true', sort: 'asc', limit: 50000 }
      );

      return this.parseHistoricalPrices(response);
    } catch (error) {
      throw new Error(`Failed to get historical prices for ${ticker}: ${error}`);
    }
  }

  // Market status
  async getMarketStatus(): Promise<any> {
    try {
      const response = await this.callPolygonAPI('v1/marketstatus/now');
      return response;
    } catch (error) {
      throw new Error(`Failed to get market status: ${error}`);
    }
  }

  // Daily OHLC
  async getDailyOHLC(ticker: string, date: string): Promise<any> {
    try {
      const response = await this.callPolygonAPI(`v1/open-close/${ticker}/${date}`, { adjusted: 'true' });
      return response;
    } catch (error) {
      throw new Error(`Failed to get daily OHLC for ${ticker} on ${date}: ${error}`);
    }
  }

  // Aggregates (bars)
  async getAggregates(
    ticker: string,
    timespan: string,
    from: string,
    to: string
  ): Promise<any> {
    try {
      const response = await this.callPolygonAPI(
        `v2/aggs/ticker/${ticker}/range/1/${timespan}/${from}/${to}`,
        { adjusted: 'true', sort: 'asc' }
      );
      return response;
    } catch (error) {
      throw new Error(`Failed to get aggregates for ${ticker}: ${error}`);
    }
  }

  // List tickers
  async getTickers(market: string = 'stocks'): Promise<any> {
    try {
      const response = await this.callPolygonAPI('v3/reference/tickers', {
        market,
        active: 'true',
        limit: 1000
      });
      return response;
    } catch (error) {
      throw new Error(`Failed to get tickers for ${market}: ${error}`);
    }
  }

  // Ticker details
  async getTickerDetails(ticker: string): Promise<any> {
    try {
      const response = await this.callPolygonAPI(`v3/reference/tickers/${ticker}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to get ticker details for ${ticker}: ${error}`);
    }
  }

  // Related companies
  async getRelatedCompanies(ticker: string): Promise<any> {
    try {
      const response = await this.callPolygonAPI(`v1/related-companies/${ticker}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to get related companies for ${ticker}: ${error}`);
    }
  }

  // Market holidays
  async getMarketHolidays(): Promise<any> {
    try {
      const response = await this.callPolygonAPI('v1/marketstatus/upcoming');
      return response;
    } catch (error) {
      throw new Error(`Failed to get market holidays: ${error}`);
    }
  }

  // Exchanges
  async getExchanges(): Promise<any> {
    try {
      const response = await this.callPolygonAPI('v3/reference/exchanges');
      return response;
    } catch (error) {
      throw new Error(`Failed to get exchanges: ${error}`);
    }
  }

  // Private methods for Polygon.io API communication
  private async callPolygonAPI(endpoint: string, params: any = {}): Promise<any> {
    if (!this.apiKeys.polygon) {
      throw new Error('Polygon.io API key not configured');
    }

    const url = new URL(`https://api.polygon.io/${endpoint}`);
    url.searchParams.append('apikey', this.apiKeys.polygon!);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    console.log(`📡 Polygon.io API: ${endpoint}`);

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'FinScope/1.0'
        }
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded - Free tier allows 5 calls per minute');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();

      if (data.status === 'ERROR') {
        throw new Error(data.error || 'Unknown Polygon.io API error');
      }

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Network error: ${error}`);
    }
  }

  // Data parsing methods
  private parseHistoricalPrices(response: any): any {
    if (!response.results) {
      return { prices: [], count: 0 };
    }

    const prices = response.results.map((item: any) => ({
      timestamp: new Date(item.t),
      open: item.o,
      high: item.h,
      low: item.l,
      close: item.c,
      volume: item.v,
      volumeWeighted: item.vw,
      transactions: item.n
    }));

    return {
      prices,
      count: response.resultsCount,
      ticker: response.ticker,
      queryCount: response.queryCount,
      requestId: response.request_id
    };
  }
}