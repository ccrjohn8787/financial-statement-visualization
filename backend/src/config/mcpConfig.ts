// MCP Configuration for FinScope
// Sprint 5 MCP Integration

import { MCPGatewayConfig } from '../services/mcp/types';

export const mcpConfig: MCPGatewayConfig = {
  enabled: process.env.MCP_ENABLED === 'true',
  timeout: parseInt(process.env.MCP_TIMEOUT || '5000'),
  maxRetries: parseInt(process.env.MCP_MAX_RETRIES || '3'),
  healthCheckInterval: parseInt(process.env.MCP_HEALTH_CHECK_INTERVAL || '60000'), // 1 minute

  clients: {
    financeTools: {
      enabled: process.env.FINANCE_TOOLS_ENABLED === 'true',
      timeout: parseInt(process.env.FINANCE_TOOLS_TIMEOUT || '10000'),
      retries: parseInt(process.env.FINANCE_TOOLS_RETRIES || '2'),
      rateLimitConfig: {
        requestsPerWindow: parseInt(process.env.FINANCE_TOOLS_RATE_LIMIT || '60'),
        windowMs: parseInt(process.env.FINANCE_TOOLS_RATE_WINDOW || '60000'),
        enabled: process.env.FINANCE_TOOLS_RATE_LIMIT_ENABLED !== 'false'
      }
    },

    polygon: {
      enabled: process.env.POLYGON_MCP_ENABLED === 'true',
      timeout: parseInt(process.env.POLYGON_TIMEOUT || '8000'),
      retries: parseInt(process.env.POLYGON_RETRIES || '1'), // Conservative for free tier
      rateLimitConfig: {
        requestsPerWindow: parseInt(process.env.POLYGON_RATE_LIMIT || '5'), // Free tier: 5 calls/min
        windowMs: parseInt(process.env.POLYGON_RATE_WINDOW || '60000'),
        enabled: true // Always enforce for free tier
      }
    },

    yfinance: {
      enabled: process.env.YFINANCE_MCP_ENABLED === 'true',
      timeout: parseInt(process.env.YFINANCE_TIMEOUT || '10000'),
      retries: parseInt(process.env.YFINANCE_RETRIES || '3'),
      rateLimitConfig: {
        requestsPerWindow: parseInt(process.env.YFINANCE_RATE_LIMIT || '100'),
        windowMs: parseInt(process.env.YFINANCE_RATE_WINDOW || '60000'),
        enabled: process.env.YFINANCE_RATE_LIMIT_ENABLED === 'true'
      }
    }
  }
};

export const getApiKeys = () => ({
  tiingo: process.env.TIINGO_API_KEY,
  fred: process.env.FRED_API_KEY,
  polygon: process.env.POLYGON_API_KEY,
  // Note: yfinance requires no API key
});

export const validateMcpConfig = (): string[] => {
  const errors: string[] = [];

  if (!mcpConfig.enabled) {
    return ['MCP integration is disabled'];
  }

  // Validate Finance Tools MCP
  if (mcpConfig.clients.financeTools.enabled) {
    const apiKeys = getApiKeys();
    if (!apiKeys.tiingo) {
      errors.push('TIINGO_API_KEY is required for Finance Tools MCP');
    }
    // FRED API key is optional
  }

  // Validate Polygon.io MCP
  if (mcpConfig.clients.polygon.enabled) {
    const apiKeys = getApiKeys();
    if (!apiKeys.polygon) {
      errors.push('POLYGON_API_KEY is required for Polygon.io MCP');
    }
  }

  // yfinance requires no validation (no API key needed)

  return errors;
};

export const logMcpConfig = () => {
  console.log('🔧 MCP Configuration:');
  console.log(`  Enabled: ${mcpConfig.enabled}`);
  console.log(`  Timeout: ${mcpConfig.timeout}ms`);
  console.log(`  Max Retries: ${mcpConfig.maxRetries}`);

  Object.entries(mcpConfig.clients).forEach(([name, config]) => {
    console.log(`  ${name}:`);
    console.log(`    Enabled: ${config.enabled}`);
    if (config.enabled && config.rateLimitConfig) {
      console.log(`    Rate Limit: ${config.rateLimitConfig.requestsPerWindow}/${config.rateLimitConfig.windowMs}ms`);
    }
  });

  const validationErrors = validateMcpConfig();
  if (validationErrors.length > 0) {
    console.warn('⚠️  MCP Configuration Issues:');
    validationErrors.forEach(error => console.warn(`    ${error}`));
  } else {
    console.log('✅ MCP Configuration Valid');
  }
};