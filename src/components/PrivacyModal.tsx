import React, { useState } from 'react';
import { Modal } from './Modal';
import { useThemeStore } from '../stores/useThemeStore';
import { APP_NAME, APP_REPO_URL, APP_ISSUES_URL } from '../config/appInfo';

interface PrivacyModalProps {
  onClose: () => void;
}

const LINK_CLASS = 'text-accent-blue hover:text-accent-blue-hover hover:underline transition-all duration-standard ease-smooth';

/**
 * Privacy & Terms Modal
 * Displays Privacy Policy and Terms & Conditions in a modal format.
 */
export const PrivacyModal: React.FC<PrivacyModalProps> = ({ onClose }) => {
  const [selectedTab, setSelectedTab] = useState<'privacy' | 'terms'>('privacy');
  const mode = useThemeStore((s) => s.mode);
  const logoSrc = mode === 'dark' ? '/images/logos/lifeos-logo-white.svg' : '/images/logos/lifeos-logo.svg';

  return (
    <Modal
      isOpen={true}
      title="隐私与条款"
      onClose={onClose}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {/* Logo Header */}
        <div className="flex flex-col items-center gap-2">
          <div className="w-3/5 max-w-[240px] overflow-hidden">
            <img
              src={logoSrc}
              alt="LifeOS Logo"
              className="w-full h-auto object-contain"
            />
          </div>
          <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
            {APP_NAME}
          </span>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => setSelectedTab('privacy')}
            className={`px-2 sm:px-3 py-1.5 rounded-button text-xs sm:text-sm font-medium transition-all duration-standard ease-smooth ${
              selectedTab === 'privacy'
                ? 'bg-accent-blue text-white'
                : 'bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
            }`}
          >
            <span className="hidden sm:inline">隐私政策</span>
            <span className="sm:hidden">隐私</span>
          </button>
          <button
            onClick={() => setSelectedTab('terms')}
            className={`px-2 sm:px-3 py-1.5 rounded-button text-xs sm:text-sm font-medium transition-all duration-standard ease-smooth ${
              selectedTab === 'terms'
                ? 'bg-accent-primary text-white'
                : 'bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
            }`}
          >
            <span className="hidden sm:inline">条款与条件</span>
            <span className="sm:hidden">条款</span>
          </button>
        </div>

        {/* Content Title */}
        <div className="text-center">
          <h3 className="text-base sm:text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            {selectedTab === 'privacy' ? '隐私政策' : '条款与条件'}
          </h3>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
            {selectedTab === 'privacy' ? 'LifeOS 是一个无后端、零数据上传的本地应用' : '即将推出'}
          </p>
        </div>

        {/* Content Area */}
        <div className="prose prose-sm max-w-none dark:prose-invert max-h-[35vh] sm:max-h-[45vh] overflow-y-auto pr-2">
          {selectedTab === 'privacy' ? (
            <PrivacyContent />
          ) : (
            <TermsContent />
          )}
        </div>

        {/* Footer Links */}
        <div className="border-t border-border-light dark:border-border-dark pt-3 mt-4">
          <div className="flex flex-wrap gap-3 justify-center text-xs">
            <a
              href={APP_ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS}
            >
              问题反馈（GitHub Issues）
            </a>
            <a
              href={APP_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={LINK_CLASS}
            >
              源代码
            </a>
          </div>
        </div>
      </div>
    </Modal>
  );
};

/**
 * Privacy Policy Content Component
 */
