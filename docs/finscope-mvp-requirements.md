# FinScope - MVP Requirements
**Detailed Feature Specifications for Week 1 Launch**

*Date: September 18, 2025*  
*Version: 1.0*  
*Target: Demo-ready MVP*

---

## MVP Scope Definition

### What We're Building
A focused financial dashboard that makes any company's financial health understandable in 2-3 minutes, starting with Apple (AAPL) as the primary demo.

### What We're NOT Building (V1)
- ❌ Watchlists or portfolio tracking
- ❌ Data export functionality
- ❌ User accounts or authentication
- ❌ Alert systems
- ❌ Native mobile app (responsive web only)
- ❌ Real-time alerts
- ❌ Portfolio management tools

### What We ARE Building (Enhanced MVP)
- ✅ **AI-Powered Insights**: LLM-generated financial analysis
- ✅ **Company Comparison**: Side-by-side analysis of Apple vs Nvidia vs Uber
- ✅ **Historical Trends**: 8-quarter trend analysis with pattern recognition
- ✅ **Dynamic Health Scoring**: Adaptive weights based on company context
- ✅ **Intelligent Explanations**: Both technical and simplified explanations
- ✅ **Management Analysis**: SEC filing narrative extraction

---

## Core User Stories

### Primary User Journey
**As a retail investor**, I want to quickly understand Apple's financial health before investing, so I can make an informed decision without reading a 50-page 10-K filing.

**Acceptance Criteria:**
- [ ] I can search for "AAPL" and get results in <2 seconds
- [ ] I see an overall financial health grade (A+ to F) immediately
- [ ] I understand the 4 most important financial metrics in plain English
- [ ] I can see what's changed since last quarter
- [ ] The entire analysis takes me 2-3 minutes to complete
- [ ] I feel confident about Apple's financial strength or weakness

### Supporting User Stories

**Company Overview**
- [ ] As a user, I can see Apple's current stock price and daily change
- [ ] As a user, I can see a one-sentence summary of Apple's financial health
- [ ] As a user, I can read a plain English explanation of what Apple does

**Financial Metrics**
- [ ] As a user, I can see Apple's profitability with context about what it means
- [ ] As a user, I can see Apple's growth rate compared to inflation/industry
- [ ] As a user, I can see Apple's cash generation with relatable comparisons
- [ ] As a user, I can see Apple's valuation with "years of rent" analogies

**Change Analysis**
- [ ] As a user, I can see what improved from last quarter (green highlights)
- [ ] As a user, I can see what declined from last quarter (red highlights)
- [ ] As a user, I can understand why these changes matter

**Educational Content**
- [ ] As a user, I can hover on any metric to get a plain English explanation
- [ ] As a user, I can understand industry context for each metric
- [ ] As a user, I can see visual trends (charts) for each key metric

---

## Feature Requirements

### 1. Company Header Section

**Visual Elements:**
```
Apple Inc. AAPL          $189.46 +2.34 (+1.25%)
```

**Data Requirements:**
- Company name (from SEC filings)
- Ticker symbol
- Current stock price (real-time or 15-min delayed)
- Daily price change ($ amount and %)
- Color coding: Green for positive, red for negative change

**Technical Specs:**
- Update frequency: Every 15 minutes during market hours
- Data source: Finnhub API for stock price
- Fallback: Show last known price if API fails
- Mobile: Stack name and price vertically

### 2. Financial Health Score

**Visual Elements:**
```
Financial Health    A-    [████████████░░░░] "Exceptionally strong financials with minor growth concerns"
```

**Calculation Logic:**
```typescript
interface HealthScore {
  grade: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'F';
  score: number; // 0-100
  summary: string; // One sentence explanation
}

// Dynamic Adaptive Calculation (replaces fixed weights)
const healthScore = calculateAdaptiveScore({
  profitabilityScore,    // 15-35% weight based on company stage
  growthScore,           // 10-30% weight based on industry type
  cashScore,             // 15-25% weight based on economic environment
  valuationScore,        // 10-25% weight based on market conditions
  leverageScore,         // 5-15% weight based on industry capital intensity
  roicScore             // 10-20% weight based on company maturity
}, {
  industry: company.industry,
  stage: company.maturityStage,
  macroEnvironment: getCurrentEconomicContext(),
  businessModel: company.businessModel
});
```

