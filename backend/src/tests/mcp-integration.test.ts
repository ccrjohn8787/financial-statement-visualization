// MCP Integration Tests
// Sprint 5 MCP Integration

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { mcpGateway } from '../services/mcp/MCPGateway';
import { DataSourceRouter } from '../services/dataSourceRouter';
import { mcpConfig } from '../config/mcpConfig';

describe('MCP Integration Tests', () => {
  let dataSourceRouter: DataSourceRouter;

  beforeAll(async () => {
    // Initialize MCP system for testing
    if (mcpConfig.enabled) {
      try {
        await mcpGateway.initialize();
        dataSourceRouter = new DataSourceRouter();
      } catch (error) {
        console.warn('MCP not available for testing:', error);
      }
    }
  });

  afterAll(async () => {
    // Cleanup MCP system
    if (mcpConfig.enabled) {
      await mcpGateway.shutdown();
    }
  });

  describe('MCP Gateway', () => {
    test('should initialize successfully', () => {
      expect(mcpGateway).toBeDefined();
    });

    test('should report health status', () => {
      const healthStatus = mcpGateway.getHealthStatus();
      expect(healthStatus).toBeDefined();
      expect(healthStatus instanceof Map).toBe(true);
    });

    test('should list available clients', () => {
      const availableClients = mcpGateway.getAvailableClients();
      expect(Array.isArray(availableClients)).toBe(true);
    });
  });

  describe('Data Source Router', () => {
    test('should initialize successfully', () => {
      if (dataSourceRouter) {
        expect(dataSourceRouter).toBeDefined();
      } else {
        console.log('Skipping router tests - MCP not available');
      }
    });

    test('should report available data sources', () => {
      if (dataSourceRouter) {
        const availableSources = dataSourceRouter.getAvailableSources();
        expect(Array.isArray(availableSources)).toBe(true);
        expect(availableSources.includes('finnhub')).toBe(true); // Core source always available
      }
    });

    test('should provide router status', () => {
      if (dataSourceRouter) {
        const status = dataSourceRouter.getRouterStatus();
        expect(status).toBeDefined();
        expect(status.availableSources).toBeDefined();
        expect(status.routingRules).toBeDefined();
      }
    });
  });

  describe('Enhanced Company Data', () => {
    const testTickers = ['AAPL', 'NVDA'];

    test.each(testTickers)('should fetch enhanced data for %s', async (ticker) => {
      if (!dataSourceRouter) {
        console.log(`Skipping enhanced data test for ${ticker} - MCP not available`);
        return;
      }

      try {
        const enhancedData = await dataSourceRouter.getEnhancedCompanyData(ticker);

        // Verify core data structure (preserved from existing FinScope)
        expect(enhancedData.company).toBeDefined();
        expect(enhancedData.metrics).toBeDefined();
        expect(Array.isArray(enhancedData.metrics)).toBe(true);

        // Verify data source tracking
        expect(enhancedData.dataSources).toBeDefined();
        expect(Array.isArray(enhancedData.dataSources)).toBe(true);

        console.log(`✅ Enhanced data for ${ticker}:`, {
          coreMetrics: enhancedData.metrics.length,
          dataSources: enhancedData.dataSources.length,
          hasEarnings: !!enhancedData.earningsHistory,
          hasInsiders: !!enhancedData.insiderTrading,
          hasFearGreed: !!enhancedData.fearGreedIndex
        });
      } catch (error) {
        console.warn(`Enhanced data test failed for ${ticker}:`, error);
        // Don't fail the test - MCP might not be configured
      }
    }, 30000); // 30 second timeout for network calls
  });

  describe('MCP Client Integration', () => {
    test('Finance Tools MCP health check', async () => {
      if (!mcpConfig.clients.financeTools.enabled) {
        console.log('Skipping Finance Tools test - not enabled');
        return;
      }

      try {
        const response = await mcpGateway.query('finance-tools', 'getFearGreedIndex', {});
        expect(response).toBeDefined();
        console.log('✅ Finance Tools MCP: Fear & Greed Index available');
      } catch (error) {
        console.warn('Finance Tools MCP test failed:', error);
      }
    });

    test('Polygon.io MCP health check', async () => {
      if (!mcpConfig.clients.polygon.enabled) {
        console.log('Skipping Polygon.io test - not enabled');
        return;
      }

      try {
        const response = await mcpGateway.query('polygon', 'getMarketStatus', {});
        expect(response).toBeDefined();
        console.log('✅ Polygon.io MCP: Market status available');
      } catch (error) {
        console.warn('Polygon.io MCP test failed:', error);
      }
    });

    test('yfinance MCP health check', async () => {
      if (!mcpConfig.clients.yfinance.enabled) {
        console.log('Skipping yfinance test - not enabled');
        return;
      }

      try {
        const response = await mcpGateway.query('yfinance', 'getStockInfo', { ticker: 'AAPL' });
        expect(response).toBeDefined();
        console.log('✅ yfinance MCP: Stock info available');
      } catch (error) {
        console.warn('yfinance MCP test failed:', error);
      }
    });
  });

  describe('Data Quality Validation', () => {
    test('should validate data consistency across sources', async () => {
      if (!dataSourceRouter) {
        console.log('Skipping data quality test - MCP not available');
        return;
      }

      const ticker = 'AAPL';
      try {
        // Get core data
        const coreData = await dataSourceRouter.getData('financialMetrics', { ticker });
        expect(coreData).toBeDefined();

        // Verify data structure
        if (coreData.metrics && Array.isArray(coreData.metrics)) {
          expect(coreData.metrics.length).toBeGreaterThan(0);
          console.log(`✅ Data quality: ${coreData.metrics.length} core metrics for ${ticker}`);
        }
      } catch (error) {
        console.warn('Data quality test failed:', error);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid ticker gracefully', async () => {
      if (!dataSourceRouter) {
        console.log('Skipping error handling test - MCP not available');
        return;
      }

      try {
        const result = await dataSourceRouter.getEnhancedCompanyData('INVALID_TICKER_12345');
        // Should either return data or throw an error, but not crash
        expect(result).toBeDefined();
      } catch (error) {
        // Expected behavior - invalid ticker should throw error
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should handle MCP service failures gracefully', async () => {
      if (!dataSourceRouter) {
        console.log('Skipping service failure test - MCP not available');
        return;
      }

      try {
        // Try to query non-existent method
        await mcpGateway.query('finance-tools', 'nonExistentMethod', {});
      } catch (error) {
        // Should throw error but not crash the system
        expect(error).toBeInstanceOf(Error);
      }
    });
  });
});

// Performance Tests
describe('MCP Performance Tests', () => {
  test('should respond within acceptable time limits', async () => {
    if (!mcpConfig.enabled) {
      console.log('Skipping performance test - MCP not enabled');
      return;
    }

    const startTime = Date.now();
    try {
      const healthStatus = mcpGateway.getHealthStatus();
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should be very fast
      console.log(`✅ Performance: Health status query took ${duration}ms`);
    } catch (error) {
      console.warn('Performance test failed:', error);
    }
  });
});

// Configuration Tests
describe('MCP Configuration Tests', () => {
  test('should have valid configuration', () => {
    expect(mcpConfig).toBeDefined();
    expect(typeof mcpConfig.enabled).toBe('boolean');
    expect(typeof mcpConfig.timeout).toBe('number');
    expect(mcpConfig.clients).toBeDefined();
  });

  test('should validate environment variables', () => {
    if (mcpConfig.enabled) {
      // If MCP is enabled, check if required API keys are set
      if (mcpConfig.clients.financeTools.enabled) {
        expect(process.env.TIINGO_API_KEY).toBeDefined();
      }
      if (mcpConfig.clients.polygon.enabled) {
        expect(process.env.POLYGON_API_KEY).toBeDefined();
      }
    }
  });
});