/**
 * OnboardingModal Component
 *
 * First-time user onboarding experience
 * - Step 1: Welcome screen with product intro and privacy statement
 * - Step 2: The core collect → plan → focus → review loop
 * - Step 3: Calm appearance and local backup setup
 * - Step 4: Completion with CTA to create first note/task
 */

import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';

// Lazy load SupportModal to prevent bundle bloat
const SupportModal = lazy(() => import('./SupportModal').then(m => ({ default: m.SupportModal })));
import { useSettingsStore } from '../stores/useSettingsStore';
import { useThemeStore } from '../stores/useThemeStore';
import { isFileSystemAccessSupported } from '../services/brainBackup';
import { BackupOnboardingModal } from './BackupOnboardingModal';
import {
  FileText,
  CheckSquare,
  Calendar,
  Shield,
  ArrowRight,
  ArrowLeft,
  X,
  Info,
  Wifi,
  Database,
  Zap,
  Heart,
  HelpCircle,
  Palette,
  Sun,
  Moon,
  Monitor,
  Check,
  Inbox,
  Bot,
} from 'lucide-react';
import { THEME_REGISTRY } from '../config/themes/registry';
import type { ColorMode } from '../types';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [showSkipOptions, setShowSkipOptions] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState<'in-7-days' | 'monthly' | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);

  const setOnboardingComplete = useSettingsStore((state) => state.setOnboardingComplete);
  const setDisplayNameInStore = useSettingsStore((state) => state.setDisplayName);
  const updateBackupPreferences = useThemeStore((state) => state.updateBackupPreferences);
  const mode = useThemeStore((s) => s.mode);
  const brandTheme = useThemeStore((s) => s.brandTheme);
  const colorMode = useThemeStore((s) => s.colorMode);
  const setBrandTheme = useThemeStore((s) => s.setBrandTheme);
  const setColorMode = useThemeStore((s) => s.setColorMode);
  const logoSrc = mode === 'dark' ? '/images/logos/lifeos-logo-white.svg' : '/images/logos/lifeos-logo.svg';

  // Keep first-run choice intentionally small; the full library lives in Settings.
  const themes = ['ink-wash', 'evergreen', 'monochrome'].map(
    (themeId) => THEME_REGISTRY[themeId as keyof typeof THEME_REGISTRY]
  );

  const isFSASupported = isFileSystemAccessSupported();

  const totalSteps = 4;

  /**
   * Handle skip tour - mark onboarding complete and close
   */
  const handleSkipTour = () => {
    setOnboardingComplete(true);
    onClose();
  };

  /**
   * Handle completion - save preferences and close
   */
  const handleComplete = () => {
    // Save display name if provided
    if (displayName.trim()) {
      setDisplayNameInStore(displayName.trim());
    }
    setOnboardingComplete(true);
    onClose();
  };

  /** Finish onboarding, then take the user to an existing creation flow. */
  const handleCompleteAndNavigate = (path: string) => {
    handleComplete();
    navigate(path);
  };

  /**
   * Navigate to next step
   */
  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  /**
   * Navigate to previous step
   */
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  /**
   * Open backup setup modal
   */
  const handleSetupBackup = () => {
    setShowBackupModal(true);
  };

  /**
   * Handle backup modal completion
   */
  const handleBackupComplete = () => {
    setShowBackupModal(false);
    handleComplete();
  };

  /**
   * Handle skip with reminder preference
   */
  const handleSkipWithReminder = () => {
    if (selectedReminder) {
      const nextReminderDate =
        selectedReminder === 'in-7-days'
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString();

      updateBackupPreferences({
        reminderPreference: selectedReminder,
        nextReminderDate,
      });
    }
    handleComplete();
  };

  /**
   * Handle skip forever (never remind)
   */
  const handleSkipForever = () => {
    updateBackupPreferences({
      reminderPreference: 'never',
      nextReminderDate: null,
    });
    handleComplete();
  };

  /**
   * Step 1: Welcome - Privacy and platform intro
   */
  const renderWelcomeStep = () => (
    <div className="space-y-4">
      {/* Tagline */}
      <p className="text-center text-lg text-text-light-secondary dark:text-text-dark-secondary italic">
        把零散的事收进来，把重要的事做下去。
      </p>

      {/* Core principles */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Shield className="h-6 w-6 text-accent-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
              100% 本地优先
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              核心数据保存在你的设备上，无需账户或 LifeOS 服务器。只有你主动导出，或启用 AI、天气等外部能力时，相关数据才会离开本机。
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Database className="h-6 w-6 text-accent-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
              你拥有自己的数据
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              随时导出所有内容。无订阅、无厂商锁定。从第一天起就内置完整的数据可移植性。
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Wifi className="h-6 w-6 text-accent-blue shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
              离线可用
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              任务、日程、项目、笔记和收藏无需联网即可使用；AI、天气等可选外部能力需要网络，并会在启用处明确说明。
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * Step 2: Explain one coherent workflow instead of listing every feature.
   */
  const renderFeaturesTourStep = () => (
    <div className="space-y-4">
      <p className="text-base leading-7 text-text-light-secondary dark:text-text-dark-secondary">
        不必一次学会所有功能。日常只要沿着这条路径走，其余工具需要时再展开。
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Inbox className="h-5 w-5 text-accent-primary" />
            <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
              1. 收集
            </h3>
          </div>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            想法和待办先放进首页快速记录或收件箱，不让它们占着脑子。
          </p>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-5 w-5 text-accent-primary" />
            <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
              2. 安排
            </h3>
          </div>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            在今天、任务和日程中确定时间与下一步，项目只保留清晰进度。
          </p>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckSquare className="h-5 w-5 text-accent-primary" />
            <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
              3. 专注
            </h3>
          </div>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            回到“今天”，一次推进一个真正重要的动作，完成后立即勾掉。
          </p>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-accent-primary" />
            <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
              4. 沉淀与回顾
            </h3>
          </div>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            用笔记保存经验，用回顾看清变化，让下一轮工作越来越顺。
          </p>
        </div>
      </div>

      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="h-5 w-5 text-accent-primary" />
          <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
            AI 是独立助手，不是到处弹出的面板
          </h3>
        </div>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          需要整理任务、日程或笔记时进入一级菜单“AI 指挥中心”；写操作都会先让你确认。
        </p>
      </div>
    </div>
  );

  /**
   * Step 3: Setup - Personalization options
   */
  const renderSetupStep = () => (
    <div className="space-y-4">
      {/* Theme picker */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Palette className="h-5 w-5 text-accent-primary" />
          <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
            选择你的外观
          </h3>
        </div>

        {/* Color mode toggle */}
        <div className="flex items-center gap-2 mb-3">
          {(
            [
              { id: 'light' as ColorMode, icon: Sun, label: '浅色' },
              { id: 'dark' as ColorMode, icon: Moon, label: '深色' },
              { id: 'system' as ColorMode, icon: Monitor, label: '系统' },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setColorMode(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors border ${
                colorMode === id
                  ? 'border-accent-primary bg-accent-primary/10 text-text-light-primary dark:text-text-dark-primary'
                  : 'border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:border-accent-primary/50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Theme cards — horizontal scroll */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setBrandTheme(theme.id)}
              className={`flex-shrink-0 w-20 rounded-lg border p-2 transition-all text-center ${
                brandTheme === theme.id
                  ? 'border-accent-primary ring-1 ring-accent-primary'
                  : 'border-border-light dark:border-border-dark hover:border-accent-primary/50'
              }`}
              aria-label={`选择${theme.name}主题`}
            >
              {/* Color swatches */}
              <div className="flex gap-1 justify-center mb-1.5">
                <div
                  className="w-4 h-4 rounded-full border border-border-light dark:border-border-dark"
                  style={{ backgroundColor: theme.preview.primary }}
                />
                <div
                  className="w-4 h-4 rounded-full border border-border-light dark:border-border-dark"
                  style={{ backgroundColor: theme.preview.secondary }}
                />
                <div
                  className="w-4 h-4 rounded-full border border-border-light dark:border-border-dark"
                  style={{ backgroundColor: theme.preview.accent }}
                />
              </div>
              {/* Theme name */}
              <span className="block truncate text-xs leading-tight text-text-light-primary dark:text-text-dark-primary">
                {theme.name}
              </span>
              {/* Active indicator */}
              {brandTheme === theme.id && (
                <Check className="h-3 w-3 text-accent-primary mx-auto mt-0.5" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Display name input */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4">
        <label
          htmlFor="display-name"
          className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2"
        >
          显示名称（可选）
        </label>
        <input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="输入你的名字"
          className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary placeholder:text-text-light-tertiary dark:placeholder:text-text-dark-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />
        <p className="mt-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
          仅供你自己使用 - 本地存储，绝不会共享
        </p>
      </div>

      {/* Backup info */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-accent-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
              保护你的数据安全
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-2">
              你的数据存储在浏览器中。定期备份可确保你永远不会丢失工作成果。
            </p>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              随时在 设置 → 备份 中设置自动备份
            </p>
          </div>
        </div>
      </div>

      {/* Quick tips */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-accent-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
              小贴士
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              随时按 <kbd className="px-1.5 py-0.5 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded text-xs font-mono">F1</kbd> 获取帮助。使用 <kbd className="px-1.5 py-0.5 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded text-xs font-mono">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded text-xs font-mono">B</kbd> 切换侧边栏。
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  /**
   * Step 4: Completion - Ready to start
   */
  const renderCompletionStep = () => (
    <div className="space-y-4">
      {/* Backup Section - Only show if FSA supported */}
      {isFSASupported && (
        <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4">
          <div className="flex items-start gap-3 mb-4">
            <Shield className="h-6 w-6 text-accent-primary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary mb-1">
                启用自动保存备份
              </h3>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                自动保存到你选择的本地文件夹；若该文件夹由同步软件管理，也可随你的选择同步。
              </p>
            </div>
          </div>

          <button
            onClick={handleSetupBackup}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover transition-colors font-medium"
          >
            <Shield className="h-4 w-4" />
            <span>立即设置自动保存</span>
          </button>

          {/* Skip Options */}
          {!showSkipOptions ? (
            <button
              onClick={() => setShowSkipOptions(true)}
              className="w-full mt-2 text-sm text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
            >
              以后再说…
            </button>
          ) : (
            <div className="mt-3 pt-3 border-t border-border-light dark:border-border-dark">
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-2">
                希望我们什么时候提醒你？
              </p>
              <div className="flex gap-2">
                {[
                  { id: 'in-7-days' as const, label: '7 天后' },
                  { id: 'monthly' as const, label: '每月' },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedReminder(option.id)}
                    className={`flex-1 p-2 text-center text-sm rounded border transition-all ${
                      selectedReminder === option.id
                        ? 'border-accent-primary bg-accent-primary/10 text-text-light-primary dark:text-text-dark-primary'
                        : 'border-border-light dark:border-border-dark hover:border-accent-primary/50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSkipWithReminder}
                  disabled={!selectedReminder}
                  className="flex-1 px-3 py-2 bg-accent-primary text-white rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  确认
                </button>
                <button
                  onClick={handleSkipForever}
                  className="px-3 py-2 text-sm text-text-light-secondary dark:text-text-dark-secondary hover:text-status-error transition-colors"
                >
                  永不提醒
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Non-FSA Browser Message */}
      {!isFSASupported && (
        <div className="bg-status-info/10 border border-status-info rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-status-info shrink-0 mt-0.5" />
            <p className="text-sm text-text-light-primary dark:text-text-dark-primary">
              <strong>注意：</strong>自动保存需要 Chrome、Edge 或 Brave 浏览器。
              你可以随时在设置中手动导出数据。
            </p>
          </div>
        </div>
      )}

      {/* Get Started Section */}
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-5">
        <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary text-center mb-4">
          准备好开始了吗？
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => handleCompleteAndNavigate('/notes')}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover transition-colors"
          >
            <FileText className="h-4 w-4" />
            <span className="font-medium">创建你的第一篇笔记</span>
          </button>

          <button
            onClick={() => handleCompleteAndNavigate('/tasks?tab=inbox')}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover transition-colors"
          >
            <CheckSquare className="h-4 w-4" />
            <span className="font-medium">创建你的第一个任务</span>
          </button>
        </div>

        <p className="text-xs text-center text-text-light-secondary dark:text-text-dark-secondary mt-4">
          所有功能都可以从侧边栏访问
        </p>
      </div>

      {/* Built with care message */}
      <div className="text-center pt-2">
        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary flex items-center justify-center gap-1">
          <Heart className="h-3 w-3 text-accent-primary" />
          用心打造：隐私、效率与开源
        </p>
      </div>

      {/* Backup Modal (inline) */}
      <BackupOnboardingModal
        isOpen={showBackupModal}
        onClose={handleBackupComplete}
      />
    </div>
  );

  /**
   * Render current step content
   */
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return renderWelcomeStep();
      case 2:
        return renderFeaturesTourStep();
      case 3:
        return renderSetupStep();
      case 4:
        return renderCompletionStep();
      default:
        return null;
    }
  };

  /**
   * Get step-specific subtitle text
   */
  const getStepSubtitle = () => {
    switch (currentStep) {
      case 1:
        return '你的隐私优先生产力平台';
      case 2:
        return '先收集，再安排；专注推进，定期回顾';
      case 3:
        return '个性化你的体验';
      case 4:
        return "一切就绪！";
      default:
        return '';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="欢迎使用 LifeOS" maxWidth="lg" hideHeader>
      <div className="flex flex-col">
        {/* Persistent Header: Logo + Title + Subtitle + Progress + Close */}
        <div className="flex-shrink-0 pb-4 border-b border-border-light dark:border-border-dark">
          {/* Close button - top right */}
          <div className="flex justify-end mb-2">
            <button
              onClick={handleSkipTour}
              className="p-1 text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Logo + Title + Subtitle */}
          <div className="text-center mb-4">
            <img
              src={logoSrc}
              alt="LifeOS"
              className="w-2/3 h-auto mx-auto mb-4"
            />
            <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
              欢迎使用 LifeOS
            </h2>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mt-1">
              {getStepSubtitle()}
            </p>
          </div>

          {/* Progress indicator - with visible border in both modes */}
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <div
                key={index}
                className={`h-2 w-10 rounded-full transition-colors border border-border-light dark:border-border-dark ${
                  index + 1 === currentStep
                    ? 'bg-accent-primary'
                    : index + 1 < currentStep
                    ? 'bg-accent-primary'
                    : 'bg-surface-light-elevated dark:bg-surface-dark-elevated'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Content - fixed height for consistent modal size (sized to fit page 4) */}
        <div className="py-5 min-h-[480px]">
          {renderStepContent()}
        </div>

        {/* Navigation Footer - fixed 3-column layout: Back/FAQ | Skip | Next */}
        <div className="flex-shrink-0 grid grid-cols-3 items-center pt-4 border-t border-border-light dark:border-border-dark">
          {/* Left column: FAQ button on step 1, Back button on other steps */}
          <div className="justify-self-start">
            {currentStep === 1 ? (
              <button
                onClick={() => setShowFaqModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
              >
                <HelpCircle className="h-4 w-4" />
                <span>常见问题</span>
              </button>
            ) : (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 px-4 py-2 text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>返回</span>
              </button>
            )}
          </div>

          {/* Skip tour - always centered */}
          <div className="justify-self-center">
            <button
              onClick={handleSkipTour}
              className="text-sm text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
            >
              跳过导览
            </button>
          </div>

          {/* Next button - always present, changes to "Done" on last step */}
          <div className="justify-self-end">
            <button
              onClick={currentStep < totalSteps ? handleNext : handleComplete}
              className="flex items-center gap-2 px-6 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover transition-colors"
            >
              <span>{currentStep < totalSteps ? '下一步' : '完成'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* FAQ Modal - opens to Help tab with FAQs */}
      {showFaqModal && (
        <Suspense fallback={null}>
          <SupportModal
            isOpen={showFaqModal}
            onClose={() => setShowFaqModal(false)}
            initialTab="help"
          />
        </Suspense>
      )}
    </Modal>
  );
}
