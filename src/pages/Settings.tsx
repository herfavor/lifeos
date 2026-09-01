import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import {
  Settings as SettingsIcon,
  Clock,
  CheckSquare,
  CalendarDays,
  HardDrive,
  Bot,
  Sliders,
  ChevronRight,
  FolderTree,
  Palette,
  Bell,
  Database,
  Keyboard,
  Info,
  PenTool,
  ChevronDown,
  Code,
  Search,
  RotateCcw,
  AlertTriangle,
  Lock,
  Tag,
} from 'lucide-react';
import {
  exportBrainFile,
  importBrainFile,
  validateBrainFile,
  formatFileSize,
} from '../services/brainBackup';
import {
  loadPreferences,
  getBackupHistory,
  shouldShowBackupReminder,
  getTimeSinceLastBackup,
  addHistoryEntry,
  resetPreferencesToDefaults,
  type BackupPreferences,
  type BackupHistoryEntry,
} from '../services/backupPreferences';
import { PageContent } from '../components/PageContent';
import { indexedDBService } from '../services/indexedDB';
import { exportToICS, importFromICS, downloadICS, readICSFile } from '../services/icsImportExport';
import { requestNotificationPermission } from '../services/eventReminders';
import { useCalendarStore } from '../stores/useCalendarStore';
import { BackupSettings } from '../components/BackupSettings';
import { PresetManager } from '../components/PresetManager';
import { logger } from '../services/logger';
import { DailyNotesSettings } from '../widgets/Settings/DailyNotesSettings';
import { TemplateSettings } from '../widgets/Settings/TemplateSettings';
import { AboutSettings } from '../widgets/Settings/AboutSettings';
import { AccountSettings } from '../widgets/Settings/AccountSettings';
import { SiteWideSettings } from '../widgets/Settings/SiteWideSettings';
import { ThemeSettings } from '../widgets/Settings/ThemeSettings';
import { TaskManagementSettings } from '../widgets/Settings/TaskManagementSettings';
import { QuickActionsSection } from '../widgets/Settings/QuickActionsSection';
import { AutoSaveSettings } from '../widgets/Settings/AutoSaveSettings';
import { BackupHistorySection } from '../widgets/Settings/BackupHistorySection';
import { BackupOptionsSection } from '../widgets/Settings/BackupOptionsSection';
import { TimeTrackingPanelSettings } from '../widgets/Settings/TimeTrackingPanelSettings';
import CustomFieldsSettings from '../components/CustomFieldsSettings';
import { AutoTrackingSettings } from '../components/AutoTrackingSettings';
import { AITerminalSettingsSection } from '../widgets/Settings/AITerminalSettingsSection';
import { StorageInfoSection } from '../widgets/Settings/StorageInfoSection';
import { DashboardSettingsSection } from '../widgets/Settings/DashboardSettingsSection';
import { CalendarNotificationsSection } from '../widgets/Settings/CalendarNotificationsSection';
import { CalendarImportExportSection } from '../widgets/Settings/CalendarImportExportSection';
import { CalendarManagementSection } from '../widgets/Settings/CalendarManagementSection';
import { ProjectSettings } from '../widgets/Settings/ProjectSettings';
import { DataManagementSection } from '../widgets/Settings/DataManagementSection';
import { KeyboardShortcutsSection } from '../widgets/Settings/KeyboardShortcutsSection';
import { AccentColorSection, resetAccentColor } from '../widgets/Settings/AccentColorSection';
import { NotificationPreferencesSection } from '../widgets/Settings/NotificationPreferencesSection';
import { DefaultViewsSection } from '../widgets/Settings/DefaultViewsSection';
import { AppPreferencesSection } from '../widgets/Settings/AppPreferencesSection';
import { SavedLayoutsSection } from '../widgets/Settings/SavedLayoutsSection';
import { ImportExportPanel } from '../components/settings/ImportExportPanel';
import { CustomCSSEditor } from '../components/settings/CustomCSSEditor';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useThemeStore } from '../stores/useThemeStore';
import { useWidgetStore } from '../stores/useWidgetStore';
import { useCustomCSSStore } from '../stores/useCustomCSSStore';
import { useNotificationStore } from '../stores/useNotificationStore';
import { useTimeTrackingPanelStore } from '../stores/useTimeTrackingPanelStore';
import { useKeyboardShortcutsStore } from '../stores/useKeyboardShortcutsStore';
import { useTerminalStore } from '../stores/useTerminalStore';

