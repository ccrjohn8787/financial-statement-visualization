/**
 * Advanced Financial Calculations Service
 * 
 * Provides comprehensive financial ratio calculations, trend analysis,
 * and performance metrics beyond basic provider data.
 */

import { FinancialRatio, FinancialMetric } from '../providers/types';
import { PrismaClient } from '@prisma/client';

export interface TrendPoint {
  period: string;
  value: number;
  change: number;
  changePercent: number;
}

export interface TrendAnalysis {
  metric: string;
  trend: 'improving' | 'declining' | 'stable';
  direction: number; // -1 to 1
  volatility: number; // 0 to 1
  points: TrendPoint[];
  forecast?: number;
}

export interface CompanyPerformanceMetrics {
  profitability: {
    grossMarginTrend: TrendAnalysis;
    operatingMarginTrend: TrendAnalysis;
    netMarginTrend: TrendAnalysis;
    roeTrend: TrendAnalysis;
    roaTrend: TrendAnalysis;
  };
  liquidity: {
    currentRatioTrend: TrendAnalysis;
    quickRatioTrend: TrendAnalysis;
    workingCapitalTrend: TrendAnalysis;
  };
  leverage: {
    debtToEquityTrend: TrendAnalysis;
    interestCoverageTrend: TrendAnalysis;
    debtServiceCoverageTrend: TrendAnalysis;
  };
  efficiency: {
    assetTurnoverTrend: TrendAnalysis;
    inventoryTurnoverTrend: TrendAnalysis;
    receivablesTurnoverTrend: TrendAnalysis;
  };
  valuation: {
    peTrend: TrendAnalysis;
    pbTrend: TrendAnalysis;
    evEbitdaTrend: TrendAnalysis;
    pegRatio: number;
  };
}