**Grade Mapping:**
- A+ (95-100): Exceptional in all areas
- A (90-94): Strong across the board
- A- (85-89): Strong with minor concerns
- B+ (80-84): Good with some areas for improvement
- B (75-79): Solid but not outstanding
- B- (70-74): Average with notable weaknesses
- C+ (65-69): Below average, concerning trends
- C (60-64): Poor performance, multiple issues
- C- (55-59): Very poor, serious problems
- D+ (50-54): Distressed, major concerns
- D (40-49): Severely distressed
- F (0-39): Financial emergency

**Summary Templates:**
- A+/A: "Exceptionally strong financials across all metrics"
- A-: "Exceptionally strong financials with minor [growth/valuation] concerns"
- B+/B: "Solid financial performance with [specific area] for improvement"
- B-: "Average financials with notable [weakness] concerns"
- C+/C: "Below-average performance with concerning [trend]"
- D+/D/F: "Poor financial health requiring immediate attention"

### 3. "What You Need to Know" Context Box

**Content Requirements:**
```
💡 What You Need to Know

Apple is like a luxury goods company that happens to make technology. They charge premium prices (45% gross margin) and customers happily pay. The company generates enormous cash ($99B last year) with very little debt. The main concern? Growth is slowing down as the smartphone market matures. Think of it as a money-printing machine that's starting to run slightly slower.
```

**Writing Guidelines:**
- 3-4 sentences maximum
- Use analogies and comparisons
- Avoid financial jargon
- Include 1-2 specific numbers for credibility
- End with the main concern or opportunity
- Update with each quarterly earnings

**Template Structure:**
1. **Company analogy**: "X is like [familiar business model]"
2. **Key strength**: Specific advantage with numbers
3. **Financial position**: Cash/debt situation in simple terms
4. **Main concern/opportunity**: What investors should watch

### 4. Four Key Metric Cards

#### Profitability Card
**Visual Layout:**
```
Profitability    [?]
26.3%
↑ 2.1% from last quarter

Net margin of 26.3% means Apple keeps $26 of every $100 in sales. That's 2x better than most tech companies.

[████████████████▓▓]  (trend bars)
```

**Calculation:**
```typescript
interface ProfitabilityMetric {
  netMargin: number;           // Net Income / Revenue
  change: {
    value: number;             // Percentage point change
    period: 'QoQ' | 'YoY';     // Quarter or year comparison
    direction: 'up' | 'down';
  };
  industryContext: string;     // "2x better than tech average"
  plainEnglish: string;        // "keeps $26 of every $100"
}
```

**Data Sources:**
- Net Income: SEC 10-Q/10-K filings
- Revenue: SEC 10-Q/10-K filings  
- Industry benchmark: Calculated from S&P 500 Tech sector

#### Revenue Growth Card
**Visual Layout:**
```
Revenue Growth   [?]
4.9%
↓ 3.2% from last year

Growing slower than inflation (5.5%). This is like a restaurant with the same number of customers each month.

[████████▓▓▓▓▓▓▓▓]  (trend bars)
```

**Calculation:**
```typescript
interface GrowthMetric {
  yoyGrowth: number;           // Year-over-year revenue growth
  qoqGrowth: number;           // Quarter-over-quarter (annualized)
  inflationContext: string;    // vs current inflation rate
  industryContext: string;     // vs industry median
  plainEnglish: string;        // Restaurant analogy
}
```

**Context Rules:**
- Compare to inflation rate (currently ~5.5%)
- Compare to industry median
- Use analogies: restaurant customers, store traffic
- Flag if growth is accelerating/decelerating

#### Cash Generation Card
**Visual Layout:**
```
Cash Generation  [?]
$99.8B
↑ 15% YoY

Apple generates enough cash to buy Netflix... every year. This is real money in the bank, not accounting profits.

[████████████████████]  (trend bars)
```

