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
  console.log(`🤖 AI services initialized`);

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
    
    if (!ticker) {
      return res.status(400).json({
        error: { code: 'INVALID_TICKER', message: 'Ticker parameter is required' }
      });
    }

    try {
      console.log(`🔍 Fetching FinScope metrics for ${ticker.toUpperCase()}`);
      const companyData = await finScopeMetrics.getCompanyMetrics(ticker);
      
      console.log(`✅ Successfully retrieved ${companyData.metrics.length} metrics for ${ticker.toUpperCase()}`);
      
      res.json({ data: companyData });
    } catch (error) {
      console.error(`❌ FinScope metrics failed for ${ticker}:`, error);
      
      // Fallback to sample data for known tickers
      const sampleData = getSampleCompanyData(ticker.toUpperCase());
      if (sampleData) {
        console.log(`📋 Using sample data for ${ticker.toUpperCase()}`);
        res.json({ data: sampleData });
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