# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**FinScope** - AI-Powered Financial Statement Visualization for Retail Investors

This is a next-generation web-based platform that transforms complex SEC financial filings into accessible, intelligent analysis using LLM technology. FinScope bridges the gap between oversimplified retail apps (Robinhood) and overwhelming professional tools (Bloomberg) by providing AI-powered insights that make fundamental analysis accessible to informed retail investors.

**Mission**: Make fundamental financial analysis accessible to retail investors without dumbing down the data.
**Vision**: Every retail investor can understand a company's financial health in under 3 minutes, with AI-powered depth and accuracy.

## Current Status (September 2025)

**🚀 FinScope MVP Development: AI-Powered Financial Analysis Platform**

**Target Launch**: October 23, 2025  
**Current Phase**: ✅ Sprint 1-3 Complete → 📋 Sprint 4 Ready to Begin

### **✅ Completed Implementation (Sprints 1-3)**
- ✅ **Enhanced Data Foundation**: 6 metrics with comprehensive validation system
- ✅ **AI Intelligence Integration**: Multi-provider LLM service with cost optimization  
- ✅ **FinScope UI Transformation**: Complete design system with Tailwind CSS 4.0
- ✅ **Data Quality Validation**: Smart normalization fixing API inconsistencies
- ✅ **Multi-Provider LLM Strategy**: Groq (primary), Mistral AI (scaling), OpenAI/Claude (premium)
- ✅ **Cost Optimization**: $0 development → $18/month MVP → $1,200/month growth

### **📋 Remaining Implementation (Sprints 4-5)**
- 📋 **Company Comparison**: Side-by-side analysis with AI competitive insights
- 📋 **Historical Trends**: 8-quarter analysis with pattern recognition  
- 📋 **Production Readiness**: 90% coverage with comprehensive testing

### **Key Differentiators**
1. **LLM Intelligence**: Reading SEC filings for hidden insights
2. **Dynamic Health Scoring**: Adaptive weights based on company context
3. **Dual Explanations**: Technical + simplified for every metric
4. **Comparative Analysis**: AI-powered competitive positioning
5. **Pattern Recognition**: Historical trend analysis with inflection points

## Architecture

**Monorepo Structure:**
- `frontend/` - Next.js 15 + TypeScript + Tailwind CSS
- `backend/` - Express + TypeScript + Prisma + PostgreSQL

**Key Technologies:**
- **Primary Data**: Finnhub API for comprehensive financial metrics
- **Supplemental Data**: SEC EDGAR API for narrative analysis and missing metrics
- **AI/LLM**: Multi-provider strategy optimized for cost and performance
- **Database**: PostgreSQL with normalized schema + LLM analysis tables
- **Caching**: Redis with aggressive LLM response caching (24h TTL)
- **Charts**: Recharts for data visualization and historical trends

## Enhanced Data Model

**Core Financial Data:**
- **Company**: Profile with industry, business model, maturity stage
- **Financial Facts**: 6 key metrics with data source tracking
- **Health Scores**: Dynamic scoring with adaptive weights
- **Comparison Data**: Cross-company analysis

**AI/LLM Integration:**
- **LLM Analysis**: Cached insights, explanations, and comparative analysis
- **Prompt Management**: Version-controlled prompts in `/docs/llm-prompts.md`
- **Data Source Logs**: Track Finnhub vs SEC vs calculated metrics

## Development Commands

```bash
# Install dependencies
npm install

# Development
npm run dev  # Starts both frontend and backend

# Alternative: Start servers individually
cd frontend && npm run dev  # Frontend: http://localhost:3000
cd backend && npx tsx src/minimal-index.ts  # Backend: http://localhost:3001

# Database
cd backend && npm run db:generate  # Generate Prisma client
cd backend && npm run db:push      # Push schema to database
cd backend && npm run db:migrate   # Run migrations

# Testing (Critical for AI-powered features)
npm run test           # Run all tests (90% coverage required)
npm run test:unit      # Unit tests (financial calculations, LLM integration)
npm run test:integration  # Integration tests (API endpoints, LLM services)
npm run test:watch     # Watch mode for development
npm run test:coverage  # Generate coverage reports
npm run test:llm       # LLM-specific quality tests

# Build & Deploy
npm run build    # Build both projects
npm run lint     # Lint all code
npm run type-check  # TypeScript checks
```

