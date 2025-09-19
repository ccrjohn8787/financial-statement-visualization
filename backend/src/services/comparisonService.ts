/**
 * ComparisonService - Multi-Company Financial Analysis
 * Handles side-by-side comparison of multiple companies using AI insights
 */

import { FinScopeMetricsService, FinScopeMetric } from './finscopeMetrics';
import { LLMService, LLMRequest } from './llm';
import { PromptManager } from './prompts';

export interface CompanyData {
  ticker: string;
  name: string;
  metrics: FinScopeMetric[];
  healthScore?: number;
  healthGrade?: string;
}

export interface ComparisonRanking {
  metric: string;
  rankings: Array<{
    ticker: string;
    value: number | string;
    unit: string;
    rank: number;
  }>;
}

export interface CompetitiveAdvantage {
  ticker: string;
  companyName: string;
  advantage: string;
  supportingMetric: string;
}

export interface InvestmentRecommendation {
  investorType: 'growth' | 'value' | 'income';
  recommendedTicker: string;
  companyName: string;
  reasoning: string;
}

export interface ComparisonResult {
  companies: CompanyData[];
  rankings: ComparisonRanking[];
  competitiveAdvantages: CompetitiveAdvantage[];
  riskAssessment: Array<{
    ticker: string;
    companyName: string;
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors: string[];
  }>;
  investmentRecommendations: InvestmentRecommendation[];
  aiAnalysis: {
    summary: string;
    keyFindings: string[];
    confidence: 'high' | 'medium' | 'low';
    generatedAt: string;
    requestId: string;
  };
  generatedAt: string;
}

export class ComparisonService {
  private metricsService: FinScopeMetricsService;
  private llmService: LLMService;

  constructor(metricsService: FinScopeMetricsService, llmService: LLMService) {
    this.metricsService = metricsService;
    this.llmService = llmService;
  }

