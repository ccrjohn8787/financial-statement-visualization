/**
 * Health Scoring Service - AI-Powered Financial Health Analysis
 * Combines quantitative scoring with AI-generated insights
 */

import { FinScopeMetric } from './finscopeMetrics';
import { LLMService, LLMRequest } from './llm';
import { PromptManager } from './prompts';

export type HealthGrade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D' | 'D-' | 'F';

export interface MetricScore {
  concept: string;
  label: string;
  value: number | null;
  unit: string;
  score: number; // 0-100
  weight: number; // 0-1
  reasoning: string;
  benchmark: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
}

export interface HealthScoreResult {
  overallGrade: HealthGrade;
  overallScore: number; // 0-100
  weightedScore: number;
  metricScores: MetricScore[];
  analysis: {
    strengths: string[];
    concerns: string[];
    keyInsights: string[];
    riskFactors: string[];
    investorSummary: string;
  };
  aiGenerated: {
    fullAnalysis: string;
    confidence: 'high' | 'medium' | 'low';
    requestId: string;
  };
  industry: string;
  calculatedAt: string;
}

export class HealthScoringService {
  private llmService: LLMService;

  constructor(llmService: LLMService) {
    this.llmService = llmService;
  }

  async calculateHealthScore(
    companyName: string,
    ticker: string,
    metrics: FinScopeMetric[],
    industry: string = 'Technology'
  ): Promise<HealthScoreResult> {
    console.log(`🏥 Calculating health score for ${ticker} (${companyName})`);

    // Step 1: Calculate quantitative scores for each metric
    const metricScores = this.calculateMetricScores(metrics, industry);
    
    // Step 2: Calculate weighted overall score
    const weightedScore = this.calculateWeightedScore(metricScores);
    const overallScore = Math.round(weightedScore);
    const overallGrade = this.scoreToGrade(overallScore);

    // Step 3: Generate AI analysis
    const aiAnalysis = await this.generateAIAnalysis(companyName, ticker, metrics, industry);

    // Step 4: Extract structured insights from AI analysis
    const structuredAnalysis = this.extractStructuredInsights(aiAnalysis.content, metricScores);

    return {
      overallGrade,
      overallScore,
      weightedScore,
      metricScores,
      analysis: structuredAnalysis,
      aiGenerated: {
        fullAnalysis: aiAnalysis.content,
        confidence: aiAnalysis.confidence,
        requestId: aiAnalysis.requestId
      },
      industry,
      calculatedAt: new Date().toISOString()
    };
  }

  private calculateMetricScores(metrics: FinScopeMetric[], industry: string): MetricScore[] {
    const scores: MetricScore[] = [];

    for (const metric of metrics) {
      if (metric.value === null) continue;

      const benchmark = this.getBenchmark(metric.concept, industry);
      const score = this.calculateMetricScore(metric.value, metric.concept, benchmark);
      const weight = this.getMetricWeight(metric.concept, industry);
      const reasoning = this.generateScoreReasoning(metric, score, benchmark);

      scores.push({
        concept: metric.concept,
        label: metric.label,
        value: metric.value,
        unit: metric.unit,
        score,
        weight,
        reasoning,
        benchmark
      });
    }

    return scores;
  }

  private getBenchmark(concept: string, industry: string) {
    // Industry-adjusted benchmarks
    const benchmarks: Record<string, Record<string, any>> = {
      'Growth': {
        'Technology': { excellent: 20, good: 10, average: 5, poor: 0 },
        'Healthcare': { excellent: 15, good: 8, average: 4, poor: 0 },
        'Finance': { excellent: 10, good: 5, average: 2, poor: 0 },
        'default': { excellent: 15, good: 8, average: 3, poor: 0 }
      },
      'Profitability': {
        'Technology': { excellent: 25, good: 15, average: 8, poor: 0 },
        'Healthcare': { excellent: 20, good: 12, average: 6, poor: 0 },
        'Finance': { excellent: 30, good: 20, average: 10, poor: 0 },
        'default': { excellent: 20, good: 12, average: 6, poor: 0 }
      },
      'ROIC': {
        'Technology': { excellent: 20, good: 15, average: 10, poor: 5 },
        'Healthcare': { excellent: 18, good: 12, average: 8, poor: 4 },
        'Finance': { excellent: 15, good: 10, average: 6, poor: 3 },
        'default': { excellent: 15, good: 10, average: 6, poor: 3 }
      },
      'Valuation': {
        'Technology': { excellent: 15, good: 25, average: 40, poor: 60 }, // Lower P/E is better
        'Healthcare': { excellent: 12, good: 20, average: 35, poor: 50 },
        'Finance': { excellent: 8, good: 12, average: 18, poor: 25 },
        'default': { excellent: 12, good: 20, average: 30, poor: 45 }
      },
      'DebtToEquity': {
        'Technology': { excellent: 0.2, good: 0.5, average: 1.0, poor: 2.0 }, // Lower is better
        'Healthcare': { excellent: 0.3, good: 0.6, average: 1.2, poor: 2.5 },
        'Finance': { excellent: 2.0, good: 4.0, average: 6.0, poor: 10.0 }, // Financial companies have higher debt
        'default': { excellent: 0.3, good: 0.6, average: 1.0, poor: 2.0 }
      }
    };

    const conceptBenchmarks = benchmarks[concept];
    if (!conceptBenchmarks) {
      // Default benchmark for unknown metrics
      return { excellent: 80, good: 60, average: 40, poor: 20 };
    }

    return conceptBenchmarks[industry] || conceptBenchmarks['default'];
  }