const log = logger.module('Settings');

/**
 * Settings Tab Configuration
 */
const SETTINGS_TABS = [
  { id: 'general', label: '个人与应用', icon: SettingsIcon, group: '基础' },
  { id: 'appearance', label: '外观', icon: Palette, group: '基础' },
  { id: 'workspace', label: '工作区', icon: FolderTree, group: '工作区' },
  { id: 'notifications', label: '通知', icon: Bell, group: '工作区' },
  { id: 'ai', label: 'AI 提供商', icon: Bot, group: '数据与连接' },
  { id: 'data', label: '导入与导出', icon: Database, group: '数据与连接' },
  { id: 'backup', label: '备份', icon: HardDrive, group: '数据与连接' },
  { id: 'system', label: '系统与关于', icon: Sliders, group: '系统' },
] as const;

type SettingsTabId = (typeof SETTINGS_TABS)[number]['id'];
type WorkspaceSectionId = 'editor' | 'tasks' | 'projects' | 'calendar' | 'time';
type SystemSectionId = 'shortcuts' | 'advanced' | 'about';

const WORKSPACE_SECTIONS: Array<{ id: WorkspaceSectionId; label: string; icon: typeof PenTool }> = [
  { id: 'editor', label: '笔记与模板', icon: PenTool },
  { id: 'tasks', label: '任务', icon: CheckSquare },
  { id: 'projects', label: '项目', icon: FolderTree },
  { id: 'calendar', label: '日历与事件', icon: CalendarDays },
  { id: 'time', label: '时间跟踪', icon: Clock },
];

const SYSTEM_SECTIONS: Array<{ id: SystemSectionId; label: string; icon: typeof Keyboard }> = [
  { id: 'shortcuts', label: '键盘快捷键', icon: Keyboard },
  { id: 'advanced', label: '高级', icon: Sliders },
  { id: 'about', label: '关于', icon: Info },
];

const LEGACY_SETTINGS_ROUTES: Record<string, { tab: SettingsTabId; section?: WorkspaceSectionId | SystemSectionId }> = {
  notes: { tab: 'workspace', section: 'editor' },
  editor: { tab: 'workspace', section: 'editor' },
  tasks: { tab: 'workspace', section: 'tasks' },
  projects: { tab: 'workspace', section: 'projects' },
  calendar: { tab: 'workspace', section: 'calendar' },
  time: { tab: 'workspace', section: 'time' },
  shortcuts: { tab: 'system', section: 'shortcuts' },
  advanced: { tab: 'system', section: 'advanced' },
  about: { tab: 'system', section: 'about' },
};

interface SettingsSearchEntry {
  label: string;
  keywords: string;
  tab: SettingsTabId;
  section?: WorkspaceSectionId | SystemSectionId;
}

const SETTINGS_SEARCH_ENTRIES: SettingsSearchEntry[] = [
  { label: '个人资料与应用偏好', keywords: '本机 名称 语言 默认视图 首页 组件 布局', tab: 'general' as SettingsTabId },
  { label: '主题、强调色与自定义 CSS', keywords: '深色 浅色 字号 外观', tab: 'appearance' as SettingsTabId },
  ...WORKSPACE_SECTIONS.map((section) => ({ label: section.label, keywords: section.label, tab: 'workspace' as SettingsTabId, section: section.id })),
  { label: '浏览器通知与日历提醒', keywords: '权限 提醒 通知', tab: 'notifications' as SettingsTabId },
  { label: 'AI 提供商与本地密钥', keywords: '模型 API key 上下文', tab: 'ai' as SettingsTabId },
  { label: '导入、导出与本地存储', keywords: 'Markdown Notion ICS 数据 迁移', tab: 'data' as SettingsTabId },
  { label: '备份、恢复与自动保存', keywords: '备份 历史 文件夹', tab: 'backup' as SettingsTabId },
  ...SYSTEM_SECTIONS.map((section) => ({ label: section.label, keywords: section.label, tab: 'system' as SettingsTabId, section: section.id })),
];

