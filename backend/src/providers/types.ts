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

// Provider capability flags
export const ProviderCapabilitiesSchema = z.object({
  hasSecFilings: z.boolean(),
  hasFundamentals: z.boolean(),
  hasRealTimeData: z.boolean(),
  hasPeerData: z.boolean(),
  hasHistoricalData: z.boolean(),
  maxHistoryYears: z.number().optional(),
});

export type CompanyMetadata = z.infer<typeof CompanyMetadataSchema>;
export type FinancialMetric = z.infer<typeof FinancialMetricSchema>;
export type FinancialData = z.infer<typeof FinancialDataSchema>;
export type PeerCompany = z.infer<typeof PeerCompanySchema>;
export type ProviderCapabilities = z.infer<typeof ProviderCapabilitiesSchema>;

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