  private calculateMetricScore(value: number, concept: string, benchmark: any): number {
    // For "lower is better" metrics (P/E, Debt-to-Equity)
    const lowerIsBetter = ['Valuation', 'DebtToEquity'].includes(concept);

    if (lowerIsBetter) {
      if (value <= benchmark.excellent) return 100;
      if (value <= benchmark.good) return 80;
      if (value <= benchmark.average) return 60;
      if (value <= benchmark.poor) return 40;
      return 20;
    } else {
      // For "higher is better" metrics (Growth, Profitability, ROIC)
      if (value >= benchmark.excellent) return 100;
      if (value >= benchmark.good) return 80;
      if (value >= benchmark.average) return 60;
      if (value >= benchmark.poor) return 40;
      return 20;
    }
  }

  private getMetricWeight(concept: string, industry: string): number {
    // Dynamic weights based on industry focus
    const weights: Record<string, Record<string, number>> = {
      'Technology': {
        'Growth': 0.25,
        'Profitability': 0.20,
        'ROIC': 0.20,
        'CashFlow': 0.15,
        'Valuation': 0.10,
        'DebtToEquity': 0.10
      },
      'Healthcare': {
        'Profitability': 0.25,
        'ROIC': 0.20,
        'Growth': 0.20,
        'CashFlow': 0.15,
        'DebtToEquity': 0.10,
        'Valuation': 0.10
      },
      'Finance': {
        'Profitability': 0.30,
        'ROIC': 0.25,
        'DebtToEquity': 0.20,
        'CashFlow': 0.15,
        'Growth': 0.05,
        'Valuation': 0.05
      },
      'default': {
        'Growth': 0.20,
        'Profitability': 0.20,
        'ROIC': 0.20,
        'CashFlow': 0.15,
        'Valuation': 0.15,
        'DebtToEquity': 0.10
      }
    };

    const industryWeights = weights[industry] || weights['default'];
    return industryWeights[concept] || 0.1; // Default weight
  }

