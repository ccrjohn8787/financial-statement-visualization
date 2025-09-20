# FinScope UI Redesign Implementation Guide

**Dark Theme Financial Terminal Interface**

*Date: September 19, 2025*
*Version: 1.0*
*Based on Senior Designer Feedback*

---

## Overview

This guide provides step-by-step instructions for migrating FinScope from the current light theme NextUI interface to a dark theme Bloomberg Terminal-inspired design. The redesign focuses on visual-first data presentation, monospace typography for numbers, and professional financial aesthetics.

### Before & After Comparison

**Current State:**
- Light theme with bright blue accents
- NextUI component library
- Card-based metrics layout
- Generic SaaS aesthetic

**Target State:**
- Dark theme with near-black backgrounds
- Custom Tailwind components
- Visual-first metrics with sparklines
- Bloomberg Terminal professional aesthetic

---

## Dependencies Management

### Remove Dependencies
```bash
# Remove NextUI completely
npm uninstall @nextui-org/react @nextui-org/theme

# Remove unused UI libraries
npm uninstall @headlessui/react @heroicons/react
```

### Add Dependencies
```bash
# Install required visualization and animation libraries
npm install recharts framer-motion clsx

# Ensure Lucide React is installed (should already exist)
npm install lucide-react

# Install additional utilities if needed
npm install @tailwindcss/typography
```

### Updated package.json
```json
{
  "dependencies": {
    "recharts": "^2.8.0",
    "framer-motion": "^10.16.0",
    "lucide-react": "^0.279.0",
    "clsx": "^2.0.0",
    "@tailwindcss/typography": "^0.5.10"
  }
}
```

---

## Tailwind Configuration

### Complete tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark Theme Backgrounds
        'bg': {
          'primary': '#0A0B0D',      // Main page background
          'secondary': '#141518',    // Cards, panels
          'tertiary': '#1C1D21',     // Input fields, hover states
          'quaternary': '#242529',   // Active states
        },

        // Text Hierarchy
        'text': {
          'primary': '#E4E4E7',      // Main text, headers
          'secondary': '#9CA3AF',    // Secondary text, labels
          'tertiary': '#6B7280',     // Metadata, captions
          'muted': '#4B5563',        // Disabled, placeholders
        },

        // Borders
        'border': {
          'primary': '#2A2B2F',      // Default borders
          'secondary': '#374151',    // Hover borders
          'accent': '#4F46E5',       // Focus states
        },

        // Semantic Colors
        'accent': {
          'green': '#10B981',        // Positive, excellent
          'red': '#EF4444',          // Negative, poor
          'yellow': '#F59E0B',       // Warning, caution
          'blue': '#3B82F6',         // Information, neutral
          'purple': '#8B5CF6',       // Premium, highlights
        },

        // Health Grades
        'grade': {
          'a': '#10B981',            // A+, A, A-
          'b': '#3B82F6',            // B+, B, B-
          'c': '#F59E0B',            // C+, C, C-
          'd': '#F97316',            // D+, D, D-
          'f': '#EF4444',            // F
        }
      },

      fontFamily: {
        'mono': ['SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
        'sans': ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'sans-serif'],
      },

      fontSize: {
        'financial-hero': ['2.25rem', { lineHeight: '1.2', fontWeight: '700' }],
        'financial-large': ['1.5rem', { lineHeight: '1.3', fontWeight: '600' }],
        'financial': ['1rem', { lineHeight: '1.4', fontWeight: '500' }],
        'financial-sm': ['0.875rem', { lineHeight: '1.4', fontWeight: '500' }],
      },

      spacing: {
        '18': '4.5rem',
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },

      borderRadius: {
        'card': '12px',
        'metric': '8px',
      },

      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 15px rgba(59, 130, 246, 0.15)',
      },

      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
```

---

## Component Migration Guide

### 1. Health Gauge Component

**File:** `/src/components/ui/HealthGauge.tsx`

```tsx
import React from 'react';
import { motion } from 'framer-motion';

