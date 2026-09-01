import { useState, useEffect, useCallback } from 'react';
import { X, AlertTriangle, Sparkles, Copy } from 'lucide-react';
import { en as chrono } from 'chrono-node';
import { format } from 'date-fns';
import { useCalendarStore } from '../stores/useCalendarStore';
import { toast } from '../stores/useToastStore';
import { REMINDER_OPTIONS } from '../services/eventReminders';
import { detectConflicts, formatConflictMessage, getConflictDetails } from '../utils/conflictDetection';
import { EVENT_COLOR_CATEGORIES } from '../utils/eventColors';
import type { CalendarEvent, EventColorCategory } from '../types';
import { MeetingNotesButton } from './calendar/MeetingNotesButton';
import type { InitialEventTimeRange } from '../utils/scheduleDeepLink';

interface EventCreateModalProps {
  dateKey: string;
  event?: CalendarEvent | null;
  onClose: () => void;
  /** When true, opens as a duplicate of the event (new event with same details) */
  isDuplicate?: boolean;
  /** Pre-filled time from a /schedule?hour= deep link. */
  initialTimeRange?: InitialEventTimeRange;
}

/**
 * EventCreateModal Component
 * Create or edit calendar events
 * Simplified version matching TimeEntryCalendar aesthetic
 */
