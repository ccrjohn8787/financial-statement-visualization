/**
 * Data Validation and Normalization Service
 * Ensures financial data correctness and provides debugging tools
 */

export interface ValidationRule {
  min?: number;
  max?: number;
  expectedUnit: 'percentage' | 'ratio' | 'dollars' | 'count';
  description: string;
}

export interface ValidationResult {
  isValid: boolean;
  normalizedValue: number;
  originalValue: number;
  issues: string[];
  appliedTransforms: string[];
}

export class DataValidator {
  
  // Expected ranges for financial metrics
  private static readonly VALIDATION_RULES: Record<string, ValidationRule> = {
    // Percentage metrics (should be 0-100 for most cases)
    'netMarginTTM': { min: -50, max: 100, expectedUnit: 'percentage', description: 'Net Margin TTM' },
    'revenueGrowthTTMYoy': { min: -90, max: 1000, expectedUnit: 'percentage', description: 'Revenue Growth YoY' },
    'roiTTM': { min: -100, max: 500, expectedUnit: 'percentage', description: 'Return on Investment TTM' },
    
    // Ratio metrics (typically 0-100, but can be higher)
    'peTTM': { min: 0, max: 200, expectedUnit: 'ratio', description: 'P/E Ratio TTM' },
    'totalDebtToEquityQuarterly': { min: 0, max: 10, expectedUnit: 'ratio', description: 'Debt to Equity Ratio' },
    
    // Per-share metrics (dollars)
    'pfcfShareTTM': { min: -100, max: 1000, expectedUnit: 'dollars', description: 'Free Cash Flow per Share TTM' },
    'revenuePerShareTTM': { min: 0, max: 10000, expectedUnit: 'dollars', description: 'Revenue per Share TTM' },
    'epsInclExtraItemsTTM': { min: -50, max: 500, expectedUnit: 'dollars', description: 'EPS Including Extra Items TTM' },
    
    // Share count (millions)
    'shareOutstanding': { min: 1, max: 50000, expectedUnit: 'count', description: 'Shares Outstanding (millions)' }
  };

