import { SECEdgarProvider, type SECEdgarConfig } from './sec-edgar';
import { FMPProvider, type FMPConfig } from './fmp';
import { AlphaVantageProvider, type AlphaVantageConfig } from './alpha-vantage';
import { FinnhubProvider, type FinnhubConfig } from './finnhub';
import { ProviderRegistry, type IFinancialDataProvider } from './base';
import { DataProviderError } from './types';

export interface ProviderConfig {
  'SEC-EDGAR': SECEdgarConfig;
  'FMP': FMPConfig;
  'ALPHA_VANTAGE': AlphaVantageConfig;
  'FINNHUB': FinnhubConfig;
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
      
      case 'FMP':
        return new FMPProvider(config as FMPConfig);
        
      case 'ALPHA_VANTAGE':
        return new AlphaVantageProvider(config as AlphaVantageConfig);
        
      case 'FINNHUB':
        return new FinnhubProvider(config as FinnhubConfig);
      
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

    // Register SEC EDGAR as primary provider (always required)
    const secProvider = this.registerProvider(
      'SEC-EDGAR',
      {
        userAgent: secUserAgent,
        requestDelay: 100, // 10 req/s limit
        maxRetries: 3,
      },
      true // Set as primary
    );

    // Verify primary provider is working
    const isHealthy = await secProvider.healthCheck();
    if (!isHealthy) {
      console.warn('Warning: Primary SEC-EDGAR provider failed health check');
    }

    // Optionally register FMP provider for enhanced data
    const fmpApiKey = process.env.FMP_API_KEY;
    if (fmpApiKey) {
      try {
        const fmpProvider = this.registerProvider('FMP', {
          apiKey: fmpApiKey,
        });
        
        const fmpHealthy = await fmpProvider.healthCheck();
        if (fmpHealthy) {
          console.log('FMP provider registered successfully');
        } else {
          console.warn('Warning: FMP provider failed health check');
        }
      } catch (error) {
        console.warn('Warning: Failed to initialize FMP provider:', error);
      }
    }

    // Optionally register Finnhub provider for enhanced company search and financial statements
    const finnhubApiKey = process.env.FINNHUB_API_KEY;
    if (finnhubApiKey) {
      try {
        const finnhubProvider = this.registerProvider('FINNHUB', {
          apiKey: finnhubApiKey,
        });
        
        const finnhubHealthy = await finnhubProvider.healthCheck();
        if (finnhubHealthy) {
          console.log('Finnhub provider registered successfully');
        } else {
          console.warn('Warning: Finnhub provider failed health check');
        }
      } catch (error) {
        console.warn('Warning: Failed to initialize Finnhub provider:', error);
      }
    }

    // Optionally register Alpha Vantage provider for real-time data
    const avApiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (avApiKey) {
      try {
        const avProvider = this.registerProvider('ALPHA_VANTAGE', {
          apiKey: avApiKey,
          tier: process.env.ALPHA_VANTAGE_TIER as 'free' | 'premium' || 'free',
        });
        
        const avHealthy = await avProvider.healthCheck();
        if (avHealthy) {
          console.log('Alpha Vantage provider registered successfully');
        } else {
          console.warn('Warning: Alpha Vantage provider failed health check');
        }
      } catch (error) {
        console.warn('Warning: Failed to initialize Alpha Vantage provider:', error);
      }
    }

    console.log(`Initialized ${this.registry.getAll().length} data providers`);
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