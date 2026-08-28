/**
 * OpenRouter Provider
 * Provides access to 200+ AI models through a unified API
 * Free tier: 50 requests/day, or 1M requests/month with BYOK
 */

import OpenAI from 'openai';
import type {
  AIProvider,
  AIProviderMetadata,
  AIModel,
  AIMessageOptions,
  AIResponse,
} from './types';
import { ProviderError, ProviderErrorType } from './types';
import { logger } from '../logger';

const log = logger.module('AI:OpenRouter');

/**
 * OpenRouter provider metadata
 */
const METADATA: AIProviderMetadata = {
  id: 'openrouter',
  name: 'OpenRouter',
  displayName: 'OpenRouter',
  description: '通过一个 API 访问 200+ 个 AI 模型。灵活性和模型选择俱佳。',

  requiresApiKey: true,
  apiKeyUrl: 'https://openrouter.ai/keys',
  apiKeyLabel: 'OpenRouter API 密钥',

  hasFreeModels: true,
  freeModelIds: [
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemini-2.0-flash-exp:free',
    'mistralai/mistral-7b-instruct:free',
  ],

  freeTierLimits: {
    requestsPerDay: 50,
    requestsPerMinute: 20,
    description: '免费层级：每天 50 次请求、20 RPM。充值 10 美元可升级到每天 1,000 次请求。',
  },

  supportsCORS: true,
  requiresProxy: false,
  supportsStreaming: true,

  websiteUrl: 'https://openrouter.ai',
  docsUrl: 'https://openrouter.ai/docs',
};

/**
 * Popular free models on OpenRouter
 */
const FREE_MODELS: AIModel[] = [
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B Instruct (Free)',
    provider: 'openrouter',
    speedRating: 4,
    qualityRating: 5,
    contextWindow: 128000,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    isFree: true,
    requiresApiKey: true,
    useCases: ['chat', 'code', 'reasoning', 'analysis'],
    description: 'Meta 最新的 Llama 模型。非常适合通用任务、编码和推理。',
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash (Free)',
    provider: 'openrouter',
    speedRating: 5,
    qualityRating: 4,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsVision: true,
    isFree: true,
    requiresApiKey: true,
    useCases: ['chat', 'code', 'creative', 'multimodal'],
    description: 'Google 最快的模型，支持 100 万 token 上下文。非常适合长文档。',
  },
  {
    id: 'mistralai/mistral-7b-instruct:free',
    name: 'Mistral 7B Instruct (Free)',
    provider: 'openrouter',
    speedRating: 5,
    qualityRating: 3,
    contextWindow: 32768,
    maxOutputTokens: 2048,
    supportsStreaming: true,
    isFree: true,
    requiresApiKey: true,
    useCases: ['chat', 'code', 'quick-tasks'],
    description: '小巧快速的模型，适合快速任务和简单问题。',
  },
];

/**
 * Popular paid models on OpenRouter (via BYOK or OpenRouter credits)
 */
const PAID_MODELS: AIModel[] = [
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'openrouter',
    speedRating: 3,
    qualityRating: 5,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    isFree: false,
    costPer1MTokens: 3.0,
    requiresApiKey: true,
    useCases: ['analysis', 'reasoning', 'writing', 'code'],
    description: 'Anthropic 的最佳模型。非常适合分析和长文写作。',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'openrouter',
    speedRating: 4,
    qualityRating: 5,
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    isFree: false,
    costPer1MTokens: 2.5,
    requiresApiKey: true,
    useCases: ['chat', 'code', 'reasoning', 'multimodal'],
    description: 'OpenAI 的旗舰多模态模型。综合性能最佳。',
  },
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'openrouter',
    speedRating: 3,
    qualityRating: 5,
    contextWindow: 128000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    isFree: false,
    costPer1MTokens: 0.55,
    requiresApiKey: true,
    useCases: ['reasoning', 'math', 'code', 'analysis'],
    description: 'DeepSeek 的推理模型。以 GPT-4 的 2% 成本媲美其表现。',
  },
];

/**
 * OpenRouter AI Provider Implementation
 */
export class OpenRouterProvider implements AIProvider {
  metadata = METADATA;
  models = [...FREE_MODELS, ...PAID_MODELS];

  private client: OpenAI | null = null;
  private apiKey: string | null = null;

  /**
   * Check if provider is configured with API key
   */
  isConfigured(): boolean {
    return !!this.apiKey && !!this.client;
  }