**Calculation:**
```typescript
interface CashMetric {
  freeCashFlow: number;        // Operating Cash Flow - CapEx
  yoyChange: number;           // Year-over-year change
  asPercentOfRevenue: number;  // FCF / Revenue ratio
  comparison: string;          // "enough to buy Netflix"
  plainEnglish: string;        // "real money in the bank"
}
```

**Comparison Templates:**
- $100B+: "enough to buy [major company] every year"
- $50-100B: "enough to buy [streaming service] annually"
- $10-50B: "more than [country]'s entire GDP"
- <$10B: "enough to fund [startup/project]"

#### Valuation Card
**Visual Layout:**
```
Valuation (P/E)  [?]
31.2x
vs avg 25x

You're paying $31 for every $1 of Apple's earnings. Like paying 31 years of rent upfront for a house.

[████████████████▓▓▓▓]  (trend bars)
```

**Calculation:**
```typescript
interface ValuationMetric {
  peRatio: number;             // Price / Earnings TTM
  historicalAverage: number;   // 5-year average P/E
  industryAverage: number;     // Tech sector P/E
  premiumDiscount: number;     // % above/below historical
  analogy: string;             // "31 years of rent upfront"
}
```

**Analogy Rules:**
- P/E 15-25: "like paying X years of rent upfront"
- P/E 25-40: "paying X years of rent for a premium house"
- P/E 40+: "paying X years for a house you hope will improve"
- P/E <15: "getting X years of rent at a discount"

### 5. AI-Powered Insights Panel

**Layout:**
```
🤖 AI-Powered Insights (LLM Analysis)

🎯 Hidden Opportunity: Services Monetization
While investors focus on iPhone sales, services revenue quietly became 22% of total revenue with 70% margins. Apple is successfully transitioning from hardware dependence to recurring revenue streams.
Evidence: • 8 quarters of double-digit growth • 1B+ paid subscribers • Expanding into financial services

⚠️ Regulatory Risk: China Market Pressure
Recent regulatory changes affecting App Store operations coincide with 8% revenue decline in region. This threatens 15% of total revenue from Apple's second-largest market.
Evidence: • New data privacy laws • Developer fee restrictions • Government device limitations

🔄 Business Model Evolution: Hardware + Services
Apple's ecosystem strategy is working - each hardware sale creates recurring services revenue. Average revenue per user increasing despite iPhone unit growth slowing.
Evidence: • Services attach rate rising • Subscription growth outpacing device sales • Margin improvement
```

**LLM Integration:**
```typescript
interface AIInsight {
  type: 'opportunity' | 'strength' | 'concern' | 'risk';
  title: string;
  analysis: string;           // LLM-generated explanation
  evidence: string[];         // Supporting data points
  confidence: 'high' | 'medium' | 'low';
  sourceData: string[];       // Which metrics informed this insight
  llmPromptVersion: string;   // For debugging and improvement
}
```

**Enhanced Content Requirements:**
- 3-4 LLM-generated insights per company
- Color-coded by sentiment and confidence level
- Each insight: Title + LLM analysis + evidence + significance
- Mix of opportunities, strengths, concerns, and risks
- Real-time generation based on latest financial data
- Version-controlled prompts (see `/docs/llm-prompts.md`)

**LLM Features:**
- Analyzes SEC filing narratives for hidden insights
- Cross-references quantitative data with qualitative information
- Identifies non-obvious patterns and competitive dynamics
- Generates forward-looking implications
- Provides confidence scoring for each insight

**Insight Categories:**
1. **Profitability trends** (margin expansion/compression)
2. **Geographic performance** (regional revenue changes)
3. **Product mix shifts** (services vs hardware)
4. **Market position changes** (competitive dynamics)
5. **Financial health indicators** (debt, cash, efficiency)

**Writing Template:**
```
[Status Icon] [Descriptive Title]
[Specific data point with context]. [What this means for investors]. [Relatable analogy comparing to familiar business].
```

### 6. Company Comparison Feature

