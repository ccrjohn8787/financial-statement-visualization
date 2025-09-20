// Data Source Router - Intelligent routing between multiple data sources
// Sprint 5 MCP Integration

import {
  DataSource,
  DataType,
  RouteConfig,
  DataSourceLog,
  RequestContext,
  EnhancedCompanyData
} from './mcp/types';
import { mcpGateway } from './mcp/MCPGateway';

// Existing services
import { FinScopeMetricsService } from './finscopeMetrics';
import { FinnhubClient } from '../lib/finnhub';

export class DataSourceRouter {
  private finnhubClient: FinnhubClient;
  private finScopeMetrics: FinScopeMetricsService;
  private routingRules: Record<DataType, RouteConfig>;

  constructor() {
    const finnhubApiKey = process.env.FINNHUB_API_KEY || 'demo';
    this.finnhubClient = new FinnhubClient(finnhubApiKey);
    this.finScopeMetrics = new FinScopeMetricsService(finnhubApiKey);
    this.initializeRoutingRules();
  }

  private initializeRoutingRules(): void {
    this.routingRules = {
      // Basic Company Data
      companyOverview: {
        primary: 'finnhub',
        fallback: ['yfinance', 'finance-tools'],
        enhancement: ['finance-tools', 'polygon'],
        cacheStrategy: 'moderate',
        rateLimitStrategy: 'none'
      },

      // Core Financial Metrics (Our existing 6 metrics)
      financialMetrics: {
        primary: 'finnhub',
        fallback: ['sec-edgar', 'finance-tools'],
        enhancement: ['finance-tools'],
        cacheStrategy: 'aggressive',
        rateLimitStrategy: 'none'
      },

      // Historical Price Data
      historicalPrices: {
        primary: 'polygon', // Enhanced quality with free tier
        fallback: ['yfinance', 'finnhub'],
        cacheStrategy: 'aggressive',
        rateLimitStrategy: 'strict' // 5 calls/minute for Polygon free tier
      },

      // NEW: Earnings History & Analysis
      earningsHistory: {
        primary: 'finance-tools',
        fallback: ['finnhub', 'yfinance'],
        cacheStrategy: 'aggressive',
        rateLimitStrategy: 'adaptive'
      },

      // NEW: Insider Trading Data
      insiderTrading: {
        primary: 'finance-tools',
        fallback: ['polygon'],
        cacheStrategy: 'moderate',
        rateLimitStrategy: 'adaptive'
      },

      // NEW: Institutional Holdings
      institutionalHoldings: {
        primary: 'finance-tools',
        fallback: ['sec-edgar'],
        cacheStrategy: 'moderate',
        rateLimitStrategy: 'none'
      },

      // NEW: Market Sentiment Indicators
      fearGreedIndex: {
        primary: 'finance-tools',
        fallback: [], // No fallback - unique to Finance Tools
        cacheStrategy: 'minimal', // Keep fresh
        rateLimitStrategy: 'none'
      },

      // NEW: Macroeconomic Data
      macroData: {
        primary: 'finance-tools', // Via FRED API
        fallback: [],
        cacheStrategy: 'aggressive',
        rateLimitStrategy: 'none'
      },

      // News & Sentiment
      newsData: {
        primary: 'finnhub',
        fallback: ['finance-tools', 'yfinance'],
        enhancement: ['finance-tools'],
        cacheStrategy: 'minimal',
        rateLimitStrategy: 'adaptive'
      },

      // NEW: Options Data
      optionsData: {
        primary: 'finance-tools',
        fallback: ['yfinance'],
        cacheStrategy: 'moderate',
        rateLimitStrategy: 'adaptive'
      }
    };
  }

  async getEnhancedCompanyData(ticker: string): Promise<EnhancedCompanyData> {
    const context: RequestContext = {
      ticker,
      dataType: 'companyOverview',
      params: { ticker },
      timestamp: new Date()
    };

    console.log(`🎯 Data Source Router: Fetching enhanced data for ${ticker}`);

    try {
      // Get core data from existing FinScope infrastructure (preserved)
      const coreData = await this.getCoreFinScopeData(ticker);

      // Enhance with MCP data in parallel
      const enhancementPromises = [
        this.safeGetData('earningsHistory', { ticker }, context),
        this.safeGetData('insiderTrading', { ticker }, context),
        this.safeGetData('institutionalHoldings', { ticker }, context),
        this.safeGetData('fearGreedIndex', {}, context),
        this.safeGetData('optionsData', { ticker }, context),
        this.safeGetData('newsData', { ticker }, context)
      ];

      const [
        earningsHistory,
        insiderTrading,
        institutionalHoldings,
        fearGreedIndex,
        optionsData,
        enhancedNews
      ] = await Promise.allSettled(enhancementPromises);

      // Build enhanced response
      const enhanced: EnhancedCompanyData = {
        // Preserve existing FinScope data
        company: coreData.company,
        currentPrice: coreData.currentPrice,
        healthScore: coreData.healthScore,
        metrics: coreData.metrics,

        // Add MCP enhancements
        earningsHistory: this.extractResult(earningsHistory),
        insiderTrading: this.extractResult(insiderTrading),
        institutionalHoldings: this.extractResult(institutionalHoldings),
        fearGreedIndex: this.extractResult(fearGreedIndex),
        optionsFlow: this.extractResult(optionsData),
        enhancedNews: this.extractResult(enhancedNews),

        // Data source tracking
        dataSources: this.getDataSourceLogs()
      };

      console.log(`✅ Enhanced data for ${ticker}: ${this.countEnhancements(enhanced)} new data points`);
      return enhanced;

    } catch (error) {
      console.error(`❌ Failed to get enhanced data for ${ticker}:`, error);

      // Graceful degradation - return core data only
      const coreData = await this.getCoreFinScopeData(ticker);
      return {
        ...coreData,
        dataSources: [{
          source: 'finnhub',
          dataType: 'companyOverview',
          timestamp: new Date(),
          success: true,
          cached: false
        }]
      };
    }
  }

