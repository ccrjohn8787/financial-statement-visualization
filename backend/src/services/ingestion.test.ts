import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IngestionService } from './ingestion';
import type { IFinancialDataProvider, FinancialData } from '../providers';
import { DataProviderError } from '../providers';

// Mock Prisma Client
const mockPrisma = {
  company: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  fact: {
    upsert: vi.fn(),
  },
  metricView: {
    deleteMany: vi.fn(),
    upsert: vi.fn(),
  },
  $transaction: vi.fn(),
};

// Mock Redis
vi.mock('../lib/redis', () => ({
  redis: {
    setEx: vi.fn(),
    del: vi.fn(),
  },
}));

// Mock Provider
const mockProvider: IFinancialDataProvider = {
  name: 'TestProvider',
  capabilities: {
    hasSecFilings: true,
    hasFundamentals: true,
    hasRealTimeData: false,
    hasPeerData: false,
    hasHistoricalData: true,
  },
  searchCompanies: vi.fn(),
  getCompanyMetadata: vi.fn(),
  getFinancialData: vi.fn(),
  getLatestMetrics: vi.fn(),
  healthCheck: vi.fn(),
  configure: vi.fn(),
};

const mockFinancialData: FinancialData = {
  company: {
    cik: '0000320193',
    ticker: 'AAPL',
    name: 'Apple Inc.',
    sic: '3571',
    fiscalYearEnd: '0930',
  },
  metrics: [
    {
      concept: 'Revenues',
      value: 383285000000,
      unit: 'USD',
      periodEnd: new Date('2023-09-30'),
      periodStart: new Date('2022-10-01'),
      instant: false,
      fiscalYear: 2023,
      fiscalPeriod: 'FY',
      filingAccession: '0000320193-23-000106',
      form: '10-K',
      filed: new Date('2023-11-03'),
    },
    {
      concept: 'NetIncomeLoss',
      value: 97000000000,
      unit: 'USD',
      periodEnd: new Date('2023-09-30'),
      periodStart: new Date('2022-10-01'),
      instant: false,
      fiscalYear: 2023,
      fiscalPeriod: 'FY',
      filingAccession: '0000320193-23-000106',
      form: '10-K',
      filed: new Date('2023-11-03'),
    },
  ],
  lastUpdated: new Date(),
  source: 'TestProvider',
};

