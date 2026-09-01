/**
 * Support Modal - Help & Support System
 * Provides issue reporting, help resources, and documentation access
 *
 * Features:
 * - Report Issue tab: Mailto integration with diagnostic report
 * - Get Help tab: Keyboard shortcuts, FAQs, system status
 * - Documentation tab: Version info, external links
 */

import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { getDiagnosticReport, formatDiagnosticReport, copyDiagnosticReportToClipboard, downloadDiagnosticReport, type DiagnosticReport } from '../utils/diagnostics';
import { logger } from '../services/logger';
import { Mail, HelpCircle, Book, Copy, Download, ChevronDown, ChevronRight, ExternalLink, Keyboard } from 'lucide-react';
import { BUILD_HASH, formatBuildTimestamp } from '../utils/buildInfo';
import { APP_ISSUES_URL, APP_REPO_URL } from '../config/appInfo';
import { useShortcutsStore } from '../stores/useShortcutsStore';
import { formatShortcut } from '../services/shortcuts';

const log = logger.module('SupportModal');

type TabType = 'report' | 'help' | 'docs';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Which tab to show when modal opens. Defaults to 'report'. */
  initialTab?: TabType;
}

interface FAQ {
  question: string;
  answer: string;
}

const GITHUB_ISSUES_URL = APP_ISSUES_URL;
const FAQS: FAQ[] = [
  // Getting Started
  {
    question: '我的数据存储在哪里？',
    answer: '你的所有数据都存储在浏览器的本地 IndexedDB 中。除非你明确导出，否则没有任何数据会离开你的设备。这意味着你的笔记、任务和设置保持私密，并且可以离线使用。',
  },
  {
    question: '如何备份我的数据？',
    answer: '进入 设置 → 备份与恢复，然后点击 “导出备份” 下载 LifeOS 备份文件。你可以在任何浏览器上点击 “导入备份” 来恢复该文件。如需自动备份，请设置自动保存到 Dropbox 或 Google Drive 等云文件夹。',
  },
  {
    question: '如果我清除浏览器数据会怎样？',
    answer: '清除浏览器数据会删除你本地存储的信息。在清除浏览器数据或更换浏览器之前，务必先导出备份。你可以随时从 LifeOS 备份文件恢复。',
  },
  // Notes
  {
    question: '如何将笔记导出为 Markdown？',
    answer: '打开笔记页面，点击页头中的导出按钮（或按 Cmd/Ctrl+Shift+E），然后选择导出范围并点击导出。你的笔记将以 .md 文件形式打包在 ZIP 压缩包中下载。',
  },
  {
    question: '什么是 wiki 链接，如何使用它们？',
    answer: 'Wiki 链接是使用 [[笔记标题]] 语法在笔记之间建立的连接。在笔记编辑器中输入 [[ 即可看到所有笔记的列表。点击 wiki 链接即可跳转到该笔记。使用图谱视图可以可视化笔记之间的所有连接。',
  },
  {
    question: '我可以把笔记整理到文件夹中吗？',
    answer: '可以！笔记可以整理到文件夹中。点击笔记侧边栏中的文件夹图标即可创建文件夹。你还可以使用标签进行跨维度整理——为任何笔记添加标签并按标签筛选。',
  },
  // Tasks
  {
    question: '如何创建重复任务？',
    answer: '创建或编辑任务，然后滚动到“重复”部分。选择你的重复模式（每天、每周、每月、每年或自定义），设置间隔，并可选设置结束日期。',
  },
  {
    question: '什么是看板？',
    answer: '看板按列显示任务（待办、进行中、已完成）。在列之间拖动任务即可更新其状态。你还可以创建自定义列，并按项目、优先级或标签筛选。',
  },
  {
    question: '任务依赖是如何工作的？',
    answer: '编辑任务时，你可以添加依赖项——必须在此任务之前完成的任务。关键路径功能（在任务视图中切换）会高亮显示哪些任务正在阻塞其他任务。',
  },
  // Dashboard & Widgets
  {
    question: '如何自定义首页组件？',
    answer: '打开侧边栏中的首页，然后点击首页导航项的设置按钮。你可以切换扩展组件、拖动排序，并打开单个组件的设置。',
  },
  {
    question: '有哪些组件可用？',
    answer: '超过 44 个组件，包括：天气、新闻源、计算器、世界时钟、番茄钟、快速笔记、日历、任务摘要、时间追踪统计、书签等。还会定期添加新组件。',
  },
  // Time Tracking & Calendar
  {
    question: '时间追踪是如何工作的？',
    answer: '在侧边栏进入时间追踪。开始工作时启动计时器，将其分配到项目，完成后停止。查看日/周统计、生成报告，并可导出为 CSV 用于开票。',
  },
  {
    question: '我可以导入日历事件吗？',
    answer: '可以！日历页面支持导入 ICS 文件。点击导入按钮并选择你的 .ics 文件。你还可以将事件导出为 ICS 格式，以便在其他日历应用中使用。',
  },
  // Shortcuts & Tips
  {
    question: '有哪些键盘快捷键？',
    answer: '按 F1 或 Ctrl+/ 打开帮助。在笔记页面，按 Ctrl+K 聚焦搜索。在笔记编辑器中，Ctrl+B 加粗、Ctrl+I 斜体、Ctrl+Shift+E 导出、输入 / 使用斜杠命令。Ctrl+B 切换侧边栏，Ctrl+D 创建每日笔记。',
  },
  {
    question: '如何在笔记中使用斜杠命令？',
    answer: '在笔记编辑器中输入“/”即可看到可用命令：/heading、/bullet、/checkbox、/code、/quote、/divider 等。这是格式化笔记的最快方式。',
  },
];