**Layout:**
```
📊 Company Comparison

[Apple]     [vs]     [Nvidia]     [vs]     [Uber]
  A-                    A+                   B

Metric Comparison:
Profitability   26.3%        73.0%        -8.2%
Growth          4.9%         126.0%       15.8%
Cash Flow       $99B         $28B         $2.1B
Valuation       31x          65x          23x

🎯 LLM Analysis: "Apple dominates profitability and cash generation, Nvidia leads in growth and innovation premium, Uber shows operational leverage improving."
```

### 7. Historical Trends Analysis

**Layout:**
```
📈 8-Quarter Historical Analysis

[Trend Chart showing 8 quarters of key metrics]

🔍 Pattern Recognition (LLM):
"Consistent margin expansion for 6 quarters until Q2 2024 when supply chain normalization reduced margins. Services revenue shows accelerating growth throughout the period."

Inflection Points:
• Q4 2022: COVID recovery begins
• Q2 2023: Services milestone (20% of revenue)
• Q1 2024: Margin peak (26.8%)
• Q2 2024: Supply chain normalization
```

---

## Technical Requirements

### Data Sources

**Finnhub API** (Primary)
```
https://finnhub.io/api/v1/stock/metric?symbol=AAPL
```
- Comprehensive financial metrics
- Real-time stock prices
- Industry comparisons
- Rate limit: 60 requests/minute

**SEC EDGAR API** (Supplemental)
```
https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json
```
- Management Discussion & Analysis text
- Metrics not available in Finnhub
- Fiscal period alignment
- Rate limit: 10 requests/second

**LLM Service** (Analysis)
```
OpenAI GPT-4 or Claude 3.5 Sonnet
```
- Financial insight generation
- Management narrative analysis
- Comparative analysis
- Pattern recognition
- Rate limit: Based on service plan

**Required Data Fields:**
```typescript
interface SECFinancials {
  // Income Statement
  revenues: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  
  // Balance Sheet  
  totalAssets: number;
  totalLiabilities: number;
  shareholderEquity: number;
  cashAndEquivalents: number;
  
  // Cash Flow
  operatingCashFlow: number;
  capitalExpenditures: number;
  freeCashFlow: number;
  
  // Share Info
  weightedAverageShares: number;
  
  // Meta
  fiscalYear: number;
  fiscalQuarter: string;
  filingDate: string;
}
```

**Finnhub API** (Market Data)
```
https://finnhub.io/api/v1/quote?symbol=AAPL
```
- Real-time stock prices
- Daily price changes
- Market capitalization
- Basic company profile

### Enhanced Database Schema

**Companies Table:**
```sql
CREATE TABLE companies (
  id SERIAL PRIMARY KEY,
  cik VARCHAR(10) UNIQUE NOT NULL,
  ticker VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  business_model VARCHAR(100),
  maturity_stage VARCHAR(50),
  sic_code VARCHAR(4),
  fiscal_year_end VARCHAR(4),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**LLM Analysis Table:**
```sql
CREATE TABLE llm_analysis (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  analysis_type VARCHAR(50), -- 'insights', 'explanation', 'comparison'
  prompt_version VARCHAR(20),
  input_data JSONB,
  llm_response JSONB,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- for caching
  
  INDEX(company_id, analysis_type, created_at)
);
```

**Data Source Logs Table:**
```sql
CREATE TABLE data_source_logs (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  metric_name VARCHAR(50),
  data_source VARCHAR(20), -- 'finnhub', 'sec_edgar', 'calculated'
  source_endpoint VARCHAR(255),
  fetch_timestamp TIMESTAMP DEFAULT NOW(),
  response_time_ms INTEGER,
  success BOOLEAN,
  error_message TEXT
);
```

**Financial Facts Table:**
```sql
CREATE TABLE financial_facts (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  concept VARCHAR(100) NOT NULL,      -- 'Revenues', 'NetIncomeLoss', etc.
  value BIGINT,                       -- Value in USD
  unit VARCHAR(20),                   -- 'USD', 'shares', etc.
  fiscal_year INTEGER,
  fiscal_quarter VARCHAR(2),          -- 'Q1', 'Q2', 'Q3', 'Q4', 'FY'
  fiscal_period_end DATE,
  filing_date DATE,
  form_type VARCHAR(10),              -- '10-K', '10-Q'
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(company_id, concept, fiscal_year, fiscal_quarter)
);
```

**Calculated Metrics Table:**
```sql
CREATE TABLE calculated_metrics (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id),
  metric_name VARCHAR(50) NOT NULL,   -- 'net_margin', 'roe', 'pe_ratio'
  value DECIMAL(10,4),
  percentile_rank INTEGER,            -- vs industry (1-100)
  fiscal_year INTEGER,
  fiscal_quarter VARCHAR(2),
  calculation_date TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(company_id, metric_name, fiscal_year, fiscal_quarter)
);
```

### Enhanced API Endpoints

**Company Overview with AI Analysis:**
```
GET /api/company/AAPL/overview

