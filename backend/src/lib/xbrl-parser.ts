import type { CompanyFacts, Fact } from '../types/sec';

export interface ParsedFact {
  concept: string;
  taxonomy: string;
  unit: string;
  value: number;
  periodStart: Date | null;
  periodEnd: Date;
  instant: boolean;
  fiscalYear: number;
  fiscalPeriod: string;
  filingAccession: string;
  form: string;
  filed: Date;
}

export interface ParsedFinancialData {
  cik: string;
  entityName: string;
  facts: ParsedFact[];
}

export class XBRLParser {
  // Key financial concepts we want to extract
  private static readonly CORE_CONCEPTS = {
    // Income Statement (duration)
    'Revenues': 'us-gaap',
    'CostOfRevenue': 'us-gaap',
    'GrossProfit': 'us-gaap', 
    'OperatingIncomeLoss': 'us-gaap',
    'NetIncomeLoss': 'us-gaap',
    'EarningsPerShareDiluted': 'us-gaap',
    'WeightedAverageNumberOfDilutedSharesOutstanding': 'us-gaap',
    
    // Balance Sheet (instant)
    'Assets': 'us-gaap',
    'AssetsCurrent': 'us-gaap',
    'Liabilities': 'us-gaap',
    'LiabilitiesCurrent': 'us-gaap',
    'StockholdersEquity': 'us-gaap',
    'CashAndCashEquivalentsAtCarryingValue': 'us-gaap',
    'LongTermDebtNoncurrent': 'us-gaap',
    
    // Cash Flow (duration)
    'NetCashProvidedByUsedInOperatingActivities': 'us-gaap',
    'NetCashProvidedByUsedInInvestingActivities': 'us-gaap',
    'NetCashProvidedByUsedInFinancingActivities': 'us-gaap',
  };

