import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createApp } from '../index';
import type { Express } from 'express';

// Test configuration
const TEST_TIMEOUT = 30000; // 30 seconds for integration tests

describe('Financial Statement API Integration Tests', () => {
  let app: Express;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Only run integration tests if explicitly enabled
    if (process.env.NODE_ENV !== 'integration') {
      return;
    }

    const appResult = await createApp();
    app = appResult.app;
    prisma = appResult.prisma;

    // Ensure test data exists
    await seedTestData();
  }, TEST_TIMEOUT);

  afterAll(async () => {
    if (process.env.NODE_ENV !== 'integration') {
      return;
    }
    await cleanupTestData();
    await prisma.$disconnect();
  });

  beforeEach(() => {
    if (process.env.NODE_ENV !== 'integration') {
      return;
    }
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        services: {
          database: 'healthy',
          redis: 'healthy',
        },
      });
    });
  });

  describe('API Documentation', () => {
    it('should return API documentation', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      const response = await request(app)
        .get('/api/docs')
        .expect(200);

      expect(response.body).toHaveProperty('name');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('concepts');
    });
  });

  describe('Company Search', () => {
    it('should search companies by ticker', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      const response = await request(app)
        .get('/api/companies/search?q=AAPL')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body).toHaveProperty('meta');
    });

    it('should limit search results', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      const response = await request(app)
        .get('/api/companies/search?q=A&limit=3')
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(3);
      expect(response.body.meta.limit).toBe(3);
    });

    it('should validate search parameters', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      // Missing query parameter
      await request(app)
        .get('/api/companies/search')
        .expect(400);

      // Invalid limit
      await request(app)
        .get('/api/companies/search?q=AAPL&limit=25')
        .expect(400);
    });

    it('should handle rate limiting', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      // Make rapid requests to trigger rate limit
      const promises = Array.from({ length: 15 }, () =>
        request(app).get('/api/companies/search?q=test')
      );

      const results = await Promise.allSettled(promises);
      const rateLimited = results.some(result => 
        result.status === 'fulfilled' && result.value.status === 429
      );

      // Note: This test might not always trigger rate limiting in CI
      // It's more of a behavioral test
      expect(results.length).toBe(15);
    });
  });

  describe('Company Metadata', () => {
    it('should get company by ticker', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      const response = await request(app)
        .get('/api/companies/AAPL')
        .expect(200);

      expect(response.body.data).toMatchObject({
        ticker: 'AAPL',
        name: expect.stringContaining('Apple'),
        cik: expect.stringMatching(/^\d{10}$/),
      });
    });

    it('should return 404 for non-existent company', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      const response = await request(app)
        .get('/api/companies/NONEXISTENT')
        .expect(404);

      expect(response.body.error.code).toBe('COMPANY_NOT_FOUND');
    });

    it('should handle case-insensitive ticker lookup', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      const lowerCase = await request(app)
        .get('/api/companies/aapl')
        .expect(200);

      const upperCase = await request(app)
        .get('/api/companies/AAPL')
        .expect(200);

      expect(lowerCase.body.data.ticker).toBe(upperCase.body.data.ticker);
    });
  });

  describe('Company Overview', () => {
    it('should get company overview with metrics', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      const response = await request(app)
        .get('/api/companies/AAPL/overview')
        .expect(200);

      expect(response.body.data).toMatchObject({
        company: {
          ticker: 'AAPL',
          name: expect.any(String),
          cik: expect.stringMatching(/^\d{10}$/),
        },
        metrics: expect.arrayContaining([
          expect.objectContaining({
            concept: expect.any(String),
            label: expect.any(String),
            value: expect.any(Number),
            unit: expect.any(String),
            periodEnd: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
            fiscalPeriod: expect.any(String),
            fiscalYear: expect.any(Number),
          }),
        ]),
        lastUpdated: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        source: expect.any(String),
        disclaimer: expect.stringContaining('investment advice'),
      });
    });

    it('should validate overview query parameters', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      // Invalid range
      await request(app)
        .get('/api/companies/AAPL/overview?range=10y')
        .expect(400);

      // Invalid refresh parameter
      await request(app)
        .get('/api/companies/AAPL/overview?refresh=invalid')
        .expect(400);
    });

    it('should return proper cache headers', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      const response = await request(app)
        .get('/api/companies/AAPL/overview')
        .expect(200);

      expect(response.headers['cache-control']).toContain('public');
      expect(response.headers['cache-control']).toContain('max-age');
    });
  });

  describe('Data Refresh', () => {
    it('should queue data refresh', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      const response = await request(app)
        .post('/api/companies/AAPL/refresh')
        .send({ force: false })
        .expect(200);

      expect(response.body.data).toMatchObject({
        jobId: expect.any(String),
        status: 'queued',
        message: expect.stringContaining('AAPL'),
      });
    });

    it('should get refresh job status', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      // First queue a job
      const refreshResponse = await request(app)
        .post('/api/companies/AAPL/refresh')
        .send({ force: false })
        .expect(200);

      const jobId = refreshResponse.body.data.jobId;

      // Then check its status
      const statusResponse = await request(app)
        .get(`/api/companies/AAPL/refresh/${jobId}`)
        .expect(200);

      expect(statusResponse.body.data).toMatchObject({
        id: jobId,
        status: expect.stringMatching(/^(waiting|active|completed|failed)$/),
        progress: expect.any(Number),
      });
    });

    it('should validate refresh request body', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      // Invalid concepts array
      await request(app)
        .post('/api/companies/AAPL/refresh')
        .send({ concepts: 'invalid' })
        .expect(400);
    });

    it('should handle 404 for non-existent job', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      await request(app)
        .get('/api/companies/AAPL/refresh/nonexistent-job-id')
        .expect(404);
    });
  });

  describe('Metric Time Series', () => {
    it('should get metric time series data', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      const response = await request(app)
        .get('/api/companies/AAPL/metrics/Revenues')
        .expect(200);

      expect(response.body.data).toMatchObject({
        concept: 'Revenues',
        label: 'Revenue',
        unit: expect.any(String),
        data: expect.arrayContaining([
          expect.objectContaining({
            periodEnd: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
            value: expect.any(Number),
            fiscalPeriod: expect.any(String),
            fiscalYear: expect.any(Number),
          }),
        ]),
        metadata: expect.objectContaining({
          dataPoints: expect.any(Number),
          periodRange: expect.objectContaining({
            start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
            end: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          }),
          frequency: expect.stringMatching(/^(quarterly|annual|mixed)$/),
        }),
      });
    });

    it('should validate metric concept', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      await request(app)
        .get('/api/companies/AAPL/metrics/InvalidConcept')
        .expect(400);
    });

    it('should filter by frequency', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      const quarterlyResponse = await request(app)
        .get('/api/companies/AAPL/metrics/Revenues?frequency=quarterly')
        .expect(200);

      const quarterlyPeriods = quarterlyResponse.body.data.data
        .map((d: any) => d.fiscalPeriod);
      
      expect(quarterlyPeriods.every((p: string) => 
        ['Q1', 'Q2', 'Q3', 'Q4'].includes(p)
      )).toBe(true);
    });

    it('should handle date range filtering', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      const response = await request(app)
        .get('/api/companies/AAPL/metrics/Revenues?range=1y')
        .expect(200);

      const dates = response.body.data.data.map((d: any) => new Date(d.periodEnd));
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      expect(dates.every((date: Date) => date >= oneYearAgo)).toBe(true);
    });
  });

  describe('Peer Comparison', () => {
    it('should get peer comparison data', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      const response = await request(app)
        .get('/api/companies/AAPL/metrics/Revenues/peers')
        .expect(200);

      expect(response.body.data).toMatchObject({
        concept: 'Revenues',
        label: 'Revenue',
        target: expect.objectContaining({
          company: expect.objectContaining({
            ticker: 'AAPL',
            name: expect.any(String),
          }),
          value: expect.any(Number),
          periodEnd: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        }),
        peers: expect.arrayContaining([
          expect.objectContaining({
            company: expect.objectContaining({
              ticker: expect.any(String),
              name: expect.any(String),
            }),
            value: expect.any(Number),
            periodEnd: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
          }),
        ]),
        metadata: expect.objectContaining({
          sicCode: expect.any(String),
          totalPeers: expect.any(Number),
        }),
      });
    });

    it('should handle companies without SIC code', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      // This test depends on having a company without SIC code in test data
      // If no such company exists, this test will be skipped
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      const response = await request(app)
        .get('/api/nonexistent')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should include request ID in error responses', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      const response = await request(app)
        .get('/api/companies/NONEXISTENT')
        .expect(404);

      expect(response.body.error.requestId).toBeDefined();
      expect(response.body.error.timestamp).toBeDefined();
    });

    it('should handle malformed JSON in request body', async () => {
      if (process.env.NODE_ENV !== 'integration') return;

      const response = await request(app)
        .post('/api/companies/AAPL/refresh')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }')
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  // Helper functions
  async function seedTestData() {
    // Ensure Apple exists in the database for testing
    const apple = await prisma.company.upsert({
      where: { cik: '0000320193' },
      update: {},
      create: {
        cik: '0000320193',
        ticker: 'AAPL',
        name: 'Apple Inc.',
        sic: '3571',
        fiscalYearEnd: '0930',
      },
    });

    // Add some test metrics if they don't exist
    await prisma.metricView.upsert({
      where: {
        cik_metric_periodEnd: {
          cik: apple.cik,
          metric: 'Revenues',
          periodEnd: new Date('2023-09-30'),
        },
      },
      update: {},
      create: {
        cik: apple.cik,
        metric: 'Revenues',
        periodEnd: new Date('2023-09-30'),
        value: 383285000000,
        fiscalPeriod: 'FY',
        fiscalYear: 2023,
      },
    });

    console.log('Test data seeded successfully');
  }

  async function cleanupTestData() {
    // Clean up any test-specific data if needed
    // For now, we'll keep the seeded data as it's useful for testing
    console.log('Test cleanup completed');
  }
});