Response:
{
  "company": {
    "name": "Apple Inc.",
    "ticker": "AAPL",
    "cik": "0000320193",
    "industry": "Consumer Electronics",
    "businessModel": "Ecosystem Platform",
    "maturityStage": "mature"
  },
  "currentPrice": {
    "price": 189.46,
    "change": 2.34,
    "changePercent": 1.25,
    "lastUpdated": "2025-09-18T16:00:00Z",
    "dataSource": "finnhub"
  },
  "healthScore": {
    "grade": "A-",
    "score": 87,
    "summary": "Exceptionally strong financials with minor growth concerns",
    "weights": {
      "profitability": 25,
      "growth": 15,
      "cash": 20,
      "valuation": 15,
      "leverage": 10,
      "roic": 15
    },
    "reasoning": "Higher weight on profitability due to mature business model"
  },
  "contextBox": {
    "content": "Apple is like a luxury goods company...",
    "llmGenerated": true,
    "promptVersion": "context-v1.0"
  },
  "metrics": [
    {
      "name": "profitability",
      "label": "Profitability",
      "value": 26.3,
      "unit": "%",
      "dataSource": "finnhub",
      "change": {
        "value": 2.1,
        "direction": "up",
        "period": "QoQ"
      },
      "explanations": {
        "technical": "Net margin of 26.3% means Apple retains $26.30 of every $100 in revenue",
        "simplified": "Apple keeps $26 of every $100 in sales as profit",
        "significance": "Exceptional profitability indicates strong pricing power"
      },
      "industryComparison": "2x better than tech average",
      "trend": [20.1, 22.5, 24.2, 26.3]
    }
    // ... other 5 metrics
  ],
  "aiInsights": [
    {
      "type": "opportunity",
      "title": "Hidden Services Monetization",
      "analysis": "While investors focus on iPhone sales, services revenue quietly became 22% of total...",
      "evidence": ["8 quarters of double-digit growth", "1B+ paid subscribers"],
      "confidence": "high",
      "llmPromptVersion": "insights-v1.0"
    }
    // ... other insights
  ],
  "dataSourceLog": {
    "finnhub": ["price", "basic_financials", "metrics"],
    "sec_edgar": ["management_discussion"],
    "calculated": ["health_score", "roic"]
  }
}
```

**Company Comparison:**
```
GET /api/compare?companies=AAPL,NVDA,UBER

Response:
{
  "companies": [/* company data */],
  "comparison": {
    "metrics": {
      "profitability": {
        "AAPL": 26.3,
        "NVDA": 73.0,
        "UBER": -8.2,
        "winner": "NVDA"
      }
      // ... other metrics
    },
    "analysis": {
      "summary": "Apple dominates profitability and cash generation...",
      "strengths": {
        "AAPL": ["Cash generation", "Margin stability"],
        "NVDA": ["Growth rate", "Innovation premium"],
        "UBER": ["Market expansion", "Operational leverage"]
      },
      "llmGenerated": true,
      "promptVersion": "comparison-v1.0"
    }
  }
}
```

**Historical Trends:**
```
GET /api/company/AAPL/trends?quarters=8

