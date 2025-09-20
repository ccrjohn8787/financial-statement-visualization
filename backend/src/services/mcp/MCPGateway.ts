// MCP Gateway - Central Management for MCP Clients
// Sprint 5 MCP Integration

import {
  MCPClient,
  HealthStatus,
  RequestContext
} from './types';
import { mcpConfig } from '../../config/mcpConfig';

export class MCPGateway {
  private clients: Map<string, MCPClient> = new Map();
  private healthStatus: Map<string, HealthStatus> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private requestCounts: Map<string, number> = new Map();
  private rateLimitWindows: Map<string, number> = new Map();

  constructor() {
    this.initializeHealthStatus();
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing MCP Gateway...');

    if (!mcpConfig.enabled) {
      console.log('📝 MCP Gateway disabled by configuration');
      return;
    }

    try {
      // Import and initialize MCP clients dynamically
      await this.initializeClients();

      // Start health monitoring
      this.startHealthMonitoring();

      console.log('✅ MCP Gateway initialized successfully');
      this.logStatus();
    } catch (error) {
      console.error('❌ Failed to initialize MCP Gateway:', error);
      throw error;
    }
  }

  private async initializeClients(): Promise<void> {
    const clientPromises: Promise<void>[] = [];

    // Initialize Finance Tools MCP
    if (mcpConfig.clients.financeTools.enabled) {
      clientPromises.push(this.initializeFinanceTools());
    }

    // Initialize Polygon.io MCP
    if (mcpConfig.clients.polygon.enabled) {
      clientPromises.push(this.initializePolygon());
    }

    // Initialize yfinance MCP
    if (mcpConfig.clients.yfinance.enabled) {
      clientPromises.push(this.initializeYFinance());
    }

    await Promise.allSettled(clientPromises);
  }

  private async initializeFinanceTools(): Promise<void> {
    try {
      const { FinanceToolsClient } = await import('./FinanceToolsClient');
      const client = new FinanceToolsClient();
      await this.registerClient('finance-tools', client);
      console.log('✅ Finance Tools MCP client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Finance Tools MCP:', error);
      this.setClientUnhealthy('finance-tools', `Initialization failed: ${error}`);
    }
  }

  private async initializePolygon(): Promise<void> {
    try {
      const { PolygonClient } = await import('./PolygonClient');
      const client = new PolygonClient();
      await this.registerClient('polygon', client);
      console.log('✅ Polygon.io MCP client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Polygon.io MCP:', error);
      this.setClientUnhealthy('polygon', `Initialization failed: ${error}`);
    }
  }

  private async initializeYFinance(): Promise<void> {
    try {
      const { YFinanceClient } = await import('./YFinanceClient');
      const client = new YFinanceClient();
      await this.registerClient('yfinance', client);
      console.log('✅ yfinance MCP client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize yfinance MCP:', error);
      this.setClientUnhealthy('yfinance', `Initialization failed: ${error}`);
    }
  }

  private async registerClient(name: string, client: MCPClient): Promise<void> {
    this.clients.set(name, client);

    // Initial health check
    try {
      const isHealthy = await client.isHealthy();
      this.updateHealthStatus(name, isHealthy);
    } catch (error) {
      this.setClientUnhealthy(name, `Health check failed: ${error}`);
    }
  }

  async query(
    source: string,
    method: string,
    params: any,
    context?: RequestContext
  ): Promise<any> {
    const client = this.clients.get(source);

    if (!client) {
      throw new MCPError(`MCP client '${source}' not found`, source, method, params, false);
    }

    // Check health before query
    if (!this.isClientHealthy(source)) {
      throw new MCPError(`MCP client '${source}' is unhealthy`, source, method, params, true);
    }

    // Apply rate limiting
    if (!this.checkRateLimit(source)) {
      throw new MCPError(`Rate limit exceeded for '${source}'`, source, method, params, true);
    }

    try {
      const startTime = Date.now();
      const result = await this.executeWithTimeout(client, method, params, source);
      const latency = Date.now() - startTime;

      // Update health status with successful query
      this.updateHealthStatus(source, true, latency);

      // Update rate limit counter
      this.incrementRequestCount(source);

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.recordError(source, errorMsg);

      throw new MCPError(
        `MCP query failed: ${errorMsg}`,
        source,
        method,
        params,
        this.isRetryableError(error)
      );
    }
  }