  /**
   * Set API key and initialize client
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // OpenRouter supports CORS
      defaultHeaders: {
        'HTTP-Referer': window.location.origin, // Required by OpenRouter
        'X-Title': 'LifeOS', // Optional: show in OpenRouter dashboard
      },
    });
  }

  /**
   * Get current API key
   */
  getApiKey(): string | null {
    return this.apiKey;
  }

  /**
   * Clear API key and client
   */
  clearApiKey(): void {
    this.apiKey = null;
    this.client = null;
  }

  /**
   * Validate API key by making a test request
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const testClient = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
        defaultHeaders: {
          'HTTP-Referer': window.location.origin,
          'X-Title': 'LifeOS',
        },
      });

      // Try to list models (minimal API call)
      await testClient.models.list();
      return true;
    } catch (error: unknown) {
      log.error('API key validation failed', { error });
      return false;
    }
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): AIModel | null {
    return this.models.find((m) => m.id === modelId) || null;
  }

  /**
   * Get default model (best free model)
   */
  getDefaultModel(): AIModel {
    return FREE_MODELS[0]; // Llama 3.3 70B
  }

  /**
   * Get all free models
   */
  getFreeModels(): AIModel[] {
    return FREE_MODELS;
  }

  /**
   * Send message to OpenRouter
   */
  async sendMessage(model: string, options: AIMessageOptions): Promise<AIResponse> {
    if (!this.client) {
      throw new ProviderError(
        ProviderErrorType.INVALID_API_KEY,
        'OpenRouter 提供商尚未配置。请添加你的 API 密钥。',
        'openrouter'
      );
    }

    try {
      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

      // Add system prompt if provided
      if (options.systemPrompt) {
        messages.push({
          role: 'system',
          content: options.systemPrompt,
        });
      }

      // Add conversation history
      if (options.conversationHistory) {
        options.conversationHistory.forEach((msg) => {
          messages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content,
          });
        });
      }

      // Add current user prompt
      messages.push({
        role: 'user',
        content: options.prompt,
      });

      // Send request
      if (options.stream && options.onChunk) {
        // Streaming mode
        const stream = await this.client.chat.completions.create({
          model: model,
          messages: messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2048,
          stream: true,
        });

        let fullContent = '';
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          fullContent += content;
          if (content && options.onChunk) {
            options.onChunk(content);
          }
        }

        return {
          content: fullContent,
          model: model,
          provider: 'openrouter',
          finishReason: 'stop',
        };
      } else {
        // Non-streaming mode
        const completion = await this.client.chat.completions.create({
          model: model,
          messages: messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2048,
          stream: false,
        });

        const content = completion.choices[0]?.message?.content || '';

        return {
          content: content,
          model: model,
          provider: 'openrouter',
          finishReason: completion.choices[0]?.finish_reason as 'stop' | 'length' | undefined,
          usage: completion.usage ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          } : undefined,
        };
      }
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };

      // Map OpenAI errors to ProviderError
      if (err?.status === 401 || err?.message?.includes('Incorrect API key')) {
        throw new ProviderError(
          ProviderErrorType.INVALID_API_KEY,
          'OpenRouter API 密钥无效。请检查你的 API 密钥后重试。',
          'openrouter'
        );
      } else if (err?.status === 429 || err?.message?.includes('rate limit')) {
        throw new ProviderError(
          ProviderErrorType.RATE_LIMIT,
          '已超出 OpenRouter 速率限制。请稍等片刻后重试。',
          'openrouter',
          true // retryable
        );
      } else if (err?.status === 402 || err?.message?.includes('quota')) {
        throw new ProviderError(
          ProviderErrorType.QUOTA_EXCEEDED,
          'OpenRouter 配额已用尽。请升级你的套餐或等待重置。',
          'openrouter'
        );
      } else if (err?.status === 404 || err?.message?.includes('model')) {
        throw new ProviderError(
          ProviderErrorType.MODEL_NOT_FOUND,
          `OpenRouter 上未找到模型“${model}”。`,
          'openrouter'
        );
      } else {
        throw new ProviderError(
          ProviderErrorType.UNKNOWN,
          `OpenRouter 错误：${err?.message || '发生未知错误'}`,
          'openrouter'
        );
      }
    }
  }
}

// Singleton instance
export const openRouterProvider = new OpenRouterProvider();