  async getData(dataType: DataType, params: any, context?: RequestContext): Promise<any> {
    const config = this.routingRules[dataType];
    if (!config) {
      throw new Error(`No routing configuration for data type: ${dataType}`);
    }

    const requestContext = context || {
      ticker: params.ticker || 'unknown',
      dataType,
      params,
      timestamp: new Date()
    };

    console.log(`📊 Routing ${dataType} -> Primary: ${config.primary}`);

    try {
      // Try primary source
      const result = await this.fetchFromSource(config.primary, dataType, params, requestContext);

      // Enhance with additional sources if configured
      if (config.enhancement && config.enhancement.length > 0) {
        return this.enhanceData(result, config.enhancement, dataType, params, requestContext);
      }

      return result;

    } catch (error) {
      console.warn(`⚠️ Primary source ${config.primary} failed for ${dataType}:`, error);

      // Execute fallback strategy
      return this.executeFallback(config.fallback, dataType, params, requestContext);
    }
  }

  private async fetchFromSource(
    source: DataSource,
    dataType: DataType,
    params: any,
    context: RequestContext
  ): Promise<any> {
    const startTime = Date.now();

    try {
      let result;

      switch (source) {
        case 'finnhub':
          result = await this.fetchFromFinnhub(dataType, params);
          break;

        case 'finance-tools':
          result = await this.fetchFromFinanceTools(dataType, params);
          break;

        case 'polygon':
          result = await this.fetchFromPolygon(dataType, params);
          break;

        case 'yfinance':
          result = await this.fetchFromYFinance(dataType, params);
          break;

        case 'sec-edgar':
          result = await this.fetchFromSecEdgar(dataType, params);
          break;

        default:
          throw new Error(`Unknown data source: ${source}`);
      }

      // Log successful fetch
      this.logDataSourceUsage(source, dataType, context, true, Date.now() - startTime);
      return result;

    } catch (error) {
      // Log failed fetch
      this.logDataSourceUsage(source, dataType, context, false, Date.now() - startTime, String(error));
      throw error;
    }
  }

  private async fetchFromFinnhub(dataType: DataType, params: any): Promise<any> {
    switch (dataType) {
      case 'companyOverview':
      case 'financialMetrics':
        // Use existing FinScope metrics service
        return this.finScopeMetrics.getCompanyMetrics(params.ticker);
      case 'newsData':
        return this.finnhubClient.get('/company-news', { symbol: params.ticker });
      default:
        throw new Error(`Finnhub does not support data type: ${dataType}`);
    }
  }

  private async fetchFromFinanceTools(dataType: DataType, params: any): Promise<any> {
    const methodMap: Record<DataType, string> = {
      earningsHistory: 'getEarningsHistory',
      insiderTrading: 'getInsiderTrading',
      institutionalHoldings: 'getInstitutionalHolders',
      fearGreedIndex: 'getFearGreedIndex',
      optionsData: 'getOptionsData',
      newsData: 'getNews',
      macroData: 'getFREDData',
      companyOverview: 'getTickerReport',
      financialMetrics: 'getKeyMetrics'
    };

    const method = methodMap[dataType];
    if (!method) {
      throw new Error(`Finance Tools does not support data type: ${dataType}`);
    }

    return mcpGateway.query('finance-tools', method, params);
  }

  private async fetchFromPolygon(dataType: DataType, params: any): Promise<any> {
    const methodMap: Record<DataType, string> = {
      historicalPrices: 'getHistoricalPrices',
      insiderTrading: 'getRelatedCompanies' // Limited support
    };

    const method = methodMap[dataType];
    if (!method) {
      throw new Error(`Polygon does not support data type: ${dataType}`);
    }

    return mcpGateway.query('polygon', method, params);
  }

  private async fetchFromYFinance(dataType: DataType, params: any): Promise<any> {
    const methodMap: Record<DataType, string> = {
      companyOverview: 'getStockInfo',
      historicalPrices: 'getHistoricalData',
      newsData: 'getNews',
      optionsData: 'getAnalysis',
      earningsHistory: 'getEarnings'
    };

    const method = methodMap[dataType];
    if (!method) {
      throw new Error(`yFinance does not support data type: ${dataType}`);
    }

    return mcpGateway.query('yfinance', method, params);
  }

