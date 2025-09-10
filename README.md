# Financial Statement Visualization Platform

A comprehensive web-based application for visualizing and analyzing financial statements from public companies. Transform complex SEC filings (10K, 10Q) into accessible, high signal-to-noise ratio visualizations and insights for investors.

## 🚀 Current Status: Real Data Integration Complete

**✅ Working Features:**
- Real-time financial data via Finnhub API
- Company search with live results
- Financial metrics dashboard (Revenue, Net Income, Market Cap, P/E Ratio)
- Responsive Next.js frontend with TypeScript
- Express backend with data provider abstraction

**🔄 In Development:**
- SEC EDGAR 10K/10Q integration
- 50+ financial ratio calculations  
- Historical trend analysis
- Peer company comparisons
- Multi-format data export (CSV, Excel, PDF)

## 📊 Live Demo Data

**Example: NVIDIA (NVDA)**
- Revenue: $164.3B (71.55% YoY growth)
- Net Income: $85.7B  
- Market Cap: $4.15T
- P/E Ratio: 47.9
- Source: Live Finnhub API

## 🏗️ Architecture

**Frontend:** Next.js 15 + TypeScript + Tailwind CSS  
**Backend:** Express + TypeScript + Prisma + PostgreSQL  
**Data Sources:** Finnhub API, SEC EDGAR (planned)  
**Caching:** Redis with in-memory fallback  
**Charts:** Recharts for data visualization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL (optional for development)
- Redis (optional, falls back to in-memory cache)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/ccrjohn8787/financial-statement-visualization.git
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
   
   # Get your free Finnhub API key from https://finnhub.io
   # Add it to backend/.env:
   FINNHUB_API_KEY="your_finnhub_api_key_here"
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

5. **Test the application**
   - Open http://localhost:3000 in your browser
   - Search for any stock ticker (e.g., "NVDA", "AAPL", "MSFT")
   - View real financial data from Finnhub API

## 📋 Development Roadmap

See [Next Sprint Plan](docs/next-sprint-plan.md) for the comprehensive 5-week development roadmap to transform this into a full financial analysis platform.

### Phase 1: SEC Financial Statements (Week 1)
- [ ] SEC EDGAR API integration
- [ ] XBRL data parsing
- [ ] Complete income statement, balance sheet, cash flow
- [ ] Historical data (8 quarters + 5 years)

### Phase 2: Advanced Analysis (Week 2)
- [ ] 50+ financial ratios (profitability, liquidity, leverage, efficiency)
- [ ] Trend analysis with growth rates
- [ ] Performance scoring and health metrics

### Phase 3: Peer Comparison (Week 3)
- [ ] Industry benchmarking using SIC codes
- [ ] Relative valuation metrics
- [ ] Side-by-side peer analysis

### Phase 4: Export & Visualization (Week 4)
- [ ] Multi-format exports (CSV, Excel, PDF, JSON)
- [ ] Advanced interactive charts
- [ ] Professional financial reports

### Phase 5: Production Ready (Week 5)
- [ ] Performance optimization and caching
- [ ] Automated data pipelines
- [ ] Production deployment

## 🔧 API Endpoints

### Company Search
```bash
GET /api/companies/search?q=NVDA
```

### Company Overview
```bash
GET /api/companies/NVDA/overview
```

### Health Check
```bash
GET /health
```

## 🏢 Use Cases

**For Individual Investors:**
- Research fundamentals before stock purchases
- Track portfolio companies' financial health
- Compare companies within same industry
- Export data for personal analysis

**For Financial Analysts:**
- Quick company screening and analysis
- Historical trend analysis
- Peer group comparisons
- Professional report generation

**For Students & Educators:**
- Learn financial statement analysis
- Understand financial ratios and metrics
- Practice investment research skills
- Visualize complex financial concepts

## 🤝 Contributing

This project is actively under development. See our [development plan](docs/next-sprint-plan.md) for areas where contributions would be most valuable.

**Key Areas for Contribution:**
- SEC EDGAR integration and XBRL parsing
- Financial ratio calculations and validations
- UI/UX improvements for data visualization
- Test coverage for financial calculations
- Performance optimization

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## ⚠️ Disclaimer

This application provides financial data for educational and informational purposes only. It should not be considered as investment advice. Always consult with qualified financial professionals before making investment decisions.
