import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Plus, Target, Flame, Archive, RotateCcw, Trash2, Edit2,
  Check, MoreVertical, ChevronDown, ChevronRight, BarChart3, BookTemplate,
  Grid3X3, Lock, Bell, BellOff, Link2, Snowflake,
  TrendingUp, Search, MessageSquare, Play, Clock, Repeat, X, Timer, Sunrise, Sun, Moon,
} from 'lucide-react';
import { useHabitStore } from '../stores/useHabitStore';
import { convertHabitToTask } from '../services/habitTaskBridge';
import { PageContent } from '../components/PageContent';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  HabitHeatmap,
  HabitStats,
  HabitTemplatePicker,
  useCompletionAnimation,
  useHabitReminders,
  ConfettiEffect,
  StreakBump,
  HABIT_ANIMATION_STYLES,
  HabitAnalytics,
  HabitJournal,
  HabitStreakCalendar,
  RoutineBuilder,
  RoutineRunner,
} from '../components/habits';
import type { HabitTemplate } from '../components/habits';
import { useRoutineStore, type Routine } from '../stores/useRoutineStore';
import { toast } from '../stores/useToastStore';
import { ROUTINE_TEMPLATES, type RoutineTemplate } from '../data/routineTemplates';
import type { Habit, HabitFrequency, HabitCategory, HabitDifficulty } from '../types';

// Helper to get date key in YYYY-M-D format
function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

// Check if habit should be tracked today
function shouldTrackToday(habit: Habit): boolean {
  const today = new Date();
  const dayOfWeek = today.getDay();

  switch (habit.frequency) {
    case 'daily':
      return true;
    case 'weekdays':
      return dayOfWeek >= 1 && dayOfWeek <= 5;
    case 'weekends':
      return dayOfWeek === 0 || dayOfWeek === 6;
    case 'specific-days':
      return habit.targetDays?.includes(dayOfWeek) ?? false;
    case 'times-per-week':
      return true;
    default:
      return true;
  }
}

// Frequency display text
function getFrequencyLabel(habit: Habit): string {
  switch (habit.frequency) {
    case 'daily':
      return '每天';
    case 'weekdays':
      return '工作日';
    case 'weekends':
      return '周末';
    case 'specific-days': {
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return habit.targetDays?.map((d) => days[d]).join(', ') ?? '';
    }
    case 'times-per-week':
      return `每周 ${habit.timesPerWeek} 次`;
    default:
      return '';
  }
}

// Category configuration
const CATEGORY_CONFIG: Record<HabitCategory, { label: string; icon: string }> = {
  health: { label: '健康', icon: '🏥' },
  productivity: { label: '效率', icon: '⚡' },
  learning: { label: '学习', icon: '📖' },
  social: { label: '社交', icon: '👥' },
  mindfulness: { label: '正念', icon: '🧘' },
  fitness: { label: '健身', icon: '💪' },
  nutrition: { label: '营养', icon: '🥗' },
  creative: { label: '创意', icon: '🎨' },
  finance: { label: '财务', icon: '💰' },
  uncategorized: { label: '未分类', icon: '📌' },
};

const ALL_CATEGORIES: HabitCategory[] = [
  'health', 'productivity', 'learning', 'social', 'mindfulness',
  'fitness', 'nutrition', 'creative', 'finance', 'uncategorized',
];

// Difficulty configuration
const DIFFICULTY_CONFIG: Record<HabitDifficulty, { label: string; color: string }> = {
  trivial: { label: '轻松', color: '#9ca3af' },
  easy: { label: '简单', color: '#22c55e' },
  medium: { label: '中等', color: '#f97316' },
  hard: { label: '困难', color: '#ef4444' },
};

const ALL_DIFFICULTIES: HabitDifficulty[] = ['trivial', 'easy', 'medium', 'hard'];

// Default colors for habits
const HABIT_COLORS = [
  '#06b6d4', '#8b5cf6', '#ec4899', '#f97316',
  '#22c55e', '#3b82f6', '#eab308', '#ef4444',
];

// Default icons for habits
const HABIT_ICONS = ['🎯', '💪', '📚', '🧘', '🏃', '💧', '🍎', '😴', '✍️', '🎨'];

// ─── Habit Modal ──────────────────────────────────────────

interface HabitModalProps {
  habit?: Habit;
  initialTemplate?: HabitTemplate;
  allHabits: Habit[];
  onClose: () => void;
  onSave: (data: Omit<Habit, 'id' | 'createdAt' | 'currentStreak' | 'longestStreak' | 'totalCompletions' | 'totalXp' | 'order' | 'freezesUsed'>) => void;
}

