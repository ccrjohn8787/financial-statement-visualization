/**
 * Prompt Management System for FinScope AI
 * Centralized prompts for different AI functions with version control
 */

import { FinScopeMetric } from './finscopeMetrics';

export interface PromptTemplate {
  id: string;
  version: string;
  description: string;
  template: string;
  variables: string[];
  category: 'health_scoring' | 'explanation' | 'comparison' | 'insight';
  examples?: { input: Record<string, any>; output: string }[];
}

export class PromptManager {
  private static readonly PROMPTS: Record<string, PromptTemplate> = {
    // Health Scoring Prompts
    health_score_analysis: {
      id: 'health_score_analysis',
      version: '2.0',
      description: 'Optimized financial health scoring for Groq/Llama with structured output',
      category: 'health_scoring',
      variables: ['companyName', 'ticker', 'metrics', 'industry'],
      template: `Analyze {{companyName}} ({{ticker}}) financial health using these metrics:

{{metrics}}

Industry: {{industry}}

Provide analysis in this exact format:

**GRADE: [A+ to F]**

**STRENGTHS:**
• [Top strength with specific number]
• [Second strength with specific number]

**CONCERNS:**
• [Main concern if any, or "None identified"]

**INDUSTRY CONTEXT:**
[2-sentence comparison to {{industry}} benchmarks]

**INVESTMENT LOGIC:**
[3-sentence reasoning for grade focusing on key financial drivers]

Use specific percentages/ratios from the metrics. Keep total response under 200 words.`
    },

    metric_explanation_technical: {
      id: 'metric_explanation_technical',
      version: '2.0',
      description: 'Concise technical metric explanation optimized for financial accuracy',
      category: 'explanation',
      variables: ['metricName', 'value', 'unit', 'companyName', 'ticker'],
      template: `{{metricName}} Analysis for {{companyName}} ({{ticker}}): {{value}} {{unit}}

**DEFINITION:** [One sentence: what this measures]

**CALCULATION:** [Formula or data source]

**INTERPRETATION:** {{value}} {{unit}} indicates [performance assessment - strong/weak/average]

**BENCHMARKS:** Typical {{metricName}} ranges: [industry standards]

**INVESTOR SIGNIFICANCE:** [Why this matters for investment decisions]

**WATCH FOR:** [Key trend indicators or red flags]

Limit to 150 words. Focus on actionable insights for retail investors.`
    },

    metric_explanation_simple: {
      id: 'metric_explanation_simple',
      version: '2.0',
      description: 'Simplified metric explanation using clear analogies',
      category: 'explanation',
      variables: ['metricName', 'value', 'unit', 'companyName'],
      template: `{{companyName}}'s {{metricName}}: {{value}} {{unit}}

**SIMPLE EXPLANATION:**
Think of {{companyName}} like [specific analogy - restaurant/household/business]. Their {{metricName}} of {{value}} {{unit}} is like [complete the analogy with specific comparison].

**WHAT THIS MEANS:**
[One sentence: is this good/bad/average?]

**BOTTOM LINE:**
[One sentence: what should investors know?]

Use everyday language. No jargon. Maximum 80 words total.`
    },

    company_comparison: {
      id: 'company_comparison',
      version: '2.0',
      description: 'Structured multi-company financial comparison with clear rankings',
      category: 'comparison',
      variables: ['companies', 'metrics', 'analysisType'],
      template: `Financial Comparison - {{analysisType}} Analysis:

{{companies}}

**RANKINGS BY METRIC:**
[Rank each metric: 1st, 2nd, 3rd with specific values]

**COMPETITIVE ADVANTAGES:**
• Company A: [Key strength with number]
• Company B: [Key strength with number]
• Company C: [Key strength with number]

**RISK ASSESSMENT:**
[Highest to lowest financial risk with reasoning]

**INVESTMENT RECOMMENDATION:**
• Growth investors: [Company + reason]
• Value investors: [Company + reason]
• Income investors: [Company + reason]

Use specific metrics. Keep analysis under 250 words.`
    },

    financial_insights: {
      id: 'financial_insights',
      version: '2.0',
      description: 'Advanced pattern recognition for non-obvious financial insights',
      category: 'insight',
      variables: ['companyName', 'ticker', 'metrics', 'industry'],
      template: `Advanced Analysis: {{companyName}} ({{ticker}}) Hidden Insights

Metrics:
{{metrics}}

**PATTERN ANALYSIS:**
[What do the metric relationships reveal about strategy?]

**EARLY SIGNALS:**
[What trend is emerging that others might miss?]

**HIDDEN RISKS:**
[What subtle warning sign deserves attention?]

**UNDERVALUED STRENGTH:**
[What competitive advantage is the market overlooking?]

**MANAGEMENT INSIGHT:**
[What do these numbers reveal about leadership effectiveness?]

**CONTRARIAN TAKE:**
[What's the opposite view from conventional wisdom?]

Focus on non-obvious insights. Support with specific metrics. 200 words maximum.`
    }
  };

