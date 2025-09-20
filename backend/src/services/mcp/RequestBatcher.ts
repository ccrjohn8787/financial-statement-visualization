// MCP Request Batcher - Performance Optimization for Sprint 6
// Batches multiple MCP requests to reduce API calls and improve performance

interface BatchRequest {
  id: string;
  source: string;
  method: string;
  params: any;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  timestamp: number;
}

interface BatchConfig {
  maxBatchSize: number;
  maxWaitTime: number; // milliseconds
  enabled: boolean;
}

export class RequestBatcher {
  private pendingRequests: Map<string, BatchRequest[]> = new Map();
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private batchConfigs: Map<string, BatchConfig> = new Map();

  constructor() {
    this.initializeBatchConfigs();
  }

  private initializeBatchConfigs(): void {
    // Finance Tools - Can batch earnings, insider trading queries for multiple tickers
    this.batchConfigs.set('finance-tools', {
      maxBatchSize: 5,
      maxWaitTime: 2000, // 2 seconds
      enabled: true
    });

    // Polygon.io - Limited to 5 calls/minute, so batch carefully
    this.batchConfigs.set('polygon', {
      maxBatchSize: 3,
      maxWaitTime: 5000, // 5 seconds to accumulate requests
      enabled: true
    });

    // yfinance - Can handle batch requests well
    this.batchConfigs.set('yfinance', {
      maxBatchSize: 10,
      maxWaitTime: 1500, // 1.5 seconds
      enabled: true
    });
  }

  async batchRequest(
    source: string,
    method: string,
    params: any,
    executeFunction: (requests: BatchRequest[]) => Promise<any[]>
  ): Promise<any> {
    const config = this.batchConfigs.get(source);

    // If batching is disabled for this source, execute immediately
    if (!config || !config.enabled) {
      return executeFunction([{
        id: this.generateRequestId(),
        source,
        method,
        params,
        resolve: () => {},
        reject: () => {},
        timestamp: Date.now()
      }])[0];
    }

    return new Promise((resolve, reject) => {
      const request: BatchRequest = {
        id: this.generateRequestId(),
        source,
        method,
        params,
        resolve,
        reject,
        timestamp: Date.now()
      };

      const batchKey = `${source}:${method}`;

      if (!this.pendingRequests.has(batchKey)) {
        this.pendingRequests.set(batchKey, []);
      }

      const batch = this.pendingRequests.get(batchKey)!;
      batch.push(request);

      console.log(`📦 Added request to batch ${batchKey}: ${batch.length}/${config.maxBatchSize}`);

      // Execute batch if it's full
      if (batch.length >= config.maxBatchSize) {
        this.executeBatch(batchKey, executeFunction);
      } else {
        // Set timer to execute batch after maxWaitTime
        if (!this.batchTimers.has(batchKey)) {
          const timer = setTimeout(() => {
            this.executeBatch(batchKey, executeFunction);
          }, config.maxWaitTime);

          this.batchTimers.set(batchKey, timer);
        }
      }
    });
  }

  private async executeBatch(
    batchKey: string,
    executeFunction: (requests: BatchRequest[]) => Promise<any[]>
  ): Promise<void> {
    const batch = this.pendingRequests.get(batchKey);
    if (!batch || batch.length === 0) return;

    // Clear timer and pending requests
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(batchKey);
    }
    this.pendingRequests.delete(batchKey);

    console.log(`🚀 Executing batch ${batchKey} with ${batch.length} requests`);

