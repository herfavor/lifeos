/**
 * xAI Grok Provider
 * Access to Grok models from Elon Musk's xAI
 * BYOK (Bring Your Own Key) - User provides paid API key
 * OpenAI-compatible API
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

const log = logger.module('AI:xAI');

/**
 * xAI provider metadata
 */
const METADATA: AIProviderMetadata = {
  id: 'xai',
  name: 'xAI Grok',
  displayName: 'xAI Grok',
  description: '来自 xAI（Elon Musk）的 Grok 模型。提供实时信息和独特的个性。',

  requiresApiKey: true,
  apiKeyUrl: 'https://console.x.ai',
  apiKeyLabel: 'xAI API 密钥',

  hasFreeModels: false, // No permanent free tier
  freeModelIds: [],

  supportsCORS: false,
  requiresProxy: true, // Likely requires proxy like OpenAI
  supportsStreaming: true,

  websiteUrl: 'https://x.ai',
  docsUrl: 'https://docs.x.ai',
};

/**
 * xAI Grok models (all paid)
 */
const PAID_MODELS: AIModel[] = [
  {
    id: 'grok-beta',
    name: 'Grok Beta',
    provider: 'xai',
    speedRating: 3,
    qualityRating: 4,
    contextWindow: 131072,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    isFree: false,
    costPer1MTokens: 5.0, // Estimated, check current pricing
    requiresApiKey: true,
    useCases: ['chat', 'analysis', 'real-time-info'],
    description: 'xAI 的 Grok 模型，具有独特的个性和实时信息访问能力。',
  },
  {
    id: 'grok-vision-beta',
    name: 'Grok Vision Beta',
    provider: 'xai',
    speedRating: 3,
    qualityRating: 4,
    contextWindow: 8192,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsVision: true,
    isFree: false,
    costPer1MTokens: 5.0, // Estimated, check current pricing
    requiresApiKey: true,
    useCases: ['chat', 'multimodal', 'analysis'],
    description: '具备视觉能力的 Grok，可用于图像理解。',
  },
];

/**
 * xAI Grok AI Provider Implementation
 * Uses OpenAI-compatible API
 */
export class XAIProvider implements AIProvider {
  metadata = METADATA;
  models = PAID_MODELS;

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
      baseURL: 'https://api.x.ai/v1',
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Note: xAI likely doesn't support CORS, this will likely fail
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
        baseURL: 'https://api.x.ai/v1',
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
   * Get default model
   */
  getDefaultModel(): AIModel {
    return PAID_MODELS[0]; // Grok Beta
  }

  /**
   * Get all free models
   */
  getFreeModels(): AIModel[] {
    return []; // No free models
  }

  /**
   * Send message to xAI Grok
   */
  async sendMessage(model: string, options: AIMessageOptions): Promise<AIResponse> {
    if (!this.client) {
      throw new ProviderError(
        ProviderErrorType.INVALID_API_KEY,
        'xAI 提供商尚未配置。请添加你的 xAI API 密钥。',
        'xai'
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
          provider: 'xai',
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
          provider: 'xai',
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

      // Map xAI errors to ProviderError (similar to OpenAI)
      if (err?.status === 401 || err?.message?.includes('Incorrect API key')) {
        throw new ProviderError(
          ProviderErrorType.INVALID_API_KEY,
          'xAI API 密钥无效。请检查你的 API 密钥后重试。',
          'xai'
        );
      } else if (err?.status === 429 || err?.message?.includes('rate limit')) {
        throw new ProviderError(
          ProviderErrorType.RATE_LIMIT,
          '已超出 xAI 速率限制。请稍等片刻后重试。',
          'xai',
          true // retryable
        );
      } else if (err?.status === 402 || err?.message?.includes('quota') || err?.message?.includes('billing')) {
        throw new ProviderError(
          ProviderErrorType.QUOTA_EXCEEDED,
          'xAI 配额已用尽或存在计费问题。请检查你的账户。',
          'xai'
        );
      } else if (err?.status === 404 || err?.message?.includes('model')) {
        throw new ProviderError(
          ProviderErrorType.MODEL_NOT_FOUND,
          `xAI 上未找到模型“${model}”。`,
          'xai'
        );
      } else if (err?.message?.includes('CORS') || err?.message?.includes('fetch')) {
        throw new ProviderError(
          ProviderErrorType.NETWORK_ERROR,
          'xAI 在浏览器中使用需要后端代理。遇到 CORS 错误。',
          'xai'
        );
      } else {
        throw new ProviderError(
          ProviderErrorType.UNKNOWN,
          `xAI 错误：${err?.message || '发生未知错误'}`,
          'xai'
        );
      }
    }
  }
}

// Singleton instance
export const xaiProvider = new XAIProvider();