  async compareCompanies(tickers: string[]): Promise<ComparisonResult> {
    console.log(`🔄 Starting comparison analysis for: ${tickers.join(', ')}`);

    // Validate input
    if (tickers.length < 2 || tickers.length > 5) {
      throw new Error('Comparison requires between 2-5 companies');
    }

    try {
      // Fetch metrics for all companies in parallel
      const companiesData = await Promise.all(
        tickers.map(async (ticker) => {
          const companyData = await this.metricsService.getCompanyMetrics(ticker);

          return {
            ticker: ticker.toUpperCase(),
            name: companyData.company.name || `${ticker.toUpperCase()} Corp`,
            metrics: companyData.metrics,
            // TODO: Integrate with health scoring service
            healthScore: this.calculateSimpleHealthScore(companyData.metrics),
            healthGrade: this.getHealthGrade(this.calculateSimpleHealthScore(companyData.metrics))
          };
        })
      );

      // Generate rankings for each metric
      const rankings = this.generateRankings(companiesData);

      // Generate AI analysis
      const aiAnalysis = await this.generateAIAnalysis(companiesData);

      // Parse AI analysis to extract structured data
      const structuredAnalysis = this.parseAIAnalysis(aiAnalysis, companiesData);

      const result: ComparisonResult = {
        companies: companiesData,
        rankings,
        competitiveAdvantages: structuredAnalysis.advantages,
        riskAssessment: structuredAnalysis.risks,
        investmentRecommendations: structuredAnalysis.recommendations,
        aiAnalysis: {
          summary: aiAnalysis.content,
          keyFindings: structuredAnalysis.keyFindings,
          confidence: aiAnalysis.confidence,
          generatedAt: aiAnalysis.generatedAt,
          requestId: aiAnalysis.requestId
        },
        generatedAt: new Date().toISOString()
      };

      console.log(`✅ Comparison analysis completed for ${tickers.length} companies`);
      return result;

    } catch (error) {
      console.error('❌ Error in comparison analysis:', error);
      throw new Error(`Failed to compare companies: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateRankings(companies: CompanyData[]): ComparisonRanking[] {
    const rankings: ComparisonRanking[] = [];

    // Get all unique metrics
    const allMetrics = companies[0]?.metrics || [];

    for (const metric of allMetrics) {
      const metricRankings = companies
        .map(company => {
          const companyMetric = company.metrics.find(m => m.concept === metric.concept);
          return {
            ticker: company.ticker,
            value: companyMetric?.value ?? 0,
            unit: companyMetric?.unit || '',
            companyMetric
          };
        })
        .filter(item => item.companyMetric) // Only include companies that have this metric
        .sort((a, b) => {
          // Sort by value (higher is better for most metrics)
          const aValue = typeof a.value === 'number' ? a.value : 0;
          const bValue = typeof b.value === 'number' ? b.value : 0;

          // Special handling for ratios where lower might be better (like P/E, Debt/Equity)
          if (metric.concept === 'Valuation' || metric.label.includes('Debt')) {
            return aValue - bValue; // Lower is better
          }

          return bValue - aValue; // Higher is better (default)
        })
        .map((item, index) => ({
          ticker: item.ticker,
          value: item.value,
          unit: item.unit,
          rank: index + 1
        }));

      rankings.push({
        metric: metric.label,
        rankings: metricRankings
      });
    }

    return rankings;
  }

  private async generateAIAnalysis(companies: CompanyData[]) {
    // Format companies data for prompt
    const companiesText = companies.map(company =>
      PromptManager.formatCompanyForPrompt(
        { ticker: company.ticker, name: company.name },
        company.metrics
      )
    ).join('\n\n');

    // Generate comparison prompt
    const prompt = PromptManager.renderPrompt('company_comparison', {
      companies: companiesText,
      metrics: 'comprehensive',
      analysisType: 'competitive positioning'
    });

    // Get AI analysis
    const llmRequest: LLMRequest = {
      prompt,
      maxTokens: 500,
      temperature: 0.1,
      useCache: true,
      cacheTTL: 6 * 60 * 60 // 6 hours
    };

    return await this.llmService.generateResponse(llmRequest);
  }

  private parseAIAnalysis(aiResponse: any, companies: CompanyData[]) {
    // Parse the AI response to extract structured data
    // This is a simplified parser - in production, you'd want more sophisticated parsing
    const content = aiResponse.content || '';

    const advantages: CompetitiveAdvantage[] = companies.map(company => ({
      ticker: company.ticker,
      companyName: company.name,
      advantage: `Leading in ${company.metrics[0]?.label || 'financial performance'}`,
      supportingMetric: `${company.metrics[0]?.label}: ${company.metrics[0]?.value} ${company.metrics[0]?.unit}`
    }));

    const risks = companies.map(company => ({
      ticker: company.ticker,
      companyName: company.name,
      riskLevel: (company.healthScore || 0) > 80 ? 'low' :
                 (company.healthScore || 0) > 60 ? 'medium' : 'high' as const,
      riskFactors: ['Market volatility', 'Competitive pressure']
    }));

    const recommendations: InvestmentRecommendation[] = [
      {
        investorType: 'growth',
        recommendedTicker: companies[0]?.ticker || '',
        companyName: companies[0]?.name || '',
        reasoning: 'Strong growth metrics and market position'
      },
      {
        investorType: 'value',
        recommendedTicker: companies[1]?.ticker || companies[0]?.ticker || '',
        companyName: companies[1]?.name || companies[0]?.name || '',
        reasoning: 'Attractive valuation relative to fundamentals'
      },
      {
        investorType: 'income',
        recommendedTicker: companies[0]?.ticker || '',
        companyName: companies[0]?.name || '',
        reasoning: 'Strong cash generation and dividend potential'
      }
    ];

    const keyFindings = [
      'Competitive positioning varies significantly across metrics',
      'Market leadership evident in specific segments',
      'Risk profiles differ based on business models'
    ];

    return {
      advantages,
      risks,
      recommendations,
      keyFindings
    };
  }

  private calculateSimpleHealthScore(metrics: FinScopeMetric[]): number {
    // Simple health score calculation
    // In production, this would use the HealthScoringService
    const scores = metrics.map(metric => {
      const value = typeof metric.value === 'number' ? metric.value : 0;

      // Simple scoring based on metric type
      switch (metric.concept) {
        case 'Growth':
          return Math.min(100, Math.max(0, value * 5)); // Scale growth percentage
        case 'Profitability':
          return Math.min(100, Math.max(0, value * 4)); // Scale margin percentage
        case 'CashFlow':
          return value > 0 ? 80 : 20; // Binary for cash flow
        default:
          return 60; // Default score
      }
    });

    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  private getHealthGrade(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    if (score >= 50) return 'C-';
    if (score >= 45) return 'D+';
    if (score >= 40) return 'D';
    if (score >= 35) return 'D-';
    return 'F';
  }
}