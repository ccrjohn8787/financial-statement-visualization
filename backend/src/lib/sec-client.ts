import { request } from 'undici';
import pRetry from 'p-retry';
import { CompanyFactsSchema, type CompanyFacts } from '../types/sec';

export class SECAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isRateLimit: boolean = false
  ) {
    super(message);
    this.name = 'SECAPIError';
  }
}

export class SECClient {
  private readonly baseUrl = 'https://data.sec.gov/api/xbrl';
  private readonly userAgent: string;
  private readonly requestDelay: number;
  private lastRequestTime = 0;

  constructor(userAgent?: string, requestDelay = 100) {
    this.userAgent = userAgent || process.env.SEC_USER_AGENT || 'Financial Statement Visualizer (contact@example.com)';
    this.requestDelay = requestDelay; // Minimum 100ms between requests for 10 req/s limit
  }

  private async rateLimitedRequest(url: string): Promise<Response> {
    // Ensure we don't exceed 10 requests per second
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const delayNeeded = Math.max(0, this.requestDelay - timeSinceLastRequest);
    
    if (delayNeeded > 0) {
      await new Promise(resolve => setTimeout(resolve, delayNeeded));
    }
    
    this.lastRequestTime = Date.now();

    const response = await request(url, {
      method: 'GET',
      headers: {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
    });

    if (response.statusCode === 429) {
      throw new SECAPIError('Rate limit exceeded', 429, true);
    }

    if (response.statusCode !== 200) {
      throw new SECAPIError(
        `SEC API error: ${response.statusCode}`,
        response.statusCode
      );
    }

    return response;
  }

  async getCompanyFacts(cik: string): Promise<CompanyFacts> {
    // Normalize CIK to 10 digits with leading zeros
    const normalizedCik = cik.padStart(10, '0');
    const url = `${this.baseUrl}/companyfacts/CIK${normalizedCik}.json`;

    const fetchCompanyFacts = async (): Promise<CompanyFacts> => {
      try {
        const response = await this.rateLimitedRequest(url);
        const data = await response.body.json();
        
        // Validate the response structure
        const result = CompanyFactsSchema.parse(data);
        return result;
      } catch (error) {
        if (error instanceof SECAPIError) {
          throw error; // Re-throw SEC API errors as-is
        }
        
        if (error instanceof Error) {
          throw new SECAPIError(`Failed to fetch company facts for CIK ${normalizedCik}: ${error.message}`);
        }
        
        throw new SECAPIError(`Unknown error fetching company facts for CIK ${normalizedCik}`);
      }
    };

    // Retry with exponential backoff, especially for rate limits
    return pRetry(fetchCompanyFacts, {
      retries: 3,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 10000,
      onFailedAttempt: (error) => {
        console.log(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`);
        
        // For rate limits, wait longer
        if (error.message.includes('Rate limit')) {
          return new Promise(resolve => setTimeout(resolve, 5000));
        }
      },
    });
  }

  async validateCIK(cik: string): Promise<boolean> {
    try {
      await this.getCompanyFacts(cik);
      return true;
    } catch (error) {
      if (error instanceof SECAPIError && 
          (error.statusCode === 404 || error.message.includes('404'))) {
        return false;
      }
      throw error;
    }
  }

  // Helper method to get the primary ticker from company facts
  getPrimaryTicker(companyFacts: CompanyFacts): string | null {
    // Try to extract ticker from DEI facts if available
    const deiTradingSymbol = companyFacts.facts.dei?.['TradingSymbol'];
    if (deiTradingSymbol?.units.pure?.val?.[0]?.val) {
      return String(deiTradingSymbol.units.pure.val[0].val);
    }
    
    return null;
  }
}