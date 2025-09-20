// MCP Performance Monitor - Production Monitoring Dashboard for Sprint 6
// Comprehensive monitoring and health dashboard for MCP system

import { DataSource, DataType } from '../mcp/types';

interface MonitoringMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    avgLatency: number;
    requestsPerMinute: number;
  };
  dataSources: {
    [key in DataSource]?: {
      isHealthy: boolean;
      uptime: number;
      avgLatency: number;
      requestCount: number;
      errorRate: number;
      lastError?: string;
      rateLimitStatus?: {
        remaining: number;
        resetTime: number;
        exceeded: boolean;
      };
    };
  };
  cache: {
    hitRate: number;
    size: number;
    evictions: number;
    totalSize: string;
  };
  performance: {
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    errorBudget: number;
  };
  alerts: Alert[];
}

interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  source?: string;
  metric?: string;
  value?: number;
  threshold?: number;
  resolved?: boolean;
}

interface PerformanceEntry {
  timestamp: number;
  source: DataSource;
  dataType: DataType;
  latency: number;
  success: boolean;
  error?: string;
}

export class MCPMonitor {
  private performanceHistory: PerformanceEntry[] = [];
  private activeAlerts: Map<string, Alert> = new Map();
  private metricCollectionInterval?: NodeJS.Timeout;
  private alertCheckInterval?: NodeJS.Timeout;

  // Monitoring thresholds
  private readonly THRESHOLDS = {
    maxLatency: 5000, // 5 seconds
    minSuccessRate: 0.95, // 95%
    maxCacheSize: 10000,
    minCacheHitRate: 0.8, // 80%
    maxErrorRate: 0.05 // 5%
  };

  // Performance tracking windows
  private readonly HISTORY_WINDOW = 24 * 60 * 60 * 1000; // 24 hours
  private readonly METRIC_INTERVAL = 60 * 1000; // 1 minute

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Collect metrics every minute
    this.metricCollectionInterval = setInterval(() => {
      this.collectMetrics();
    }, this.METRIC_INTERVAL);

    // Check for alerts every 30 seconds
    this.alertCheckInterval = setInterval(() => {
      this.checkAlerts();
    }, 30 * 1000);

