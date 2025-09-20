# FinScope - AI-Powered Financial Statement Visualization

**Transform complex SEC filings into 3-minute intelligent insights for retail investors**

FinScope is a next-generation financial analysis platform that bridges the gap between oversimplified retail apps (Robinhood) and overwhelming professional tools (Bloomberg) by leveraging LLM technology to make fundamental analysis accessible, intelligent, and actionable.

## 🚀 FinScope MVP: Bloomberg Terminal Style Financial Analysis

**🎯 Mission**: Make fundamental financial analysis accessible to retail investors without dumbing down the data
**🔬 Vision**: Every retail investor can understand a company's financial health in under 3 minutes
**📅 Status**: ✅ **MVP COMPLETE** - Ready for production deployment

### ✨ **Current MVP Features**
- 🏢 **Multi-Company Analysis**: Apple (A+ grade), NVIDIA (A grade), Uber (B+ grade)
- 📊 **6 Core Financial Metrics**: ROIC, Debt-to-Equity, P/E, Revenue Growth, Current Ratio, Gross Margin
- 🎨 **Bloomberg Terminal UI**: Professional dark theme with monospace financial typography
- ⚡ **Dynamic Data Loading**: Each company shows completely unique financial data
- 📈 **Health Visualization**: Color-coded performance grades with visual health gauge
- 🔄 **Real-time Switching**: Instant transitions between companies with loading states

## 🏗️ Enhanced Architecture

**Monorepo Structure:**
- `frontend/` - Next.js 15 + TypeScript + Tailwind CSS
- `backend/` - Express + TypeScript + Prisma + PostgreSQL

**MVP Technology Stack:**
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS 3.4.1
- **UI Framework**: Custom Bloomberg Terminal inspired design system
- **Data Layer**: Static company data with dynamic loading via React useMemo
- **Testing**: Vitest + Playwright with 20+ tests ensuring data integrity
- **Typography**: SF Mono/Monaco/Consolas for all financial numbers
- **State Management**: React hooks with efficient re-rendering
- **Build System**: Turbopack for fast development iteration

## 🎯 MVP Demo Companies

**Apple (AAPL)** - Mature tech with services transition  
**Nvidia (NVDA)** - High-growth AI semiconductor leader  
**Uber (UBER)** - Platform business with operational leverage

*Each company showcases different financial profiles and AI analysis capabilities*

## 📊 Six Core Financial Metrics (MVP Implementation)

### 1. **Return on Invested Capital (ROIC)**
- **Apple**: 28.5% - Exceptional capital efficiency
- **NVIDIA**: 47.2% - AI boom driving superior returns
- **Uber**: 8.4% - Platform scaling improving efficiency

### 2. **Debt-to-Equity Ratio**
- **Apple**: 0.31x - Conservative debt management
- **NVIDIA**: 0.22x - Minimal leverage, strong balance sheet
- **Uber**: 0.89x - Higher leverage, improving trends

### 3. **Price-to-Earnings Ratio**
- **Apple**: 29.2x - Premium valuation for stable growth
- **NVIDIA**: 65.4x - Growth premium reflecting AI leadership
- **Uber**: 42.8x - Platform business commanding premium

### 4. **Revenue Growth (YoY)**
- **Apple**: 15.8% - Steady growth across all segments
- **NVIDIA**: 126.0% - Explosive AI-driven revenue growth
- **Uber**: 22.4% - Platform scaling with improved unit economics

### 5. **Current Ratio**
- **Apple**: 1.93x - Healthy short-term liquidity
- **NVIDIA**: 3.45x - Strong cash position for R&D investment
- **Uber**: 1.14x - Adequate liquidity for operations

### 6. **Gross Margin**
- **Apple**: 43.2% - Strong pricing power and operational efficiency
- **NVIDIA**: 73.0% - Best-in-class margins from AI chip dominance
- **Uber**: 31.8% - Improving platform economics

## 🤖 AI-Powered Features

### **Intelligent Insights Panel**
```
🎯 Hidden Opportunity: Services Monetization
While investors focus on iPhone sales, services revenue quietly became 22% 
of total revenue with 70% margins. Apple is successfully transitioning from 
hardware dependence to recurring revenue streams.

Evidence: • 8 quarters of double-digit growth • 1B+ paid subscribers
```

### **Dynamic Health Scoring**
- Adaptive weights based on:
  - Company maturity stage (growth vs mature)
  - Industry characteristics (tech vs utilities)
  - Economic environment (rising rates, inflation)
  - Business model (platform vs manufacturing)

### **Company Comparison**
```
📊 Apple vs Nvidia vs Uber

Profitability:  26.3%    73.0%    -8.2%
Growth:         4.9%     126.0%   15.8%
Cash Flow:      $99B     $28B     $2.1B

🤖 AI Analysis: "Apple dominates profitability and cash generation, 
Nvidia leads in growth and innovation premium, Uber shows operational 
leverage improving as platform scales."
```

