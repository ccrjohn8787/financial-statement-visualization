# FinScope - Design System
**Visual Language for Financial Statement Visualization**

*Date: September 18, 2025*  
*Version: 1.0*  
*Based on FinScope Prototype Screenshots*

---

## Design Philosophy

### Core Principles

**1. Numbers + Context + Visuals**
- Every number paired with plain English explanation
- Visual hierarchy guides attention to insights
- Progressive disclosure reveals complexity gradually

**2. Color as Information Architecture**
- Green = Positive/Good/Growing
- Yellow/Orange = Caution/Mixed/Moderate  
- Red = Concerning/Poor/Declining
- Blue = Neutral/Informational

**3. Mobile-First, Data-Dense**
- Information must work on smallest screens first
- Maximum insight per pixel
- Clean, uncluttered layouts

**4. Instant Understanding**
- 2-3 second scan should reveal key insights
- Visual elements guide narrative flow
- Consistent patterns reduce cognitive load

---

## Color System

### Primary Palette

**Health Score Colors**
```css
/* Excellent (A+, A) */
--finscope-excellent: #10B981;     /* Emerald-500 */
--finscope-excellent-bg: #D1FAE5;  /* Emerald-100 */

/* Good (A-, B+, B) */
--finscope-good: #3B82F6;          /* Blue-500 */
--finscope-good-bg: #DBEAFE;       /* Blue-100 */

/* Caution (B-, C+, C) */
--finscope-caution: #F59E0B;       /* Amber-500 */
--finscope-caution-bg: #FEF3C7;    /* Amber-100 */

/* Poor (C-, D+, D, F) */
--finscope-poor: #EF4444;          /* Red-500 */
--finscope-poor-bg: #FEE2E2;       /* Red-100 */
```

**Change Indicators**
```css
/* Positive Change */
--finscope-positive: #059669;      /* Emerald-600 */
--finscope-positive-bg: #ECFDF5;   /* Emerald-50 */

/* Negative Change */
--finscope-negative: #DC2626;      /* Red-600 */
--finscope-negative-bg: #FEF2F2;   /* Red-50 */

/* Neutral/Mixed */
--finscope-neutral: #6B7280;       /* Gray-500 */
--finscope-neutral-bg: #F9FAFB;    /* Gray-50 */
```

**Interface Colors**
```css
/* Background */
--finscope-bg-primary: #FFFFFF;
--finscope-bg-secondary: #F8FAFC;  /* Slate-50 */
--finscope-bg-tertiary: #F1F5F9;   /* Slate-100 */

/* Text */
--finscope-text-primary: #0F172A;   /* Slate-900 */
--finscope-text-secondary: #475569; /* Slate-600 */
--finscope-text-tertiary: #94A3B8;  /* Slate-400 */

/* Borders */
--finscope-border-light: #E2E8F0;   /* Slate-200 */
--finscope-border-medium: #CBD5E1;  /* Slate-300 */
--finscope-border-strong: #94A3B8;  /* Slate-400 */
```

### Color Usage Guidelines

