import type {
  IFinancialDataProvider,
  ICompositeProvider,
  GetFinancialDataOptions,
} from './base';
import type {
  CompanyMetadata,
  FinancialData,
  PeerCompany,
  ProviderCapabilities,
} from './types';
import { DataProviderError } from './types';

interface ProviderEntry {
  provider: IFinancialDataProvider;
  priority: number;
}

/**
 * Composite provider that aggregates data from multiple sources
 * Uses priority-based fallback and capability-based routing
 */
export class CompositeProvider implements ICompositeProvider {
  readonly name = 'Composite';
  private providers: ProviderEntry[] = [];

  get capabilities(): ProviderCapabilities {
    // Aggregate capabilities from all providers
    const capabilities: ProviderCapabilities = {
      hasSecFilings: false,
      hasFundamentals: false,
      hasRealTimeData: false,
      hasPeerData: false,
      hasHistoricalData: false,
      hasRatioData: false,
      hasAnalystData: false,
      hasEconomicData: false,
      hasNewsData: false,
    };

    this.providers.forEach(({ provider }) => {
      capabilities.hasSecFilings = capabilities.hasSecFilings || provider.capabilities.hasSecFilings;
      capabilities.hasFundamentals = capabilities.hasFundamentals || provider.capabilities.hasFundamentals;
      capabilities.hasRealTimeData = capabilities.hasRealTimeData || provider.capabilities.hasRealTimeData;
      capabilities.hasPeerData = capabilities.hasPeerData || provider.capabilities.hasPeerData;
      capabilities.hasHistoricalData = capabilities.hasHistoricalData || provider.capabilities.hasHistoricalData;
      capabilities.hasRatioData = capabilities.hasRatioData || provider.capabilities.hasRatioData;
      capabilities.hasAnalystData = capabilities.hasAnalystData || provider.capabilities.hasAnalystData;
      capabilities.hasEconomicData = capabilities.hasEconomicData || provider.capabilities.hasEconomicData;
      capabilities.hasNewsData = capabilities.hasNewsData || provider.capabilities.hasNewsData;
      
      // Take the maximum history years
      if (provider.capabilities.maxHistoryYears) {
        capabilities.maxHistoryYears = Math.max(
          capabilities.maxHistoryYears || 0,
          provider.capabilities.maxHistoryYears
        );
      }
    });

    return capabilities;
  }

  addProvider(provider: IFinancialDataProvider, priority: number): void {
    // Remove existing provider with same name
    this.removeProvider(provider.name);
    
    // Add new provider and sort by priority (higher priority first)
    this.providers.push({ provider, priority });
    this.providers.sort((a, b) => b.priority - a.priority);
  }

  removeProvider(providerName: string): void {
    this.providers = this.providers.filter(
      entry => entry.provider.name !== providerName
    );
  }

  getProviders(): { provider: IFinancialDataProvider; priority: number }[] {
    return this.providers.map(entry => ({
      provider: entry.provider,
      priority: entry.priority,
    }));
  }

  configure(config: Record<string, any>): void {
    // Configure all underlying providers
    this.providers.forEach(({ provider }) => {
      provider.configure(config);
    });
  }

  async searchCompanies(query: string): Promise<CompanyMetadata[]> {
    const results: CompanyMetadata[] = [];
    const seen = new Set<string>(); // Deduplicate by CIK
    
    // Try each provider in priority order
    for (const { provider } of this.providers) {
      try {
        const providerResults = await provider.searchCompanies(query);
        
        for (const company of providerResults) {
          if (!seen.has(company.cik)) {
            results.push(company);
            seen.add(company.cik);
          }
        }
        
        // If we have good results, we can stop
        if (results.length >= 10) break;
        
      } catch (error) {
        console.warn(`Provider ${provider.name} failed for search:`, error);
        continue; // Try next provider
      }
    }
    
    if (results.length === 0) {
      throw new DataProviderError(
        'No providers could handle search request',
        this.name,
        'ALL_PROVIDERS_FAILED'
      );
    }
    
    return results;
  }

