import { z } from 'zod';

export const CompanyInfoSchema = z.object({
  cik: z.string(),
  entityName: z.string(),
  sic: z.string().optional(),
  sicDescription: z.string().optional(),
  insiderTransactionForOwnerExists: z.number().optional(),
  insiderTransactionForIssuerExists: z.number().optional(),
  name: z.string(),
  tickers: z.array(z.string()).optional(),
  exchanges: z.array(z.string()).optional(),
  ein: z.string().optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  investorWebsite: z.string().optional(),
  category: z.string().optional(),
  fiscalYearEnd: z.string().optional(),
  stateOfIncorporation: z.string().optional(),
  stateOfIncorporationDescription: z.string().optional(),
  addresses: z.object({
    mailing: z.object({
      street1: z.string().optional(),
      street2: z.string().optional(),
      city: z.string().optional(),
      stateOrCountry: z.string().optional(),
      zipCode: z.string().optional(),
      stateOrCountryDescription: z.string().optional(),
    }).optional(),
    business: z.object({
      street1: z.string().optional(),
      street2: z.string().optional(),
      city: z.string().optional(),
      stateOrCountry: z.string().optional(),
      zipCode: z.string().optional(),
      stateOrCountryDescription: z.string().optional(),
    }).optional(),
  }).optional(),
});

export const FactUnitSchema = z.object({
  label: z.string().optional(),
  description: z.string().optional(),
  val: z.array(z.object({
    end: z.string(),
    val: z.union([z.number(), z.string()]),
    accn: z.string(),
    fy: z.number(),
    fp: z.string(),
    form: z.string(),
    filed: z.string(),
    frame: z.string().optional(),
    start: z.string().optional(),
  })),
});

export const FactSchema = z.object({
  label: z.string().optional(),
  description: z.string().optional(),
  units: z.record(z.string(), FactUnitSchema),
});

export const CompanyFactsSchema = z.object({
  cik: z.string(),
  entityName: z.string(),
  facts: z.object({
    'dei': z.record(z.string(), FactSchema).optional(),
    'us-gaap': z.record(z.string(), FactSchema).optional(),
    'ifrs-full': z.record(z.string(), FactSchema).optional(),
  }),
});

export type CompanyInfo = z.infer<typeof CompanyInfoSchema>;
export type CompanyFacts = z.infer<typeof CompanyFactsSchema>;
export type Fact = z.infer<typeof FactSchema>;
export type FactUnit = z.infer<typeof FactUnitSchema>;