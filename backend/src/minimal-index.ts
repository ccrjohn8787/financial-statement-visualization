import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import { FinnhubClient } from './lib/finnhub';
import { FinScopeMetricsService } from './services/finscopeMetrics';
import { LLMService } from './services/llm';
import { HealthScoringService } from './services/healthScoring';
import { PromptManager } from './services/prompts';
import { ComparisonService } from './services/comparisonService';
import { TrendAnalysisService } from './services/trendAnalysisService';
import { InsightsService } from './services/insightsService';

// MCP Integration (Sprint 5)
import { mcpGateway } from './services/mcp/MCPGateway';
import { DataSourceRouter } from './services/dataSourceRouter';
import { mcpConfig, logMcpConfig } from './config/mcpConfig';

// Sprint 6 Performance Monitoring
import { mcpMonitor } from './services/monitoring/MCPMonitor';
import { requestBatcher } from './services/mcp/RequestBatcher';
import { mcpCacheManager } from './services/mcp/MCPCacheManager';

async function createApp() {
  const app = express();
  const prisma = new PrismaClient();
  
  // Initialize Finnhub client (fallback to demo key if not provided)
  const finnhubApiKey = process.env.FINNHUB_API_KEY || 'demo';
  const finnhubClient = new FinnhubClient(finnhubApiKey);
  const finScopeMetrics = new FinScopeMetricsService(finnhubApiKey);
  console.log(`Initialized FinScope metrics service with API key: ${finnhubApiKey === 'demo' ? 'demo (limited)' : 'provided'}`);

  // Initialize AI services
  const llmService = new LLMService();
  const healthScoringService = new HealthScoringService(llmService);
  const comparisonService = new ComparisonService(finScopeMetrics, llmService);
  const trendAnalysisService = new TrendAnalysisService(finScopeMetrics, llmService);
  const insightsService = new InsightsService(finScopeMetrics, llmService);
  console.log(`🤖 AI services initialized (5 services)`);

  // Initialize MCP Gateway and Data Source Router (Sprint 5)
  logMcpConfig();

  let dataSourceRouter: DataSourceRouter | null = null;
  try {
    await mcpGateway.initialize();
    dataSourceRouter = new DataSourceRouter();
    console.log(`🔌 MCP Gateway and Data Source Router initialized`);
  } catch (error) {
    console.warn(`⚠️ MCP initialization failed (continuing without MCP):`, error);
  }

  // Test services connection
  let servicesHealthy = false;
  try {
    servicesHealthy = await finScopeMetrics.healthCheck();
    console.log(`✅ FinScope metrics service ${servicesHealthy ? 'connected' : 'failed connection test'}`);
  } catch (error) {
    console.error('❌ FinScope metrics service health check failed:', error);
  }

  // Security and parsing middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // AI-powered health scoring endpoint
  app.get('/api/companies/:ticker/health-score', async (req, res) => {
    const { ticker } = req.params;
    const { industry = 'Technology' } = req.query;
    
    if (!ticker) {
      return res.status(400).json({
        error: { code: 'INVALID_TICKER', message: 'Ticker parameter is required' }
      });
    }

    try {
      console.log(`🏥 Calculating health score for ${ticker.toUpperCase()}`);
      
      // Get company metrics first
      const companyData = await finScopeMetrics.getCompanyMetrics(ticker);
      
      // Calculate health score with AI analysis
      const healthScore = await healthScoringService.calculateHealthScore(
        companyData.company.name,
        ticker.toUpperCase(),
        companyData.metrics,
        industry as string
      );

      res.json({ 
        data: healthScore,
        company: companyData.company
      });
    } catch (error) {
      console.error(`❌ Health scoring failed for ${ticker}:`, error);
      res.status(500).json({
        error: { 
          code: 'HEALTH_SCORE_FAILED', 
          message: 'Failed to calculate health score',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });

  // AI-powered metric explanations endpoint
  app.get('/api/companies/:ticker/explanations', async (req, res) => {
    const { ticker } = req.params;
    const { metric, simple = 'false' } = req.query;
    
    if (!ticker) {
      return res.status(400).json({
        error: { code: 'INVALID_TICKER', message: 'Ticker parameter is required' }
      });
    }

    try {
      console.log(`💬 Generating explanations for ${ticker.toUpperCase()}`);
      
      // Get company metrics
      const companyData = await finScopeMetrics.getCompanyMetrics(ticker);
      const explanations: Record<string, any> = {};

      // If specific metric requested, explain just that one
      if (metric && typeof metric === 'string') {
        const targetMetric = companyData.metrics.find(m => 
          m.concept.toLowerCase() === metric.toLowerCase() || 
          m.label.toLowerCase().includes(metric.toLowerCase())
        );

        if (!targetMetric) {
          return res.status(404).json({
            error: { code: 'METRIC_NOT_FOUND', message: `Metric '${metric}' not found` }
          });
        }

        const prompt = PromptManager.createMetricExplanationPrompt(
          targetMetric.label,
          targetMetric.value || 'N/A',
          targetMetric.unit,
          companyData.company.name,
          ticker.toUpperCase(),
          simple === 'true'
        );

        const explanation = await llmService.generateResponse({
          prompt,
          maxTokens: 500,
          temperature: 0.4,
          useCache: true
        });

        explanations[targetMetric.concept] = {
          metric: targetMetric,
          explanation: explanation.content,
          type: simple === 'true' ? 'simple' : 'technical',
          generatedAt: explanation.generatedAt,
          confidence: explanation.confidence
        };
      } else {
        // Generate explanations for all available metrics
        const isSimple = simple === 'true';
        
        for (const metricData of companyData.metrics.slice(0, 3)) { // Limit to first 3 to manage costs
          if (metricData.value === null) continue;
          
          try {
            const prompt = PromptManager.createMetricExplanationPrompt(
              metricData.label,
              metricData.value,
              metricData.unit,
              companyData.company.name,
              ticker.toUpperCase(),
              isSimple
            );

            const explanation = await llmService.generateResponse({
              prompt,
              maxTokens: isSimple ? 200 : 400,
              temperature: 0.4,
              useCache: true
            });

            explanations[metricData.concept] = {
              metric: metricData,
              explanation: explanation.content,
              type: isSimple ? 'simple' : 'technical',
              generatedAt: explanation.generatedAt,
              confidence: explanation.confidence
            };
          } catch (error) {
            console.warn(`⚠️ Failed to generate explanation for ${metricData.concept}:`, error);
            explanations[metricData.concept] = {
              metric: metricData,
              explanation: `${metricData.label} measures ${metricData.label.toLowerCase()} performance. Current value is ${metricData.value} ${metricData.unit}.`,
              type: 'fallback',
              error: 'AI explanation failed'
            };
          }
        }
      }

      res.json({ 
        data: explanations,
        company: companyData.company,
        generated: new Date().toISOString()
      });
    } catch (error) {
      console.error(`❌ Explanation generation failed for ${ticker}:`, error);
      res.status(500).json({
        error: { 
          code: 'EXPLANATION_FAILED', 
          message: 'Failed to generate explanations',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });

  // LLM service status endpoint
  app.get('/api/llm/status', async (req, res) => {
    try {
      const isHealthy = await llmService.healthCheck();
      const stats = llmService.getStats();
      
      res.json({
        status: isHealthy ? 'healthy' : 'degraded',
        stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Company search using Finnhub
  app.get('/api/companies/search', async (req, res) => {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        error: { code: 'INVALID_QUERY', message: 'Query parameter "q" is required' }
      });
    }

    try {
      const searchResults = await finnhubClient.searchSymbol(q);
      
      // Convert Finnhub results to our format
      const companies = searchResults.result
        .filter(result => result.type === 'Common Stock' && !result.symbol.includes('.'))
        .slice(0, 10)
        .map(result => ({
          cik: '0000000000', // Placeholder - would need separate lookup for real CIK
          ticker: result.symbol,
          name: result.description,
          sic: '0000' // Placeholder - would need separate lookup for real SIC
        }));

      res.json({ 
        data: companies,
        total: companies.length,
        source: 'Finnhub API'
      });
    } catch (error) {
      console.error('Company search failed:', error);
      
      // Fallback to sample data if Finnhub fails
      const sampleCompanies = [
        { cik: '0000320193', ticker: 'AAPL', name: 'Apple Inc.', sic: '3571' },
        { cik: '0001652044', ticker: 'GOOGL', name: 'Alphabet Inc.', sic: '7372' },
        { cik: '0001018724', ticker: 'AMZN', name: 'Amazon.com Inc.', sic: '5961' },
        { cik: '0000789019', ticker: 'MSFT', name: 'Microsoft Corporation', sic: '7372' },
        { cik: '0001045810', ticker: 'NVDA', name: 'NVIDIA Corporation', sic: '3674' },
      ].filter(company => 
        company.ticker.includes(q.toUpperCase()) || 
        company.name.toLowerCase().includes(q.toLowerCase())
      );

      res.json({ 
        data: sampleCompanies.slice(0, 10),
        total: sampleCompanies.length,
        source: 'Sample Data (Finnhub unavailable)'
      });
    }
  });

  // Company overview by ticker using FinScope metrics service
  app.get('/api/companies/:ticker/overview', async (req, res) => {
    const { ticker } = req.params;
    const { enhanced = 'true' } = req.query;

    if (!ticker) {
      return res.status(400).json({
        error: { code: 'INVALID_TICKER', message: 'Ticker parameter is required' }
      });
    }

    try {
      // Use enhanced MCP data if router is available and enhanced is requested
      if (dataSourceRouter && enhanced === 'true') {
        console.log(`🚀 Fetching MCP-enhanced data for ${ticker.toUpperCase()}`);

        try {
          const enhancedData = await dataSourceRouter.getEnhancedCompanyData(ticker);
          console.log(`✅ MCP enhancement successful: ${enhancedData.dataSources.length} data sources used`);

          res.json({
            data: enhancedData,
            enhanced: true,
            mcpStatus: dataSourceRouter.getRouterStatus()
          });
          return;
        } catch (mcpError) {
          console.warn(`⚠️ MCP enhancement failed, falling back to core data:`, mcpError);
          // Continue to core data fallback
        }
      }

      // Core FinScope data (preserved - existing functionality)
      console.log(`🔍 Fetching core FinScope metrics for ${ticker.toUpperCase()}`);
      const companyData = await finScopeMetrics.getCompanyMetrics(ticker);

      console.log(`✅ Successfully retrieved ${companyData.metrics.length} core metrics for ${ticker.toUpperCase()}`);

      res.json({
        data: companyData,
        enhanced: false
      });
    } catch (error) {
      console.error(`❌ FinScope metrics failed for ${ticker}:`, error);

      // Fallback to sample data for known tickers
      const sampleData = getSampleCompanyData(ticker.toUpperCase());
      if (sampleData) {
        console.log(`📋 Using sample data for ${ticker.toUpperCase()}`);
        res.json({
          data: sampleData,
          enhanced: false,
          fallback: true
        });
      } else {
        res.status(500).json({
          error: {
            code: 'OVERVIEW_FAILED',
            message: 'Failed to fetch company overview',
            details: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }
    }
  });

  // Helper function for sample data fallback
  function getSampleCompanyData(ticker: string) {
    const sampleDataMap: Record<string, any> = {
      'NVDA': {
        company: {
          cik: '0001045810',
          ticker: 'NVDA',
          name: 'NVIDIA Corporation',
          sic: '3674',
          fiscalYearEnd: '0131'
        },
        metrics: [
          {
            concept: 'Revenues',
            label: 'Revenue',
            value: 60922000000,
            unit: 'USD',
            periodEnd: '2024-01-31T00:00:00Z',
            fiscalPeriod: 'FY',
            fiscalYear: 2024,
            change: { value: 22284000000, percentage: 0.576, period: 'YoY' }
          },
          {
            concept: 'NetIncomeLoss',
            label: 'Net Income',
            value: 29760000000,
            unit: 'USD',
            periodEnd: '2024-01-31T00:00:00Z',
            fiscalPeriod: 'FY',
            fiscalYear: 2024,
            change: { value: 25286000000, percentage: 5.649, period: 'YoY' }
          }
        ],
        lastUpdated: new Date().toISOString(),
        source: 'Sample Data',
        disclaimer: 'This is sample data for demonstration purposes only.'
      }
    };
    
    return sampleDataMap[ticker] || null;
  }

  // Debug endpoint for raw Finnhub data inspection
  app.get('/api/debug/companies/:ticker/raw', async (req, res) => {
    const { ticker } = req.params;
    
    if (!ticker) {
      return res.status(400).json({
        error: { code: 'INVALID_TICKER', message: 'Ticker parameter is required' }
      });
    }

    try {
      console.log(`🔍 [DEBUG] Fetching raw data for ${ticker.toUpperCase()}`);
      const [companyProfile, financials] = await Promise.all([
        finnhubClient.getCompanyProfile(ticker.toUpperCase()),
        finnhubClient.getCompanyFinancials(ticker.toUpperCase())
      ]);

      res.json({
        ticker: ticker.toUpperCase(),
        profile: companyProfile,
        financials: financials,
        debugInfo: {
          shareOutstanding: companyProfile.shareOutstanding,
          keyMetrics: {
            netMarginTTM: financials.metric.netMarginTTM,
            revenueGrowthTTMYoy: financials.metric.revenueGrowthTTMYoy,
            pfcfShareTTM: financials.metric.pfcfShareTTM,
            peTTM: financials.metric.peTTM,
            totalDebtToEquityQuarterly: financials.metric.totalDebtToEquityQuarterly,
            roiTTM: financials.metric.roiTTM,
            revenuePerShareTTM: financials.metric.revenuePerShareTTM,
            epsInclExtraItemsTTM: financials.metric.epsInclExtraItemsTTM
          }
        }
      });
    } catch (error) {
      console.error(`❌ [DEBUG] Failed to fetch raw data for ${ticker}:`, error);
      res.status(500).json({
        error: { 
          code: 'DEBUG_FAILED', 
          message: 'Failed to fetch raw debug data',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });

  // Helper function to get human-readable labels
  function getMetricLabel(concept: string): string {
    const labelMap: Record<string, string> = {
      'Revenues': 'Revenue',
      'NetIncomeLoss': 'Net Income',
      'CashAndCashEquivalentsAtCarryingValue': 'Cash & Cash Equivalents',
      'StockholdersEquity': 'Shareholders Equity',
      'LongTermDebtNoncurrent': 'Long-term Debt',
      'CurrentRatio': 'Current Ratio',
      'ReturnOnEquity': 'Return on Equity',
      'DebtToEquityRatio': 'Debt to Equity Ratio'
    };
    return labelMap[concept] || concept;
  }

  // Company Comparison endpoint - Sprint 4
  app.get('/api/compare', async (req, res) => {
    const { companies } = req.query;

    if (!companies) {
      return res.status(400).json({
        error: { code: 'MISSING_COMPANIES', message: 'companies parameter is required' }
      });
    }

    try {
      const tickers = typeof companies === 'string' ? companies.split(',') : [];

      if (tickers.length < 2 || tickers.length > 5) {
        return res.status(400).json({
          error: {
            code: 'INVALID_COMPANIES',
            message: 'Must provide 2-5 companies for comparison'
          }
        });
      }

      console.log(`🔄 Starting comparison for: ${tickers.join(', ')}`);
      const comparisonResult = await comparisonService.compareCompanies(tickers);

      res.json({
        data: comparisonResult,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Comparison endpoint error:', error);
      res.status(500).json({
        error: {
          code: 'COMPARISON_FAILED',
          message: 'Failed to compare companies',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });

  // Historical Trends endpoint - Sprint 4
  app.get('/api/company/:ticker/trends', async (req, res) => {
    const { ticker } = req.params;
    const quarters = parseInt(req.query.quarters as string) || 8;

    if (!ticker) {
      return res.status(400).json({
        error: { code: 'INVALID_TICKER', message: 'Ticker parameter is required' }
      });
    }

    if (quarters < 2 || quarters > 20) {
      return res.status(400).json({
        error: {
          code: 'INVALID_QUARTERS',
          message: 'Quarters must be between 2 and 20'
        }
      });
    }

    try {
      console.log(`📈 Analyzing trends for ${ticker.toUpperCase()} over ${quarters} quarters`);
      const trendAnalysis = await trendAnalysisService.analyzeTrends(ticker, quarters);

      res.json({
        data: trendAnalysis,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ Trends endpoint error for ${ticker}:`, error);
      res.status(500).json({
        error: {
          code: 'TRENDS_FAILED',
          message: 'Failed to analyze trends',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });

  // Financial Insights endpoint - Sprint 4
  app.get('/api/company/:ticker/insights', async (req, res) => {
    const { ticker } = req.params;

    if (!ticker) {
      return res.status(400).json({
        error: { code: 'INVALID_TICKER', message: 'Ticker parameter is required' }
      });
    }

    try {
      console.log(`🔍 Generating insights for ${ticker.toUpperCase()}`);
      const insights = await insightsService.generateInsights(ticker);

      res.json({
        data: insights,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error(`❌ Insights endpoint error for ${ticker}:`, error);
      res.status(500).json({
        error: {
          code: 'INSIGHTS_FAILED',
          message: 'Failed to generate insights',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });

  // MCP status endpoint (Sprint 5)
  app.get('/api/mcp/status', async (req, res) => {
    try {
      if (!dataSourceRouter) {
        return res.json({
          enabled: false,
          message: 'MCP integration not initialized',
          config: {
            enabled: mcpConfig.enabled
          }
        });
      }

      const status = dataSourceRouter.getRouterStatus();
      const mcpHealth = mcpGateway.getHealthStatus();

      res.json({
        enabled: true,
        router: status,
        mcpGateway: {
          healthStatus: Object.fromEntries(mcpHealth),
          availableClients: mcpGateway.getAvailableClients()
        },
        config: {
          enabled: mcpConfig.enabled,
          clients: {
            financeTools: mcpConfig.clients.financeTools.enabled,
            polygon: mcpConfig.clients.polygon.enabled,
            yfinance: mcpConfig.clients.yfinance.enabled
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'MCP_STATUS_FAILED',
          message: 'Failed to get MCP status',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      // Check database connection
      let dbStatus = 'healthy';
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (error) {
        dbStatus = 'error';
      }

      // Check FinScope metrics service
      let finScopeStatus = 'unknown';
      try {
        finScopeStatus = servicesHealthy ? 'healthy' : 'degraded';
      } catch (error) {
        finScopeStatus = 'error';
      }

      const health = {
        status: dbStatus === 'healthy' && finScopeStatus !== 'error' ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus,
          finScopeMetrics: finScopeStatus,
          cache: 'memory',
          mcp: dataSourceRouter ? 'enabled' : 'disabled'
        },
        version: '1.1.0',
      };

      const statusCode = health.status === 'ok' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Service health check failed',
      });
    }
  });

  // Sprint 6: MCP Performance Monitoring Endpoints

  // MCP Health Status - Real-time monitoring dashboard
  app.get('/api/mcp/health', async (req, res) => {
    try {
      if (!dataSourceRouter) {
        return res.json({
          status: 'disabled',
          message: 'MCP system is not enabled',
          timestamp: new Date().toISOString()
        });
      }

      const healthStatus = mcpMonitor.getHealthStatus();
      const mcpGatewayHealth = mcpGateway.getHealthStatus();

      res.json({
        ...healthStatus,
        mcpClients: Array.from(mcpGatewayHealth.entries()).map(([name, status]) => ({
          name,
          ...status
        })),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ MCP health check failed:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to check MCP health',
        timestamp: new Date().toISOString()
      });
    }
  });

  // MCP Performance Metrics - Detailed monitoring data
  app.get('/api/mcp/metrics', async (req, res) => {
    try {
      if (!dataSourceRouter) {
        return res.json({
          enabled: false,
          message: 'MCP system is not enabled'
        });
      }

      const metrics = mcpMonitor.getMetrics();
      const cacheStats = mcpCacheManager.getStats();
      const batcherStats = requestBatcher.getStats();
      const routerStatus = dataSourceRouter.getRouterStatus();

      res.json({
        performance: metrics,
        cache: cacheStats,
        batching: batcherStats,
        routing: routerStatus,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ MCP metrics failed:', error);
      res.status(500).json({
        error: 'Failed to get MCP metrics',
        timestamp: new Date().toISOString()
      });
    }
  });

  // MCP Performance Trends - Historical analysis
  app.get('/api/mcp/trends', async (req, res) => {
    try {
      if (!dataSourceRouter) {
        return res.json({
          enabled: false,
          message: 'MCP system is not enabled'
        });
      }

      const hours = parseInt(req.query.hours as string) || 24;
      if (hours < 1 || hours > 168) { // Max 1 week
        return res.status(400).json({
          error: 'Hours must be between 1 and 168 (1 week)'
        });
      }

      const trends = mcpMonitor.getPerformanceTrends(hours);
      const cacheContents = mcpCacheManager.getCacheContents();

      res.json({
        trends: trends.timeline,
        insights: trends.insights,
        cacheSnapshot: {
          totalEntries: cacheContents.length,
          topDataTypes: cacheContents.reduce((acc, entry) => {
            acc[entry.dataType] = (acc[entry.dataType] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          avgAge: cacheContents.length > 0
            ? Math.round(cacheContents.reduce((sum, entry) => sum + entry.age, 0) / cacheContents.length)
            : 0
        },
        timeRange: `${hours} hours`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ MCP trends failed:', error);
      res.status(500).json({
        error: 'Failed to get MCP trends',
        timestamp: new Date().toISOString()
      });
    }
  });

  // MCP Cache Management - Cache control endpoints
  app.post('/api/mcp/cache/invalidate', async (req, res) => {
    try {
      if (!dataSourceRouter) {
        return res.status(400).json({
          error: 'MCP system is not enabled'
        });
      }

      const { type, target } = req.body;

      switch (type) {
        case 'dataType':
          mcpCacheManager.invalidateByDataType(target);
          break;
        case 'source':
          mcpCacheManager.invalidateBySource(target);
          break;
        case 'ticker':
          mcpCacheManager.invalidateByTicker(target);
          break;
        case 'all':
          mcpCacheManager.clear();
          break;
        default:
          return res.status(400).json({
            error: 'Invalid invalidation type. Use: dataType, source, ticker, or all'
          });
      }

      res.json({
        success: true,
        message: `Cache invalidated for ${type}: ${target || 'all'}`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Cache invalidation failed:', error);
      res.status(500).json({
        error: 'Failed to invalidate cache',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Enhanced Company Data with MCP Integration
  app.get('/api/companies/:ticker/enhanced', async (req, res) => {
    const { ticker } = req.params;

    if (!ticker) {
      return res.status(400).json({
        error: { code: 'INVALID_TICKER', message: 'Ticker parameter is required' }
      });
    }

    try {
      if (!dataSourceRouter) {
        // Fallback to regular overview if MCP not available
        return res.redirect(`/api/companies/${ticker}/overview`);
      }

      console.log(`🎯 Fetching enhanced data for ${ticker.toUpperCase()}`);
      const startTime = Date.now();

      const enhancedData = await dataSourceRouter.getEnhancedCompanyData(ticker.toUpperCase());
      const latency = Date.now() - startTime;

      // Record performance metrics
      mcpMonitor.recordRequest('data-source-router', 'enhancedCompanyData', latency, true);

      res.json({
        data: enhancedData,
        enhanced: true,
        performance: {
          latency: `${latency}ms`,
          dataSources: enhancedData.dataSources?.length || 0
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      const latency = Date.now() - Date.now();
      mcpMonitor.recordRequest('data-source-router', 'enhancedCompanyData', latency, false, String(error));

      console.error(`❌ Enhanced data failed for ${ticker}:`, error);
      res.status(500).json({
        error: {
          code: 'ENHANCED_DATA_FAILED',
          message: 'Failed to fetch enhanced company data',
          details: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });

  // API documentation endpoint
  app.get('/api/docs', (req, res) => {
    res.json({
      name: 'Financial Statement Visualization API',
      version: '1.0.0',
      description: 'REST API for accessing financial statement data from SEC filings',
      status: 'minimal version running',
    });
  });

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString(),
      },
    });
  });

  return { app, prisma };
}

async function startServer() {
  try {
    const { app, prisma } = await createApp();
    const port = process.env.PORT || 3001;

    const server = app.listen(port, () => {
      console.log(`🚀 Financial API with DB running on port ${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
      console.log(`📚 API docs: http://localhost:${port}/api/docs`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down server...');
      server.close(async () => {
        await prisma.$disconnect();

        // Shutdown MCP Gateway and Sprint 6 services if initialized
        if (dataSourceRouter) {
          await mcpGateway.shutdown();
          mcpMonitor.shutdown();
          requestBatcher.shutdown();
          mcpCacheManager.shutdown();
          console.log('MCP Gateway and monitoring services shut down');
        }

        console.log('Server shut down successfully');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

export { createApp };