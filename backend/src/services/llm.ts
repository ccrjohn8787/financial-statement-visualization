/**
 * LLM Service - AI Integration for FinScope
 * Supports OpenAI GPT-4 and Anthropic Claude with fallback capabilities
 */

export interface LLMProvider {
  name: 'openai' | 'claude' | 'ollama' | 'huggingface' | 'groq' | 'mistral';
  model: string;
  apiKey: string;
  baseUrl?: string;
}

export interface LLMRequest {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  context?: Record<string, any>;
  useCache?: boolean;
  cacheTTL?: number; // seconds
}

export interface LLMResponse {
  content: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  cached: boolean;
  requestId: string;
  confidence: 'high' | 'medium' | 'low';
  generatedAt: string;
}

export interface LLMError {
  code: string;
  message: string;
  provider: string;
  retryable: boolean;
  details?: any;
}

export class LLMService {
  private providers: LLMProvider[] = [];
  private cache = new Map<string, { response: LLMResponse; expiresAt: number }>();
  private requestCount = 0;
  private costTracking = {
    totalRequests: 0,
    totalTokens: 0,
    estimatedCost: 0
  };

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Groq (Primary - ultra-fast inference, 1000 free requests/day)
    if (process.env.GROQ_API_KEY) {
      this.providers.push({
        name: 'groq',
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        apiKey: process.env.GROQ_API_KEY,
        baseUrl: 'https://api.groq.com/openai/v1'
      });
    }

    // Mistral AI (Cost-effective production scaling)
    if (process.env.MISTRAL_API_KEY) {
      this.providers.push({
        name: 'mistral',
        model: process.env.MISTRAL_MODEL || 'mistral-small-latest',
        apiKey: process.env.MISTRAL_API_KEY,
        baseUrl: 'https://api.mistral.ai/v1'
      });
    }

    // OpenAI GPT-4 (Premium reasoning)
    if (process.env.OPENAI_API_KEY) {
      this.providers.push({
        name: 'openai',
        model: 'gpt-4o',
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: 'https://api.openai.com/v1'
      });
    }