  static parse(companyFacts: CompanyFacts): ParsedFinancialData {
    const facts: ParsedFact[] = [];

    // Process each taxonomy (us-gaap, dei, ifrs-full)
    Object.entries(companyFacts.facts).forEach(([taxonomy, taxonomyFacts]) => {
      if (!taxonomyFacts) return;

      Object.entries(taxonomyFacts).forEach(([concept, fact]) => {
        // Only process core concepts for now
        if (taxonomy === 'us-gaap' && !(concept in this.CORE_CONCEPTS)) {
          return;
        }

        const parsedFacts = this.parseFact(concept, taxonomy, fact);
        facts.push(...parsedFacts);
      });
    });

    return {
      cik: companyFacts.cik,
      entityName: companyFacts.entityName,
      facts: facts.sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime()),
    };
  }

  private static parseFact(concept: string, taxonomy: string, fact: Fact): ParsedFact[] {
    const parsedFacts: ParsedFact[] = [];

    Object.entries(fact.units).forEach(([unit, unitData]) => {
      // Prefer USD for monetary values, pure for ratios/counts
      if (this.shouldSkipUnit(concept, unit)) {
        return;
      }

      unitData.val.forEach((val) => {
        try {
          const parsedFact = this.parseFactValue(concept, taxonomy, unit, val);
          if (parsedFact) {
            parsedFacts.push(parsedFact);
          }
        } catch (error) {
          console.warn(`Failed to parse fact ${concept} for period ${val.end}:`, error);
        }
      });
    });

    return parsedFacts;
  }

  private static parseFactValue(
    concept: string,
    taxonomy: string,
    unit: string,
    val: any
  ): ParsedFact | null {
    // Skip non-numeric values for financial metrics
    const numericValue = this.parseNumericValue(val.val);
    if (numericValue === null) {
      return null;
    }

    // Parse dates
    const periodEnd = new Date(val.end);
    const periodStart = val.start ? new Date(val.start) : null;
    const filed = new Date(val.filed);

    // Determine if this is an instant or duration measurement
    const instant = this.isInstantConcept(concept);

    // Normalize unit
    const normalizedUnit = this.normalizeUnit(unit);
    if (!normalizedUnit) {
      return null;
    }

    // Normalize scale (SEC often reports in thousands/millions)
    const normalizedValue = this.normalizeScale(numericValue, normalizedUnit.unit);

    return {
      concept,
      taxonomy,
      unit: normalizedUnit.unit,
      value: normalizedValue,
      periodStart,
      periodEnd,
      instant,
      fiscalYear: val.fy,
      fiscalPeriod: val.fp,
      filingAccession: val.accn,
      form: val.form,
      filed,
    };
  }

  private static parseNumericValue(value: any): number | null {
    if (typeof value === 'number') {
      return value;
    }
    
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? null : parsed;
    }
    
    return null;
  }

  private static isInstantConcept(concept: string): boolean {
    // Balance sheet items are instant, income statement items are duration
    const instantConcepts = [
      'Assets',
      'AssetsCurrent', 
      'Liabilities',
      'LiabilitiesCurrent',
      'StockholdersEquity',
      'CashAndCashEquivalentsAtCarryingValue',
      'LongTermDebtNoncurrent',
    ];
    
    return instantConcepts.includes(concept);
  }

  private static shouldSkipUnit(concept: string, unit: string): boolean {
    // For monetary concepts, prefer USD and its variations
    const monetaryConcepts = [
      'Revenues', 'CostOfRevenue', 'GrossProfit', 'OperatingIncomeLoss',
      'NetIncomeLoss', 'Assets', 'Liabilities', 'StockholdersEquity',
      'CashAndCashEquivalentsAtCarryingValue', 'LongTermDebtNoncurrent'
    ];
    
    if (monetaryConcepts.includes(concept)) {
      return !unit.toLowerCase().includes('usd');
    }
    
    // For share counts and ratios, prefer 'shares' or 'pure'
    const shareConcepts = ['WeightedAverageNumberOfDilutedSharesOutstanding'];
    const ratioConcepts = ['EarningsPerShareDiluted'];
    
    if (shareConcepts.includes(concept)) {
      return !unit.toLowerCase().includes('shares');
    }
    
    if (ratioConcepts.includes(concept)) {
      return !['pure', 'usdpershare', 'usd/shares'].includes(unit.toLowerCase());
    }
    
    return false;
  }

  private static normalizeUnit(unit: string): { unit: string; scale: number } | null {
    const unitLower = unit.toLowerCase();
    
    // Handle USD variations
    if (unitLower.includes('usd')) {
      if (unitLower.includes('million') || unitLower.includes('mil')) {
        return { unit: 'USD', scale: 1000000 };
      }
      if (unitLower.includes('thousand') || unitLower.includes('k')) {
        return { unit: 'USD', scale: 1000 };
      }
      if (unitLower.includes('billion') || unitLower.includes('bil')) {
        return { unit: 'USD', scale: 1000000000 };
      }
      return { unit: 'USD', scale: 1 };
    }
    
    // Handle shares
    if (unitLower.includes('shares')) {
      return { unit: 'shares', scale: 1 };
    }
    
    // Handle ratios
    if (unitLower === 'pure' || unitLower.includes('pershare') || unitLower === 'usd/shares') {
      return { unit: 'pure', scale: 1 };
    }
    
    return null;
  }

  private static normalizeScale(value: number, unit: string): number {
    // Values are already in the correct scale based on unit parsing
    return value;
  }

  // Helper method to get the latest value for a specific concept
  static getLatestValue(facts: ParsedFact[], concept: string): ParsedFact | null {
    const conceptFacts = facts.filter(f => f.concept === concept);
    if (conceptFacts.length === 0) return null;
    
    // Return the most recent fact
    return conceptFacts.reduce((latest, current) => 
      current.periodEnd > latest.periodEnd ? current : latest
    );
  }

  // Helper method to get quarterly values for a concept
  static getQuarterlyValues(facts: ParsedFact[], concept: string, quarters = 12): ParsedFact[] {
    const conceptFacts = facts
      .filter(f => f.concept === concept && ['Q1', 'Q2', 'Q3', 'Q4'].includes(f.fiscalPeriod))
      .sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime());
    
    return conceptFacts.slice(0, quarters);
  }
}