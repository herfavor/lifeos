/**
 * Hugging Face Provider
 * Access to thousands of open-source models
 * True free tier with no credit card required
 */

import { HfInference } from '@huggingface/inference';
import type {
  AIProvider,
  AIProviderMetadata,
  AIModel,
  AIMessageOptions,
  AIResponse,
} from './types';
import { ProviderError, ProviderErrorType } from './types';
import { logger } from '../logger';

const log = logger.module('AI:HuggingFace');

/**
 * Hugging Face provider metadata
 */
const METADATA: AIProviderMetadata = {
  id: 'huggingface',
  name: 'Hugging Face',
  displayName: 'Hugging Face',
  description: '可访问数千个开源 AI 模型。真正的免费层级，无需信用卡。',

  requiresApiKey: true,
  apiKeyUrl: 'https://huggingface.co/settings/tokens',
  apiKeyLabel: 'Hugging Face API 令牌',

  hasFreeModels: true,
  freeModelIds: [
    'meta-llama/Llama-3.2-3B-Instruct',
    'microsoft/Phi-3-mini-4k-instruct',
    'mistralai/Mistral-7B-Instruct-v0.3',
  ],

  freeTierLimits: {
    description: '免费层级：每月推理额度。速率限制因模型热度而异。',
  },

  supportsCORS: true,
  requiresProxy: false,
  supportsStreaming: true,

  websiteUrl: 'https://huggingface.co',
  docsUrl: 'https://huggingface.co/docs/api-inference',
};

/**
 * Popular free models on Hugging Face
 */
const FREE_MODELS: AIModel[] = [
  {
    id: 'meta-llama/Llama-3.2-3B-Instruct',
    name: 'Llama 3.2 3B Instruct',
    provider: 'huggingface',
    speedRating: 4,
    qualityRating: 4,
    contextWindow: 8192,
    maxOutputTokens: 2048,
    supportsStreaming: true,
    isFree: true,
    requiresApiKey: true,
    useCases: ['chat', 'code', 'quick-tasks'],
    description: 'Meta 的紧凑型 Llama 模型。速度和质量的良好平衡。',
  },
  {
    id: 'microsoft/Phi-3-mini-4k-instruct',
    name: 'Phi-3 Mini 4K Instruct',
    provider: 'huggingface',
    speedRating: 5,
    qualityRating: 3,
    contextWindow: 4096,
    maxOutputTokens: 2048,
    supportsStreaming: true,
    isFree: true,
    requiresApiKey: true,
    useCases: ['chat', 'quick-tasks'],
    description: 'Microsoft 的小巧快速模型，适合简单任务。',
  },
  {
    id: 'mistralai/Mistral-7B-Instruct-v0.3',
    name: 'Mistral 7B Instruct v0.3',
    provider: 'huggingface',
    speedRating: 4,
    qualityRating: 4,
    contextWindow: 32768,
    maxOutputTokens: 8192,
    supportsStreaming: true,
    isFree: true,
    requiresApiKey: true,
    useCases: ['chat', 'code', 'analysis'],
    description: 'Mistral 高效的 7B 模型，上下文窗口大。',
  },
  {
    id: 'google/gemma-2-2b-it',
    name: 'Gemma 2 2B IT',
    provider: 'huggingface',
    speedRating: 5,
    qualityRating: 3,
    contextWindow: 8192,
    maxOutputTokens: 2048,
    supportsStreaming: true,
    isFree: true,
    requiresApiKey: true,
    useCases: ['chat', 'quick-tasks'],
    description: 'Google 的轻量级 Gemma 模型。处理简单查询非常快。',
  },
];

/**
 * Hugging Face AI Provider Implementation
 */
export class HuggingFaceProvider implements AIProvider {
  metadata = METADATA;
  models = FREE_MODELS;

  private client: HfInference | null = null;
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
    this.client = new HfInference(apiKey);
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
      const testClient = new HfInference(apiKey);

