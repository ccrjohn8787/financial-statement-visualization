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
      version: '1.0',
      description: 'Generates overall financial health score with reasoning',
      category: 'health_scoring',
      variables: ['companyName', 'ticker', 'metrics', 'industry'],
      template: `Analyze the financial health of {{companyName}} ({{ticker}}) based on these 6 key metrics:

{{metrics}}

Consider this company operates in the {{industry}} industry.

Provide a comprehensive analysis with:

1. **Overall Health Grade**: A+ to F scale
2. **Score Breakdown**: Weight and assessment for each metric
3. **Strengths**: Top 2-3 financial strengths
4. **Concerns**: Top 1-2 areas of concern (if any)
5. **Industry Context**: How these metrics compare to {{industry}} standards
6. **Risk Assessment**: Key financial risks to monitor

Be specific about the numbers and provide clear reasoning for the grade. Use percentages and ratios to support your analysis.`
    },

    metric_explanation_technical: {
      id: 'metric_explanation_technical',
      version: '1.0',
      description: 'Technical explanation of a specific financial metric',
      category: 'explanation',
      variables: ['metricName', 'value', 'unit', 'companyName', 'ticker'],
      template: `Explain the {{metricName}} metric for {{companyName}} ({{ticker}}):

Current Value: {{value}} {{unit}}

Provide a technical analysis covering:

1. **Definition**: What exactly this metric measures
2. **Calculation**: How this number is derived
3. **Interpretation**: What {{value}} {{unit}} means for {{companyName}}
4. **Industry Benchmarks**: How this compares to typical ranges
5. **Significance**: Why this metric matters for investors
6. **Trends**: What investors should watch for changes

Keep the explanation accurate and detailed for informed investors.`
    },

    metric_explanation_simple: {
      id: 'metric_explanation_simple',
      version: '1.0',
      description: 'Simple, analogical explanation of a financial metric',
      category: 'explanation',
      variables: ['metricName', 'value', 'unit', 'companyName'],
      template: `Explain {{companyName}}'s {{metricName}} of {{value}} {{unit}} in simple terms using everyday analogies.

Create an explanation that:

1. **Uses Real-World Analogies**: Compare to everyday situations (like household budgets, restaurant businesses, etc.)
2. **Avoids Jargon**: Use simple language anyone can understand
3. **Shows Impact**: What this means for the company's success
4. **Provides Context**: Is this good, bad, or average?
5. **Memorable Examples**: Create relatable comparisons

Example style: "This is like a restaurant that..." or "Imagine if your household budget..."

Keep it under 100 words and make it memorable.`
    },

    company_comparison: {
      id: 'company_comparison',
      version: '1.0',
      description: 'AI-powered comparison between multiple companies',
      category: 'comparison',
      variables: ['companies', 'metrics', 'analysisType'],
      template: `Compare these companies across their financial metrics:

{{companies}}

Focus on {{analysisType}} analysis.

Provide:

1. **Relative Strengths**: Which company excels in each area
2. **Competitive Positioning**: Market position analysis
3. **Risk Profiles**: Compare financial stability
4. **Growth Trajectories**: Which has better growth prospects
5. **Value Propositions**: Investment appeal of each
6. **Winner by Category**: Best choice for different investor types

Be specific with numbers and provide clear rankings with reasoning.`
    },

    financial_insights: {
      id: 'financial_insights',
      version: '1.0',
      description: 'Generate hidden insights and patterns from financial data',
      category: 'insight',
      variables: ['companyName', 'ticker', 'metrics', 'industry'],
      template: `Analyze {{companyName}} ({{ticker}}) and identify non-obvious insights from these metrics:

{{metrics}}

Look for:

1. **Hidden Patterns**: Relationships between metrics that reveal strategy
2. **Emerging Trends**: Early signals of change
3. **Risk Factors**: Subtle warning signs
4. **Opportunities**: Underappreciated strengths
5. **Market Position**: Competitive advantages revealed by the numbers
6. **Management Quality**: What the metrics say about leadership

Focus on insights that aren't immediately obvious from individual metrics but emerge from the combination and context.`
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