    // Anthropic Claude (Premium detailed analysis)
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.push({
        name: 'claude',
        model: 'claude-3-5-sonnet-20241022',
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: 'https://api.anthropic.com/v1'
      });
    }

    // Ollama (Free local deployment, unlimited)
    if (process.env.OLLAMA_BASE_URL) {
      this.providers.push({
        name: 'ollama',
        model: process.env.OLLAMA_MODEL || 'llama3.2:13b',
        apiKey: 'not-required',
        baseUrl: process.env.OLLAMA_BASE_URL
      });
    }

    // Hugging Face (Specialized models)
    if (process.env.HUGGINGFACE_API_KEY) {
      this.providers.push({
        name: 'huggingface',
        model: process.env.HUGGINGFACE_MODEL || 'microsoft/DialoGPT-medium',
        apiKey: process.env.HUGGINGFACE_API_KEY,
        baseUrl: 'https://api-inference.huggingface.co'
      });
    }

    console.log(`🤖 LLM Service initialized with ${this.providers.length} providers:`, 
      this.providers.map(p => `${p.name}:${p.model}`).join(', '));
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    const requestId = this.generateRequestId();
    
    // Check cache first
    if (request.useCache !== false) {
      const cached = this.getCachedResponse(request);
      if (cached) {
        return { ...cached, requestId, cached: true };
      }
    }

    // Track the request
    this.costTracking.totalRequests++;

    let lastError: LLMError | null = null;

    // Try each provider in order
    for (const provider of this.providers) {
      try {
        console.log(`🔍 [${requestId}] Attempting ${provider.name} for LLM request`);
        
        const response = await this.callProvider(provider, request, requestId);
        
        // Cache successful response
        if (request.useCache !== false) {
          this.cacheResponse(request, response);
        }

        // Track usage
        this.costTracking.totalTokens += response.tokensUsed || 0;
        this.costTracking.estimatedCost += this.estimateCost(provider, response.tokensUsed || 0);

        console.log(`✅ [${requestId}] LLM request successful via ${provider.name}`);
        return response;

      } catch (error) {
        lastError = this.normalizeError(error, provider);
        console.warn(`⚠️ [${requestId}] ${provider.name} failed:`, lastError.message);
        
        // If not retryable, try next provider immediately
        if (!lastError.retryable) {
          continue;
        }

        // For retryable errors, add a small delay before trying next provider
        await this.delay(1000);
      }
    }

    // All providers failed
    console.error(`❌ [${requestId}] All LLM providers failed. Last error:`, lastError);
    throw new Error(`LLM request failed: ${lastError?.message || 'Unknown error'}`);
  }

  private async callProvider(provider: LLMProvider, request: LLMRequest, requestId: string): Promise<LLMResponse> {
    if (provider.name === 'groq') {
      return this.callGroq(provider, request, requestId);
    } else if (provider.name === 'mistral') {
      return this.callMistral(provider, request, requestId);
    } else if (provider.name === 'openai') {
      return this.callOpenAI(provider, request, requestId);
    } else if (provider.name === 'claude') {
      return this.callClaude(provider, request, requestId);
    } else if (provider.name === 'ollama') {
      return this.callOllama(provider, request, requestId);
    } else if (provider.name === 'huggingface') {
      return this.callHuggingFace(provider, request, requestId);
    } else {
      throw new Error(`Unsupported provider: ${provider.name}`);
    }
  }

  private async callOpenAI(provider: LLMProvider, request: LLMRequest, requestId: string): Promise<LLMResponse> {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          {
            role: 'system',
            content: 'You are a financial analysis expert helping retail investors understand complex financial metrics in simple terms.'
          },
          {
            role: 'user',
            content: request.prompt
          }
        ],
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.3
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('OpenAI returned empty response');
    }

    return {
      content: content.trim(),
      provider: 'OpenAI',
      model: provider.model,
      tokensUsed: data.usage?.total_tokens,
      cached: false,
      requestId,
      confidence: this.assessConfidence(content),
      generatedAt: new Date().toISOString()
    };
  }

  private async callClaude(provider: LLMProvider, request: LLMRequest, requestId: string): Promise<LLMResponse> {
    const response = await fetch(`${provider.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': provider.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: provider.model,
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.3,
        system: 'You are a financial analysis expert helping retail investors understand complex financial metrics in simple terms.',
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`Claude API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text;

    if (!content) {
      throw new Error('Claude returned empty response');
    }

    return {
      content: content.trim(),
      provider: 'Claude',
      model: provider.model,
      tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens,
      cached: false,
      requestId,
      confidence: this.assessConfidence(content),
      generatedAt: new Date().toISOString()
    };
  }

  private async callOllama(provider: LLMProvider, request: LLMRequest, requestId: string): Promise<LLMResponse> {
    const response = await fetch(`${provider.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.model,
        prompt: `System: You are a financial analysis expert helping retail investors understand complex financial metrics in simple terms.\n\nUser: ${request.prompt}`,
        stream: false,
        options: {
          temperature: request.temperature || 0.3,
          num_predict: request.maxTokens || 1000
        }
      })
    });

    if (!response.ok) {
      const error = await response.text().catch(() => 'Network error');
      throw new Error(`Ollama API error: ${error}`);
    }

    const data = await response.json();
    const content = data.response;

    if (!content) {
      throw new Error('Ollama returned empty response');
    }

    return {
      content: content.trim(),
      provider: 'Ollama',
      model: provider.model,
      tokensUsed: data.eval_count || 0,
      cached: false,
      requestId,
      confidence: this.assessConfidence(content),
      generatedAt: new Date().toISOString()
    };
  }

  private async callHuggingFace(provider: LLMProvider, request: LLMRequest, requestId: string): Promise<LLMResponse> {
    const response = await fetch(`${provider.baseUrl}/models/${provider.model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: `System: You are a financial analysis expert helping retail investors understand complex financial metrics in simple terms.\n\nUser: ${request.prompt}`,
        parameters: {
          max_new_tokens: request.maxTokens || 1000,
          temperature: request.temperature || 0.3,
          return_full_text: false
        }
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(`Hugging Face API error: ${error.error || response.statusText}`);
    }

    const data = await response.json();
    let content: string;

    if (Array.isArray(data)) {
      content = data[0]?.generated_text || data[0]?.summary_text || '';
    } else {
      content = data.generated_text || data.summary_text || '';
    }

    if (!content) {
      throw new Error('Hugging Face returned empty response');
    }

    return {
      content: content.trim(),
      provider: 'Hugging Face',
      model: provider.model,
      tokensUsed: content.split(' ').length, // Rough estimate
      cached: false,
      requestId,
      confidence: this.assessConfidence(content),
      generatedAt: new Date().toISOString()
    };
  }

  private async callGroq(provider: LLMProvider, request: LLMRequest, requestId: string): Promise<LLMResponse> {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          {
            role: 'system',
            content: 'You are a financial analysis expert helping retail investors understand complex financial metrics in simple terms. Provide precise, actionable insights with clear reasoning.'
          },
          {
            role: 'user',
            content: request.prompt
          }
        ],
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.1
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`Groq API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Groq returned empty response');
    }

    return {
      content: content.trim(),
      provider: 'Groq',
      model: provider.model,
      tokensUsed: data.usage?.total_tokens || 0,
      cached: false,
      requestId,
      confidence: this.assessConfidence(content),
      generatedAt: new Date().toISOString()
    };
  }

  private async callMistral(provider: LLMProvider, request: LLMRequest, requestId: string): Promise<LLMResponse> {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          {
            role: 'system',
            content: 'You are a senior financial analyst with expertise in quantitative analysis and investment research. Provide detailed, evidence-based financial insights.'
          },
          {
            role: 'user',
            content: request.prompt
          }
        ],
        max_tokens: request.maxTokens || 1000,
        temperature: request.temperature || 0.1
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      throw new Error(`Mistral API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('Mistral returned empty response');
    }

    return {
      content: content.trim(),
      provider: 'Mistral',
      model: provider.model,
      tokensUsed: data.usage?.total_tokens || 0,
      cached: false,
      requestId,
      confidence: this.assessConfidence(content),
      generatedAt: new Date().toISOString()
    };
  }

  private getCachedResponse(request: LLMRequest): LLMResponse | null {
    const cacheKey = this.generateCacheKey(request);
    const cached = this.cache.get(cacheKey);
    
    if (cached && cached.expiresAt > Date.now()) {
      console.log(`📋 Cache hit for request: ${cacheKey.substring(0, 20)}...`);
      return cached.response;
    }

    if (cached) {
      this.cache.delete(cacheKey);
    }

    return null;
  }

  private cacheResponse(request: LLMRequest, response: LLMResponse): void {
    const cacheKey = this.generateCacheKey(request);
    const ttl = (request.cacheTTL || 24 * 60 * 60) * 1000; // Default 24 hours
    
    this.cache.set(cacheKey, {
      response,
      expiresAt: Date.now() + ttl
    });

    console.log(`💾 Cached LLM response for ${ttl / 1000 / 60} minutes`);
  }

  private generateCacheKey(request: LLMRequest): string {
    const key = JSON.stringify({
      prompt: request.prompt,
      maxTokens: request.maxTokens,
      temperature: request.temperature,
      context: request.context
    });
    
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `llm_${Math.abs(hash)}_${key.length}`;
  }

  private generateRequestId(): string {
    return `llm_${Date.now()}_${++this.requestCount}`;
  }

  private assessConfidence(content: string): 'high' | 'medium' | 'low' {
    // Simple heuristic based on response characteristics
    if (content.length < 50) return 'low';
    if (content.includes('uncertain') || content.includes('might') || content.includes('possibly')) return 'medium';
    if (content.length > 200 && content.includes('because') && content.includes('%')) return 'high';
    return 'medium';
  }

  private estimateCost(provider: LLMProvider, tokens: number): number {
    // Cost estimates per 1K tokens (based on 2025 pricing)
    const costs = {
      // Premium providers
      'gpt-4o': 0.0025,
      'claude-3-5-sonnet-20241022': 0.003,
      
      // Cost-effective providers
      'mistral-small-latest': 0.00027, // $0.27 per 1M input tokens
      'mistral-medium-latest': 0.0004, // $0.40 per 1M input tokens
      'mistral-large-latest': 0.002,   // $2.00 per 1M input tokens
      
      // Free providers (within limits)
      'llama3-70b-8192': 0,           // Groq free tier (1000 req/day)
      'llama3.2:13b': 0,              // Ollama local
      'llama3.2': 0,                  // Ollama local
      'microsoft/DialoGPT-medium': 0  // Hugging Face free tier
    };
    
    const costPer1K = costs[provider.model as keyof typeof costs] || 0.003;
    return (tokens / 1000) * costPer1K;
  }

  private normalizeError(error: any, provider: LLMProvider): LLMError {
    const errorMessage = error.message || 'Unknown error';
    
    // Determine if error is retryable
    const retryable = 
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('429') ||
      errorMessage.includes('503');

    return {
      code: error.code || 'UNKNOWN_ERROR',
      message: errorMessage,
      provider: provider.name,
      retryable,
      details: error
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    if (this.providers.length === 0) {
      console.warn('⚠️ No LLM providers configured');
      return false;
    }

    try {
      const testResponse = await this.generateResponse({
        prompt: 'Respond with exactly: "Health check OK"',
        maxTokens: 10,
        useCache: false
      });
      
      return testResponse.content.includes('Health check OK');
    } catch (error) {
      console.error('❌ LLM health check failed:', error);
      return false;
    }
  }

  // Get service statistics
  getStats() {
    return {
      providers: this.providers.length,
      totalRequests: this.costTracking.totalRequests,
      totalTokens: this.costTracking.totalTokens,
      estimatedCost: this.costTracking.estimatedCost,
      cacheSize: this.cache.size,
      uptime: process.uptime()
    };
  }

  // Clear cache (useful for testing)
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ LLM cache cleared');
  }
}