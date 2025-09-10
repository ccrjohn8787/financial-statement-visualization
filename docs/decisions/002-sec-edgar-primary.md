# ADR-002: SEC EDGAR as Primary Data Source

**Date**: 2025-09-10  
**Status**: ✅ Accepted and Implemented  
**Research Input**: docs/research/financial-data-providers.md  

## Context

The application needs reliable, accurate financial data for investment decision-making. Multiple data provider options exist, from free SEC APIs to commercial financial data services. Data accuracy is critical since users will make investment decisions based on this information.

## Decision

**SEC EDGAR API will serve as the primary data source** for financial statements and official SEC filings, with commercial providers added later for enhanced features.

## Rationale

### SEC EDGAR Advantages
1. **Authoritative Source**: Official SEC filings with legally required accuracy
2. **Comprehensive XBRL Data**: Pre-parsed financial concepts with standardized taxonomy
3. **Free Access**: No cost barriers for MVP development and scaling
4. **Complete Coverage**: All public companies with 10+ years historical data
5. **Real-time Availability**: Data available immediately after SEC filing
6. **Standardized Format**: XBRL ensures consistent data structure across companies

### Commercial Provider Role
Commercial providers (Alpha Vantage, Financial Modeling Prep) will serve as **secondary sources** for:
- Real-time market data (stock prices, market cap)
- Peer comparison and industry analysis
- Pre-calculated financial ratios and metrics
- Enhanced data visualization features

## Implementation Details

### SEC EDGAR Usage
- **Primary endpoint**: `https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json`
- **Rate limiting**: 10 requests/second maximum, 100ms between requests
- **User-Agent**: Required with contact email per SEC guidelines
- **Error handling**: 404 for invalid CIK, 429 for rate limits
- **Data parsing**: Custom XBRL parser for fiscal period alignment

### Core Financial Concepts
Focus on key GAAP concepts for MVP:
- **Income Statement**: Revenues, NetIncomeLoss, OperatingIncomeLoss
- **Balance Sheet**: Assets, Liabilities, StockholdersEquity, CashAndCashEquivalents
- **Cash Flow**: NetCashProvidedByUsedInOperatingActivities

### Data Quality Measures
- **Fiscal period normalization**: Handle different fiscal year-ends
- **Unit standardization**: Convert to USD, normalize scales (thousands/millions)
- **Amendment handling**: Prefer latest 10-K/10-Q filings
- **Instant vs duration**: Proper handling of balance sheet vs income statement concepts

## Consequences

### Positive
- ✅ **Data accuracy**: Authoritative source reduces liability and improves trust
- ✅ **Cost efficiency**: Free access enables sustainable business model
- ✅ **Regulatory compliance**: Direct from SEC ensures compliance with financial regulations
- ✅ **Complete historical data**: 10+ years of data for trend analysis
- ✅ **Real-time updates**: New filings available immediately

### Negative
- ⚠️ **Rate limits**: 10 req/s may limit real-time user experience
- ⚠️ **No market data**: Stock prices and market cap require additional sources
- ⚠️ **Complex parsing**: XBRL data requires sophisticated normalization
- ⚠️ **No peer analysis**: Industry comparisons require additional logic

### Mitigation Strategies
- **Caching**: 24-hour cache for parsed financial data
- **Background processing**: Use job queues for data ingestion
- **Hybrid approach**: Add commercial providers for missing features
- **Rate limit management**: Request coalescing and exponential backoff

## Performance Considerations

### Caching Strategy
- **Company metadata**: Cache for 7 days
- **Financial metrics**: Cache for 24 hours
- **Latest quarterly data**: Cache for 6 hours
- **Cache invalidation**: Manual refresh option for users

### Background Processing
- **Nightly refresh**: Update all tracked companies
- **On-demand ingestion**: Process new companies when requested
- **Batch processing**: Group requests to respect rate limits
- **Error recovery**: Retry failed ingestions with exponential backoff

## Compliance and Legal

### SEC API Guidelines
- ✅ **User-Agent requirement**: Implemented with contact email
- ✅ **Rate limiting respect**: 10 req/s maximum enforced
- ✅ **Fair use**: Reasonable usage patterns for educational/investment purposes
- ✅ **Data attribution**: Source attribution in UI

### Data Accuracy Standards
- ✅ **Source tracking**: Every metric tagged with filing accession number
- ✅ **Amendment handling**: Latest filings take precedence
- ✅ **Audit trail**: Full provenance tracking for financial data
- ✅ **Disclaimer**: "Not investment advice" prominent in UI

## Monitoring and Reliability

### Health Checks
- SEC API availability monitoring
- Data freshness tracking (filing age)
- Rate limit consumption monitoring
- Error rate tracking and alerting

### Fallback Strategy
- Local cache serving during SEC API outages
- Graceful degradation with stale data warnings
- Manual data refresh capabilities
- Commercial provider fallback for critical features

## Future Evolution

### Phase 1 (Current): SEC EDGAR Only
- Official filings and XBRL data
- Core financial metrics
- Historical trend analysis

### Phase 2: Hybrid Approach
- SEC EDGAR for official filings
- Financial Modeling Prep for peer analysis
- Alpha Vantage for real-time market data

### Phase 3: Enterprise Features
- Multiple commercial providers
- Real-time data streaming
- Advanced analytics and ratios

## Related Decisions
- [ADR-001: Data Provider Abstraction](./001-data-provider-abstraction.md)
- [ADR-003: Contract Testing Strategy](./003-testing-strategy.md)

## Implementation Status
- ✅ SEC EDGAR provider implemented
- ✅ XBRL parsing with fiscal period alignment
- ✅ Rate limiting and error handling
- ✅ Caching and background processing
- ✅ Contract testing for data quality