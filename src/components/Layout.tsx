import React, { Suspense, lazy, useState, useCallback, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Sparkles } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { PageHeader } from './PageHeader';
import { ErrorToastContainer } from './ErrorToast';
import { PWAUpdatePrompt } from './PWAPrompts';
import { OfflineIndicator } from './OfflineIndicator';
import { NaturalLanguageBar } from './NaturalLanguageBar';
import { useSidebarStore } from '../stores/useSidebarStore';
import { useProjectContextStore } from '../stores/useProjectContextStore';
import { useNotesStore } from '../stores/useNotesStore';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';
import { useShortcut } from '../hooks/useShortcut';
import { useSwipeNavigation } from '../hooks/useSwipeNavigation';
import { useCustomCSS } from '../hooks/useCustomCSS';
import { BottomNav } from './BottomNav';
import { isInputElement } from '../services/shortcuts';

// Lazy load heavy components to reduce initial bundle size
// CommandPalette: imports all stores for global search
const CommandPalette = lazy(() => import('./CommandPalette').then(m => ({ default: m.CommandPalette })));
// Modals: only needed when opened
const SupportModal = lazy(() => import('./SupportModal').then(m => ({ default: m.SupportModal })));
const OnboardingModal = lazy(() => import('./OnboardingModal').then(m => ({ default: m.OnboardingModal })));
const QuickAddModal = lazy(() => import('../widgets/Kanban/QuickAddModal').then(m => ({ default: m.QuickAddModal })));
const SmartTemplatePicker = lazy(() => import('./SmartTemplatePicker').then(m => ({ default: m.SmartTemplatePicker })));
const SmartTemplateBuilder = lazy(() => import('./SmartTemplateBuilder').then(m => ({ default: m.SmartTemplateBuilder })));

/**
 * Layout Component with Sidebar Navigation
 */
interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isCollapsed, toggleMobileMenu } = useSidebarStore();
  const toggleProjectDropdown = useProjectContextStore((s) => s.toggleDropdown);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportModalTab, setSupportModalTab] = useState<'report' | 'help' | 'docs'>('report');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showQuickAddTask, setShowQuickAddTask] = useState(false);
  const [showSmartTemplatePicker, setShowSmartTemplatePicker] = useState(false);
  const [showSmartTemplateBuilder, setShowSmartTemplateBuilder] = useState(false);
  const [showNaturalLanguageBar, setShowNaturalLanguageBar] = useState(false);

  // Handler for opening support modal from command palette
  const handleOpenSupportModal = (tab: 'report' | 'help' | 'docs') => {
    setSupportModalTab(tab);
    setShowSupportModal(true);
    setShowCommandPalette(false);
  };

  // Handler for opening various modals from command palette
  const handleOpenModal = useCallback((modalId: string) => {
    setShowCommandPalette(false);
    switch (modalId) {
      case 'about':
        navigate('/about');
        break;
      case 'privacy':
        navigate('/privacy');
        break;
      case 'onboarding':
        setShowOnboardingModal(true);
        break;
      case 'support':
        setShowSupportModal(true);
        break;
      case 'quick-add':
        setShowQuickAddTask(true);
        break;
      default:
        break;
    }
  }, [navigate]);

  // Inject user custom CSS when enabled
  useCustomCSS();

  // Enable swipe-from-left-edge gesture to open sidebar on mobile
  useSwipeNavigation();

  // Initialize global keyboard shortcut listener
  // This single listener dispatches to all registered shortcuts
  useGlobalShortcuts();

  // Register global shortcuts using the new system
  useShortcut({
    id: 'open-command-palette',
    keys: ['mod', 'k'],
    label: '打开命令面板',
    description: '搜索笔记、任务并执行操作',
    handler: useCallback(() => setShowCommandPalette(true), []),
    priority: 100,
  });

  useShortcut({
    id: 'open-help-f1',
    keys: ['f1'],
    label: '打开帮助',
    description: '显示键盘快捷键和文档',
    handler: useCallback(() => setShowSupportModal(true), []),
    priority: 50,
  });

  useShortcut({
    id: 'open-help-slash',
    keys: ['mod', '/'],
    label: '打开帮助',
    description: '显示键盘快捷键和文档',
    handler: useCallback(() => setShowSupportModal(true), []),
    priority: 50,
  });

  useShortcut({
    id: 'toggle-project-context',
    keys: ['mod', 'shift', 'p'],
    label: '切换项目上下文',
    description: '打开项目上下文下拉菜单',
    handler: toggleProjectDropdown,
    priority: 50,
  });

  useShortcut({
    id: 'quick-add-task',
    keys: ['c'],
    label: '快速添加任务',
    description: '随时随地创建新任务',
    handler: useCallback(() => setShowQuickAddTask(true), []),
    priority: 40,
  });

  // Navigation shortcuts: Ctrl+1-9 for pages
  useShortcut({
    id: 'nav-dashboard',
    keys: ['mod', '1'],
    label: '前往首页',
    description: '导航至首页',
    handler: useCallback(() => navigate('/'), [navigate]),
    priority: 30,
  });

  useShortcut({
    id: 'nav-today',
    keys: ['mod', '2'],
    label: '前往今日',
    description: '导航至今日页面',
    handler: useCallback(() => navigate('/today'), [navigate]),
    priority: 30,
  });

  useShortcut({
    id: 'nav-notes',
    keys: ['mod', '3'],
    label: '前往笔记',
    description: '导航至笔记',
    handler: useCallback(() => navigate('/notes'), [navigate]),
    priority: 30,
  });

  useShortcut({
    id: 'nav-tasks',
    keys: ['mod', '4'],
    label: '前往任务',
    description: '导航至任务',
    handler: useCallback(() => navigate('/tasks'), [navigate]),
    priority: 30,
  });

  useShortcut({
    id: 'nav-schedule',
    keys: ['mod', '5'],
    label: '前往日程',
    description: '导航至日程',
    handler: useCallback(() => navigate('/schedule'), [navigate]),
    priority: 30,
  });

  useShortcut({
    id: 'nav-create',
    keys: ['mod', '6'],
    label: '前往创建',
    description: '导航至创建页面',
    handler: useCallback(() => navigate('/create'), [navigate]),
    priority: 30,
  });

  useShortcut({
    id: 'nav-links',
    keys: ['mod', '7'],
    label: '前往链接',
    description: '导航至链接库',
    handler: useCallback(() => navigate('/links'), [navigate]),
    priority: 30,
  });

  useShortcut({
    id: 'nav-settings',
    keys: ['mod', '8'],
    label: '前往设置',
    description: '导航至设置',
    handler: useCallback(() => navigate('/settings'), [navigate]),
    priority: 30,
  });

  // Quick create actions
  useShortcut({
    id: 'create-new-note',
    keys: ['mod', 'n'],
    label: '新建笔记',
    description: '创建新笔记',
    handler: useCallback(() => {
      const { createNote, setActiveNote } = useNotesStore.getState();
      const note = createNote({ title: '', content: '', contentText: '', tags: [] });
      setActiveNote(note.id);
      navigate('/notes');
    }, [navigate]),
    priority: 45,
  });

  useShortcut({
    id: 'create-new-task',
    keys: ['mod', 't'],
    label: '新建任务',
    description: '快速添加新任务',
    handler: useCallback(() => setShowQuickAddTask(true), []),
    priority: 45,
    allowInInput: false,
  });

  useShortcut({
    id: 'create-new-event',
    keys: ['mod', 'e'],
    label: '新建事件',
    description: '导航至日历以创建事件',
    handler: useCallback(() => navigate('/schedule'), [navigate]),
    priority: 45,
  });

  useShortcut({
    id: 'toggle-ai-terminal',
    keys: ['mod', 'shift', 'a'],
    label: '前往 AI 指挥中心',
    description: '打开 AI 指挥中心',
    handler: useCallback(() => navigate('/ai'), [navigate]),
    priority: 60,
  });

  useShortcut({
    id: 'open-smart-templates',
    keys: ['mod', 'shift', 't'],
    label: '智能模板',
    description: '打开智能模板选择器',
    handler: useCallback(() => setShowSmartTemplatePicker(true), []),
    priority: 55,
  });

  useShortcut({
    id: 'toggle-sidebar',
    keys: ['mod', 'b'],
    label: '切换侧边栏',
    description: '显示或隐藏侧边栏',
    handler: useCallback(() => useSidebarStore.getState().toggleCollapse(), []),
    priority: 40,
  });

  useShortcut({
    id: 'open-natural-language-bar',
    keys: ['mod', 'shift', 'n'],
    label: '自然语言输入',
    description: '通过自然语言创建任务、事件或笔记',
    handler: useCallback(() => setShowNaturalLanguageBar(true), []),
    priority: 55,
  });

  // G-then-key sequence shortcuts (Linear-style navigation)
  const gKeyPendingRef = useRef(false);
  const gKeyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleGSequence = (e: KeyboardEvent) => {
      // Don't trigger in inputs
      if (isInputElement(e.target)) return;
      // Don't trigger with modifiers
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;

      const key = e.key.toLowerCase();

      if (gKeyPendingRef.current) {
        // Second key of G sequence
        gKeyPendingRef.current = false;
        if (gKeyTimeoutRef.current) {
          clearTimeout(gKeyTimeoutRef.current);
          gKeyTimeoutRef.current = null;
        }

        const routes: Record<string, string> = {
          d: '/',           // Dashboard
          t: '/tasks',      // Tasks
          n: '/notes',      // Notes
          h: '/tasks?tab=habits', // Habits
          c: '/schedule',   // Calendar/Schedule
          s: '/settings',   // Settings
          o: '/today',      // Today/Overview
          l: '/links',      // Links
          f: '/focus',      // Focus
        };

        if (routes[key]) {
          e.preventDefault();
          e.stopPropagation();
          navigate(routes[key]);
        }
        return;
      }

      if (key === 'g') {
        gKeyPendingRef.current = true;
        // Reset after timeout
        gKeyTimeoutRef.current = setTimeout(() => {
          gKeyPendingRef.current = false;
        }, 800);
      }
    };

    window.addEventListener('keydown', handleGSequence);
    return () => {
      window.removeEventListener('keydown', handleGSequence);
      if (gKeyTimeoutRef.current) clearTimeout(gKeyTimeoutRef.current);
    };
  }, [navigate]);

  const isStandaloneRoute =
    location.pathname === '/focus' ||
    /^\/diagrams\/[^/]+$/.test(location.pathname) ||
    /^\/forms\/[^/]+\/(edit|fill|responses)$/.test(location.pathname);

  if (isStandaloneRoute) {
    return <div className="h-screen min-h-0 overflow-hidden bg-surface-light dark:bg-surface-dark">{children}</div>;
  }

  return (
    <div className="app h-screen bg-surface-light dark:bg-surface-dark flex overflow-hidden">
      {/* Skip to main content link - visible on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-1/2 focus:-translate-x-1/2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-accent-primary focus:text-white focus:rounded-button focus:shadow-lg"
      >
        跳转到主要内容
      </a>

      {/* Mobile hamburger button - hidden on small screens (BottomNav handles it) and on desktop (sidebar always visible) */}
      <button
        onClick={toggleMobileMenu}
        className="hidden md:block lg:hidden fixed top-4 left-4 z-50 p-2 min-w-[44px] min-h-[44px] rounded-button bg-surface-light dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark shadow-lg transition-all duration-standard ease-smooth"
        aria-label="切换导航菜单"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      <Sidebar />

      {/* Main content area with margin for sidebar */}
      <div
        className={`
          flex-1 flex flex-col transition-all duration-200 overflow-x-hidden overflow-y-hidden
          ${/* Mobile: no margin (sidebars are overlays) */ ''}
          ml-0 mr-0
          ${/* Desktop (md+): left margin for navigation sidebar */ ''}
          ${isCollapsed ? 'md:ml-[64px]' : 'md:ml-[224px]'}
        `}
      >
        {/* Sticky PageHeader - persists across page navigation */}
        <header className="sticky top-0 z-30 border-b border-border-light/70 bg-surface-light/95 px-4 py-3 backdrop-blur md:px-6 dark:border-border-dark/70 dark:bg-surface-dark/95">
          <PageHeader />
        </header>

        <main
          id="main-content"
          role="main"
          tabIndex={-1}
          className="flex-1 flex flex-col min-h-0 overflow-hidden focus:outline-none"
        >
          <div className="w-full h-full flex-1 flex flex-col min-h-0 px-4 md:px-6 pb-20 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* Bottom navigation bar for mobile (below md breakpoint) */}
      <BottomNav />

      {/* Floating AI assistant entry — keeps the assistant one click away on
          any page without giving it a permanent seat in the primary nav */}
      {location.pathname !== '/ai' && (
        <Link
          to="/ai"
          className="hidden md:flex fixed bottom-24 right-6 z-40 h-12 w-12 items-center justify-center rounded-full bg-accent-purple text-white shadow-elevated transition-all duration-standard ease-smooth hover:bg-accent-purple-hover hover:scale-105"
          aria-label="打开 AI 助手"
          title="AI 助手"
        >
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </Link>
      )}

      {/* Error Toast Notifications */}
      <ErrorToastContainer />

      {/* Lazy-loaded modals - wrapped in Suspense for code splitting */}
      <Suspense fallback={null}>
        {/* Global Support Modal (F1 or Cmd+Ctrl+/) */}
        {showSupportModal && (
          <SupportModal
            isOpen={showSupportModal}
            onClose={() => setShowSupportModal(false)}
            initialTab={supportModalTab}
          />
        )}

        {/* Onboarding Modal */}
        {showOnboardingModal && (
          <OnboardingModal
            isOpen={showOnboardingModal}
            onClose={() => setShowOnboardingModal(false)}
          />
        )}

        {/* Synapse - Neural Search (Cmd+K / Ctrl+K) */}
        {showCommandPalette && (
          <CommandPalette
            isOpen={showCommandPalette}
            onClose={() => setShowCommandPalette(false)}
            onOpenSupportModal={handleOpenSupportModal}
            onOpenModal={handleOpenModal}
          />
        )}

        {/* Quick Add Task Modal (C key shortcut) */}
        {showQuickAddTask && (
          <QuickAddModal
            isOpen={showQuickAddTask}
            onClose={() => setShowQuickAddTask(false)}
          />
        )}

        {/* Smart Template Picker (Ctrl+Shift+T) */}
        {showSmartTemplatePicker && (
          <SmartTemplatePicker
            isOpen={showSmartTemplatePicker}
            onClose={() => setShowSmartTemplatePicker(false)}
            onOpenBuilder={() => {
              setShowSmartTemplatePicker(false);
              setShowSmartTemplateBuilder(true);
            }}
          />
        )}

        {/* Smart Template Builder */}
        {showSmartTemplateBuilder && (
          <SmartTemplateBuilder
            isOpen={showSmartTemplateBuilder}
            onClose={() => setShowSmartTemplateBuilder(false)}
          />
        )}
      </Suspense>

      {/* Natural Language Bar (Ctrl+Shift+N) */}
      <NaturalLanguageBar
        isOpen={showNaturalLanguageBar}
        onClose={() => setShowNaturalLanguageBar(false)}
      />

      {/* PWA update toast (install prompt now lives in Settings → 关于) */}
      <PWAUpdatePrompt />

      {/* Offline Indicator (shows when network is unavailable) */}
      <OfflineIndicator />
    </div>
  );
};