  static getPrompt(promptId: string): PromptTemplate {
    const prompt = this.PROMPTS[promptId];
    if (!prompt) {
      throw new Error(`Prompt not found: ${promptId}`);
    }
    return prompt;
  }

  static renderPrompt(promptId: string, variables: Record<string, any>): string {
    const prompt = this.getPrompt(promptId);
    let rendered = prompt.template;

    // Replace all template variables
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value));
    }

    // Check for unreplaced variables
    const unreplaced = rendered.match(/{{(\w+)}}/g);
    if (unreplaced) {
      console.warn(`⚠️ Unreplaced variables in prompt ${promptId}:`, unreplaced);
    }

    return rendered;
  }

  static formatMetricsForPrompt(metrics: FinScopeMetric[]): string {
    return metrics.map(metric => {
      const change = metric.change ? 
        ` (${metric.change.percentage > 0 ? '+' : ''}${metric.change.percentage}% ${metric.change.period})` : '';
      
      return `• ${metric.label}: ${metric.value} ${metric.unit}${change}`;
    }).join('\n');
  }

  static formatCompanyForPrompt(company: { ticker: string; name: string }, metrics: FinScopeMetric[]): string {
    return `**${company.name} (${company.ticker})**\n${this.formatMetricsForPrompt(metrics)}`;
  }

  static getAllPrompts(): PromptTemplate[] {
    return Object.values(this.PROMPTS);
  }

  static getPromptsByCategory(category: PromptTemplate['category']): PromptTemplate[] {
    return Object.values(this.PROMPTS).filter(p => p.category === category);
  }

  // Health scoring specific helpers
  static createHealthScorePrompt(
    companyName: string, 
    ticker: string, 
    metrics: FinScopeMetric[],
    industry: string = 'Technology'
  ): string {
    return this.renderPrompt('health_score_analysis', {
      companyName,
      ticker,
      metrics: this.formatMetricsForPrompt(metrics),
      industry
    });
  }

  // Metric explanation helpers
  static createMetricExplanationPrompt(
    metricName: string,
    value: number | string,
    unit: string,
    companyName: string,
    ticker: string,
    isSimple: boolean = false
  ): string {
    const promptId = isSimple ? 'metric_explanation_simple' : 'metric_explanation_technical';
    
    return this.renderPrompt(promptId, {
      metricName,
      value,
      unit,
      companyName,
      ticker
    });
  }

  // Company comparison helpers
  static createComparisonPrompt(
    companies: Array<{ name: string; ticker: string; metrics: FinScopeMetric[] }>,
    analysisType: string = 'comprehensive'
  ): string {
    const companiesText = companies.map(company => 
      this.formatCompanyForPrompt(company, company.metrics)
    ).join('\n\n');

    return this.renderPrompt('company_comparison', {
      companies: companiesText,
      analysisType
    });
  }

  // Insights generation helpers
  static createInsightsPrompt(
    companyName: string,
    ticker: string,
    metrics: FinScopeMetric[],
    industry: string = 'Technology'
  ): string {
    return this.renderPrompt('financial_insights', {
      companyName,
      ticker,
      metrics: this.formatMetricsForPrompt(metrics),
      industry
    });
  }

  // Validation helpers
  static validatePromptVariables(promptId: string, variables: Record<string, any>): { valid: boolean; missing: string[] } {
    const prompt = this.getPrompt(promptId);
    const missing = prompt.variables.filter(variable => !(variable in variables));
    
    return {
      valid: missing.length === 0,
      missing
    };
  }

  // Development and testing helpers
  static previewPrompt(promptId: string, variables: Record<string, any>): void {
    try {
      const rendered = this.renderPrompt(promptId, variables);
      console.log(`\n📝 Preview of prompt '${promptId}':`);
      console.log('=' .repeat(50));
      console.log(rendered);
      console.log('=' .repeat(50));
    } catch (error) {
      console.error(`❌ Error previewing prompt '${promptId}':`, error);
    }
  }

  // Performance optimization: pre-render commonly used prompts
  private static promptCache = new Map<string, string>();

  static getCachedPrompt(cacheKey: string): string | null {
    return this.promptCache.get(cacheKey) || null;
  }

  static setCachedPrompt(cacheKey: string, rendered: string): void {
    // Limit cache size
    if (this.promptCache.size > 100) {
      const firstKey = this.promptCache.keys().next().value;
      this.promptCache.delete(firstKey);
    }
    
    this.promptCache.set(cacheKey, rendered);
  }

  static generateCacheKey(promptId: string, variables: Record<string, any>): string {
    return `${promptId}_${JSON.stringify(variables)}`;
  }
}