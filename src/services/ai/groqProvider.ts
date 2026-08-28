/**
 * Groq Provider
 * Industry-leading inference speed with Language Processing Units (LPUs)
 * Free tier available with generous limits
 */

import Groq from 'groq-sdk';
import type {
  AIProvider,
  AIProviderMetadata,
  AIModel,
  AIMessageOptions,
  AIResponse,
} from './types';
import { ProviderError, ProviderErrorType } from './types';
import { logger } from '../logger';

const log = logger.module('AI:Groq');

/**
 * Groq provider metadata
 */
const METADATA: AIProviderMetadata = {
  id: 'groq',
  name: 'Groq',
  displayName: 'Groq',
  description: '业界最快的 AI 推理。由自研 LPU 硬件驱动。',

  requiresApiKey: true,
  apiKeyUrl: 'https://console.groq.com/keys',
  apiKeyLabel: 'Groq API 密钥',

  hasFreeModels: true,
  freeModelIds: [
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'mixtral-8x7b-32768',
  ],

  freeTierLimits: {
    requestsPerMinute: 30,
    tokensPerMinute: 6000,
    description: '免费层级：30 RPM、6,000 TPM。开发者层级限额更高。',
  },

  supportsCORS: false,
  requiresProxy: false, // Uses dangerouslyAllowBrowser for direct browser access
  supportsStreaming: true,

  websiteUrl: 'https://groq.com',
  docsUrl: 'https://console.groq.com/docs',
};

/**
 * Free models available on Groq
 */
const FREE_MODELS: AIModel[] = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    provider: 'groq',
    speedRating: 5, // Lightning fast on Groq LPUs
    qualityRating: 5,
    contextWindow: 128000,
    maxOutputTokens: 32768,
    supportsStreaming: true,
    isFree: true,
    requiresApiKey: true,
    useCases: ['chat', 'code', 'reasoning', 'analysis'],
    description: '运行在 Groq LPU 上的 Meta Llama 3.3 70B。速度极快且质量出色。',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    provider: 'groq',
    speedRating: 5,
    qualityRating: 4,
    contextWindow: 128000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    isFree: true,
    requiresApiKey: true,
    useCases: ['chat', 'quick-tasks', 'code'],
    description: '小巧且极快的模型，可实现即时响应。',
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B',
    provider: 'groq',
    speedRating: 5,
    qualityRating: 4,
    contextWindow: 32768,
    maxOutputTokens: 32768,
    supportsStreaming: true,
    isFree: true,
    requiresApiKey: true,
    useCases: ['chat', 'code', 'multilingual'],
    description: 'Mistral 的专家混合模型。快速且能力强。',
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma 2 9B IT',
    provider: 'groq',
    speedRating: 5,
    qualityRating: 3,
    contextWindow: 8192,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    isFree: true,
    requiresApiKey: true,
    useCases: ['chat', 'quick-tasks'],
    description: 'Google 的 Gemma 模型。适合简单任务。',
  },
];

/**
 * Groq AI Provider Implementation
 */
export class GroqProvider implements AIProvider {
  metadata = METADATA;
  models = FREE_MODELS;

  private client: Groq | null = null;
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
    this.client = new Groq({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Try direct browser access
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
      const testClient = new Groq({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
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
   * Get default model (fastest and best)
   */
  getDefaultModel(): AIModel {
    return FREE_MODELS[0]; // Llama 3.3 70B Versatile
  }

  /**
   * Get all free models
   */
  getFreeModels(): AIModel[] {
    return FREE_MODELS;
  }

  /**
   * Send message to Groq
   */
  async sendMessage(model: string, options: AIMessageOptions): Promise<AIResponse> {
    if (!this.client) {
      throw new ProviderError(
        ProviderErrorType.INVALID_API_KEY,
        'Groq 提供商尚未配置。请添加你的 API 密钥。',
        'groq'
      );
    }

    try {
      const messages: Groq.Chat.ChatCompletionMessageParam[] = [];

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
          provider: 'groq',
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
          provider: 'groq',
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

      // Map Groq errors to ProviderError
      if (err?.status === 401 || err?.message?.includes('Invalid API Key')) {
        throw new ProviderError(
          ProviderErrorType.INVALID_API_KEY,
          'Groq API 密钥无效。请检查你的 API 密钥后重试。',
          'groq'
        );
      } else if (err?.status === 429 || err?.message?.includes('rate_limit')) {
        throw new ProviderError(
          ProviderErrorType.RATE_LIMIT,
          '已超出 Groq 速率限制。请稍等片刻后重试。',
          'groq',
          true // retryable
        );
      } else if (err?.status === 402 || err?.message?.includes('quota')) {
        throw new ProviderError(
          ProviderErrorType.QUOTA_EXCEEDED,
          'Groq 配额已用尽。请升级你的套餐或等待重置。',
          'groq'
        );
      } else if (err?.status === 404 || err?.message?.includes('model')) {
        throw new ProviderError(
          ProviderErrorType.MODEL_NOT_FOUND,
          `Groq 上未找到模型“${model}”。`,
          'groq'
        );
      } else if (err?.message?.includes('CORS') || err?.message?.includes('fetch')) {
        throw new ProviderError(
          ProviderErrorType.NETWORK_ERROR,
          'Groq 在浏览器中使用需要后端代理。遇到 CORS 错误。',
          'groq'
        );
      } else {
        throw new ProviderError(
          ProviderErrorType.UNKNOWN,
          `Groq 错误：${err?.message || '发生未知错误'}`,
          'groq'
        );
      }
    }
  }
}

// Singleton instance
export const groqProvider = new GroqProvider();