## LLM Strategy (Research-Based Implementation)

**Updated September 18, 2025** - Based on comprehensive LLM provider research

### **Multi-Provider Architecture**

FinScope uses a sophisticated multi-provider LLM strategy optimized for cost-effectiveness, performance, and reliability:

**Priority Order (Automatic Failover):**
1. **Groq** (Primary) - Ultra-fast inference, 1000 free requests/day
2. **Mistral AI** (Scaling) - Cost-effective production ($0.27/1M tokens)
3. **Ollama** (Privacy) - Free local deployment, unlimited usage
4. **OpenAI/Claude** (Premium) - Advanced reasoning for complex analysis
5. **Hugging Face** (Specialized) - Domain-specific financial models

### **Cost Optimization Strategy**

**Development Phase**: $0/month
- Groq free tier (1000 requests/day) + Ollama local deployment

**MVP Launch**: ~$18/month (10K requests/day)
- Groq free tier + Mistral AI overflow

**Growth Phase**: ~$1,200/month (100K requests/day)
- Mistral AI primary + Groq for real-time features

**Enterprise Scale**: $15K-30K/month
- Multi-provider with intelligent routing

### **Use Case Optimization**

- **Health Score Calculations**: Groq (speed) or Ollama (privacy)
- **Metric Explanations**: Mistral AI or Llama 3.2 (cost-effective)
- **Investment Insights**: Claude 3.5 Sonnet or GPT-4.1 (premium reasoning)
- **Real-time Queries**: Groq (ultra-fast inference)
- **Batch Processing**: Ollama (unlimited local processing)

### **Technical Implementation**

**Provider Configuration**: All providers configured with automatic failover
**Caching Strategy**: 24h TTL for LLM responses to minimize API calls
**Quality Assurance**: Cross-validation and confidence scoring
**Cost Tracking**: Real-time monitoring and optimization

## Environment Setup

1. Copy `backend/.env.example` to `backend/.env`
2. **Finnhub API Key**: Get from https://finnhub.io (primary data source)
3. **LLM Providers**: Configure based on strategy above (Groq recommended for free start)
4. **SEC User Agent**: Update with your contact email
5. **Database**: PostgreSQL for persistent storage
6. **Redis**: For LLM response caching (optional, uses in-memory fallback)

```bash
# Financial Data (Required)
FINNHUB_API_KEY="your_finnhub_key"
SEC_USER_AGENT="FinScope/1.0 (your@email.com)"

# LLM Providers (Recommended: Start with Groq + Ollama for zero cost)
GROQ_API_KEY="your_groq_key"        # Free tier: 1000 requests/day
MISTRAL_API_KEY="your_mistral_key"  # Production scaling: $0.27/1M tokens
OLLAMA_BASE_URL="http://localhost:11434"  # Local deployment

# Premium Providers (Optional)
OPENAI_API_KEY="your_openai_key"
ANTHROPIC_API_KEY="your_anthropic_key"

# Infrastructure
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."  # optional
```

### **Quick Start with Free LLMs**

1. **Install Ollama** (5 minutes):
   ```bash
   curl -fsSL https://ollama.ai/install.sh | sh
   ollama pull llama3.2:13b
   ```

2. **Get Groq API Key** (2 minutes):
   - Visit https://console.groq.com
   - Sign up for free 1000 requests/day

3. **Start FinScope**: Zero cost AI analysis ready!