  private async fetchFromSecEdgar(dataType: DataType, params: any): Promise<any> {
    // TODO: Implement SEC EDGAR integration (existing)
    throw new Error('SEC EDGAR integration not yet implemented');
  }

  private async executeFallback(
    fallbackSources: DataSource[],
    dataType: DataType,
    params: any,
    context: RequestContext
  ): Promise<any> {
    if (fallbackSources.length === 0) {
      throw new Error(`No fallback sources available for ${dataType}`);
    }

    for (const source of fallbackSources) {
      try {
        console.log(`🔄 Trying fallback source: ${source}`);
        return await this.fetchFromSource(source, dataType, params, context);
      } catch (error) {
        console.warn(`⚠️ Fallback source ${source} failed:`, error);
        continue;
      }
    }

    throw new Error(`All fallback sources failed for ${dataType}`);
  }

  private async enhanceData(
    baseData: any,
    enhancementSources: DataSource[],
    dataType: DataType,
    params: any,
    context: RequestContext
  ): Promise<any> {
    const enhancementPromises = enhancementSources.map(source =>
      this.safeGetFromSource(source, dataType, params, context)
    );

    const enhancements = await Promise.allSettled(enhancementPromises);
    const successfulEnhancements = enhancements
      .filter(result => result.status === 'fulfilled')
      .map(result => (result as PromiseFulfilledResult<any>).value);

    return this.mergeDataSources(baseData, successfulEnhancements);
  }

  private async safeGetFromSource(
    source: DataSource,
    dataType: DataType,
    params: any,
    context: RequestContext
  ): Promise<any> {
    try {
      return await this.fetchFromSource(source, dataType, params, context);
    } catch (error) {
      console.warn(`Enhancement from ${source} failed:`, error);
      return null;
    }
  }

  private async safeGetData(dataType: DataType, params: any, context: RequestContext): Promise<any> {
    try {
      return await this.getData(dataType, params, context);
    } catch (error) {
      console.warn(`Failed to get ${dataType}:`, error);
      return null;
    }
  }

  private mergeDataSources(baseData: any, enhancements: any[]): any {
    // Simple merge strategy - combine arrays, prefer non-null values
    const merged = { ...baseData };

    enhancements.forEach(enhancement => {
      if (enhancement) {
        Object.keys(enhancement).forEach(key => {
          if (enhancement[key] && !merged[key]) {
            merged[key] = enhancement[key];
          }
        });
      }
    });

    return merged;
  }

  private async getCoreFinScopeData(ticker: string): Promise<any> {
    // Get existing FinScope data structure (preserved)
    try {
      const companyData = await this.finScopeMetrics.getCompanyMetrics(ticker);
      return companyData;
    } catch (error) {
      throw new Error(`Failed to get core FinScope data: ${error}`);
    }
  }

  private extractResult(result: PromiseSettledResult<any>): any {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return null;
  }

  private countEnhancements(data: EnhancedCompanyData): number {
    let count = 0;
    if (data.earningsHistory) count += Array.isArray(data.earningsHistory) ? data.earningsHistory.length : 1;
    if (data.insiderTrading) count += Array.isArray(data.insiderTrading) ? data.insiderTrading.length : 1;
    if (data.institutionalHoldings) count += Array.isArray(data.institutionalHoldings) ? data.institutionalHoldings.length : 1;
    if (data.fearGreedIndex) count += 1;
    if (data.optionsFlow) count += Array.isArray(data.optionsFlow) ? data.optionsFlow.length : 1;
    if (data.enhancedNews) count += Array.isArray(data.enhancedNews) ? data.enhancedNews.length : 1;
    return count;
  }

  // Data source usage tracking
  private dataSourceLogs: DataSourceLog[] = [];

  private logDataSourceUsage(
    source: DataSource,
    dataType: DataType,
    context: RequestContext,
    success: boolean,
    latency?: number,
    error?: string
  ): void {
    this.dataSourceLogs.push({
      source,
      dataType,
      timestamp: new Date(),
      success,
      latency,
      error,
      cached: false // TODO: Implement cache tracking
    });

    // Keep only recent logs (last 100)
    if (this.dataSourceLogs.length > 100) {
      this.dataSourceLogs = this.dataSourceLogs.slice(-100);
    }
  }

  private getDataSourceLogs(): DataSourceLog[] {
    return [...this.dataSourceLogs];
  }

  // Health and status methods
  getAvailableSources(): DataSource[] {
    const available: DataSource[] = ['finnhub']; // Always available

    // Check MCP sources
    const mcpSources = mcpGateway.getAvailableClients();
    mcpSources.forEach(client => {
      switch (client) {
        case 'finance-tools':
          available.push('finance-tools');
          break;
        case 'polygon':
          available.push('polygon');
          break;
        case 'yfinance':
          available.push('yfinance');
          break;
      }
    });

    return available;
  }

  getRouterStatus(): any {
    return {
      availableSources: this.getAvailableSources(),
      routingRules: Object.keys(this.routingRules),
      recentRequests: this.dataSourceLogs.slice(-10),
      mcpStatus: mcpGateway.getHealthStatus()
    };
  }
}