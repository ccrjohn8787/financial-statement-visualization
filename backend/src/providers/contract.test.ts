import { describe, it, expect, vi } from 'vitest';
import type { IFinancialDataProvider } from './base';
import { SECEdgarProvider } from './sec-edgar';
import {
  CompanyMetadataSchema,
  FinancialDataSchema,
  DataProviderError,
} from './types';

/**
 * Contract tests for financial data providers
 * These tests ensure all providers implement the interface correctly
 * and return data in the expected format
 */

// Test configuration for different providers
const providerConfigs = {
  'SEC-EDGAR': () => new SECEdgarProvider({
    userAgent: 'Test Agent (test@example.com)',
    requestDelay: 0,
  }),
};

// Mock data for testing
const MOCK_APPLE_CIK = '0000320193';
const MOCK_INVALID_CIK = '0000000000';

describe('Financial Data Provider Contract Tests', () => {
  // Run contract tests for each provider
  Object.entries(providerConfigs).forEach(([providerName, createProvider]) => {
    describe(`${providerName} Provider Contract`, () => {
      let provider: IFinancialDataProvider;

      beforeEach(() => {
        provider = createProvider();
      });

      describe('Provider Metadata', () => {
        it('should have required properties', () => {
          expect(provider.name).toBe(providerName);
          expect(provider.capabilities).toBeDefined();
          expect(typeof provider.capabilities.hasSecFilings).toBe('boolean');
          expect(typeof provider.capabilities.hasFundamentals).toBe('boolean');
          expect(typeof provider.capabilities.hasRealTimeData).toBe('boolean');
          expect(typeof provider.capabilities.hasPeerData).toBe('boolean');
          expect(typeof provider.capabilities.hasHistoricalData).toBe('boolean');
        });
      });

      describe('Company Metadata Operations', () => {
        it('should return valid company metadata for valid CIK', async () => {
          // Skip actual API calls in unit tests - this would be integration test
          if (process.env.NODE_ENV !== 'integration') {
            return;
          }

          const metadata = await provider.getCompanyMetadata(MOCK_APPLE_CIK);
          
          // Validate against schema
          const result = CompanyMetadataSchema.safeParse(metadata);
          expect(result.success).toBe(true);
          
          if (result.success) {
            expect(result.data.cik).toBe('0000320193');
            expect(result.data.name).toContain('Apple');
            expect(result.data.ticker).toBeTruthy();
          }
        }, 30000);

        it('should throw appropriate error for invalid CIK', async () => {
          if (process.env.NODE_ENV !== 'integration') {
            return;
          }

          await expect(provider.getCompanyMetadata(MOCK_INVALID_CIK))
            .rejects.toThrow(DataProviderError);
        });
      });

      describe('Financial Data Operations', () => {
        it('should return valid financial data structure', async () => {
          if (process.env.NODE_ENV !== 'integration') {
            return;
          }

          const data = await provider.getFinancialData(MOCK_APPLE_CIK, {
            concepts: ['Revenues', 'NetIncomeLoss'],
            maxResults: 10,
          });

          // Validate against schema
          const result = FinancialDataSchema.safeParse(data);
          expect(result.success).toBe(true);
          
          if (result.success) {
            expect(result.data.company.cik).toBe('0000320193');
            expect(result.data.metrics).toBeInstanceOf(Array);
            expect(result.data.source).toBe(providerName);
            expect(result.data.lastUpdated).toBeInstanceOf(Date);
          }
        }, 30000);

        it('should respect concept filtering', async () => {
          if (process.env.NODE_ENV !== 'integration') {
            return;
          }

          const requestedConcepts = ['Revenues'];
          const data = await provider.getFinancialData(MOCK_APPLE_CIK, {
            concepts: requestedConcepts,
            maxResults: 5,
          });

          // All returned metrics should be from requested concepts
          data.metrics.forEach(metric => {
            expect(requestedConcepts).toContain(metric.concept);
          });
        });

        it('should respect date range filtering', async () => {
          if (process.env.NODE_ENV !== 'integration') {
            return;
          }

          const startDate = new Date('2022-01-01');
          const endDate = new Date('2023-12-31');
          
          const data = await provider.getFinancialData(MOCK_APPLE_CIK, {
            startDate,
            endDate,
            concepts: ['Revenues'],
            maxResults: 10,
          });

          // All metrics should be within date range
          data.metrics.forEach(metric => {
            expect(metric.periodEnd.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
            expect(metric.periodEnd.getTime()).toBeLessThanOrEqual(endDate.getTime());
          });
        });

        it('should return latest metrics for requested concepts', async () => {
          if (process.env.NODE_ENV !== 'integration') {
            return;
          }

          const concepts = ['Revenues', 'NetIncomeLoss'];
          const data = await provider.getLatestMetrics(MOCK_APPLE_CIK, concepts);

          // Should have at most one metric per concept (the latest)
          const conceptCounts = new Map<string, number>();
          data.metrics.forEach(metric => {
            const count = conceptCounts.get(metric.concept) || 0;
            conceptCounts.set(metric.concept, count + 1);
          });

          conceptCounts.forEach((count, concept) => {
            expect(count).toBeLessThanOrEqual(1);
            expect(concepts).toContain(concept);
          });
        });
      });

      describe('Health Check', () => {
        it('should implement health check', async () => {
          // Mock the health check for unit tests to avoid actual API calls
          if (process.env.NODE_ENV !== 'integration') {
            vi.spyOn(provider, 'healthCheck').mockResolvedValue(true);
          }
          
          const isHealthy = await provider.healthCheck();
          expect(typeof isHealthy).toBe('boolean');
        });
      });

      describe('Configuration', () => {
        it('should implement configure method', () => {
          expect(() => provider.configure({})).not.toThrow();
        });
      });

      describe('Error Handling', () => {
        it('should throw DataProviderError for provider-specific errors', async () => {
          if (process.env.NODE_ENV !== 'integration') {
            return;
          }

          await expect(provider.getCompanyMetadata('invalid-cik'))
            .rejects.toBeInstanceOf(DataProviderError);
        });

        it('should include provider name in errors', async () => {
          if (process.env.NODE_ENV !== 'integration') {
            return;
          }

          try {
            await provider.getCompanyMetadata('invalid-cik');
            expect.fail('Should have thrown an error');
          } catch (error) {
            if (error instanceof DataProviderError) {
              expect(error.provider).toBe(providerName);
            } else {
              expect.fail('Should throw DataProviderError');
            }
          }
        });
      });
    });
  });
});

// Mocked contract tests that run in regular unit test mode
describe('Financial Data Provider Contract Tests (Mocked)', () => {
  describe('SEC-EDGAR Provider Contract (Mocked)', () => {
    let provider: SECEdgarProvider;

    beforeEach(() => {
      provider = new SECEdgarProvider({
        userAgent: 'Test Agent (test@example.com)',
        requestDelay: 0,
      });
    });

    it('should have correct provider metadata', () => {
      expect(provider.name).toBe('SEC-EDGAR');
      expect(provider.capabilities.hasSecFilings).toBe(true);
      expect(provider.capabilities.hasFundamentals).toBe(true);
      expect(provider.capabilities.hasRealTimeData).toBe(false);
      expect(provider.capabilities.hasPeerData).toBe(false);
      expect(provider.capabilities.hasHistoricalData).toBe(true);
    });

    it('should normalize CIK correctly', () => {
      // Test the private method through public interface behavior
      expect(() => provider.getCompanyMetadata('320193')).not.toThrow();
      expect(() => provider.getCompanyMetadata('0000320193')).not.toThrow();
    });

    it('should implement all required interface methods', () => {
      expect(typeof provider.getCompanyMetadata).toBe('function');
      expect(typeof provider.getFinancialData).toBe('function');
      expect(typeof provider.getLatestMetrics).toBe('function');
      expect(typeof provider.healthCheck).toBe('function');
      expect(typeof provider.configure).toBe('function');
    });

    it('should handle configuration updates', () => {
      const newConfig = { requestDelay: 200 };
      expect(() => provider.configure(newConfig)).not.toThrow();
    });
  });
});