      // Try a minimal request to validate token
      // Using text generation with a simple prompt
      await testClient.textGeneration({
        model: 'google/gemma-2-2b-it',
        inputs: 'Hi',
        parameters: {
          max_new_tokens: 5,
        },
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
    return FREE_MODELS[0]; // Llama 3.2 3B
  }

  /**
   * Get all free models
   */
  getFreeModels(): AIModel[] {
    return FREE_MODELS;
  }

  /**
   * Send message to Hugging Face
   */
  async sendMessage(model: string, options: AIMessageOptions): Promise<AIResponse> {
    if (!this.client) {
      throw new ProviderError(
        ProviderErrorType.INVALID_API_KEY,
        'Hugging Face 提供商尚未配置。请添加你的 API 令牌。',
        'huggingface'
      );
    }

    try {
      // Build conversation prompt
      let fullPrompt = '';

      // Add system prompt if provided
      if (options.systemPrompt) {
        fullPrompt += `System: ${options.systemPrompt}\n\n`;
      }

      // Add conversation history
      if (options.conversationHistory && options.conversationHistory.length > 0) {
        options.conversationHistory.forEach((msg) => {
          const role = msg.role === 'assistant' ? 'Assistant' : 'User';
          fullPrompt += `${role}: ${msg.content}\n\n`;
        });
      }

      // Add current user prompt
      fullPrompt += `User: ${options.prompt}\n\nAssistant:`;

      // Send request
      if (options.stream && options.onChunk) {
        // Streaming mode
        let fullContent = '';

        const stream = this.client.textGenerationStream({
          model: model,
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: options.maxTokens || 2048,
            temperature: options.temperature || 0.7,
            return_full_text: false,
          },
        });

        for await (const chunk of stream) {
          if (chunk.token?.text) {
            const content = chunk.token.text;
            fullContent += content;
            if (options.onChunk) {
              options.onChunk(content);
            }
          }
        }

        return {
          content: fullContent.trim(),
          model: model,
          provider: 'huggingface',
          finishReason: 'stop',
        };
      } else {
        // Non-streaming mode
        const response = await this.client.textGeneration({
          model: model,
          inputs: fullPrompt,
          parameters: {
            max_new_tokens: options.maxTokens || 2048,
            temperature: options.temperature || 0.7,
            return_full_text: false,
          },
        });

        const content = response.generated_text.trim();

        return {
          content: content,
          model: model,
          provider: 'huggingface',
          finishReason: 'stop',
        };
      }
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };

      // Map Hugging Face errors to ProviderError
      if (err?.message?.includes('401') || err?.message?.includes('Invalid token')) {
        throw new ProviderError(
          ProviderErrorType.INVALID_API_KEY,
          'Hugging Face API 令牌无效。请检查你的令牌后重试。',
          'huggingface'
        );
      } else if (err?.message?.includes('429') || err?.message?.includes('rate limit')) {
        throw new ProviderError(
          ProviderErrorType.RATE_LIMIT,
          '已超出 Hugging Face 速率限制。请稍等片刻后重试。',
          'huggingface',
          true // retryable
        );
      } else if (err?.message?.includes('quota')) {
        throw new ProviderError(
          ProviderErrorType.QUOTA_EXCEEDED,
          'Hugging Face 配额已用尽。请等待每月额度重置。',
          'huggingface'
        );
      } else if (err?.message?.includes('404') || err?.message?.includes('not found')) {
        throw new ProviderError(
          ProviderErrorType.MODEL_NOT_FOUND,
          `Hugging Face 上未找到或暂不可用模型“${model}”。`,
          'huggingface'
        );
      } else if (err?.message?.includes('Model is currently loading')) {
        throw new ProviderError(
          ProviderErrorType.UNKNOWN,
          '模型正在加载。请稍等片刻后重试。',
          'huggingface',
          true // retryable
        );
      } else {
        throw new ProviderError(
          ProviderErrorType.UNKNOWN,
          `Hugging Face 错误：${err?.message || '发生未知错误'}`,
          'huggingface'
        );
      }
    }
  }
}

// Singleton instance
export const huggingFaceProvider = new HuggingFaceProvider();
