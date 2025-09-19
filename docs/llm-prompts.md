# FinScope - LLM Prompts Library
**Centralized Prompt Management for AI-Powered Financial Analysis**

*Date: September 18, 2025*  
*Version: 1.0*  
*Purpose: Central repository for all LLM prompts used in FinScope*

---

## Prompt Management Guidelines

### Version Control
- Each prompt has a version number and changelog
- A/B testing variants are clearly marked
- Production vs experimental prompts are separated

### Quality Standards
- All prompts tested with multiple companies (Apple, Nvidia, Uber)
- Output format strictly defined with TypeScript interfaces
- Fallback prompts for edge cases

### Review Process
- All new prompts require stakeholder review
- Performance metrics tracked (accuracy, consistency, relevance)
- Monthly prompt optimization reviews

---

## 1. Financial Insight Generation

### Primary Prompt (v1.0)
```
You are a senior financial analyst providing insights for retail investors. Analyze the following financial data for {companyName} and generate 3-4 key insights.

**Financial Data:**
- Revenue: ${revenue}B (YoY: {revenueGrowth}%)
- Net Income: ${netIncome}B (YoY: {netIncomeGrowth}%)
- Free Cash Flow: ${freeCashFlow}B
- Net Margin: {netMargin}%
- ROIC: {roic}%
- Debt/Equity: {debtEquity}x
- P/E Ratio: {peRatio}x
- Industry: {industry}
- Recent Quarter: {quarter}

**Context:**
- Company Business Model: {businessModel}
- Key Competitors: {competitors}
- Recent News/Events: {recentEvents}

Generate insights following this format:

1. **Insight Type**: [opportunity/strength/concern/risk]
2. **Title**: [2-4 word descriptive title]
3. **Explanation**: [1-2 sentences explaining the insight]
4. **Evidence**: [2-3 specific data points supporting this]
5. **Significance**: [Why this matters to investors]
6. **Implication**: [What this means for future performance]

Focus on:
- Non-obvious patterns in the data
- Competitive advantages or disadvantages
- Business model strengths/weaknesses
- Future growth drivers or headwinds
- Financial health indicators

Keep explanations accessible to informed retail investors. Use specific numbers and avoid generic statements.
```

**Expected Output Format:**
```typescript
interface GeneratedInsight {
  type: 'opportunity' | 'strength' | 'concern' | 'risk';
  title: string;
  explanation: string;
  evidence: string[];
  significance: string;
  implication: string;
  confidence: 'high' | 'medium' | 'low';
}
```

### Alternative Prompt - Narrative Style (v1.1)
```
You are explaining {companyName}'s financial situation to a smart friend who understands business but isn't a finance expert.

Tell a story about what's really happening with this company using these numbers:
[Same data as above]

Focus on:
1. What's working well for the company
2. What challenges they're facing
3. Hidden opportunities or risks
4. How they compare to competitors

Write in a conversational tone but back everything up with specific numbers. Generate 3 insights maximum.
```

---

## 2. Metric Explanation Generation

### Technical + Simplified Explanation Prompt (v1.0)
```
You are a financial educator. Explain the following metric for {companyName} in two ways:

**Metric:** {metricName}
**Value:** {metricValue}
**Industry Average:** {industryAverage}
**Company's Historical Range:** {historicalRange}
**Calculation:** {calculationFormula}

Provide two explanations:

1. **Technical Explanation** (1 sentence):
   - Use proper financial terminology
   - Include the specific calculation or meaning
   - Compare to industry/historical context

2. **Simplified Explanation** (1 sentence):
   - Use everyday analogies and comparisons
   - Avoid jargon
   - Make it relatable to common experiences

3. **Significance** (1 sentence):
   - Why this metric matters for investment decisions
   - What it reveals about company performance

Example for Apple's 26.3% Net Margin:
Technical: "Net margin of 26.3% means Apple retains $26.30 of every $100 in revenue after all expenses, significantly above the tech industry average of 12.8%."
Simplified: "Apple keeps $26 of every $100 in sales as profit - like a store that costs $74 to run but brings in $100."
Significance: "This exceptional profitability indicates strong pricing power and operational efficiency, suggesting sustainable competitive advantages."
```

**Expected Output Format:**
```typescript
interface MetricExplanation {
  technical: string;
  simplified: string;
  significance: string;
  context: 'excellent' | 'good' | 'average' | 'concerning' | 'poor';
}
```

### Metric Change Analysis Prompt (v1.0)
```
Analyze the change in {metricName} for {companyName}:

**Current Quarter:** {currentValue}
**Previous Quarter:** {previousValue}
**Change:** {changePercent}%
**Absolute Change:** {absoluteChange}

**Context:**
- Industry trend: {industryTrend}
- Company guidance: {guidance}
- Economic environment: {macroFactors}

Explain:
1. What caused this change (be specific)
2. Whether this change is significant or normal
3. What this suggests about future performance
4. How investors should interpret this

Keep explanation to 2 sentences maximum. Focus on the "why" and "so what."
```

