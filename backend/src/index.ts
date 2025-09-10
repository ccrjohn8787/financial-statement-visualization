import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import { connectRedis } from './lib/redis';
import { createDefaultProvider } from './providers';
import { createCompaniesRouter } from './api/routes/companies';
import { createMetricsRouter } from './api/routes/metrics';
import { 
  requestLogger, 
  errorHandler, 
  rateLimit 
} from './api/middleware';

async function createApp() {
  const app = express();
  const prisma = new PrismaClient();

  // Security and parsing middleware
  app.use(helmet());
  app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Logging middleware
  app.use(requestLogger);

  // Global rate limiting
  app.use('/api', rateLimit(500, 60 * 1000)); // 500 requests per minute globally

  // Connect to external services
  await connectRedis();
  console.log('Connected to Redis');

  // Initialize data provider
  const provider = await createDefaultProvider();
  if (!provider) {
    throw new Error('Failed to initialize data provider');
  }
  console.log(`Initialized data provider: ${provider.name}`);

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;
      
      // Check provider health
      const providerHealthy = await provider.healthCheck();
      
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        services: {
          database: 'healthy',
          provider: providerHealthy ? 'healthy' : 'degraded',
          redis: 'healthy', // If we got here, Redis is working
        },
        version: process.env.npm_package_version || '1.0.0',
      };

      res.json(health);
    } catch (error) {
      res.status(503).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Service health check failed',
      });
    }
  });

  // API routes
  app.use('/api/companies', createCompaniesRouter(prisma, provider));
  app.use('/api/companies', createMetricsRouter(prisma));

  // API documentation endpoint
  app.get('/api/docs', (req, res) => {
    res.json({
      name: 'Financial Statement Visualization API',
      version: '1.0.0',
      description: 'REST API for accessing financial statement data from SEC filings',
      endpoints: {
        'GET /health': 'Service health check',
        'GET /api/companies/search': 'Search for companies',
        'GET /api/companies/:ticker': 'Get company metadata',
        'GET /api/companies/:ticker/overview': 'Get company dashboard data',
        'POST /api/companies/:ticker/refresh': 'Queue data refresh',
        'GET /api/companies/:ticker/refresh/:jobId': 'Check refresh status',
        'GET /api/companies/:ticker/metrics/:concept': 'Get metric time series',
        'GET /api/companies/:ticker/metrics/:concept/peers': 'Get peer comparison',
      },
      concepts: {
        description: 'Supported financial concepts',
        list: [
          'Revenues',
          'NetIncomeLoss', 
          'CashAndCashEquivalentsAtCarryingValue',
          'LongTermDebtNoncurrent',
          'Assets',
          'Liabilities',
          'StockholdersEquity',
        ],
      },
      rateLimit: {
        global: '500 requests per minute',
        search: '100 requests per minute',
        overview: '150 requests per minute',
        refresh: '10 requests per minute',
      },
      disclaimer: 'This API provides financial data for educational purposes only and should not be considered as investment advice.',
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

  // Error handling middleware (must be last)
  app.use(errorHandler);

  return { app, prisma };
}

async function startServer() {
  try {
    const { app, prisma } = await createApp();
    const port = process.env.PORT || 3001;

    const server = app.listen(port, () => {
      console.log(`🚀 Financial Statement Visualization API running on port ${port}`);
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