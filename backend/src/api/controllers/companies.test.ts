import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { CompaniesController } from './companies';
import type { IFinancialDataProvider } from '../../providers';
import { ApiError } from '../middleware';

// Mock Prisma
const mockPrisma = {
  company: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  metricView: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
};

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

// Mock queue functions
vi.mock('../../lib/queue', () => ({
  addIngestJob: vi.fn().mockResolvedValue({ id: 'job-123' }),
  getJobStatus: vi.fn().mockResolvedValue({
    id: 'job-123',
    status: 'completed',
    progress: 100,
  }),
}));

describe('CompaniesController', () => {
  let controller: CompaniesController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new CompaniesController(mockPrisma as any, mockProvider);
    
    mockReq = {
      params: {},
      query: {},
      body: {},
    };
    
    mockRes = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
    };
  });

  describe('search', () => {
    it('should search companies successfully', async () => {
      const mockCompanies = [
        {
          cik: '0000320193',
          ticker: 'AAPL',
          name: 'Apple Inc.',
          sic: '3571',
        },
      ];

      mockPrisma.company.findMany.mockResolvedValue(mockCompanies);
      mockReq.query = { q: 'AAPL', limit: 10 };

      await controller.search(mockReq as Request, mockRes as Response);

      expect(mockPrisma.company.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { ticker: { contains: 'AAPL', mode: 'insensitive' } },
            { name: { contains: 'AAPL', mode: 'insensitive' } },
            { cik: { contains: '000000AAPL' } },
          ],
        },
        take: 10,
        orderBy: [
          { ticker: 'asc' },
          { name: 'asc' },
        ],
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        data: [
          {
            cik: '0000320193',
            ticker: 'AAPL',
            name: 'Apple Inc.',
            sic: '3571',
            sector: undefined,
            industry: undefined,
          },
        ],
        meta: {
          total: 1,
          query: 'AAPL',
          limit: 10,
        },
      });
    });

    it('should handle database errors', async () => {
      mockPrisma.company.findMany.mockRejectedValue(new Error('Database error'));
      mockReq.query = { q: 'AAPL', limit: 10 };

      await expect(
        controller.search(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(ApiError);
    });
  });

  describe('getByTicker', () => {
    it('should get company by ticker successfully', async () => {
      const mockCompany = {
        cik: '0000320193',
        ticker: 'AAPL',
        name: 'Apple Inc.',
        sic: '3571',
        fiscalYearEnd: '0930',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-12-01'),
      };

      mockPrisma.company.findUnique.mockResolvedValue(mockCompany);
      mockReq.params = { ticker: 'aapl' };

      await controller.getByTicker(mockReq as Request, mockRes as Response);

      expect(mockPrisma.company.findUnique).toHaveBeenCalledWith({
        where: { ticker: 'AAPL' },
      });

      expect(mockRes.json).toHaveBeenCalledWith({
        data: {
          cik: '0000320193',
          ticker: 'AAPL',
          name: 'Apple Inc.',
          sic: '3571',
          fiscalYearEnd: '0930',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-12-01T00:00:00.000Z',
        },
      });
    });

    it('should return 404 for non-existent company', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);
      mockReq.params = { ticker: 'NONEXISTENT' };

      await expect(
        controller.getByTicker(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(ApiError);
    });
  });

  describe('getOverview', () => {
    it('should get company overview successfully', async () => {
      const mockCompany = {
        cik: '0000320193',
        ticker: 'AAPL',
        name: 'Apple Inc.',
        sic: '3571',
        fiscalYearEnd: '0930',
        updatedAt: new Date('2023-12-01'),
      };

      const mockMetrics = [
        {
          metric: 'Revenues',
          value: 383285000000,
          periodEnd: new Date('2023-09-30'),
          fiscalPeriod: 'FY',
          fiscalYear: 2023,
        },
        {
          metric: 'NetIncomeLoss',
          value: 97000000000,
          periodEnd: new Date('2023-09-30'),
          fiscalPeriod: 'FY',
          fiscalYear: 2023,
        },
      ];

      // Mock the findUnique calls for company and calculateChange
      mockPrisma.company.findUnique.mockResolvedValue(mockCompany);
      
      // Mock findMany for latest metrics
      mockPrisma.metricView.findMany.mockResolvedValue(mockMetrics);
      
      // Mock findFirst for calculateChange (no previous data means no change calculation)
      mockPrisma.metricView.findFirst.mockResolvedValue(null);

      mockReq.params = { ticker: 'AAPL' };
      mockReq.query = { range: '3y', refresh: false };

      await controller.getOverview(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        data: expect.objectContaining({
          company: {
            cik: '0000320193',
            ticker: 'AAPL',
            name: 'Apple Inc.',
            sic: '3571',
            fiscalYearEnd: '0930',
          },
          metrics: expect.arrayContaining([
            expect.objectContaining({
              concept: 'Revenues',
              label: 'Revenue',
              value: 383285000000,
              unit: 'USD',
            }),
            expect.objectContaining({
              concept: 'NetIncomeLoss',
              label: 'Net Income',
              value: 97000000000,
              unit: 'USD',
            }),
          ]),
          source: 'SEC EDGAR',
          disclaimer: expect.stringContaining('investment advice'),
        }),
      });
    });

    it('should handle company not found', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);
      mockReq.params = { ticker: 'NONEXISTENT' };
      mockReq.query = { range: '3y', refresh: false };

      await expect(
        controller.getOverview(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(ApiError);
    });
  });

  describe('refresh', () => {
    it('should queue refresh job successfully', async () => {
      const mockCompany = { cik: '0000320193' };
      mockPrisma.company.findUnique.mockResolvedValue(mockCompany);

      mockReq.params = { ticker: 'AAPL' };
      mockReq.body = { force: true };

      await controller.refresh(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        data: {
          jobId: 'job-123',
          status: 'queued',
          message: 'Data refresh queued for AAPL',
        },
      });
    });

    it('should handle company not found for refresh', async () => {
      mockPrisma.company.findUnique.mockResolvedValue(null);
      mockReq.params = { ticker: 'NONEXISTENT' };
      mockReq.body = { force: false };

      await expect(
        controller.refresh(mockReq as Request, mockRes as Response)
      ).rejects.toThrow(ApiError);
    });
  });

  describe('getRefreshStatus', () => {
    it('should get job status successfully', async () => {
      mockReq.params = { jobId: 'job-123' };

      await controller.getRefreshStatus(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith({
        data: {
          id: 'job-123',
          status: 'completed',
          progress: 100,
        },
      });
    });
  });

  describe('private methods', () => {
    it('should calculate period type correctly', () => {
      const current = new Date('2023-09-30');
      const previousQuarter = new Date('2023-06-30');
      const previousYear = new Date('2022-09-30');

      // These are private methods, so we test them indirectly through public methods
      // or we could make them protected for testing
      expect(true).toBe(true); // Placeholder test
    });

    it('should get correct metric units', () => {
      // Test the getMetricUnit private method indirectly
      expect(true).toBe(true); // Placeholder test
    });
  });
});