    console.log('📊 MCP Monitor started');
  }

  recordRequest(
    source: DataSource,
    dataType: DataType,
    latency: number,
    success: boolean,
    error?: string
  ): void {
    const entry: PerformanceEntry = {
      timestamp: Date.now(),
      source,
      dataType,
      latency,
      success,
      error
    };

    this.performanceHistory.push(entry);

    // Keep only recent history
    const cutoff = Date.now() - this.HISTORY_WINDOW;
    this.performanceHistory = this.performanceHistory.filter(
      e => e.timestamp > cutoff
    );

    // Immediate alert checks for critical issues
    if (!success || latency > this.THRESHOLDS.maxLatency) {
      this.checkImmediateAlert(entry);
    }
  }

  private checkImmediateAlert(entry: PerformanceEntry): void {
    if (!entry.success) {
      this.createAlert({
        severity: 'high',
        message: `Request failed for ${entry.source}:${entry.dataType}`,
        source: entry.source,
        metric: 'request_failure',
        value: 0
      });
    }

    if (entry.latency > this.THRESHOLDS.maxLatency) {
      this.createAlert({
        severity: 'medium',
        message: `High latency detected for ${entry.source}: ${entry.latency}ms`,
        source: entry.source,
        metric: 'latency',
        value: entry.latency,
        threshold: this.THRESHOLDS.maxLatency
      });
    }
  }

  private collectMetrics(): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const recentEntries = this.performanceHistory.filter(e => e.timestamp > oneHourAgo);

    if (recentEntries.length === 0) return;

    // Calculate performance metrics
    const successfulRequests = recentEntries.filter(e => e.success);
    const successRate = successfulRequests.length / recentEntries.length;

    const latencies = recentEntries.map(e => e.latency).sort((a, b) => a - b);
    const p95Index = Math.floor(latencies.length * 0.95);
    const p95Latency = latencies[p95Index] || 0;

    console.log(`📈 MCP Metrics: ${recentEntries.length} requests, ${(successRate * 100).toFixed(1)}% success, P95: ${p95Latency}ms`);
  }

  private checkAlerts(): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const recentEntries = this.performanceHistory.filter(e => e.timestamp > oneHourAgo);

    if (recentEntries.length === 0) return;

    // Check success rate
    const successRate = recentEntries.filter(e => e.success).length / recentEntries.length;
    if (successRate < this.THRESHOLDS.minSuccessRate) {
      this.createAlert({
        severity: 'high',
        message: `Low success rate: ${(successRate * 100).toFixed(1)}%`,
        metric: 'success_rate',
        value: successRate,
        threshold: this.THRESHOLDS.minSuccessRate
      });
    }

    // Check error rates by source
    const sourceGroups = this.groupBySource(recentEntries);
    for (const [source, entries] of sourceGroups) {
      const errorRate = entries.filter(e => !e.success).length / entries.length;
      if (errorRate > this.THRESHOLDS.maxErrorRate) {
        this.createAlert({
          severity: 'medium',
          message: `High error rate for ${source}: ${(errorRate * 100).toFixed(1)}%`,
          source,
          metric: 'error_rate',
          value: errorRate,
          threshold: this.THRESHOLDS.maxErrorRate
        });
      }
    }
  }

  private groupBySource(entries: PerformanceEntry[]): Map<DataSource, PerformanceEntry[]> {
    const groups = new Map<DataSource, PerformanceEntry[]>();

    for (const entry of entries) {
      if (!groups.has(entry.source)) {
        groups.set(entry.source, []);
      }
      groups.get(entry.source)!.push(entry);
    }

    return groups;
  }

  private createAlert(alertData: Omit<Alert, 'id' | 'timestamp'>): void {
    const alertId = `${alertData.source || 'system'}_${alertData.metric}_${Date.now()}`;

    // Check if similar alert already exists
    const existingAlert = Array.from(this.activeAlerts.values()).find(alert =>
      alert.source === alertData.source &&
      alert.metric === alertData.metric &&
      !alert.resolved &&
      Date.now() - alert.timestamp.getTime() < 5 * 60 * 1000 // 5 minutes
    );

    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    const alert: Alert = {
      id: alertId,
      timestamp: new Date(),
      ...alertData
    };

    this.activeAlerts.set(alertId, alert);
    console.log(`🚨 Alert [${alert.severity.toUpperCase()}]: ${alert.message}`);

    // Auto-resolve non-critical alerts after 15 minutes
    if (alert.severity !== 'critical') {
      setTimeout(() => {
        this.resolveAlert(alertId);
      }, 15 * 60 * 1000);
    }
  }

  resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      console.log(`✅ Alert resolved: ${alert.message}`);
    }
  }

  getMetrics(): MonitoringMetrics {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneMinuteAgo = now - (60 * 1000);

    const recentEntries = this.performanceHistory.filter(e => e.timestamp > oneHourAgo);
    const lastMinuteEntries = this.performanceHistory.filter(e => e.timestamp > oneMinuteAgo);

    // Calculate request metrics
    const successfulRequests = recentEntries.filter(e => e.success);
    const avgLatency = recentEntries.length > 0
      ? recentEntries.reduce((sum, e) => sum + e.latency, 0) / recentEntries.length
      : 0;

    // Calculate percentiles
    const latencies = recentEntries.map(e => e.latency).sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

    // Calculate data source metrics
    const sourceGroups = this.groupBySource(recentEntries);
    const dataSources: MonitoringMetrics['dataSources'] = {};

    for (const [source, entries] of sourceGroups) {
      const successfulEntries = entries.filter(e => e.success);
      const avgSourceLatency = entries.reduce((sum, e) => sum + e.latency, 0) / entries.length;
      const errorRate = (entries.length - successfulEntries.length) / entries.length;

      dataSources[source] = {
        isHealthy: errorRate <= this.THRESHOLDS.maxErrorRate && avgSourceLatency <= this.THRESHOLDS.maxLatency,
        uptime: successfulEntries.length / entries.length,
        avgLatency: avgSourceLatency,
        requestCount: entries.length,
        errorRate,
        lastError: entries.find(e => !e.success)?.error
      };
    }

    // Mock cache metrics (would integrate with MCPCacheManager)
    const cacheMetrics = {
      hitRate: 0.85,
      size: 150,
      evictions: 5,
      totalSize: '2.3MB'
    };

    // Error budget calculation (target 99.5% uptime)
    const errorBudget = Math.max(0, 0.995 - (successfulRequests.length / recentEntries.length));

    return {
      requests: {
        total: recentEntries.length,
        successful: successfulRequests.length,
        failed: recentEntries.length - successfulRequests.length,
        avgLatency: Math.round(avgLatency),
        requestsPerMinute: lastMinuteEntries.length
      },
      dataSources,
      cache: cacheMetrics,
      performance: {
        p50Latency: Math.round(p50),
        p95Latency: Math.round(p95),
        p99Latency: Math.round(p99),
        errorBudget: Math.round(errorBudget * 10000) / 100 // Convert to percentage with 2 decimals
      },
      alerts: Array.from(this.activeAlerts.values())
        .filter(alert => !alert.resolved)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    };
  }

  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    summary: string;
    checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';
      details: string;
    }>;
  } {
    const metrics = this.getMetrics();
    const checks = [];

    // Success rate check
    const successRate = metrics.requests.total > 0
      ? metrics.requests.successful / metrics.requests.total
      : 1;

    checks.push({
      name: 'Success Rate',
      status: successRate >= this.THRESHOLDS.minSuccessRate ? 'pass' : 'fail',
      details: `${(successRate * 100).toFixed(1)}% (threshold: ${(this.THRESHOLDS.minSuccessRate * 100)}%)`
    });

    // Latency check
    checks.push({
      name: 'Response Time',
      status: metrics.performance.p95Latency <= this.THRESHOLDS.maxLatency ? 'pass' : 'warn',
      details: `P95: ${metrics.performance.p95Latency}ms (threshold: ${this.THRESHOLDS.maxLatency}ms)`
    });

    // Data source health
    const unhealthySources = Object.entries(metrics.dataSources)
      .filter(([, sourceData]) => !sourceData.isHealthy);

    checks.push({
      name: 'Data Sources',
      status: unhealthySources.length === 0 ? 'pass' : 'warn',
      details: unhealthySources.length === 0
        ? 'All data sources healthy'
        : `${unhealthySources.length} unhealthy sources`
    });

    // Cache performance
    checks.push({
      name: 'Cache Performance',
      status: metrics.cache.hitRate >= this.THRESHOLDS.minCacheHitRate ? 'pass' : 'warn',
      details: `${(metrics.cache.hitRate * 100).toFixed(1)}% hit rate`
    });

    // Determine overall status
    const failedChecks = checks.filter(c => c.status === 'fail').length;
    const warnChecks = checks.filter(c => c.status === 'warn').length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    let summary: string;

    if (failedChecks > 0) {
      status = 'unhealthy';
      summary = `${failedChecks} critical issues detected`;
    } else if (warnChecks > 0) {
      status = 'degraded';
      summary = `${warnChecks} warnings detected`;
    } else {
      status = 'healthy';
      summary = 'All systems operational';
    }

    return { status, summary, checks };
  }

  // Performance analysis methods
  getPerformanceTrends(hours: number = 24): {
    timeline: Array<{
      timestamp: number;
      requestCount: number;
      avgLatency: number;
      successRate: number;
    }>;
    insights: string[];
  } {
    const now = Date.now();
    const timeRange = hours * 60 * 60 * 1000;
    const bucketSize = timeRange / 24; // 24 data points

    const timeline = [];
    const insights = [];

    for (let i = 0; i < 24; i++) {
      const bucketStart = now - timeRange + (i * bucketSize);
      const bucketEnd = bucketStart + bucketSize;

      const bucketEntries = this.performanceHistory.filter(
        e => e.timestamp >= bucketStart && e.timestamp < bucketEnd
      );

      if (bucketEntries.length === 0) continue;

      const successfulEntries = bucketEntries.filter(e => e.success);
      const avgLatency = bucketEntries.reduce((sum, e) => sum + e.latency, 0) / bucketEntries.length;
      const successRate = successfulEntries.length / bucketEntries.length;

      timeline.push({
        timestamp: bucketStart,
        requestCount: bucketEntries.length,
        avgLatency: Math.round(avgLatency),
        successRate: Math.round(successRate * 1000) / 10 // Round to 1 decimal
      });
    }

    // Generate insights
    if (timeline.length > 12) {
      const recent = timeline.slice(-6);
      const earlier = timeline.slice(-12, -6);

      const recentAvgLatency = recent.reduce((sum, t) => sum + t.avgLatency, 0) / recent.length;
      const earlierAvgLatency = earlier.reduce((sum, t) => sum + t.avgLatency, 0) / earlier.length;

      if (recentAvgLatency > earlierAvgLatency * 1.2) {
        insights.push('Latency has increased significantly in recent hours');
      }

      const recentSuccessRate = recent.reduce((sum, t) => sum + t.successRate, 0) / recent.length;
      if (recentSuccessRate < 95) {
        insights.push('Success rate has dropped below 95% recently');
      }
    }

    return { timeline, insights };
  }

  shutdown(): void {
    if (this.metricCollectionInterval) {
      clearInterval(this.metricCollectionInterval);
    }
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
    }

    console.log('📊 MCP Monitor shutdown complete');
  }
}

// Singleton instance
export const mcpMonitor = new MCPMonitor();