**Health Score Bar Gradient**
- A+ to A-: Full green (#10B981)
- B+ to B-: Green to blue gradient
- C+ to C-: Blue to amber gradient  
- D+ to F: Amber to red gradient

**Metric Cards**
- Green border: Excellent performance (95th+ percentile)
- Blue border: Good performance (75th+ percentile)
- Orange border: Below average (25th-50th percentile)
- Red border: Poor performance (<25th percentile)

---

## Typography

### Font System
**Primary Font**: Inter (clean, highly readable)
**Monospace Font**: JetBrains Mono (for financial data)

### Typography Scale
```css
/* Headlines */
.text-h1 { font-size: 2.25rem; font-weight: 700; line-height: 1.2; }  /* Company name */
.text-h2 { font-size: 1.875rem; font-weight: 600; line-height: 1.3; } /* Section titles */
.text-h3 { font-size: 1.5rem; font-weight: 600; line-height: 1.4; }   /* Card titles */

/* Body Text */
.text-body-lg { font-size: 1.125rem; font-weight: 400; line-height: 1.6; } /* Explanations */
.text-body { font-size: 1rem; font-weight: 400; line-height: 1.5; }        /* Default */
.text-body-sm { font-size: 0.875rem; font-weight: 400; line-height: 1.4; } /* Metadata */

/* Financial Data */
.text-financial-lg { font-size: 2rem; font-weight: 700; font-family: 'JetBrains Mono'; }
.text-financial { font-size: 1.5rem; font-weight: 600; font-family: 'JetBrains Mono'; }
.text-financial-sm { font-size: 1.125rem; font-weight: 500; font-family: 'JetBrains Mono'; }

/* Labels */
.text-label { font-size: 0.75rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
```

### Content Guidelines

**Financial Numbers**
- Use monospace font for all financial data
- Include unit ($, %, x) as part of the number
- Bold primary metrics, regular secondary

**Plain English**
- Write like explaining to a smart friend
- Use analogies: "31 years of rent upfront"
- Avoid jargon: "margin" → "profit kept from each sale"

---

## Layout System

### Grid System
**Desktop (1024px+)**
- 12-column grid with 24px gutters
- Max content width: 1200px
- Centered layout with side padding

**Tablet (768px - 1023px)**
- 8-column grid with 20px gutters
- Full-width content with 16px side padding

**Mobile (320px - 767px)**
- 4-column grid with 16px gutters
- Full-width content with 16px side padding
- Cards stack vertically

### Component Spacing
```css
/* Spacing Scale */
--space-xs: 0.25rem;   /* 4px */
--space-sm: 0.5rem;    /* 8px */
--space-md: 1rem;      /* 16px */
--space-lg: 1.5rem;    /* 24px */
--space-xl: 2rem;      /* 32px */
--space-2xl: 3rem;     /* 48px */
--space-3xl: 4rem;     /* 64px */
```

---

## Component Library

### 1. Header Section
```jsx
<CompanyHeader>
  <CompanyName>Apple Inc.</CompanyName>
  <Ticker>AAPL</Ticker>
  <StockPrice positive>
    $189.46 <ChangeIndicator>+2.34 (+1.25%)</ChangeIndicator>
  </StockPrice>
</CompanyHeader>
```

**Visual Specs:**
- Company name: text-h1, text-primary
- Ticker: text-body, text-secondary, in parentheses
- Stock price: text-financial-lg
- Change: text-financial-sm with color coding

### 2. Financial Health Score
```jsx
<HealthScore grade="A-" score={85}>
  <ScoreBar value={85} />
  <ScoreText>"Exceptionally strong financials with minor growth concerns"</ScoreText>
</HealthScore>
```

**Visual Specs:**
- Grade: Large letter (A-F) with color coding
- Progress bar: 400px wide, 8px height, gradient fill
- Background: Light gray for unfilled portion
- Summary text: Italic, secondary color

### 3. Context Box ("What You Need to Know")
```jsx
<ContextBox>
  <Icon>💡</Icon>
  <Heading>What You Need to Know</Heading>
  <Description>
    Apple is like a luxury goods company that happens to make technology...
  </Description>
</ContextBox>
```

**Visual Specs:**
- Background: Yellow (#FEF3C7) with subtle border
- Icon: 20px lightbulb or info icon
- Padding: 24px all sides
- Corner radius: 12px
- Text: Dark on light yellow background

### 4. Metric Cards (6 Total)
```jsx
<MetricCard status="excellent">
  <MetricHeader>
    <Label>Profitability <HelpIcon /></Label>
    <Value>26.3%</Value>
    <Change positive>↑ 2.1% from last quarter</Change>
  </MetricHeader>
  
  <Context>
    Net margin of 26.3% (keeps $26 of every $100 in sales). This is 2x better than tech average.
  </Context>
  
  <TrendChart data={[20, 22, 24, 26]} />
</MetricCard>

<MetricCard status="caution">
  <MetricHeader>
    <Label>Debt-to-Equity <HelpIcon /></Label>
    <Value>0.46x</Value>
    <Change positive>↓ from 0.52x last year</Change>
  </MetricHeader>
  
  <Context>
    D/E ratio of 0.46x (like having a $46K mortgage on a $100K house). Very manageable debt level.
  </Context>
  
  <TrendChart data={[0.58, 0.52, 0.48, 0.46]} />
</MetricCard>

<MetricCard status="excellent">
  <MetricHeader>
    <Label>ROIC <HelpIcon /></Label>
    <Value>29.5%</Value>
    <Change positive>↑ from 27.2% last year</Change>
  </MetricHeader>
  
  <Context>
    ROIC of 29.5% (generates $29.50 profit for every $100 invested). 3x better than S&P 500 average.
  </Context>
  
  
  <TrendChart data={[25.1, 27.2, 28.8, 29.5]} />
</MetricCard>
```

**Visual Specs:**
- Card: White background, subtle shadow, 16px corner radius
- Border: 2px colored border based on performance
- Padding: 24px all sides
- Value: text-financial-lg
- Context: text-body-sm, 2 lines max
- Chart: 4-bar mini visualization, 60px wide

### 5. Key Insights Panel
```jsx
<InsightsPanel>
  <Insight status="positive">
    <Icon>✅</Icon>
    <Title>Strong Profitability</Title>
    <Description>44% gross margin, well above industry average</Description>
  </Insight>
  
  <Insight status="caution">
    <Icon>⚠️</Icon>
    <Title>China Headwinds</Title>
    <Description>Revenue down 8% in second-largest market</Description>
  </Insight>
</InsightsPanel>
```

**Visual Specs:**
- Each insight: Colored left border (4px width)
- Background: Subtle tint matching border color
- Icons: 20px emoji or icon
- Title: text-body, font-weight: 600
- Description: text-body-sm

### 6. Company Selector
```jsx
<CompanySelector>
  <CompanyOption active ticker="AAPL">
    <Logo src="/logos/apple.svg" />
    <Name>Apple</Name>
    <HealthGrade>A-</HealthGrade>
  </CompanyOption>
  <CompanyOption ticker="NVDA">
    <Logo src="/logos/nvidia.svg" />
    <Name>Nvidia</Name>
    <HealthGrade>A+</HealthGrade>
  </CompanyOption>
  <CompanyOption ticker="UBER">
    <Logo src="/logos/uber.svg" />
    <Name>Uber</Name>
    <HealthGrade>B</HealthGrade>
  </CompanyOption>
</CompanySelector>

### 7. Navigation Tabs
```jsx
<TabNavigation>
  <Tab active>Overview</Tab>
  <Tab>What Changed</Tab>
  <Tab disabled>Compare</Tab>
  <Tab disabled>Deep Dive</Tab>
</TabNavigation>
```

**Visual Specs:**
- Active tab: Blue background, white text
- Inactive tabs: Transparent background, secondary text
- Border bottom: 2px blue for active tab
- Padding: 12px horizontal, 8px vertical

---

## Interactive Elements

### Hover States
**Metric Cards**
- Subtle elevation increase (shadow)
- Border color intensifies
- Tooltip appears with detailed explanation

**Help Icons (?)**
- Color change from gray to blue
- Tooltip with educational content
- Smooth 200ms transition

### Loading States
**Skeleton Screens**
- Gray placeholder rectangles
- Shimmer animation
- Maintain layout structure
- Load progressively (header → cards → charts)

### Error States
**Data Unavailable**
- Light red background
- Clear error message
- Suggest alternative actions
- Maintain visual hierarchy

---

## Responsive Behavior

### Breakpoint Strategy
```css
/* Mobile First */
.metric-grid {
  display: grid;
  grid-template-columns: 1fr;        /* Mobile: Single column */
  gap: 1rem;
}

@media (min-width: 640px) {
  .metric-grid {
    grid-template-columns: 1fr 1fr;   /* Tablet: 2 columns */
  }
}

@media (min-width: 1024px) {
  .metric-grid {
    grid-template-columns: repeat(3, 1fr); /* Desktop: 3 columns (6 cards in 2 rows) */
  }
}
```

### Component Adaptations

**Mobile (< 640px)**
- Stack all metric cards vertically
- Collapse navigation to hamburger menu
- Reduce padding and font sizes
- Simplify charts to sparklines

**Tablet (640px - 1023px)**
- 2x2 grid for metric cards
- Horizontal scrolling for additional content
- Touch-friendly hit targets (44px minimum)

**Desktop (1024px+)**
- 3x2 grid layout (6 metric cards)
- Hover interactions enabled
- Side-by-side comparisons
- Rich tooltip content

---

## Animation & Transitions

### Micro-Interactions
```css
/* Smooth transitions for interactive elements */
.transition-smooth {
  transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Number animations */
.animate-number {
  transition: transform 300ms ease-out;
}

/* Loading shimmer */
@keyframes shimmer {
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
}
```

### Chart Animations
- Bar charts: Grow from bottom (300ms)
- Line charts: Draw from left to right (500ms)
- Health score: Fill progress bar (800ms)
- Numbers: Count up animation for large values

---

## Accessibility

### WCAG 2.1 AA Compliance

**Color Contrast**
- Text on background: 4.5:1 minimum ratio
- Large text (18pt+): 3:1 minimum ratio
- Focus indicators: 3:1 against adjacent colors

**Interactive Elements**
- Focus indicators: 2px blue outline
- Touch targets: 44px minimum
- Keyboard navigation: Tab order follows visual hierarchy

**Screen Readers**
- Alt text for all charts and visual elements
- ARIA labels for complex widgets
- Semantic HTML structure
- Skip links for main content

**Content Guidelines**
- Plain language (8th grade reading level)
- Consistent terminology
- Clear error messages
- Logical content order

---

## Implementation Notes

### CSS Framework
**Tailwind CSS** with custom configuration
- Custom color palette variables
- Extended spacing scale  
- Component layer for reusable patterns
- Utilities layer for one-off styles

### Component Architecture
**React + TypeScript**
- Strict typing for financial data
- Reusable component library
- Consistent prop interfaces
- Error boundary components

### Icon System
**Lucide React Icons**
- Consistent 20px size for interface icons
- Emoji for emotional context (✅ ⚠️ ❌)
- SVG format for scalability

---

## Enhanced Quality Checklist

### Visual Review
- [ ] Consistent spacing using scale
- [ ] Proper color contrast ratios (WCAG 2.1 AA)
- [ ] Responsive behavior tested (desktop/tablet)
- [ ] Interactive states defined
- [ ] Loading states implemented
- [ ] AI content clearly marked
- [ ] Comparison views properly aligned
- [ ] Historical charts readable

### Content Review
- [ ] LLM-generated explanations validated
- [ ] Both technical and simplified modes work
- [ ] Consistent terminology across companies
- [ ] Appropriate analogies tested
- [ ] No financial jargon without explanation
- [ ] Source attribution clear
- [ ] Confidence indicators calibrated

### AI Integration Review
- [ ] LLM prompts version controlled
- [ ] Insight relevance validated
- [ ] Fallback content tested
- [ ] Performance acceptable (<5s)
- [ ] Error states handle LLM failures
- [ ] Confidence scoring accurate

### Accessibility Review
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] Color alone doesn't convey meaning
- [ ] Focus indicators visible
- [ ] Alt text for charts and AI content
- [ ] Comparison tables properly structured
- [ ] Historical trend data accessible

---

## AI Content Design Patterns

### Transparency Indicators
```jsx
<AIContentBadge>
  <Icon>🤖</Icon>
  <Label>AI Generated</Label>
  <Version>v1.0</Version>
</AIContentBadge>
```

### Confidence Visualization
```jsx
<ConfidenceIndicator level="high">
  <ProgressBar value={85} />
  <Label>85% Confidence</Label>
</ConfidenceIndicator>
```

### Fallback States
```jsx
<AIFallback>
  <Icon>💬</Icon>
  <Message>AI analysis temporarily unavailable</Message>
  <CachedContent>Showing previous analysis from 2 hours ago</CachedContent>
</AIFallback>
```

### Data Source Attribution
```jsx
<DataSource>
  <Primary>Finnhub API</Primary>
  <Supplemental>SEC EDGAR (Management Discussion)</Supplemental>
  <Generated>LLM Analysis (insights-v1.0)</Generated>
</DataSource>
```

---

**Next Step**: Technical roadmap with LLM integration timeline and testing strategy