const SETTINGS_DESCRIPTIONS: Record<SettingsTabId, string> = {
  general: '控制仅存于本机的个人资料、应用偏好与首页默认行为。',
  appearance: '调整主题、强调色与显示方式，不改变任何内容数据。',
  workspace: '管理笔记、任务、项目、日历与时间跟踪的默认行为。',
  notifications: '控制仅在浏览器允许且 LifeOS 打开时触发的本机提醒。',
  ai: '配置可选 AI 服务商；测试连接会向所选服务商发起网络请求。',
  data: '处理模块级导入、导出与本地存储，不等同于完整备份。',
  backup: '创建或恢复完整 LifeOS 备份，并管理本机自动保存。',
  system: '管理快捷键、高级字段与版本信息。',
};

/**
 * Collapsible Advanced Customization section for the Appearance tab.
 */
const AdvancedCustomizationSection: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bento-card overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-6 text-left hover:bg-surface-light-elevated/50 dark:hover:bg-surface-dark-elevated/50 transition-colors"
      >
        <Code className="w-5 h-5 text-accent-primary" />
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            高级自定义
          </h2>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
            为高级用户注入自定义 CSS
          </p>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-text-light-tertiary dark:text-text-dark-tertiary transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6">
              <CustomCSSEditor />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Settings Page - Modern Tab-Based Layout
 * Local-first privacy with comprehensive settings management
 */
