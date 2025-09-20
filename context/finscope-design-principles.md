# FinScope Design Principles - Bloomberg Terminal Inspired Financial Interface

*Updated: September 19, 2025*
*Version: 2.0 - Dark Theme Professional Financial Terminal*

## I. Core Design Philosophy & Strategy (Financial Terminal Standards)

*   [ ] **Financial Professionals First:** Prioritize the needs of financial analysts, traders, and serious investors who require maximum information density and professional-grade tools.
*   [ ] **Bloomberg Terminal Excellence:** Aim for the sophistication and information density of Bloomberg Terminal while maintaining modern web usability.
*   [ ] **Data Integrity:** Every financial number is sacred - use monospace fonts and precise formatting for all numerical data.
*   [ ] **Visual-First Insights:** Replace text-heavy explanations with sparklines, gauges, and visual indicators that tell the story at a glance.
*   [ ] **Dark Theme Professionalism:** Dark backgrounds reduce eye strain during long analysis sessions and create a professional, focused environment.
*   [ ] **Maximum Information Density:** Pack maximum insight per pixel while maintaining scannability and avoiding cognitive overload.
*   [ ] **Speed & Precision:** Design for traders and analysts who need instant access to critical financial information.
*   [ ] **Accessibility in Finance:** Ensure the interface works for colorblind users and meets professional accessibility standards.

## II. FinScope Design System Foundation

### A. Color Palette (Dark Theme)

*   [ ] **Background Hierarchy:**
    *   [ ] **Primary Background:** #0A0B0D (near-black main background)
    *   [ ] **Secondary Background:** #141518 (cards, panels, elevated surfaces)
    *   [ ] **Tertiary Background:** #1C1D21 (input fields, hover states)
    *   [ ] **Quaternary Background:** #242529 (active states, selected items)

*   [ ] **Text Hierarchy:**
    *   [ ] **Primary Text:** #E4E4E7 (main text, headers, financial values)
    *   [ ] **Secondary Text:** #9CA3AF (labels, descriptions)
    *   [ ] **Tertiary Text:** #6B7280 (metadata, captions)
    *   [ ] **Muted Text:** #4B5563 (disabled states, placeholders)

*   [ ] **Semantic Financial Colors:**
    *   [ ] **Positive/Excellent:** #10B981 (green - gains, strong performance)
    *   [ ] **Negative/Poor:** #EF4444 (red - losses, weak performance)
    *   [ ] **Warning/Caution:** #F59E0B (yellow - moderate performance, alerts)
    *   [ ] **Information/Neutral:** #3B82F6 (blue - neutral data, highlights)
    *   [ ] **Premium Features:** #8B5CF6 (purple - AI features, advanced tools)

*   [ ] **Health Grade Colors:**
    *   [ ] **A Grades:** #10B981 (excellent financial health)
    *   [ ] **B Grades:** #3B82F6 (good financial health)
    *   [ ] **C Grades:** #F59E0B (average financial health)
    *   [ ] **D Grades:** #F97316 (below average financial health)
    *   [ ] **F Grade:** #EF4444 (poor financial health)

### B. Typography (Financial Data Standards)

*   [ ] **Font System:**
    *   [ ] **System Fonts:** -apple-system, BlinkMacSystemFont, Inter, Segoe UI (for text)
    *   [ ] **Monospace Fonts:** SF Mono, Monaco, Consolas (MANDATORY for all financial data)

*   [ ] **Financial Number Typography (MANDATORY MONOSPACE):**
    *   [ ] **All Stock Prices:** Font-family: monospace, size varies by context
    *   [ ] **All Percentages:** Font-family: monospace, including ratios and margins
    *   [ ] **All Financial Ratios:** Font-family: monospace (P/E, D/E, ROIC, etc.)
    *   [ ] **All Currency Values:** Font-family: monospace with proper currency symbols
    *   [ ] **All Dates/Times:** Font-family: monospace for consistency
    *   [ ] **All Ticker Symbols:** Font-family: monospace in uppercase