---

## 3. Company Comparison Analysis

### Competitive Positioning Prompt (v1.0)
```
You are comparing {primaryCompany} against its competitors: {competitorList}.

**{primaryCompany} Metrics:**
{primaryCompanyMetrics}

**Competitor Metrics:**
{competitorMetrics}

**Industry Context:**
- Industry: {industry}
- Growth stage: {industryStage}
- Key success factors: {successFactors}

Generate a competitive analysis:

1. **Relative Strengths** (2-3 points):
   - Where {primaryCompany} outperforms competitors
   - Specific metrics and magnitude of advantage
   - Why this advantage exists

2. **Relative Weaknesses** (1-2 points):
   - Where {primaryCompany} lags behind
   - Specific gaps in performance
   - Potential impact on competitive position

3. **Market Position** (1 sentence):
   - Overall competitive standing
   - Unique positioning in the market

Use specific numbers and percentages. Focus on meaningful differences (>10% variance).
```

**Expected Output Format:**
```typescript
interface CompetitiveAnalysis {
  strengths: Array<{
    area: string;
    description: string;
    metrics: string[];
  }>;
  weaknesses: Array<{
    area: string;
    description: string;
    metrics: string[];
  }>;
  marketPosition: string;
  confidence: 'high' | 'medium' | 'low';
}
```

---

## 4. Historical Trend Analysis

### Pattern Recognition Prompt (v1.0)
```
Analyze the historical performance trends for {companyName} over the past 8 quarters:

**Historical Data:**
{quarterlyMetrics}

**External Context:**
- Industry trends: {industryTrends}
- Economic cycles: {economicCycles}
- Company events: {majorEvents}

Identify:

1. **Trend Narrative** (2 sentences):
   - Overall trajectory and pattern
   - Key inflection points

2. **Performance Phases** (if applicable):
   - Distinct periods of performance
   - What triggered changes between phases

3. **Consistency Analysis**:
   - Which metrics are most/least volatile
   - Predictability of performance

4. **Forward Implications** (1 sentence):
   - What these trends suggest about future performance
   - Leading indicators to watch

Focus on meaningful patterns, not random fluctuations. Quantify trends with specific numbers.
```

**Expected Output Format:**
```typescript
interface TrendAnalysis {
  narrative: string;
  phases: Array<{
    period: string;
    characteristics: string;
    trigger: string;
  }>;
  consistency: {
    stable: string[];
    volatile: string[];
  };
  implications: string;
}
```

---

## 5. Management Discussion Analysis

### SEC Filing Narrative Extraction (v1.0)
```
You are analyzing the Management Discussion & Analysis section from {companyName}'s latest SEC filing:

**MD&A Text:**
{managementDiscussion}

**Financial Results:**
{quarterlySummary}

Extract key information:

1. **Strategic Priorities** (2-3 points):
   - What management is focusing on
   - Resource allocation decisions
   - Investment areas

2. **Risk Factors** (2-3 points):
   - Specific risks mentioned by management
   - Mitigation strategies discussed
   - Assessment of risk severity

3. **Opportunities** (1-2 points):
   - Growth drivers identified
   - Market opportunities highlighted
   - Competitive advantages leveraged

4. **Outlook Signals** (1-2 points):
   - Forward-looking statements
   - Guidance or expectations
   - Management confidence level

Filter out generic corporate speak. Focus on specific, actionable information that impacts investment decisions.
```

**Expected Output Format:**
```typescript
interface ManagementAnalysis {
  strategicPriorities: string[];
  riskFactors: Array<{
    risk: string;
    mitigation: string;
    severity: 'high' | 'medium' | 'low';
  }>;
  opportunities: Array<{
    opportunity: string;
    potential: string;
  }>;
  outlookSignals: Array<{
    signal: string;
    implication: string;
  }>;
}
```

---

## 6. Dynamic Health Scoring

