import { z } from 'zod';

// API Response schemas
export const CompanySearchResultSchema = z.object({
  cik: z.string(),
  ticker: z.string(),
  name: z.string(),
  sic: z.string().optional(),
  sector: z.string().optional(),
  industry: z.string().optional(),
});

export const MetricOverviewSchema = z.object({
  concept: z.string(),
  label: z.string(),
  value: z.number(),
  unit: z.string(),
  periodEnd: z.string().datetime(),
  fiscalPeriod: z.string(),
  fiscalYear: z.number(),
  change: z.object({
    value: z.number(),
    percentage: z.number(),
    period: z.string(), // 'QoQ', 'YoY'
  }).optional(),
});

export const CompanyOverviewSchema = z.object({
  company: z.object({
    cik: z.string(),
    ticker: z.string(),
    name: z.string(),
    sic: z.string().optional(),
    fiscalYearEnd: z.string().optional(),
  }),
  metrics: z.array(MetricOverviewSchema),
  lastUpdated: z.string().datetime(),
  source: z.string(),
  disclaimer: z.string(),
});

export const MetricTimeSeriesSchema = z.object({
  concept: z.string(),
  label: z.string(),
  unit: z.string(),
  data: z.array(z.object({
    periodEnd: z.string().datetime(),
    value: z.number(),
    fiscalPeriod: z.string(),
    fiscalYear: z.number(),
    filingAccession: z.string().optional(),
    form: z.string().optional(),
  })),
  metadata: z.object({
    dataPoints: z.number(),
    periodRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }),
    frequency: z.enum(['quarterly', 'annual', 'mixed']),
  }),
});

export const JobStatusSchema = z.object({
  id: z.string(),
  status: z.enum(['waiting', 'active', 'completed', 'failed']),
  progress: z.number().min(0).max(100),
  result: z.any().optional(),
  error: z.string().optional(),
  createdAt: z.string().datetime(),
  processedAt: z.string().datetime().optional(),
});

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
    timestamp: z.string().datetime(),
    requestId: z.string().optional(),
  }),
});

// Request schemas
export const CompanySearchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  limit: z.coerce.number().min(1).max(20).default(10),
});

export const OverviewQuerySchema = z.object({
  range: z.enum(['1y', '2y', '3y', '5y']).default('3y'),
  refresh: z.coerce.boolean().default(false),
});

export const MetricQuerySchema = z.object({
  concept: z.string(),
  frequency: z.enum(['quarterly', 'annual', 'all']).default('quarterly'),
  range: z.enum(['1y', '2y', '3y', '5y', '10y']).default('3y'),
  start_date: z.string().datetime().optional(),
  end_date: z.string().datetime().optional(),
});

export const RefreshRequestSchema = z.object({
  force: z.coerce.boolean().default(false),
  concepts: z.array(z.string()).optional(),
});

// Type exports
export type CompanySearchResult = z.infer<typeof CompanySearchResultSchema>;
export type MetricOverview = z.infer<typeof MetricOverviewSchema>;
export type CompanyOverview = z.infer<typeof CompanyOverviewSchema>;
export type MetricTimeSeries = z.infer<typeof MetricTimeSeriesSchema>;
export type JobStatus = z.infer<typeof JobStatusSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;

export type CompanySearchQuery = z.infer<typeof CompanySearchQuerySchema>;
export type OverviewQuery = z.infer<typeof OverviewQuerySchema>;
export type MetricQuery = z.infer<typeof MetricQuerySchema>;
export type RefreshRequest = z.infer<typeof RefreshRequestSchema>;

// Common financial concepts with labels
export const FINANCIAL_CONCEPTS = {
  // Income Statement
  'Revenues': 'Revenue',
  'CostOfRevenue': 'Cost of Revenue',
  'GrossProfit': 'Gross Profit',
  'OperatingIncomeLoss': 'Operating Income',
  'NetIncomeLoss': 'Net Income',
  'EarningsPerShareDiluted': 'Earnings Per Share (Diluted)',
  
  // Balance Sheet
  'Assets': 'Total Assets',
  'AssetsCurrent': 'Current Assets',
  'Liabilities': 'Total Liabilities',
  'LiabilitiesCurrent': 'Current Liabilities',
  'StockholdersEquity': 'Stockholders Equity',
  'CashAndCashEquivalentsAtCarryingValue': 'Cash and Cash Equivalents',
  'LongTermDebtNoncurrent': 'Long-term Debt',
  
  // Cash Flow
  'NetCashProvidedByUsedInOperatingActivities': 'Operating Cash Flow',
  'NetCashProvidedByUsedInInvestingActivities': 'Investing Cash Flow',
  'NetCashProvidedByUsedInFinancingActivities': 'Financing Cash Flow',
} as const;

export type FinancialConcept = keyof typeof FINANCIAL_CONCEPTS;