*   [ ] **Typography Scale:**
    *   [ ] **Financial Hero:** 2.25rem, weight 700 (major financial numbers)
    *   [ ] **Financial Large:** 1.5rem, weight 600 (key metrics)
    *   [ ] **Financial Default:** 1rem, weight 500 (standard financial data)
    *   [ ] **Financial Small:** 0.875rem, weight 500 (secondary financial data)

### C. Component Standards (Financial Focused)

*   [ ] **Health Gauge (Centerpiece):**
    *   [ ] Circular progress indicator, 180-200px diameter
    *   [ ] Gradient fill based on performance grade
    *   [ ] Grade letter overlay (A+, A, A-, etc.)
    *   [ ] Numeric score display (85/100 format)
    *   [ ] Subtle drop shadow for depth

*   [ ] **Metric Cards with Sparklines:**
    *   [ ] Dark background (#141518) with subtle borders
    *   [ ] Header with metric label and sparkline (60px x 20px)
    *   [ ] Large monospace value display
    *   [ ] Color-coded change indicators
    *   [ ] Brief explanation below value
    *   [ ] Performance bar at bottom

*   [ ] **Executive Summary Panel:**
    *   [ ] Dark card with AI branding
    *   [ ] Quick metrics grid (3 columns)
    *   [ ] All numbers in monospace
    *   [ ] Change indicators with color coding

*   [ ] **Company Selector (Header Integration):**
    *   [ ] Dropdown integrated into header
    *   [ ] Company logo, ticker (monospace), health grade
    *   [ ] Dark theme dropdown styling
    *   [ ] Keyboard navigation support

## III. Layout & Information Architecture (Financial Terminal Layout)

*   [ ] **Single Dashboard Approach:** All key information on one page, no navigation tabs
*   [ ] **Header-Integrated Navigation:** Company selector in header, not separate section
*   [ ] **Health Gauge as Centerpiece:** Central focus on overall financial health
*   [ ] **Metric Grid Layout:** 2-3 columns of visual metric cards
*   [ ] **Executive Summary at Top:** Key insights before detailed metrics
*   [ ] **Responsive Breakpoints:**
    *   [ ] **Desktop (1440px+):** 3-column metric grid with health gauge sidebar
    *   [ ] **Tablet (768px-1439px):** 2-column metric grid
    *   [ ] **Mobile (<768px):** Single column stack

## IV. Data Visualization Standards

*   [ ] **Sparklines in Cards:**
    *   [ ] 60px wide x 20px high inline charts
    *   [ ] Single color matching metric performance
    *   [ ] No axes or labels (pure visual trend)
    *   [ ] Responsive stroke width

*   [ ] **Performance Bars:**
    *   [ ] Bottom of each metric card
    *   [ ] Color-coded by performance percentile
    *   [ ] Animated fill on load

*   [ ] **Health Gauge Animation:**
    *   [ ] Smooth fill animation (1 second duration)
    *   [ ] Bounce easing for engagement
    *   [ ] Grade letter appears after fill completes

*   [ ] **Chart Color Coding:**
    *   [ ] Green (#10B981) for positive trends
    *   [ ] Red (#EF4444) for negative trends
    *   [ ] Blue (#3B82F6) for neutral/informational
    *   [ ] Never use color alone to convey meaning

## V. Financial Interface Specific Requirements

### A. Number Formatting Standards

*   [ ] **Currency Display:**
    *   [ ] Always include currency symbol ($, €, ¥)
    *   [ ] Use appropriate decimal places (2 for currency, varies for ratios)
    *   [ ] Thousands separators where appropriate
    *   [ ] Monospace font for alignment

*   [ ] **Percentage Display:**
    *   [ ] Always include % symbol
    *   [ ] Consistent decimal places (typically 1-2)
    *   [ ] Positive/negative indicators (+/-)
    *   [ ] Monospace font for alignment

*   [ ] **Large Number Abbreviations:**
    *   [ ] Use standard financial abbreviations (B for billion, M for million)
    *   [ ] Maintain precision where critical
    *   [ ] Consistent formatting across the application

### B. Real-Time Data Considerations

*   [ ] **Loading States:**
    *   [ ] Skeleton screens for initial load
    *   [ ] Shimmer animation for loading financial data
    *   [ ] Maintain layout structure during load

*   [ ] **Data Updates:**
    *   [ ] Subtle animation for updated values
    *   [ ] Brief highlight for changed numbers
    *   [ ] No jarring layout shifts

*   [ ] **Error Handling:**
    *   [ ] Clear indication of stale data
    *   [ ] Graceful degradation when APIs fail
    *   [ ] Retry mechanisms for critical data

## VI. Accessibility Standards (Financial Context)

*   [ ] **High Contrast Requirements:**
    *   [ ] All text meets 4.5:1 contrast ratio minimum
    *   [ ] Financial data meets 7:1 contrast when possible
    *   [ ] Focus states clearly visible on dark backgrounds

*   [ ] **Color Independence:**
    *   [ ] Never rely solely on color for financial data interpretation
    *   [ ] Include textual indicators (↑, ↓, +, -)
    *   [ ] Icons supplement color coding

*   [ ] **Screen Reader Support:**
    *   [ ] Proper ARIA labels for all financial data
    *   [ ] Chart descriptions for data visualization
    *   [ ] Structured heading hierarchy

*   [ ] **Keyboard Navigation:**
    *   [ ] Tab order follows logical financial data flow
    *   [ ] All interactive elements keyboard accessible
    *   [ ] Escape key closes dropdowns and modals

## VII. Performance Standards (Financial Data Speed)

*   [ ] **Load Time Targets:**
    *   [ ] Initial page load: < 2 seconds
    *   [ ] Financial data updates: < 500ms
    *   [ ] Chart rendering: < 300ms
    *   [ ] Company switching: < 1 second

*   [ ] **Animation Performance:**
    *   [ ] All animations run at 60fps
    *   [ ] Health gauge animation: 1 second total
    *   [ ] Sparkline rendering: < 100ms
    *   [ ] Smooth scrolling maintained

## VIII. Quality Assurance Checklist

### A. Visual Review (Financial Context)
*   [ ] All backgrounds use approved dark theme colors
*   [ ] ALL financial numbers use monospace fonts
*   [ ] Health gauge displays correctly with proper grade colors
*   [ ] Sparklines render accurately and consistently
*   [ ] Text contrast meets WCAG AA standards on dark backgrounds
*   [ ] Company branding (logos, colors) displays correctly

### B. Functional Review (Financial Data)
*   [ ] All financial calculations are accurate
*   [ ] Health grades map correctly to scores
*   [ ] Sparklines reflect actual data trends
*   [ ] Company selector updates all displayed data
*   [ ] Performance indicators match actual percentiles
*   [ ] Loading states work for all data endpoints

### C. Bloomberg Terminal Standards
*   [ ] Information density maximized without overwhelming
*   [ ] Professional aesthetic maintained throughout
*   [ ] Financial industry conventions followed
*   [ ] Data integrity never compromised for design
*   [ ] Interface suitable for extended analysis sessions

## IX. Mobile Considerations (Financial On-The-Go)

*   [ ] **Touch Targets:** Minimum 44px for financial data interaction
*   [ ] **Information Hierarchy:** Most critical data prominent on small screens
*   [ ] **Gesture Support:** Swipe between companies, pinch to zoom charts
*   [ ] **Thumb Navigation:** Key actions within thumb reach
*   [ ] **Landscape Mode:** Optimized layout for horizontal viewing

---

**Success Criteria:**
- Interface indistinguishable from premium financial terminal software
- All financial numbers properly formatted in monospace fonts
- Dark theme provides professional, comfortable viewing experience
- Information density maximized while maintaining usability
- Performance suitable for real-time financial analysis
- Accessibility standards exceeded for professional use

*This replaces the generic SaaS design principles and reflects FinScope's transformation into a Bloomberg Terminal-inspired financial analysis platform.*