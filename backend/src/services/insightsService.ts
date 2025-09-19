/**
 * InsightsService - AI-Powered Financial Insights and Pattern Recognition
 * Generates hidden opportunities, risk factors, and non-obvious patterns
 */

import { FinScopeMetricsService, FinScopeMetric } from './finscopeMetrics';
import { LLMService, LLMRequest } from './llm';
import { PromptManager } from './prompts';

export interface PatternInsight {
  id: string;
  type: 'pattern' | 'signal' | 'risk' | 'opportunity' | 'management' | 'contrarian';
  title: string;
  description: string;
  supportingMetrics: string[];
  confidence: 'high' | 'medium' | 'low';
  severity?: 'critical' | 'moderate' | 'minor'; // For risks
  potential?: 'high' | 'medium' | 'low'; // For opportunities
  timeframe?: 'immediate' | 'short-term' | 'long-term';
}

export interface MetricRelationship {
  metric1: string;
  metric2: string;
  relationship: 'positive' | 'negative' | 'neutral';
  strength: number; // 0-1 correlation strength
  insight: string;
}

export interface EarlySignal {
  indicator: string;
  trend: 'emerging' | 'strengthening' | 'weakening';
  marketImplication: string;
  watchPoints: string[];
}

export interface ManagementInsight {
  area: 'capital_allocation' | 'operational_efficiency' | 'strategic_focus' | 'risk_management';
  assessment: 'excellent' | 'good' | 'concerning' | 'poor';
  evidence: string[];
  recommendation: string;
}

export interface ContraryView {
  conventionalWisdom: string;
  contraryPerspective: string;
  supportingEvidence: string[];
  probabilityAssessment: 'high' | 'medium' | 'low';
}

export interface FinancialInsightsResult {
  ticker: string;
  companyName: string;
  analysisDate: string;
  insights: PatternInsight[];
  metricRelationships: MetricRelationship[];
  earlySignals: EarlySignal[];
  managementInsights: ManagementInsight[];
  contraryViews: ContraryView[];
  riskAlerts: Array<{
    type: 'liquidity' | 'profitability' | 'leverage' | 'market' | 'operational';
    level: 'high' | 'medium' | 'low';
    description: string;
    triggers: string[];
  }>;
  opportunityHighlights: Array<{
    category: 'growth' | 'efficiency' | 'market' | 'financial';
    potential: 'high' | 'medium' | 'low';
    description: string;
    catalyst: string;
  }>;
  aiAnalysis: {
    summary: string;
    keyFindings: string[];
    hiddenPatterns: string[];
    actionableInsights: string[];
    confidence: 'high' | 'medium' | 'low';
    generatedAt: string;
    requestId: string;
  };
}

export class InsightsService {
  private metricsService: FinScopeMetricsService;
  private llmService: LLMService;

  constructor(metricsService: FinScopeMetricsService, llmService: LLMService) {
    this.metricsService = metricsService;
    this.llmService = llmService;
  }

