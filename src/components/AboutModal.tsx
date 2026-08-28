import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { BUILD_HASH, formatBuildTimestamp } from '../utils/buildInfo';
import { useThemeStore } from '../stores/useThemeStore';
import {
  APP_NAME,
  APP_VERSION,
  APP_TAGLINE,
  APP_DESCRIPTION,
  APP_REPO_URL,
  APP_ISSUES_URL,
  APP_LICENSE_URL,
} from '../config/appInfo';

interface AboutModalProps {
  onClose: () => void;
}

/**
 * About Modal — LifeOS
 *
 * Shows the product identity: name, version, description, project links
 * and license. Upstream source attribution is kept in the repository's
 * LICENSE / NOTICE.md files rather than in the user interface.
 */
export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  const mode = useThemeStore((s) => s.mode);
  const logoSrc = mode === 'dark' ? '/images/logos/lifeos-logo-white.svg' : '/images/logos/lifeos-logo.svg';
  const [showPhilosophy, setShowPhilosophy] = useState(false);

  // Lock body scroll while modal content mounts (kept from previous behavior)
  useEffect(() => {
    document.title = `关于 - ${APP_NAME}`;
    return () => {
      document.title = APP_NAME;
    };
  }, []);

  return (
    <Modal
      isOpen={true}
      title={`关于 ${APP_NAME}`}
      onClose={onClose}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-3/5 max-w-[240px] overflow-hidden">
            <img
              src={logoSrc}
              alt="LifeOS Logo"
              className="w-full h-auto object-contain"
            />
          </div>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary tracking-wide">
            {APP_TAGLINE}
          </p>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-text-light-primary dark:text-text-dark-primary leading-relaxed text-center px-2">
          {APP_DESCRIPTION}
        </p>

        {/* Version & Build */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
            版本 {APP_VERSION}
          </span>
          <span className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary font-mono">
            构建：{BUILD_HASH}（{formatBuildTimestamp()}）
          </span>
        </div>

        {/* Project Links */}
        <div className="border-t border-border-light dark:border-border-dark pt-3 mt-2">
          <div className="flex flex-wrap gap-4 justify-center text-xs">
            <a
              href={APP_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-blue hover:text-accent-blue-hover hover:underline transition-all duration-standard ease-smooth"
            >
              GitHub 仓库
            </a>
            <a
              href={APP_ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-blue hover:text-accent-blue-hover hover:underline transition-all duration-standard ease-smooth"
            >
              问题反馈
            </a>
            <a
              href={APP_LICENSE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-blue hover:text-accent-blue-hover hover:underline transition-all duration-standard ease-smooth"
            >
              MIT License
            </a>
            <button
              onClick={() => setShowPhilosophy((v) => !v)}
              className="text-accent-blue hover:text-accent-blue-hover hover:underline transition-all duration-standard ease-smooth"
            >
              {showPhilosophy ? '收起产品理念' : '产品理念'}
            </button>
          </div>
        </div>

        {/* Product Philosophy (collapsed by default) */}
        {showPhilosophy && (
          <div className="rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated p-4 text-xs sm:text-sm text-text-light-secondary dark:text-text-dark-secondary leading-relaxed space-y-2">
            <p>
              LifeOS 的核心理念不是"功能越多越好"，而是<strong>方便、清晰、聚合、整理</strong>：
              打开 LifeOS 就能看到自己的整体状态，知道今天做什么，了解项目进展，并快速进入正确的工具。
            </p>
            <p>
              数据永远属于你：本地优先，离线可用，随时导出。AI 指挥中心遵循
              "观察 → 理解 → 建议 → 用户确认 → 执行" 的原则，协助你整理与规范信息，
              而不会在未经确认的情况下修改你的数据。
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
