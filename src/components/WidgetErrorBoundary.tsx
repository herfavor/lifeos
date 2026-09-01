import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  widgetId: string;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary for Dashboard Widgets
 * Catches errors in widget render/lifecycle and displays a fallback UI
 * Prevents a single widget crash from taking down the entire dashboard
 */
export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`Widget "${this.props.widgetId}" crashed:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full min-h-[180px] flex flex-col items-center justify-center p-6 bg-status-error-bg/60 dark:bg-status-error-bg-dark/30 border border-status-error-border dark:border-status-error-border-dark rounded-xl">
          <div className="text-center">
            <span className="mb-3 block"><AlertTriangle className="w-8 h-8 text-status-error-text dark:text-status-error-text-dark" /></span>
            <h3 className="text-base font-semibold text-status-error-text dark:text-status-error-text-dark mb-2">
              这个扩展组件暂时无法显示
            </h3>
            <p className="text-sm text-status-error-text dark:text-status-error-text-dark mb-1 max-w-xs">
              主页其他内容不受影响。你可以重试，或在“管理组件”中停用它。
            </p>
            <p className="mb-4 text-xs text-text-light-tertiary dark:text-text-dark-tertiary">模块：{this.props.widgetId}</p>
            <button
              onClick={this.handleRetry}
              className="px-3 py-2 text-sm font-medium bg-accent-red hover:bg-accent-red-hover text-white rounded-button transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