**Total Setup Cost**: $0/month for full AI functionality

## API Endpoints

**Enhanced MVP Endpoints:**
- `GET /api/companies` - List of supported companies (Apple, Nvidia, Uber)
- `GET /api/company/{ticker}/overview` - Complete financial analysis with AI insights
- `GET /api/company/{ticker}/comparison?vs={ticker2}` - Side-by-side comparison
- `GET /api/company/{ticker}/trends?quarters=8` - Historical trend analysis
- `GET /api/company/{ticker}/health-score` - Dynamic health scoring details
- `GET /health` - System health check
- `GET /api/llm/status` - LLM service availability

**Response Format (Enhanced):**
```typescript
interface CompanyOverview {
  company: CompanyProfile;
  currentPrice: StockPrice;
  healthScore: DynamicHealthScore;
  contextBox: AIGeneratedContext;
  metrics: SixKeyMetrics[];
  aiInsights: LLMGeneratedInsight[];
  dataSourceLog: DataSourceTracking;
}
```

## Data Sources & AI Integration

**Primary Data Pipeline:**
1. **Finnhub API**: Real-time prices, financial metrics, industry data
2. **SEC EDGAR API**: Supplemental data and Management Discussion & Analysis
3. **LLM Processing**: AI analysis of quantitative + qualitative data
4. **Caching Layer**: 24h TTL for LLM responses, 12h for financial data

**LLM Integration Strategy:**
- **Conservative Approach**: LLM for explanations/insights, not calculations
- **Validation**: All AI outputs cross-checked against numerical data
- **Fallback**: Cached responses when LLM unavailable
- **Progressive Enhancement**: Site works without LLM, enhanced with it

## Testing Strategy (AI-Enhanced)

**Critical for AI Quality**: Comprehensive testing ensures both data accuracy and AI insight relevance.

**Financial Data Tests:**
- Unit tests for all 6 metric calculations (ROIC, D/E, etc.)
- Integration tests with Finnhub and SEC APIs
- Cross-validation against known correct values
- Data source tracking and logging accuracy

**LLM Quality Tests:**
- Insight relevance scoring for all 3 companies
- Explanation clarity validation (technical + simplified)
- Consistency testing across multiple runs
- Factual accuracy verification against quantitative data
- Prompt performance benchmarking

**Comparison & Trends Tests:**
- Side-by-side analysis accuracy
- Historical pattern recognition validation
- Inflection point detection accuracy
- Competitive positioning correctness

**Quality Gates:**
- 90% test coverage minimum
- All LLM prompts version-controlled
- Manual validation of AI insights for each company
- Performance testing (<5s for LLM analysis)

## Visual Development & Testing

### Design System

The project follows S-Tier SaaS design standards inspired by Stripe, Airbnb, and Linear. All UI development must adhere to:

- **Design Principles**: `/context/design-principles.md` - Comprehensive checklist for world-class UI
- **Component Library**: NextUI with custom Tailwind configuration

### Quick Visual Check

**IMMEDIATELY after implementing any front-end change:**

1. **Identify what changed** - Review the modified components/pages
2. **Navigate to affected pages** - Use `mcp__playwright__browser_navigate` to visit each changed view
3. **Verify design compliance** - Compare against `/context/design-principles.md`
4. **Validate feature implementation** - Ensure the change fulfills the user's specific request
5. **Check acceptance criteria** - Review any provided context files or requirements
6. **Capture evidence** - Take full page screenshot at desktop viewport (1440px) of each changed view
7. **Check for errors** - Run `mcp__playwright__browser_console_messages` ⚠️

This verification ensures changes meet design standards and user requirements.

### Comprehensive Design Review

For significant UI changes or before merging PRs, use the design review agent:

```bash
# Option 1: Use the slash command
/design-review

# Option 2: Invoke the agent directly
@agent-design-review
```

The design review agent will:

- Test all interactive states and user flows
- Verify responsiveness (desktop/tablet/mobile)
- Check accessibility (WCAG 2.1 AA compliance)
- Validate visual polish and consistency
- Test edge cases and error states
- Provide categorized feedback (Blockers/High/Medium/Nitpicks)

### Playwright MCP Integration

#### Essential Commands for UI Testing

```javascript
// Navigation & Screenshots
mcp__playwright__browser_navigate(url); // Navigate to page
mcp__playwright__browser_take_screenshot(); // Capture visual evidence
mcp__playwright__browser_resize(
  width,
  height
); // Test responsiveness

// Interaction Testing
mcp__playwright__browser_click(element); // Test clicks
mcp__playwright__browser_type(
  element,
  text
); // Test input
mcp__playwright__browser_hover(element); // Test hover states

// Validation
mcp__playwright__browser_console_messages(); // Check for errors
mcp__playwright__browser_snapshot(); // Accessibility check
mcp__playwright__browser_wait_for(
  text / element
); // Ensure loading
```

### Design Compliance Checklist

When implementing UI features, verify:

- [ ] **Visual Hierarchy**: Clear focus flow, appropriate spacing
- [ ] **Consistency**: Uses design tokens, follows patterns
- [ ] **Responsiveness**: Works on mobile (375px), tablet (768px), desktop (1440px)
- [ ] **Accessibility**: Keyboard navigable, proper contrast, semantic HTML
- [ ] **Performance**: Fast load times, smooth animations (150-300ms)
- [ ] **Error Handling**: Clear error states, helpful messages
- [ ] **Polish**: Micro-interactions, loading states, empty states

## When to Use Automated Visual Testing

### Use Quick Visual Check for:

- Every front-end change, no matter how small
- After implementing new components or features
- When modifying existing UI elements
- After fixing visual bugs
- Before committing UI changes

### Use Comprehensive Design Review for:

- Major feature implementations
- Before creating pull requests with UI changes
- When refactoring component architecture
- After significant design system updates
- When accessibility compliance is critical

### Skip Visual Testing for:

- Backend-only changes (API, database)
- Configuration file updates
- Documentation changes
- Test file modifications
- Non-visual utility functions

## Additional Context

always use byterover-retrive-knowledge tool to get the related context before any tasks
always use byterover-store-knowledge to store all the critical informations after sucessful tasks
- Design review agent configuration: `/.claude/agents/design-review-agent.md`
- Design principles checklist: `/context/design-principles.md`
- Custom slash commands: `/context/design-review-slash-command.md`

## LLM Prompt Management

**Centralized Prompts**: All LLM prompts maintained in `/docs/llm-prompts.md`

**Prompt Types:**
1. **Financial Insight Generation** - Hidden opportunity detection
2. **Metric Explanations** - Technical + simplified explanations
3. **Company Comparison** - Competitive positioning analysis
4. **Historical Trends** - Pattern recognition and inflection points
5. **Management Analysis** - SEC filing narrative extraction
6. **Dynamic Health Scoring** - Adaptive weight calculation
7. **Context Generation** - "What You Need to Know" summaries

**Quality Framework:**
- Version control for all prompts
- A/B testing for optimization
- Performance metrics (accuracy, consistency, relevance)
- Fallback prompts for edge cases

## Project Documentation

**FinScope Documentation Package:**
- `docs/finscope-product-spec.md` - Complete product definition
- `docs/finscope-design-system.md` - Visual language and AI components
- `docs/finscope-mvp-requirements.md` - Enhanced feature specifications
- `docs/finscope-technical-roadmap.md` - 5-week implementation plan
- `docs/finscope-overview.md` - Executive summary
- `docs/llm-prompts.md` - Centralized prompt library

**Implementation Status:**
- ✅ **Documentation Complete**: All specs finalized and aligned
- 🔄 **Ready for Implementation**: Sprint 1 (Enhanced Data Foundation) can begin
- 📋 **Sprint Plan**: 5-sprint implementation with incremental testing

