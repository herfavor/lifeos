/**
 * About Settings Widget
 *
 * The new home for everything that used to live in the floating footer pill:
 * 关于我们 · 隐私政策 · 帮助与支持 · © LifeOS — plus app info, PWA install,
 * and diagnostic tooling.
 */

import { useState, useEffect, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  Info,
  HelpCircle,
  Download,
  FileText,
  ExternalLink,
  ShieldCheck,
  BookOpen,
  HeartHandshake,
} from 'lucide-react';

// Lazy load SupportModal to prevent bundle bloat
const SupportModal = lazy(() => import('../../components/SupportModal').then(m => ({ default: m.SupportModal })));
import { getDiagnosticReport, formatDiagnosticReport, downloadDiagnosticReport } from '../../utils/diagnostics';
import { logger } from '../../services/logger';
import { BUILD_HASH, formatBuildTimestamp } from '../../utils/buildInfo';
import { APP_NAME, APP_TAGLINE, APP_VERSION } from '../../config/appInfo';
import { AppInstallSection } from './AppInstallSection';

const log = logger.module('AboutSettings');

export function AboutSettings() {
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [diagnosticText, setDiagnosticText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleViewDiagnosticReport = async () => {
    try {
      setIsGenerating(true);
      const report = await getDiagnosticReport();
      const formatted = formatDiagnosticReport(report);
      setDiagnosticText(formatted);
      setShowDiagnosticModal(true);
      log.info('Diagnostic report viewed from About Settings');
    } catch (error) {
      log.error('Failed to generate diagnostic report', { error });
      setMessage({ type: 'error', text: '生成诊断报告失败' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadDiagnosticReport = async () => {
    try {
      setIsGenerating(true);
      const report = await getDiagnosticReport();
      downloadDiagnosticReport(report);
      setMessage({ type: 'success', text: '诊断报告已下载' });
      log.info('Diagnostic report downloaded from About Settings');
    } catch (error) {
      log.error('Failed to download diagnostic report', { error });
      setMessage({ type: 'error', text: '下载报告失败' });
    } finally {
      setIsGenerating(false);
    }
  };

  // Auto-dismiss success messages
  useEffect(() => {
    if (message?.type === 'success') {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="space-y-6">
      {/* ── Brand header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-primary to-accent-secondary text-2xl font-bold text-white shadow-soft"
          aria-hidden="true"
        >
          L
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2 className="text-xl font-semibold tracking-tight text-text-light-primary dark:text-text-dark-primary">
              {APP_NAME}
            </h2>
            <span className="rounded-full border border-border-light px-2 py-0.5 text-[11px] font-medium leading-none text-text-light-tertiary dark:border-border-dark dark:text-text-dark-tertiary">
              v{APP_VERSION}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-text-light-secondary dark:text-text-dark-secondary">
            {APP_TAGLINE} —— 核心数据留在设备上，可选联网能力由你决定。
          </p>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            message.type === 'success'
              ? 'border-status-success-border bg-status-success-bg text-status-success-text dark:border-status-success-border-dark dark:bg-status-success-bg-dark dark:text-status-success-text-dark'
              : 'border-status-error-border bg-status-error-bg text-status-error-text dark:border-status-error-border-dark dark:bg-status-error-bg-dark dark:text-status-error-text-dark'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ── PWA install (moved here from the floating banner) ────── */}
      <AppInstallSection />

      {/* ── Quick links: the old footer, now first-class ─────────── */}
      <section aria-label="了解更多">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-light-tertiary dark:text-text-dark-tertiary">
          了解更多
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/about"
            className="group flex items-center gap-3 rounded-xl border border-border-light bg-surface-light-elevated p-4 transition-all duration-standard ease-smooth hover:-translate-y-0.5 hover:border-accent-primary/40 hover:shadow-card dark:border-border-dark dark:bg-surface-dark-elevated"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-blue/10 text-accent-blue">
              <BookOpen className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">关于我们</span>
              <span className="block truncate text-xs text-text-light-secondary dark:text-text-dark-secondary">
                产品理念、功能导览与开源信息
              </span>
            </span>
            <ExternalLink className="h-4 w-4 shrink-0 text-text-light-tertiary transition-colors group-hover:text-accent-primary dark:text-text-dark-tertiary" />
          </Link>

          <Link
            to="/privacy"
            className="group flex items-center gap-3 rounded-xl border border-border-light bg-surface-light-elevated p-4 transition-all duration-standard ease-smooth hover:-translate-y-0.5 hover:border-accent-primary/40 hover:shadow-card dark:border-border-dark dark:bg-surface-dark-elevated"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-green/10 text-accent-green">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">隐私政策</span>
              <span className="block truncate text-xs text-text-light-secondary dark:text-text-dark-secondary">
                无账户、无云端、无追踪，数据完全本地
              </span>
            </span>
            <ExternalLink className="h-4 w-4 shrink-0 text-text-light-tertiary transition-colors group-hover:text-accent-primary dark:text-text-dark-tertiary" />
          </Link>

          <button
            onClick={() => setShowSupportModal(true)}
            className="group col-span-full flex items-center gap-3 rounded-xl border border-border-light bg-surface-light-elevated p-4 text-left transition-all duration-standard ease-smooth hover:-translate-y-0.5 hover:border-accent-primary/40 hover:shadow-card dark:border-border-dark dark:bg-surface-dark-elevated"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-purple/10 text-accent-purple">
              <HeartHandshake className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">帮助与支持</span>
              <span className="block truncate text-xs text-text-light-secondary dark:text-text-dark-secondary">
                使用文档、常见问题、快捷键与问题反馈
              </span>
            </span>
            <HelpCircle className="h-4 w-4 shrink-0 text-text-light-tertiary transition-colors group-hover:text-accent-primary dark:text-text-dark-tertiary" />
          </button>
        </div>
      </section>

      {/* ── App information ──────────────────────────────────────── */}
      <section aria-label="应用信息">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-light-tertiary dark:text-text-dark-tertiary">
          应用信息
        </h3>
        <dl className="divide-y divide-border-light overflow-hidden rounded-xl border border-border-light bg-surface-light-elevated text-sm dark:divide-border-dark dark:border-border-dark dark:bg-surface-dark-elevated">
          {[
            ['应用名称', APP_NAME],
            ['版本', `v${APP_VERSION}`],
            ['构建', BUILD_HASH],
            ['构建日期', formatBuildTimestamp()],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <dt className="shrink-0 text-text-light-secondary dark:text-text-dark-secondary">{label}</dt>
              <dd className="truncate text-right font-mono text-xs text-text-light-primary dark:text-text-dark-primary">{value}</dd>
            </div>
          ))}
          <div className="flex items-start justify-between gap-4 px-4 py-2.5">
            <dt className="shrink-0 text-text-light-secondary dark:text-text-dark-secondary">简介</dt>
            <dd className="max-w-[24rem] text-right text-xs leading-relaxed text-text-light-primary dark:text-text-dark-primary">
              收集 → 安排 → 专注 → 沉淀 → 回顾。日程、任务、项目、笔记、收藏与 AI 指挥中心，全部离线可用。
            </dd>
          </div>
        </dl>
      </section>

      {/* ── Diagnostics ──────────────────────────────────────────── */}
      <section aria-label="问题诊断">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-light-tertiary dark:text-text-dark-tertiary">
          问题诊断
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            onClick={handleViewDiagnosticReport}
            disabled={isGenerating}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-button border border-border-light bg-surface-light-elevated px-4 text-sm font-medium text-text-light-primary transition-all duration-200 hover:bg-border-light disabled:cursor-not-allowed disabled:opacity-50 dark:border-border-dark dark:bg-surface-dark-elevated dark:text-text-dark-primary dark:hover:bg-border-dark"
          >
            <FileText className="h-4 w-4" />
            <span>{isGenerating ? '生成中…' : '查看诊断报告'}</span>
          </button>

          <button
            onClick={handleDownloadDiagnosticReport}
            disabled={isGenerating}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-button border border-border-light bg-surface-light-elevated px-4 text-sm font-medium text-text-light-primary transition-all duration-200 hover:bg-border-light disabled:cursor-not-allowed disabled:opacity-50 dark:border-border-dark dark:bg-surface-dark-elevated dark:text-text-dark-primary dark:hover:bg-border-dark"
          >
            <Download className="h-4 w-4" />
            <span>{isGenerating ? '生成中…' : '下载诊断报告'}</span>
          </button>
        </div>
      </section>

      {/* ── License & copyright (old footer sign-off) ────────────── */}
      <footer className="flex flex-col items-start gap-2 rounded-xl border border-border-light bg-surface-light-elevated p-4 sm:flex-row sm:items-center sm:justify-between dark:border-border-dark dark:bg-surface-dark-elevated">
        <div className="flex items-center gap-2 text-sm text-text-light-secondary dark:text-text-dark-secondary">
          <Info className="h-4 w-4 shrink-0" />
          <span>
            以{' '}
            <a
              href="https://github.com/herfavor/lifeos/blob/main/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent-primary hover:underline"
            >
              MIT 许可证
            </a>{' '}
            开源 · 自由使用与修改
          </span>
        </div>
        <span className="text-sm tabular-nums text-text-light-tertiary dark:text-text-dark-tertiary">
          © {new Date().getFullYear()} LifeOS
        </span>
      </footer>

      {/* Support Modal */}
      {showSupportModal && (
        <Suspense fallback={null}>
          <SupportModal isOpen={showSupportModal} onClose={() => setShowSupportModal(false)} />
        </Suspense>
      )}

      {/* Diagnostic Report Modal */}
      {showDiagnosticModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowDiagnosticModal(false)}
          />

          {/* Modal */}
          <div className="relative bg-surface-light dark:bg-surface-dark rounded-card shadow-modal border border-black/10 dark:border-white/10 max-w-3xl w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark">
              <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
                诊断报告
              </h3>
              <button
                onClick={() => setShowDiagnosticModal(false)}
                className="p-1 text-text-light-secondary hover:text-text-light-primary dark:text-text-dark-secondary dark:hover:text-text-dark-primary transition-colors"
              >
                <span className="text-xl">×</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1">
              <pre className="text-xs font-mono text-text-light-secondary dark:text-text-dark-secondary whitespace-pre-wrap">
                {diagnosticText}
              </pre>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-border-light dark:border-border-dark">
              <button
                onClick={() => setShowDiagnosticModal(false)}
                className="w-full px-4 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-lg font-medium transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
