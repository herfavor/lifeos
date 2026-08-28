/**
 * Store Error Boundary
 *
 * Catches errors during render that originate from store data issues.
 * Shows recovery UI instead of blank screen.
 *
 * Usage:
 * <StoreErrorBoundary storeName="calendar">
 *   <TimeTracking />
 * </StoreErrorBoundary>
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { logger } from '../services/logger';

const log = logger.module('StoreErrorBoundary');

const STORE_LABELS: Record<string, string> = {
  automation: '自动化',
  activity: '回顾',
  calendar: '日程',
  diagrams: '绘图',
  docs: '文档',
  forms: '表单',
  kanban: '任务',
  links: '收藏',
  notes: '笔记',
  portfolio: '项目组合',
  energy: '精力',
  retrospective: '每周回顾',
  timetracking: '时间记录',
};

interface Props {
  children: ReactNode;
  storeName: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class StoreErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    log.error(`Store error in ${this.props.storeName}`, {
      error: error.message,
      stack: error.stack?.slice(0, 500),
      componentStack: errorInfo.componentStack?.slice(0, 500),
    });

    this.setState({ errorInfo });
  }

  componentDidUpdate(previousProps: Props): void {
    if (previousProps.storeName !== this.props.storeName && this.state.hasError) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleExportDiagnostic = (): void => {
    const report = {
      generatedAt: new Date().toISOString(),
      module: this.props.storeName,
      route: window.location.pathname,
      userAgent: navigator.userAgent,
      error: this.state.error?.message ?? '未知错误',
      stack: this.state.error?.stack?.slice(0, 1500),
      componentStack: this.state.errorInfo?.componentStack?.slice(0, 1500),
      note: '诊断文件不包含工作区内容、API 密钥或浏览器存储数据。',
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `lifeos-${this.props.storeName}-diagnostic-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, storeName, fallback } = this.props;
    const storeLabel = STORE_LABELS[storeName] ?? storeName;

    if (!hasError) {
      return children;
    }

    if (fallback) {
      return fallback;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <div className="text-6xl mb-4">
          {storeName === 'calendar' && '📅'}
          {storeName === 'kanban' && '📋'}
          {storeName === 'notes' && '📝'}
          {storeName === 'automation' && '⚡'}
          {storeName === 'portfolio' && '📂'}
          {!['calendar', 'kanban', 'notes', 'automation', 'portfolio'].includes(storeName) && '⚠️'}
        </div>

        <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
          加载{storeLabel}时出现问题
        </h2>

        <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6 max-w-md text-center">
          页面在渲染时遇到异常。这不代表数据已经损坏，LifeOS 不会自动删除任何内容。
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-6">
          <button
            onClick={this.handleRetry}
            className="px-4 py-2.5 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-button font-medium transition-all duration-standard ease-smooth"
          >
            重试
          </button>

          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2.5 bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark text-text-light-primary dark:text-text-dark-primary rounded-button font-medium transition-all duration-standard ease-smooth border border-border-light dark:border-border-dark"
          >
            重新加载页面
          </button>

          <a
            href="/settings?tab=backup"
            className="px-4 py-2.5 bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark text-text-light-primary dark:text-text-dark-primary rounded-button font-medium transition-all duration-standard ease-smooth border border-border-light dark:border-border-dark inline-flex items-center"
          >
            备份与恢复
          </a>

          <button
            onClick={this.handleExportDiagnostic}
            className="px-4 py-2.5 bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark text-text-light-primary dark:text-text-dark-primary rounded-button font-medium transition-all duration-standard ease-smooth border border-border-light dark:border-border-dark"
          >
            导出诊断
          </button>
        </div>

        <p className="mb-4 max-w-lg text-center text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
          若重试后仍出现问题，可先在设置中导出备份，再展开下方技术详情用于排查。
        </p>

        <details className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary max-w-lg">
          <summary className="cursor-pointer hover:text-text-light-secondary dark:hover:text-text-dark-secondary">
            技术详情
          </summary>
          <pre className="mt-2 p-3 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg overflow-auto text-xs max-h-32">
            {error?.message || '未知错误'}
            {'\n\n'}
            {error?.stack?.slice(0, 300)}
          </pre>
        </details>
      </div>
    );
  }
}