    try {
      const startTime = Date.now();
      const results = await executeFunction(batch);
      const executionTime = Date.now() - startTime;

      console.log(`✅ Batch ${batchKey} completed in ${executionTime}ms`);

      // Resolve individual requests with their results
      batch.forEach((request, index) => {
        if (results[index] !== undefined) {
          request.resolve(results[index]);
        } else {
          request.reject(new Error(`No result for request ${request.id}`));
        }
      });

    } catch (error) {
      console.error(`❌ Batch ${batchKey} failed:`, error);

      // Reject all requests in the batch
      batch.forEach(request => {
        request.reject(error);
      });
    }
  }

  // Batch execution strategies for different MCP clients
  async executeBatchFinanceTools(requests: BatchRequest[]): Promise<any[]> {
    const results: any[] = [];

    // Group by method for more efficient batching
    const methodGroups = new Map<string, BatchRequest[]>();

    requests.forEach(request => {
      if (!methodGroups.has(request.method)) {
        methodGroups.set(request.method, []);
      }
      methodGroups.get(request.method)!.push(request);
    });

    // Execute each method group
    for (const [method, methodRequests] of methodGroups) {
      switch (method) {
        case 'getEarningsHistory':
          // Batch multiple ticker earnings requests
          const tickers = methodRequests.map(r => r.params.ticker);
          console.log(`📈 Batching earnings history for: ${tickers.join(', ')}`);

          // Execute individual requests (Finance Tools doesn't support bulk requests)
          for (const request of methodRequests) {
            try {
              // This would call the actual Finance Tools MCP method
              const result = await this.simulateFinanceToolsCall(method, request.params);
              results.push(result);
            } catch (error) {
              results.push({ error: error.message });
            }
          }
          break;

        case 'getInsiderTrading':
          // Similar batching for insider trading
          for (const request of methodRequests) {
            try {
              const result = await this.simulateFinanceToolsCall(method, request.params);
              results.push(result);
            } catch (error) {
              results.push({ error: error.message });
            }
          }
          break;

        default:
          // Execute other methods individually
          for (const request of methodRequests) {
            try {
              const result = await this.simulateFinanceToolsCall(method, request.params);
              results.push(result);
            } catch (error) {
              results.push({ error: error.message });
            }
          }
      }
    }

    return results;
  }

  async executeBatchPolygon(requests: BatchRequest[]): Promise<any[]> {
    // Polygon.io has strict rate limiting, so execute with delays
    const results: any[] = [];
    const RATE_LIMIT_DELAY = 12000; // 12 seconds between requests

    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];

      try {
        if (i > 0) {
          console.log(`⏳ Polygon.io rate limit: waiting ${RATE_LIMIT_DELAY}ms`);
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
        }

        const result = await this.simulatePolygonCall(request.method, request.params);
        results.push(result);
      } catch (error) {
        results.push({ error: error.message });
      }
    }

    return results;
  }

  async executeBatchYFinance(requests: BatchRequest[]): Promise<any[]> {
    // yfinance can handle multiple requests efficiently
    const results: any[] = [];

    // Execute requests in parallel (yfinance is more tolerant)
    const promises = requests.map(async (request) => {
      try {
        return await this.simulateYFinanceCall(request.method, request.params);
      } catch (error) {
        return { error: error.message };
      }
    });

    return Promise.all(promises);
  }

  // Simulation methods (to be replaced with actual MCP calls)
  private async simulateFinanceToolsCall(method: string, params: any): Promise<any> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
      method,
      params,
      data: `Mock Finance Tools data for ${params.ticker || 'default'}`,
      timestamp: new Date().toISOString()
    };
  }

  private async simulatePolygonCall(method: string, params: any): Promise<any> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 800));

    return {
      method,
      params,
      data: `Mock Polygon.io data for ${params.ticker || 'default'}`,
      timestamp: new Date().toISOString()
    };
  }

  private async simulateYFinanceCall(method: string, params: any): Promise<any> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 300));

    return {
      method,
      params,
      data: `Mock yFinance data for ${params.ticker || 'default'}`,
      timestamp: new Date().toISOString()
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Health monitoring
  getStats(): any {
    return {
      pendingBatches: Array.from(this.pendingRequests.keys()).map(key => ({
        batchKey: key,
        pendingCount: this.pendingRequests.get(key)?.length || 0
      })),
      activeBatchTimers: Array.from(this.batchTimers.keys()),
      batchConfigs: Object.fromEntries(this.batchConfigs)
    };
  }

  // Cleanup
  shutdown(): void {
    // Clear all timers
    this.batchTimers.forEach(timer => clearTimeout(timer));
    this.batchTimers.clear();

    // Reject pending requests
    this.pendingRequests.forEach((batch, batchKey) => {
      batch.forEach(request => {
        request.reject(new Error('Service shutting down'));
      });
    });
    this.pendingRequests.clear();

    console.log('📦 Request Batcher shutdown complete');
  }
}

// Singleton instance
export const requestBatcher = new RequestBatcher();