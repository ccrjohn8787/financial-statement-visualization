// yfinance MCP Client - Reliable Backup Data Source
// Sprint 5 MCP Integration

import { MCPClient } from './types';

export class YFinanceClient implements MCPClient {
  name = 'yfinance';

  async isHealthy(): Promise<boolean> {
    try {
      // Simple health check - try to get basic stock info
      await this.getStockInfo('AAPL');
      return true;
    } catch (error) {
      console.error('yfinance MCP health check failed:', error);
      return false;
    }
  }

  getCapabilities(): string[] {
    return [
      'getStockInfo',
      'getHistoricalData',
      'getFinancials',
      'getBalanceSheet',
      'getCashFlow',
      'getEarnings',
      'getNews',
      'getRecommendations',
      'getCalendar',
      'getActions',
      'getDividends',
      'getSplits',
      'getAnalysis',
      'getTopPerformers',
      'searchTickers'
    ];
  }

  async query(method: string, params: any): Promise<any> {
    switch (method) {
      case 'getStockInfo':
        return this.getStockInfo(params.ticker);
      case 'getHistoricalData':
        return this.getHistoricalData(params.ticker, params.period, params.interval);
      case 'getFinancials':
        return this.getFinancials(params.ticker);
      case 'getBalanceSheet':
        return this.getBalanceSheet(params.ticker);
      case 'getCashFlow':
        return this.getCashFlow(params.ticker);
      case 'getEarnings':
        return this.getEarnings(params.ticker);
      case 'getNews':
        return this.getNews(params.ticker);
      case 'getRecommendations':
        return this.getRecommendations(params.ticker);
      case 'getCalendar':
        return this.getCalendar(params.ticker);
      case 'getActions':
        return this.getActions(params.ticker);
      case 'getDividends':
        return this.getDividends(params.ticker);
      case 'getSplits':
        return this.getSplits(params.ticker);
      case 'getAnalysis':
        return this.getAnalysis(params.ticker);
      case 'getTopPerformers':
        return this.getTopPerformers(params.sector, params.type);
      case 'searchTickers':
        return this.searchTickers(params.query);
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  // Basic stock information
  async getStockInfo(ticker: string): Promise<any> {
    try {
      const response = await this.callYFinanceMCP('stock_info', { symbol: ticker });
      return this.parseStockInfo(response);
    } catch (error) {
      throw new Error(`Failed to get stock info for ${ticker}: ${error}`);
    }
  }

  // Historical price data
  async getHistoricalData(
    ticker: string,
    period: string = '1y',
    interval: string = '1d'
  ): Promise<any> {
    try {
      const response = await this.callYFinanceMCP('historical_data', {
        symbol: ticker,
        period,
        interval
      });
      return this.parseHistoricalData(response);
    } catch (error) {
      throw new Error(`Failed to get historical data for ${ticker}: ${error}`);
    }
  }

  // Financial statements
  async getFinancials(ticker: string): Promise<any> {
    try {
      const response = await this.callYFinanceMCP('financials', { symbol: ticker });
      return response;
    } catch (error) {
      throw new Error(`Failed to get financials for ${ticker}: ${error}`);
    }
  }

  // Balance sheet
  async getBalanceSheet(ticker: string): Promise<any> {
    try {
      const response = await this.callYFinanceMCP('balance_sheet', { symbol: ticker });
      return response;
    } catch (error) {
      throw new Error(`Failed to get balance sheet for ${ticker}: ${error}`);
    }
  }

  // Cash flow statement
  async getCashFlow(ticker: string): Promise<any> {
    try {
      const response = await this.callYFinanceMCP('cash_flow', { symbol: ticker });
      return response;
    } catch (error) {
      throw new Error(`Failed to get cash flow for ${ticker}: ${error}`);
    }
  }

  // Earnings data
  async getEarnings(ticker: string): Promise<any> {
    try {
      const response = await this.callYFinanceMCP('earnings', { symbol: ticker });
      return response;
    } catch (error) {
      throw new Error(`Failed to get earnings for ${ticker}: ${error}`);
    }
  }

  // News articles
  async getNews(ticker: string): Promise<any> {
    try {
      const response = await this.callYFinanceMCP('news', { symbol: ticker });
      return this.parseNews(response);
    } catch (error) {
      throw new Error(`Failed to get news for ${ticker}: ${error}`);
    }
  }

  // Analyst recommendations
  async getRecommendations(ticker: string): Promise<any> {
    try {
      const response = await this.callYFinanceMCP('recommendations', { symbol: ticker });
      return response;
    } catch (error) {
      throw new Error(`Failed to get recommendations for ${ticker}: ${error}`);
    }
  }

  // Earnings calendar
  async getCalendar(ticker: string): Promise<any> {
    try {
      const response = await this.callYFinanceMCP('calendar', { symbol: ticker });
      return response;
    } catch (error) {
      throw new Error(`Failed to get calendar for ${ticker}: ${error}`);
    }
  }

  // Corporate actions
  async getActions(ticker: string): Promise<any> {
    try {
      const response = await this.callYFinanceMCP('actions', { symbol: ticker });
      return response;
    } catch (error) {
      throw new Error(`Failed to get actions for ${ticker}: ${error}`);
    }
  }

  // Dividend history
  async getDividends(ticker: string): Promise<any> {
    try {
      const response = await this.callYFinanceMCP('dividends', { symbol: ticker });
      return response;
    } catch (error) {
      throw new Error(`Failed to get dividends for ${ticker}: ${error}`);
    }
  }

  // Stock splits
  async getSplits(ticker: string): Promise<any> {
    try {
      const response = await this.callYFinanceMCP('splits', { symbol: ticker });
      return response;
    } catch (error) {
      throw new Error(`Failed to get splits for ${ticker}: ${error}`);
    }
  }

  // Analysis data
  async getAnalysis(ticker: string): Promise<any> {
    try {
      const response = await this.callYFinanceMCP('analysis', { symbol: ticker });
      return response;
    } catch (error) {
      throw new Error(`Failed to get analysis for ${ticker}: ${error}`);
    }
  }

  // Top performers by sector/type
  async getTopPerformers(sector?: string, type?: string): Promise<any> {
    try {
      const response = await this.callYFinanceMCP('top_performers', { sector, type });
      return response;
    } catch (error) {
      throw new Error(`Failed to get top performers: ${error}`);
    }
  }

  // Search for tickers
  async searchTickers(query: string): Promise<any> {
    try {
      const response = await this.callYFinanceMCP('search', { query });
      return response;
    } catch (error) {
      throw new Error(`Failed to search tickers for "${query}": ${error}`);
    }
  }

  // Private methods for yfinance MCP communication
  private async callYFinanceMCP(tool: string, params: any): Promise<any> {
    // TODO: Implement actual yfinance MCP server communication
    // For now, return mock data structure

    console.log(`📡 yfinance MCP: ${tool}`, params);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 200));

    // Return mock data based on tool
    return this.getMockResponse(tool, params);
  }

