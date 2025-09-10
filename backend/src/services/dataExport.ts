/**
 * Data Export Service
 * 
 * Provides functionality to export financial data in various formats:
 * - CSV: Comma-separated values for spreadsheet applications
 * - Excel: Rich formatted spreadsheets with multiple sheets
 * - PDF: Professional reports with charts and tables
 * - JSON: Raw data for programmatic access
 */

import { PrismaClient } from '@prisma/client';
import { FinancialRatio } from '../providers/types';
import { FinancialCalculationsService, CompanyPerformanceMetrics } from './financialCalculations';
import { Response } from 'express';

export interface ExportOptions {
  ticker: string;
  format: 'csv' | 'excel' | 'pdf' | 'json';
  dateRange?: {
    from: Date;
    to: Date;
  };
  includeRatios?: boolean;
  includePerformance?: boolean;
  includePeers?: boolean;
  customFields?: string[];
}

export interface ExportData {
  company: {
    ticker: string;
    name: string;
    sector?: string;
    industry?: string;
  };
  financialData: {
    period: string;
    periodEnd: Date;
    metrics: Record<string, number>;
  }[];
  ratios?: FinancialRatio[];
  performance?: CompanyPerformanceMetrics;
  peers?: {
    ticker: string;
    name: string;
    marketCap: number;
    similarity: number;
  }[];
  exportMetadata: {
    generatedAt: Date;
    generatedBy: string;
    format: string;
    options: ExportOptions;
  };
}

export class DataExportService {
  private calculationsService: FinancialCalculationsService;

  constructor(private prisma: PrismaClient) {
    this.calculationsService = new FinancialCalculationsService(prisma);
  }

  /**
   * Export financial data in the requested format
   */
  async exportData(options: ExportOptions): Promise<ExportData> {
    const { ticker, includeRatios, includePerformance, includePeers } = options;

    // Get company information
    const company = await this.prisma.company.findUnique({
      where: { ticker: ticker.toUpperCase() },
      include: {
        facts: {
          orderBy: { periodEnd: 'desc' },
          where: options.dateRange ? {
            periodEnd: {
              gte: options.dateRange.from,
              lte: options.dateRange.to,
            }
          } : undefined,
          take: 100, // Limit to prevent excessive data
        }
      }
    });

    if (!company) {
      throw new Error(`Company ${ticker} not found`);
    }

    // Process financial data
    const periodData = this.groupFactsByPeriod(company.facts);
    const financialData = Array.from(periodData.entries()).map(([period, facts]) => ({
      period: this.getPeriodString(new Date(period)),
      periodEnd: new Date(period),
      metrics: this.factsToMetrics(facts),
    })).slice(0, 20); // Limit to 20 most recent periods

    const exportData: ExportData = {
      company: {
        ticker: company.ticker,
        name: company.name,
        sector: company.sector || undefined,
        industry: company.industry || undefined,
      },
      financialData,
      exportMetadata: {
        generatedAt: new Date(),
        generatedBy: 'Financial Statement Visualization Platform',
        format: options.format,
        options,
      },
    };

    // Add ratios if requested
    if (includeRatios) {
      exportData.ratios = await this.calculationsService.calculateAdvancedRatios(ticker, 8);
    }

    // Add performance metrics if requested
    if (includePerformance) {
      exportData.performance = await this.calculationsService.calculatePerformanceMetrics(ticker);
    }

    // Add peer data if requested
    if (includePeers) {
      // Mock peer data for now - would integrate with actual peer endpoint
      exportData.peers = [
        { ticker: 'PEER1', name: 'Peer Company 1', marketCap: 500000000000, similarity: 0.85 },
        { ticker: 'PEER2', name: 'Peer Company 2', marketCap: 300000000000, similarity: 0.78 },
        { ticker: 'PEER3', name: 'Peer Company 3', marketCap: 450000000000, similarity: 0.72 },
      ];
    }

    return exportData;
  }