  private calculateWeightedScore(metricScores: MetricScore[]): number {
    const totalWeight = metricScores.reduce((sum, metric) => sum + metric.weight, 0);
    const weightedSum = metricScores.reduce((sum, metric) => sum + (metric.score * metric.weight), 0);
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private scoreToGrade(score: number): HealthGrade {
    if (score >= 97) return 'A+';
    if (score >= 93) return 'A';
    if (score >= 90) return 'A-';
    if (score >= 87) return 'B+';
    if (score >= 83) return 'B';
    if (score >= 80) return 'B-';
    if (score >= 77) return 'C+';
    if (score >= 73) return 'C';
    if (score >= 70) return 'C-';
    if (score >= 67) return 'D+';
    if (score >= 63) return 'D';
    if (score >= 60) return 'D-';
    return 'F';
  }

  private generateScoreReasoning(metric: FinScopeMetric, score: number, benchmark: any): string {
    const value = metric.value;
    const isGood = score >= 80;
    const isAverage = score >= 60 && score < 80;
    
    if (isGood) {
      return `Excellent ${metric.label.toLowerCase()} of ${value} ${metric.unit} significantly exceeds industry benchmarks.`;
    } else if (isAverage) {
      return `${metric.label} of ${value} ${metric.unit} is within acceptable range but has room for improvement.`;
    } else {
      return `${metric.label} of ${value} ${metric.unit} is below industry standards and needs attention.`;
    }
  }

  private async generateAIAnalysis(
    companyName: string,
    ticker: string,
    metrics: FinScopeMetric[],
    industry: string
  ): Promise<{ content: string; confidence: 'high' | 'medium' | 'low'; requestId: string }> {
    try {
      const prompt = PromptManager.createHealthScorePrompt(companyName, ticker, metrics, industry);
      
      const llmRequest: LLMRequest = {
        prompt,
        maxTokens: 1500,
        temperature: 0.3,
        context: { companyName, ticker, industry },
        useCache: true,
        cacheTTL: 24 * 60 * 60 // 24 hours
      };

      const response = await this.llmService.generateResponse(llmRequest);
      
      return {
        content: response.content,
        confidence: response.confidence,
        requestId: response.requestId
      };
    } catch (error) {
      console.error(`❌ AI analysis failed for ${ticker}:`, error);
      
      // Fallback to basic analysis
      return {
        content: this.generateFallbackAnalysis(companyName, ticker, metrics),
        confidence: 'low',
        requestId: 'fallback_' + Date.now()
      };
    }
  }

  private generateFallbackAnalysis(companyName: string, ticker: string, metrics: FinScopeMetric[]): string {
    const growthMetric = metrics.find(m => m.concept === 'Growth');
    const profitMetric = metrics.find(m => m.concept === 'Profitability');
    
    return `Financial analysis for ${companyName} (${ticker}):

Based on available metrics, the company shows ${growthMetric?.value || 'N/A'}% growth and ${profitMetric?.value || 'N/A'}% profitability. 

Key observations:
• Revenue trends indicate ${growthMetric && growthMetric.value! > 10 ? 'strong' : 'moderate'} business momentum
• Profitability metrics suggest ${profitMetric && profitMetric.value! > 15 ? 'healthy' : 'developing'} operational efficiency
• Overall financial position appears stable with standard industry characteristics

Note: This analysis is generated using basic metrics due to AI service limitations. For comprehensive insights, please ensure AI services are properly configured.`;
  }

  private extractStructuredInsights(aiContent: string, metricScores: MetricScore[]) {
    // Parse AI content to extract structured insights
    // This is a simplified parser - in production, you might use more sophisticated NLP
    
    const strengths: string[] = [];
    const concerns: string[] = [];
    const keyInsights: string[] = [];
    const riskFactors: string[] = [];

    // Look for strength indicators
    const strengthIndicators = ['strength', 'excellent', 'strong', 'outstanding', 'impressive'];
    const concernIndicators = ['concern', 'weakness', 'poor', 'low', 'declining', 'risk'];

    const sentences = aiContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      
      if (strengthIndicators.some(indicator => lower.includes(indicator))) {
        if (strengths.length < 3) strengths.push(sentence.trim());
      }
      
      if (concernIndicators.some(indicator => lower.includes(indicator))) {
        if (concerns.length < 2) concerns.push(sentence.trim());
      }
    }

    // Add fallback insights based on metric scores
    if (strengths.length === 0) {
      const bestMetrics = metricScores.filter(m => m.score >= 80).slice(0, 2);
      strengths.push(...bestMetrics.map(m => `Strong ${m.label.toLowerCase()} performance`));
    }

    if (concerns.length === 0) {
      const weakMetrics = metricScores.filter(m => m.score < 60).slice(0, 1);
      if (weakMetrics.length > 0) {
        concerns.push(`${weakMetrics[0].label} below industry average`);
      }
    }

    // Generate key insights
    keyInsights.push(`Overall financial health rated ${this.scoreToGrade(metricScores.reduce((sum, m) => sum + m.score, 0) / metricScores.length)}`);
    
    // Generate investor summary
    const avgScore = metricScores.reduce((sum, m) => sum + m.score, 0) / metricScores.length;
    const investorSummary = avgScore >= 80 
      ? "Strong financial position with solid fundamentals across key metrics."
      : avgScore >= 60 
      ? "Stable financial position with some areas for improvement."
      : "Mixed financial indicators requiring careful evaluation.";

    return {
      strengths: strengths.slice(0, 3),
      concerns: concerns.slice(0, 2),
      keyInsights: keyInsights.slice(0, 3),
      riskFactors: riskFactors.slice(0, 2),
      investorSummary
    };
  }

  // Utility methods for testing and development
  async testHealthScoring(ticker: string = 'AAPL'): Promise<void> {
    console.log(`🧪 Testing health scoring for ${ticker}...`);
    
    // Mock metrics for testing
    const mockMetrics: FinScopeMetric[] = [
      {
        concept: 'Growth',
        label: 'Revenue Growth (YoY)',
        value: 5.97,
        unit: 'Percentage',
        periodEnd: new Date().toISOString(),
        fiscalPeriod: 'TTM',
        fiscalYear: 2025,
        source: 'Test',
        confidence: 'high'
      }
    ];

    try {
      const result = await this.calculateHealthScore('Apple Inc', ticker, mockMetrics);
      console.log(`✅ Health score calculated: ${result.overallGrade} (${result.overallScore})`);
    } catch (error) {
      console.error('❌ Health scoring test failed:', error);
    }
  }
}