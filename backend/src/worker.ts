import 'dotenv/config';
import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { connectRedis } from './lib/redis';
import { createDefaultProvider } from './providers';
import { IngestionService } from './services/ingestion';
import type { IngestJobData } from './lib/queue';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting financial data ingestion worker...');

  // Connect to Redis
  await connectRedis();
  console.log('Connected to Redis');

  // Initialize data provider
  const provider = await createDefaultProvider();
  if (!provider) {
    throw new Error('Failed to initialize data provider');
  }
  console.log(`Initialized data provider: ${provider.name}`);

  // Create ingestion service
  const ingestionService = new IngestionService(prisma, provider);

  // Create worker
  const worker = new Worker(
    'ingest',
    async (job) => {
      const { cik, ticker, force } = job.data as IngestJobData;
      
      try {
        console.log(`Processing ingestion job for ${ticker || cik} (${cik})`);
        
        // Update job progress
        await job.updateProgress(10);

        // Key financial concepts for MVP dashboard
        const dashboardConcepts = [
          'Revenues',
          'NetIncomeLoss', 
          'CashAndCashEquivalentsAtCarryingValue',
          'LongTermDebtNoncurrent',
          'Assets',
          'Liabilities',
          'StockholdersEquity',
        ];

        await job.updateProgress(30);

        // Ingest company data
        const result = await ingestionService.ingestCompanyData(cik, {
          force,
          concepts: dashboardConcepts,
          maxAge: 24, // 24 hours
        });

        await job.updateProgress(90);

        if (!result.success) {
          throw new Error(`Ingestion failed: ${result.errors?.join(', ')}`);
        }

        console.log(
          `✅ Successfully ingested ${result.metricsIngested} metrics for ${result.ticker} (${cik}) from ${result.source}`
        );

        await job.updateProgress(100);

        return {
          success: true,
          cik,
          ticker: result.ticker,
          metricsIngested: result.metricsIngested,
          source: result.source,
        };

      } catch (error) {
        console.error(`❌ Job failed for ${ticker || cik} (${cik}):`, error);
        throw error;
      }
    },
    {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      concurrency: 2, // Process 2 jobs concurrently to respect rate limits
    }
  );

  // Event handlers
  worker.on('ready', () => {
    console.log('Worker is ready and waiting for jobs');
  });

  worker.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });

  worker.on('stalled', (jobId) => {
    console.warn(`Job ${jobId} stalled`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down worker...');
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Shutting down worker...');
    await worker.close();
    await prisma.$disconnect();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error('Worker failed to start:', error);
  process.exit(1);
});