interface FinnhubCompanyProfile {
  country: string;
  currency: string;
  exchange: string;
  ipo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
  logo: string;
  finnhubIndustry: string;
}

interface FinnhubFinancials {
  symbol: string;
  metric: {
    '10DayAverageTradingVolume': number;
    '13WeekPriceReturnDaily': number;
    '26WeekPriceReturnDaily': number;
    '3MonthAverageTradingVolume': number;
    '52WeekHigh': number;
    '52WeekLow': number;
    '52WeekPriceReturnDaily': number;
    '5DayPriceReturnDaily': number;
    'beta': number;
    'currentRatio': number;
    'epsInclExtraItemsAnnual': number;
    'epsInclExtraItemsTTM': number;
    'epsNormalizedAnnual': number;
    'grossMarginAnnual': number;
    'grossMarginTTM': number;
    'inventoryTurnoverAnnual': number;
    'inventoryTurnoverTTM': number;
    'longtermDebtTotalCapitalAnnual': number;
    'longtermDebtTotalCapitalQuarterly': number;
    'marketCapitalization': number;
    'netIncomeEmployeeAnnual': number;
    'netIncomeEmployeeTTM': number;
    'netMarginAnnual': number;
    'netMarginTTM': number;
    'operatingMarginAnnual': number;
    'operatingMarginTTM': number;
    'payoutRatioAnnual': number;
    'payoutRatioTTM': number;
    'pbAnnual': number;
    'pbQuarterly': number;
    'pcfShareAnnual': number;
    'pcfShareTTM': number;
    'peBasicExclExtraItemsAnnual': number;
    'peBasicExclExtraItemsTTM': number;
    'peInclExtraItemsAnnual': number;
    'peInclExtraItemsTTM': number;
    'peNormalizedAnnual': number;
    'pfcfShareAnnual': number;
    'pfcfShareTTM': number;
    'pretaxMarginAnnual': number;
    'pretaxMarginTTM': number;
    'priceRelativeToS&P50013Week': number;
    'priceRelativeToS&P50026Week': number;
    'priceRelativeToS&P5004Week': number;
    'priceRelativeToS&P50052Week': number;
    'priceRelativeToS&P500Ytd': number;
    'psAnnual': number;
    'psTTM': number;
    'ptbvAnnual': number;
    'ptbvQuarterly': number;
    'quickRatioAnnual': number;
    'quickRatioQuarterly': number;
    'receivablesTurnoverAnnual': number;
    'receivablesTurnoverTTM': number;
    'revenueEmployeeAnnual': number;
    'revenueEmployeeTTM': number;
    'revenueGrowth3Y': number;
    'revenueGrowth5Y': number;
    'revenueGrowthQuarterlyYoy': number;
    'revenueGrowthTTMYoy': number;
    'revenuePerShareAnnual': number;
    'revenuePerShareTTM': number;
    'revenueShareGrowth5Y': number;
    'roaRfy': number;
    'roeTTM': number;
    'roiAnnual': number;
    'roiTTM': number;
    'tangibleBookValuePerShareAnnual': number;
    'tangibleBookValuePerShareQuarterly': number;
    'tbvCagr5Y': number;
    'totalDebtToEquityAnnual': number;
    'totalDebtToEquityQuarterly': number;
    'totalDebtToTotalCapitalAnnual': number;
    'totalDebtToTotalCapitalQuarterly': number;
    'totalRatio': number;
    'yearToDatePriceReturnDaily': number;
  };
  series: {
    annual: {
      currentRatio: Array<{ period: string; v: number }>;
      salesPerShare: Array<{ period: string; v: number }>;
      netMargin: Array<{ period: string; v: number }>;
    };
  };
}

interface FinnhubSearchResult {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

export class FinnhubClient {
  private apiKey: string;
  private baseUrl = 'https://finnhub.io/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async fetch<T>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}&token=${this.apiKey}`;
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Check for API error responses
      if (data.error) {
        throw new Error(`Finnhub API error: ${data.error}`);
      }
      
      return data;
    } catch (error) {
      console.error('Finnhub API call failed:', error);
      throw error;
    }
  }

  async searchSymbol(query: string): Promise<FinnhubSearchResult> {
    return this.fetch<FinnhubSearchResult>(`/search?q=${encodeURIComponent(query)}`);
  }

  async getCompanyProfile(symbol: string): Promise<FinnhubCompanyProfile> {
    return this.fetch<FinnhubCompanyProfile>(`/stock/profile2?symbol=${symbol}`);
  }

  async getCompanyFinancials(symbol: string): Promise<FinnhubFinancials> {
    return this.fetch<FinnhubFinancials>(`/stock/metric?symbol=${symbol}&metric=all`);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.fetch('/search?q=AAPL');
      return true;
    } catch {
      return false;
    }
  }
}