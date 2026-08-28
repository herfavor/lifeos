/**
 * Anthropic Claude Provider
 * Access to Claude 3.5 Sonnet and other Anthropic models
 * BYOK (Bring Your Own Key) - User provides paid API key
 * CORS-friendly! (with special header)
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  AIProvider,
  AIProviderMetadata,
  AIModel,
  AIMessageOptions,
  AIResponse,
} from './types';
import { ProviderError, ProviderErrorType } from './types';
import { logger } from '../logger';

const log = logger.module('AI:Anthropic');

/**
 * Anthropic provider metadata
 */
const METADATA: AIProviderMetadata = {
  id: 'anthropic',
  name: 'Anthropic Claude',
  displayName: 'Anthropic Claude',
  description: '来自 Anthropic 的深思熟虑、细腻的 AI。非常适合分析和写作。支持 CORS！',

  requiresApiKey: true,
  apiKeyUrl: 'https://console.anthropic.com/settings/keys',
  apiKeyLabel: 'Anthropic API 密钥',

  hasFreeModels: false, // No permanent free tier
  freeModelIds: [],

  supportsCORS: true, // Claude API now supports CORS (Aug 2024)!
  requiresProxy: false, // Can call directly from browser (with special header)
  supportsStreaming: true,

  websiteUrl: 'https://www.anthropic.com',
  docsUrl: 'https://docs.anthropic.com',
};

/**
 * Anthropic Claude models (all paid)
 */
const PAID_MODELS: AIModel[] = [
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    speedRating: 3,
    qualityRating: 5,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    isFree: false,
    costPer1MTokens: 3.0,
    requiresApiKey: true,
    useCases: ['analysis', 'reasoning', 'writing', 'code'],
    description: 'Anthropic 的最佳模型。非常适合深入分析和长文写作。',
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    speedRating: 5,
    qualityRating: 4,
    contextWindow: 200000,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsVision: true,
    isFree: false,
    costPer1MTokens: 1.0,
    requiresApiKey: true,
    useCases: ['chat', 'code', 'quick-tasks'],
    description: '快速且实惠的 Claude 模型。适合大多数任务。',
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    speedRating: 2,
    qualityRating: 5,
    contextWindow: 200000,
    maxOutputTokens: 4096,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    isFree: false,
    costPer1MTokens: 15.0,
    requiresApiKey: true,
    useCases: ['reasoning', 'analysis', 'research', 'complex-tasks'],
    description: 'Claude 最强大的模型。最适合复杂推理和分析。',
  },
];

/**
 * Anthropic Claude AI Provider Implementation
 */
export class AnthropicProvider implements AIProvider {
  metadata = METADATA;
  models = PAID_MODELS;

  private client: Anthropic | null = null;
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
    this.client = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Required for browser use
      defaultHeaders: {
        // Required header for CORS support (added Aug 2024)
        'anthropic-dangerous-direct-browser-access': 'true',
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
      const testClient = new Anthropic({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true,
        defaultHeaders: {
          'anthropic-dangerous-direct-browser-access': 'true',
        },
      });

      // Try a minimal request to validate key
      await testClient.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });

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
    return PAID_MODELS[1]; // Claude 3.5 Haiku (most affordable)
  }

  /**
   * Get all free models
   */
  getFreeModels(): AIModel[] {
    return []; // No free models
  }

  /**
   * Send message to Anthropic Claude
   */
  async sendMessage(model: string, options: AIMessageOptions): Promise<AIResponse> {
    if (!this.client) {
      throw new ProviderError(
        ProviderErrorType.INVALID_API_KEY,
        'Anthropic 提供商尚未配置。请添加你的 Anthropic API 密钥。',
        'anthropic'
      );
    }

    try {
      const messages: Anthropic.MessageParam[] = [];

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
        const stream = await this.client.messages.stream({
          model: model,
          max_tokens: options.maxTokens || 2048,
          temperature: options.temperature || 0.7,
          system: options.systemPrompt,
          messages: messages,
        });

        let fullContent = '';

        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            const content = chunk.delta.text;
            fullContent += content;
            if (options.onChunk) {
              options.onChunk(content);
            }
          }
        }

        const finalMessage = await stream.finalMessage();

        return {
          content: fullContent,
          model: model,
          provider: 'anthropic',
          finishReason: finalMessage.stop_reason === 'end_turn' ? 'stop' : 'length',
          usage: finalMessage.usage ? {
            promptTokens: finalMessage.usage.input_tokens,
            completionTokens: finalMessage.usage.output_tokens,
            totalTokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
          } : undefined,
        };
      } else {
        // Non-streaming mode
        const response = await this.client.messages.create({
          model: model,
          max_tokens: options.maxTokens || 2048,
          temperature: options.temperature || 0.7,
          system: options.systemPrompt,
          messages: messages,
        });

        const content = response.content
          .filter((block) => block.type === 'text')
          .map((block) => block.type === 'text' ? block.text : '')
          .join('');

        return {
          content: content,
          model: model,
          provider: 'anthropic',
          finishReason: response.stop_reason === 'end_turn' ? 'stop' : 'length',
          usage: response.usage ? {
            promptTokens: response.usage.input_tokens,
            completionTokens: response.usage.output_tokens,
            totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          } : undefined,
        };
      }
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };

      // Map Anthropic errors to ProviderError
      if (err?.status === 401 || err?.message?.includes('invalid x-api-key')) {
        throw new ProviderError(
          ProviderErrorType.INVALID_API_KEY,
          'Anthropic API 密钥无效。请检查你的 API 密钥后重试。',
          'anthropic'
        );
      } else if (err?.status === 429 || err?.message?.includes('rate_limit')) {
        throw new ProviderError(
          ProviderErrorType.RATE_LIMIT,
          '已超出 Anthropic 速率限制。请稍等片刻后重试。',
          'anthropic',
          true // retryable
        );
      } else if (err?.status === 402 || err?.message?.includes('credit balance')) {
        throw new ProviderError(
          ProviderErrorType.QUOTA_EXCEEDED,
          'Anthropic 余额不足。请向你的账户充值。',
          'anthropic'
        );
      } else if (err?.status === 404 || err?.message?.includes('model_not_found')) {
        throw new ProviderError(
          ProviderErrorType.MODEL_NOT_FOUND,
          `Anthropic 上未找到模型“${model}”。`,
          'anthropic'
        );
      } else {
        throw new ProviderError(
          ProviderErrorType.UNKNOWN,
          `Anthropic 错误：${err?.message || '发生未知错误'}`,
          'anthropic'
        );
      }
    }
  }
}

// Singleton instance
export const anthropicProvider = new AnthropicProvider();