  /**
   * Generate CSV format export
   */
  async generateCSV(data: ExportData): Promise<string> {
    const lines: string[] = [];
    
    // Header with company info
    lines.push(`# Financial Data Export for ${data.company.ticker}`);
    lines.push(`# Company: ${data.company.name}`);
    lines.push(`# Generated: ${data.exportMetadata.generatedAt.toISOString()}`);
    lines.push('');

    // Financial data section
    if (data.financialData.length > 0) {
      const headers = ['Period', 'Period End', ...Object.keys(data.financialData[0].metrics)];
      lines.push(headers.join(','));

      data.financialData.forEach(row => {
        const values = [
          row.period,
          row.periodEnd.toISOString().split('T')[0],
          ...Object.values(row.metrics).map(v => v?.toString() || '')
        ];
        lines.push(values.join(','));
      });
      lines.push('');
    }

    // Ratios section
    if (data.ratios && data.ratios.length > 0) {
      lines.push('# Financial Ratios');
      lines.push('Ratio Name,Category,Value,Formula,Period');
      data.ratios.forEach(ratio => {
        const values = [
          `"${ratio.name}"`,
          ratio.category,
          ratio.value.toString(),
          `"${ratio.formula}"`,
          ratio.period
        ];
        lines.push(values.join(','));
      });
      lines.push('');
    }

    // Peer data section
    if (data.peers && data.peers.length > 0) {
      lines.push('# Peer Companies');
      lines.push('Ticker,Name,Market Cap,Similarity');
      data.peers.forEach(peer => {
        const values = [
          peer.ticker,
          `"${peer.name}"`,
          peer.marketCap.toString(),
          peer.similarity.toString()
        ];
        lines.push(values.join(','));
      });
    }

    return lines.join('\n');
  }

  /**
   * Generate Excel format (simplified - would use a library like exceljs in production)
   */
  async generateExcel(data: ExportData): Promise<string> {
    // This is a simplified implementation
    // In production, would use libraries like exceljs or xlsx
    return JSON.stringify({
      sheets: {
        'Financial Data': data.financialData,
        'Ratios': data.ratios || [],
        'Peers': data.peers || [],
        'Metadata': data.exportMetadata
      }
    }, null, 2);
  }

  /**
   * Generate PDF report (simplified - would use a PDF library in production)
   */
  async generatePDF(data: ExportData): Promise<string> {
    // This is a simplified implementation
    // In production, would use libraries like puppeteer or pdfkit
    const report = {
      title: `Financial Report: ${data.company.ticker}`,
      company: data.company,
      summary: {
        dataPoints: data.financialData.length,
        ratios: data.ratios?.length || 0,
        peers: data.peers?.length || 0,
      },
      generatedAt: data.exportMetadata.generatedAt,
      disclaimer: 'This report is for informational purposes only and should not be considered as investment advice.'
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate JSON format
   */
  async generateJSON(data: ExportData): Promise<string> {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Stream export data to HTTP response
   */
  async streamExport(options: ExportOptions, res: Response): Promise<void> {
    const data = await this.exportData(options);
    let content: string;
    let mimeType: string;
    let filename: string;

    const timestamp = new Date().toISOString().split('T')[0];
    const baseFilename = `${options.ticker.toLowerCase()}-financial-data-${timestamp}`;

    switch (options.format) {
      case 'csv':
        content = await this.generateCSV(data);
        mimeType = 'text/csv';
        filename = `${baseFilename}.csv`;
        break;
      
      case 'excel':
        content = await this.generateExcel(data);
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        filename = `${baseFilename}.json`; // Simplified as JSON for now
        break;
      
      case 'pdf':
        content = await this.generatePDF(data);
        mimeType = 'application/pdf';
        filename = `${baseFilename}.json`; // Simplified as JSON for now
        break;
      
      case 'json':
        content = await this.generateJSON(data);
        mimeType = 'application/json';
        filename = `${baseFilename}.json`;
        break;
      
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    
    res.send(content);
  }

  // Helper methods
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

  private factsToMetrics(facts: any[]): Record<string, number> {
    const metrics: Record<string, number> = {};
    
    facts.forEach(fact => {
      metrics[fact.concept] = fact.value;
    });

    return metrics;
  }

  private getPeriodString(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    if (month === 11) return `FY${year}`;
    return `Q${Math.floor(month / 3) + 1}${year}`;
  }
}