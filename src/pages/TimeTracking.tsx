import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  List,
  BarChart3,
  FolderOpen,
  Timer,
  Activity,
  Grid3X3,
  Settings as SettingsIcon,
} from 'lucide-react';
import { TimeEntryList } from '../components/TimeEntryList';
import { TimeEntrySummary } from '../components/TimeEntrySummary';
import { EditTimeEntryModal } from '../components/EditTimeEntryModal';
import { EventCreateModal } from '../components/EventCreateModal';
import { ProjectManager } from '../components/ProjectManager';
import { TimeEntryCalendar } from '../components/TimeEntryCalendar';
import { TimeTrackingTimer } from '../components/TimeTrackingTimer';
import { PomodoroTimer } from '../components/PomodoroTimer';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { WeeklyTimesheetView } from '../components/WeeklyTimesheetView';
import { AutoTrackingSettings } from '../components/AutoTrackingSettings';
import { TimeRoundingSettings } from '../components/TimeRoundingSettings';
import { IdleDetectionSettings } from '../components/IdleDetectionSettings';
import { ExportTimeEntriesModal } from '../components/ExportTimeEntriesModal';
import type { TimeEntry, CalendarEvent } from '../types';
import { PageContent } from '../components/PageContent';
import { useCalendarStore } from '../stores/useCalendarStore';
import {
  findCalendarEvent,
  getInitialEventTimeRange,
  parseScheduleDeepLink,
} from '../utils/scheduleDeepLink';
import type { InitialEventTimeRange } from '../utils/scheduleDeepLink';

// Main tabs: Calendar, Timer (with sub-sections), Pomodoro
type MainTabType = 'calendar' | 'timer' | 'pomodoro';

// Timer sub-sections (shown as sidebar when timer tab is active)
type TimerSectionType = 'timer' | 'entries' | 'timesheet' | 'summary' | 'projects' | 'timeline' | 'settings';

const VALID_MAIN_TABS: MainTabType[] = ['calendar', 'timer', 'pomodoro'];
const VALID_TIMER_SECTIONS: TimerSectionType[] = ['timer', 'entries', 'timesheet', 'summary', 'projects', 'timeline', 'settings'];

// Timer section configuration (sidebar items)
const TIMER_SECTIONS = [
  { id: 'timer', label: '计时器', icon: Timer },
  { id: 'entries', label: '记录', icon: List },
  { id: 'timesheet', label: '工时表', icon: Grid3X3 },
  { id: 'summary', label: '汇总', icon: BarChart3 },
  { id: 'projects', label: '项目', icon: FolderOpen },
  { id: 'timeline', label: '时间线', icon: Activity },
  { id: 'settings', label: '设置', icon: SettingsIcon },
] as const;

// Project management and detailed settings remain available to legacy direct URLs,
// but are not part of the default personal-workspace UI.
const EXPOSED_TIMER_SECTIONS = TIMER_SECTIONS.filter((section) =>
  ['timer', 'entries', 'timesheet', 'summary', 'timeline'].includes(section.id)
);

/**
 * TimeTracking Page (Schedule)
 *
 * Main tabs:
 * - Calendar: Time entries + events calendar view
 * - Time Tracking: Full time tracking suite with sidebar navigation
 * - Pomodoro: Focus timer with breaks
 *
 * Time Tracking sub-sections:
 * - Timer: Active time tracking
 * - Entries: List view of all time entries
 * - Summary: Time entry analytics and charts
 * - Projects: Project management for time tracking
 * - Timeline: Activity timeline view
 * - Settings: Auto-tracking configuration
 */