interface HealthGaugeProps {
  value: number; // 0-100
  grade: string; // A+, A, A-, B+, etc.
  size?: number; // diameter in pixels
  strokeWidth?: number;
}

export function HealthGauge({
  value,
  grade,
  size = 200,
  strokeWidth = 12
}: HealthGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return '#10B981';
    if (grade.startsWith('B')) return '#3B82F6';
    if (grade.startsWith('C')) return '#F59E0B';
    if (grade.startsWith('D')) return '#F97316';
    return '#EF4444';
  };

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--border-primary)"
          strokeWidth={strokeWidth}
          fill="none"
          className="opacity-20"
        />

        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getGradeColor(grade)}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            filter: `drop-shadow(0 0 8px ${getGradeColor(grade)}40)`,
          }}
        />
      </svg>

      {/* Grade overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-financial-hero text-text-primary font-bold">
          {grade}
        </span>
        <span className="text-financial text-text-secondary">
          {value}/100
        </span>
      </div>
    </div>
  );
}
```

### 2. Metric Card with Sparkline

**File:** `/src/components/ui/MetricCard.tsx`

```tsx
import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface MetricCardProps {
  label: string;
  value: string;
  change?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
  performance: 'excellent' | 'good' | 'caution' | 'poor';
  sparklineData: number[];
  explanation: string;
}

export function MetricCard({
  label,
  value,
  change,
  performance,
  sparklineData,
  explanation
}: MetricCardProps) {
  const getPerformanceColor = (perf: string) => {
    switch (perf) {
      case 'excellent': return 'accent-green';
      case 'good': return 'accent-blue';
      case 'caution': return 'accent-yellow';
      case 'poor': return 'accent-red';
      default: return 'accent-blue';
    }
  };

  const sparklineDataFormatted = sparklineData.map((value, index) => ({
    index,
    value
  }));

  const changeIcon = change?.direction === 'up' ? TrendingUp :
                   change?.direction === 'down' ? TrendingDown : Minus;
  const ChangeIcon = changeIcon;

  return (
    <motion.div
      className={clsx(
        'bg-bg-secondary border rounded-metric p-6 transition-all duration-200',
        'hover:shadow-glow hover:border-border-secondary',
        'focus-within:ring-2 focus-within:ring-accent-blue focus-within:ring-opacity-20'
      )}
      style={{ borderColor: `var(--${getPerformanceColor(performance)})` }}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Header with sparkline */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <label className="text-label text-text-tertiary block mb-2">
            {label.toUpperCase()}
          </label>
        </div>

        {/* Sparkline */}
        <div className="w-16 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparklineDataFormatted}>
              <Line
                type="monotone"
                dataKey="value"
                stroke={`var(--${getPerformanceColor(performance)})`}
                strokeWidth={2}
                dot={false}
                strokeLinecap="round"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Value and change */}
      <div className="mb-4">
        <div className="flex items-baseline space-x-3">
          <span className="text-financial-large text-text-primary">
            {value}
          </span>

          {change && (
            <div className={clsx(
              'flex items-center space-x-1 text-financial-sm',
              change.direction === 'up' && 'text-accent-green',
              change.direction === 'down' && 'text-accent-red',
              change.direction === 'neutral' && 'text-text-tertiary'
            )}>
              <ChangeIcon size={14} />
              <span>{change.value}</span>
            </div>
          )}
        </div>
      </div>

      {/* Explanation */}
      <p className="text-body-sm text-text-secondary leading-relaxed">
        {explanation}
      </p>

      {/* Performance bar */}
      <div className="mt-4 h-1 bg-border-primary rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: `var(--${getPerformanceColor(performance)})` }}
          initial={{ width: 0 }}
          animate={{ width: '75%' }} // This would be dynamic based on percentile
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      </div>
    </motion.div>
  );
}
```

### 3. Executive Summary Panel

**File:** `/src/components/ui/ExecutiveSummary.tsx`

```tsx
import React from 'react';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuickStatProps {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}

