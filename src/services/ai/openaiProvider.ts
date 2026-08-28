/**
 * OpenAI Provider
 * Access to GPT-4o, o1, and other OpenAI models
 * BYOK (Bring Your Own Key) - User provides paid API key
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

const log = logger.module('AI:OpenAI');

/**
 * OpenAI provider metadata
 */
const METADATA: AIProviderMetadata = {
  id: 'openai',
  name: 'OpenAI',
  displayName: 'OpenAI',
  description: 'OpenAI 的业界领先模型。需要付费 API 密钥（与 ChatGPT Plus 分开）。',

  requiresApiKey: true,
  apiKeyUrl: 'https://platform.openai.com/api-keys',
  apiKeyLabel: 'OpenAI API 密钥',

  hasFreeModels: false, // No permanent free tier
  freeModelIds: [],

  supportsCORS: false,
  requiresProxy: true, // OpenAI does NOT support CORS
  supportsStreaming: true,

  websiteUrl: 'https://openai.com',
  docsUrl: 'https://platform.openai.com/docs',
};

/**
 * OpenAI models (all paid)
 */
const PAID_MODELS: AIModel[] = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
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
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    speedRating: 5,
    qualityRating: 4,
    contextWindow: 128000,
    maxOutputTokens: 16384,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    isFree: false,
    costPer1MTokens: 0.15,
    requiresApiKey: true,
    useCases: ['chat', 'code', 'quick-tasks'],
    description: '快速实惠的 GPT-4 模型。适合大多数任务。',
  },
  {
    id: 'o1',
    name: 'o1 (Reasoning)',
    provider: 'openai',
    speedRating: 2,
    qualityRating: 5,
    contextWindow: 200000,
    maxOutputTokens: 100000,
    supportsStreaming: false, // o1 doesn't support streaming
    isFree: false,
    costPer1MTokens: 15.0,
    requiresApiKey: true,
    useCases: ['reasoning', 'math', 'science', 'complex-analysis'],
    description: 'OpenAI 的推理模型。最适合需要深度思考的复杂问题。',
  },
  {
    id: 'o1-mini',
    name: 'o1-mini (Fast Reasoning)',
    provider: 'openai',
    speedRating: 3,
    qualityRating: 4,
    contextWindow: 128000,
    maxOutputTokens: 65536,
    supportsStreaming: false,
    isFree: false,
    costPer1MTokens: 3.0,
    requiresApiKey: true,
    useCases: ['reasoning', 'code', 'math'],
    description: '更快更便宜的推理模型，适合编码和 STEM 任务。',
  },
];

/**
 * OpenAI AI Provider Implementation
 */
export class OpenAIProvider implements AIProvider {
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
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Note: OpenAI doesn't support CORS, this will likely fail
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
    return PAID_MODELS[1]; // GPT-4o Mini (most affordable)
  }

  /**
   * Get all free models
   */
  getFreeModels(): AIModel[] {
    return []; // No free models
  }

  /**
   * Send message to OpenAI
   */
  async sendMessage(model: string, options: AIMessageOptions): Promise<AIResponse> {
    if (!this.client) {
      throw new ProviderError(
        ProviderErrorType.INVALID_API_KEY,
        'OpenAI 提供商尚未配置。请添加你的 OpenAI API 密钥。',
        'openai'
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

      // Check if model supports streaming (o1 models don't)
      const modelInfo = this.getModel(model);
      const canStream = modelInfo?.supportsStreaming !== false;

      // Send request
      if (options.stream && options.onChunk && canStream) {
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
          provider: 'openai',
          finishReason: 'stop',
        };
      } else {
        // Non-streaming mode (or model doesn't support streaming)
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
          provider: 'openai',
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
          'OpenAI API 密钥无效。请检查你的 API 密钥后重试。',
          'openai'
        );
      } else if (err?.status === 429 || err?.message?.includes('rate limit')) {
        throw new ProviderError(
          ProviderErrorType.RATE_LIMIT,
          '已超出 OpenAI 速率限制。请稍等片刻后重试。',
          'openai',
          true // retryable
        );
      } else if (err?.status === 402 || err?.message?.includes('quota') || err?.message?.includes('billing')) {
        throw new ProviderError(
          ProviderErrorType.QUOTA_EXCEEDED,
          'OpenAI 配额已用尽或存在计费问题。请检查你的账户。',
          'openai'
        );
      } else if (err?.status === 404 || err?.message?.includes('model')) {
        throw new ProviderError(
          ProviderErrorType.MODEL_NOT_FOUND,
          `OpenAI 上未找到模型“${model}”。`,
          'openai'
        );
      } else if (err?.message?.includes('CORS') || err?.message?.includes('fetch')) {
        throw new ProviderError(
          ProviderErrorType.NETWORK_ERROR,
          'OpenAI 在浏览器中使用需要后端代理。遇到 CORS 错误。',
          'openai'
        );
      } else {
        throw new ProviderError(
          ProviderErrorType.UNKNOWN,
          `OpenAI 错误：${err?.message || '发生未知错误'}`,
          'openai'
        );
      }
    }
  }
}

// Singleton instance
export const openaiProvider = new OpenAIProvider();