### **Historical Pattern Recognition**
- 8-quarter trend analysis with AI-identified inflection points
- "Consistent margin expansion for 6 quarters until Q2 2024 when supply chain normalization reduced margins"

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis (optional, falls back to in-memory cache)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/financial-statement-visualization.git
   cd financial-statement-visualization
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy example environment file
   cp backend/.env.example backend/.env
   
   # Required API keys:
   FINNHUB_API_KEY="your_finnhub_key"        # Get from https://finnhub.io
   OPENAI_API_KEY="your_openai_key"          # For AI analysis
   # or ANTHROPIC_API_KEY="your_claude_key"  # Alternative LLM
   
   DATABASE_URL="postgresql://..."
   REDIS_URL="redis://..."                    # Optional
   SEC_USER_AGENT="FinScope/1.0 (your@email.com)"
   ```

4. **Start development servers**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start individually:
   # Frontend: http://localhost:3000
   cd frontend && npm run dev
   
   # Backend: http://localhost:3001  
   cd backend && npx tsx src/minimal-index.ts
   ```

5. **Test the AI-powered analysis**
   - Open http://localhost:3000
   - Select Apple, Nvidia, or Uber
   - Experience AI-generated insights and explanations
   - Try company comparison and historical trends

## 🛣️ 5-Week Implementation Roadmap

### **Week 1: Enhanced Data Foundation**
- Enhanced Finnhub integration for 6 metrics
- Supplemental SEC EDGAR for missing data
- Data source tracking and logging

### **Week 2: AI Intelligence Integration**
- LLM service integration (OpenAI/Claude)
- Dynamic health scoring algorithm
- AI-powered metric explanations

### **Week 3: Advanced Features**
- Company comparison with AI analysis
- Intelligent insights generation
- FinScope-style frontend implementation

### **Week 4: Historical Intelligence**
- 8-quarter trend analysis
- Pattern recognition and inflection points
- Performance optimization

### **Week 5: Launch Preparation**
- Comprehensive testing (90% coverage)
- LLM quality validation
- Production deployment readiness

## 🧪 Testing Strategy (AI-Enhanced)

**Financial Data Accuracy:**
```bash
npm run test:unit          # Financial calculations
npm run test:integration   # API endpoints
npm run test:llm          # LLM quality validation
```

**LLM Quality Assurance:**
- Insight relevance scoring
- Explanation clarity validation
- Factual accuracy verification
- Consistency across companies
- Performance benchmarking (<5s analysis)

## 📋 API Endpoints (Enhanced)

### Company Overview with AI
```bash
GET /api/company/AAPL/overview
# Returns: 6 metrics + AI insights + health score + context
```

### Company Comparison
```bash
GET /api/compare?companies=AAPL,NVDA,UBER
# Returns: Side-by-side analysis + AI competitive insights
```

### Historical Trends
```bash
GET /api/company/AAPL/trends?quarters=8
# Returns: 8-quarter data + pattern recognition + inflection points
```

### LLM Service Status
```bash
GET /api/llm/status
# Returns: AI service availability and performance metrics
```

## 🎯 Use Cases

**For Informed Retail Investors:**
- Research fundamentals before stock purchases
- Understand company financial health in 3 minutes
- Get AI-powered insights on hidden opportunities
- Compare companies with intelligent analysis

**For Financial Educators:**
- Teach fundamental analysis with AI explanations
- Show both technical and simplified explanations
- Demonstrate pattern recognition in real data

**For Investment Analysts:**
- Quick company screening with AI insights
- Competitive positioning analysis
- Historical trend pattern recognition

## 🔒 AI Quality & Transparency

**LLM Prompt Management:**
- All prompts centralized in `/docs/llm-prompts.md`
- Version controlled and A/B tested
- Performance monitoring and optimization

**Quality Assurance:**
- Confidence scoring for all AI insights
- Factual accuracy verification
- Fallback to cached analysis when needed
- Clear AI attribution and transparency

## 🤝 Contributing

This project is actively developing the next generation of AI-powered financial analysis. Key areas for contribution:

- **LLM Integration**: Prompt optimization and quality validation
- **Financial Calculations**: New metric implementations and testing
- **AI Testing**: LLM output quality assurance
- **Performance**: Caching strategies and optimization
- **UI/UX**: FinScope design system implementation

## 📄 Project Documentation

**Complete FinScope Documentation:**
- [`docs/finscope-overview.md`](docs/finscope-overview.md) - Executive summary
- [`docs/finscope-product-spec.md`](docs/finscope-product-spec.md) - Product definition
- [`docs/finscope-mvp-requirements.md`](docs/finscope-mvp-requirements.md) - Technical specifications
- [`docs/finscope-design-system.md`](docs/finscope-design-system.md) - Visual design language
- [`docs/finscope-technical-roadmap.md`](docs/finscope-technical-roadmap.md) - Implementation timeline
- [`docs/llm-prompts.md`](docs/llm-prompts.md) - AI prompt library
- [`CLAUDE.md`](CLAUDE.md) - Development guidelines

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

FinScope provides financial data and AI-generated analysis for educational and informational purposes only. AI insights should not be considered as investment advice. Always consult with qualified financial professionals before making investment decisions. 

**AI Transparency**: All AI-generated content is clearly marked and includes confidence indicators. LLM analysis is supplemental to quantitative financial data.