const PrivacyContent: React.FC = () => (
  <div className="space-y-4 text-text-light-primary dark:text-text-dark-primary text-xs sm:text-sm">
    {/* TL;DR Section */}
    <section>
      <h4 className="text-sm font-semibold mb-1">TL;DR</h4>
      <div className="bg-accent-blue/10 border-l-4 border-accent-blue rounded-r p-2">
        <p className="text-xs">
          <strong>你的数据属于你。</strong>LifeOS 是一个完全运行在浏览器里的本地应用：
          没有账户、没有服务器、没有分析统计、没有遥测。你创建的所有内容都只保存在你自己的设备上。
        </p>
      </div>
    </section>

    {/* Local-First Philosophy */}
    <section>
      <h4 className="text-sm font-semibold mb-1">🔒 本地优先理念</h4>
      <p className="mb-1 text-xs">
        <strong>你的数据属于你。</strong>你在 LifeOS 中创建的所有内容都保存在你的设备上：
      </p>
      <ul className="list-disc ml-4 space-y-0.5 text-text-light-secondary dark:text-text-dark-secondary text-[10px]">
        <li>笔记、任务、日历事件、看板 - 全部存储在本地 IndexedDB 中</li>
        <li>无云存储、无服务器、无远程数据库</li>
        <li>备份保存到你的电脑（可选自动保存到你选择的文件夹）</li>
        <li>随时导出你的数据（.brain 文件格式）- 100% 归你所有</li>
      </ul>
    </section>

    {/* Zero Telemetry */}
    <section>
      <h4 className="text-sm font-semibold mb-1">📵 零遥测承诺</h4>
      <p className="mb-1 text-xs">LifeOS 不包含任何形式的统计或追踪：</p>
      <ul className="list-disc ml-4 space-y-0.5 text-text-light-secondary dark:text-text-dark-secondary text-[10px]">
        <li>无网站分析（无 Google Analytics，无 Cloudflare Analytics）</li>
        <li>无 Cookie 或追踪标识</li>
        <li>无崩溃上报、无使用埋点</li>
        <li>无广告网络、无会话录制</li>
        <li>应用不向任何服务器发送你的个人数据</li>
      </ul>
      <p className="mt-1 text-text-light-secondary dark:text-text-dark-secondary text-[10px]">
        唯一的例外是你主动启用的功能：例如天气组件会向你选择的公共服务（如 Open-Meteo）发起请求，
        AI 功能直接连接你自己配置的 AI 服务商。这些请求由你的浏览器直接发出，不经过 LifeOS 的任何中间服务器。
      </p>
    </section>

    {/* AI Keys */}
    <section>
      <h4 className="text-sm font-semibold mb-1">🔑 AI 密钥的处理</h4>
      <ul className="list-disc ml-4 space-y-0.5 text-text-light-secondary dark:text-text-dark-secondary text-[10px]">
        <li>API 密钥加密后仅存储在你的浏览器本地</li>
        <li>请求由浏览器直接发送给你选择的服务商（OpenAI、Anthropic、Ollama 等）</li>
        <li>LifeOS 没有服务器，因此永远看不到、存不到、也转不了你的对话内容</li>
      </ul>
    </section>

    {/* Your Rights */}
    <section>
      <h4 className="text-sm font-semibold mb-1">⚖️ 你的权利</h4>
      <ul className="list-disc ml-4 space-y-0.5 text-text-light-secondary dark:text-text-dark-secondary text-[10px]">
        <li><strong>导出数据：</strong>随时下载你的所有个人数据（设置 → 导出备份）</li>
        <li><strong>删除数据：</strong>清除浏览器存储（设置 → 清除所有数据）</li>
        <li><strong>审计源码：</strong>LifeOS 以 MIT 许可证开源，数据处理方式完全透明</li>
      </ul>
    </section>

    {/* Contact */}
    <section>
      <h4 className="text-sm font-semibold mb-1">📧 有问题？</h4>
      <p className="text-text-light-secondary dark:text-text-dark-secondary text-[10px]">
        对隐私有疑问？请前往{' '}
        <a href={APP_ISSUES_URL} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          GitHub Issues
        </a>{' '}
        提出问题，或前往设置页面查看数据导出/备份选项。
      </p>
    </section>
  </div>
);

/**
 * Terms & Conditions Content Component (Placeholder)
 */
const TermsContent: React.FC = () => (
  <div className="space-y-4 text-text-light-primary dark:text-text-dark-primary text-xs sm:text-sm">
    {/* Coming Soon Notice */}
    <section>
      <div className="bg-accent-primary/10 border-l-4 border-accent-primary rounded-r p-3">
        <h4 className="text-sm font-semibold mb-1">条款与条件</h4>
        <p className="text-text-light-secondary dark:text-text-dark-secondary text-xs">
          完整条款与许可信息目前正在起草中。
          本部分将很快更新，包含以下方面的完整详情：
        </p>
      </div>
    </section>

    {/* Upcoming Content */}
    <section>
      <h4 className="text-sm font-semibold mb-2">📋 你将看到的内容</h4>
      <ul className="list-disc ml-4 space-y-1 text-text-light-secondary dark:text-text-dark-secondary text-[10px]">
        <li><strong>使用条款：</strong>使用 LifeOS 的指南</li>
        <li><strong>许可：</strong>软件许可条款和开源声明（MIT License）</li>
        <li><strong>用户责任：</strong>你作为用户的权利和责任</li>
        <li><strong>免责声明：</strong>保修和责任信息</li>
        <li><strong>数据所有权：</strong>确认你的数据归你所有</li>
      </ul>
    </section>

    {/* Core Principles Preview */}
    <section>
      <h4 className="text-sm font-semibold mb-2">🎯 我们的指导原则</h4>
      <p className="mb-2 text-text-light-secondary dark:text-text-dark-secondary text-xs">
        在完整条款敲定之前，以下是指导这些条款的核心原则：
      </p>
      <div className="space-y-2">
        <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-2 border border-border-light dark:border-border-dark">
          <p className="text-xs font-medium">🔒 你的数据，你的掌控</p>
          <p className="text-[10px] text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
            所有数据都保存在你的设备上。LifeOS 没有服务器，无法访问、查看或出售你的信息。
          </p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-2 border border-border-light dark:border-border-dark">
          <p className="text-xs font-medium">📤 完全可移植性</p>
          <p className="text-[10px] text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
            随时以标准格式导出你的数据。绝无锁定。
          </p>
        </div>
        <div className="bg-surface-light dark:bg-surface-dark rounded-lg p-2 border border-border-light dark:border-border-dark">
          <p className="text-xs font-medium">🚫 无隐藏意图</p>
          <p className="text-[10px] text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
            无广告、无追踪、不把你的注意力卖给最高出价者。
          </p>
        </div>
      </div>
    </section>

    {/* Contact for Questions */}
    <section>
      <h4 className="text-sm font-semibold mb-1">📧 有问题？</h4>
      <p className="text-text-light-secondary dark:text-text-dark-secondary text-[10px]">
        对我们的条款或许可存有疑问？请前往{' '}
        <a href={APP_ISSUES_URL} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          GitHub Issues
        </a>
      </p>
    </section>
  </div>
);