**Current Sprint**: Not started
**Sprint Documentation**: `/docs/finscope-sprint-plan.md`

## Key Implementation Notes

**AI-First Approach:**
- LLM analysis as core differentiator from traditional financial tools
- Progressive enhancement: works without AI, enhanced with it
- Comprehensive prompt management and version control
- Quality assurance through extensive testing

**Data Quality:**
- Hybrid data strategy: Finnhub primary, SEC supplemental
- Source tracking for all metrics
- Real-time logging for debugging
- Fallback strategies for API failures

**Performance:**
- Aggressive LLM caching (24h TTL)
- Page load targets: <2s for all interfaces
- AI analysis targets: <5s for comprehensive insights
- Database optimization for complex queries

## Sprint Management & Documentation Requirements

**Sprint-Based Development:**
FinScope implementation follows a 5-sprint methodology with incremental testing and validation at each sprint completion.

**Sprint Documentation Protocol (CRITICAL):**
After each sprint completion, the following documents MUST be updated:

1. **`/docs/finscope-sprint-plan.md`** (Primary Sprint Tracker)
   - Mark completed tasks with ✅
   - Update timeline and any scope changes
   - Add sprint retrospective section
   - Document lessons learned and challenges
   - Update risk assessment for next sprint

2. **`/CLAUDE.md`** (This File)
   - Update **Current Sprint** status
   - Reflect completed achievements in **Implementation Status**
   - Update **Current Phase** description
   - Maintain accuracy of project state

3. **`/docs/roadmap.md`** (Overall Project Timeline)
   - Mark sprint milestones as completed
   - Update weekly progress tracking
   - Adjust timeline if scope changes occurred
   - Update success metrics and completion status

**Sprint Testing Requirements:**
Each sprint MUST include dedicated testing day(s) with:
- Unit tests for all new components
- Integration tests for new features
- Manual validation with stakeholders
- Performance testing against targets
- User experience validation
- Documentation of test results

**Sprint Demo Requirements:**
Each sprint concludes with demonstrable working functionality:
- Sprint 1: Enhanced 6-metric data in existing UI
- Sprint 2: AI features accessible via API and basic UI
- Sprint 3: Complete FinScope design with company switching
- Sprint 4: Advanced features fully integrated
- Sprint 5: Production-ready application

**Current Sprint Status:**
- **Sprint**: Sprint 1 - Enhanced Data Foundation (IN PROGRESS)
- **Started**: September 18, 2025
- **Goal**: 6-metric data pipeline for AAPL, NVDA, UBER
- **Last Updated**: September 18, 2025

## Development Priorities (Sprint-Based)

**Sprint 1**: Enhanced Data Foundation (6 metrics + data sources)
**Sprint 2**: AI Intelligence Integration (LLM + health scoring)
**Sprint 3**: FinScope UI Transformation (design system)
**Sprint 4**: Advanced AI Features (comparison + trends)
**Sprint 5**: Testing & Launch Preparation (production ready)

**Success Metrics:**
- Demo effectiveness for stakeholder alignment
- AI insight relevance and accuracy
- <3 minute company understanding time
- 100% data accuracy for all 3 companies
- Seamless company comparison functionality
- 90% test coverage with LLM quality validation

## Development Guidelines

**Financial Data Accuracy**: Every calculation must be unit tested and manually verified
**AI Quality**: All LLM outputs must be relevant, accurate, and consistently formatted
**Performance**: LLM responses cached aggressively, fallbacks always available
**Testing**: Comprehensive coverage of both traditional and AI features
**Documentation**: Keep `/docs/llm-prompts.md` updated with all prompt changes

---

**Project Vision**: Transform FinScope into the first AI-powered financial analysis platform that makes professional-grade fundamental analysis accessible to retail investors through intelligent, contextual insights.