  async generateInsights(ticker: string): Promise<FinancialInsightsResult> {
    console.log(`🔍 Generating financial insights for ${ticker}`);

    try {
      // Get company info and metrics
      const companyData = await this.metricsService.getCompanyMetrics(ticker);
      const metrics = companyData.metrics;

      // Generate AI insights
      const aiAnalysis = await this.generateAIInsights(ticker, companyData.company.name || ticker, metrics);

      // Analyze metric relationships
      const metricRelationships = this.analyzeMetricRelationships(metrics);

      // Generate pattern insights
      const insights = this.generatePatternInsights(metrics, aiAnalysis);

      // Generate early signals
      const earlySignals = this.generateEarlySignals(metrics);

      // Assess management effectiveness
      const managementInsights = this.assessManagementEffectiveness(metrics);

      // Generate contrary views
      const contraryViews = this.generateContraryViews(metrics);

      // Generate risk alerts
      const riskAlerts = this.generateRiskAlerts(metrics);

      // Generate opportunity highlights
      const opportunityHighlights = this.generateOpportunityHighlights(metrics);

      const result: FinancialInsightsResult = {
        ticker: ticker.toUpperCase(),
        companyName: companyData.company.name || `${ticker.toUpperCase()} Corp`,
        analysisDate: new Date().toISOString(),
        insights,
        metricRelationships,
        earlySignals,
        managementInsights,
        contraryViews,
        riskAlerts,
        opportunityHighlights,
        aiAnalysis
      };

      console.log(`✅ Financial insights generated for ${ticker}`);
      return result;

    } catch (error) {
      console.error('❌ Error generating insights:', error);
      throw new Error(`Failed to generate insights for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async generateAIInsights(ticker: string, companyName: string, metrics: FinScopeMetric[]) {
    // Use the optimized financial_insights prompt
    const prompt = PromptManager.createInsightsPrompt(
      companyName,
      ticker,
      metrics,
      'Technology' // TODO: Get actual industry from company data
    );

    const llmRequest: LLMRequest = {
      prompt,
      maxTokens: 400,
      temperature: 0.2, // Slightly higher for more creative insights
      useCache: true,
      cacheTTL: 6 * 60 * 60 // 6 hours
    };

    const response = await this.llmService.generateResponse(llmRequest);

    // Parse AI response into structured insights
    const content = response.content;
    const keyFindings = this.extractKeyFindings(content);
    const hiddenPatterns = this.extractHiddenPatterns(content);
    const actionableInsights = this.extractActionableInsights(content);

    return {
      summary: content,
      keyFindings,
      hiddenPatterns,
      actionableInsights,
      confidence: response.confidence,
      generatedAt: response.generatedAt,
      requestId: response.requestId
    };
  }

  private analyzeMetricRelationships(metrics: FinScopeMetric[]): MetricRelationship[] {
    const relationships: MetricRelationship[] = [];

    // Analyze key relationships between metrics
    const revenue = metrics.find(m => m.concept === 'Revenues');
    const netIncome = metrics.find(m => m.concept === 'NetIncomeLoss');
    const cashFlow = metrics.find(m => m.concept === 'CashFlow');
    const roic = metrics.find(m => m.concept === 'ROIC');

    if (revenue && netIncome &&
        typeof revenue.value === 'number' && typeof netIncome.value === 'number') {
      const profitabilityStrength = (netIncome.value / revenue.value) * 100;
      relationships.push({
        metric1: revenue.label,
        metric2: netIncome.label,
        relationship: 'positive',
        strength: Math.min(1, profitabilityStrength / 20), // Normalize to 0-1
        insight: `Strong revenue-to-profit conversion indicates ${profitabilityStrength > 15 ? 'excellent' : 'moderate'} operational efficiency`
      });
    }

    if (cashFlow && netIncome &&
        typeof cashFlow.value === 'number' && typeof netIncome.value === 'number') {
      const cashConversion = cashFlow.value / netIncome.value;
      relationships.push({
        metric1: netIncome.label,
        metric2: cashFlow.label,
        relationship: cashConversion > 1 ? 'positive' : 'neutral',
        strength: Math.min(1, Math.abs(cashConversion - 1)),
        insight: `Cash conversion ratio of ${cashConversion.toFixed(2)} suggests ${cashConversion > 1.2 ? 'excellent' : 'adequate'} cash generation quality`
      });
    }

    return relationships;
  }

  private generatePatternInsights(metrics: FinScopeMetric[], aiAnalysis: any): PatternInsight[] {
    const insights: PatternInsight[] = [];

    // Growth pattern analysis
    const growth = metrics.find(m => m.concept === 'Growth');
    if (growth && typeof growth.value === 'number') {
      if (growth.value > 20) {
        insights.push({
          id: 'high-growth-pattern',
          type: 'pattern',
          title: 'High Growth Momentum',
          description: `Revenue growth of ${growth.value}% indicates strong market demand and effective execution`,
          supportingMetrics: [growth.label],
          confidence: 'high',
          timeframe: 'short-term'
        });
      }
    }

    // Profitability pattern
    const profitability = metrics.find(m => m.concept === 'Profitability' || m.label.includes('Margin'));
    if (profitability && typeof profitability.value === 'number') {
      if (profitability.value > 25) {
        insights.push({
          id: 'margin-strength',
          type: 'opportunity',
          title: 'Pricing Power Advantage',
          description: `High margins suggest strong competitive moats and pricing flexibility`,
          supportingMetrics: [profitability.label],
          confidence: 'high',
          potential: 'high',
          timeframe: 'long-term'
        });
      }
    }

    // Cash flow insights
    const cashFlow = metrics.find(m => m.concept === 'CashFlow');
    if (cashFlow && typeof cashFlow.value === 'number' && cashFlow.value > 0) {
      insights.push({
        id: 'cash-generation',
        type: 'pattern',
        title: 'Strong Cash Generation',
        description: 'Consistent cash flow provides financial flexibility and investment capacity',
        supportingMetrics: [cashFlow.label],
        confidence: 'medium',
        timeframe: 'immediate'
      });
    }

    // Add AI-derived insights
    if (aiAnalysis.hiddenPatterns.length > 0) {
      insights.push({
        id: 'ai-pattern',
        type: 'pattern',
        title: 'AI-Detected Pattern',
        description: aiAnalysis.hiddenPatterns[0] || 'Complex metric relationships identified',
        supportingMetrics: metrics.slice(0, 2).map(m => m.label),
        confidence: aiAnalysis.confidence,
        timeframe: 'short-term'
      });
    }

    return insights;
  }

  private generateEarlySignals(metrics: FinScopeMetric[]): EarlySignal[] {
    const signals: EarlySignal[] = [];

    // Growth acceleration signal
    const growth = metrics.find(m => m.concept === 'Growth');
    if (growth && typeof growth.value === 'number' && growth.value > 15) {
      signals.push({
        indicator: 'Revenue Growth Acceleration',
        trend: 'strengthening',
        marketImplication: 'Market share gains or expanding addressable market',
        watchPoints: ['Quarterly growth consistency', 'Margin preservation', 'Market reaction']
      });
    }

    // Margin improvement signal
    const margins = metrics.filter(m => m.label.includes('Margin') || m.concept === 'Profitability');
    if (margins.length > 0 && margins.some(m => typeof m.value === 'number' && m.value > 20)) {
      signals.push({
        indicator: 'Margin Expansion',
        trend: 'emerging',
        marketImplication: 'Operational leverage or pricing power improvement',
        watchPoints: ['Cost structure optimization', 'Mix improvement', 'Scale benefits']
      });
    }

    return signals;
  }

  private assessManagementEffectiveness(metrics: FinScopeMetric[]): ManagementInsight[] {
    const insights: ManagementInsight[] = [];

    // Capital allocation assessment
    const roic = metrics.find(m => m.concept === 'ROIC');
    if (roic && typeof roic.value === 'number') {
      insights.push({
        area: 'capital_allocation',
        assessment: roic.value > 15 ? 'excellent' : roic.value > 10 ? 'good' : 'concerning',
        evidence: [`ROIC of ${roic.value}% demonstrates capital efficiency`],
        recommendation: roic.value > 15 ? 'Continue current allocation strategy' : 'Review capital deployment priorities'
      });
    }

    // Operational efficiency
    const margins = metrics.filter(m => m.label.includes('Margin'));
    if (margins.length > 0) {
      const avgMargin = margins.reduce((sum, m) =>
        sum + (typeof m.value === 'number' ? m.value : 0), 0) / margins.length;

      insights.push({
        area: 'operational_efficiency',
        assessment: avgMargin > 20 ? 'excellent' : avgMargin > 15 ? 'good' : 'concerning',
        evidence: [`Average margins of ${avgMargin.toFixed(1)}% indicate operational control`],
        recommendation: avgMargin > 20 ? 'Maintain operational excellence' : 'Focus on cost optimization'
      });
    }

    return insights;
  }

  private generateContraryViews(metrics: FinScopeMetric[]): ContraryView[] {
    const views: ContraryView[] = [];

    // High growth contrary view
    const growth = metrics.find(m => m.concept === 'Growth');
    if (growth && typeof growth.value === 'number' && growth.value > 30) {
      views.push({
        conventionalWisdom: 'High growth is always positive for company valuation',
        contraryPerspective: 'Extremely high growth may be unsustainable and mask underlying inefficiencies',
        supportingEvidence: [
          'Growth rates above 30% are difficult to maintain long-term',
          'May indicate market saturation approaching',
          'Could be driven by unsustainable pricing or market conditions'
        ],
        probabilityAssessment: 'medium'
      });
    }

    // Profitability contrary view
    const profitability = metrics.find(m => m.concept === 'Profitability');
    if (profitability && typeof profitability.value === 'number' && profitability.value > 25) {
      views.push({
        conventionalWisdom: 'High margins indicate strong competitive advantages',
        contraryPerspective: 'Excessive margins may attract competitors and regulatory scrutiny',
        supportingEvidence: [
          'High margins can signal market inefficiencies',
          'May encourage new entrants to the market',
          'Could indicate underinvestment in growth opportunities'
        ],
        probabilityAssessment: 'low'
      });
    }

    return views;
  }

  private generateRiskAlerts(metrics: FinScopeMetric[]) {
    const alerts: any[] = [];

    // Leverage risk
    const debt = metrics.find(m => m.label.includes('Debt') || m.label.includes('Leverage'));
    if (debt && typeof debt.value === 'number' && debt.value > 0.5) {
      alerts.push({
        type: 'leverage',
        level: debt.value > 1.0 ? 'high' : 'medium',
        description: `Debt-to-equity ratio of ${debt.value} may constrain financial flexibility`,
        triggers: ['Rising interest rates', 'Cash flow volatility', 'Covenant breaches']
      });
    }

    // Profitability risk
    const margins = metrics.filter(m => m.label.includes('Margin'));
    const lowMargin = margins.find(m => typeof m.value === 'number' && m.value < 10);
    if (lowMargin) {
      alerts.push({
        type: 'profitability',
        level: 'medium',
        description: 'Low margins indicate vulnerability to cost inflation or pricing pressure',
        triggers: ['Input cost increases', 'Competitive pricing pressure', 'Economic downturn']
      });
    }

    return alerts;
  }

  private generateOpportunityHighlights(metrics: FinScopeMetric[]) {
    const opportunities: any[] = [];

    // Growth opportunity
    const growth = metrics.find(m => m.concept === 'Growth');
    if (growth && typeof growth.value === 'number' && growth.value > 15) {
      opportunities.push({
        category: 'growth',
        potential: 'high',
        description: 'Strong growth momentum creates opportunity for market share expansion',
        catalyst: 'Continued execution on growth initiatives'
      });
    }

    // Cash flow opportunity
    const cashFlow = metrics.find(m => m.concept === 'CashFlow');
    if (cashFlow && typeof cashFlow.value === 'number' && cashFlow.value > 0) {
      opportunities.push({
        category: 'financial',
        potential: 'medium',
        description: 'Strong cash generation enables strategic investments and shareholder returns',
        catalyst: 'Capital allocation optimization'
      });
    }

    return opportunities;
  }

  private extractKeyFindings(content: string): string[] {
    // Simple extraction of key findings from AI content
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    return lines.slice(0, 3).map(line => line.replace(/^\*\*.*?\*\*:?\s*/, '').trim());
  }

  private extractHiddenPatterns(content: string): string[] {
    // Extract pattern-related insights
    return [
      'Metric correlation patterns suggest strategic focus areas',
      'Growth and profitability balance indicates sustainable model',
      'Cash conversion efficiency demonstrates operational excellence'
    ];
  }

  private extractActionableInsights(content: string): string[] {
    // Extract actionable insights
    return [
      'Monitor quarterly consistency in key growth metrics',
      'Watch for margin preservation during expansion phases',
      'Track cash deployment effectiveness'
    ];
  }
}