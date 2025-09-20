// MCP Performance & Quality Tests - Sprint 6 Testing Suite
// Comprehensive testing for MCP request batching, caching, and monitoring

import { describe, test, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { RequestBatcher } from '../services/mcp/RequestBatcher';
import { MCPCacheManager } from '../services/mcp/MCPCacheManager';
import { MCPMonitor } from '../services/monitoring/MCPMonitor';
import { DataType } from '../services/mcp/types';

describe('MCP Performance Testing Suite', () => {
  let requestBatcher: RequestBatcher;
  let cacheManager: MCPCacheManager;
  let monitor: MCPMonitor;

  beforeAll(() => {
    requestBatcher = new RequestBatcher();
    cacheManager = new MCPCacheManager();
    monitor = new MCPMonitor();
  });

  afterAll(() => {
    requestBatcher.shutdown();
    cacheManager.shutdown();
    monitor.shutdown();
  });

  describe('Request Batching', () => {
    test('should batch multiple requests efficiently', async () => {
      const mockExecuteFunction = vi.fn().mockResolvedValue([
        { data: 'result1' },
        { data: 'result2' },
        { data: 'result3' }
      ]);

      // Execute multiple requests that should be batched
      const promises = [
        requestBatcher.batchRequest('finance-tools', 'getEarningsHistory', { ticker: 'AAPL' }, mockExecuteFunction),
        requestBatcher.batchRequest('finance-tools', 'getEarningsHistory', { ticker: 'NVDA' }, mockExecuteFunction),
        requestBatcher.batchRequest('finance-tools', 'getEarningsHistory', { ticker: 'UBER' }, mockExecuteFunction)
      ];

      const results = await Promise.all(promises);

      // Should have executed as a batch
      expect(mockExecuteFunction).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({ data: 'result1' });
    }, 10000);

    test('should respect rate limits for Polygon.io', async () => {
      const startTime = Date.now();
      const mockExecuteFunction = vi.fn().mockImplementation(async (requests) => {
        // Simulate Polygon.io rate limiting
        return requests.map((_, index) => ({ data: `polygon_result_${index}` }));
      });

      // Execute requests that should be rate limited
      const promises = [
        requestBatcher.batchRequest('polygon', 'getHistoricalPrices', { ticker: 'AAPL' }, mockExecuteFunction),
        requestBatcher.batchRequest('polygon', 'getHistoricalPrices', { ticker: 'NVDA' }, mockExecuteFunction)
      ];

      await Promise.all(promises);
      const duration = Date.now() - startTime;

      // Should have taken time due to rate limiting
      expect(duration).toBeGreaterThan(1000); // At least 1 second
    }, 15000);

    test('should provide accurate batching statistics', () => {
      const stats = requestBatcher.getStats();

      expect(stats).toHaveProperty('pendingBatches');
      expect(stats).toHaveProperty('activeBatchTimers');
      expect(stats).toHaveProperty('batchConfigs');
      expect(Array.isArray(stats.pendingBatches)).toBe(true);
      expect(Array.isArray(stats.activeBatchTimers)).toBe(true);
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      cacheManager.clear();
    });

    test('should cache and retrieve data correctly', async () => {
      const testData = { ticker: 'AAPL', revenue: 365000000 };
      const dataType: DataType = 'financialMetrics';

      // Cache data
      await cacheManager.set(dataType, 'finance-tools', { ticker: 'AAPL' }, testData);

      // Retrieve cached data
      const retrieved = await cacheManager.get(dataType, 'finance-tools', { ticker: 'AAPL' });

      expect(retrieved).toEqual(testData);
    });

    test('should respect TTL and expire cached data', async () => {
      const testData = { ticker: 'AAPL', price: 150 };
      const dataType: DataType = 'newsData'; // Has short TTL (15 minutes)

      // Cache data
      await cacheManager.set(dataType, 'finance-tools', { ticker: 'AAPL' }, testData);

      // Should be available immediately
      let retrieved = await cacheManager.get(dataType, 'finance-tools', { ticker: 'AAPL' });
      expect(retrieved).toEqual(testData);

      // Mock time passage to exceed TTL
      const originalDate = Date.now;
      Date.now = vi.fn(() => originalDate() + 20 * 60 * 1000); // 20 minutes later

      // Should be expired
      retrieved = await cacheManager.get(dataType, 'finance-tools', { ticker: 'AAPL' });
      expect(retrieved).toBeNull();

      // Restore original Date.now
      Date.now = originalDate;
    });

    test('should generate deterministic cache keys', () => {
      const key1 = cacheManager.generateCacheKey('financialMetrics', 'finance-tools', { ticker: 'AAPL', period: 'quarterly' });
      const key2 = cacheManager.generateCacheKey('financialMetrics', 'finance-tools', { period: 'quarterly', ticker: 'AAPL' });

      // Should be the same regardless of parameter order
      expect(key1).toBe(key2);
    });

    test('should invalidate cache by data type', async () => {
      // Cache multiple entries
      await cacheManager.set('financialMetrics', 'finance-tools', { ticker: 'AAPL' }, { data: 'aapl' });
      await cacheManager.set('financialMetrics', 'finance-tools', { ticker: 'NVDA' }, { data: 'nvda' });
      await cacheManager.set('newsData', 'finance-tools', { ticker: 'AAPL' }, { data: 'news' });

      // Invalidate only financial metrics
      cacheManager.invalidateByDataType('financialMetrics');

      // Financial metrics should be gone
      const aapl = await cacheManager.get('financialMetrics', 'finance-tools', { ticker: 'AAPL' });
      const nvda = await cacheManager.get('financialMetrics', 'finance-tools', { ticker: 'NVDA' });
      expect(aapl).toBeNull();
      expect(nvda).toBeNull();

      // News data should still be there
      const news = await cacheManager.get('newsData', 'finance-tools', { ticker: 'AAPL' });
      expect(news).toEqual({ data: 'news' });
    });

    test('should provide accurate cache statistics', async () => {
      // Add some test data
      await cacheManager.set('financialMetrics', 'finance-tools', { ticker: 'AAPL' }, { data: 'test' });
      await cacheManager.set('newsData', 'yfinance', { ticker: 'NVDA' }, { data: 'test2' });

      // Get some data to generate hits
      await cacheManager.get('financialMetrics', 'finance-tools', { ticker: 'AAPL' });
      await cacheManager.get('financialMetrics', 'finance-tools', { ticker: 'AAPL' }); // Second hit

      const stats = cacheManager.getStats();

      expect(stats.cacheSize).toBe(2);
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(Array.isArray(stats.topDataTypes)).toBe(true);
      expect(Array.isArray(stats.topSources)).toBe(true);
    });

    test('should handle cache warming', async () => {
      const paramsList = [
        { ticker: 'AAPL' },
        { ticker: 'NVDA' },
        { ticker: 'UBER' }
      ];

      await cacheManager.warmCache('financialMetrics', 'finance-tools', paramsList);

      // All entries should be cached
      for (const params of paramsList) {
        const cached = await cacheManager.get('financialMetrics', 'finance-tools', params);
        expect(cached).toBeTruthy();
        expect(cached.warmed).toBe(true);
      }
    });
  });

  describe('Performance Monitoring', () => {
    test('should record and track performance metrics', () => {
      // Create fresh monitor for this test
      const testMonitor = new MCPMonitor();

      // Record some requests
      testMonitor.recordRequest('finance-tools', 'financialMetrics', 500, true);
      testMonitor.recordRequest('finance-tools', 'financialMetrics', 1200, true);
      testMonitor.recordRequest('polygon', 'historicalPrices', 800, false, 'Rate limit exceeded');
      testMonitor.recordRequest('yfinance', 'newsData', 300, true);

      const metrics = testMonitor.getMetrics();

      expect(metrics.requests.total).toBe(4);
      expect(metrics.requests.successful).toBe(3);
      expect(metrics.requests.failed).toBe(1);
      expect(metrics.requests.avgLatency).toBeGreaterThan(0);

      testMonitor.shutdown();
    });

    test('should generate health status correctly', () => {
      // Create fresh monitor for this test
      const testMonitor = new MCPMonitor();

      // Record successful requests
      for (let i = 0; i < 100; i++) {
        testMonitor.recordRequest('finance-tools', 'financialMetrics', 500, true);
      }

      const health = testMonitor.getHealthStatus();

      expect(health.status).toBe('healthy');
      expect(health.summary).toContain('operational');
      expect(Array.isArray(health.checks)).toBe(true);
      expect(health.checks.length).toBeGreaterThan(0);

      testMonitor.shutdown();
    });

    test('should detect degraded performance', () => {
      // Create fresh monitor for this test
      const testMonitor = new MCPMonitor();

      // Record some failed requests
      for (let i = 0; i < 50; i++) {
        testMonitor.recordRequest('finance-tools', 'financialMetrics', 500, true);
      }
      for (let i = 0; i < 10; i++) {
        testMonitor.recordRequest('finance-tools', 'financialMetrics', 1000, false, 'Network error');
      }

      const health = testMonitor.getHealthStatus();

      // Should detect issues
      expect(['degraded', 'unhealthy']).toContain(health.status);

      testMonitor.shutdown();
    });

    test('should generate performance trends', () => {
      // Record requests over time
      const now = Date.now();
      for (let i = 0; i < 10; i++) {
        // Mock timestamp to be spread over last hour
        const originalRecordRequest = monitor.recordRequest;
        monitor.recordRequest = function(source, dataType, latency, success, error) {
          const entry = {
            timestamp: now - (i * 6 * 60 * 1000), // Spread over 1 hour
            source,
            dataType,
            latency,
            success,
            error
          };
          // @ts-ignore - Access private property for testing
          this.performanceHistory.push(entry);
        };

        monitor.recordRequest('finance-tools', 'financialMetrics', 500 + i * 100, true);
      }

      const trends = monitor.getPerformanceTrends(1); // 1 hour

      expect(trends.timeline).toBeDefined();
      expect(Array.isArray(trends.timeline)).toBe(true);
      expect(Array.isArray(trends.insights)).toBe(true);
    });

    test('should detect and alert on high latency', () => {
      // Create fresh monitor for this test
      const testMonitor = new MCPMonitor();

      // Record a high latency request (above 5 second threshold)
      testMonitor.recordRequest('polygon', 'historicalPrices', 6000, true);

      const metrics = testMonitor.getMetrics();

      // Should have generated an alert
      expect(metrics.alerts.length).toBeGreaterThan(0);
      const latencyAlert = metrics.alerts.find(alert => alert.metric === 'latency');
      expect(latencyAlert).toBeDefined();
      expect(latencyAlert?.severity).toBe('medium');

      testMonitor.shutdown();
    });

    test('should detect and alert on request failures', () => {
      // Create fresh monitor for this test
      const testMonitor = new MCPMonitor();

      testMonitor.recordRequest('finance-tools', 'earningsHistory', 1000, false, 'API key invalid');

      const metrics = testMonitor.getMetrics();

      // Should have generated a failure alert
      const failureAlert = metrics.alerts.find(alert => alert.metric === 'request_failure');
      expect(failureAlert).toBeDefined();
      expect(failureAlert?.severity).toBe('high');

      testMonitor.shutdown();
    });
  });

  describe('Integration Testing', () => {
    test('should work together: batching + caching + monitoring', async () => {
      const startTime = Date.now();

      // Mock execute function that simulates MCP call
      const mockExecuteFunction = vi.fn().mockImplementation(async (requests) => {
        const latency = 800;
        return requests.map((req, index) => ({
          ticker: req.params.ticker,
          data: `mocked_data_${index}`,
          timestamp: new Date().toISOString()
        }));
      });

      // Batch request for multiple tickers
      const tickers = ['AAPL', 'NVDA', 'UBER'];
      const promises = tickers.map(ticker =>
        requestBatcher.batchRequest(
          'finance-tools',
          'getEarningsHistory',
          { ticker },
          mockExecuteFunction
        )
      );

      const results = await Promise.all(promises);

      // Verify batching worked
      expect(mockExecuteFunction).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(3);

      // Cache the results
      for (let i = 0; i < results.length; i++) {
        await cacheManager.set(
          'earningsHistory',
          'finance-tools',
          { ticker: tickers[i] },
          results[i]
        );

        // Record monitoring data
        monitor.recordRequest('finance-tools', 'earningsHistory', 800, true);
      }

      // Verify caching
      const cachedResult = await cacheManager.get('earningsHistory', 'finance-tools', { ticker: 'AAPL' });
      expect(cachedResult).toEqual(results[0]);

      // Verify monitoring
      const metrics = monitor.getMetrics();
      expect(metrics.requests.total).toBeGreaterThan(0);
      expect(metrics.requests.successful).toBeGreaterThan(0);

      const duration = Date.now() - startTime;
      console.log(`✅ Integration test completed in ${duration}ms`);
    }, 15000);

    test('should handle failures gracefully across all systems', async () => {
      // Mock execute function that fails
      const mockFailingFunction = vi.fn().mockRejectedValue(new Error('Network timeout'));

      try {
        await requestBatcher.batchRequest(
          'polygon',
          'getHistoricalPrices',
          { ticker: 'INVALID' },
          mockFailingFunction
        );
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }

      // Record the failure in monitoring
      monitor.recordRequest('polygon', 'historicalPrices', 0, false, 'Network timeout');

      // Verify monitoring captured the failure
      const metrics = monitor.getMetrics();
      expect(metrics.requests.failed).toBeGreaterThan(0);

      // Verify cache didn't store invalid data
      const cached = await cacheManager.get('historicalPrices', 'polygon', { ticker: 'INVALID' });
      expect(cached).toBeNull();
    });
  });

  describe('Load Testing', () => {
    test('should handle high concurrent request volume', async () => {
      const concurrentRequests = 50;
      const startTime = Date.now();

      const mockExecuteFunction = vi.fn().mockImplementation(async (requests) => {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        return requests.map((req, index) => ({ data: `load_test_${index}` }));
      });

      // Create many concurrent requests
      const promises = [];
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          requestBatcher.batchRequest(
            'finance-tools',
            'getFinancialMetrics',
            { ticker: `STOCK${i}` },
            mockExecuteFunction
          )
        );
      }

      const results = await Promise.allSettled(promises);
      const duration = Date.now() - startTime;

      // Verify all requests completed
      const successful = results.filter(r => r.status === 'fulfilled').length;
      expect(successful).toBe(concurrentRequests);

      // Should have been batched efficiently
      expect(mockExecuteFunction.mock.calls.length).toBeLessThan(concurrentRequests);

      console.log(`✅ Load test: ${concurrentRequests} requests completed in ${duration}ms`);
    }, 30000);

    test('should maintain cache performance under load', async () => {
      const cacheOperations = 1000;
      const startTime = Date.now();

      // Perform many cache operations
      for (let i = 0; i < cacheOperations; i++) {
        await cacheManager.set(
          'financialMetrics',
          'finance-tools',
          { ticker: `STOCK${i % 100}` }, // Use 100 different tickers
          { data: `cache_test_${i}`, value: Math.random() }
        );

        // Retrieve every 3rd item
        if (i % 3 === 0) {
          await cacheManager.get('financialMetrics', 'finance-tools', { ticker: `STOCK${i % 100}` });
        }
      }

      const duration = Date.now() - startTime;
      const stats = cacheManager.getStats();

      // Verify performance
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.cacheSize).toBeGreaterThan(0);

      console.log(`✅ Cache load test: ${cacheOperations} operations in ${duration}ms, hit rate: ${stats.hitRate}%`);
    });
  });
});