import React, { useMemo, useState } from 'react';
import { Annoyed, Flame, Frown, Meh, Smile } from 'lucide-react';
import { useEnergyStore } from '../../stores/useEnergyStore';

/**
 * EnergyCheckIn — one-second energy log on the Today page.
 *
 * Recording stays lightweight here so the data can compound into
 * planning and review insights; detailed analysis lives in 更多功能 → 精力追踪.
 */

const OPTIONS = [
  { Icon: Frown, level: 2, label: '很低' },
  { Icon: Annoyed, level: 4, label: '偏低' },
  { Icon: Meh, level: 6, label: '一般' },
  { Icon: Smile, level: 8, label: '不错' },
  { Icon: Flame, level: 10, label: '满电' },
] as const;

function currentTimeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export const EnergyCheckIn: React.FC = () => {
  const logs = useEnergyStore((state) => state.logs);
  const logEnergy = useEnergyStore((state) => state.logEnergy);
  const [justLogged, setJustLogged] = useState<number | null>(null);

  const latestLevel = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const timeOfDay = currentTimeOfDay();
    const todaysLogs = logs.filter((log) => log.date === today && log.timeOfDay === timeOfDay);
    return todaysLogs.length > 0 ? todaysLogs[todaysLogs.length - 1].level : null;
  }, [logs]);

  const handleLog = (level: number) => {
    logEnergy(level, currentTimeOfDay());
    setJustLogged(level);
    window.setTimeout(() => setJustLogged(null), 1600);
  };

  return (
    <div className="flex items-center gap-1" role="group" aria-label="记录当前精力状态">
      <span className="hidden lg:inline text-xs text-text-light-secondary dark:text-text-dark-secondary">
        {justLogged !== null ? '已记录' : '现在状态如何？'}
      </span>
      {OPTIONS.map(({ Icon, level, label }) => {
        const selected = latestLevel !== null && Math.abs(latestLevel - level) <= 1;
        return (
          <button
            key={level}
            type="button"
            onClick={() => handleLog(level)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:scale-110 ${
              selected
                ? 'bg-accent-primary/15 text-accent-primary ring-1 ring-accent-primary/40'
                : 'text-text-light-tertiary hover:bg-surface-light-elevated hover:text-text-light-secondary dark:text-text-dark-tertiary dark:hover:bg-surface-dark-elevated dark:hover:text-text-dark-secondary'
            }`}
            title={`精力：${label}（${level}/10）`}
            aria-label={`记录精力状态：${label}`}
            aria-pressed={selected}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
};

export default EnergyCheckIn;
