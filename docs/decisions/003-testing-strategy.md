# ADR-003: Contract Testing Strategy for Financial Data

**Date**: 2025-09-10  
**Status**: ✅ Accepted and Implemented  
**Research Input**: docs/research/financial-data-providers.md  

## Context

Financial data accuracy is critical for investment decision-making. The application uses multiple data providers (current: SEC EDGAR, future: commercial APIs), and each provider may format data differently. We need a comprehensive testing strategy to ensure data consistency, accuracy, and reliability across all providers.

## Decision

Implement a **contract testing strategy** that ensures all data providers conform to standardized interfaces and return consistent, accurate financial data.

## Testing Architecture

### 1. Contract Tests
**Purpose**: Ensure all providers implement the interface correctly and return valid data

```typescript
// Example contract test structure
describe('Financial Data Provider Contract', () => {
  providers.forEach(([name, provider]) => {
    describe(`${name} Provider`, () => {
      it('should return valid company metadata schema', async () => {
        const result = CompanyMetadataSchema.safeParse(metadata);
        expect(result.success).toBe(true);
      });
      
      it('should return consistent financial data format', async () => {
        const result = FinancialDataSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });
  });
});
```

### 2. Schema Validation
**Purpose**: Validate data structure consistency using Zod schemas

**Core Schemas**:
- `CompanyMetadataSchema`: Company information (CIK, ticker, name, SIC)
- `FinancialMetricSchema`: Individual financial metrics with periods
- `FinancialDataSchema`: Complete financial dataset
- `ProviderCapabilitiesSchema`: Provider feature matrix

### 3. Data Accuracy Tests
**Purpose**: Verify financial calculations and data integrity

**Test Categories**:
- **Known values**: Test with companies having verified public data (AAPL, MSFT)
- **Mathematical consistency**: Revenue ≥ Net Income, Assets = Liabilities + Equity
- **Fiscal period alignment**: Quarterly data sums to annual data
- **Unit consistency**: All monetary values in same currency/scale

### 4. Error Handling Tests
**Purpose**: Ensure consistent error responses across providers

**Error Scenarios**:
- Invalid CIK (should return `DataNotFoundError`)
- Rate limit exceeded (should return `RateLimitError` with retry info)
- Network failures (should return `DataProviderError` with retry flag)
- Malformed responses (should validate and reject)

## Implementation Details

### Test Organization
```
src/providers/
├── contract.test.ts          # Cross-provider contract tests
├── sec-edgar.test.ts         # SEC EDGAR specific tests
├── providers.integration.test.ts  # Real API integration tests
└── mock-data/
    ├── apple-10k.json        # Known good test data
    ├── microsoft-10q.json    # Quarterly test data
    └── error-responses.json  # Error scenario test data
```

### Test Data Management
- **Static test data**: Known financial statements for repeatability
- **Dynamic test data**: Real API calls for integration tests (opt-in)
- **Mock responses**: Controlled error scenarios and edge cases
- **Golden datasets**: Verified financial data for accuracy testing

### Test Execution Strategy

#### Unit Tests (Always Run)
- Mock all external API calls
- Focus on business logic and data transformation
- Fast execution (< 1 second total)
- Run on every commit

#### Integration Tests (Opt-in)
- Real API calls to providers
- Longer timeouts for network requests
- Run before releases and during CI/CD
- Configurable via environment variables

```bash
# Unit tests only (default)
npm run test:unit

# Include integration tests
NODE_ENV=integration npm run test:integration
```

## Quality Gates

### 1. Data Accuracy Requirements
- ✅ **Schema compliance**: 100% of provider responses must pass schema validation
- ✅ **Mathematical consistency**: Financial statements must balance
- ✅ **Known value verification**: Test data must match published SEC filings
- ✅ **Fiscal period alignment**: Quarterly data must sum to annual data (within rounding)

### 2. Provider Reliability Requirements
- ✅ **Health check**: All providers must implement working health checks
- ✅ **Error handling**: Consistent error types across all providers
- ✅ **Rate limiting**: Providers must respect their documented rate limits
- ✅ **Timeout handling**: Graceful handling of slow responses

### 3. Performance Requirements
- ✅ **Response time**: Provider calls must complete within 30 seconds
- ✅ **Cache effectiveness**: Cache hit ratio > 80% for repeated requests
- ✅ **Error recovery**: Failed requests must retry with exponential backoff

## Test Data Sources

### Reference Companies
- **Apple (CIK: 0000320193)**: Complex multinational with clear financials
- **Microsoft (CIK: 0000789019)**: Different fiscal year end (June)
- **Amazon (CIK: 0001018724)**: High revenue, low margin business model
- **Berkshire Hathaway (CIK: 0001067983)**: Insurance/investment company structure

### Edge Cases
- **Fiscal year variations**: Companies with non-December year ends
- **Restatements**: Companies that have filed amendments (10-K/A, 10-Q/A)
- **Currency variations**: International companies reporting in USD
- **Scale variations**: Companies reporting in thousands vs millions

## Monitoring and Alerting

### Test Metrics
- **Contract test success rate**: Should be 100%
- **Data accuracy test success rate**: Should be 100%
- **Integration test reliability**: Should be > 95%
- **Provider response time**: Track and alert on degradation

### Continuous Monitoring
- **Daily provider health checks**: Automated monitoring of all providers
- **Data freshness alerts**: Alert when data becomes stale
- **Schema drift detection**: Alert when provider responses change structure
- **Financial data anomaly detection**: Alert on suspicious data patterns

## Implementation Status

### ✅ Completed
- Contract test framework with 15 test cases
- Schema validation using Zod
- SEC EDGAR provider contract tests
- Mock data infrastructure
- Error handling standardization

### 🔄 In Progress
- Integration test suite for real API calls
- Golden dataset creation for accuracy testing
- Performance benchmarking framework

### 📋 Planned
- Commercial provider contract tests (when added)
- Automated anomaly detection
- Cross-provider data consistency tests
- Load testing for rate limit validation

## Benefits Realized

### Data Quality Assurance
- **Early error detection**: Schema validation catches provider changes
- **Consistent interfaces**: All providers conform to same contract
- **Financial accuracy**: Mathematical consistency checks prevent bad data
- **Audit trail**: Full test coverage for regulatory compliance

### Development Velocity
- **Safe refactoring**: Contract tests enable confident code changes
- **Provider swapping**: Easy to replace providers without breaking changes
- **Regression prevention**: Tests catch breaking changes immediately
- **Documentation**: Tests serve as living documentation of provider behavior

## Related Decisions
- [ADR-001: Data Provider Abstraction](./001-data-provider-abstraction.md)
- [ADR-002: SEC EDGAR as Primary Source](./002-sec-edgar-primary.md)

## Future Enhancements
- Property-based testing for edge case discovery
- Mutation testing for test suite completeness
- Cross-provider data consistency validation
- Real-time monitoring dashboard for test metrics