import { z } from 'zod';

// Core data models for the provider abstraction layer
export const CompanyMetadataSchema = z.object({
  cik: z.string(),
  ticker: z.string(),
  name: z.string(),
  sic: z.string().optional(),
  fiscalYearEnd: z.string().optional(),
  sector: z.string().optional(),
  industry: z.string().optional(),
});

export const FinancialMetricSchema = z.object({
  concept: z.string(),
  value: z.number(),
  unit: z.string(),
  periodEnd: z.date(),
  periodStart: z.date().optional(),
  instant: z.boolean(),
  fiscalYear: z.number(),
  fiscalPeriod: z.string(),
  filingAccession: z.string().optional(),
  form: z.string().optional(),
  filed: z.date().optional(),
});

export const FinancialDataSchema = z.object({
  company: CompanyMetadataSchema,
  metrics: z.array(FinancialMetricSchema),
  lastUpdated: z.date(),
  source: z.string(),
});

export const PeerCompanySchema = z.object({
  cik: z.string(),
  ticker: z.string(),
  name: z.string(),
  marketCap: z.number().optional(),
  similarity: z.number().min(0).max(1).optional(), // 0-1 similarity score
});

// Enhanced data schemas for Phase 4
export const FinancialRatioSchema = z.object({
  name: z.string(),
  category: z.enum(['liquidity', 'profitability', 'efficiency', 'leverage', 'valuation']),
  value: z.number(),
  formula: z.string().optional(),
  description: z.string().optional(),
  period: z.string(),
  periodEnd: z.date(),
});

export const RealTimePriceSchema = z.object({
  ticker: z.string(),
  price: z.number(),
  change: z.number(),
  changePercent: z.number(),
  volume: z.number().optional(),
  timestamp: z.date(),
  marketStatus: z.enum(['open', 'closed', 'pre', 'after']).optional(),
});

export const AnalystEstimateSchema = z.object({
  ticker: z.string(),
  period: z.string(), // 'FY2025', 'Q1 2025', etc.
  metric: z.enum(['revenue', 'eps', 'ebitda']),
  consensusEstimate: z.number(),
  high: z.number().optional(),
  low: z.number().optional(),
  numberOfAnalysts: z.number().optional(),
  lastUpdated: z.date(),
});

// Removed TechnicalIndicatorSchema - focusing on fundamental analysis only

// Enhanced provider capability flags for Phase 4
export const ProviderCapabilitiesSchema = z.object({
  hasSecFilings: z.boolean(),
  hasFundamentals: z.boolean(),
  hasRealTimeData: z.boolean(),
  hasPeerData: z.boolean(),
  hasHistoricalData: z.boolean(),
  hasRatioData: z.boolean(),           // Financial ratios and calculated metrics
  hasAnalystData: z.boolean(),         // Analyst estimates and recommendations
  hasEconomicData: z.boolean(),        // Economic indicators and macro data
  hasNewsData: z.boolean(),            // News and sentiment data
  // Removed hasTechnicalData - focusing on fundamental analysis only
  maxHistoryYears: z.number().optional(),
  rateLimitPerMinute: z.number().optional(),
  rateLimitPerDay: z.number().optional(),
});

export type CompanyMetadata = z.infer<typeof CompanyMetadataSchema>;
export type FinancialMetric = z.infer<typeof FinancialMetricSchema>;
export type FinancialData = z.infer<typeof FinancialDataSchema>;
export type PeerCompany = z.infer<typeof PeerCompanySchema>;
export type ProviderCapabilities = z.infer<typeof ProviderCapabilitiesSchema>;

// Enhanced types for Phase 4
export type FinancialRatio = z.infer<typeof FinancialRatioSchema>;
export type RealTimePrice = z.infer<typeof RealTimePriceSchema>;
export type AnalystEstimate = z.infer<typeof AnalystEstimateSchema>;
// Removed TechnicalIndicator - focusing on fundamental analysis only

// Provider error types
export class DataProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string,
    public readonly statusCode?: number,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'DataProviderError';
  }
}

export class RateLimitError extends DataProviderError {
  constructor(provider: string, retryAfter?: number) {
    super(`Rate limit exceeded for ${provider}`, provider, 'RATE_LIMIT', 429, true);
    this.retryAfter = retryAfter;
  }
  
  retryAfter?: number;
}

export class DataNotFoundError extends DataProviderError {
  constructor(provider: string, identifier: string) {
    super(`Data not found for ${identifier} in ${provider}`, provider, 'NOT_FOUND', 404, false);
  }
}