describe('IngestionService', () => {
  let service: IngestionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new IngestionService(mockPrisma as any, mockProvider);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('ingestCompanyData', () => {
    it('should successfully ingest company data', async () => {
      // Setup mocks
      mockProvider.getFinancialData = vi.fn().mockResolvedValue(mockFinancialData);
      mockPrisma.$transaction = vi.fn().mockImplementation((callback) =>
        callback({
          company: {
            upsert: vi.fn().mockResolvedValue({
              cik: '0000320193',
              ticker: 'AAPL',
              name: 'Apple Inc.',
            }),
          },
          fact: {
            upsert: vi.fn().mockResolvedValue({}),
          },
          metricView: {
            deleteMany: vi.fn(),
            upsert: vi.fn().mockResolvedValue({}),
          },
        })
      );

      const result = await service.ingestCompanyData('320193');

      expect(result.success).toBe(true);
      expect(result.cik).toBe('0000320193');
      expect(result.ticker).toBe('AAPL');
      expect(result.metricsIngested).toBe(2);
      expect(result.source).toBe('TestProvider');
      expect(mockProvider.getFinancialData).toHaveBeenCalledWith('0000320193', {});
    });

    it('should skip ingestion if data is fresh and not forced', async () => {
      // Mock existing fresh data
      const recentDate = new Date(Date.now() - 1000 * 60 * 60 * 12); // 12 hours ago
      mockPrisma.company.findUnique = vi.fn().mockResolvedValue({
        updatedAt: recentDate,
        ticker: 'AAPL',
        _count: { facts: 10 },
      });

      const result = await service.ingestCompanyData('320193', { maxAge: 24 });

      expect(result.success).toBe(true);
      expect(result.source).toBe('cache');
      expect(result.metricsIngested).toBe(10);
      expect(mockProvider.getFinancialData).not.toHaveBeenCalled();
    });

    it('should force ingestion when force option is true', async () => {
      // Mock existing fresh data
      const recentDate = new Date(Date.now() - 1000 * 60 * 60 * 12); // 12 hours ago
      mockPrisma.company.findUnique = vi.fn().mockResolvedValue({
        updatedAt: recentDate,
      });

      mockProvider.getFinancialData = vi.fn().mockResolvedValue(mockFinancialData);
      mockPrisma.$transaction = vi.fn().mockImplementation((callback) =>
        callback({
          company: { upsert: vi.fn().mockResolvedValue({ cik: '0000320193', ticker: 'AAPL' }) },
          fact: { upsert: vi.fn().mockResolvedValue({}) },
          metricView: { deleteMany: vi.fn(), upsert: vi.fn().mockResolvedValue({}) },
        })
      );

      const result = await service.ingestCompanyData('320193', { force: true });

      expect(result.success).toBe(true);
      expect(mockProvider.getFinancialData).toHaveBeenCalled();
    });

    it('should handle provider errors gracefully', async () => {
      const providerError = new DataProviderError(
        'Data not found',
        'TestProvider',
        'NOT_FOUND',
        404
      );
      mockProvider.getFinancialData = vi.fn().mockRejectedValue(providerError);

      const result = await service.ingestCompanyData('invalid');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Data not found');
      expect(result.source).toBe('TestProvider');
    });

    it('should normalize CIK correctly', async () => {
      mockProvider.getFinancialData = vi.fn().mockResolvedValue(mockFinancialData);
      mockPrisma.$transaction = vi.fn().mockImplementation((callback) =>
        callback({
          company: { upsert: vi.fn().mockResolvedValue({ cik: '0000320193', ticker: 'AAPL' }) },
          fact: { upsert: vi.fn().mockResolvedValue({}) },
          metricView: { deleteMany: vi.fn(), upsert: vi.fn().mockResolvedValue({}) },
        })
      );

      const result = await service.ingestCompanyData('320193'); // Input without leading zeros

      expect(result.cik).toBe('0000320193'); // Should be normalized with leading zeros
      expect(mockProvider.getFinancialData).toHaveBeenCalledWith('0000320193', {});
    });
  });

  describe('ingestLatestMetrics', () => {
    it('should ingest latest metrics for dashboard', async () => {
      const concepts = ['Revenues', 'NetIncomeLoss'];
      mockProvider.getLatestMetrics = vi.fn().mockResolvedValue(mockFinancialData);
      mockPrisma.$transaction = vi.fn().mockImplementation((callback) =>
        callback({
          company: { upsert: vi.fn().mockResolvedValue({ cik: '0000320193', ticker: 'AAPL' }) },
          fact: { upsert: vi.fn().mockResolvedValue({}) },
          metricView: { deleteMany: vi.fn(), upsert: vi.fn().mockResolvedValue({}) },
        })
      );

      const result = await service.ingestLatestMetrics('320193', concepts);

      expect(result.success).toBe(true);
      expect(mockProvider.getLatestMetrics).toHaveBeenCalledWith('0000320193', concepts);
    });
  });

  describe('batchIngest', () => {
    it('should process multiple companies in batches', async () => {
      const ciks = ['320193', '789019', '1018724']; // Apple, Microsoft, Amazon
      
      mockProvider.getFinancialData = vi.fn().mockResolvedValue(mockFinancialData);
      mockPrisma.$transaction = vi.fn().mockImplementation((callback) =>
        callback({
          company: { upsert: vi.fn().mockResolvedValue({ cik: '0000320193', ticker: 'AAPL' }) },
          fact: { upsert: vi.fn().mockResolvedValue({}) },
          metricView: { deleteMany: vi.fn(), upsert: vi.fn().mockResolvedValue({}) },
        })
      );

      const results = await service.batchIngest(ciks);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.success)).toBe(true);
      expect(mockProvider.getFinancialData).toHaveBeenCalledTimes(3);
    });

    it('should handle individual failures in batch', async () => {
      const ciks = ['320193', 'invalid'];
      
      mockProvider.getFinancialData = vi.fn()
        .mockResolvedValueOnce(mockFinancialData) // First call succeeds
        .mockRejectedValueOnce(new DataProviderError('Not found', 'TestProvider', 'NOT_FOUND')); // Second fails
      
      mockPrisma.$transaction = vi.fn().mockImplementation((callback) =>
        callback({
          company: { upsert: vi.fn().mockResolvedValue({ cik: '0000320193', ticker: 'AAPL' }) },
          fact: { upsert: vi.fn().mockResolvedValue({}) },
          metricView: { deleteMany: vi.fn(), upsert: vi.fn().mockResolvedValue({}) },
        })
      );

      const results = await service.batchIngest(ciks);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].errors).toContain('Not found');
    });
  });
});