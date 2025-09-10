# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based application designed to help investors visualize and interpret financial statements (10K, 10Q, and other SEC filings) from public companies. The primary goal is to reduce barriers to entry for investors by transforming complex financial documents into accessible, high signal-to-noise ratio visualizations and insights.

## Current Status (September 2025)

**✅ Phase 4 Complete: Real Data Integration**
- Finnhub API integration with live financial data
- Working company search and overview dashboard
- Real financial metrics: Revenue, Net Income, Market Cap, P/E Ratio
- Proper data scaling and unit handling
- Frontend/backend communication established

**🔄 Next Sprint: Comprehensive Financial Platform**
- See `docs/next-sprint-plan.md` for detailed 5-week roadmap
- Focus: SEC EDGAR integration, 50+ financial ratios, peer comparison
- Transform from basic viewer to professional analysis platform

## Architecture

**Monorepo Structure:**
- `frontend/` - Next.js + TypeScript + Tailwind CSS
- `backend/` - Express + TypeScript + Prisma + PostgreSQL

**Key Technologies:**
- **Data Sources**: 
  - Finnhub API (currently active - real financial data)
  - SEC EDGAR API (planned - official 10K/10Q filings)
- **Database**: PostgreSQL with normalized XBRL schema
- **Caching**: Redis with in-memory fallback for development
- **Job Queue**: BullMQ for background data ingestion (planned)
- **Charts**: Recharts for data visualization

## Data Model

The application uses a normalized XBRL schema:

- **Company**: Core company info (CIK, ticker, name, SIC)
- **Fact**: Raw XBRL facts with proper fiscal period alignment
- **MetricView**: Materialized view for fast dashboard queries

Key XBRL concepts handled: `Revenues`, `NetIncomeLoss`, `CashAndCashEquivalentsAtCarryingValue`, `LongTermDebtNoncurrent`

## Development Commands

```bash
# Install dependencies
npm install

# Development (with real data)
npm run dev  # Starts both frontend and backend

# Alternative: Start servers individually
cd frontend && npm run dev  # Frontend: http://localhost:3000
cd backend && npx tsx src/minimal-index.ts  # Backend: http://localhost:3001 (real data)

# Backend development options
cd backend && npm run dev        # Full backend (complex, may have issues)
cd backend && npx tsx src/minimal-index.ts  # Minimal working server (recommended)

# Database (optional for current development)
cd backend && npm run db:generate  # Generate Prisma client
cd backend && npm run db:push      # Push schema to database
cd backend && npm run db:migrate   # Run migrations

# Testing
npm run test           # Run all tests
npm run test:unit      # Unit tests only
npm run test:integration  # Integration tests only
npm run test:watch     # Watch mode for development
npm run test:coverage  # Generate coverage reports

# Build & Deploy
npm run build    # Build both projects
npm run lint     # Lint all code
npm run type-check  # TypeScript checks
```

## Environment Setup

1. Copy `backend/.env.example` to `backend/.env`
2. **Get Finnhub API key** from https://finnhub.io (free tier available)
3. Add `FINNHUB_API_KEY="your_key_here"` to `backend/.env`
4. Set up PostgreSQL database and update `DATABASE_URL` (optional for development)
5. Set up Redis and update `REDIS_URL` (optional - uses in-memory fallback)
6. Update `SEC_USER_AGENT` with your contact email (for future SEC integration)

## API Endpoints

**Current Endpoints (Working)**:
- `GET /api/companies/search?q={ticker}` - Company autocomplete via Finnhub
- `GET /api/companies/{ticker}/overview` - Financial metrics dashboard
- `GET /health` - Health check for backend services
- `GET /api/docs` - API documentation

**Planned Endpoints** (Next Sprint):
- `GET /api/companies/{ticker}/financials` - Full financial statements
- `GET /api/companies/{ticker}/ratios` - Comprehensive ratio analysis
- `POST /api/companies/{ticker}/refresh` - Queue data refresh

## Data Sources & Integration

**Current (Working)**:
- **Finnhub API**: Real-time financial data, company profiles, basic metrics
- Proper data scaling and unit handling (millions/billions)
- Fallback to sample data for reliability
- Rate limiting and error handling

**Planned (Next Sprint)**:
- **SEC Company Facts JSON API**: Official 10K/10Q filings as primary source
- Rate limited to ≤10 req/s with proper User-Agent
- Background worker processes ingestion jobs
- Handles fiscal period alignment and XBRL unit normalization
- HTML parsing as fallback for missing concepts

## Testing Strategy

**Critical for Data Quality**: Given the importance of financial data accuracy, comprehensive testing is mandatory.

**Unit Tests**:
- SEC API client functions (rate limiting, error handling, data parsing)
- XBRL data normalization and fiscal period alignment
- Mathematical calculations (margins, growth rates, ratios)
- Data validation and schema compliance

**Integration Tests**:
- End-to-end data ingestion pipeline (SEC API → Database)
- API endpoint responses with real company data
- Database query performance and accuracy
- Cache behavior and invalidation

**Test Data**:
- Use known companies with verified financial data (AAPL, MSFT)
- Mock SEC API responses for edge cases
- Test fiscal year-end variations and amendments
- Validate peer comparison calculations

**Quality Gates**:
- All financial calculations must have unit tests
- API endpoints require integration tests
- No deployment without 90%+ test coverage
- Manual verification against SEC filings for sample companies

## Research and Documentation System

The project uses specialized research agents and structured documentation:

**Research Communication**:
- `docs/communication/agent-handoffs.md` - Active communication between agents
- `docs/communication/research-requests.md` - Pending and completed research requests
- Research findings documented in `docs/research/` with version control

**Architecture Decisions**:
- `docs/decisions/` - Architecture Decision Records (ADRs) based on research
- Each ADR links to supporting research and tracks implementation status
- Decision rationale preserved for future reference

**Current Project Status**:
- ✅ **MVP Complete**: Real data integration with Finnhub API working
- ✅ **Core Features**: Company search, financial metrics dashboard, responsive frontend
- ✅ **Data Quality**: Fixed scaling issues, displaying accurate billions/trillions
- 📋 **Next Sprint**: SEC EDGAR integration for comprehensive financial statements (see docs/next-sprint-plan.md)
- 🚀 **Future**: Advanced analysis, peer comparison, multi-format exports

**Research Status**:
- ✅ Financial data providers analysis complete (financial-data-researcher agent)
- 📋 UI/UX design patterns research pending
- 📋 Database optimization research pending
- 📋 Security and compliance research pending

**Project Management**:
- 📊 Comprehensive roadmap: [docs/roadmap.md](docs/roadmap.md)
- 🔄 Weekly progress tracking and milestone reviews
- 📈 Success metrics and risk assessment framework

## Key Implementation Notes

- **Data Provider Abstraction**: Clean separation with contract testing (ADR-001)
- **SEC EDGAR Primary**: Authoritative source with commercial provider support (ADR-002)  
- **Contract Testing**: Comprehensive data quality assurance (ADR-003)
- **Fiscal Periods**: Handles instant vs duration concepts properly
- **Data Quality**: Prefers latest filings, handles amendments
- **Performance**: Materialized views for dashboard queries
- **Reliability**: Circuit breaker pattern for SEC API calls
- **Compliance**: Includes "not investment advice" disclaimer