function QuickStat({ label, value, change, positive }: QuickStatProps) {
  return (
    <div className="text-center">
      <div className="text-label text-text-tertiary mb-1">
        {label.toUpperCase()}
      </div>
      <div className="text-financial text-text-primary mb-1">
        {value}
      </div>
      <div className={`flex items-center justify-center space-x-1 text-financial-sm ${
        positive ? 'text-accent-green' : 'text-accent-red'
      }`}>
        {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        <span>{change}</span>
      </div>
    </div>
  );
}

interface ExecutiveSummaryProps {
  companyName: string;
  summary: string;
  quickStats: {
    revenue: { value: string; change: string; positive: boolean };
    margin: { value: string; change: string; positive: boolean };
    roic: { value: string; change: string; positive: boolean };
  };
}

export function ExecutiveSummary({
  companyName,
  summary,
  quickStats
}: ExecutiveSummaryProps) {
  return (
    <motion.div
      className="bg-bg-secondary border border-border-primary rounded-card p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center space-x-3 mb-4">
        <BarChart3 className="text-accent-blue" size={20} />
        <h2 className="text-h3 text-text-primary">Executive Summary</h2>
      </div>

      <p className="text-body text-text-secondary mb-6 leading-relaxed">
        {summary}
      </p>

      <div className="grid grid-cols-3 gap-6 pt-4 border-t border-border-primary">
        <QuickStat
          label="Revenue"
          value={quickStats.revenue.value}
          change={quickStats.revenue.change}
          positive={quickStats.revenue.positive}
        />
        <QuickStat
          label="Net Margin"
          value={quickStats.margin.value}
          change={quickStats.margin.change}
          positive={quickStats.margin.positive}
        />
        <QuickStat
          label="ROIC"
          value={quickStats.roic.value}
          change={quickStats.roic.change}
          positive={quickStats.roic.positive}
        />
      </div>
    </motion.div>
  );
}
```

### 4. Company Selector Dropdown

**File:** `/src/components/ui/CompanySelector.tsx`

```tsx
import React, { useState } from 'react';
import { ChevronDown, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

interface Company {
  ticker: string;
  name: string;
  grade: string;
}

interface CompanySelectorProps {
  companies: Company[];
  selectedCompany: Company;
  onCompanyChange: (company: Company) => void;
}

export function CompanySelector({
  companies,
  selectedCompany,
  onCompanyChange
}: CompanySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-grade-a';
    if (grade.startsWith('B')) return 'text-grade-b';
    if (grade.startsWith('C')) return 'text-grade-c';
    if (grade.startsWith('D')) return 'text-grade-d';
    return 'text-grade-f';
  };

  return (
    <div className="relative">
      <button
        className={clsx(
          'flex items-center justify-between w-full px-4 py-2',
          'bg-bg-tertiary border border-border-primary rounded-lg',
          'hover:border-border-secondary transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-opacity-20'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center space-x-3">
          <Building2 size={16} className="text-text-secondary" />
          <div className="text-left">
            <div className="text-financial font-medium text-text-primary">
              {selectedCompany.ticker}
            </div>
            <div className="text-body-sm text-text-secondary">
              {selectedCompany.name}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className={clsx('text-financial-sm font-medium', getGradeColor(selectedCompany.grade))}>
            {selectedCompany.grade}
          </span>
          <ChevronDown
            size={16}
            className={clsx(
              'text-text-tertiary transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="absolute top-full left-0 right-0 mt-2 z-50"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-card-hover overflow-hidden">
              {companies.map((company) => (
                <button
                  key={company.ticker}
                  className={clsx(
                    'w-full flex items-center justify-between px-4 py-3',
                    'hover:bg-bg-tertiary transition-colors',
                    'border-b border-border-primary last:border-b-0',
                    selectedCompany.ticker === company.ticker && 'bg-bg-tertiary'
                  )}
                  onClick={() => {
                    onCompanyChange(company);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <Building2 size={16} className="text-text-secondary" />
                    <div className="text-left">
                      <div className="text-financial font-medium text-text-primary">
                        {company.ticker}
                      </div>
                      <div className="text-body-sm text-text-secondary">
                        {company.name}
                      </div>
                    </div>
                  </div>

                  <span className={clsx('text-financial-sm font-medium', getGradeColor(company.grade))}>
                    {company.grade}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
```

---

## Page Layout Migration

### Header Component Update

**File:** `/src/components/layout/Header.tsx`

```tsx
'use client';

import Link from 'next/link';
import { TrendingUp, RefreshCw, Settings } from 'lucide-react';
import { CompanySelector } from '@/components/ui/CompanySelector';

const companies = [
  { ticker: 'AAPL', name: 'Apple Inc.', grade: 'A-' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', grade: 'A+' },
  { ticker: 'UBER', name: 'Uber Technologies', grade: 'B' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-bg-secondary/95 backdrop-blur-sm border-b border-border-primary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <TrendingUp className="h-6 w-6 text-accent-blue" />
            <span className="text-lg font-semibold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent">
              FinScope
            </span>
          </Link>

          {/* Company Selector */}
          <div className="flex-1 max-w-md mx-8">
            <CompanySelector
              companies={companies}
              selectedCompany={companies[0]}
              onCompanyChange={(company) => console.log('Selected:', company)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            <button className="p-2 rounded-lg bg-bg-tertiary hover:bg-bg-quaternary transition-colors">
              <RefreshCw size={16} className="text-text-secondary" />
            </button>
            <button className="p-2 rounded-lg bg-bg-tertiary hover:bg-bg-quaternary transition-colors">
              <Settings size={16} className="text-text-secondary" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
```

### Main FinScope Page

**File:** `/src/app/finscope/page.tsx`

```tsx
import { HealthGauge } from '@/components/ui/HealthGauge';
import { MetricCard } from '@/components/ui/MetricCard';
import { ExecutiveSummary } from '@/components/ui/ExecutiveSummary';
import { Layout } from '@/components/layout';

export default function FinScopePage() {
  // This would come from API
  const companyData = {
    name: 'Apple Inc.',
    ticker: 'AAPL',
    healthScore: 85,
    healthGrade: 'A-',
    summary: 'Apple shows exceptional financial health with strong profitability and conservative debt management. Recent iPhone cycle driving growth despite some headwinds in China market.',
    quickStats: {
      revenue: { value: '$394.3B', change: '+2.8%', positive: true },
      margin: { value: '26.3%', change: '+1.2%', positive: true },
      roic: { value: '29.5%', change: '+2.3%', positive: true },
    },
    metrics: [
      {
        label: 'Profitability',
        value: '26.3%',
        change: { value: '+2.1%', direction: 'up' as const },
        performance: 'excellent' as const,
        sparklineData: [20, 22, 24, 26],
        explanation: 'Net margin of 26.3% - keeps $26 of every $100 in sales. 2x better than tech average.'
      },
      // Add other 5 metrics...
    ]
  };

  return (
    <Layout>
      <div className="min-h-screen bg-bg-primary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">

          {/* Executive Summary */}
          <div className="mb-8">
            <ExecutiveSummary
              companyName={companyData.name}
              summary={companyData.summary}
              quickStats={companyData.quickStats}
            />
          </div>

          <div className="grid lg:grid-cols-4 gap-8">

            {/* Health Gauge - Centerpiece */}
            <div className="lg:col-span-1 flex justify-center">
              <div className="bg-bg-secondary border border-border-primary rounded-card p-6 text-center">
                <h3 className="text-h3 text-text-primary mb-4">Financial Health</h3>
                <HealthGauge
                  value={companyData.healthScore}
                  grade={companyData.healthGrade}
                  size={180}
                />
                <p className="text-body-sm text-text-secondary mt-4">
                  Overall financial strength and stability assessment
                </p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="lg:col-span-3 grid md:grid-cols-2 xl:grid-cols-3 gap-6">
              {companyData.metrics.map((metric, index) => (
                <MetricCard
                  key={metric.label}
                  {...metric}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
```

---

## Global Styles

### Update globals.css

**File:** `/src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    @apply dark;
  }

  body {
    @apply bg-bg-primary text-text-primary antialiased;
    font-feature-settings: 'cv11', 'ss01';
    font-variant-numeric: tabular-nums;
  }

  /* Force monospace for all financial data */
  .financial-number {
    font-family: 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace !important;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
  }
}

@layer components {
  /* Transition utilities */
  .transition-finscope {
    @apply transition-all duration-200 ease-out;
  }

  /* Focus styles */
  .focus-finscope {
    @apply focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-opacity-20;
  }

  /* Custom scrollbars */
  .scrollbar-thin {
    scrollbar-width: thin;
    scrollbar-color: var(--border-primary) transparent;
  }

  .scrollbar-thin::-webkit-scrollbar {
    width: 6px;
  }

  .scrollbar-thin::-webkit-scrollbar-track {
    background: transparent;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb {
    background-color: var(--border-primary);
    border-radius: 3px;
  }

  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background-color: var(--border-secondary);
  }
}

@layer utilities {
  /* Text selection */
  ::selection {
    @apply bg-accent-blue bg-opacity-20;
  }

  /* Hide number input arrows */
  input[type="number"]::-webkit-outer-spin-button,
  input[type="number"]::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input[type="number"] {
    -moz-appearance: textfield;
  }
}
```

---

## Testing Checklist

### Visual Testing
- [ ] All backgrounds use dark theme colors
- [ ] Text contrast meets WCAG 2.1 AA standards
- [ ] All financial numbers display in monospace fonts
- [ ] Health gauge animates smoothly
- [ ] Sparklines render correctly in metric cards
- [ ] Company selector dropdown works properly
- [ ] Hover states provide appropriate feedback

### Functional Testing
- [ ] Page loads without NextUI errors
- [ ] All animations perform smoothly
- [ ] Responsive design works on mobile
- [ ] Company switching updates all components
- [ ] Data visualization renders correctly
- [ ] Focus states are clearly visible

### Performance Testing
- [ ] Page load time under 2 seconds
- [ ] Animations run at 60fps
- [ ] No layout shift during component mounting
- [ ] Memory usage remains stable

---

## Troubleshooting

### Common Issues

1. **NextUI Import Errors**
   ```bash
   # Solution: Remove all NextUI imports
   find src -name "*.tsx" -exec sed -i '' 's/@nextui-org\/react//g' {} \;
   ```

2. **Tailwind Variables Not Working**
   ```css
   /* Ensure CSS variables are defined in :root */
   :root {
     --bg-primary: #0A0B0D;
     /* ... other variables */
   }
   ```

3. **Monospace Fonts Not Applying**
   ```tsx
   // Add financial-number class explicitly
   <span className="font-mono financial-number">$123.45</span>
   ```

4. **Recharts Not Rendering**
   ```tsx
   // Ensure ResponsiveContainer has explicit dimensions
   <ResponsiveContainer width="100%" height={20}>
   ```

---

## Success Metrics

- [ ] Bloomberg Terminal professional aesthetic achieved
- [ ] All financial numbers use monospace typography
- [ ] Visual-first data presentation implemented
- [ ] Dark theme provides excellent readability
- [ ] Single-page dashboard experience delivered
- [ ] Component library is fully custom (no NextUI)
- [ ] Design documentation maintained and accessible

---

## Next Steps

1. Begin implementation with Phase 1 (Foundation)
2. Test each component thoroughly before proceeding
3. Update design system documentation as needed
4. Gather user feedback on the new interface
5. Iterate based on performance metrics and usability

**Implementation Target:** 10 days total
**Priority:** Critical for product differentiation
**Success Criteria:** Professional financial terminal aesthetic with excellent usability