import { SECClient } from '../lib/sec-client';
import { XBRLParser } from '../lib/xbrl-parser';
import type {
  IFinancialDataProvider,
  GetFinancialDataOptions,
} from './base';
import type {
  CompanyMetadata,
  FinancialData,
  PeerCompany,
  ProviderCapabilities,
  FinancialMetric,
} from './types';
import {
  DataProviderError,
  RateLimitError,
  DataNotFoundError,
} from './types';

export interface SECEdgarConfig {
  userAgent: string;
  requestDelay?: number;
  maxRetries?: number;
}

export class SECEdgarProvider implements IFinancialDataProvider {
  readonly name = 'SEC-EDGAR';
  readonly capabilities: ProviderCapabilities = {
    hasSecFilings: true,
    hasFundamentals: true,
    hasRealTimeData: false,
    hasPeerData: false,
    hasHistoricalData: true,
    maxHistoryYears: 10,
  };

  private client: SECClient;
  private config: SECEdgarConfig;

  constructor(config: SECEdgarConfig) {
    this.config = config;
    this.client = new SECClient(config.userAgent, config.requestDelay);
  }

  configure(config: Record<string, any>): void {
    this.config = { ...this.config, ...config };
    this.client = new SECClient(this.config.userAgent, this.config.requestDelay);
  }

  async searchCompanies(query: string): Promise<CompanyMetadata[]> {
    // SEC EDGAR doesn't have a search API, so this is limited
    // In a real implementation, we'd need to use the ticker-to-CIK mapping
    // For now, we'll treat the query as a potential ticker and try to validate
    throw new DataProviderError(
      'Search functionality not available for SEC EDGAR direct API',
      this.name,
      'NOT_SUPPORTED'
    );
  }

  async getCompanyMetadata(identifier: string): Promise<CompanyMetadata> {
    try {
      const cik = this.normalizeCIK(identifier);
      const companyFacts = await this.client.getCompanyFacts(cik);
      
      return {
        cik: companyFacts.cik,
        ticker: this.client.getPrimaryTicker(companyFacts) || identifier,
        name: companyFacts.entityName,
        sic: this.extractSIC(companyFacts),
        fiscalYearEnd: this.extractFiscalYearEnd(companyFacts),
      };
    } catch (error) {
      throw this.transformError(error, identifier);
    }
  }

  async getFinancialData(
    cik: string,
    options: GetFinancialDataOptions = {}
  ): Promise<FinancialData> {
    try {
      const normalizedCik = this.normalizeCIK(cik);
      const companyFacts = await this.client.getCompanyFacts(normalizedCik);
      
      // Parse XBRL data
      const parsedData = XBRLParser.parse(companyFacts);
      
      // Convert to our standard format
      const company: CompanyMetadata = {
        cik: parsedData.cik,
        ticker: this.client.getPrimaryTicker(companyFacts) || cik,
        name: parsedData.entityName,
        sic: this.extractSIC(companyFacts),
        fiscalYearEnd: this.extractFiscalYearEnd(companyFacts),
      };

      // Filter by concepts if specified
      let metrics = parsedData.facts;
      if (options.concepts && options.concepts.length > 0) {
        metrics = metrics.filter(fact => options.concepts!.includes(fact.concept));
      }

      // Filter by date range
      if (options.startDate) {
        metrics = metrics.filter(fact => fact.periodEnd >= options.startDate!);
      }
      if (options.endDate) {
        metrics = metrics.filter(fact => fact.periodEnd <= options.endDate!);
      }

      // Filter by forms
      if (options.forms && options.forms.length > 0) {
        metrics = metrics.filter(fact => 
          fact.form && options.forms!.includes(fact.form)
        );
      }

      // Apply result limit
      if (options.maxResults && options.maxResults > 0) {
        metrics = metrics.slice(0, options.maxResults);
      }

      // Convert parsed facts to our standard format
      const standardMetrics: FinancialMetric[] = metrics.map(fact => ({
        concept: fact.concept,
        value: fact.value,
        unit: fact.unit,
        periodEnd: fact.periodEnd,
        periodStart: fact.periodStart,
        instant: fact.instant,
        fiscalYear: fact.fiscalYear,
        fiscalPeriod: fact.fiscalPeriod,
        filingAccession: fact.filingAccession,
        form: fact.form,
        filed: fact.filed,
      }));

      return {
        company,
        metrics: standardMetrics,
        lastUpdated: new Date(),
        source: this.name,
      };
    } catch (error) {
      throw this.transformError(error, cik);
    }
  }

  async getLatestMetrics(cik: string, concepts: string[]): Promise<FinancialData> {
    const data = await this.getFinancialData(cik, { 
      concepts,
      maxResults: concepts.length * 4, // Get a few periods for each concept
    });

    // Get the latest value for each concept
    const latestMetrics: FinancialMetric[] = [];
    for (const concept of concepts) {
      const conceptMetrics = data.metrics
        .filter(m => m.concept === concept)
        .sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime());
      
      if (conceptMetrics.length > 0) {
        latestMetrics.push(conceptMetrics[0]);
      }
    }

    return {
      ...data,
      metrics: latestMetrics,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Try to fetch Apple's data as a health check
      await this.client.validateCIK('320193');
      return true;
    } catch {
      return false;
    }
  }

  private normalizeCIK(identifier: string): string {
    // Remove any leading zeros or CIK prefix, then pad to 10 digits
    const cleaned = identifier.replace(/^(CIK)?0*/, '');
    return cleaned.padStart(10, '0');
  }

  private extractSIC(companyFacts: any): string | undefined {
    // Try to extract SIC from DEI facts
    const deiSIC = companyFacts.facts?.dei?.['StandardIndustrialClassification'];
    if (deiSIC?.units?.pure?.val?.[0]?.val) {
      return String(deiSIC.units.pure.val[0].val);
    }
    return undefined;
  }

  private extractFiscalYearEnd(companyFacts: any): string | undefined {
    // Try to extract fiscal year end from DEI facts
    const deiFYE = companyFacts.facts?.dei?.['CurrentFiscalYearEndDate'];
    if (deiFYE?.units?.pure?.val?.[0]?.val) {
      return String(deiFYE.units.pure.val[0].val);
    }
    return undefined;
  }

  private transformError(error: any, identifier: string): DataProviderError {
    if (error instanceof DataProviderError) {
      return error;
    }

    // Transform SEC client errors to our standard errors
    if (error?.name === 'SECAPIError') {
      if (error.statusCode === 404) {
        return new DataNotFoundError(this.name, identifier);
      }
      if (error.statusCode === 429 || error.isRateLimit) {
        return new RateLimitError(this.name);
      }
      return new DataProviderError(
        error.message,
        this.name,
        'SEC_API_ERROR',
        error.statusCode,
        error.isRetryable || error.statusCode >= 500
      );
    }

    return new DataProviderError(
      `Unexpected error: ${error?.message || 'Unknown error'}`,
      this.name,
      'UNKNOWN'
    );
  }
}