Response:
{
  "periods": [/* 8 quarters of data */],
  "trendAnalysis": {
    "narrative": "Consistent margin expansion for 6 quarters until Q2 2024...",
    "inflectionPoints": [
      {
        "quarter": "Q2 2024",
        "event": "Supply chain normalization",
        "impact": "Margin compression"
      }
    ],
    "patterns": {
      "stable": ["cash_flow", "roic"],
      "volatile": ["growth_rate"]
    },
    "llmGenerated": true,
    "promptVersion": "trends-v1.0"
  }
}
```

**What Changed:**
```
GET /api/company/AAPL/changes

Response:
{
  "quarter": "Q4 2024",
  "previousQuarter": "Q3 2024",
  "changes": [
    {
      "metric": "revenue",
      "current": 119.58,
      "previous": 117.15,
      "changePercent": 2.1,
      "direction": "positive",
      "significance": "minor",
      "explanation": "Revenue grew modestly, in line with iPhone seasonal patterns"
    }
    // ... other changes
  ]
}
```

### Enhanced Performance Requirements

**Page Load Times:**
- Company overview page: <2 seconds (with AI insights)
- Company comparison: <3 seconds (3 companies)
- Historical trends: <2 seconds (8 quarters)
- LLM analysis generation: <5 seconds
- Subsequent navigations: <1 second

**Data Freshness:**
- Finnhub data: Real-time for prices, daily for financials
- SEC data: Updated within 24 hours of filing
- LLM analysis: Cached for 24-48 hours
- Health score weights: Recalculated weekly

**Caching Strategy:**
- Financial data: 12-hour TTL
- Stock prices: 5-minute TTL
- LLM responses: 24-hour TTL (aggressive caching)
- Health score calculations: 6-hour TTL
- Comparison analysis: 12-hour TTL
- Static content: CDN with 30-day cache

**LLM Performance:**
- Response time: <5 seconds per analysis
- Concurrent requests: Max 5 simultaneous LLM calls
- Fallback: Cached responses if LLM unavailable
- Cost optimization: Batch similar requests

### Enhanced Error Handling

**LLM Service Failures:**
```jsx
<AIInsights>
  <ErrorState>
    <Icon>🤖</Icon>
    <Message>AI analysis temporarily unavailable</Message>
    <Fallback>Showing cached insights from previous analysis</Fallback>
    <LastUpdated>Last updated: 2 hours ago</LastUpdated>
  </ErrorState>
</AIInsights>
```

**Data Quality Issues:**
```jsx
<MetricCard status="warning">
  <DataQualityWarning>
    <Icon>⚠️</Icon>
    <Message>Some data points from backup source</Message>
    <Details>Source: SEC EDGAR (Finnhub unavailable)</Details>
  </DataQualityWarning>
</MetricCard>
```

**Comprehensive Fallback Strategy:**
- **LLM Failures**: Use cached analysis with timestamps
- **API Failures**: Graceful degradation to cached data
- **Data Inconsistencies**: Log and use most reliable source
- **Comparison Failures**: Single-company view with explanation
- **Automatic Retry**: 3 attempts with exponential backoff
- **Monitoring**: Real-time error tracking and alerting

---

## Acceptance Criteria

### User Experience
- [ ] All 3 company pages load in <2 seconds (including AI insights)
- [ ] All 6 metric cards display real data with source indicators
- [ ] Financial health score uses dynamic adaptive weights
- [ ] Both technical and plain English explanations are LLM-generated
- [ ] Web responsive design works on desktop/tablet browsers
- [ ] Company selector allows switching between Apple/Nvidia/Uber
- [ ] Company comparison feature works for all combinations
- [ ] Historical trends show 8 quarters with pattern recognition
- [ ] AI insights are relevant and actionable
- [ ] All interactive elements (hover, tooltips) function properly
- [ ] Error states handle LLM and API failures gracefully

### Data Quality & Testing
- [ ] Finnhub/SEC financial data cross-validated for accuracy
- [ ] All 6 financial calculations mathematically verified
- [ ] Quarter-over-quarter changes validated across 8 quarters
- [ ] Industry comparisons use appropriate peer groups
- [ ] Stock prices update in real-time during market hours
- [ ] Data source logging captures all metric origins
- [ ] LLM responses fact-checked against quantitative data
- [ ] Dynamic health scoring weights justify their reasoning

**Testing Requirements:**
```typescript
// Unit Tests (90% coverage minimum)
- Financial calculation accuracy
- Health scoring algorithm edge cases
- LLM prompt consistency
- Data source fallback logic
- Adaptive weight calculation

