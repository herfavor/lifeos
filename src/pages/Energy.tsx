import { useMemo, useState } from 'react';
import { useEnergyStore } from '../stores/useEnergyStore';
import type { EnergyLog, EnergyPattern } from '../stores/useEnergyStore';
import { useKanbanStore } from '../stores/useKanbanStore';
import { PageContent } from '../components/PageContent';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState } from '../components/EmptyState';
import { CalendarPlus, Flame, Moon, Pencil, Sun, Sunrise, Trash2 } from 'lucide-react';
import { toast } from '../stores/useToastStore';
import type { Task } from '../types';

type TimeOfDay = 'morning' | 'afternoon' | 'evening';

const ENERGY_FACES = ['😴', '😩', '😐', '😐', '🙂', '🙂', '😊', '😄', '💪', '⚡'];
const DAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const FULL_DAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: '早晨',
  afternoon: '下午',
  evening: '晚上',
};

function getDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getHeatmapColor(value: number): string {
  if (value === 0) return 'bg-surface-light-elevated dark:bg-surface-dark-elevated';
  if (value <= 3) return 'bg-status-error/60';
  if (value <= 5) return 'bg-status-warning/60';
  if (value <= 7) return 'bg-status-success/40';
  return 'bg-status-success/70';
}

// ==================== LOG FORM ====================

function EnergyLogForm() {
  const logEnergy = useEnergyStore((s) => s.logEnergy);
  const [level, setLevel] = useState(5);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  });
  const [note, setNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logEnergy(level, timeOfDay, note || undefined);
    setNote('');
  };

  const face = ENERGY_FACES[level - 1] || '😐';

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-surface-light dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark space-y-4">
      <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
        记录当前精力
      </h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">等级</span>
          <span className="text-2xl">{face} <span className="text-sm font-medium">{level}/10</span></span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer
            bg-gradient-to-r from-status-error via-status-warning to-status-success
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-5
            [&::-webkit-slider-thumb]:h-5
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
          "
        />
      </div>

      <div className="flex gap-2">
        {(['morning', 'afternoon', 'evening'] as const).map((tod) => (
          <button
            key={tod}
            type="button"
            onClick={() => setTimeOfDay(tod)}
            className={`flex flex-1 items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border
              ${timeOfDay === tod
                ? 'bg-accent-blue/20 text-accent-blue border-accent-blue/30'
                : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-secondary dark:text-text-dark-secondary border-border-light dark:border-border-dark'
              }
            `}
          >
            {tod === 'morning' ? <Sunrise className="h-4 w-4 shrink-0" aria-hidden /> : tod === 'afternoon' ? <Sun className="h-4 w-4 shrink-0" aria-hidden /> : <Moon className="h-4 w-4 shrink-0" aria-hidden />}
            {TIME_OF_DAY_LABELS[tod]}
          </button>
        ))}
      </div>

      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="可选备注（例如：睡得好、喝了咖啡）"
        className="w-full px-3 py-2 rounded-lg text-sm bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary placeholder:text-text-light-secondary/50 dark:placeholder:text-text-dark-secondary/50"
      />

      <button
        type="submit"
        className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-accent-blue text-white hover:bg-accent-blue/90 transition-colors"
      >
        记录精力
      </button>
    </form>
  );
}

// ==================== HEATMAP ====================

