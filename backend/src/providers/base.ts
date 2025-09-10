import type {
  CompanyMetadata,
  FinancialData,
  PeerCompany,
  ProviderCapabilities,
} from './types';

// Abstract base interface for all data providers
export interface IFinancialDataProvider {
  readonly name: string;
  readonly capabilities: ProviderCapabilities;
  
  // Company metadata operations
  searchCompanies(query: string): Promise<CompanyMetadata[]>;
  getCompanyMetadata(identifier: string): Promise<CompanyMetadata>;
  
  // Core financial data operations
  getFinancialData(cik: string, options?: GetFinancialDataOptions): Promise<FinancialData>;
  getLatestMetrics(cik: string, concepts: string[]): Promise<FinancialData>;
  
  // Peer analysis operations (optional)
  getPeers?(cik: string, limit?: number): Promise<PeerCompany[]>;
  
  // Health check and connectivity
  healthCheck(): Promise<boolean>;
  
  // Provider-specific configuration
  configure(config: Record<string, any>): void;
}

export interface GetFinancialDataOptions {
  concepts?: string[];
  startDate?: Date;
  endDate?: Date;
  forms?: string[];
  includePreliminary?: boolean;
  maxResults?: number;
}

// Composite provider that can aggregate data from multiple sources
export interface ICompositeProvider extends IFinancialDataProvider {
  addProvider(provider: IFinancialDataProvider, priority: number): void;
  removeProvider(providerName: string): void;
  getProviders(): { provider: IFinancialDataProvider; priority: number }[];
}

// Provider registry for managing multiple providers
export class ProviderRegistry {
  private providers = new Map<string, IFinancialDataProvider>();
  private primary?: IFinancialDataProvider;
  
  register(provider: IFinancialDataProvider, isPrimary = false): void {
    this.providers.set(provider.name, provider);
    if (isPrimary) {
      this.primary = provider;
    }
  }
  
  get(name: string): IFinancialDataProvider | undefined {
    return this.providers.get(name);
  }
  
  getPrimary(): IFinancialDataProvider | undefined {
    return this.primary;
  }
  
  getAll(): IFinancialDataProvider[] {
    return Array.from(this.providers.values());
  }
  
  getByCapability(capability: keyof ProviderCapabilities): IFinancialDataProvider[] {
    return this.getAll().filter(provider => provider.capabilities[capability]);
  }
  
  async healthCheckAll(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    for (const [name, provider] of this.providers) {
      try {
        const isHealthy = await provider.healthCheck();
        results.set(name, isHealthy);
      } catch (error) {
        results.set(name, false);
      }
    }
    
    return results;
  }
}