  async getCompanyMetadata(identifier: string): Promise<CompanyMetadata> {
    const errors: Error[] = [];
    
    // Try each provider in priority order
    for (const { provider } of this.providers) {
      try {
        return await provider.getCompanyMetadata(identifier);
      } catch (error) {
        errors.push(error as Error);
        
        // If it's a definitive "not found", try other providers
        if (error instanceof DataProviderError && error.code === 'NOT_FOUND') {
          continue;
        }
        
        // For other errors, log and try next provider
        console.warn(`Provider ${provider.name} failed for metadata:`, error);
        continue;
      }
    }
    
    // All providers failed
    throw new DataProviderError(
      `All providers failed to get company metadata: ${errors.map(e => e.message).join(', ')}`,
      this.name,
      'ALL_PROVIDERS_FAILED'
    );
  }

  async getFinancialData(
    cik: string,
    options: GetFinancialDataOptions = {}
  ): Promise<FinancialData> {
    // For financial data, prefer providers with SEC filings capability
    const secProviders = this.providers.filter(
      ({ provider }) => provider.capabilities.hasSecFilings
    );
    
    const providersToTry = secProviders.length > 0 ? secProviders : this.providers;
    const errors: Error[] = [];
    
    for (const { provider } of providersToTry) {
      try {
        return await provider.getFinancialData(cik, options);
      } catch (error) {
        errors.push(error as Error);
        console.warn(`Provider ${provider.name} failed for financial data:`, error);
        continue;
      }
    }
    
    throw new DataProviderError(
      `All providers failed to get financial data: ${errors.map(e => e.message).join(', ')}`,
      this.name,
      'ALL_PROVIDERS_FAILED'
    );
  }

  async getLatestMetrics(cik: string, concepts: string[]): Promise<FinancialData> {
    // Similar to getFinancialData, prefer SEC filing providers
    const secProviders = this.providers.filter(
      ({ provider }) => provider.capabilities.hasSecFilings
    );
    
    const providersToTry = secProviders.length > 0 ? secProviders : this.providers;
    const errors: Error[] = [];
    
    for (const { provider } of providersToTry) {
      try {
        return await provider.getLatestMetrics(cik, concepts);
      } catch (error) {
        errors.push(error as Error);
        continue;
      }
    }
    
    throw new DataProviderError(
      `All providers failed to get latest metrics: ${errors.map(e => e.message).join(', ')}`,
      this.name,
      'ALL_PROVIDERS_FAILED'
    );
  }

  async getPeers(cik: string, limit?: number): Promise<PeerCompany[]> {
    // Find providers that support peer data
    const peerProviders = this.providers.filter(
      ({ provider }) => provider.capabilities.hasPeerData && provider.getPeers
    );
    
    if (peerProviders.length === 0) {
      throw new DataProviderError(
        'No providers support peer data',
        this.name,
        'CAPABILITY_NOT_AVAILABLE'
      );
    }
    
    const results: PeerCompany[] = [];
    const seen = new Set<string>(); // Deduplicate by CIK
    
    for (const { provider } of peerProviders) {
      try {
        if (provider.getPeers) {
          const providerPeers = await provider.getPeers(cik, limit);
          
          for (const peer of providerPeers) {
            if (!seen.has(peer.cik)) {
              results.push(peer);
              seen.add(peer.cik);
            }
          }
          
          // If we have enough results, we can stop
          if (limit && results.length >= limit) break;
        }
      } catch (error) {
        console.warn(`Provider ${provider.name} failed for peers:`, error);
        continue;
      }
    }
    
    return limit ? results.slice(0, limit) : results;
  }

  async healthCheck(): Promise<boolean> {
    // Provider is healthy if at least one underlying provider is healthy
    const healthPromises = this.providers.map(({ provider }) =>
      provider.healthCheck().catch(() => false)
    );
    
    const healthResults = await Promise.all(healthPromises);
    return healthResults.some(isHealthy => isHealthy);
  }
}