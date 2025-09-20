// MCP Integration Types for FinScope
// Created for Sprint 5 MCP Integration

export interface MCPClient {
  name: string;
  isHealthy(): Promise<boolean>;
  query(method: string, params: any): Promise<any>;
  getCapabilities(): string[];
}

export interface HealthStatus {
  isHealthy: boolean;
  lastChecked: Date;
  latency?: number;
  errorCount: number;
  lastError?: string;
}

export interface DataSourceConfig {
  enabled: boolean;
  timeout: number;
  retries: number;
  rateLimitConfig?: RateLimitConfig;
}

export interface RateLimitConfig {
  requestsPerWindow: number;
  windowMs: number;
  enabled: boolean;
}

export type DataSource = 'finnhub' | 'finance-tools' | 'polygon' | 'yfinance' | 'sec-edgar';

export type DataType =
  | 'companyOverview'
  | 'financialMetrics'
  | 'historicalPrices'
  | 'earningsHistory'
  | 'insiderTrading'
  | 'institutionalHoldings'
  | 'fearGreedIndex'
  | 'macroData'
  | 'newsData'
  | 'optionsData';

export interface RouteConfig {
  primary: DataSource;
  fallback: DataSource[];
  enhancement?: DataSource[];
  cacheStrategy: 'aggressive' | 'moderate' | 'minimal';
  rateLimitStrategy: 'strict' | 'adaptive' | 'none';
}

export interface MCPGatewayConfig {
  enabled: boolean;
  timeout: number;
  maxRetries: number;
  healthCheckInterval: number;
  clients: {
    financeTools: DataSourceConfig;
    polygon: DataSourceConfig;
    yfinance: DataSourceConfig;
  };
}

export interface EnhancedCompanyData {
  // Existing FinScope data (preserved)
  company: any;
  currentPrice: any;
  healthScore: any;
  metrics: any[];

  // New MCP-enhanced data
  earningsHistory?: EarningsHistory[];
  insiderTrading?: InsiderTrade[];
  institutionalHoldings?: InstitutionalHolding[];
  fearGreedIndex?: FearGreedData;
  macroIndicators?: MacroData[];
  optionsFlow?: OptionsData[];
  enhancedNews?: NewsItem[];

  // Data source tracking
  dataSources: DataSourceLog[];
}

export interface EarningsHistory {
  quarter: string;
  year: number;
  estimated: number;
  actual: number;
  surprise: number;
  surprisePercent: number;
  reportDate: string;
}

export interface InsiderTrade {
  name: string;
  position: string;
  transactionDate: string;
  shares: number;
  price: number;
  value: number;
  transactionType: 'buy' | 'sell';
}

export interface InstitutionalHolding {
  institution: string;
  shares: number;
  value: number;
  percentOfPortfolio: number;
  changeFromPrevious: number;
  reportDate: string;
}

export interface FearGreedData {
  value: number;
  text: string;
  timestamp: string;
  historical?: Array<{
    value: number;
    timestamp: string;
  }>;
}

export interface MacroData {
  indicator: string;
  value: number;
  unit: string;
  date: string;
  source: 'FRED' | 'other';
}

export interface OptionsData {
  strike: number;
  expiration: string;
  volume: number;
  openInterest: number;
  type: 'call' | 'put';
  impliedVolatility: number;
}

export interface NewsItem {
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
  source: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
  relevanceScore?: number;
}

export interface DataSourceLog {
  source: DataSource;
  dataType: DataType;
  timestamp: Date;
  success: boolean;
  latency?: number;
  error?: string;
  cached: boolean;
}

export interface MCPError extends Error {
  source: DataSource;
  method: string;
  params: any;
  retryable: boolean;
}

export interface RequestContext {
  ticker: string;
  dataType: DataType;
  params: any;
  userId?: string;
  timestamp: Date;
}