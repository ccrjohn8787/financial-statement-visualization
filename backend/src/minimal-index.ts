import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import { FinnhubClient } from './lib/finnhub';

async function createApp() {
  const app = express();
  const prisma = new PrismaClient();
  
  // Initialize Finnhub client (fallback to demo key if not provided)
  const finnhubApiKey = process.env.FINNHUB_API_KEY || 'demo';
  const finnhubClient = new FinnhubClient(finnhubApiKey);
  console.log(`Initialized Finnhub client with API key: ${finnhubApiKey === 'demo' ? 'demo (limited)' : 'provided'}`);

  // Test Finnhub connection
  let finnhubHealthy = false;
  try {
    finnhubHealthy = await finnhubClient.healthCheck();
    console.log(`✅ Finnhub client ${finnhubHealthy ? 'connected' : 'failed connection test'}`);
  } catch (error) {
    console.error('❌ Finnhub health check failed:', error);
  }

  // Security and parsing middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

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

  // Company overview by ticker using Finnhub
  app.get('/api/companies/:ticker/overview', async (req, res) => {
    const { ticker } = req.params;
    
    if (!ticker) {
      return res.status(400).json({
        error: { code: 'INVALID_TICKER', message: 'Ticker parameter is required' }
      });
    }

    try {
      const [companyProfile, financials] = await Promise.all([
        finnhubClient.getCompanyProfile(ticker.toUpperCase()),
        finnhubClient.getCompanyFinancials(ticker.toUpperCase())
      ]);

      // Map Finnhub metrics to our format
      // Note: shareOutstanding is in millions, so multiply by 1M for revenue/earnings
      const metrics = [
        {
          concept: 'Revenues',
          label: 'Revenue',
          value: financials.metric.revenuePerShareTTM ? financials.metric.revenuePerShareTTM * companyProfile.shareOutstanding * 1000000 : null,
          unit: 'USD',
          periodEnd: new Date().toISOString(),
          fiscalPeriod: 'TTM',
          fiscalYear: new Date().getFullYear(),
          change: financials.metric.revenueGrowthTTMYoy ? {
            value: null,
            percentage: financials.metric.revenueGrowthTTMYoy,
            period: 'YoY'
          } : null
        },
        {
          concept: 'NetIncomeLoss',
          label: 'Net Income',
          value: financials.metric.epsInclExtraItemsTTM ? financials.metric.epsInclExtraItemsTTM * companyProfile.shareOutstanding * 1000000 : null,
          unit: 'USD',
          periodEnd: new Date().toISOString(),
          fiscalPeriod: 'TTM',
          fiscalYear: new Date().getFullYear(),
          change: null // Would need historical data
        },
        {
          concept: 'MarketCapitalization',
          label: 'Market Cap',
          value: financials.metric.marketCapitalization ? financials.metric.marketCapitalization * 1000000 : null,
          unit: 'USD',
          periodEnd: new Date().toISOString(),
          fiscalPeriod: 'Current',
          fiscalYear: new Date().getFullYear(),
          change: null
        },
        {
          concept: 'PERatio',
          label: 'P/E Ratio',
          value: financials.metric.peTTM || financials.metric.peInclExtraItemsTTM,
          unit: 'Ratio',
          periodEnd: new Date().toISOString(),
          fiscalPeriod: 'TTM',
          fiscalYear: new Date().getFullYear(),
          change: null
        }
      ].filter(metric => metric.value !== null && metric.value !== undefined);

      const responseData = {
        company: {
          cik: '0000000000', // Placeholder
          ticker: ticker.toUpperCase(),
          name: companyProfile.name,
          sic: '0000', // Placeholder
          fiscalYearEnd: '1231' // Placeholder
        },
        metrics,
        lastUpdated: new Date().toISOString(),
        source: 'Finnhub API',
        disclaimer: 'Financial data for informational purposes only. Not investment advice.'
      };

      res.json({ data: responseData });
    } catch (error) {
      console.error('Company overview failed:', error);
      
      // Fallback to sample data for known tickers
      const sampleData = getSampleCompanyData(ticker.toUpperCase());
      if (sampleData) {
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

      // Check Finnhub connection
      let finnhubStatus = 'unknown';
      try {
        finnhubStatus = finnhubHealthy ? 'healthy' : 'degraded';
      } catch (error) {
        finnhubStatus = 'error';
      }

      const health = {
        status: dbStatus === 'healthy' && finnhubStatus !== 'error' ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        services: {
          database: dbStatus,
          finnhub: finnhubStatus,
          cache: 'memory',
        },
        version: '1.0.0',
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