  /**
   * Validates and normalizes a financial metric value
   */
  static validateMetric(
    metricName: string, 
    rawValue: any, 
    context: { ticker?: string; source?: string } = {}
  ): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      normalizedValue: 0,
      originalValue: rawValue,
      issues: [],
      appliedTransforms: []
    };

    // Handle null/undefined values
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      result.isValid = false;
      result.issues.push(`${metricName}: Value is null/undefined`);
      return result;
    }

    // Convert to number
    const numericValue = Number(rawValue);
    if (isNaN(numericValue)) {
      result.isValid = false;
      result.issues.push(`${metricName}: Cannot convert to number: ${rawValue}`);
      return result;
    }

    result.normalizedValue = numericValue;

    // Get validation rule for this metric
    const rule = this.VALIDATION_RULES[metricName];
    if (!rule) {
      result.issues.push(`${metricName}: No validation rule defined`);
      return result;
    }

    // Apply unit-specific validation and normalization
    switch (rule.expectedUnit) {
      case 'percentage':
        result.normalizedValue = this.normalizePercentage(numericValue, metricName);
        if (result.normalizedValue !== numericValue) {
          result.appliedTransforms.push(`Converted ${numericValue} to ${result.normalizedValue}% (assuming decimal input)`);
        }
        break;
        
      case 'ratio':
        // Ratios should be positive numbers, typically < 100
        result.normalizedValue = Math.abs(numericValue);
        if (result.normalizedValue !== numericValue) {
          result.appliedTransforms.push(`Converted negative ratio to positive: ${numericValue} → ${result.normalizedValue}`);
        }
        break;
        
      case 'dollars':
      case 'count':
        // Keep as-is, but validate range
        result.normalizedValue = numericValue;
        break;
    }

    // Range validation
    if (rule.min !== undefined && result.normalizedValue < rule.min) {
      result.issues.push(`${metricName}: Value ${result.normalizedValue} below minimum ${rule.min}`);
      result.isValid = false;
    }
    
    if (rule.max !== undefined && result.normalizedValue > rule.max) {
      result.issues.push(`${metricName}: Value ${result.normalizedValue} above maximum ${rule.max}`);
      result.isValid = false;
    }

    // Add context to issues
    if (context.ticker || context.source) {
      const contextStr = [context.ticker, context.source].filter(Boolean).join(' - ');
      result.issues = result.issues.map(issue => `[${contextStr}] ${issue}`);
    }

    return result;
  }

  /**
   * Smart percentage normalization
   * Detects if a value is likely in decimal (0.0597) or percentage (5.97) format
   */
  private static normalizePercentage(value: number, metricName: string): number {
    // If value is between -1 and 1, it's likely a decimal that needs conversion to percentage
    if (value >= -1 && value <= 1 && value !== 0) {
      return Math.round(value * 10000) / 100; // Convert 0.0597 → 5.97%
    }
    
    // If value is already in reasonable percentage range, use as-is with precision
    if (value >= -100 && value <= 1000) {
      return Math.round(value * 100) / 100; // Round to 2 decimal places
    }
    
    // For very large values, assume they were double-converted and scale down
    if (Math.abs(value) > 1000) {
      return Math.round(value) / 100; // Convert 597 → 5.97%
    }
    
    return value;
  }

  /**
   * Validates a complete company financial profile
   */
  static validateCompanyData(
    ticker: string,
    profile: any,
    financials: any
  ): { isValid: boolean; issues: string[]; validatedMetrics: Record<string, ValidationResult> } {
    const results: Record<string, ValidationResult> = {};
    const allIssues: string[] = [];
    let overallValid = true;

    const context = { ticker, source: 'Finnhub' };

    // Validate profile data
    if (profile.shareOutstanding) {
      results.shareOutstanding = this.validateMetric('shareOutstanding', profile.shareOutstanding, context);
    }

    // Validate financial metrics
    const metricsToValidate = [
      'netMarginTTM',
      'revenueGrowthTTMYoy', 
      'pfcfShareTTM',
      'peTTM',
      'totalDebtToEquityQuarterly',
      'roiTTM',
      'revenuePerShareTTM',
      'epsInclExtraItemsTTM'
    ];

    metricsToValidate.forEach(metricName => {
      if (financials.metric[metricName] !== undefined) {
        results[metricName] = this.validateMetric(metricName, financials.metric[metricName], context);
        
        if (!results[metricName].isValid) {
          overallValid = false;
        }
        
        allIssues.push(...results[metricName].issues);
      }
    });

    return {
      isValid: overallValid,
      issues: allIssues,
      validatedMetrics: results
    };
  }

  /**
   * Generates a validation report for debugging
   */
  static generateValidationReport(ticker: string, validationResults: Record<string, ValidationResult>): string {
    const lines: string[] = [
      `📊 Data Validation Report for ${ticker}`,
      `${'='.repeat(50)}`
    ];

    Object.entries(validationResults).forEach(([metricName, result]) => {
      const rule = this.VALIDATION_RULES[metricName];
      const status = result.isValid ? '✅' : '❌';
      
      lines.push(`${status} ${metricName} (${rule?.description || 'Unknown'})`);
      lines.push(`   Original: ${result.originalValue}`);
      lines.push(`   Normalized: ${result.normalizedValue}`);
      
      if (result.appliedTransforms.length > 0) {
        lines.push(`   Transforms: ${result.appliedTransforms.join(', ')}`);
      }
      
      if (result.issues.length > 0) {
        lines.push(`   Issues: ${result.issues.join(', ')}`);
      }
      
      lines.push('');
    });

    return lines.join('\n');
  }
}

/**
 * Helper function to safely extract and validate a metric
 */
export function extractValidatedMetric(
  metricName: string,
  rawValue: any,
  context: { ticker?: string; source?: string } = {}
): number | null {
  const validation = DataValidator.validateMetric(metricName, rawValue, context);
  
  if (!validation.isValid) {
    console.warn(`⚠️ Invalid metric ${metricName}:`, validation.issues.join(', '));
    return null;
  }
  
  if (validation.appliedTransforms.length > 0) {
    console.log(`🔧 Transformed ${metricName}:`, validation.appliedTransforms.join(', '));
  }
  
  return validation.normalizedValue;
}