/**
 * Centralized Error Handling Service
 * Provides consistent error handling patterns across the application
 *
 * Features:
 * - Typed error categories for each domain
 * - Error logging with context
 * - User-friendly error messages
 * - Error recovery suggestions
 * - Development vs production error handling
 */

/**
 * Error categories for different domains
 */
export const ErrorCategory = {
  // Storage & Data
  STORAGE: 'storage',
  INDEXEDDB: 'indexeddb',
  PERSISTENCE: 'persistence',

  // AI & Providers
  AI_PROVIDER: 'ai_provider',
  AI_RATE_LIMIT: 'ai_rate_limit',
  AI_QUOTA: 'ai_quota',
  AI_NETWORK: 'ai_network',

  // Security
  ENCRYPTION: 'encryption',
  AUTHENTICATION: 'authentication',

  // UI & Components
  WIDGET: 'widget',
  RENDER: 'render',

  // Network
  NETWORK: 'network',
  API: 'api',

  // General
  VALIDATION: 'validation',
  UNKNOWN: 'unknown',
} as const;

export type ErrorCategory = (typeof ErrorCategory)[keyof typeof ErrorCategory];

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  /** Informational - logged but not shown to user */
  INFO: 'info',
  /** Warning - shown briefly, operation continues */
  WARNING: 'warning',
  /** Error - shown to user, operation failed but app continues */
  ERROR: 'error',
  /** Critical - shown prominently, may require user action */
  CRITICAL: 'critical',
} as const;

export type ErrorSeverity = (typeof ErrorSeverity)[keyof typeof ErrorSeverity];

/**
 * Structured application error
 */
export interface AppError {
  /** Unique error ID for tracking */
  id: string;
  /** Error category for routing/handling */
  category: ErrorCategory;
  /** Severity level */
  severity: ErrorSeverity;
  /** Technical error message (for logs) */
  message: string;
  /** User-friendly message (for display) */
  userMessage: string;
  /** Original error if wrapped */
  originalError?: Error;
  /** Additional context */
  context?: Record<string, unknown>;
  /** Suggested recovery action */
  recoveryAction?: string;
  /** Timestamp */
  timestamp: Date;
  /** Whether error was reported to user */
  reported: boolean;
}

/**
 * Error listener callback type
 */
type ErrorListener = (error: AppError) => void;

/**
 * Error service configuration
 */
interface ErrorServiceConfig {
  /** Enable console logging in development */
  enableConsoleLogging: boolean;
  /** Maximum errors to keep in history */
  maxHistorySize: number;
  /** Auto-dismiss timeout for non-critical errors (ms) */
  autoDismissTimeout: number;
}

/**
 * Default user-friendly messages by category
 */
const DEFAULT_USER_MESSAGES: Record<ErrorCategory, string> = {
  [ErrorCategory.STORAGE]: '无法保存您的数据，请重试。',
  [ErrorCategory.INDEXEDDB]: '数据库错误，您的数据可能未保存。',
  [ErrorCategory.PERSISTENCE]: '保存更改失败。',
  [ErrorCategory.AI_PROVIDER]: 'AI 服务暂时不可用。',
  [ErrorCategory.AI_RATE_LIMIT]: '请求过于频繁，请稍候片刻。',
  [ErrorCategory.AI_QUOTA]: 'API 配额已用完，请检查您的用量限制。',
  [ErrorCategory.AI_NETWORK]: '无法连接 AI 服务，请检查您的网络。',
  [ErrorCategory.ENCRYPTION]: '加密错误，请确认您的密码。',
  [ErrorCategory.AUTHENTICATION]: '身份验证失败，请重试。',
  [ErrorCategory.WIDGET]: '组件加载失败，请尝试刷新。',
  [ErrorCategory.RENDER]: '发生显示错误。',
  [ErrorCategory.NETWORK]: '网络错误，请检查您的连接。',
  [ErrorCategory.API]: '服务请求失败。',
  [ErrorCategory.VALIDATION]: '输入内容无效。',
  [ErrorCategory.UNKNOWN]: '发生意外错误。',
};

/**
 * Recovery suggestions by category
 */
const RECOVERY_SUGGESTIONS: Record<ErrorCategory, string> = {
  [ErrorCategory.STORAGE]: '请尝试清除浏览器缓存或更换浏览器。',
  [ErrorCategory.INDEXEDDB]: '刷新页面。如果问题仍然存在，请导出并重新导入您的数据。',
  [ErrorCategory.PERSISTENCE]: '您的更改已保存在本地，连接恢复后将自动同步。',
  [ErrorCategory.AI_PROVIDER]: '请在设置中尝试切换到其他 AI 提供商。',
  [ErrorCategory.AI_RATE_LIMIT]: '请等待 30 秒后再试。',
  [ErrorCategory.AI_QUOTA]: '请升级您的套餐或切换到免费提供商。',
  [ErrorCategory.AI_NETWORK]: '请检查您的网络连接后重试。',
  [ErrorCategory.ENCRYPTION]: '请重新输入您的加密密码。',
  [ErrorCategory.AUTHENTICATION]: '请退出后重新登录。',
  [ErrorCategory.WIDGET]: '请移除并重新添加该组件。',
  [ErrorCategory.RENDER]: '请刷新页面。',
  [ErrorCategory.NETWORK]: '请检查您的网络连接。',
  [ErrorCategory.API]: '请稍后再试。',
  [ErrorCategory.VALIDATION]: '请检查您的输入后重试。',
  [ErrorCategory.UNKNOWN]: '请刷新页面。如果问题仍然存在，请联系支持。',
};

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Centralized Error Service
 */
