// Core interfaces and base classes
export type {
  IFinancialDataProvider,
  ICompositeProvider,
  GetFinancialDataOptions,
} from './base';
export { ProviderRegistry } from './base';

// Type definitions and schemas
export type {
  CompanyMetadata,
  FinancialMetric,
  FinancialData,
  PeerCompany,
  ProviderCapabilities,
  FinancialRatio,
  RealTimePrice,
  AnalystEstimate,
} from './types';
export {
  CompanyMetadataSchema,
  FinancialMetricSchema,
  FinancialDataSchema,
  PeerCompanySchema,
  ProviderCapabilitiesSchema,
  DataProviderError,
  RateLimitError,
  DataNotFoundError,
} from './types';

// Concrete provider implementations
export { SECEdgarProvider, type SECEdgarConfig } from './sec-edgar';
export { FinnhubProvider, type FinnhubConfig } from './finnhub';
export { CompositeProvider } from './composite';

// Factory for creating and managing providers
export { ProviderFactory, type ProviderConfig, type ProviderName } from './factory';

// Convenience function to get configured provider instances
export const createDefaultProvider = async () => {
  const factory = ProviderFactory.getInstance();
  await factory.initializeDefaults();
  return factory.getRegistry().getPrimary();
};