/**
 * Keyboard Shortcuts Section - displays all registered shortcuts from the shortcuts store
 */
function KeyboardShortcutsSection() {
  const shortcuts = useShortcutsStore((s) => s.getAllShortcuts());

  // Group shortcuts by context
  const groupedShortcuts = shortcuts.reduce(
    (acc, shortcut) => {
      const context = shortcut.context || 'global';
      if (!acc[context]) acc[context] = [];
      acc[context].push(shortcut);
      return acc;
    },
    {} as Record<string, typeof shortcuts>
  );

  const contextLabels: Record<string, string> = {
    global: '全局',
    kanban: '任务/看板',
    notes: '笔记',
    calendar: '日历',
    diagram: '绘图',
    modal: '弹窗',
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Keyboard className="w-4 h-4 text-accent-blue" />
        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
          键盘快捷键
        </h3>
      </div>

      <div className="space-y-4">
        {Object.entries(groupedShortcuts).map(([context, contextShortcuts]) => (
          <div key={context}>
            <h4 className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2 uppercase tracking-wide">
              {contextLabels[context] || context}
            </h4>
            <div className="bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg border border-border-light dark:border-border-dark overflow-hidden">
              {contextShortcuts.map((shortcut, index) => (
                <div
                  key={shortcut.id}
                  className={`flex items-center justify-between px-3 py-2 ${
                    index !== contextShortcuts.length - 1
                      ? 'border-b border-border-light dark:border-border-dark'
                      : ''
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                      {shortcut.label}
                    </span>
                    {shortcut.description && (
                      <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                        {shortcut.description}
                      </span>
                    )}
                  </div>
                  <kbd className="px-2 py-1 text-xs font-mono bg-surface-light-elevated dark:bg-surface-dark-elevated rounded border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary">
                    {formatShortcut(shortcut.keys)}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}

        {shortcuts.length === 0 && (
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary italic">
            尚未注册任何快捷键。随着你使用应用，快捷键会显示在这里。
          </p>
        )}
      </div>

      {/* Editor shortcuts (hardcoded since they're from Lexical) */}
      <div className="mt-4">
        <h4 className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2 uppercase tracking-wide">
          笔记编辑器
        </h4>
        <div className="bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg border border-border-light dark:border-border-dark overflow-hidden">
          {[
            { keys: ['mod', 'b'], label: '加粗' },
            { keys: ['mod', 'i'], label: '斜体' },
            { keys: ['mod', 'u'], label: '下划线' },
            { keys: ['mod', 'shift', 'e'], label: '导出笔记' },
            { keys: ['/'], label: '斜杠命令菜单' },
            { keys: ['[['], label: 'Wiki 链接自动补全' },
          ].map((shortcut, index, arr) => (
            <div
              key={shortcut.label}
              className={`flex items-center justify-between px-3 py-2 ${
                index !== arr.length - 1 ? 'border-b border-border-light dark:border-border-dark' : ''
              }`}
            >
              <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                {shortcut.label}
              </span>
              <kbd className="px-2 py-1 text-xs font-mono bg-surface-light-elevated dark:bg-surface-dark-elevated rounded border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary">
                {formatShortcut(shortcut.keys)}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SupportModal({ isOpen, onClose, initialTab = 'report' }: SupportModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [issueType, setIssueType] = useState<string>('bug');
  const [description, setDescription] = useState<string>('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState<boolean>(true);
  const [diagnosticReport, setDiagnosticReport] = useState<DiagnosticReport | null>(null);
  const [showDiagnosticPreview, setShowDiagnosticPreview] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);

  // Generate diagnostic report when modal opens or when tab changes to report
  useEffect(() => {
    if (isOpen && activeTab === 'report' && !diagnosticReport) {
      generateDiagnosticReport();
    }
  }, [isOpen, activeTab]);

  const generateDiagnosticReport = async () => {
    try {
      setIsGeneratingReport(true);
      const report = await getDiagnosticReport();
      setDiagnosticReport(report);
      log.info('Diagnostic report generated for support modal');
    } catch (error) {
      log.error('Failed to generate diagnostic report', { error });
      setMessage({ type: 'error', text: '生成诊断报告失败' });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleSendEmail = () => {
    if (!description.trim()) {
      setMessage({ type: 'error', text: '请提供问题的描述' });
      return;
    }

    try {
      // LifeOS: reports go to the LifeOS GitHub repository as a new issue
      const title = encodeURIComponent(`[${issueType}] - LifeOS 问题反馈`);

      let bodyText = `问题类型：${issueType}\n`;
      bodyText += `构建：${BUILD_HASH}（${formatBuildTimestamp()}）\n\n`;
      bodyText += `描述：\n${description}\n\n`;

      if (includeDiagnostics && diagnosticReport) {
        bodyText += '---\n诊断报告：\n\n';
        bodyText += formatDiagnosticReport(diagnosticReport);
      }

      const body = encodeURIComponent(bodyText);

      window.open(`${GITHUB_ISSUES_URL}/new?title=${title}&body=${body}`, '_blank', 'noopener,noreferrer');
      setMessage({ type: 'success', text: '已打开 GitHub Issues。请确认并提交以完成你的报告。' });
      log.info('GitHub issue form opened for support request', { issueType, includeDiagnostics });
    } catch (error) {
      log.error('Failed to open GitHub issues', { error });
      setMessage({ type: 'error', text: '打开 GitHub 失败。请手动复制诊断报告。' });
    }
  };

  const handleCopyDiagnosticReport = async () => {
    if (!diagnosticReport) {
      setMessage({ type: 'error', text: '没有可用的诊断报告' });
      return;
    }

    try {
      await copyDiagnosticReportToClipboard(diagnosticReport);
      setMessage({ type: 'success', text: '诊断报告已复制到剪贴板' });
    } catch (error) {
      log.error('Failed to copy diagnostic report', { error });
      setMessage({ type: 'error', text: '复制到剪贴板失败' });
    }
  };

  const handleDownloadDiagnosticReport = () => {
    if (!diagnosticReport) {
      setMessage({ type: 'error', text: '没有可用的诊断报告' });
      return;
    }

    try {
      downloadDiagnosticReport(diagnosticReport);
      setMessage({ type: 'success', text: '诊断报告已下载' });
    } catch (error) {
      log.error('Failed to download diagnostic report', { error });
      setMessage({ type: 'error', text: '下载报告失败' });
    }
  };

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  // Reset state when modal closes, set initial tab when it opens
  useEffect(() => {
    if (!isOpen) {
      setMessage(null);
      setDescription('');
      setIssueType('bug');
      setIncludeDiagnostics(true);
      setExpandedFaq(null);
    } else {
      // Set the active tab to initialTab when modal opens
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Auto-dismiss success messages
  useEffect(() => {
    if (message?.type === 'success') {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="帮助与支持" maxWidth="2xl">
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border-light dark:border-border-dark">
        <button
          onClick={() => setActiveTab('report')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'report'
              ? 'text-accent-primary border-b-2 border-accent-primary'
              : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            <span>报告问题</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('help')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'help'
              ? 'text-accent-primary border-b-2 border-accent-primary'
              : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            <span>获取帮助</span>
          </div>
        </button>

        <button
          onClick={() => setActiveTab('docs')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'docs'
              ? 'text-accent-blue border-b-2 border-accent-blue'
              : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            <Book className="w-4 h-4" />
            <span>文档</span>
          </div>
        </button>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-status-success-bg dark:bg-status-success-bg-dark text-status-success-text dark:text-status-success-text-dark border border-status-success-border dark:border-status-success-border-dark'
              : message.type === 'error'
              ? 'bg-status-error-bg dark:bg-status-error-bg-dark text-status-error-text dark:text-status-error-text-dark border border-status-error-border dark:border-status-error-border-dark'
              : 'bg-status-info-bg dark:bg-status-info-bg-dark text-status-info-text dark:text-status-info-text-dark border border-status-info-border dark:border-status-info-border-dark'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'report' && (
        <div className="space-y-4">
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            遇到问题？请向我们发送诊断报告，帮助我们排查问题。
          </p>

          {/* Issue Type */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              问题类型
            </label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <option value="bug">错误报告</option>
              <option value="feature">功能请求</option>
              <option value="performance">性能问题</option>
              <option value="data-loss">数据丢失/损坏</option>
              <option value="ui-feedback">界面/体验反馈</option>
              <option value="other">其他</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              描述 <span className="text-status-error">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="请描述你遇到的问题…"
              rows={6}
              className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
            />
          </div>

          {/* Include Diagnostic Report */}
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="include-diagnostics"
              checked={includeDiagnostics}
              onChange={(e) => setIncludeDiagnostics(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-border-light dark:border-border-dark"
            />
            <div className="flex-1">
              <label htmlFor="include-diagnostics" className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary cursor-pointer">
                包含诊断报告（推荐）
              </label>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                提供系统信息、存储统计和错误日志，帮助我们排查问题。不包含任何个人数据。
              </p>
            </div>
          </div>

          {/* Diagnostic Preview */}
          {includeDiagnostics && diagnosticReport && (
            <div>
              <button
                onClick={() => setShowDiagnosticPreview(!showDiagnosticPreview)}
                className="flex items-center gap-2 text-sm font-medium text-accent-primary hover:text-accent-primary-hover transition-colors"
              >
                {showDiagnosticPreview ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <span>预览诊断报告</span>
              </button>

              {showDiagnosticPreview && (
                <div className="mt-2 p-3 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg border border-border-light dark:border-border-dark">
                  <pre className="text-xs font-mono text-text-light-secondary dark:text-text-dark-secondary whitespace-pre-wrap overflow-auto max-h-64">
                    {formatDiagnosticReport(diagnosticReport)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-border-light dark:border-border-dark">
            <button
              onClick={handleSendEmail}
              disabled={isGeneratingReport}
              className="flex-1 px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                <span>打开邮件客户端</span>
              </div>
            </button>

            <button
              onClick={handleCopyDiagnosticReport}
              disabled={!diagnosticReport || isGeneratingReport}
              className="px-4 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark text-text-light-primary dark:text-text-dark-primary rounded-lg font-medium transition-colors border border-border-light dark:border-border-dark disabled:opacity-50 disabled:cursor-not-allowed"
              title="复制诊断报告到剪贴板"
              aria-label="复制诊断报告到剪贴板"
            >
              <Copy className="w-4 h-4" />
            </button>

            <button
              onClick={handleDownloadDiagnosticReport}
              disabled={!diagnosticReport || isGeneratingReport}
              className="px-4 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark text-text-light-primary dark:text-text-dark-primary rounded-lg font-medium transition-colors border border-border-light dark:border-border-dark disabled:opacity-50 disabled:cursor-not-allowed"
              title="下载诊断报告"
              aria-label="下载诊断报告"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'help' && (
        <div className="space-y-6">
          {/* Keyboard Shortcuts */}
          <KeyboardShortcutsSection />

          {/* FAQs */}
          <div>
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
              常见问题
            </h3>
            <div className="space-y-2">
              {FAQS.map((faq, index) => (
                <div
                  key={index}
                  className="border border-border-light dark:border-border-dark rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-4 py-3 bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark text-left flex items-center justify-between gap-2 transition-colors"
                  >
                    <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                      {faq.question}
                    </span>
                    {expandedFaq === index ? (
                      <ChevronDown className="w-4 h-4 text-text-light-secondary dark:text-text-dark-secondary shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-text-light-secondary dark:text-text-dark-secondary shrink-0" />
                    )}
                  </button>

                  {expandedFaq === index && (
                    <div className="px-4 py-3 bg-surface-light dark:bg-surface-dark border-t border-border-light dark:border-border-dark">
                      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'docs' && (
        <div className="space-y-6">
          {/* Build Info */}
          <div>
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
              构建信息
            </h3>
            <div className="p-4 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg border border-border-light dark:border-border-dark">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-light-secondary dark:text-text-dark-secondary">当前构建：</span>
                  <span className="font-mono text-text-light-primary dark:text-text-dark-primary">{BUILD_HASH}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-light-secondary dark:text-text-dark-secondary">构建日期：</span>
                  <span className="text-text-light-primary dark:text-text-dark-primary">{formatBuildTimestamp()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* External Links */}
          <div>
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
              外部文档
            </h3>
            <div className="space-y-2">
              <a
                href={APP_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark rounded-lg border border-border-light dark:border-border-dark transition-colors group"
              >
                <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                  GitHub 仓库
                </span>
                <ExternalLink className="w-4 h-4 text-text-light-secondary dark:text-text-dark-secondary group-hover:text-text-light-primary dark:group-hover:text-text-dark-primary transition-colors" />
              </a>

              <a
                href={`${APP_REPO_URL}#readme`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark rounded-lg border border-border-light dark:border-border-dark transition-colors group"
              >
                <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                  用户手册（README）
                </span>
                <ExternalLink className="w-4 h-4 text-text-light-secondary dark:text-text-dark-secondary group-hover:text-text-light-primary dark:group-hover:text-text-dark-primary transition-colors" />
              </a>

              <a
                href={APP_ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark rounded-lg border border-border-light dark:border-border-dark transition-colors group"
              >
                <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                  问题追踪
                </span>
                <ExternalLink className="w-4 h-4 text-text-light-secondary dark:text-text-dark-secondary group-hover:text-text-light-primary dark:group-hover:text-text-dark-primary transition-colors" />
              </a>
            </div>
          </div>

          {/* Privacy & License */}
          <div>
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
              隐私与许可
            </h3>
            <div className="p-4 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg border border-border-light dark:border-border-dark">
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
                    隐私政策
                  </div>
                  <p className="text-text-light-secondary dark:text-text-dark-secondary">
                    核心数据存储在浏览器本地，无遥测、无行为分析。AI、天气等外部服务只会在你主动启用时联网。
                  </p>
                </div>
                <div>
                  <div className="font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
                    许可
                  </div>
                  <p className="text-text-light-secondary dark:text-text-dark-secondary">
                    MIT 许可 - 免费开源软件
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
