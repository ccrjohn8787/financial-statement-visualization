# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based application designed to help investors visualize and interpret financial statements (10K, 10Q, and other SEC filings) from public companies. The primary goal is to reduce barriers to entry for investors by transforming complex financial documents into accessible, high signal-to-noise ratio visualizations and insights.

## Architecture

**Monorepo Structure:**
- `frontend/` - Next.js + TypeScript + Tailwind CSS
- `backend/` - Express + TypeScript + Prisma + PostgreSQL

**Key Technologies:**
- **Data Source**: SEC Company Facts JSON API (`https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json`)
- **Database**: PostgreSQL with normalized XBRL schema
- **Caching**: Redis with 24h TTL for parsed data
- **Job Queue**: BullMQ for background data ingestion
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

# Development
npm run dev  # Starts both frontend and backend

# Backend only
cd backend && npm run dev
cd backend && npm run worker  # Background job processor

# Database
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
2. Set up PostgreSQL database and update `DATABASE_URL`
3. Set up Redis and update `REDIS_URL`
4. Update `SEC_USER_AGENT` with your contact email

## API Endpoints

- `GET /api/companies/search?q={ticker}` - Company autocomplete
- `GET /api/companies/{ticker}/overview` - Dashboard metrics
- `GET /api/companies/{ticker}/metrics/{concept}` - Detailed charts
- `POST /api/companies/{ticker}/refresh` - Queue data refresh

## Data Ingestion

- Uses SEC Company Facts JSON API as primary source
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
- ✅ **Phase 1 Complete**: Foundation & Backend (Weeks 1-2)
- 🔄 **Phase 2 Active**: Frontend Development (Week 3) 
- 📋 **Phase 3 Planned**: Production Deployment (Week 4)
- 🚀 **Phase 4 Future**: Enhancement & Growth

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