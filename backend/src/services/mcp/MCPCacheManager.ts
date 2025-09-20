// MCP Cache Manager - Intelligent Caching for Sprint 6
// Advanced caching strategies for different types of MCP data

import { DataType } from './types';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  hitCount: number;
  lastAccessed: number;
  dataType: DataType;
  source: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalRequests: number;
}

export class MCPCacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0, totalRequests: 0 };
  private cleanupInterval?: NodeJS.Timeout;
  private readonly MAX_CACHE_SIZE = 1000;

  // Cache TTL configurations for different data types (in milliseconds)
  private readonly TTL_CONFIG: Record<DataType, number> = {
    // Financial metrics update quarterly, cache aggressively
    financialMetrics: 12 * 60 * 60 * 1000, // 12 hours
    companyOverview: 24 * 60 * 60 * 1000, // 24 hours

    // Market data updates more frequently
    historicalPrices: 1 * 60 * 60 * 1000, // 1 hour

    // Earnings data is released quarterly
    earningsHistory: 24 * 60 * 60 * 1000, // 24 hours

    // Insider trading updates weekly
    insiderTrading: 6 * 60 * 60 * 1000, // 6 hours

    // Institutional holdings update quarterly
    institutionalHoldings: 24 * 60 * 60 * 1000, // 24 hours

    // Fear & Greed Index updates daily
    fearGreedIndex: 30 * 60 * 1000, // 30 minutes

    // Macro data updates less frequently
    macroData: 24 * 60 * 60 * 1000, // 24 hours

    // News data updates frequently
    newsData: 15 * 60 * 1000, // 15 minutes

    // Options data updates during trading hours
    optionsData: 1 * 60 * 60 * 1000 // 1 hour
  };

  constructor() {
    this.startCleanupTimer();
  }

  generateCacheKey(
    dataType: DataType,
    source: string,
    params: any
  ): string {
    // Create a deterministic cache key
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    return `${source}:${dataType}:${this.hashString(paramString)}`;
  }

  async get(
    dataType: DataType,
    source: string,
    params: any
  ): Promise<any | null> {
    this.stats.totalRequests++;

    const key = this.generateCacheKey(dataType, source, params);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      console.log(`💨 Cache miss: ${key}`);
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      console.log(`⏰ Cache expired: ${key}`);
      return null;
    }

    // Update access statistics
    entry.hitCount++;
    entry.lastAccessed = now;
    this.stats.hits++;

    console.log(`💾 Cache hit: ${key} (${entry.hitCount} hits)`);
    return entry.data;
  }

  async set(
    dataType: DataType,
    source: string,
    params: any,
    data: any
  ): Promise<void> {
    const key = this.generateCacheKey(dataType, source, params);
    const ttl = this.getTTL(dataType, source);
    const now = Date.now();

    // Check cache size and evict if necessary
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastRecentlyUsed();
    }

    const entry: CacheEntry = {
      data,
      timestamp: now,
      ttl,
      hitCount: 0,
      lastAccessed: now,
      dataType,
      source
    };

    this.cache.set(key, entry);
    console.log(`💾 Cached: ${key} (TTL: ${ttl / 1000 / 60}min)`);
  }

  private getTTL(dataType: DataType, source: string): number {
    const baseTTL = this.TTL_CONFIG[dataType] || 60 * 60 * 1000; // Default 1 hour

    // Adjust TTL based on source reliability and rate limits
    switch (source) {
      case 'polygon':
        // Polygon has rate limits, cache longer
        return Math.max(baseTTL, 15 * 60 * 1000); // At least 15 minutes

      case 'finance-tools':
        // Finance Tools has good data quality, standard caching
        return baseTTL;

      case 'yfinance':
        // yfinance is a backup source, cache shorter
        return Math.min(baseTTL, 30 * 60 * 1000); // Max 30 minutes

      default:
        return baseTTL;
    }
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      console.log(`🗑️ Evicted LRU entry: ${oldestKey}`);
    }
  }

  private startCleanupTimer(): void {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  // Advanced cache operations

  invalidateByDataType(dataType: DataType): void {
    let invalidatedCount = 0;

    for (const [key, entry] of this.cache) {
      if (entry.dataType === dataType) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    console.log(`🔄 Invalidated ${invalidatedCount} entries for data type: ${dataType}`);
  }

  invalidateBySource(source: string): void {
    let invalidatedCount = 0;

    for (const [key, entry] of this.cache) {
      if (entry.source === source) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    console.log(`🔄 Invalidated ${invalidatedCount} entries for source: ${source}`);
  }

  invalidateByTicker(ticker: string): void {
    let invalidatedCount = 0;

    for (const [key, entry] of this.cache) {
      // Check if the ticker is in the cached data or key
      if (key.includes(ticker) || JSON.stringify(entry.data).includes(ticker)) {
        this.cache.delete(key);
        invalidatedCount++;
      }
    }

    console.log(`🔄 Invalidated ${invalidatedCount} entries for ticker: ${ticker}`);
  }

  // Preloading strategies

  async preloadPopularData(): Promise<void> {
    const popularTickers = ['AAPL', 'NVDA', 'UBER'];
    const popularDataTypes: DataType[] = ['financialMetrics', 'companyOverview', 'fearGreedIndex'];

    console.log('🚀 Starting preload of popular data...');

    // This would typically call actual MCP services
    // For now, we'll simulate the preloading
    for (const ticker of popularTickers) {
      for (const dataType of popularDataTypes) {
        try {
          // Simulate MCP call result
          const mockData = {
            ticker,
            dataType,
            timestamp: new Date().toISOString(),
            preloaded: true
          };

          await this.set(dataType, 'finance-tools', { ticker }, mockData);
        } catch (error) {
          console.warn(`⚠️ Failed to preload ${dataType} for ${ticker}:`, error);
        }
      }
    }

    console.log('✅ Preload completed');
  }

  async warmCache(
    dataType: DataType,
    source: string,
    paramsList: any[]
  ): Promise<void> {
    console.log(`🔥 Warming cache for ${dataType} from ${source}`);

    const promises = paramsList.map(async (params) => {
      try {
        // This would call actual MCP service
        const mockData = {
          dataType,
          source,
          params,
          timestamp: new Date().toISOString(),
          warmed: true
        };

        await this.set(dataType, source, params, mockData);
      } catch (error) {
        console.warn(`⚠️ Failed to warm cache for ${JSON.stringify(params)}:`, error);
      }
    });

    await Promise.allSettled(promises);
    console.log(`✅ Cache warming completed for ${dataType}`);
  }

  // Statistics and monitoring

  getStats(): CacheStats & {
    cacheSize: number;
    hitRate: number;
    topDataTypes: { dataType: DataType; count: number }[];
    topSources: { source: string; count: number }[];
  } {
    const dataTypeCounts = new Map<DataType, number>();
    const sourceCounts = new Map<string, number>();

    for (const [, entry] of this.cache) {
      dataTypeCounts.set(entry.dataType, (dataTypeCounts.get(entry.dataType) || 0) + 1);
      sourceCounts.set(entry.source, (sourceCounts.get(entry.source) || 0) + 1);
    }

    const hitRate = this.stats.totalRequests > 0
      ? (this.stats.hits / this.stats.totalRequests) * 100
      : 0;

    return {
      ...this.stats,
      cacheSize: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      topDataTypes: Array.from(dataTypeCounts.entries())
        .map(([dataType, count]) => ({ dataType, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      topSources: Array.from(sourceCounts.entries())
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    };
  }

  getCacheContents(): Array<{
    key: string;
    dataType: DataType;
    source: string;
    age: number;
    hitCount: number;
  }> {
    const now = Date.now();

    return Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      dataType: entry.dataType,
      source: entry.source,
      age: Math.round((now - entry.timestamp) / 1000 / 60), // Age in minutes
      hitCount: entry.hitCount
    }));
  }

  // Utility methods

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0, totalRequests: 0 };
    console.log('🧹 Cache cleared');
  }

  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
    console.log('💾 MCP Cache Manager shutdown complete');
  }
}

// Singleton instance
export const mcpCacheManager = new MCPCacheManager();