class ErrorService {
  private config: ErrorServiceConfig;
  private listeners: Set<ErrorListener> = new Set();
  private errorHistory: AppError[] = [];
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
    this.config = {
      enableConsoleLogging: this.isDevelopment,
      maxHistorySize: 100,
      autoDismissTimeout: 5000,
    };
  }

  /**
   * Update service configuration
   */
  configure(config: Partial<ErrorServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Subscribe to error events
   */
  subscribe(listener: ErrorListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Create and handle an error
   */
  handleError(
    category: ErrorCategory,
    message: string,
    options: {
      severity?: ErrorSeverity;
      userMessage?: string;
      originalError?: Error;
      context?: Record<string, unknown>;
      recoveryAction?: string;
      silent?: boolean;
    } = {}
  ): AppError {
    const {
      severity = ErrorSeverity.ERROR,
      userMessage = DEFAULT_USER_MESSAGES[category],
      originalError,
      context,
      recoveryAction = RECOVERY_SUGGESTIONS[category],
      silent = false,
    } = options;

    const error: AppError = {
      id: generateErrorId(),
      category,
      severity,
      message,
      userMessage,
      originalError,
      context,
      recoveryAction,
      timestamp: new Date(),
      reported: false,
    };

    // Add to history
    this.errorHistory.push(error);
    if (this.errorHistory.length > this.config.maxHistorySize) {
      this.errorHistory.shift();
    }

    // Log in development
    if (this.config.enableConsoleLogging) {
      this.logError(error);
    }

    // Notify listeners (unless silent)
    if (!silent) {
      error.reported = true;
      this.listeners.forEach((listener) => listener(error));
    }

    return error;
  }

  /**
   * Handle an unknown error (catch-all)
   */
  handleUnknownError(error: unknown, context?: Record<string, unknown>): AppError {
    if (error instanceof Error) {
      return this.handleError(ErrorCategory.UNKNOWN, error.message, {
        originalError: error,
        context,
      });
    }

    return this.handleError(ErrorCategory.UNKNOWN, String(error), { context });
  }

  /**
   * Convenience methods for common error types
   */
  storageError(message: string, originalError?: Error): AppError {
    return this.handleError(ErrorCategory.STORAGE, message, { originalError });
  }

  aiProviderError(message: string, provider?: string, originalError?: Error): AppError {
    return this.handleError(ErrorCategory.AI_PROVIDER, message, {
      originalError,
      context: { provider },
    });
  }

  networkError(message: string, url?: string, originalError?: Error): AppError {
    return this.handleError(ErrorCategory.NETWORK, message, {
      originalError,
      context: { url },
    });
  }

  validationError(message: string, field?: string): AppError {
    return this.handleError(ErrorCategory.VALIDATION, message, {
      severity: ErrorSeverity.WARNING,
      context: { field },
    });
  }

  widgetError(message: string, widgetId?: string, originalError?: Error): AppError {
    return this.handleError(ErrorCategory.WIDGET, message, {
      originalError,
      context: { widgetId },
    });
  }

  encryptionError(message: string, originalError?: Error): AppError {
    return this.handleError(ErrorCategory.ENCRYPTION, message, {
      severity: ErrorSeverity.CRITICAL,
      originalError,
    });
  }

  /**
   * Log error to console (development)
   */
  private logError(error: AppError): void {
    if (!import.meta.env.DEV) return;

    const prefix = `[${error.category.toUpperCase()}]`;
    const style = this.getLogStyle(error.severity);

    console.groupCollapsed(`%c${prefix} ${error.message}`, style);
    console.log('Error ID:', error.id);
    console.log('Severity:', error.severity);
    console.log('User Message:', error.userMessage);
    console.log('Recovery:', error.recoveryAction);
    if (error.context) {
      console.log('Context:', error.context);
    }
    if (error.originalError) {
      console.log('Original Error:', error.originalError);
    }
    console.groupEnd();
  }

  /**
   * Get console log style based on severity
   */
  private getLogStyle(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.INFO:
        return 'color: #3b82f6';
      case ErrorSeverity.WARNING:
        return 'color: #f59e0b; font-weight: bold';
      case ErrorSeverity.ERROR:
        return 'color: #ef4444; font-weight: bold';
      case ErrorSeverity.CRITICAL:
        return 'color: #dc2626; font-weight: bold; background: #fef2f2; padding: 2px 4px';
      default:
        return '';
    }
  }

  /**
   * Get error history
   */
  getHistory(): ReadonlyArray<AppError> {
    return this.errorHistory;
  }

  /**
   * Get recent errors (last N)
   */
  getRecentErrors(count: number = 10): ReadonlyArray<AppError> {
    return this.errorHistory.slice(-count);
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }

  /**
   * Get auto-dismiss timeout
   */
  getAutoDismissTimeout(): number {
    return this.config.autoDismissTimeout;
  }
}

// Export singleton instance
export const errorService = new ErrorService();

// Export convenience function for try-catch blocks
export function withErrorHandling<T>(
  fn: () => T,
  category: ErrorCategory,
  errorMessage: string
): T | undefined {
  try {
    return fn();
  } catch (error) {
    errorService.handleError(category, errorMessage, {
      originalError: error instanceof Error ? error : undefined,
    });
    return undefined;
  }
}

// Export async version
export async function withErrorHandlingAsync<T>(
  fn: () => Promise<T>,
  category: ErrorCategory,
  errorMessage: string
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    errorService.handleError(category, errorMessage, {
      originalError: error instanceof Error ? error : undefined,
    });
    return undefined;
  }
}
