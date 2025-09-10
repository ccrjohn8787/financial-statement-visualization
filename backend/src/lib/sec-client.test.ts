import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SECClient, SECAPIError } from './sec-client';
import { request } from 'undici';

// Mock p-retry to avoid actual retries in tests
vi.mock('p-retry', () => ({
  default: vi.fn((fn) => fn()),
}));

// Mock undici
vi.mock('undici', () => ({
  request: vi.fn(),
}));

const mockRequest = vi.mocked(request);

describe('SECClient', () => {
  let client: SECClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new SECClient('Test Agent (test@example.com)', 0); // No delay for tests
  });

  describe('constructor', () => {
    it('should use provided user agent', () => {
      const customClient = new SECClient('Custom Agent (custom@example.com)');
      expect(customClient).toBeInstanceOf(SECClient);
    });

    it('should use environment user agent as fallback', () => {
      process.env.SEC_USER_AGENT = 'Env Agent (env@example.com)';
      const envClient = new SECClient();
      expect(envClient).toBeInstanceOf(SECClient);
      delete process.env.SEC_USER_AGENT;
    });
  });

  describe('getCompanyFacts', () => {
    const mockCompanyFacts = {
      cik: '0000320193',
      entityName: 'Apple Inc.',
      facts: {
        'us-gaap': {
          'Revenues': {
            label: 'Revenues',
            description: 'Revenue from contracts with customers',
            units: {
              'USD': {
                label: 'US Dollars',
                val: [
                  {
                    end: '2023-09-30',
                    val: 383285000000,
                    accn: '0000320193-23-000106',
                    fy: 2023,
                    fp: 'FY',
                    form: '10-K',
                    filed: '2023-11-03',
                  },
                ],
              },
            },
          },
        },
      },
    };

    it('should successfully fetch company facts', async () => {
      mockRequest.mockResolvedValue({
        statusCode: 200,
        body: {
          json: vi.fn().mockResolvedValue(mockCompanyFacts),
        },
      } as any);

      const result = await client.getCompanyFacts('320193');

      expect(mockRequest).toHaveBeenCalledWith(
        'https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'User-Agent': 'Test Agent (test@example.com)',
            'Accept': 'application/json',
          }),
        })
      );

      expect(result).toEqual(mockCompanyFacts);
    });

    it('should normalize CIK with leading zeros', async () => {
      mockRequest.mockResolvedValue({
        statusCode: 200,
        body: {
          json: vi.fn().mockResolvedValue(mockCompanyFacts),
        },
      } as any);

      await client.getCompanyFacts('320193');

      expect(mockRequest).toHaveBeenCalledWith(
        'https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json',
        expect.any(Object)
      );
    });

    it('should handle rate limit errors', async () => {
      mockRequest.mockResolvedValue({
        statusCode: 429,
      } as any);

      await expect(client.getCompanyFacts('320193')).rejects.toThrow(
        new SECAPIError('Rate limit exceeded', 429, true)
      );
    });

    it('should handle 404 errors', async () => {
      mockRequest.mockResolvedValue({
        statusCode: 404,
      } as any);

      await expect(client.getCompanyFacts('invalid')).rejects.toThrow(
        SECAPIError
      );
    });

    it('should handle network errors', async () => {
      mockRequest.mockRejectedValue(new Error('Network error'));

      await expect(client.getCompanyFacts('320193')).rejects.toThrow(
        SECAPIError
      );
    });

    it('should validate response schema', async () => {
      const invalidResponse = {
        // Missing required fields
        invalidField: 'invalid',
      };

      mockRequest.mockResolvedValue({
        statusCode: 200,
        body: {
          json: vi.fn().mockResolvedValue(invalidResponse),
        },
      } as any);

      await expect(client.getCompanyFacts('320193')).rejects.toThrow();
    });
  });

  describe('validateCIK', () => {
    it('should return true for valid CIK', async () => {
      mockRequest.mockResolvedValue({
        statusCode: 200,
        body: {
          json: vi.fn().mockResolvedValue({
            cik: '0000320193',
            entityName: 'Apple Inc.',
            facts: {},
          }),
        },
      } as any);

      const result = await client.validateCIK('320193');
      expect(result).toBe(true);
    });

    it('should return false for invalid CIK (404)', async () => {
      mockRequest.mockResolvedValue({
        statusCode: 404,
      } as any);

      const result = await client.validateCIK('invalid');
      expect(result).toBe(false);
    });

    it('should rethrow non-404 errors', async () => {
      mockRequest.mockResolvedValue({
        statusCode: 500,
      } as any);

      await expect(client.validateCIK('320193')).rejects.toThrow(
        SECAPIError
      );
    });
  });

  describe('getPrimaryTicker', () => {
    it('should extract ticker from DEI facts', () => {
      const companyFacts = {
        cik: '0000320193',
        entityName: 'Apple Inc.',
        facts: {
          dei: {
            TradingSymbol: {
              units: {
                pure: {
                  val: [
                    {
                      end: '2023-09-30',
                      val: 'AAPL',
                      accn: '0000320193-23-000106',
                      fy: 2023,
                      fp: 'FY',
                      form: '10-K',
                      filed: '2023-11-03',
                    },
                  ],
                },
              },
            },
          },
        },
      };

      const ticker = client.getPrimaryTicker(companyFacts);
      expect(ticker).toBe('AAPL');
    });

    it('should return null when no ticker is found', () => {
      const companyFacts = {
        cik: '0000320193',
        entityName: 'Apple Inc.',
        facts: {},
      };

      const ticker = client.getPrimaryTicker(companyFacts);
      expect(ticker).toBeNull();
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limiting between requests', async () => {
      const clientWithDelay = new SECClient('Test Agent (test@example.com)', 100);
      
      mockRequest.mockResolvedValue({
        statusCode: 200,
        body: {
          json: vi.fn().mockResolvedValue({
            cik: '0000320193',
            entityName: 'Apple Inc.',
            facts: {},
          }),
        },
      } as any);

      const start = Date.now();
      
      await clientWithDelay.getCompanyFacts('320193');
      await clientWithDelay.getCompanyFacts('789019'); // Microsoft
      
      const elapsed = Date.now() - start;
      
      // Should take at least 100ms due to rate limiting
      expect(elapsed).toBeGreaterThanOrEqual(90); // Some tolerance for test timing
    });
  });
});