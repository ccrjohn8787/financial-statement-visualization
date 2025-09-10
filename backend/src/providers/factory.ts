import { SECEdgarProvider, type SECEdgarConfig } from './sec-edgar';
import { ProviderRegistry, type IFinancialDataProvider } from './base';
import { DataProviderError } from './types';

export interface ProviderConfig {
  'SEC-EDGAR': SECEdgarConfig;
  // Future providers can be added here
  // 'ALPHA_VANTAGE': AlphaVantageConfig;
  // 'FINANCIAL_MODELING_PREP': FMPConfig;
}

export type ProviderName = keyof ProviderConfig;

/**
 * Factory class for creating and managing financial data providers
 */
export class ProviderFactory {
  private static instance: ProviderFactory;
  private registry: ProviderRegistry;

  private constructor() {
    this.registry = new ProviderRegistry();
  }

  static getInstance(): ProviderFactory {
    if (!ProviderFactory.instance) {
      ProviderFactory.instance = new ProviderFactory();
    }
    return ProviderFactory.instance;
  }

  /**
   * Create a provider instance
   */
  createProvider<T extends ProviderName>(
    name: T,
    config: ProviderConfig[T]
  ): IFinancialDataProvider {
    switch (name) {
      case 'SEC-EDGAR':
        return new SECEdgarProvider(config as SECEdgarConfig);
      
      default:
        throw new DataProviderError(
          `Unknown provider: ${name}`,
          'FACTORY',
          'UNKNOWN_PROVIDER'
        );
    }
  }

  /**
   * Create and register a provider
   */
  registerProvider<T extends ProviderName>(
    name: T,
    config: ProviderConfig[T],
    isPrimary = false
  ): IFinancialDataProvider {
    const provider = this.createProvider(name, config);
    this.registry.register(provider, isPrimary);
    return provider;
  }

  /**
   * Get the provider registry
   */
  getRegistry(): ProviderRegistry {
    return this.registry;
  }

  /**
   * Initialize default providers based on environment configuration
   */
  async initializeDefaults(): Promise<void> {
    const secUserAgent = process.env.SEC_USER_AGENT;
    if (!secUserAgent) {
      throw new DataProviderError(
        'SEC_USER_AGENT environment variable is required',
        'FACTORY',
        'MISSING_CONFIG'
      );
    }

    // Register SEC EDGAR as primary provider
    const secProvider = this.registerProvider(
      'SEC-EDGAR',
      {
        userAgent: secUserAgent,
        requestDelay: 100, // 10 req/s limit
        maxRetries: 3,
      },
      true // Set as primary
    );

    // Verify provider is working
    const isHealthy = await secProvider.healthCheck();
    if (!isHealthy) {
      console.warn('Warning: Primary SEC-EDGAR provider failed health check');
    }
  }

  /**
   * Get all registered providers with their health status
   */
  async getProviderStatus(): Promise<Map<string, { healthy: boolean; capabilities: any }>> {
    const status = new Map();
    const healthResults = await this.registry.healthCheckAll();
    
    for (const provider of this.registry.getAll()) {
      status.set(provider.name, {
        healthy: healthResults.get(provider.name) || false,
        capabilities: provider.capabilities,
      });
    }
    
    return status;
  }
}