function HabitModal({ habit, initialTemplate, allHabits, onClose, onSave }: HabitModalProps) {
  const [title, setTitle] = useState(habit?.title ?? initialTemplate?.title ?? '');
  const [description, setDescription] = useState(habit?.description ?? initialTemplate?.description ?? '');
  const [icon, setIcon] = useState(habit?.icon ?? initialTemplate?.icon ?? '🎯');
  const [color, setColor] = useState(habit?.color ?? initialTemplate?.color ?? HABIT_COLORS[0]);
  const [frequency, setFrequency] = useState<HabitFrequency>(habit?.frequency ?? initialTemplate?.frequency ?? 'daily');
  const [category, setCategory] = useState<HabitCategory>(habit?.category ?? initialTemplate?.category ?? 'uncategorized');
  const [difficulty, setDifficulty] = useState<HabitDifficulty>(habit?.difficulty ?? 'easy');
  const [targetDays, setTargetDays] = useState<number[]>(habit?.targetDays ?? []);
  const [timesPerWeek, setTimesPerWeek] = useState(habit?.timesPerWeek ?? initialTemplate?.timesPerWeek ?? 3);
  const [reminderEnabled, setReminderEnabled] = useState(habit?.reminder?.enabled ?? false);
  const [reminderTime, setReminderTime] = useState(habit?.reminder?.time ?? '09:00');
  const [requiredHabitIds, setRequiredHabitIds] = useState<string[]>(habit?.requiredHabitIds ?? []);
  const [freezesPerWeek, setFreezesPerWeek] = useState(habit?.freezesPerWeek ?? 1);
  const [trackViaPomodoro, setTrackViaPomodoro] = useState(habit?.trackViaPomodoro ?? false);
  const [pomodoroSessionsRequired, setPomodoroSessionsRequired] = useState(habit?.pomodoroSessionsRequired ?? 1);

  // Available habits for dependency selection (exclude self)
  const availableForDep = useMemo(
    () => allHabits.filter((h) => !h.archivedAt && h.id !== habit?.id),
    [allHabits, habit?.id]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      icon,
      color,
      category,
      difficulty,
      frequency,
      targetDays: frequency === 'specific-days' ? targetDays : undefined,
      timesPerWeek: frequency === 'times-per-week' ? timesPerWeek : undefined,
      reminder: reminderEnabled ? { enabled: true, time: reminderTime } : undefined,
      requiredHabitIds: requiredHabitIds.length > 0 ? requiredHabitIds : undefined,
      freezesPerWeek,
      trackViaPomodoro: trackViaPomodoro || undefined,
      pomodoroSessionsRequired: trackViaPomodoro ? pomodoroSessionsRequired : undefined,
      projectIds: habit?.projectIds ?? [],
    });
  };

  const toggleDay = (day: number) => {
    setTargetDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-light dark:bg-surface-dark-elevated rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
              {habit ? '编辑习惯' : '新建习惯'}
            </h2>

            {/* Title */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：冥想 10 分钟"
                className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                autoFocus
                required
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="这个习惯为什么对你重要…"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
              />
            </div>

            {/* Category */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                分类
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as HabitCategory)}
                className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                {ALL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Icon */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                图标
              </label>
              <div className="flex flex-wrap gap-2">
                {HABIT_ICONS.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setIcon(i)}
                    className={`w-10 h-10 text-xl rounded-lg flex items-center justify-center transition-all ${
                      icon === i
                        ? 'bg-accent-primary/20 ring-2 ring-accent-primary'
                        : 'bg-surface-light-alt dark:bg-surface-dark hover:bg-accent-primary/10'
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                颜色
              </label>
              <div className="flex flex-wrap gap-2">
                {HABIT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full transition-all ${
                      color === c ? 'ring-2 ring-offset-2 ring-accent-primary' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Frequency */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                频率
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as HabitFrequency)}
                className="w-full px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="daily">每天</option>
                <option value="weekdays">仅工作日</option>
                <option value="weekends">仅周末</option>
                <option value="specific-days">指定星期</option>
                <option value="times-per-week">每周 X 次</option>
              </select>
            </div>

            {/* Specific days selector */}
            {frequency === 'specific-days' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  选择星期
                </label>
                <div className="flex gap-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`w-10 h-10 rounded-full text-sm font-medium transition-all ${
                        targetDays.includes(idx)
                          ? 'bg-accent-primary text-white'
                          : 'bg-surface-light-alt dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-accent-primary/20'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Times per week */}
            {frequency === 'times-per-week' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  每周次数
                </label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={timesPerWeek}
                  onChange={(e) => setTimesPerWeek(Number(e.target.value))}
                  className="w-24 px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
              </div>
            )}

            {/* Difficulty */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                难度
              </label>
              <div className="flex gap-2">
                {ALL_DIFFICULTIES.map((d) => {
                  const cfg = DIFFICULTY_CONFIG[d];
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(d)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                        difficulty === d
                          ? 'ring-2 ring-offset-1 ring-accent-primary'
                          : 'border-border-light dark:border-border-dark'
                      }`}
                      style={difficulty === d ? { borderColor: cfg.color, color: cfg.color } : undefined}
                    >
                      <div>{cfg.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reminder */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                  每日提醒
                </label>
                <button
                  type="button"
                  onClick={() => setReminderEnabled(!reminderEnabled)}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors ${
                    reminderEnabled
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'bg-surface-light-alt dark:bg-surface-dark text-text-light-tertiary dark:text-text-dark-tertiary'
                  }`}
                >
                  {reminderEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                  {reminderEnabled ? '开' : '关'}
                </button>
              </div>
              {reminderEnabled && (
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-32 px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
              )}
            </div>

            {/* Streak Freeze */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                <Snowflake className="w-3.5 h-3.5 inline mr-1" />
                每周冻结次数
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={7}
                  value={freezesPerWeek}
                  onChange={(e) => setFreezesPerWeek(Number(e.target.value))}
                  className="w-20 px-3 py-2 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
                <span className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                  错过一天时自动应用，以保留连续记录
                </span>
              </div>
            </div>

            {/* Pomodoro Integration */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
                  <Timer className="w-3.5 h-3.5 inline mr-1" aria-hidden />
                  通过番茄钟记录
                </label>
                <button
                  type="button"
                  onClick={() => setTrackViaPomodoro(!trackViaPomodoro)}
                  className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                    trackViaPomodoro
                      ? 'bg-status-error/10 text-status-error'
                      : 'bg-surface-light-alt dark:bg-surface-dark text-text-light-tertiary dark:text-text-dark-tertiary'
                  }`}
                >
                  {trackViaPomodoro ? '开' : '关'}
                </button>
              </div>
              {trackViaPomodoro && (
                <div className="flex items-center gap-2">
                  <label className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                    所需会话数：
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={pomodoroSessionsRequired}
                    onChange={(e) => setPomodoroSessionsRequired(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary text-sm"
                  />
                </div>
              )}
            </div>

            {/* Dependencies */}
            {availableForDep.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  <Link2 className="w-3.5 h-3.5 inline mr-1" />
                  前置习惯（必须先完成）
                </label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {availableForDep.map((h) => (
                    <label key={h.id} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                      <input
                        type="checkbox"
                        checked={requiredHabitIds.includes(h.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setRequiredHabitIds((prev) => [...prev, h.id]);
                          } else {
                            setRequiredHabitIds((prev) => prev.filter((id) => id !== h.id));
                          }
                        }}
                        className="rounded border-border-light dark:border-border-dark accent-accent-primary"
                      />
                      <span>{h.icon}</span>
                      <span className="text-text-light-primary dark:text-text-dark-primary">{h.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-border-light dark:border-border-dark">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-alt dark:hover:bg-surface-dark rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
            >
              {habit ? '保存更改' : '创建习惯'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Habit Card ───────────────────────────────────────────

interface HabitCardProps {
  habit: Habit;
  isCompletedToday: boolean;
  isLocked: boolean;
  blockingNames: string[];
  onToggle: (note?: string) => void;
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onConvertToTask: () => void;
  onViewStats: () => void;
  onViewJournal: () => void;
  onViewStreakCalendar: () => void;
  weekProgress: boolean[];
  showConfetti: boolean;
  animatedStreak: boolean;
  freezesRemaining: number;
  isFrozenToday: boolean;
  completionNote?: string;
}

function HabitCard({
  habit,
  isCompletedToday,
  isLocked,
  blockingNames,
  onToggle,
  onEdit,
  onArchive,
  onDelete,
  onConvertToTask,
  onViewStats,
  onViewJournal,
  onViewStreakCalendar,
  weekProgress,
  showConfetti,
  animatedStreak,
  freezesRemaining,
  isFrozenToday,
  completionNote,
}: HabitCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');
  const trackToday = shouldTrackToday(habit);
  const canToggle = trackToday && !isLocked;

  return (
    <div
      className="group bg-surface-light dark:bg-surface-dark-elevated rounded-xl p-4 border border-border-light dark:border-border-dark hover:border-accent-primary/30 transition-all"
      style={{ borderLeftColor: habit.color, borderLeftWidth: 4 }}
    >
      <div className="flex items-start gap-4">
        {/* Check button */}
        <div className="relative">
          <button
            onClick={() => {
              if (isCompletedToday) {
                // Uncompleting — no note needed
                onToggle();
              } else if (canToggle) {
                // Show note input briefly then complete
                setShowNoteInput(true);
              }
            }}
            disabled={!canToggle}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all shrink-0 ${
              isCompletedToday
                ? 'bg-status-success text-white'
                : isLocked
                ? 'bg-surface-light-alt dark:bg-surface-dark opacity-50 cursor-not-allowed border-2 border-status-warning/50'
                : trackToday
                ? 'bg-surface-light-alt dark:bg-surface-dark hover:bg-accent-primary/20 border-2 border-border-light dark:border-border-dark'
                : 'bg-surface-light-alt dark:bg-surface-dark opacity-50 cursor-not-allowed'
            }`}
            style={isCompletedToday ? { animation: 'habit-check-pop 0.3s ease-out' } : undefined}
            title={
              isLocked
                ? `先完成：${blockingNames.join(', ')}`
                : trackToday
                ? isCompletedToday ? '标记为未完成' : '标记为完成'
                : '今日未安排'
            }
          >
            {isCompletedToday ? (
              <Check className="w-5 h-5" style={{ animation: 'habit-check-in 0.3s ease-out' }} />
            ) : isLocked ? (
              <Lock className="w-4 h-4 text-status-warning" />
            ) : (
              <span>{habit.icon}</span>
            )}
          </button>
          {showConfetti && <ConfettiEffect onDone={() => {}} />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-text-light-primary dark:text-text-dark-primary">
                {habit.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-text-light-tertiary dark:text-text-dark-tertiary flex-wrap">
                <span>{getFrequencyLabel(habit)}</span>
                {habit.category !== 'uncategorized' && (
                  <>
                    <span className="text-border-light dark:text-border-dark">|</span>
                    <span>{CATEGORY_CONFIG[habit.category].icon} {CATEGORY_CONFIG[habit.category].label}</span>
                  </>
                )}
                {habit.difficulty && habit.difficulty !== 'easy' && (
                  <>
                    <span className="text-border-light dark:text-border-dark">|</span>
                    <span style={{ color: DIFFICULTY_CONFIG[habit.difficulty].color }}>
                      {DIFFICULTY_CONFIG[habit.difficulty].label}
                    </span>
                  </>
                )}
                {habit.trackViaPomodoro && (
                  <>
                    <span className="text-border-light dark:text-border-dark">|</span>
                    <Timer className="w-3.5 h-3.5 text-status-error" aria-label={`通过番茄钟记录（${habit.pomodoroSessionsRequired ?? 1} 次会话）`} />
                  </>
                )}
                {isLocked && blockingNames.length > 0 && (
                  <span className="text-status-warning text-xs flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    需要：{blockingNames.join(', ')}
                  </span>
                )}
              </div>
            </div>

            {/* Stats + Menu */}
            <div className="flex items-center gap-3">
              {habit.currentStreak > 0 && (
                <div className="flex items-center gap-1 text-accent-orange">
                  <Flame className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {animatedStreak ? <StreakBump streak={habit.currentStreak} /> : habit.currentStreak}
                  </span>
                </div>
              )}

              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 rounded hover:bg-surface-light-alt dark:hover:bg-surface-dark opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
                </button>

                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 bg-surface-light dark:bg-surface-dark-elevated rounded-lg shadow-lg border border-border-light dark:border-border-dark py-1 min-w-[140px]">
                      <button
                        onClick={() => { setShowMenu(false); onViewStats(); }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-surface-light-alt dark:hover:bg-surface-dark flex items-center gap-2"
                      >
                        <BarChart3 className="w-4 h-4" />
                        统计
                      </button>
                      <button
                        onClick={() => { setShowMenu(false); onViewJournal(); }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-surface-light-alt dark:hover:bg-surface-dark flex items-center gap-2"
                      >
                        <MessageSquare className="w-4 h-4" />
                        日记
                      </button>
                      <button
                        onClick={() => { setShowMenu(false); onViewStreakCalendar(); }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-surface-light-alt dark:hover:bg-surface-dark flex items-center gap-2"
                      >
                        <Target className="w-4 h-4" />
                        连续日历
                      </button>
                      <button
                        onClick={() => { setShowMenu(false); onEdit(); }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-surface-light-alt dark:hover:bg-surface-dark flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        编辑
                      </button>
                      {!habit.linkedTaskId && (
                        <button
                          onClick={() => { setShowMenu(false); onConvertToTask(); }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-surface-light-alt dark:hover:bg-surface-dark flex items-center gap-2"
                        >
                          <Link2 className="w-4 h-4" />
                          转换为任务
                        </button>
                      )}
                      {habit.linkedTaskId && (
                        <div className="px-3 py-2 text-xs text-accent-primary flex items-center gap-2">
                          <Link2 className="w-3.5 h-3.5" />
                          已关联任务
                        </div>
                      )}
                      <button
                        onClick={() => { setShowMenu(false); onArchive(); }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-surface-light-alt dark:hover:bg-surface-dark flex items-center gap-2"
                      >
                        <Archive className="w-4 h-4" />
                        归档
                      </button>
                      <button
                        onClick={() => { setShowMenu(false); onDelete(); }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-surface-light-alt dark:hover:bg-surface-dark flex items-center gap-2"
                      >
                        <Archive className="w-4 h-4" />
                        删除（移入归档）
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Week progress + freeze indicator */}
          <div className="flex items-center gap-3 mt-3">
            <div className="flex gap-1">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                <div
                  key={idx}
                  className={`w-6 h-6 rounded text-xs flex items-center justify-center ${
                    weekProgress[idx]
                      ? 'bg-status-success text-white'
                      : 'bg-surface-light-alt dark:bg-surface-dark text-text-light-tertiary dark:text-text-dark-tertiary'
                  }`}
                  title={['周一', '周二', '周三', '周四', '周五', '周六', '周日'][idx]}
                >
                  {day}
                </div>
              ))}
            </div>
            {/* Freeze indicator */}
            {(freezesRemaining > 0 || isFrozenToday) && (
              <div
                className="flex items-center gap-1 text-xs"
                title={isFrozenToday ? '今日连续冻结已生效' : `本周剩余 ${freezesRemaining} 次冻结`}
              >
                <Snowflake className={`w-3.5 h-3.5 ${isFrozenToday ? 'text-accent-cyan' : 'text-accent-cyan/50'}`} />
                <span className={isFrozenToday ? 'text-accent-cyan' : 'text-text-light-tertiary dark:text-text-dark-tertiary'}>
                  {isFrozenToday ? '已冻结' : `${freezesRemaining}`}
                </span>
              </div>
            )}
          </div>

          {/* Note input (shown when completing) */}
          {showNoteInput && !isCompletedToday && (
            <div className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="添加备注（可选）…"
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onToggle(noteText.trim() || undefined);
                    setShowNoteInput(false);
                    setNoteText('');
                  } else if (e.key === 'Escape') {
                    onToggle();
                    setShowNoteInput(false);
                    setNoteText('');
                  }
                }}
              />
              <button
                onClick={() => {
                  onToggle(noteText.trim() || undefined);
                  setShowNoteInput(false);
                  setNoteText('');
                }}
                className="px-3 py-1.5 text-sm bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
              >
                完成
              </button>
              <button
                onClick={() => {
                  onToggle();
                  setShowNoteInput(false);
                  setNoteText('');
                }}
                className="px-2 py-1.5 text-xs text-text-light-tertiary dark:text-text-dark-tertiary hover:text-text-light-primary dark:hover:text-text-dark-primary"
              >
                跳过
              </button>
            </div>
          )}

          {/* Display completion note if exists */}
          {isCompletedToday && completionNote && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
              <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
              <span className="italic">{completionNote}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Category Section (collapsible) ──────────────────────

interface CategorySectionProps {
  category: HabitCategory;
  habits: Habit[];
  renderHabit: (habit: Habit) => React.ReactNode;
}

function CategorySection({ category, habits, renderHabit }: CategorySectionProps) {
  const [collapsed, setCollapsed] = useState(false);
  const config = CATEGORY_CONFIG[category];

  return (
    <div className="mb-4">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 mb-2 text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        <span>{config.icon}</span>
        <span>{config.label}</span>
        <span className="text-text-light-tertiary dark:text-text-dark-tertiary">({habits.length})</span>
      </button>
      {!collapsed && (
        <div className="space-y-3 ml-2">
          {habits.map(renderHabit)}
        </div>
      )}
    </div>
  );
}

// ─── Habits Content (main body) ──────────────────────────

export function HabitsContent() {
  const habits = useHabitStore((s) => s.habits);
  const addHabit = useHabitStore((s) => s.addHabit);
  const updateHabit = useHabitStore((s) => s.updateHabit);
  const archiveHabit = useHabitStore((s) => s.archiveHabit);
  const restoreHabit = useHabitStore((s) => s.restoreHabit);
  const deleteHabit = useHabitStore((s) => s.deleteHabit);
  const toggleCompletion = useHabitStore((s) => s.toggleCompletion);
  const isCompletedOnDate = useHabitStore((s) => s.isCompletedOnDate);
  const getWeekProgress = useHabitStore((s) => s.getWeekProgress);
  const getTodayProgress = useHabitStore((s) => s.getTodayProgress);
  const isHabitUnlocked = useHabitStore((s) => s.isHabitUnlocked);
  const getBlockingHabits = useHabitStore((s) => s.getBlockingHabits);
  const getFreezesRemainingThisWeek = useHabitStore((s) => s.getFreezesRemainingThisWeek);
  const isDateFrozen = useHabitStore((s) => s.isDateFrozen);
  const completions = useHabitStore((s) => s.completions);
  const searchCompletionNotes = useHabitStore((s) => s.searchCompletionNotes);

  // Activate habit reminders
  useHabitReminders();

  // Tab state
  const [activeTab, setActiveTab] = useState<'habits' | 'routines'>('habits');

  // Routine state
  const routines = useRoutineStore((s) => s.routines);
  const createRoutine = useRoutineStore((s) => s.createRoutine);
  const deleteRoutine = useRoutineStore((s) => s.deleteRoutine);
  const getRoutineProgress = useRoutineStore((s) => s.getRoutineProgress);
  const addHabitToStore = useHabitStore((s) => s.addHabit);
  const [showRoutineBuilder, setShowRoutineBuilder] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [runningRoutine, setRunningRoutine] = useState<Routine | null>(null);
  const [showRoutineTemplatePicker, setShowRoutineTemplatePicker] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);
  const [habitToArchive, setHabitToArchive] = useState<string | null>(null);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<HabitTemplate | undefined>(undefined);
  const [statsHabit, setStatsHabit] = useState<Habit | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [showNoteSearch, setShowNoteSearch] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [journalHabit, setJournalHabit] = useState<Habit | null>(null);
  const [streakCalendarHabit, setStreakCalendarHabit] = useState<Habit | null>(null);

  const { triggerAnimation, clearAnimation, getAnimation } = useCompletionAnimation();

  // Inject animation styles
  useEffect(() => {
    const styleId = 'habit-animations';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = HABIT_ANIMATION_STYLES;
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById(styleId);
      if (el) el.remove();
    };
  }, []);

  const todayKey = getDateKey(new Date());
  const todayProgress = getTodayProgress();

  const activeHabits = useMemo(
    () => habits.filter((h) => !h.archivedAt).sort((a, b) => a.order - b.order),
    [habits]
  );

  const archivedHabits = useMemo(
    () => habits.filter((h) => h.archivedAt),
    [habits]
  );

  const totalStreakDays = useMemo(
    () => activeHabits.reduce((sum, h) => sum + h.currentStreak, 0),
    [activeHabits]
  );

  // Group habits by category
  const habitsByCategory = useMemo(() => {
    const groups = new Map<HabitCategory, Habit[]>();
    for (const habit of activeHabits) {
      const cat = habit.category ?? 'uncategorized';
      const list = groups.get(cat) ?? [];
      list.push(habit);
      groups.set(cat, list);
    }
    // Sort categories: populated ones first, in defined order
    const sorted: Array<{ category: HabitCategory; habits: Habit[] }> = [];
    for (const cat of ALL_CATEGORIES) {
      const list = groups.get(cat);
      if (list && list.length > 0) {
        sorted.push({ category: cat, habits: list });
      }
    }
    return sorted;
  }, [activeHabits]);

  const handleToggleCompletion = useCallback((habitId: string, note?: string) => {
    const wasCompleted = isCompletedOnDate(habitId, todayKey);
    toggleCompletion(habitId, todayKey, note);
    const habit = habits.find((item) => item.id === habitId);
    if (habit) {
      if (wasCompleted) {
        toast.info(`已取消「${habit.title}」的今日打卡`);
      } else {
        toast.success(`已完成「${habit.title}」`);
      }
    }

    if (!wasCompleted) {
      // Find updated streak after toggle
      if (habit) {
        // Trigger animation with current streak + 1 (optimistic)
        const newStreak = habit.currentStreak + 1;
        triggerAnimation(habitId, newStreak);
        setTimeout(() => clearAnimation(habitId), 2000);
      }
    }
  }, [isCompletedOnDate, todayKey, toggleCompletion, habits, triggerAnimation, clearAnimation]);

  // Note search results
  const noteSearchResults = useMemo(() => {
    if (!noteSearchQuery.trim()) return [];
    return searchCompletionNotes(noteSearchQuery);
  }, [noteSearchQuery, searchCompletionNotes]);

  const handleSaveHabit = (
    data: Omit<Habit, 'id' | 'createdAt' | 'currentStreak' | 'longestStreak' | 'totalCompletions' | 'totalXp' | 'order' | 'freezesUsed'>
  ) => {
    if (editingHabit) {
      updateHabit(editingHabit.id, data);
    } else {
      addHabit(data);
    }
    setShowModal(false);
    setEditingHabit(null);
    setSelectedTemplate(undefined);
  };

  const handleSelectTemplate = (template: HabitTemplate) => {
    setShowTemplatePicker(false);
    setSelectedTemplate(template);
    setEditingHabit(null);
    setShowModal(true);
  };

  const handleSelectTemplatePack = (templates: HabitTemplate[]) => {
    setShowTemplatePicker(false);
    for (const t of templates) {
      addHabit({
        title: t.title,
        description: t.description,
        icon: t.icon,
        color: t.color,
        frequency: t.frequency,
        category: t.category,
        timesPerWeek: t.timesPerWeek,
        difficulty: 'easy',
        freezesPerWeek: 1,
        projectIds: [],
      });
    }
  };

  const handleCreateFromRoutineTemplate = useCallback((template: RoutineTemplate) => {
    // Create habits from template, then create the routine linking them
    const createdHabitIds: string[] = [];
    for (const h of template.habits) {
      const id = addHabitToStore({
        title: h.title,
        description: h.description,
        icon: h.icon,
        color: h.color,
        category: h.category,
        frequency: h.frequency,
        difficulty: 'easy',
        freezesPerWeek: 1,
        projectIds: [],
      });
      createdHabitIds.push(id);
    }
    createRoutine({
      name: template.name,
      description: template.description,
      icon: template.icon,
      habitIds: createdHabitIds,
      timeOfDay: template.timeOfDay,
      estimatedMinutes: template.estimatedMinutes,
    });
    setShowRoutineTemplatePicker(false);
  }, [addHabitToStore, createRoutine]);

  const handleDeleteHabit = useCallback((id: string) => {
    setHabitToDelete(id);
  }, []);

  const confirmDeleteHabit = useCallback(() => {
    if (habitToDelete) {
      deleteHabit(habitToDelete);
      setHabitToDelete(null);
    }
  }, [habitToDelete, deleteHabit]);

  // Active-list "删除" is the recoverable archive step; permanent deletion is
  // only offered from the archived list below.
  const handleArchiveHabitRequest = useCallback((id: string) => {
    setHabitToArchive(id);
  }, []);

  const confirmArchiveHabit = useCallback(() => {
    if (habitToArchive) {
      archiveHabit(habitToArchive);
      setHabitToArchive(null);
    }
  }, [habitToArchive, archiveHabit]);

  const renderHabitCard = useCallback((habit: Habit) => {
    const animation = getAnimation(habit.id);
    const unlocked = isHabitUnlocked(habit.id, todayKey);
    const blocking = getBlockingHabits(habit.id, todayKey);
    const todayCompletion = completions.find(
      (c) => c.habitId === habit.id && c.date === todayKey
    );
    return (
      <HabitCard
        key={habit.id}
        habit={habit}
        isCompletedToday={isCompletedOnDate(habit.id, todayKey)}
        isLocked={!unlocked}
        blockingNames={blocking}
        onToggle={(note) => handleToggleCompletion(habit.id, note)}
        onEdit={() => { setEditingHabit(habit); setShowModal(true); }}
        onArchive={() => archiveHabit(habit.id)}
        onDelete={() => handleArchiveHabitRequest(habit.id)}
        onConvertToTask={() => convertHabitToTask(habit.id)}
        onViewStats={() => setStatsHabit(habit)}
        onViewJournal={() => setJournalHabit(habit)}
        onViewStreakCalendar={() => setStreakCalendarHabit(habit)}
        weekProgress={getWeekProgress(habit.id)}
        showConfetti={animation?.type === 'milestone'}
        animatedStreak={!!animation}
        freezesRemaining={getFreezesRemainingThisWeek(habit.id)}
        isFrozenToday={isDateFrozen(habit.id, todayKey)}
        completionNote={todayCompletion?.notes}
      />
    );
  }, [getAnimation, isCompletedOnDate, isHabitUnlocked, getBlockingHabits, todayKey, handleToggleCompletion, archiveHabit, handleArchiveHabitRequest, getWeekProgress, getFreezesRemainingThisWeek, isDateFrozen, completions]);

  return (
    <>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-surface-light dark:bg-surface-dark-elevated rounded-xl p-4 border border-border-light dark:border-border-dark">
          <div className="flex items-center gap-2 text-accent-primary mb-1">
            <Target className="w-5 h-5" />
            <span className="text-sm font-medium">今日</span>
          </div>
          <div className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {todayProgress.completed}/{todayProgress.total}
          </div>
        </div>

        <div className="bg-surface-light dark:bg-surface-dark-elevated rounded-xl p-4 border border-border-light dark:border-border-dark">
          <div className="flex items-center gap-2 text-accent-orange mb-1">
            <Flame className="w-5 h-5" />
            <span className="text-sm font-medium">总连续</span>
          </div>
          <div className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {totalStreakDays} 天
          </div>
        </div>

      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-6 border-b border-border-light dark:border-border-dark">
        <button
          onClick={() => setActiveTab('habits')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'habits'
              ? 'border-accent-primary text-accent-primary'
              : 'border-transparent text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
          }`}
        >
          <Target className="w-4 h-4" />
          习惯
        </button>
        <button
          onClick={() => setActiveTab('routines')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'routines'
              ? 'border-accent-primary text-accent-primary'
              : 'border-transparent text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
          }`}
        >
          <Repeat className="w-4 h-4" />
          日常惯例
          {routines.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-accent-primary/10 text-accent-primary">
              {routines.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── Routines Tab ────────────────────────────────── */}
      {activeTab === 'routines' && (
        <div>
          {/* Routine actions */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
              我的日常惯例（{routines.length}）
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowRoutineTemplatePicker(true)}
                className="flex items-center gap-2 px-3 py-2 text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-alt dark:hover:bg-surface-dark rounded-lg transition-colors border border-border-light dark:border-border-dark"
              >
                <BookTemplate className="w-4 h-4" />
                模板
              </button>
              <button
                onClick={() => { setEditingRoutine(null); setShowRoutineBuilder(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                创建日常惯例
              </button>
            </div>
          </div>

          {/* Routine cards */}
          {routines.length === 0 ? (
            <div className="text-center py-12 bg-surface-light dark:bg-surface-dark-elevated rounded-xl border border-border-light dark:border-border-dark">
              <Repeat className="w-12 h-12 mx-auto text-text-light-tertiary dark:text-text-dark-tertiary mb-3" />
              <p className="text-text-light-secondary dark:text-text-dark-secondary mb-1">
                还没有日常惯例
              </p>
              <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary mb-4">
                将多个习惯串联成日常惯例，确保持续执行。
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowRoutineTemplatePicker(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary rounded-lg hover:bg-surface-light-alt dark:hover:bg-surface-dark transition-colors"
                >
                  <BookTemplate className="w-4 h-4" />
                  使用模板
                </button>
                <button
                  onClick={() => { setEditingRoutine(null); setShowRoutineBuilder(true); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  创建自定义
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {routines.map((routine) => {
                const progress = getRoutineProgress(routine.id);
                const timeLabel = { morning: '早上', afternoon: '下午', evening: '晚上', anytime: '任意时间' }[routine.timeOfDay];
                const TimeIcon = { morning: Sunrise, afternoon: Sun, evening: Moon, anytime: Clock }[routine.timeOfDay];
                return (
                  <div
                    key={routine.id}
                    className="bg-surface-light dark:bg-surface-dark-elevated rounded-xl p-4 border border-border-light dark:border-border-dark hover:border-accent-primary/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="text-2xl shrink-0">{routine.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-text-light-primary dark:text-text-dark-primary">
                            {routine.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-text-light-tertiary dark:text-text-dark-tertiary flex-wrap mt-0.5">
                            <span className="flex items-center gap-1">
                              <TimeIcon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                              {timeLabel}
                            </span>
                            <span className="text-border-light dark:text-border-dark">|</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {routine.estimatedMinutes} 分钟
                            </span>
                            <span className="text-border-light dark:text-border-dark">|</span>
                            <span>{routine.habitIds.length} 个习惯</span>
                          </div>
                          {routine.description && (
                            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                              {routine.description}
                            </p>
                          )}
                          {/* Progress bar */}
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs text-text-light-tertiary dark:text-text-dark-tertiary mb-1">
                              <span>{progress.completed}/{progress.total} 今日</span>
                              <span>{progress.percentage}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-surface-light-alt dark:bg-surface-dark rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-300"
                                style={{
                                  width: `${progress.percentage}%`,
                                  backgroundColor: progress.percentage === 100 ? 'var(--color-status-success)' : 'var(--color-accent-primary)',
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setRunningRoutine(routine)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-primary text-white rounded-lg text-sm font-medium hover:bg-accent-primary/90 transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                          开始
                        </button>
                        <button
                          onClick={() => { setEditingRoutine(routine); setShowRoutineBuilder(true); }}
                          className="p-1.5 rounded hover:bg-surface-light-alt dark:hover:bg-surface-dark text-text-light-tertiary dark:text-text-dark-tertiary"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteRoutine(routine.id)}
                          className="p-1.5 rounded hover:bg-status-error/10 text-text-light-tertiary dark:text-text-dark-tertiary hover:text-status-error"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Routine Template Picker Modal */}
          {showRoutineTemplatePicker && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-surface-light dark:bg-surface-dark-elevated rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 pb-4">
                  <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
                    日常惯例模板
                  </h2>
                  <button
                    onClick={() => setShowRoutineTemplatePicker(false)}
                    className="p-1 rounded hover:bg-surface-light-alt dark:hover:bg-surface-dark text-text-light-tertiary dark:text-text-dark-tertiary"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="px-6 pb-6 space-y-3">
                  {ROUTINE_TEMPLATES.map((template) => (
                    <button
                      key={template.name}
                      onClick={() => handleCreateFromRoutineTemplate(template)}
                      className="w-full text-left p-4 rounded-xl border border-border-light dark:border-border-dark hover:border-accent-primary/30 hover:bg-surface-light-alt dark:hover:bg-surface-dark transition-all"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{template.icon}</span>
                        <div>
                          <h3 className="font-medium text-text-light-primary dark:text-text-dark-primary">
                            {template.name}
                          </h3>
                          <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
                            {template.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                        <span>{template.habits.length} 个习惯</span>
                        <span>{template.estimatedMinutes} 分钟</span>
                        <span className="flex items-center gap-1">
                          {template.habits.map((h) => h.icon).join(' ')}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Routine Builder Modal */}
          {showRoutineBuilder && (
            <RoutineBuilder
              routine={editingRoutine ?? undefined}
              onClose={() => { setShowRoutineBuilder(false); setEditingRoutine(null); }}
            />
          )}

          {/* Routine Runner Modal */}
          {runningRoutine && (
            <RoutineRunner
              routine={runningRoutine}
              onClose={() => setRunningRoutine(null)}
            />
          )}
        </div>
      )}

      {/* ─── Habits Tab ──────────────────────────────────── */}
      {activeTab === 'habits' && <>

      {/* Heatmap & Rewards toggles */}
      {activeHabits.length > 0 && (
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                showHeatmap
                  ? 'text-accent-primary'
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
              热力图
            </button>
            <button
              onClick={() => setShowAnalytics(true)}
              className="flex items-center gap-2 text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              分析
            </button>
            <button
              onClick={() => setShowNoteSearch(!showNoteSearch)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                showNoteSearch
                  ? 'text-accent-primary'
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
              }`}
            >
              <Search className="w-4 h-4" />
              笔记
            </button>
          </div>
          {showHeatmap && (
            <div className="bg-surface-light dark:bg-surface-dark-elevated rounded-xl p-4 border border-border-light dark:border-border-dark">
              <HabitHeatmap weeks={20} />
            </div>
          )}
          {showNoteSearch && (
            <div className="bg-surface-light dark:bg-surface-dark-elevated rounded-xl p-4 border border-border-light dark:border-border-dark">
              <div className="flex items-center gap-2 mb-3">
                <Search className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
                <input
                  type="text"
                  value={noteSearchQuery}
                  onChange={(e) => setNoteSearchQuery(e.target.value)}
                  placeholder="搜索完成备注…"
                  className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
                />
              </div>
              {noteSearchQuery.trim() && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {noteSearchResults.length === 0 ? (
                    <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary text-center py-4">
                      未找到笔记
                    </p>
                  ) : (
                    noteSearchResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-start gap-2 text-sm p-2 rounded-lg bg-surface-light-alt dark:bg-surface-dark"
                      >
                        <MessageSquare className="w-3.5 h-3.5 mt-0.5 text-text-light-tertiary dark:text-text-dark-tertiary shrink-0" />
                        <div>
                          <div className="text-text-light-primary dark:text-text-dark-primary">
                            {result.notes}
                          </div>
                          <div className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-0.5">
                            {result.habitTitle} &middot; {result.date}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Add habit + view controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            我的习惯（{activeHabits.length}）
          </h2>
          {activeHabits.length > 0 && habitsByCategory.length > 1 && (
            <button
              onClick={() => setGroupByCategory(!groupByCategory)}
              className={`text-xs px-2 py-1 rounded-md transition-colors ${
                groupByCategory
                  ? 'bg-accent-primary/10 text-accent-primary'
                  : 'bg-surface-light-alt dark:bg-surface-dark text-text-light-tertiary dark:text-text-dark-tertiary'
              }`}
            >
              分类
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplatePicker(true)}
            className="flex items-center gap-2 px-3 py-2 text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-alt dark:hover:bg-surface-dark rounded-lg transition-colors border border-border-light dark:border-border-dark"
          >
            <BookTemplate className="w-4 h-4" />
            模板
          </button>
          <button
            onClick={() => {
              setEditingHabit(null);
              setSelectedTemplate(undefined);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加习惯
          </button>
        </div>
      </div>

      {/* Habit list */}
      {activeHabits.length === 0 ? (
        <div className="text-center py-12 bg-surface-light dark:bg-surface-dark-elevated rounded-xl border border-border-light dark:border-border-dark">
          <Target className="w-12 h-12 mx-auto text-text-light-tertiary dark:text-text-dark-tertiary mb-3" />
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">
            还没有习惯，开始建立积极的日常习惯吧！
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowTemplatePicker(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary rounded-lg hover:bg-surface-light-alt dark:hover:bg-surface-dark transition-colors"
            >
              <BookTemplate className="w-4 h-4" />
              使用模板
            </button>
            <button
              onClick={() => {
                setEditingHabit(null);
                setSelectedTemplate(undefined);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              创建自定义
            </button>
          </div>
        </div>
      ) : groupByCategory && habitsByCategory.length > 1 ? (
        // Grouped by category
        habitsByCategory.map(({ category: cat, habits: catHabits }) => (
          <CategorySection
            key={cat}
            category={cat}
            habits={catHabits}
            renderHabit={renderHabitCard}
          />
        ))
      ) : (
        // Flat list
        <div className="space-y-3">
          {activeHabits.map(renderHabitCard)}
        </div>
      )}

      {/* Archived habits */}
      {archivedHabits.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary mb-4"
          >
            <Archive className="w-4 h-4" />
            已归档（{archivedHabits.length}）
          </button>

          {showArchived && (
            <div className="space-y-2 opacity-60">
              {archivedHabits.map((habit) => (
                <div
                  key={habit.id}
                  className="flex items-center justify-between bg-surface-light dark:bg-surface-dark-elevated rounded-lg p-3 border border-border-light dark:border-border-dark"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{habit.icon}</span>
                    <span className="text-text-light-secondary dark:text-text-dark-secondary">
                      {habit.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => restoreHabit(habit.id)}
                      className="p-2 hover:bg-surface-light-alt dark:hover:bg-surface-dark rounded-lg text-text-light-tertiary dark:text-text-dark-tertiary"
                      title="恢复"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteHabit(habit.id)}
                      className="p-2 hover:bg-status-error/10 rounded-lg text-status-error"
                      title="永久删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      </>}

      {/* Modals */}
      {showModal && (
        <HabitModal
          habit={editingHabit ?? undefined}
          initialTemplate={selectedTemplate}
          allHabits={activeHabits}
          onClose={() => {
            setShowModal(false);
            setEditingHabit(null);
            setSelectedTemplate(undefined);
          }}
          onSave={handleSaveHabit}
        />
      )}

      {showTemplatePicker && (
        <HabitTemplatePicker
          onSelect={handleSelectTemplate}
          onSelectPack={handleSelectTemplatePack}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}

      {statsHabit && (
        <HabitStats
          habit={statsHabit}
          onClose={() => setStatsHabit(null)}
        />
      )}

      {showAnalytics && (
        <HabitAnalytics onClose={() => setShowAnalytics(false)} />
      )}

      {journalHabit && (
        <HabitJournal habit={journalHabit} onClose={() => setJournalHabit(null)} />
      )}

      {streakCalendarHabit && (
        <HabitStreakCalendar habit={streakCalendarHabit} onClose={() => setStreakCalendarHabit(null)} />
      )}


      <ConfirmDialog
        isOpen={habitToDelete !== null}
        onClose={() => setHabitToDelete(null)}
        onConfirm={confirmDeleteHabit}
        title="永久删除习惯"
        message="确定要永久删除这个习惯吗？此操作无法撤销，习惯记录与连续天数也会一并删除。"
        confirmText="永久删除"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={habitToArchive !== null}
        onClose={() => setHabitToArchive(null)}
        onConfirm={confirmArchiveHabit}
        title="删除习惯"
        message="习惯会移入“已归档”，之后的完成记录与连续天数保持不变，可随时恢复。"
        confirmText="归档"
        variant="warning"
      />
    </>
  );
}

/**
 * Habits Page - Wraps HabitsContent with PageContent for standalone page usage
 * Note: This route will redirect to /tasks?tab=habits after restructuring
 */
export function Habits() {
  return (
    <PageContent page="habits">
      <HabitsContent />
    </PageContent>
  );
}

export default Habits;