  // Mock data responses for development/testing
  private getMockResponse(tool: string, params: any): any {
    const ticker = params.symbol || 'AAPL';

    switch (tool) {
      case 'stock_info':
        return {
          symbol: ticker,
          longName: `${ticker} Company`,
          currentPrice: 185.50,
          marketCap: 2800000000000,
          volume: 45000000,
          avgVolume: 52000000,
          beta: 1.2,
          pe: 25.3,
          eps: 7.32,
          dividendYield: 0.0048,
          sector: 'Technology',
          industry: 'Consumer Electronics',
          website: 'https://www.apple.com',
          summary: 'Leading technology company...'
        };

      case 'historical_data':
        // Generate mock historical data
        const data = [];
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);

        for (let i = 0; i < 90; i++) {
          const date = new Date(startDate);
          date.setDate(date.getDate() + i);

          const basePrice = 180;
          const variation = (Math.random() - 0.5) * 10;
          const open = basePrice + variation;
          const close = open + (Math.random() - 0.5) * 5;
          const high = Math.max(open, close) + Math.random() * 3;
          const low = Math.min(open, close) - Math.random() * 3;

          data.push({
            date: date.toISOString().split('T')[0],
            open: Math.round(open * 100) / 100,
            high: Math.round(high * 100) / 100,
            low: Math.round(low * 100) / 100,
            close: Math.round(close * 100) / 100,
            volume: Math.floor(Math.random() * 50000000) + 20000000
          });
        }

        return { symbol: ticker, data };

      case 'news':
        return {
          articles: [
            {
              title: `${ticker} Shows Strong Performance`,
              summary: 'Company demonstrates solid fundamentals...',
              publishedAt: new Date().toISOString(),
              source: 'Yahoo Finance',
              url: 'https://finance.yahoo.com/news/...'
            },
            {
              title: `Analysts Upgrade ${ticker} Rating`,
              summary: 'Multiple analysts raise price targets...',
              publishedAt: new Date(Date.now() - 86400000).toISOString(),
              source: 'Yahoo Finance',
              url: 'https://finance.yahoo.com/news/...'
            }
          ]
        };

      default:
        return {
          message: `Mock data for ${tool}`,
          ticker,
          timestamp: new Date().toISOString(),
          source: 'yfinance'
        };
    }
  }

  // Data parsing methods
  private parseStockInfo(response: any): any {
    return {
      symbol: response.symbol,
      name: response.longName,
      price: response.currentPrice,
      marketCap: response.marketCap,
      volume: response.volume,
      beta: response.beta,
      pe: response.pe,
      eps: response.eps,
      dividendYield: response.dividendYield,
      sector: response.sector,
      industry: response.industry,
      website: response.website,
      summary: response.summary
    };
  }

  private parseHistoricalData(response: any): any {
    return {
      symbol: response.symbol,
      prices: response.data,
      count: response.data.length
    };
  }

  private parseNews(response: any): any {
    return {
      articles: response.articles.map((article: any) => ({
        title: article.title,
        summary: article.summary,
        url: article.url,
        publishedAt: article.publishedAt,
        source: article.source,
        sentiment: 'neutral', // yfinance doesn't provide sentiment
        relevanceScore: 0.8
      }))
    };
  }
}