export class FinancialCalculationsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Calculate comprehensive financial ratios from XBRL data
   */
  async calculateAdvancedRatios(ticker: string, periods: number = 8): Promise<FinancialRatio[]> {
    const ratios: FinancialRatio[] = [];

    try {
      // Get historical financial data
      const company = await this.prisma.company.findUnique({
        where: { ticker: ticker.toUpperCase() },
        include: {
          facts: {
            orderBy: { periodEnd: 'desc' },
            take: periods * 10, // Get extra to ensure we have enough data
          }
        }
      });

      if (!company || !company.facts.length) {
        return ratios;
      }

      // Group facts by period for calculation
      const periodData = this.groupFactsByPeriod(company.facts);
      
      // Calculate ratios for each period
      for (const [period, facts] of periodData.entries()) {
        const periodEnd = new Date(period);
        const metrics = this.factsToMetrics(facts);
        
        // Profitability Ratios
        const grossMargin = this.calculateGrossMargin(metrics);
        if (grossMargin !== null) {
          ratios.push({
            name: 'Gross Profit Margin',
            category: 'profitability',
            value: grossMargin,
            formula: '(Revenue - Cost of Goods Sold) / Revenue',
            description: 'Percentage of revenue remaining after direct costs',
            period: this.getPeriodString(periodEnd),
            periodEnd,
          });
        }

        const operatingMargin = this.calculateOperatingMargin(metrics);
        if (operatingMargin !== null) {
          ratios.push({
            name: 'Operating Margin',
            category: 'profitability',
            value: operatingMargin,
            formula: 'Operating Income / Revenue',
            description: 'Percentage of revenue remaining after operating expenses',
            period: this.getPeriodString(periodEnd),
            periodEnd,
          });
        }

        const netMargin = this.calculateNetMargin(metrics);
        if (netMargin !== null) {
          ratios.push({
            name: 'Net Profit Margin',
            category: 'profitability',
            value: netMargin,
            formula: 'Net Income / Revenue',
            description: 'Percentage of revenue remaining after all expenses',
            period: this.getPeriodString(periodEnd),
            periodEnd,
          });
        }

        const roe = this.calculateROE(metrics);
        if (roe !== null) {
          ratios.push({
            name: 'Return on Equity',
            category: 'profitability',
            value: roe,
            formula: 'Net Income / Shareholders Equity',
            description: 'Net income generated per dollar of equity',
            period: this.getPeriodString(periodEnd),
            periodEnd,
          });
        }

        const roa = this.calculateROA(metrics);
        if (roa !== null) {
          ratios.push({
            name: 'Return on Assets',
            category: 'profitability',
            value: roa,
            formula: 'Net Income / Total Assets',
            description: 'Net income generated per dollar of assets',
            period: this.getPeriodString(periodEnd),
            periodEnd,
          });
        }

        // Liquidity Ratios
        const currentRatio = this.calculateCurrentRatio(metrics);
        if (currentRatio !== null) {
          ratios.push({
            name: 'Current Ratio',
            category: 'liquidity',
            value: currentRatio,
            formula: 'Current Assets / Current Liabilities',
            description: 'Ability to pay short-term obligations',
            period: this.getPeriodString(periodEnd),
            periodEnd,
          });
        }

        const quickRatio = this.calculateQuickRatio(metrics);
        if (quickRatio !== null) {
          ratios.push({
            name: 'Quick Ratio',
            category: 'liquidity',
            value: quickRatio,
            formula: '(Current Assets - Inventory) / Current Liabilities',
            description: 'Ability to pay short-term obligations with liquid assets',
            period: this.getPeriodString(periodEnd),
            periodEnd,
          });
        }

        // Leverage Ratios
        const debtToEquity = this.calculateDebtToEquity(metrics);
        if (debtToEquity !== null) {
          ratios.push({
            name: 'Debt to Equity',
            category: 'leverage',
            value: debtToEquity,
            formula: 'Total Debt / Shareholders Equity',
            description: 'Financial leverage and capital structure',
            period: this.getPeriodString(periodEnd),
            periodEnd,
          });
        }

        const interestCoverage = this.calculateInterestCoverage(metrics);
        if (interestCoverage !== null) {
          ratios.push({
            name: 'Interest Coverage Ratio',
            category: 'leverage',
            value: interestCoverage,
            formula: 'EBIT / Interest Expense',
            description: 'Ability to pay interest on debt',
            period: this.getPeriodString(periodEnd),
            periodEnd,
          });
        }

        // Efficiency Ratios
        const assetTurnover = this.calculateAssetTurnover(metrics);
        if (assetTurnover !== null) {
          ratios.push({
            name: 'Asset Turnover',
            category: 'efficiency',
            value: assetTurnover,
            formula: 'Revenue / Average Total Assets',
            description: 'Efficiency of asset utilization',
            period: this.getPeriodString(periodEnd),
            periodEnd,
          });
        }
      }

      return ratios.slice(0, periods * 10); // Limit to reasonable number
    } catch (error) {
      console.error('Error calculating advanced ratios:', error);
      return ratios;
    }
  }

  /**
   * Perform trend analysis on financial metrics
   */
  analyzeTrends(ratios: FinancialRatio[], metricName: string): TrendAnalysis {
    const metricRatios = ratios
      .filter(r => r.name === metricName)
      .sort((a, b) => a.periodEnd.getTime() - b.periodEnd.getTime());

    if (metricRatios.length < 2) {
      return {
        metric: metricName,
        trend: 'stable',
        direction: 0,
        volatility: 0,
        points: [],
      };
    }

    // Calculate trend points
    const points: TrendPoint[] = metricRatios.map((ratio, index) => {
      const previousValue = index > 0 ? metricRatios[index - 1].value : ratio.value;
      const change = ratio.value - previousValue;
      const changePercent = previousValue !== 0 ? (change / Math.abs(previousValue)) * 100 : 0;

      return {
        period: ratio.period,
        value: ratio.value,
        change: index === 0 ? 0 : change,
        changePercent: index === 0 ? 0 : changePercent,
      };
    });

    // Calculate overall direction using linear regression
    const direction = this.calculateTrendDirection(metricRatios.map(r => r.value));
    
    // Calculate volatility
    const volatility = this.calculateVolatility(metricRatios.map(r => r.value));
    
    // Determine trend classification
    const trend = this.classifyTrend(direction, volatility);

    // Simple forecast (linear projection)
    const forecast = this.forecastNextValue(metricRatios.map(r => r.value));

    return {
      metric: metricName,
      trend,
      direction,
      volatility,
      points,
      forecast,
    };
  }

  /**
   * Calculate comprehensive performance metrics
   */
  async calculatePerformanceMetrics(ticker: string): Promise<CompanyPerformanceMetrics> {
    const ratios = await this.calculateAdvancedRatios(ticker, 8);

    return {
      profitability: {
        grossMarginTrend: this.analyzeTrends(ratios, 'Gross Profit Margin'),
        operatingMarginTrend: this.analyzeTrends(ratios, 'Operating Margin'),
        netMarginTrend: this.analyzeTrends(ratios, 'Net Profit Margin'),
        roeTrend: this.analyzeTrends(ratios, 'Return on Equity'),
        roaTrend: this.analyzeTrends(ratios, 'Return on Assets'),
      },
      liquidity: {
        currentRatioTrend: this.analyzeTrends(ratios, 'Current Ratio'),
        quickRatioTrend: this.analyzeTrends(ratios, 'Quick Ratio'),
        workingCapitalTrend: this.analyzeTrends(ratios, 'Working Capital Ratio'),
      },
      leverage: {
        debtToEquityTrend: this.analyzeTrends(ratios, 'Debt to Equity'),
        interestCoverageTrend: this.analyzeTrends(ratios, 'Interest Coverage Ratio'),
        debtServiceCoverageTrend: this.analyzeTrends(ratios, 'Debt Service Coverage'),
      },
      efficiency: {
        assetTurnoverTrend: this.analyzeTrends(ratios, 'Asset Turnover'),
        inventoryTurnoverTrend: this.analyzeTrends(ratios, 'Inventory Turnover'),
        receivablesTurnoverTrend: this.analyzeTrends(ratios, 'Receivables Turnover'),
      },
      valuation: {
        peTrend: this.analyzeTrends(ratios, 'Price to Earnings'),
        pbTrend: this.analyzeTrends(ratios, 'Price to Book'),
        evEbitdaTrend: this.analyzeTrends(ratios, 'EV/EBITDA'),
        pegRatio: this.calculatePEGRatio(ratios),
      },
    };
  }

  // Private helper methods
  private groupFactsByPeriod(facts: any[]): Map<string, any[]> {
    const periodData = new Map<string, any[]>();
    
    facts.forEach(fact => {
      const period = fact.periodEnd.toISOString();
      if (!periodData.has(period)) {
        periodData.set(period, []);
      }
      periodData.get(period)!.push(fact);
    });

    return periodData;
  }

  private factsToMetrics(facts: any[]): Map<string, number> {
    const metrics = new Map<string, number>();
    
    facts.forEach(fact => {
      metrics.set(fact.concept, fact.value);
    });

    return metrics;
  }

  private calculateGrossMargin(metrics: Map<string, number>): number | null {
    const revenue = metrics.get('Revenues');
    const cogs = metrics.get('CostOfGoodsAndServicesSold') || metrics.get('CostOfRevenue');
    
    if (!revenue || !cogs) return null;
    return ((revenue - cogs) / revenue) * 100;
  }

  private calculateOperatingMargin(metrics: Map<string, number>): number | null {
    const revenue = metrics.get('Revenues');
    const operatingIncome = metrics.get('OperatingIncomeLoss');
    
    if (!revenue || !operatingIncome) return null;
    return (operatingIncome / revenue) * 100;
  }

  private calculateNetMargin(metrics: Map<string, number>): number | null {
    const revenue = metrics.get('Revenues');
    const netIncome = metrics.get('NetIncomeLoss');
    
    if (!revenue || !netIncome) return null;
    return (netIncome / revenue) * 100;
  }

  private calculateROE(metrics: Map<string, number>): number | null {
    const netIncome = metrics.get('NetIncomeLoss');
    const equity = metrics.get('StockholdersEquity');
    
    if (!netIncome || !equity) return null;
    return (netIncome / equity) * 100;
  }

  private calculateROA(metrics: Map<string, number>): number | null {
    const netIncome = metrics.get('NetIncomeLoss');
    const assets = metrics.get('Assets');
    
    if (!netIncome || !assets) return null;
    return (netIncome / assets) * 100;
  }

  private calculateCurrentRatio(metrics: Map<string, number>): number | null {
    const currentAssets = metrics.get('AssetsCurrent');
    const currentLiabilities = metrics.get('LiabilitiesCurrent');
    
    if (!currentAssets || !currentLiabilities) return null;
    return currentAssets / currentLiabilities;
  }

  private calculateQuickRatio(metrics: Map<string, number>): number | null {
    const currentAssets = metrics.get('AssetsCurrent');
    const inventory = metrics.get('InventoryNet') || 0;
    const currentLiabilities = metrics.get('LiabilitiesCurrent');
    
    if (!currentAssets || !currentLiabilities) return null;
    return (currentAssets - inventory) / currentLiabilities;
  }

  private calculateDebtToEquity(metrics: Map<string, number>): number | null {
    const totalDebt = (metrics.get('LongTermDebtNoncurrent') || 0) + 
                     (metrics.get('LongTermDebtCurrent') || 0);
    const equity = metrics.get('StockholdersEquity');
    
    if (!equity || totalDebt === 0) return null;
    return totalDebt / equity;
  }

  private calculateInterestCoverage(metrics: Map<string, number>): number | null {
    const operatingIncome = metrics.get('OperatingIncomeLoss');
    const interestExpense = metrics.get('InterestExpense');
    
    if (!operatingIncome || !interestExpense) return null;
    return operatingIncome / interestExpense;
  }

  private calculateAssetTurnover(metrics: Map<string, number>): number | null {
    const revenue = metrics.get('Revenues');
    const assets = metrics.get('Assets');
    
    if (!revenue || !assets) return null;
    return revenue / assets;
  }

  private calculateTrendDirection(values: number[]): number {
    if (values.length < 2) return 0;
    
    // Simple linear regression slope
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * values[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Normalize to -1 to 1
    return Math.max(-1, Math.min(1, slope));
  }

  private calculateVolatility(values: number[]): number {
    if (values.length < 2) return 0;
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Normalize by mean to get coefficient of variation
    return mean !== 0 ? Math.min(1, stdDev / Math.abs(mean)) : 0;
  }

  private classifyTrend(direction: number, volatility: number): 'improving' | 'declining' | 'stable' {
    const threshold = 0.1;
    
    if (Math.abs(direction) < threshold || volatility > 0.5) {
      return 'stable';
    }
    
    return direction > 0 ? 'improving' : 'declining';
  }

  private forecastNextValue(values: number[]): number {
    if (values.length < 2) return values[0] || 0;
    
    // Simple linear extrapolation
    const lastValue = values[values.length - 1];
    const secondLastValue = values[values.length - 2];
    const trend = lastValue - secondLastValue;
    
    return lastValue + trend;
  }

  private calculatePEGRatio(ratios: FinancialRatio[]): number {
    const peRatios = ratios.filter(r => r.name === 'Price to Earnings');
    const netMargins = ratios.filter(r => r.name === 'Net Profit Margin');
    
    if (peRatios.length < 2 || netMargins.length < 2) return 0;
    
    const latestPE = peRatios[peRatios.length - 1].value;
    const growthRate = this.calculateTrendDirection(netMargins.map(r => r.value)) * 100;
    
    return growthRate !== 0 ? latestPE / growthRate : 0;
  }

  private getPeriodString(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    if (month === 11) return `FY${year}`;
    return `Q${Math.floor(month / 3) + 1}${year}`;
  }
}