// Integration Tests
- End-to-end company analysis pipeline
- LLM service integration
- API endpoint performance
- Comparison feature accuracy
- Historical trend calculation

// LLM Quality Tests
- Insight relevance scoring
- Explanation clarity validation
- Consistency across companies
- Factual accuracy verification
- Prompt performance benchmarking
```

### Technical Performance
- [ ] 99% uptime for all API endpoints
- [ ] Database queries execute in <500ms
- [ ] LLM responses cached effectively (24h TTL)
- [ ] No client-side JavaScript errors
- [ ] All pages pass Web Core Vitals thresholds
- [ ] Comparison queries optimized for 3-company loads
- [ ] Historical trend queries efficient for 8-quarter data
- [ ] Responsive design tested on tablet browsers
- [ ] Data source logging minimal performance impact

### Enhanced Content Quality
- [ ] LLM-generated explanations reviewed by finance expert
- [ ] AI insights tested with target users for relevance
- [ ] Both technical and simplified explanations validated
- [ ] Analogies appropriate and accurate
- [ ] No financial jargon without LLM explanation
- [ ] Consistent terminology across all companies
- [ ] Legal disclaimer prominently displayed
- [ ] LLM prompts version-controlled and documented
- [ ] Insight confidence scores calibrated accurately
- [ ] Comparative analysis factually correct

---

## Demo Script

### 3-Minute User Demo
**Minute 1: First Impression**
1. User searches "AAPL" 
2. Sees A- health score immediately
3. Reads "What You Need to Know" context box
4. Gets high-level understanding of Apple's business

**Minute 2: Deep Dive**
1. Reviews 4 key metric cards
2. Hovers on profitability for detailed explanation
3. Understands Apple's strong margins and cash generation
4. Notes concerns about growth slowing

**Minute 3: Analysis**
1. Checks "What Changed" insights
2. Sees Services revenue strength
3. Notes China market concerns
4. Forms opinion on investment attractiveness

**Target Outcome:**
User can confidently say: "Apple makes tons of money with high margins, generates massive cash, but growth is slowing. It's expensive but the business is extremely strong."

---

## Launch Criteria

### Must Have (Launch Blockers)
- [ ] Apple, Nvidia, and Uber data is 100% accurate with source logging
- [ ] All 6 metric cards display correctly with LLM explanations
- [ ] Dynamic health scoring works for all companies
- [ ] Company selector enables seamless switching
- [ ] Company comparison feature functional for all pairs
- [ ] Historical trends display 8 quarters with pattern analysis
- [ ] AI insights generated reliably for all companies
- [ ] LLM service failover to cached data works
- [ ] Web responsive design works on desktop/tablet browsers
- [ ] Page load times under 2 seconds (including AI features)
- [ ] Comprehensive test suite passing (90% coverage)
- [ ] No JavaScript errors in production

### Should Have (Post-MVP Enhancement)
- [ ] 5 additional demo companies (MSFT, GOOGL, AMZN, TSLA, META)
- [ ] SEC filing narrative analysis integration
- [ ] Advanced LLM prompts for sector-specific insights
- [ ] Multi-timeframe comparison (1Y, 3Y, 5Y)
- [ ] Peer group comparison beyond current 3 companies
- [ ] LLM insight confidence calibration
- [ ] A/B testing framework for prompt optimization

### Could Have (Future Versions)
- [ ] Export functionality for analysis reports
- [ ] User accounts and watchlists
- [ ] Email alerts for earnings and insights
- [ ] Advanced LLM features (earnings call analysis)
- [ ] Custom comparison groups
- [ ] Industry-specific health scoring models
- [ ] Real-time market sentiment integration
- [ ] Mobile app development

---

**Next Document**: Technical Roadmap with implementation timeline