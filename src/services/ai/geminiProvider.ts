/**
 * Google Gemini Provider
 * Google's AI models with large context windows
 * Free tier: 10-15 RPM, commercial use allowed
 */

import { GoogleGenerativeAI, type Content } from '@google/generative-ai';
import type {
  AIProvider,
  AIProviderMetadata,
  AIModel,
  AIMessageOptions,
  AIResponse,
} from './types';
import { ProviderError, ProviderErrorType } from './types';
import { logger } from '../logger';

const log = logger.module('AI:Gemini');

/**
 * Gemini provider metadata
 */
const METADATA: AIProviderMetadata = {
  id: 'gemini',
  name: 'Google Gemini',
  displayName: 'Google Gemini',
  description: 'Google 的 AI 模型，支持 100 万 token 上下文。免费层级允许商用。',

  requiresApiKey: true,
  apiKeyUrl: 'https://aistudio.google.com/apikey',
  apiKeyLabel: 'Google AI API 密钥',

  hasFreeModels: true,
  freeModelIds: [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ],

  freeTierLimits: {
    requestsPerMinute: 15,
    tokensPerMinute: 250000,
    requestsPerDay: 250,
    description: '免费层级：10-15 RPM、250K TPM、250 RPD。每日太平洋时间午夜重置。',
  },

  supportsCORS: false,
  requiresProxy: true, // Recommended for production (see CLAUDE.md security notes)
  supportsStreaming: true,

  websiteUrl: 'https://ai.google.dev',
  docsUrl: 'https://ai.google.dev/gemini-api/docs',
};

/**
 * Free Gemini models
 */
const FREE_MODELS: AIModel[] = [
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'gemini',
    speedRating: 5,
    qualityRating: 4,
    contextWindow: 1000000, // 1M tokens
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsVision: true,
    isFree: true,
    requiresApiKey: true,
    useCases: ['chat', 'code', 'creative', 'multimodal'],
    description: 'Google 最快的模型，支持 100 万 token 上下文。非常适合长文档。',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'gemini',
    speedRating: 3,
    qualityRating: 5,
    contextWindow: 1000000, // 1M tokens
    maxOutputTokens: 8192,
    supportsStreaming: true,
    supportsVision: true,
    supportsFunctionCalling: true,
    isFree: true,
    requiresApiKey: true,
    useCases: ['reasoning', 'analysis', 'code', 'multimodal'],
    description: 'Google 能力最强的模型。最适合复杂推理和分析。',
  },
];

/**
 * Google Gemini AI Provider Implementation
 */
export class GeminiProvider implements AIProvider {
  metadata = METADATA;
  models = FREE_MODELS;

  private genAI: GoogleGenerativeAI | null = null;
  private apiKey: string | null = null;

  /**
   * Check if provider is configured with API key
   */
  isConfigured(): boolean {
    return !!this.apiKey && !!this.genAI;
  }

  /**
   * Set API key and initialize client
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
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
    this.genAI = null;
  }

  /**
   * Validate API key by making a test request
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const testGenAI = new GoogleGenerativeAI(apiKey);
      const model = testGenAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      // Try a minimal request to validate key
      await model.generateContent('Hi');
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
    return FREE_MODELS[0]; // Gemini 1.5 Flash
  }

  /**
   * Get all free models
   */
  getFreeModels(): AIModel[] {
    return FREE_MODELS;
  }

  /**
   * Convert conversation history to Gemini Content format
   */
  private convertToGeminiHistory(
    history: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>
  ): Content[] {
    return history
      .filter((msg) => msg.role !== 'system') // Gemini uses systemInstruction separately
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));
  }

  /**
   * Send message to Gemini
   */
  async sendMessage(model: string, options: AIMessageOptions): Promise<AIResponse> {
    if (!this.genAI) {
      throw new ProviderError(
        ProviderErrorType.INVALID_API_KEY,
        'Gemini 提供商尚未配置。请添加你的 Google AI API 密钥。',
        'gemini'
      );
    }

    try {
      const genModel = this.genAI.getGenerativeModel({ model });

      // Convert conversation history to Gemini format
      const history = options.conversationHistory
        ? this.convertToGeminiHistory(options.conversationHistory)
        : [];

      // Start chat with history
      const chat = genModel.startChat({
        history,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 2048,
          temperature: options.temperature || 0.7,
        },
        systemInstruction: options.systemPrompt,
      });

      // Send request
      if (options.stream && options.onChunk) {
        // Streaming mode
        const result = await chat.sendMessageStream(options.prompt);
        let fullText = '';

        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullText += chunkText;
          if (options.onChunk) {
            options.onChunk(chunkText);
          }
        }

        return {
          content: fullText,
          model: model,
          provider: 'gemini',
          finishReason: 'stop',
        };
      } else {
        // Non-streaming mode
        const result = await chat.sendMessage(options.prompt);
        const response = result.response;

        return {
          content: response.text(),
          model: model,
          provider: 'gemini',
          finishReason: 'stop',
          usage: response.usageMetadata ? {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            completionTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          } : undefined,
        };
      }
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };

      // Map Gemini errors to ProviderError
      if (err?.message?.includes('API_KEY_INVALID') || err?.message?.includes('API key not valid')) {
        throw new ProviderError(
          ProviderErrorType.INVALID_API_KEY,
          'Google AI API 密钥无效。请检查你的 API 密钥后重试。',
          'gemini'
        );
      } else if (err?.message?.includes('RATE_LIMIT_EXCEEDED') || err?.message?.includes('429')) {
        throw new ProviderError(
          ProviderErrorType.RATE_LIMIT,
          '已超出 Gemini 速率限制（10-15 RPM）。请稍等片刻后重试。',
          'gemini',
          true // retryable
        );
      } else if (err?.message?.includes('QUOTA_EXCEEDED') || err?.message?.includes('quota')) {
        throw new ProviderError(
          ProviderErrorType.QUOTA_EXCEEDED,
          'Gemini 配额已用尽。已达到每日限制（太平洋时间午夜重置）。',
          'gemini'
        );
      } else if (err?.message?.includes('Model not found')) {
        throw new ProviderError(
          ProviderErrorType.MODEL_NOT_FOUND,
          `Gemini 上未找到模型“${model}”。`,
          'gemini'
        );
      } else {
        throw new ProviderError(
          ProviderErrorType.UNKNOWN,
          `Gemini 错误：${err?.message || '发生未知错误'}`,
          'gemini'
        );
      }
    }
  }
}

// Singleton instance
export const geminiProvider = new GeminiProvider();