export const Settings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const legacyRoute = requestedTab ? LEGACY_SETTINGS_ROUTES[requestedTab] : undefined;
  const currentTab: SettingsTabId = SETTINGS_TABS.some((tab) => tab.id === requestedTab)
    ? requestedTab as SettingsTabId
    : legacyRoute?.tab ?? 'general';
  const requestedSection = searchParams.get('section');
  const workspaceSection: WorkspaceSectionId = WORKSPACE_SECTIONS.some((section) => section.id === requestedSection)
    ? requestedSection as WorkspaceSectionId
    : legacyRoute?.tab === 'workspace' && legacyRoute.section
      ? legacyRoute.section as WorkspaceSectionId
      : 'editor';
  const systemSection: SystemSectionId = SYSTEM_SECTIONS.some((section) => section.id === requestedSection)
    ? requestedSection as SystemSectionId
    : legacyRoute?.tab === 'system' && legacyRoute.section
      ? legacyRoute.section as SystemSectionId
      : 'shortcuts';
  const [settingsSearch, setSettingsSearch] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetRevision, setResetRevision] = useState(0);

  // State management
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning'; text: string } | null>(null);

  // Preferences
  const [preferences, setPreferences] = useState<BackupPreferences | null>(null);
  const [backupHistory, setBackupHistory] = useState<BackupHistoryEntry[]>([]);
  const [timeSinceLastBackup, setTimeSinceLastBackup] = useState<string | null>(null);
  const [backupReminder, setBackupReminder] = useState<{ show: boolean; daysSinceLastBackup?: number; message?: string } | null>(null);

  // Storage Info
  const [storageInfo, setStorageInfo] = useState<{
    usageFormatted: string;
    availableFormatted: string;
    quotaFormatted: string;
    percentUsed: number;
  } | null>(null);

  // New Browser Warning
  const [showNewBrowserWarning, setShowNewBrowserWarning] = useState(false);

  // Dashboard Settings modal
  const [showPresetManager, setShowPresetManager] = useState(false);

  // Calendar Import/Export
  const [isExportingCalendar, setIsExportingCalendar] = useState(false);
  const [isImportingCalendar, setIsImportingCalendar] = useState(false);
  const events = useCalendarStore((s) => s.events);
  const importEvents = useCalendarStore((s) => s.importEvents);

  // Notification Permission
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [requestingPermission, setRequestingPermission] = useState(false);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    // Load preferences
    const prefs = await loadPreferences();
    setPreferences(prefs);

    // Load backup history
    const history = await getBackupHistory();
    setBackupHistory(history);

    // Get time since last backup
    const timeSince = await getTimeSinceLastBackup();
    setTimeSinceLastBackup(timeSince);

    // Check backup reminder
    const reminder = await shouldShowBackupReminder();
    setBackupReminder(reminder);

    // Load storage quota info
    try {
      const quota = await indexedDBService.getQuota();
      setStorageInfo(quota);

      // Check if this is a new browser (no data in IndexedDB)
      const keys = await indexedDBService.getAllKeys();
      const hasAnyData = keys.length > 0;

      // Show new browser warning if no data AND not dismissed
      const dismissed = localStorage.getItem('new-browser-warning-dismissed');
      if (!hasAnyData && !dismissed) {
        setShowNewBrowserWarning(true);
      }
    } catch (error) {
      log.error('Failed to load storage info', { error });
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    document.title = '设置 - LifeOS';
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (legacyRoute) {
      setSearchParams({
        tab: legacyRoute.tab,
        ...(legacyRoute.section ? { section: legacyRoute.section } : {}),
      }, { replace: true });
    } else if (requestedTab && !SETTINGS_TABS.some((tab) => tab.id === requestedTab)) {
      setSearchParams({ tab: 'general' }, { replace: true });
    }
  }, [legacyRoute, requestedTab, setSearchParams]);

  // Handle tab change
  const setTab = (tabId: SettingsTabId) => {
    setSearchParams({ tab: tabId });
  };

  const setWorkspaceSection = (section: WorkspaceSectionId) => {
    setSearchParams({ tab: 'workspace', section });
  };

  const setSystemSection = (section: SystemSectionId) => {
    setSearchParams({ tab: 'system', section });
  };

  // A settings category is a new reading context. Reset only this page's
  // scroll position so the selected panel is immediately visible.
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [currentTab, workspaceSection, systemSection]);

  const matchingSettings = settingsSearch.trim()
    ? SETTINGS_SEARCH_ENTRIES.filter((entry) => {
        const query = settingsSearch.trim().toLocaleLowerCase();
        return `${entry.label} ${entry.keywords}`.toLocaleLowerCase().includes(query);
      }).slice(0, 8)
    : [];

  const resetTarget = currentTab === 'workspace'
    ? WORKSPACE_SECTIONS.find((section) => section.id === workspaceSection)?.label ?? '工作区'
    : currentTab === 'system'
      ? SYSTEM_SECTIONS.find((section) => section.id === systemSection)?.label ?? '系统'
      : SETTINGS_TABS.find((tab) => tab.id === currentTab)?.label ?? '当前分类';
  const resetAvailable = currentTab !== 'data' &&
    !(currentTab === 'workspace' && (workspaceSection === 'projects' || workspaceSection === 'calendar')) &&
    !(currentTab === 'system' && systemSection !== 'shortcuts');
  const resetUnavailableReason = currentTab === 'data'
    ? '此分类仅包含数据操作，没有可恢复的偏好'
    : currentTab === 'workspace'
      ? '项目和日历条目属于用户数据，不会通过设置重置'
      : '此区域不包含可安全重置的偏好';

  const handleResetCurrentCategory = async () => {
    try {
      if (currentTab === 'general') {
        useSettingsStore.getState().resetGeneralPreferences();
        useWidgetStore.setState({ enabledWidgets: [], widgetSizes: {} });
        localStorage.removeItem('dashboard-background');
      } else if (currentTab === 'appearance') {
        useThemeStore.getState().setColorMode('system');
        useThemeStore.getState().setBrandTheme('ink-wash');
        useCustomCSSStore.getState().resetCSS();
        resetAccentColor();
      } else if (currentTab === 'workspace' && (workspaceSection === 'editor' || workspaceSection === 'tasks' || workspaceSection === 'time')) {
        useSettingsStore.getState().resetWorkspacePreferences(workspaceSection);
        if (workspaceSection === 'time') useTimeTrackingPanelStore.getState().resetToDefaults();
      } else if (currentTab === 'notifications') {
        useNotificationStore.getState().updatePrefs({
          enabled: false,
          habitReminders: true,
          taskDueReminders: true,
          eventReminders: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          soundEnabled: true,
        });
      } else if (currentTab === 'ai') {
        useTerminalStore.setState({
          providers: {},
          activeProvider: 'gemini',
          activeModel: 'gemini-1.5-flash',
          model: 'gemini-1.5-flash',
          fallbackEnabled: true,
          fallbackOrder: ['openrouter', 'groq', 'huggingface', 'mistral', 'gemini'],
          notifyOnFallback: true,
          enableCrossModuleContext: false,
          customInstructions: '',
        });
      } else if (currentTab === 'backup') {
        await resetPreferencesToDefaults();
        await loadAllData();
      } else if (currentTab === 'system' && systemSection === 'shortcuts') {
        useKeyboardShortcutsStore.getState().resetAll();
      } else {
        return;
      }
      setResetRevision((value) => value + 1);
      setMessage({ type: 'success', text: `${resetTarget}已恢复默认；内容数据未被删除。` });
    } catch (error) {
      log.error('Failed to reset settings category', { currentTab, error });
      setMessage({ type: 'error', text: `恢复默认失败：${error}` });
    } finally {
      setShowResetConfirm(false);
    }
  };

  // Export handler
  const handleExport = async (compressed: boolean = true) => {
    try {
      setIsExporting(true);
      setMessage(null);

      const result = await exportBrainFile({ compressed, prettyPrint: !compressed });

      // Add to history
      await addHistoryEntry({
        filename: result.filename,
        size: result.size,
        compressed: result.compressed,
        type: 'manual',
        status: 'success',
      });

      await loadAllData(); // Refresh

      const sizeInfo = formatFileSize(result.size);
      const compressionNote = compressed ? ' (已压缩)' : '';
      setMessage({
        type: 'success',
        text: `知识库数据导出成功！文件大小：${sizeInfo}${compressionNote}`
      });
    } catch (error) {
      setMessage({ type: 'error', text: `导出失败：${error}` });
    } finally {
      setIsExporting(false);
    }
  };

  // Import handler
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setMessage(null);

      const validation = await validateBrainFile(file);
      if (!validation.valid) {
        setMessage({ type: 'error', text: validation.message });
        return;
      }

      if (validation.info) {
        setMessage({
          type: 'info',
          text: `找到 ${validation.info.itemCount} 个项目（${validation.info.fileSize}），导出时间：${new Date(validation.info.exportDate).toLocaleString()}。正在导入…`,
        });
      }

      const result = await importBrainFile(file);
      if (result.success) {
        setMessage({ type: 'success', text: result.message });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `导入失败：${error}` });
    } finally {
      setIsImporting(false);
    }
  };

  // Calendar handlers
  const handleExportCalendar = async () => {
    try {
      setIsExportingCalendar(true);
      setMessage(null);

      const result = exportToICS(events);

      if (!result.success || !result.data) {
        setMessage({ type: 'error', text: result.error || '导出失败' });
        return;
      }

      downloadICS(result.data, `calendar-${format(new Date(), 'yyyy-MM-dd')}.ics`);

      const eventCount = Object.values(events).reduce((acc, arr) => acc + arr.length, 0);
      setMessage({
        type: 'success',
        text: `日历导出成功！${eventCount} 个事件已保存到 .ics 文件。`
      });
    } catch (error) {
      setMessage({ type: 'error', text: `日历导出失败：${error}` });
    } finally {
      setIsExportingCalendar(false);
    }
  };

  const handleICSFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImportingCalendar(true);
      setMessage(null);

      const icsData = await readICSFile(file);
      const result = importFromICS(icsData);

      if (!result.success || !result.events) {
        setMessage({ type: 'error', text: result.error || '导入失败' });
        return;
      }

      const count = importEvents(result.events);

      setMessage({
        type: 'success',
        text: `日历导入成功！已添加 ${count} 个事件。`
      });
    } catch (error) {
      setMessage({ type: 'error', text: `日历导入失败：${error}` });
    } finally {
      setIsImportingCalendar(false);
      // Reset input value to allow re-importing same file
      event.target.value = '';
    }
  };

  // Notification permission handler
  const handleRequestNotificationPermission = async () => {
    try {
      setRequestingPermission(true);
      const granted = await requestNotificationPermission();
      setNotificationPermission(granted ? 'granted' : 'denied');
      setMessage({
        type: granted ? 'success' : 'warning',
        text: granted
          ? '通知已启用！您将开始接收事件提醒。'
          : '通知权限被拒绝。您可以稍后在浏览器设置中启用。',
      });
    } catch (error) {
      log.error('Failed to request notification permission', { error });
      setMessage({ type: 'error', text: '请求通知权限失败' });
    } finally {
      setRequestingPermission(false);
    }
  };

  if (!preferences) {
    return <div className="p-6">加载中…</div>;
  }

  return (
    <PageContent page="settings">
      {/* Message Banner */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-status-success-bg dark:bg-status-success-bg-dark text-status-success-text dark:text-status-success-text-dark border border-status-success-border dark:border-status-success-border-dark'
                : message.type === 'error'
                ? 'bg-status-error-bg dark:bg-status-error-bg-dark text-status-error-text dark:text-status-error-text-dark border border-status-error-border dark:border-status-error-border-dark'
                : message.type === 'warning'
                ? 'bg-status-warning-bg dark:bg-status-warning-bg-dark text-status-warning-text dark:text-status-warning-text-dark border border-status-warning-border dark:border-status-warning-border-dark'
                : 'bg-status-info-bg dark:bg-status-info-bg-dark text-status-info-text dark:text-status-info-text-dark border border-status-info-border dark:border-status-info-border-dark'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backup Reminder Banner */}
      {backupReminder?.show && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-lg bg-status-warning-bg dark:bg-status-warning-bg-dark text-status-warning-text dark:text-status-warning-text-dark border border-status-warning-border dark:border-status-warning-border-dark flex items-start gap-3"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">{backupReminder.message}</p>
            <button
              onClick={() => handleExport(preferences.compressionEnabled)}
              className="mt-2 text-sm underline hover:no-underline"
            >
              立即创建备份
            </button>
          </div>
        </motion.div>
      )}

      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
        <input
          type="search"
          value={settingsSearch}
          onChange={(event) => setSettingsSearch(event.target.value)}
          placeholder="搜索设置，例如“备份”“模板”“通知”"
          aria-label="搜索设置"
          className="h-10 w-full rounded-xl border border-border-light bg-surface-light pl-10 pr-3 text-sm text-text-light-primary outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-primary"
        />
        {settingsSearch.trim() && (
          <div className="absolute left-0 right-0 top-12 z-20 overflow-hidden rounded-xl border border-border-light bg-surface-light shadow-xl dark:border-border-dark dark:bg-surface-dark">
            {matchingSettings.length === 0 ? (
              <p className="px-4 py-3 text-sm text-text-light-secondary dark:text-text-dark-secondary">没有匹配的设置</p>
            ) : matchingSettings.map((entry) => (
              <button
                key={`${entry.tab}-${entry.section ?? entry.label}`}
                type="button"
                onClick={() => {
                  setSearchParams({ tab: entry.tab, ...(entry.section ? { section: entry.section } : {}) });
                  setSettingsSearch('');
                }}
                className="block w-full px-4 py-3 text-left text-sm text-text-light-primary hover:bg-surface-light-elevated dark:text-text-dark-primary dark:hover:bg-surface-dark-elevated"
              >
                {entry.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-col gap-6 md:flex-row">
        {/* Tab Navigation Sidebar */}
        <nav className="w-48 flex-shrink-0 hidden md:block">
          <div className="sticky top-4 space-y-1">
            {SETTINGS_TABS.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              const showGroup = index === 0 || SETTINGS_TABS[index - 1].group !== tab.group;
              return (
                <React.Fragment key={tab.id}>
                  {showGroup && (
                    <p className={`${index === 0 ? '' : 'pt-3'} px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-text-light-tertiary dark:text-text-dark-tertiary`}>
                      {tab.group}
                    </p>
                  )}
                  <button
                    onClick={() => setTab(tab.id)}
                    className={`w-full flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm transition-all duration-200 ${
                      isActive
                        ? 'bg-accent-primary/10 text-accent-primary font-medium'
                        : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated hover:text-text-light-primary dark:hover:text-text-dark-primary'
                    }`}
                  >
                    <Icon className="h-4.5 w-4.5 flex-shrink-0" />
                    <span className="flex-1">{tab.label}</span>
                    {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </nav>

        {/* Mobile Tab Selector — scrollable grouped chips (easier reach than a <select>) */}
        <div className="mb-4 w-full md:hidden" role="tablist" aria-label="设置分类">
          {Array.from(new Set(SETTINGS_TABS.map((t) => t.group))).map((group) => (
            <div key={group} className="mb-2 last:mb-0">
              <p className="px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-light-tertiary dark:text-text-dark-tertiary">
                {group}
              </p>
              <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {SETTINGS_TABS.filter((t) => t.group === group).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = currentTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setTab(tab.id)}
                      className={`inline-flex shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm transition-all duration-200 ${
                        isActive
                          ? 'border-accent-primary bg-accent-primary/10 font-medium text-accent-primary'
                          : 'border-border-light bg-surface-light text-text-light-secondary hover:bg-surface-light-elevated dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-secondary dark:hover:bg-surface-dark-elevated'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 max-w-[920px]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-light bg-surface-light-elevated/45 px-4 py-3 dark:border-border-dark dark:bg-surface-dark-elevated/35">
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">{SETTINGS_DESCRIPTIONS[currentTab]}</p>
            <div className="flex flex-wrap items-center gap-3">
              <span className="shrink-0 text-xs text-text-light-tertiary dark:text-text-dark-tertiary">更改即时保存到本机</span>
            </div>
          </div>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={`${currentTab}-${resetRevision}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.12 }}
              className="space-y-5"
            >
              {/* General Settings */}
              {currentTab === 'general' && (
                <>
                  <AccountSettings />
                  <SiteWideSettings />
                  <AppPreferencesSection />
                  <DefaultViewsSection />
                  <DashboardSettingsSection onOpenPresetManager={() => setShowPresetManager(true)} />
                  <SavedLayoutsSection />
                </>
              )}

              {/* Appearance Settings */}
              {currentTab === 'appearance' && (
                <>
                  <ThemeSettings />
                  <AccentColorSection />
                  <AdvancedCustomizationSection />
                </>
              )}

              {/* Workspace settings: five related areas behind one stable category. */}
              {currentTab === 'workspace' && (
                <>
                  <div className="flex flex-wrap gap-2 rounded-xl border border-border-light bg-surface-light-elevated/50 p-2 dark:border-border-dark dark:bg-surface-dark-elevated/40" role="tablist" aria-label="工作区设置">
                    {WORKSPACE_SECTIONS.map((section) => {
                      const Icon = section.icon;
                      const active = workspaceSection === section.id;
                      return <button key={section.id} type="button" role="tab" aria-selected={active} onClick={() => setWorkspaceSection(section.id)} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${active ? 'bg-accent-primary text-white' : 'text-text-light-secondary hover:bg-surface-light dark:text-text-dark-secondary dark:hover:bg-surface-dark'}`}><Icon className="h-3.5 w-3.5" />{section.label}</button>;
                    })}
                  </div>

                  {workspaceSection === 'editor' && (
                    <>
                      <div className="bento-card p-6"><DailyNotesSettings /></div>
                      <div className="bento-card p-6"><TemplateSettings /></div>
                    </>
                  )}
                  {workspaceSection === 'tasks' && <TaskManagementSettings />}
                  {workspaceSection === 'projects' && <ProjectSettings />}
                  {workspaceSection === 'calendar' && (
                    <>
                      <CalendarManagementSection />
                      <CalendarImportExportSection
                        isExporting={isExportingCalendar}
                        isImporting={isImportingCalendar}
                        onExport={handleExportCalendar}
                        onImport={handleICSFileSelect}
                      />
                    </>
                  )}
                  {workspaceSection === 'time' && (
                    <>
                      <div className="bento-card p-6"><TimeTrackingPanelSettings /></div>
                      <div className="bento-card p-6"><AutoTrackingSettings /></div>
                    </>
                  )}
                </>
              )}

              {/* Notifications Settings */}
              {currentTab === 'notifications' && (
                <>
                  <NotificationPreferencesSection />
                  <CalendarNotificationsSection
                    notificationPermission={notificationPermission}
                    requestingPermission={requestingPermission}
                    onRequestPermission={handleRequestNotificationPermission}
                  />
                </>
              )}

              {/* Data migration: one coherent surface instead of overlapping import/export widgets. */}
              {currentTab === 'data' && (
                <>
                  <ImportExportPanel onMessage={setMessage} />
                  <StorageInfoSection storageInfo={storageInfo} />
                  <details className="rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
                    <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-text-light-secondary hover:text-text-light-primary dark:text-text-dark-secondary dark:hover:text-text-dark-primary">
                      高级数据管理
                    </summary>
                    <div className="border-t border-border-light p-4 dark:border-border-dark">
                      <DataManagementSection onMessage={setMessage} />
                    </div>
                  </details>
                </>
              )}

              {/* Backup & Data Settings */}
              {currentTab === 'backup' && (
                <>
                  {/* Privacy Notice */}
                  <div className="p-4 rounded-lg bg-status-success-bg dark:bg-status-success-bg-dark border border-status-success-border dark:border-status-success-border-dark">
                    <p className="text-sm text-status-success-text dark:text-status-success-text-dark">
                      <strong className="inline-flex items-center gap-1"><Lock className="h-4 w-4" />本地优先：</strong>核心数据存储在您的浏览器中，使用 IndexedDB（50GB+ 容量），无需云端账户且不进行行为追踪。
                      只有您主动启用 AI、天气等外部能力时，相关请求才会发往所选服务商。
                    </p>
                  </div>

                  {/* New Browser Warning */}
                  {showNewBrowserWarning && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 rounded-lg bg-status-warning-bg dark:bg-status-warning-bg-dark border-2 border-status-warning-border dark:border-status-warning-border-dark"
                    >
                      <div className="flex items-start gap-4">
                        <AlertTriangle className="h-7 w-7 shrink-0 text-status-warning-text dark:text-status-warning-text-dark" />
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-status-warning-text dark:text-status-warning-text-dark mb-2">
                            首次使用此浏览器？
                          </h3>
                          <p className="text-sm text-status-warning-text dark:text-status-warning-text-dark mb-3">
                            您的数据分别存储在各浏览器中。请从其他浏览器导出，再在此处导入。
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setShowNewBrowserWarning(false)}
                              className="px-4 py-2 bg-status-warning text-white rounded-lg font-medium transition-colors"
                            >
                              知道了
                            </button>
                            <button
                              onClick={() => {
                                setShowNewBrowserWarning(false);
                                localStorage.setItem('new-browser-warning-dismissed', 'true');
                              }}
                              className="px-4 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary rounded-lg font-medium transition-colors border border-border-light dark:border-border-dark"
                            >
                              不再显示
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <QuickActionsSection
                    timeSinceLastBackup={timeSinceLastBackup}
                    isExporting={isExporting}
                    isImporting={isImporting}
                    onExport={() => handleExport(preferences.compressionEnabled)}
                    onFileSelect={handleFileSelect}
                  />

                  <BackupHistorySection backupHistory={backupHistory} />

                  <BackupOptionsSection
                    preferences={preferences}
                    onRefresh={loadAllData}
                    onMessage={setMessage}
                  />

                  <AutoSaveSettings
                    onMessage={setMessage}
                    onRefresh={loadAllData}
                  />

                  <div className="bento-card p-6">
                    <BackupSettings />
                  </div>

                </>
              )}

              {/* AI Command Center provider settings */}
              {currentTab === 'ai' && (
                <AITerminalSettingsSection />
              )}

              {/* System settings and About share one low-frequency category. */}
              {currentTab === 'system' && (
                <>
                  <div className="flex flex-wrap gap-2 rounded-xl border border-border-light bg-surface-light-elevated/50 p-2 dark:border-border-dark dark:bg-surface-dark-elevated/40" role="tablist" aria-label="系统设置">
                    {SYSTEM_SECTIONS.map((section) => {
                      const Icon = section.icon;
                      const active = systemSection === section.id;
                      return <button key={section.id} type="button" role="tab" aria-selected={active} onClick={() => setSystemSection(section.id)} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${active ? 'bg-accent-primary text-white' : 'text-text-light-secondary hover:bg-surface-light dark:text-text-dark-secondary dark:hover:bg-surface-dark'}`}><Icon className="h-3.5 w-3.5" />{section.label}</button>;
                    })}
                  </div>

                  {systemSection === 'shortcuts' && <KeyboardShortcutsSection />}
                  {systemSection === 'advanced' && (
                    <div className="bento-card p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Tag className="h-5 w-5 text-text-light-tertiary dark:text-text-dark-tertiary" />
                        <h2 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">自定义字段</h2>
                      </div>
                      <CustomFieldsSettings />
                    </div>
                  )}
                  {systemSection === 'about' && <AboutSettings />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              disabled={!resetAvailable}
              title={resetAvailable ? `恢复${resetTarget}默认设置` : resetUnavailableReason}
              onClick={() => setShowResetConfirm(true)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border-light px-3 py-1.5 text-xs font-medium text-text-light-secondary hover:border-accent-primary hover:text-accent-primary disabled:cursor-not-allowed disabled:opacity-45 dark:border-border-dark dark:text-text-dark-secondary"
            >
              <RotateCcw className="h-3.5 w-3.5" />恢复{resetTarget}默认
            </button>
          </div>
        </div>
      </div>

      {/* Preset Manager Modal */}
      <PresetManager
        isOpen={showPresetManager}
        onClose={() => setShowPresetManager(false)}
      />
      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetCurrentCategory}
        title={`恢复${resetTarget}默认设置`}
        message={currentTab === 'ai'
          ? '将清除本机保存的 AI 服务商密钥并恢复 AI 偏好；会话内容不会删除。是否继续？'
          : `将恢复${resetTarget}的偏好设置。项目、任务、笔记、模板和其他内容数据不会删除。是否继续？`}
        confirmText="恢复默认"
        variant="danger"
      />
    </PageContent>
  );
};