### Adaptive Weight Calculation Prompt (v1.0)
```
Calculate adaptive weights for financial health scoring for {companyName}:

**Company Profile:**
- Industry: {industry}
- Business Model: {businessModel}
- Company Stage: {maturityStage} (growth/mature/declining)
- Revenue Size: {revenueSize}
- Market Cap: {marketCap}

**Economic Context:**
- Interest Rate Environment: {interestRates}
- Industry Growth: {industryGrowth}
- Economic Cycle: {economicCycle}

**Base Metrics:**
- Profitability (Net Margin): {netMargin}%
- Growth (Revenue YoY): {revenueGrowth}%
- Cash Generation (FCF): ${freeCashFlow}B
- Valuation (P/E): {peRatio}x
- Leverage (D/E): {debtEquity}x
- Efficiency (ROIC): {roic}%

Determine appropriate weights (must sum to 100%):

1. **Profitability Weight** (15-35%):
   - Higher for mature companies
   - Lower for high-growth companies

2. **Growth Weight** (10-30%):
   - Higher for tech/growth companies
   - Lower for utilities/mature industries

3. **Cash Generation Weight** (15-25%):
   - Higher in uncertain economic times
   - Critical for dividend-paying companies

4. **Valuation Weight** (10-25%):
   - Higher in overvalued markets
   - Lower during growth phases

5. **Leverage Weight** (5-15%):
   - Higher for capital-intensive industries
   - Higher during rising rate periods

6. **Efficiency (ROIC) Weight** (10-20%):
   - Higher for mature companies
   - Higher for capital allocation assessment

Provide reasoning for each weight assignment.
```

**Expected Output Format:**
```typescript
interface AdaptiveWeights {
  profitability: { weight: number; reasoning: string };
  growth: { weight: number; reasoning: string };
  cashGeneration: { weight: number; reasoning: string };
  valuation: { weight: number; reasoning: string };
  leverage: { weight: number; reasoning: string };
  roic: { weight: number; reasoning: string };
  contextualFactors: string[];
}
```

---

## 7. Context Generation

### "What You Need to Know" Box Prompt (v1.0)
```
Write a 3-sentence "What You Need to Know" summary for {companyName} aimed at retail investors.

**Company Data:**
{companyOverview}

**Financial Snapshot:**
{keyMetrics}

**Recent Performance:**
{recentResults}

Write exactly 3 sentences that:

1. **Sentence 1**: Business model analogy
   - Compare to a familiar business/concept
   - Explain core value proposition

2. **Sentence 2**: Financial strength summary
   - Key financial metrics in context
   - What makes them strong/concerning

3. **Sentence 3**: Main investment consideration
   - Primary opportunity or risk
   - Forward-looking perspective

Style Guidelines:
- Write like explaining to a smart friend
- Use specific numbers for credibility
- Include one memorable analogy
- Avoid jargon and technical terms
- Maximum 75 words total

Example for Apple:
"Apple operates like a luxury goods company that happens to make technology - customers pay premium prices for premium experiences. The company generates massive cash ($99B annually) with industry-leading margins (26% net margin) and minimal debt. The main question is whether growth can reaccelerate as the smartphone market matures and new products like Vision Pro gain traction."
```

---

## 8. Error Handling & Fallback Prompts

### Insufficient Data Prompt (v1.0)
```
Generate analysis for {companyName} with limited data:

**Available Data:**
{limitedData}

**Missing Data:**
{missingData}

Provide analysis with appropriate caveats:
1. State what analysis is possible with available data
2. Explain limitations due to missing information
3. Provide conservative insights based on available data
4. Suggest what additional data would be valuable

Be transparent about limitations. Don't extrapolate beyond available data.
```

### Data Quality Issues Prompt (v1.0)
```
The following data for {companyName} appears inconsistent:

**Inconsistencies Detected:**
{dataIssues}

Provide analysis that:
1. Acknowledges data quality concerns
2. Identifies which metrics are reliable
3. Provides insights based only on reliable data
4. Explains impact of data quality on conclusions

Maintain user trust by being transparent about limitations.
```

---

## Testing & Validation Framework

### Prompt Testing Checklist
- [ ] Tested with all 3 companies (Apple, Nvidia, Uber)
- [ ] Output format matches TypeScript interface
- [ ] Handles edge cases (negative growth, high debt, etc.)
- [ ] Consistency across multiple runs with same data
- [ ] Factual accuracy verified against known information
- [ ] Appropriate for target audience (retail investors)
- [ ] Clear and actionable insights
- [ ] Performance measured (response time, token usage)

### A/B Testing Framework
```typescript
interface PromptTest {
  promptId: string;
  version: string;
  testCases: TestCase[];
  metrics: {
    accuracy: number;
    consistency: number;
    relevance: number;
    clarity: number;
  };
  winner: string;
}
```

---

## Prompt Performance Metrics

### Quality Measurements
- **Accuracy**: Factual correctness of generated content
- **Consistency**: Similar quality across different companies
- **Relevance**: Usefulness for investment decisions
- **Clarity**: Understandability for target audience
- **Specificity**: Use of concrete numbers vs generic statements

### Usage Analytics
- Token usage per prompt type
- Response time performance
- Cache hit rates
- Error rates and fallback usage

---

**Document Maintenance:**
- Review monthly for prompt optimization opportunities
- Update based on user feedback and performance metrics
- Maintain version history for all prompt changes
- Test new prompts against established benchmarks