export function EventCreateModal({
  dateKey,
  event,
  onClose,
  isDuplicate = false,
  initialTimeRange,
}: EventCreateModalProps) {
  const { addEvent, updateEvent, events, calendars } = useCalendarStore();

  // Natural language input state
  const [nlInput, setNlInput] = useState('');
  const [nlPreview, setNlPreview] = useState<string | null>(null);

  // Convert standard date key (YYYY-M-D) to ISO format for date input (YYYY-MM-DD)
  const toISODate = (standardKey: string): string => {
    const [year, month, day] = standardKey.split('-').map(Number);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Convert ISO date (YYYY-MM-DD) to standard date key (YYYY-M-D)
  const toStandardKey = (isoDate: string): string => {
    const [year, month, day] = isoDate.split('-').map(Number);
    return `${year}-${month}-${day}`;
  };

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(toISODate(dateKey));
  const [isAllDay, setIsAllDay] = useState(true);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [reminders, setReminders] = useState<number[]>([]);
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [recurrenceEndType, setRecurrenceEndType] = useState<'never' | 'after' | 'until'>('never');
  const [recurrenceEndCount, setRecurrenceEndCount] = useState(10);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [colorCategory, setColorCategory] = useState<EventColorCategory>('default');
  const [calendarId, setCalendarId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState<CalendarEvent[]>([]);

  // Natural language event parsing
  const handleNLInput = useCallback((text: string) => {
    setNlInput(text);
    if (!text.trim()) {
      setNlPreview(null);
      return;
    }

    try {
      const results = chrono.parse(text);
      if (results.length > 0) {
        const parsed = results[0];
        const parsedDate = parsed.start.date();

        // Extract title: text before the date/time phrase
        const titlePart = text.slice(0, parsed.index).trim()
          || text.replace(parsed.text, '').trim()
          || text.trim();

        // Set title if we got something meaningful
        if (titlePart) {
          setTitle(titlePart);
        }

        // Set date
        setStartDate(format(parsedDate, 'yyyy-MM-dd'));

        // Set time if available
        if (parsed.start.isCertain('hour')) {
          const startStr = format(parsedDate, 'HH:mm');
          setStartTime(startStr);
          setIsAllDay(false);

          // Calculate end time from duration or default to 1 hour
          if (parsed.end) {
            const endDate = parsed.end.date();
            setEndTime(format(endDate, 'HH:mm'));
          } else {
            const endDate = new Date(parsedDate.getTime() + 60 * 60 * 1000);
            setEndTime(format(endDate, 'HH:mm'));
          }
        }

        setNlPreview(`"${titlePart}" 于 ${format(parsedDate, 'MMM d')}${parsed.start.isCertain('hour') ? ` 在 ${format(parsedDate, 'h:mm a')}` : ''}`);
      } else {
        setNlPreview(null);
      }
    } catch {
      setNlPreview(null);
    }
  }, []);

  // Initialize form when editing existing event or duplicating
  useEffect(() => {
    if (event) {
      setTitle(isDuplicate ? `${event.title}（副本）` : event.title);
      setDescription(event.description || '');
      setStartDate(toISODate(dateKey));
      setIsAllDay(event.isAllDay !== false);
      setStartTime(event.startTime || '09:00');
      setEndTime(event.endTime || '10:00');
      setEndDate(event.endDate || '');
      setLocation(event.location || '');
      setReminders(event.reminders || []);
      setColorCategory(event.colorCategory || 'default');
      setCalendarId(event.calendarId || '');

      if (event.recurrence) {
        setRecurrenceType(event.recurrence.frequency);
        setRecurrenceInterval(event.recurrence.interval || 1);
        setWeeklyDays(event.recurrence.daysOfWeek || []);
        setMonthlyDay(event.recurrence.dayOfMonth || 1);
        setRecurrenceEndType(event.recurrence.endType);
        setRecurrenceEndCount(event.recurrence.endCount || 10);
        setRecurrenceEndDate(event.recurrence.endDate || '');
      }
    }
  }, [event, dateKey, isDuplicate]);

  useEffect(() => {
    if (event || !initialTimeRange) return;
    setIsAllDay(false);
    setStartTime(initialTimeRange.startTime);
    setEndTime(initialTimeRange.endTime);
    setEndDate(initialTimeRange.endDate || '');
  }, [event, initialTimeRange]);

  // Check for conflicts when time changes
  useEffect(() => {
    // Skip conflict detection for all-day events
    if (isAllDay) {
      setConflicts([]);
      return;
    }

    // Get the standard date key from the ISO start date
    const effectiveDateKey = toStandardKey(startDate);

    // Get existing events for this date
    const existingEvents = events[effectiveDateKey] || [];

    // Detect conflicts
    const foundConflicts = detectConflicts(
      effectiveDateKey,
      startTime,
      endTime,
      existingEvents,
      event?.id // Exclude current event when editing
    );

    setConflicts(foundConflicts);
  }, [startDate, startTime, endTime, isAllDay, events, event]);

  const handleSave = async () => {
    setError('');

    // Validation
    if (!title.trim()) {
      setError('事件标题为必填项');
      return;
    }

    const endsOnLaterDate = Boolean(endDate && endDate > startDate);
    if (!isAllDay && !endsOnLaterDate && startTime >= endTime) {
      setError('结束时间必须晚于开始时间');
      return;
    }

    setSaving(true);
    try {
      const eventData: Partial<CalendarEvent> = {
        title: title.trim(),
        description: description.trim() || undefined,
        isAllDay,
        startTime: !isAllDay ? startTime : undefined,
        endTime: !isAllDay ? endTime : undefined,
        endDate: endDate || undefined,
        location: location.trim() || undefined,
        reminders: reminders.length > 0 ? reminders : undefined,
        colorCategory: colorCategory !== 'default' ? colorCategory : undefined,
        calendarId: calendarId || undefined,
      };

      // Add recurrence if configured (for both new events and edits)
      if (recurrenceType !== 'none') {
        eventData.recurrence = {
          frequency: recurrenceType,
          interval: recurrenceInterval,
          endType: recurrenceEndType,
          endCount: recurrenceEndType === 'after' ? recurrenceEndCount : undefined,
          endDate: recurrenceEndType === 'until' ? recurrenceEndDate : undefined,
        };

        if (recurrenceType === 'weekly' && weeklyDays.length > 0) {
          eventData.recurrence.daysOfWeek = weeklyDays;
        }

        if (recurrenceType === 'monthly') {
          eventData.recurrence.dayOfMonth = monthlyDay;
        }
      } else {
        // Explicitly remove recurrence when set to none
        eventData.recurrence = undefined;
      }

      // Get the standard date key from the ISO start date
      const effectiveDateKey = toStandardKey(startDate);

      if (event && !isDuplicate) {
        // Update existing event
        updateEvent(effectiveDateKey, event.id, eventData.title!, eventData.description, eventData);
        toast.success(`已更新日程「${eventData.title}」`);
      } else {
        // Create new event (or duplicate)
        addEvent(effectiveDateKey, eventData.title!, eventData.description, eventData);
        toast.success(`已创建日程「${eventData.title}」`);
      }

      onClose();
    } catch (err) {
      console.error('Failed to save event:', err);
      setError('保存事件失败，请重试。');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-light dark:bg-surface-dark rounded-button border border-border-light dark:border-border-dark shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark sticky top-0 bg-surface-light dark:bg-surface-dark z-10">
          <h2 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            {isDuplicate ? '复制事件' : event ? '编辑事件' : '创建事件'}
          </h2>
          <div className="flex items-center gap-1">
            {event && !isDuplicate && (
              <button
                onClick={() => {
                  onClose();
                  // Re-open as duplicate by triggering a custom event
                  window.dispatchEvent(new CustomEvent('calendar:duplicate-event', {
                    detail: { event, dateKey },
                  }));
                }}
                className="p-1 rounded-button hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated text-text-light-secondary dark:text-text-dark-secondary transition-all duration-standard ease-smooth"
                aria-label="复制事件"
                title="复制事件"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-button hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated text-text-light-secondary dark:text-text-dark-secondary transition-all duration-standard ease-smooth"
              aria-label="关闭弹窗"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {error && (
            <div className="px-3 py-2 bg-status-error/10 border border-status-error/20 rounded-button text-status-error text-xs">
              {error}
            </div>
          )}

          {/* Natural Language Input (only for new events) */}
          {!event && (
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent-primary" />
                快速创建
              </label>
              <input
                type="text"
                value={nlInput}
                onChange={(e) => handleNLInput(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary placeholder-text-light-secondary dark:placeholder-text-dark-secondary"
                placeholder='e.g. "Meeting with John tomorrow at 3pm for 1 hour"'
              />
              {nlPreview && (
                <div className="mt-1 text-[10px] text-accent-green">
                  解析结果：{nlPreview}
                </div>
              )}
            </div>
          )}

          {/* Conflict Warning */}
          {conflicts.length > 0 && (
            <div className="px-3 py-2 bg-status-warning/10 border border-status-warning/30 rounded">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-status-warning flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-status-warning mb-0.5">
                    {formatConflictMessage(conflicts)}
                  </p>
                  {conflicts.length <= 3 && (
                    <ul className="text-xs text-text-light-secondary dark:text-text-dark-secondary space-y-0.5">
                      {getConflictDetails(conflicts).map((detail, index) => (
                        <li key={index}>• {detail}</li>
                      ))}
                    </ul>
                  )}
                  <p className="text-[10px] text-text-light-secondary dark:text-text-dark-secondary mt-1">
                    你仍然可以保存此事件，但建议调整时间以避免重叠。
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Start Date */}
          <div>
            <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
              日期
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary"
            />
          </div>

          {/* Title */}
          <div>
            <label
              htmlFor="event-title"
              className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5"
            >
              事件标题
            </label>
            <input
              id="event-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary placeholder-text-light-secondary dark:placeholder-text-dark-secondary"
              placeholder="团队会议、研讨会等"
              autoFocus
            />
          </div>

          {/* Color Category */}
          <div>
            <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
              颜色类别
            </label>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_COLOR_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setColorCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-button text-xs transition-all duration-standard ease-smooth ${
                    colorCategory === cat.id
                      ? 'ring-2 ring-offset-1 ring-text-light-primary dark:ring-text-dark-primary'
                      : 'hover:opacity-80'
                  }`}
                  style={{ backgroundColor: cat.hex, color: '#fff' }}
                  title={cat.label}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar Selector */}
          {calendars.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
                日历
              </label>
              <select
                value={calendarId}
                onChange={(e) => setCalendarId(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary"
              >
                <option value="">无日历</option>
                {calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label
              htmlFor="event-description"
              className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5"
            >
              描述（可选）
            </label>
            <textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-2.5 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary placeholder-text-light-secondary dark:placeholder-text-dark-secondary resize-none"
              placeholder="添加此事件的详细信息…"
            />
          </div>

          {/* All-Day Toggle */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                className="rounded w-3.5 h-3.5"
              />
              <span className="text-xs text-text-light-primary dark:text-text-dark-primary">全天事件</span>
            </label>
          </div>

          {/* Time Inputs */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="event-start-time" className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
                  开始时间
                </label>
                <input
                  type="time"
                  id="event-start-time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary"
                />
              </div>
              <div>
                <label htmlFor="event-end-time" className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
                  结束时间
                </label>
                <input
                  type="time"
                  id="event-end-time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary"
                />
              </div>
            </div>
          )}

          {/* End Date (Multi-day events) */}
          <div>
            <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
              结束日期（可选 - 用于多天事件）
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full px-2.5 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary"
            />
            {endDate && (
              <p className="text-[10px] text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
                事件从 {toStandardKey(startDate)} 持续到 {endDate}
              </p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
              地点（可选）
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary placeholder-text-light-secondary dark:placeholder-text-dark-secondary"
              placeholder="会议室、视频会议链接、地址…"
            />
          </div>

          {/* Recurrence */}
          <>
            <div>
              <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
                重复
              </label>
              <select
                value={recurrenceType}
                onChange={(e) => setRecurrenceType(e.target.value as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly')}
                className="w-full px-2.5 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary"
              >
                <option value="none">不重复</option>
                <option value="daily">每天</option>
                <option value="weekly">每周</option>
                <option value="monthly">每月</option>
                <option value="yearly">每年</option>
              </select>
            </div>

            {/* Recurrence Interval */}
            {recurrenceType !== 'none' && (
              <div>
                <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
                  每
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-2.5 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary"
                  />
                  <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                    {recurrenceType === 'daily' ? '天' :
                     recurrenceType === 'weekly' ? '周' :
                     recurrenceType === 'monthly' ? '个月' :
                     '年'}
                  </span>
                </div>
              </div>
            )}

              {/* Weekly days selection */}
              {recurrenceType === 'weekly' && (
                <div>
                  <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
                    重复于
                  </label>
                  <div className="grid grid-cols-7 gap-1.5">
                    {['日', '一', '二', '三', '四', '五', '六'].map((day, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          if (weeklyDays.includes(index)) {
                            setWeeklyDays(weeklyDays.filter(d => d !== index));
                          } else {
                            setWeeklyDays([...weeklyDays, index].sort());
                          }
                        }}
                        className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                          weeklyDays.includes(index)
                            ? 'bg-accent-primary text-white'
                            : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-secondary dark:text-text-dark-secondary hover:bg-accent-primary/20'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly day selection */}
              {recurrenceType === 'monthly' && (
                <div>
                  <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
                    每月日期
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={monthlyDay}
                    onChange={(e) => setMonthlyDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full px-2.5 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary"
                  />
                </div>
              )}

              {/* Recurrence end condition */}
              {recurrenceType !== 'none' && (
                <div>
                  <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
                    结束
                  </label>
                  <select
                    value={recurrenceEndType}
                    onChange={(e) => setRecurrenceEndType(e.target.value as typeof recurrenceEndType)}
                    className="w-full px-2.5 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary"
                  >
                    <option value="never">从不</option>
                    <option value="after">之后</option>
                    <option value="until">在指定日期</option>
                  </select>

                  {recurrenceEndType === 'after' && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={recurrenceEndCount}
                        onChange={(e) => setRecurrenceEndCount(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 px-2.5 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary"
                      />
                      <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                        次
                      </span>
                    </div>
                  )}

                  {recurrenceEndType === 'until' && (
                    <input
                      type="date"
                      value={recurrenceEndDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                      className="mt-1.5 w-full px-2.5 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary"
                    />
                  )}
                </div>
              )}
          </>

          {/* Reminders */}
          <div>
            <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
              提醒（可选）
            </label>
            <div className="space-y-1">
              {REMINDER_OPTIONS.map((option) => (
                <label key={option.value} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminders.includes(option.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setReminders([...reminders, option.value].sort((a, b) => a - b));
                      } else {
                        setReminders(reminders.filter((r) => r !== option.value));
                      }
                    }}
                    className="rounded w-3.5 h-3.5"
                  />
                  <span className="text-text-light-secondary dark:text-text-dark-secondary">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Meeting Notes (only for existing events, not duplicates) */}
          {event && !isDuplicate && (
            <MeetingNotesButton
              eventId={event.id}
              eventTitle={event.title}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-light dark:border-border-dark sticky bottom-0 bg-surface-light dark:bg-surface-dark">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-medium text-text-light-primary dark:text-text-dark-primary bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button hover:bg-surface-light dark:hover:bg-surface-dark-elevated transition-all duration-standard ease-smooth disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-medium text-white bg-accent-primary rounded-button hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? '保存中…' : event ? '保存更改' : '创建事件'}
          </button>
        </div>
      </div>
    </div>
  );
}