  private async executeWithTimeout(
    client: MCPClient,
    method: string,
    params: any,
    source: string
  ): Promise<any> {
    const timeout = mcpConfig.timeout;

    return Promise.race([
      client.query(method, params),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
      )
    ]);
  }

  private checkRateLimit(source: string): boolean {
    const config = this.getClientConfig(source);
    if (!config?.rateLimitConfig?.enabled) return true;

    const { requestsPerWindow, windowMs } = config.rateLimitConfig;
    const now = Date.now();
    const windowStart = this.rateLimitWindows.get(source) || now;

    // Reset window if expired
    if (now - windowStart >= windowMs) {
      this.rateLimitWindows.set(source, now);
      this.requestCounts.set(source, 0);
      return true;
    }

    const currentCount = this.requestCounts.get(source) || 0;
    return currentCount < requestsPerWindow;
  }

  private incrementRequestCount(source: string): void {
    const current = this.requestCounts.get(source) || 0;
    this.requestCounts.set(source, current + 1);
  }

  private getClientConfig(source: string) {
    switch (source) {
      case 'finance-tools': return mcpConfig.clients.financeTools;
      case 'polygon': return mcpConfig.clients.polygon;
      case 'yfinance': return mcpConfig.clients.yfinance;
      default: return null;
    }
  }

  private isRetryableError(error: any): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('timeout') ||
             message.includes('network') ||
             message.includes('connection') ||
             message.includes('rate limit');
    }
    return false;
  }

  private initializeHealthStatus(): void {
    const sources = ['finance-tools', 'polygon', 'yfinance'];
    sources.forEach(source => {
      this.healthStatus.set(source, {
        isHealthy: false,
        lastChecked: new Date(),
        errorCount: 0
      });
    });
  }

  private updateHealthStatus(source: string, isHealthy: boolean, latency?: number): void {
    const current = this.healthStatus.get(source);
    if (current) {
      this.healthStatus.set(source, {
        ...current,
        isHealthy,
        lastChecked: new Date(),
        latency: latency || undefined,
        errorCount: isHealthy ? 0 : current.errorCount
      });
    }
  }

  private setClientUnhealthy(source: string, error: string): void {
    const current = this.healthStatus.get(source);
    if (current) {
      this.healthStatus.set(source, {
        ...current,
        isHealthy: false,
        lastChecked: new Date(),
        errorCount: current.errorCount + 1,
        lastError: error
      });
    }
  }

  private recordError(source: string, error: string): void {
    this.setClientUnhealthy(source, error);
  }

  isClientHealthy(source: string): boolean {
    return this.healthStatus.get(source)?.isHealthy || false;
  }

  getHealthStatus(): Map<string, HealthStatus> {
    return new Map(this.healthStatus);
  }

  getAvailableClients(): string[] {
    return Array.from(this.clients.keys()).filter(source => this.isClientHealthy(source));
  }

  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, mcpConfig.healthCheckInterval);

    console.log(`🏥 Health monitoring started (interval: ${mcpConfig.healthCheckInterval}ms)`);
  }

  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.clients.entries()).map(async ([source, client]) => {
      try {
        const startTime = Date.now();
        const isHealthy = await client.isHealthy();
        const latency = Date.now() - startTime;
        this.updateHealthStatus(source, isHealthy, latency);
      } catch (error) {
        this.setClientUnhealthy(source, `Health check failed: ${error}`);
      }
    });

    await Promise.allSettled(promises);
  }

  private logStatus(): void {
    const healthyClients = this.getAvailableClients();
    console.log(`📊 MCP Gateway Status: ${healthyClients.length}/${this.clients.size} clients healthy`);

    this.healthStatus.forEach((status, source) => {
      const emoji = status.isHealthy ? '✅' : '❌';
      const latency = status.latency ? ` (${status.latency}ms)` : '';
      console.log(`  ${emoji} ${source}${latency}`);
    });
  }

  async shutdown(): Promise<void> {
    console.log('🛑 Shutting down MCP Gateway...');

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Clear all data structures
    this.clients.clear();
    this.healthStatus.clear();
    this.requestCounts.clear();
    this.rateLimitWindows.clear();

    console.log('✅ MCP Gateway shutdown complete');
  }
}

// Custom MCPError class
class MCPError extends Error {
  constructor(
    message: string,
    public source: string,
    public method: string,
    public params: any,
    public retryable: boolean
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

// Singleton instance
export const mcpGateway = new MCPGateway();