function WeeklyHeatmap({ patterns }: { patterns: EnergyPattern[] }) {
  const times: Array<{ key: TimeOfDay; label: string }> = [
    { key: 'morning', label: '早晨' },
    { key: 'afternoon', label: '下午' },
    { key: 'evening', label: '晚上' },
  ];

  return (
    <div className="p-4 rounded-xl bg-surface-light dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark">
      <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
        每周精力模式
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-xs text-text-light-secondary dark:text-text-dark-secondary text-left py-1 pr-2 w-20" />
              {DAY_NAMES.map((day) => (
                <th key={day} className="text-xs text-text-light-secondary dark:text-text-dark-secondary text-center py-1 px-1">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map((time) => (
              <tr key={time.key}>
                <td className="text-xs text-text-light-secondary dark:text-text-dark-secondary py-1 pr-2">
                  {time.label}
                </td>
                {patterns.map((pattern) => {
                  const val =
                    time.key === 'morning'
                      ? pattern.avgMorning
                      : time.key === 'afternoon'
                        ? pattern.avgAfternoon
                        : pattern.avgEvening;
                  return (
                    <td key={pattern.dayOfWeek} className="py-1 px-1">
                      <div
                        className={`w-full aspect-square rounded-md flex items-center justify-center text-xs font-medium ${getHeatmapColor(val)} ${val > 0 ? 'text-text-light-primary dark:text-text-dark-primary' : 'text-text-light-secondary/30 dark:text-text-dark-secondary/30'}`}
                        title={`${FULL_DAY_NAMES[pattern.dayOfWeek]} ${time.label}：${val > 0 ? val + '/10' : '无数据'}`}
                      >
                        {val > 0 ? val : '-'}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-2">
        基于 4 周滚动平均值
      </p>
    </div>
  );
}

// ==================== TREND CHART ====================

function EnergyTrendChart({ logs }: { logs: EnergyLog[] }) {
  const dailyAverages = useMemo(() => {
    const result: Array<{ date: string; avg: number; label: string }> = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = getDateKey(d);
      const dayLogs = logs.filter((l) => l.date === key);
      const avg = dayLogs.length > 0
        ? Math.round((dayLogs.reduce((sum, l) => sum + l.level, 0) / dayLogs.length) * 10) / 10
        : 0;
      result.push({
        date: key,
        avg,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
      });
    }
    return result;
  }, [logs]);

  const maxVal = 10;

  return (
    <div className="p-4 rounded-xl bg-surface-light dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark">
      <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
        30 天精力趋势
      </h3>
      <div className="h-32 flex items-end gap-px">
        {dailyAverages.map((day) => (
          <div
            key={day.date}
            className="flex-1 flex flex-col items-center justify-end"
            title={`${day.label}：${day.avg > 0 ? day.avg + '/10' : '无数据'}`}
          >
            <div
              className={`w-full rounded-t-sm transition-all ${
                day.avg === 0
                  ? 'bg-border-light/30 dark:bg-border-dark/30'
                  : day.avg >= 7
                    ? 'bg-status-success'
                    : day.avg >= 4
                      ? 'bg-status-warning'
                      : 'bg-status-error'
              }`}
              style={{ height: `${day.avg > 0 ? (day.avg / maxVal) * 100 : 4}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-text-light-secondary dark:text-text-dark-secondary">
          {dailyAverages[0]?.label}
        </span>
        <span className="text-[10px] text-text-light-secondary dark:text-text-dark-secondary">
          {dailyAverages[dailyAverages.length - 1]?.label}
        </span>
      </div>
    </div>
  );
}

// ==================== BURNOUT ALERT ====================

function LowEnergyNotice({ logs }: { logs: EnergyLog[] }) {
  const alert = useMemo(() => {
    // Check last 3 days for consecutive below-4 averages
    const lowDays: string[] = [];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = getDateKey(d);
      const dayLogs = logs.filter((l) => l.date === key);
      if (dayLogs.length > 0) {
        const avg = dayLogs.reduce((sum, l) => sum + l.level, 0) / dayLogs.length;
        if (avg < 4) {
          lowDays.push(key);
        }
      }
    }

    if (lowDays.length >= 3) {
      return {
        active: true,
        days: lowDays.length,
      };
    }
    return { active: false, days: 0 };
  }, [logs]);

  if (!alert.active) return null;

  return (
    <div className="p-4 rounded-xl bg-status-error/10 border border-status-error/30">
      <div className="flex items-start gap-3">
        <Flame className="h-6 w-6 shrink-0 text-status-error" aria-hidden />
        <div>
          <h4 className="text-sm font-semibold text-status-error">连续低精力提醒</h4>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
            你的精力已连续 {alert.days} 天低于 4/10。建议休息一下、调整工作量，或安排更轻松的任务。
          </p>
          <p className="mt-2 text-[11px] text-text-light-tertiary dark:text-text-dark-tertiary">
            这是基于本机记录的生活管理提示，不是医疗判断。
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== TASK SUGGESTIONS ====================

function TaskSuggestions({ patterns }: { patterns: EnergyPattern[] }) {
  const tasks = useKanbanStore((s) => s.tasks);
  const updateTask = useKanbanStore((s) => s.updateTask);

  const scheduleTask = (task: Task, offsetDays: number) => {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    updateTask(task.id, {
      dueDate: getDateKey(date),
      status: task.status === 'backlog' ? 'todo' : task.status,
    });
    toast.success(offsetDays === 0 ? '已放入今天' : '已安排到一周后');
  };

  const renderTask = (task: Task, accentClass: string) => (
    <li key={task.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border-light px-2.5 py-2 text-xs dark:border-border-dark">
      <span className={`h-1.5 w-1.5 rounded-full ${accentClass}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-text-light-primary dark:text-text-dark-primary">{task.title}</span>
      <button
        type="button"
        onClick={() => scheduleTask(task, 0)}
        className="inline-flex min-h-8 items-center gap-1 rounded-md bg-accent-primary/10 px-2 text-accent-primary hover:bg-accent-primary/20"
      >
        <CalendarPlus className="h-3 w-3" /> 今天
      </button>
      <button
        type="button"
        onClick={() => scheduleTask(task, 7)}
        className="min-h-8 rounded-md px-2 text-text-light-secondary hover:bg-surface-light-elevated dark:text-text-dark-secondary dark:hover:bg-surface-dark-elevated"
      >
        一周后
      </button>
    </li>
  );

  const suggestions = useMemo(() => {
    const activeTasks = tasks.filter(
      (t) => t.status !== 'done' && !t.archivedAt && t.energyCost
    );

    if (activeTasks.length === 0 || patterns.every((p) => p.avgMorning === 0 && p.avgAfternoon === 0 && p.avgEvening === 0)) {
      return null;
    }

    // Find peak energy times
    let peakDay = 0;
    let peakTime: TimeOfDay = 'morning';
    let peakAvg = 0;

    for (const pattern of patterns) {
      const entries: Array<{ time: TimeOfDay; avg: number }> = [
        { time: 'morning', avg: pattern.avgMorning },
        { time: 'afternoon', avg: pattern.avgAfternoon },
        { time: 'evening', avg: pattern.avgEvening },
      ];
      for (const entry of entries) {
        if (entry.avg > peakAvg) {
          peakAvg = entry.avg;
          peakDay = pattern.dayOfWeek;
          peakTime = entry.time;
        }
      }
    }

    const highEnergyTasks = activeTasks.filter((t) => (t.energyCost ?? 0) >= 4);
    const lowEnergyTasks = activeTasks.filter((t) => (t.energyCost ?? 0) <= 2);

    return {
      peakDay: FULL_DAY_NAMES[peakDay],
      peakTime,
      peakAvg,
      highEnergyTasks: highEnergyTasks.slice(0, 3),
      lowEnergyTasks: lowEnergyTasks.slice(0, 3),
    };
  }, [tasks, patterns]);

  if (!suggestions) {
    return (
      <div className="p-4 rounded-xl bg-surface-light dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark">
        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
          任务建议
        </h3>
        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
          为任务添加精力消耗值，并连续记录几周精力，即可获得个性化的日程安排建议。
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-surface-light dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark space-y-3">
      <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
        任务建议
      </h3>

      <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
        你的精力通常在 <span className="font-medium text-status-success">{suggestions.peakDay} {TIME_OF_DAY_LABELS[suggestions.peakTime]}</span> 达到高峰（{suggestions.peakAvg}/10）
      </div>

      {suggestions.highEnergyTasks.length > 0 && (
        <div>
          <p className="text-xs font-medium text-accent-orange mb-1">
            适合高精力时段安排：
          </p>
          <ul className="space-y-1">
            {suggestions.highEnergyTasks.map((task) => renderTask(task, 'bg-accent-orange'))}
          </ul>
        </div>
      )}

      {suggestions.lowEnergyTasks.length > 0 && (
        <div>
          <p className="text-xs font-medium text-accent-blue mb-1">
            适合低精力时段：
          </p>
          <ul className="space-y-1">
            {suggestions.lowEnergyTasks.map((task) => renderTask(task, 'bg-accent-blue'))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EnergyLogHistory({ logs }: { logs: EnergyLog[] }) {
  const updateLog = useEnergyStore((state) => state.updateLog);
  const deleteLog = useEnergyStore((state) => state.deleteLog);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ level: number; timeOfDay: TimeOfDay; note: string }>({
    level: 5,
    timeOfDay: 'morning',
    note: '',
  });

  const recentLogs = useMemo(
    () => [...logs].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 10),
    [logs]
  );

  const beginEdit = (log: EnergyLog) => {
    setEditingId(log.id);
    setDraft({ level: log.level, timeOfDay: log.timeOfDay, note: log.note ?? '' });
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateLog(editingId, draft);
    setEditingId(null);
    toast.success('精力记录已更新');
  };

  return (
    <section className="rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark-elevated">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">最近记录</h3>
          <p className="mt-0.5 text-xs text-text-light-secondary dark:text-text-dark-secondary">可修正误记，也可删除不再需要的样本。</p>
        </div>
        <span className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">{logs.length} 条</span>
      </div>

      {recentLogs.length === 0 ? (
        <EmptyState icon={Flame} title="还没有精力记录" description="在上方记录今天的精力值，积累一周后这里会帮你发现精力规律。" size="sm" />
      ) : (
        <div className="mt-3 space-y-2">
          {recentLogs.map((log) => (
            <div key={log.id} className="rounded-lg border border-border-light px-3 py-2 dark:border-border-dark">
              {editingId === log.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                      等级
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={draft.level}
                        onChange={(event) => setDraft((value) => ({ ...value, level: Number(event.target.value) }))}
                        className="mt-1 w-full rounded-md border border-border-light bg-surface-light px-2 py-1.5 text-text-light-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-primary"
                      />
                    </label>
                    <label className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                      时段
                      <select
                        value={draft.timeOfDay}
                        onChange={(event) => setDraft((value) => ({ ...value, timeOfDay: event.target.value as TimeOfDay }))}
                        className="mt-1 w-full rounded-md border border-border-light bg-surface-light px-2 py-1.5 text-text-light-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-primary"
                      >
                        <option value="morning">早晨</option>
                        <option value="afternoon">下午</option>
                        <option value="evening">晚上</option>
                      </select>
                    </label>
                  </div>
                  <input
                    value={draft.note}
                    onChange={(event) => setDraft((value) => ({ ...value, note: event.target.value }))}
                    placeholder="备注"
                    className="w-full rounded-md border border-border-light bg-surface-light px-2 py-1.5 text-sm text-text-light-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-primary"
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditingId(null)} className="rounded-md px-2.5 py-1.5 text-xs text-text-light-secondary hover:bg-surface-light-elevated dark:text-text-dark-secondary dark:hover:bg-surface-dark">取消</button>
                    <button type="button" onClick={saveEdit} className="rounded-md bg-accent-primary px-2.5 py-1.5 text-xs font-medium text-white">保存</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-xl" aria-label={`精力 ${log.level}/10`}>{ENERGY_FACES[log.level - 1]}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{log.level}/10 · {TIME_OF_DAY_LABELS[log.timeOfDay]}</p>
                    <p className="truncate text-xs text-text-light-secondary dark:text-text-dark-secondary">{log.date}{log.note ? ` · ${log.note}` : ''}</p>
                  </div>
                  <button type="button" onClick={() => beginEdit(log)} aria-label="编辑精力记录" className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-text-light-secondary hover:bg-surface-light-elevated dark:text-text-dark-secondary dark:hover:bg-surface-dark"><Pencil className="h-3.5 w-3.5" /></button>
                  <button type="button" onClick={() => setDeleteId(log.id)} aria-label="删除精力记录" className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-status-error-text hover:bg-status-error-bg"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteLog(deleteId);
          setDeleteId(null);
        }}
        title="删除精力记录"
        message="这条本机精力记录将被永久删除，相关趋势会重新计算。"
        confirmText="删除"
        variant="danger"
      />
    </section>
  );
}

// ==================== MAIN PAGE ====================

export function Energy() {
  const logs = useEnergyStore((s) => s.logs);
  const calculatePatterns = useEnergyStore((s) => s.calculatePatterns);

  const patterns = useMemo(() => calculatePatterns(), [calculatePatterns, logs]);

  return (
    <PageContent page="energy" className="pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Log + Burnout Alert */}
        <div className="space-y-4">
          <EnergyLogForm />
          <LowEnergyNotice logs={logs} />
          <TaskSuggestions patterns={patterns} />
          <EnergyLogHistory logs={logs} />
        </div>

        {/* Right Column: Charts */}
        <div className="lg:col-span-2 space-y-4">
          <WeeklyHeatmap patterns={patterns} />
          <EnergyTrendChart logs={logs} />
        </div>
      </div>
    </PageContent>
  );
}