export function TimeTracking() {
  const location = useLocation();
  const navigate = useNavigate();
  const calendarEvents = useCalendarStore((state) => state.events);

  // Parse URL for main tab and timer section
  const getStateFromUrl = (): { mainTab: MainTabType; timerSection: TimerSectionType } => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const section = params.get('section');
    const deepLink = parseScheduleDeepLink(location.search);

    // Deep links address calendar content, so they intentionally take priority
    // over a stale tab/section while keeping those parameters in the URL.
    if (deepLink.dateKey || deepLink.eventId || deepLink.hour !== undefined) {
      return { mainTab: 'calendar', timerSection: 'timer' };
    }

    // Check if it's a valid main tab
    if (tab && VALID_MAIN_TABS.includes(tab as MainTabType)) {
      const mainTab = tab as MainTabType;
      // If timer tab, also check for section
      if (mainTab === 'timer' && section && VALID_TIMER_SECTIONS.includes(section as TimerSectionType)) {
        return { mainTab, timerSection: section as TimerSectionType };
      }
      return { mainTab, timerSection: 'timer' };
    }

    // Legacy support: map old tab names to new structure
    if (tab && VALID_TIMER_SECTIONS.includes(tab as TimerSectionType)) {
      return { mainTab: 'timer', timerSection: tab as TimerSectionType };
    }

    return { mainTab: 'calendar', timerSection: 'timer' };
  };

  const [state, setState] = useState(getStateFromUrl);
  const { mainTab, timerSection } = state;

  // Update state when URL changes
  useEffect(() => {
    const newState = getStateFromUrl();
    if (newState.mainTab !== mainTab || newState.timerSection !== timerSection) {
      setState(newState);
    }
  }, [location.search]);

  // Update URL when main tab changes
  const handleMainTabChange = (tab: MainTabType) => {
    setState({ mainTab: tab, timerSection: 'timer' });
    if (tab === 'timer') {
      navigate(`/schedule?tab=timer&section=timer`, { replace: true });
    } else {
      navigate(`/schedule?tab=${tab}`, { replace: true });
    }
  };

  // Update URL when timer section changes
  const handleTimerSectionChange = (section: TimerSectionType) => {
    setState({ mainTab: 'timer', timerSection: section });
    navigate(`/schedule?tab=timer&section=${section}`, { replace: true });
  };

  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [eventModalData, setEventModalData] = useState<{
    dateKey: string;
    event?: CalendarEvent;
    isDuplicate?: boolean;
    initialTimeRange?: InitialEventTimeRange;
  } | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [calendarHydrated, setCalendarHydrated] = useState(() => useCalendarStore.persist.hasHydrated());
  const consumedActionRef = useRef<string | null>(null);
  const deepLink = useMemo(() => parseScheduleDeepLink(location.search), [location.search]);
  const locatedEvent = useMemo(
    () => deepLink.eventId
      ? findCalendarEvent(calendarEvents, deepLink.eventId, deepLink.dateKey)
      : undefined,
    [calendarEvents, deepLink.dateKey, deepLink.eventId]
  );
  const calendarFocusDateKey = locatedEvent?.dateKey || deepLink.dateKey;

  // Calendar events hydrate asynchronously from IndexedDB. Event deep links
  // must remain intact until that data is available for ID lookup.
  useEffect(() => {
    if (useCalendarStore.persist.hasHydrated()) {
      setCalendarHydrated(true);
      return;
    }

    return useCalendarStore.persist.onFinishHydration(() => {
      setCalendarHydrated(true);
    });
  }, []);

  // Open each URL-triggered modal once, then remove only the one-shot action
  // fields. date/tab/section stay intact for navigation and refresh compatibility.
  useEffect(() => {
    if (!deepLink.eventId && deepLink.hour === undefined) return;
    if (deepLink.eventId && !calendarHydrated) return;

    const actionKey = `${location.key}:${deepLink.eventId || ''}:${deepLink.hour ?? ''}`;
    if (consumedActionRef.current === actionKey) return;
    consumedActionRef.current = actionKey;

    if (locatedEvent) {
      setEventModalData({ dateKey: locatedEvent.dateKey, event: locatedEvent.event });
    } else if (deepLink.dateKey && deepLink.hour !== undefined) {
      const initialTimeRange = getInitialEventTimeRange(deepLink.dateKey, deepLink.hour);
      if (initialTimeRange) {
        setEventModalData({ dateKey: deepLink.dateKey, initialTimeRange });
      }
    }

    const params = new URLSearchParams(location.search);
    if (locatedEvent) {
      // Keep the durable date parameter aligned with the event's actual
      // date-key after resolving it from the date-keyed store.
      const [year, month, day] = locatedEvent.dateKey.split('-').map(Number);
      params.set(
        'date',
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      );
    }
    params.delete('event');
    params.delete('hour');
    const nextSearch = params.toString();
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' },
      { replace: true }
    );
  }, [calendarHydrated, deepLink, locatedEvent, location.key, location.pathname, location.search, navigate]);

  // Listen for duplicate event custom events from EventCreateModal
  useEffect(() => {
    const handleDuplicate = (e: Event) => {
      const detail = (e as CustomEvent).detail as { event: CalendarEvent; dateKey: string };
      if (detail?.event && detail?.dateKey) {
        // Small delay to let the current modal close first
        setTimeout(() => {
          setEventModalData({ dateKey: detail.dateKey, event: detail.event, isDuplicate: true });
        }, 50);
      }
    };
    window.addEventListener('calendar:duplicate-event', handleDuplicate);
    return () => window.removeEventListener('calendar:duplicate-event', handleDuplicate);
  }, []);

  return (
    <PageContent page="time-tracking">
      {/* 日程只把“安排时间”作为一级任务；计时/番茄钟降级为辅助工具链接。 */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border-light pb-3 dark:border-border-dark">
        <div>
          <h2 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            {mainTab === 'calendar' ? '日程安排' : mainTab === 'timer' ? '时间统计' : '专注计时'}
          </h2>
          <p className="mt-0.5 text-xs text-text-light-secondary dark:text-text-dark-secondary">
            {mainTab === 'calendar'
              ? '先看承诺过的时间，再决定还能安排什么。'
              : '这是辅助工具，不占用日程的一级导航。'}
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {mainTab !== 'calendar' ? (
            <button
              type="button"
              onClick={() => handleMainTabChange('calendar')}
              className="font-medium text-accent-primary hover:opacity-80"
            >
              ← 返回日程
            </button>
          ) : (
            <>
              <Link to="/schedule?tab=timer&section=timer" className="text-text-light-secondary hover:text-accent-primary dark:text-text-dark-secondary">
                时间统计
              </Link>
              <Link to="/schedule?tab=pomodoro" className="text-text-light-secondary hover:text-accent-primary dark:text-text-dark-secondary">
                专注计时
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div
        role="tabpanel"
        id={`tabpanel-${mainTab}`}
        aria-labelledby={`tab-${mainTab}`}
        className="min-h-[600px]"
      >
        {/* Calendar Tab */}
        {mainTab === 'calendar' && (
          <TimeEntryCalendar
            onEditEntry={(entry) => setEditingEntry(entry)}
            onCreateEvent={(dateKey) => setEventModalData({ dateKey })}
            onEditEvent={(event, dateKey) => setEventModalData({ dateKey, event })}
            focusDateKey={calendarFocusDateKey}
          />
        )}

        {/* Time Tracking Tab - sidebar on desktop, scrollable chips on mobile */}
        {mainTab === 'timer' && (
          <div className="flex flex-col gap-4 md:h-[calc(100vh-16rem)] md:flex-row">
            {/* Timer Sections — horizontal chips (mobile) */}
            <div className="-mx-1 flex shrink-0 gap-2 overflow-x-auto px-1 pb-1 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {EXPOSED_TIMER_SECTIONS.map((section) => {
                const Icon = section.icon;
                const isActive = timerSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => handleTimerSectionChange(section.id as TimerSectionType)}
                    className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm transition-colors ${
                      isActive
                        ? 'border-accent-primary bg-accent-primary/10 font-medium text-accent-primary'
                        : 'border-border-light bg-surface-light text-text-light-secondary hover:bg-surface-light-elevated dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-secondary dark:hover:bg-surface-dark-elevated'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {section.label}
                  </button>
                );
              })}
            </div>

            {/* Timer Sections Sidebar (desktop) */}
            <aside className="hidden w-48 shrink-0 border-r border-border-light pr-4 md:block dark:border-border-dark">
              <nav className="sticky top-0 space-y-1" aria-label="时间跟踪分区">
                {EXPOSED_TIMER_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  const isActive = timerSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => handleTimerSectionChange(section.id as TimerSectionType)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-accent-primary/10 text-accent-primary'
                          : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated hover:text-text-light-primary dark:hover:text-text-dark-primary'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <Icon className="w-4 h-4" />
                      {section.label}
                    </button>
                  );
                })}
              </nav>
            </aside>

            {/* Timer Section Content */}
            <main className="flex-1 overflow-auto">
              {timerSection === 'timer' && <TimeTrackingTimer />}
              {timerSection === 'entries' && (
                <div className="space-y-4">
                  {/* Export button header */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowExportModal(true)}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm bg-accent-primary/10 text-accent-primary rounded-lg hover:bg-accent-primary/20 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      导出 CSV
                    </button>
                  </div>
                  <TimeEntryList onEditEntry={(entry) => setEditingEntry(entry)} />
                </div>
              )}
              {timerSection === 'timesheet' && <WeeklyTimesheetView />}
              {timerSection === 'summary' && (
                <div className="space-y-6">
                  <TimeEntrySummary />
                </div>
              )}
              {timerSection === 'projects' && <ProjectManager />}
              {timerSection === 'timeline' && <ActivityTimeline />}
              {timerSection === 'settings' && (
                <div className="space-y-8">
                  <TimeRoundingSettings />
                  <div className="border-t border-border-light dark:border-border-dark pt-8">
                    <IdleDetectionSettings />
                  </div>
                  <div className="border-t border-border-light dark:border-border-dark pt-8">
                    <AutoTrackingSettings />
                  </div>
                </div>
              )}
            </main>
          </div>
        )}

        {/* Pomodoro Tab */}
        {mainTab === 'pomodoro' && <PomodoroTimer />}
      </div>

      {/* Edit Time Entry Modal */}
      {editingEntry && (
        <EditTimeEntryModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {/* Create/Edit/Duplicate Event Modal */}
      {eventModalData && (
        <EventCreateModal
          dateKey={eventModalData.dateKey}
          event={eventModalData.event}
          isDuplicate={eventModalData.isDuplicate}
          initialTimeRange={eventModalData.initialTimeRange}
          onClose={() => setEventModalData(null)}
        />
      )}

      {/* Export Time Entries Modal */}
      {showExportModal && (
        <ExportTimeEntriesModal onClose={() => setShowExportModal(false)} />
      )}
    </PageContent>
  );
}
