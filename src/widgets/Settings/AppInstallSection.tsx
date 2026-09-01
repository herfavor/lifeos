/**
 * App Install & Update Section (Settings)
 *
 * Replaces the floating bottom-right PWA install banner with a proper,
 * discoverable settings card. Shows install state, manual iOS instructions,
 * and pending app updates.
 */

import React, { useState } from 'react';
import { Download, CheckCircle2, Smartphone, RefreshCw, Share2, Info } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';

export const AppInstallSection: React.FC = () => {
  const { canInstall, isInstalled, needsUpdate, install, applyUpdate } = usePWA();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="bento-card p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-primary/15 to-accent-secondary/15 text-accent-primary">
          <Smartphone className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            应用安装
          </h2>
          <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
            把 LifeOS 装到桌面或主屏幕，像原生应用一样使用
          </p>
        </div>
      </div>

      {/* Installed state */}
      {isInstalled ? (
        <div className="flex items-center gap-3 rounded-xl border border-status-success-border bg-status-success-bg p-4 dark:border-status-success-border-dark dark:bg-status-success-bg-dark">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-status-success-text dark:text-status-success-text-dark" />
          <div>
            <p className="text-sm font-medium text-status-success-text dark:text-status-success-text-dark">
              LifeOS 已安装到这台设备
            </p>
            <p className="text-xs text-status-success-text/80 dark:text-status-success-text-dark/80">
              正以独立窗口运行，数据全部保存在本地
            </p>
          </div>
        </div>
      ) : canInstall ? (
        /* One-click install available */
        <div className="flex flex-col gap-3 rounded-xl border border-border-light bg-surface-light-elevated p-4 sm:flex-row sm:items-center dark:border-border-dark dark:bg-surface-dark-elevated">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
            <Download className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
              安装 LifeOS
            </p>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              添加到主屏幕，即可全屏启动、离线使用、快速访问
            </p>
          </div>
          <button
            onClick={handleInstall}
            disabled={isInstalling}
            className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-button bg-accent-primary px-5 text-sm font-medium text-white shadow-soft transition-all duration-standard ease-smooth hover:bg-accent-primary-hover hover:shadow-medium disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {isInstalling ? '正在安装…' : '安装'}
          </button>
        </div>
      ) : (
        /* Manual install guidance */
        <div className="rounded-xl border border-border-light bg-surface-light-elevated p-4 dark:border-border-dark dark:bg-surface-dark-elevated">
          <button
            onClick={() => setShowIOSHint((v) => !v)}
            className="flex w-full items-start gap-3 text-left"
            aria-expanded={showIOSHint}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-blue/10 text-accent-blue">
              <Info className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                在当前浏览器中手动安装
              </span>
              <span className="mt-0.5 block text-xs text-text-light-secondary dark:text-text-dark-secondary">
                点击查看添加到主屏幕的方法
              </span>
            </span>
          </button>
          {showIOSHint && (
            <ol className="mt-3 list-decimal space-y-1.5 border-t border-border-light pt-3 pl-8 text-xs leading-relaxed text-text-light-secondary dark:border-border-dark dark:text-text-dark-secondary">
              <li className="pl-1">
                <strong>iPhone / iPad：</strong>点击浏览器底部的「分享」按钮{' '}
                <Share2 className="inline h-3 w-3 align-[-1px]" />，选择「添加到主屏幕」。
              </li>
              <li className="pl-1">
                <strong>Android：</strong>Chrome 菜单（⋮）→「安装应用」或「添加到主屏幕」。
              </li>
              <li className="pl-1">
                <strong>电脑：</strong>Chrome / Edge 地址栏右侧的安装图标，一键安装为桌面应用。
              </li>
            </ol>
          )}
        </div>
      )}

      {/* Pending update */}
      {needsUpdate && (
        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-accent-primary/30 bg-accent-primary/5 p-4 sm:flex-row sm:items-center dark:border-accent-primary/40">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
            <RefreshCw className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
              新版本可用
            </p>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              一个新版本已就绪，刷新后立即生效
            </p>
          </div>
          <button
            onClick={applyUpdate}
            className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-button border border-accent-primary/50 px-5 text-sm font-medium text-accent-primary transition-colors hover:bg-accent-primary/10"
          >
            <RefreshCw className="h-4 w-4" />
            立即更新
          </button>
        </div>
      )}
    </div>
  );
};

export default AppInstallSection;
