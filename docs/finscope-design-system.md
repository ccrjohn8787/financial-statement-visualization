# FinScope - Design System
**Dark Theme Financial Terminal UI**

*Date: September 19, 2025*
*Version: 2.0*
*Based on Senior Designer Feedback & Bloomberg Terminal Inspiration*

---

## Design Philosophy

### Core Principles

**1. Bloomberg Terminal Meets Modern Web**
- Dark, sophisticated interface for professional financial analysis
- High information density without overwhelming users
- Visual-first approach with sparklines and gauges
- Numbers are sacred - all financial data in monospace fonts

**2. Visual Hierarchy Through Data**
- Health gauge as the centerpiece of analysis
- Sparklines tell the story at a glance
- Color coding for immediate pattern recognition
- Progressive disclosure from overview to detail

**3. Professional Aesthetic**
- Near-black backgrounds (#0A0B0D) for reduced eye strain
- Sophisticated color palette with high contrast
- Clean typography with system fonts
- Subtle animations and micro-interactions

**4. Data Integrity**
- All numbers in monospace fonts (SF Mono, Monaco, Consolas)
- Clear data source attribution
- Transparent AI analysis indicators
- Consistent formatting across all metrics

---

## Color System

### Dark Theme Palette

**Background Hierarchy**
```css
/* Primary Backgrounds */
--bg-primary: #0A0B0D;      /* Near-black main background */
--bg-secondary: #141518;    /* Cards, panels, elevated surfaces */
--bg-tertiary: #1C1D21;     /* Hover states, input fields */
--bg-quaternary: #242529;   /* Active states, selected items */

/* Text Colors */
--text-primary: #E4E4E7;    /* Primary text, headers */
--text-secondary: #9CA3AF;  /* Secondary text, labels */
--text-tertiary: #6B7280;   /* Tertiary text, metadata */
--text-muted: #4B5563;      /* Disabled text, placeholder */

/* Border Colors */
--border-primary: #2A2B2F;  /* Default borders */
--border-secondary: #374151; /* Hover borders */
--border-accent: #4F46E5;   /* Focus, active borders */
```

**Semantic Colors (High Contrast)**
```css
/* Performance Indicators */
--accent-green: #10B981;    /* Excellent performance, positive change */
--accent-red: #EF4444;      /* Poor performance, negative change */
--accent-yellow: #F59E0B;   /* Warning, caution indicators */
--accent-blue: #3B82F6;     /* Information, neutral indicators */
--accent-purple: #8B5CF6;   /* Premium features, highlights */

/* Health Grade Mapping */
--grade-a: #10B981;         /* A+, A, A- grades */
--grade-b: #3B82F6;         /* B+, B, B- grades */
--grade-c: #F59E0B;         /* C+, C, C- grades */
--grade-d: #F97316;         /* D+, D, D- grades */
--grade-f: #EF4444;         /* F grade */
```

**Gradient Overlays**
```css
/* Header Gradient */
--header-gradient: linear-gradient(135deg, #667EEA 0%, #764BA2 100%);

/* Health Gauge Gradients */
--gauge-excellent: linear-gradient(90deg, #10B981 0%, #059669 100%);
--gauge-good: linear-gradient(90deg, #3B82F6 0%, #2563EB 100%);
--gauge-caution: linear-gradient(90deg, #F59E0B 0%, #D97706 100%);
--gauge-poor: linear-gradient(90deg, #EF4444 0%, #DC2626 100%);
```

### Color Usage Guidelines

**Dark Theme Accessibility**
- All text maintains 4.5:1 contrast ratio minimum
- Interactive elements have clear focus indicators
- Color never the sole indicator of meaning
- High contrast mode compatible

**Health Gauge Implementation**
- Circular progress indicator with gradient fill
- Background: dark gray (#2A2B2F)
- Foreground: performance-based gradient
- Text overlay: grade letter in white

**Metric Cards**
- Dark background (#141518) with subtle borders
- Sparklines use accent colors for trends
- Numbers in high-contrast white (#E4E4E7)
- Labels in secondary text (#9CA3AF)

**Interactive States**
- Hover: Increase border opacity, subtle glow
- Focus: Blue border (#3B82F6) with ring
- Active: Darker background, pressed effect
- Disabled: Reduced opacity (50%)

---

## Typography

### Font System
**Primary Font**: System fonts (-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif)
**Monospace Font**: SF Mono, Monaco, Consolas, 'Liberation Mono', monospace
**Icon Font**: Lucide React (consistent 16px-24px sizing)

### Typography Hierarchy
```css
/* Headers (System Fonts) */
.text-h1 {
  font-size: 1.875rem;
  font-weight: 600;
  line-height: 1.2;
  color: var(--text-primary);
  letter-spacing: -0.025em;
}

.text-h2 {
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--text-primary);
}

.text-h3 {
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.4;
  color: var(--text-secondary);
}

/* Body Text */
.text-body {
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.5;
  color: var(--text-secondary);
}

.text-body-sm {
  font-size: 0.75rem;
  font-weight: 400;
  line-height: 1.4;
  color: var(--text-tertiary);
}

/* Financial Data (MANDATORY MONOSPACE) */
.text-financial-hero {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.text-financial-large {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.text-financial {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
}

.text-financial-sm {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

/* Labels & Metadata */
.text-label {
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
}
```

### Critical Typography Rules

**MANDATORY MONOSPACE USAGE:**
- All financial numbers (prices, percentages, ratios)
- All calculations and formulas
- All timestamps and dates
- All ticker symbols
- All metric values

**System Font Usage:**
- Company names and descriptions
- Explanatory text and insights
- UI labels and navigation
- Button text and form labels

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

### 1. Dark Theme Header
```jsx
<Header className="bg-bg-secondary border-b border-border-primary">
  <div className="flex items-center justify-between">
    <Logo className="bg-gradient-to-r from-purple-400 to-blue-500" />
    <CompanySelector companies={["AAPL", "NVDA", "UBER"]} />
    <HeaderActions>
      <RefreshButton />
      <SettingsButton />
    </HeaderActions>
  </div>
</Header>
```

**Visual Specs:**
- Background: --bg-secondary (#141518)
- Logo: Gradient text effect
- Sticky positioning with backdrop blur
- Company selector dropdown in header
- Minimal height for maximum data space

### 2. Health Gauge (Centerpiece)
```jsx
<HealthGauge size={200} value={85} grade="A-">
  <CircularProgress
    value={85}
    gradient={getGradeGradient("A-")}
    strokeWidth={12}
    background="var(--border-primary)"
  />
  <GradeOverlay className="text-financial-hero">
    A-
  </GradeOverlay>
  <ScoreText className="text-financial-large">
    85/100
  </ScoreText>
</HealthGauge>
```

**Visual Specs:**
- Circular gauge, 200px diameter
- Grade-based gradient fill
- White grade letter overlay
- Numeric score below gauge
- Subtle drop shadow for depth

### 3. Executive Summary Panel
```jsx
<ExecutiveSummary className="bg-bg-secondary border border-border-primary">
  <SummaryHeader>
    <Icon className="text-accent-blue">📊</Icon>
    <Title className="text-h3">Executive Summary</Title>
  </SummaryHeader>
  <SummaryContent className="text-body">
    Apple shows exceptional financial health with strong profitability
    and conservative debt management. Recent iPhone cycle driving growth.
  </SummaryContent>
  <KeyMetrics className="grid grid-cols-3 gap-4 mt-4">
    <QuickStat label="Revenue" value="$394.3B" change="+2.8%" />
    <QuickStat label="Net Margin" value="26.3%" change="+1.2%" />
    <QuickStat label="ROIC" value="29.5%" change="+2.3%" />
  </KeyMetrics>
</ExecutiveSummary>
```

**Visual Specs:**
- Dark card background (#141518)
- Subtle border and rounded corners
- Icon with accent color
- Grid layout for quick metrics
- Monospace for all numbers

### 4. Visual Metric Cards
```jsx
<MetricCard performance="excellent">
  <MetricHeader>
    <div className="flex items-center justify-between">
      <Label className="text-label text-text-tertiary">
        PROFITABILITY
      </Label>
      <SparklineChart
        data={[20, 22, 24, 26]}
        color="var(--accent-green)"
        width={60}
        height={20}
      />
    </div>

    <ValueDisplay>
      <MainValue className="text-financial-large text-text-primary">
        26.3%
      </MainValue>
      <ChangeIndicator positive className="text-financial-sm text-accent-green">
        ↑ 2.1%
      </ChangeIndicator>
    </ValueDisplay>
  </MetricHeader>

  <Context className="text-body-sm text-text-secondary mt-3">
    Net margin of 26.3% - keeps $26 of every $100 in sales.
    2x better than tech average.
  </Context>

  <PerformanceBar
    value={85}
    max={100}
    color="var(--accent-green)"
    className="mt-4"
  />
</MetricCard>
```

**Visual Specs:**
- Dark background (#141518) with subtle border
- Sparkline chart in header (60px x 20px)
- Large monospace value display
- Color-coded change indicators
- Performance bar at bottom
- Compact design for dashboard grid
- Hover effects: glow and slight elevation

### 5. AI Insights Panel
```jsx
<AIInsightsPanel className="bg-bg-secondary border border-border-primary">
  <PanelHeader>
    <Icon className="text-accent-purple">🤖</Icon>
    <Title className="text-h3">AI Analysis</Title>
    <AIBadge className="text-label">GPT-4 POWERED</AIBadge>
  </PanelHeader>

  <InsightsList>
    <Insight type="strength" className="border-l-4 border-accent-green">
      <InsightIcon className="text-accent-green">↗</InsightIcon>
      <InsightContent>
        <InsightTitle className="text-body font-medium text-text-primary">
          Exceptional Capital Efficiency
        </InsightTitle>
        <InsightDescription className="text-body-sm text-text-secondary">
          ROIC of 29.5% suggests highly profitable reinvestment opportunities.
          Management executing disciplined capital allocation strategy.
        </InsightDescription>
      </InsightContent>
    </Insight>

    <Insight type="concern" className="border-l-4 border-accent-yellow">
      <InsightIcon className="text-accent-yellow">⚠</InsightIcon>
      <InsightContent>
        <InsightTitle className="text-body font-medium text-text-primary">
          Geographic Concentration Risk
        </InsightTitle>
        <InsightDescription className="text-body-sm text-text-secondary">
          Heavy dependence on China market (19% of revenue) creates
          geopolitical vulnerability despite strong fundamentals.
        </InsightDescription>
      </InsightContent>
    </Insight>
  </InsightsList>
</AIInsightsPanel>
```

**Visual Specs:**
- Dark panel with AI branding
- Left border color coding for insight type
- Clean typography hierarchy
- Strength/concern iconography
- AI transparency indicators

### 6. Header Company Selector
```jsx
<CompanyDropdown className="bg-bg-tertiary border border-border-primary">
  <DropdownTrigger className="flex items-center justify-between px-4 py-2">
    <SelectedCompany>
      <CompanyLogo size="sm" />
      <CompanyInfo>
        <Ticker className="text-financial font-medium text-text-primary">
          AAPL
        </Ticker>
        <CompanyName className="text-body-sm text-text-secondary">
          Apple Inc.
        </CompanyName>
      </CompanyInfo>
    </SelectedCompany>
    <ChevronDown className="text-text-tertiary" />
  </DropdownTrigger>

  <DropdownContent className="bg-bg-secondary border border-border-primary">
    <DropdownItem>
      <CompanyLogo ticker="AAPL" />
      <span className="text-financial">AAPL</span>
      <HealthBadge grade="A-" />
    </DropdownItem>
    <DropdownItem>
      <CompanyLogo ticker="NVDA" />
      <span className="text-financial">NVDA</span>
      <HealthBadge grade="A+" />
    </DropdownItem>
    <DropdownItem>
      <CompanyLogo ticker="UBER" />
      <span className="text-financial">UBER</span>
      <HealthBadge grade="B" />
    </DropdownItem>
  </DropdownContent>
</CompanyDropdown>
```

**Visual Specs:**
- Integrated into header, not separate section
- Dropdown with dark theme styling
- Health grades visible in options
- Monospace ticker symbols
- Clean company logos and names

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

### CSS Framework Migration
**From NextUI to Custom Tailwind**
- Remove NextUI dependency completely
- Custom dark theme configuration in tailwind.config.js
- CSS custom properties for color variables
- Component-specific utility classes

### Required Dependencies
```json
{
  "recharts": "^2.8.0",
  "framer-motion": "^10.16.0",
  "lucide-react": "^0.279.0",
  "clsx": "^2.0.0"
}
```

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'bg': {
          'primary': '#0A0B0D',
          'secondary': '#141518',
          'tertiary': '#1C1D21',
          'quaternary': '#242529'
        },
        'text': {
          'primary': '#E4E4E7',
          'secondary': '#9CA3AF',
          'tertiary': '#6B7280',
          'muted': '#4B5563'
        },
        'border': {
          'primary': '#2A2B2F',
          'secondary': '#374151',
          'accent': '#4F46E5'
        },
        'accent': {
          'green': '#10B981',
          'red': '#EF4444',
          'yellow': '#F59E0B',
          'blue': '#3B82F6',
          'purple': '#8B5CF6'
        }
      },
      fontFamily: {
        'mono': ['SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'monospace']
      }
    }
  }
}
```

### Component Architecture
**React + TypeScript + Custom Components**
- No external UI library dependencies
- Custom components built with Tailwind
- Recharts for data visualization
- Framer Motion for smooth animations
- Strict TypeScript interfaces for financial data

---

## Dark Theme Quality Checklist

### Visual Design Review
- [ ] All backgrounds use dark theme palette (#0A0B0D, #141518)
- [ ] Text contrast meets WCAG 2.1 AA (4.5:1 minimum)
- [ ] All financial numbers use monospace fonts
- [ ] Health gauge implemented as circular progress
- [ ] Sparklines integrated into metric cards
- [ ] Executive summary panel replaces context box
- [ ] Company selector moved to header
- [ ] Bloomberg Terminal aesthetic achieved

### Typography Compliance
- [ ] System fonts used for all non-financial text
- [ ] SF Mono/Monaco/Consolas for all numbers
- [ ] Consistent font weights and sizes
- [ ] Proper letter spacing for readability
- [ ] Labels use uppercase with letter spacing

### Component Implementation
- [ ] NextUI components removed completely
- [ ] Custom Tailwind components created
- [ ] Recharts integrated for sparklines
- [ ] Framer Motion added for animations
- [ ] Health gauge with gradient fill
- [ ] Performance bars color-coded
- [ ] AI badges and transparency indicators

### Interactive States
- [ ] Hover effects: subtle glow and elevation
- [ ] Focus indicators: blue ring (#3B82F6)
- [ ] Active states: darker backgrounds
- [ ] Loading skeletons with dark theme
- [ ] Error states clearly visible
- [ ] Dropdown animations smooth

### Data Visualization
- [ ] Sparklines use accent colors appropriately
- [ ] Health gauge gradients match performance
- [ ] Performance bars align with color coding
- [ ] Charts readable against dark backgrounds
- [ ] Tooltips styled consistently

### Responsive Design
- [ ] Components stack properly on mobile
- [ ] Touch targets 44px minimum
- [ ] Text remains readable at all sizes
- [ ] Sparklines scale appropriately
- [ ] Header company selector works on mobile

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

## Migration Strategy

### Phase 1: Foundation (Day 1-2)
1. Update Tailwind configuration with dark theme
2. Remove NextUI dependency
3. Install Recharts and Framer Motion
4. Create base layout components

### Phase 2: Core Components (Day 3-5)
1. Build HealthGauge component
2. Create MetricCard with sparklines
3. Implement ExecutiveSummary panel
4. Build CompanySelector dropdown

### Phase 3: Page Redesign (Day 6-8)
1. Update Header with company selector
2. Redesign FinScope page as single dashboard
3. Implement metric grid layout
4. Add AI insights panel

### Phase 4: Polish (Day 9-10)
1. Add animations and transitions
2. Implement loading states
3. Test responsive behavior
4. Performance optimization

**Success Criteria:**
- Bloomberg Terminal professional aesthetic
- All numbers in monospace fonts
- Visual-first data presentation
- Single-page dashboard experience
- Persistent design documentation maintained

**Next Steps:**
1. Create implementation guide document
2. Update CLAUDE.md with new design standards
3. Begin frontend component migration