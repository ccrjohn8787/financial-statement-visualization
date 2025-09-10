import { describe, it, expect } from 'vitest';
import { XBRLParser } from './xbrl-parser';
import type { CompanyFacts } from '../types/sec';

describe('XBRLParser', () => {
  const mockCompanyFacts: CompanyFacts = {
    cik: '0000320193',
    entityName: 'Apple Inc.',
    facts: {
      'us-gaap': {
        'Revenues': {
          label: 'Revenues',
          description: 'Revenue from contracts with customers',
          units: {
            'USD': {
              label: 'US Dollars',
              val: [
                {
                  end: '2023-09-30',
                  val: 383285000000,
                  accn: '0000320193-23-000106',
                  fy: 2023,
                  fp: 'FY',
                  form: '10-K',
                  filed: '2023-11-03',
                  start: '2022-10-01',
                },
                {
                  end: '2023-06-30',
                  val: 81797000000,
                  accn: '0000320193-23-000077',
                  fy: 2023,
                  fp: 'Q3',
                  form: '10-Q',
                  filed: '2023-08-04',
                  start: '2023-04-01',
                },
              ],
            },
          },
        },
        'CashAndCashEquivalentsAtCarryingValue': {
          label: 'Cash and Cash Equivalents',
          description: 'Cash and cash equivalents at carrying value',
          units: {
            'USD': {
              label: 'US Dollars',
              val: [
                {
                  end: '2023-09-30',
                  val: 29965000000,
                  accn: '0000320193-23-000106',
                  fy: 2023,
                  fp: 'FY',
                  form: '10-K',
                  filed: '2023-11-03',
                },
              ],
            },
          },
        },
        'EarningsPerShareDiluted': {
          label: 'Earnings Per Share, Diluted',
          units: {
            'USD/shares': {
              label: 'US Dollars per Share',
              val: [
                {
                  end: '2023-09-30',
                  val: 6.16,
                  accn: '0000320193-23-000106',
                  fy: 2023,
                  fp: 'FY',
                  form: '10-K',
                  filed: '2023-11-03',
                  start: '2022-10-01',
                },
              ],
            },
            'pure': {
              label: 'Pure ratio',
              val: [
                {
                  end: '2023-09-30',
                  val: 6.16,
                  accn: '0000320193-23-000106',
                  fy: 2023,
                  fp: 'FY',
                  form: '10-K',
                  filed: '2023-11-03',
                  start: '2022-10-01',
                },
              ],
            },
          },
        },
      },
    },
  };

  describe('parse', () => {
    it('should parse company facts correctly', () => {
      const result = XBRLParser.parse(mockCompanyFacts);

      expect(result.cik).toBe('0000320193');
      expect(result.entityName).toBe('Apple Inc.');
      expect(result.facts).toHaveLength(5); // 2 revenue entries + 1 cash + 2 EPS (USD/shares and pure units)
    });

    it('should correctly identify instant vs duration concepts', () => {
      const result = XBRLParser.parse(mockCompanyFacts);

      const revenueFacts = result.facts.filter(f => f.concept === 'Revenues');
      const cashFacts = result.facts.filter(f => f.concept === 'CashAndCashEquivalentsAtCarryingValue');

      // Revenue is duration (has start date)
      expect(revenueFacts[0].instant).toBe(false);
      expect(revenueFacts[0].periodStart).toBeInstanceOf(Date);

      // Cash is instant (no start date needed)
      expect(cashFacts[0].instant).toBe(true);
    });

    it('should sort facts by period end date (newest first)', () => {
      const result = XBRLParser.parse(mockCompanyFacts);
      const revenueFacts = result.facts.filter(f => f.concept === 'Revenues');

      expect(revenueFacts[0].periodEnd.getTime()).toBeGreaterThan(
        revenueFacts[1].periodEnd.getTime()
      );
    });

    it('should parse dates correctly', () => {
      const result = XBRLParser.parse(mockCompanyFacts);
      const fact = result.facts[0];

      expect(fact.periodEnd).toBeInstanceOf(Date);
      expect(fact.filed).toBeInstanceOf(Date);
    });

    it('should normalize units correctly', () => {
      const result = XBRLParser.parse(mockCompanyFacts);

      const usdFacts = result.facts.filter(f => f.unit === 'USD');
      const pureFacts = result.facts.filter(f => f.unit === 'pure');

      expect(usdFacts.length).toBeGreaterThan(0);
      expect(pureFacts.length).toBeGreaterThan(0);
    });

    it('should handle numeric values correctly', () => {
      const result = XBRLParser.parse(mockCompanyFacts);
      const revenueFact = result.facts.find(f => 
        f.concept === 'Revenues' && f.fiscalPeriod === 'FY'
      );

      expect(revenueFact?.value).toBe(383285000000);
      expect(typeof revenueFact?.value).toBe('number');
    });

    it('should preserve fiscal year and period information', () => {
      const result = XBRLParser.parse(mockCompanyFacts);
      const quarterlyFact = result.facts.find(f => 
        f.concept === 'Revenues' && f.fiscalPeriod === 'Q3'
      );

      expect(quarterlyFact?.fiscalYear).toBe(2023);
      expect(quarterlyFact?.fiscalPeriod).toBe('Q3');
      expect(quarterlyFact?.form).toBe('10-Q');
    });
  });

  describe('getLatestValue', () => {
    it('should return the most recent fact for a concept', () => {
      const result = XBRLParser.parse(mockCompanyFacts);
      const latestRevenue = XBRLParser.getLatestValue(result.facts, 'Revenues');

      expect(latestRevenue?.fiscalPeriod).toBe('FY');
      expect(latestRevenue?.fiscalYear).toBe(2023);
    });

    it('should return null for non-existent concept', () => {
      const result = XBRLParser.parse(mockCompanyFacts);
      const nonExistent = XBRLParser.getLatestValue(result.facts, 'NonExistentConcept');

      expect(nonExistent).toBeNull();
    });
  });

  describe('getQuarterlyValues', () => {
    it('should return quarterly facts only', () => {
      const result = XBRLParser.parse(mockCompanyFacts);
      const quarterlyRevenues = XBRLParser.getQuarterlyValues(result.facts, 'Revenues');

      expect(quarterlyRevenues).toHaveLength(1); // Only Q3 in mock data
      expect(quarterlyRevenues[0].fiscalPeriod).toBe('Q3');
    });

    it('should limit results to requested number of quarters', () => {
      const result = XBRLParser.parse(mockCompanyFacts);
      const limitedQuarterly = XBRLParser.getQuarterlyValues(result.facts, 'Revenues', 2);

      expect(limitedQuarterly.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for non-existent concept', () => {
      const result = XBRLParser.parse(mockCompanyFacts);
      const nonExistent = XBRLParser.getQuarterlyValues(result.facts, 'NonExistentConcept');

      expect(nonExistent).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty facts gracefully', () => {
      const emptyFacts: CompanyFacts = {
        cik: '0000000000',
        entityName: 'Empty Company',
        facts: {},
      };

      const result = XBRLParser.parse(emptyFacts);
      expect(result.facts).toHaveLength(0);
    });

    it('should handle string numeric values', () => {
      const factsWithStringValues: CompanyFacts = {
        cik: '0000320193',
        entityName: 'Apple Inc.',
        facts: {
          'us-gaap': {
            'Revenues': {
              units: {
                'USD': {
                  val: [
                    {
                      end: '2023-09-30',
                      val: '383285000000', // String instead of number
                      accn: '0000320193-23-000106',
                      fy: 2023,
                      fp: 'FY',
                      form: '10-K',
                      filed: '2023-11-03',
                      start: '2022-10-01',
                    },
                  ],
                },
              },
            },
          },
        },
      };

      const result = XBRLParser.parse(factsWithStringValues);
      expect(result.facts[0].value).toBe(383285000000);
    });

    it('should skip non-numeric values', () => {
      const factsWithInvalidValues: CompanyFacts = {
        cik: '0000320193',
        entityName: 'Apple Inc.',
        facts: {
          'us-gaap': {
            'Revenues': {
              units: {
                'USD': {
                  val: [
                    {
                      end: '2023-09-30',
                      val: 'invalid-number',
                      accn: '0000320193-23-000106',
                      fy: 2023,
                      fp: 'FY',
                      form: '10-K',
                      filed: '2023-11-03',
                      start: '2022-10-01',
                    },
                  ],
                },
              },
            },
          },
        },
      };

      const result = XBRLParser.parse(factsWithInvalidValues);
      expect(result.facts).toHaveLength(0); // Should skip invalid values
    });
  });
});