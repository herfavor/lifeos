import { useMemo, useState, type ReactNode } from 'react';
import { useEnergyStore } from '../../stores/useEnergyStore';
import type { EnergyLog } from '../../stores/useEnergyStore';
import { Link } from 'react-router-dom';
import { Moon, Sun, Sunrise } from 'lucide-react';

type TimeOfDay = 'morning' | 'afternoon' | 'evening';

const TIME_SLOTS: Array<{ id: TimeOfDay; label: string; icon: ReactNode }> = [
  { id: 'morning', label: '上午', icon: <Sunrise className="h-3 w-3" aria-hidden /> },
  { id: 'afternoon', label: '下午', icon: <Sun className="h-3 w-3" aria-hidden /> },
  { id: 'evening', label: '晚上', icon: <Moon className="h-3 w-3" aria-hidden /> },
];

const ENERGY_FACES = ['😴', '😩', '😐', '😐', '🙂', '🙂', '😊', '😄', '💪', '⚡'];

function getDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function EnergyTrackerWidget() {
  const logs = useEnergyStore((s) => s.logs);
  const logEnergy = useEnergyStore((s) => s.logEnergy);
  const [sliderValue, setSliderValue] = useState(5);
  const [selectedTime, setSelectedTime] = useState<TimeOfDay>(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  });

  const todayKey = getDateKey(new Date());

  const todayLogs = useMemo(
    () => logs.filter((log) => log.date === todayKey),
    [logs, todayKey]
  );

  // Check which time slots are already logged
  const loggedSlots = useMemo(() => {
    const slots = new Map<TimeOfDay, EnergyLog>();
    for (const log of todayLogs) {
      slots.set(log.timeOfDay, log);
    }
    return slots;
  }, [todayLogs]);

  // Weekly sparkline: 7 days of average energy
  const weeklyAverages = useMemo(() => {
    const result: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = getDateKey(d);
      const dayLogs = logs.filter((l) => l.date === key);
      if (dayLogs.length === 0) {
        result.push(0);
      } else {
        const avg = dayLogs.reduce((sum, l) => sum + l.level, 0) / dayLogs.length;
        result.push(Math.round(avg * 10) / 10);
      }
    }
    return result;
  }, [logs]);

  const handleLog = () => {
    logEnergy(sliderValue, selectedTime);
  };

  const face = ENERGY_FACES[sliderValue - 1] || '😐';

  return (
    <div className="space-y-3">
      {/* Quick Log */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            你的精力如何？
          </span>
          <span className="text-lg" title={`精力：${sliderValue}/10`}>
            {face}
          </span>
        </div>

        <input
          type="range"
          min={1}
          max={10}
          value={sliderValue}
          onChange={(e) => setSliderValue(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none cursor-pointer
            bg-gradient-to-r from-status-error via-status-warning to-status-success
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
          "
        />

        <div className="flex items-center justify-between text-xs text-text-light-secondary dark:text-text-dark-secondary">
          <span>1</span>
          <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
            {sliderValue}/10
          </span>
          <span>10</span>
        </div>
      </div>

      {/* Time Slot Selector */}
      <div className="flex gap-1">
        {TIME_SLOTS.map((slot) => {
          const logged = loggedSlots.get(slot.id);
          return (
            <button
              key={slot.id}
              onClick={() => setSelectedTime(slot.id)}
              className={`
                flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all
                ${
                  selectedTime === slot.id
                    ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                    : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-secondary dark:text-text-dark-secondary border border-transparent'
                }
              `}
              title={logged ? `已记录：${logged.level}/10` : `记录${slot.label}精力`}
            >
              <span className="mr-1">{slot.icon}</span>
              {logged ? `${logged.level}` : slot.label.slice(0, 3)}
            </button>
          );
        })}
      </div>

      {/* Log Button */}
      <button
        onClick={handleLog}
        className="w-full px-3 py-1.5 rounded-md text-xs font-medium
          bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30
          transition-colors duration-150"
      >
        记录精力
      </button>

      {/* Weekly Sparkline */}
      <div className="pt-1 border-t border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            最近 7 天
          </span>
          <Link
            to="/energy"
            className="text-xs text-accent-blue hover:underline"
          >
            查看全部
          </Link>
        </div>
        <div className="flex items-end gap-1 h-8">
          {weeklyAverages.map((avg, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-0.5"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  avg === 0
                    ? 'bg-border-light dark:bg-border-dark'
                    : avg >= 7
                      ? 'bg-status-success'
                      : avg >= 4
                        ? 'bg-status-warning'
                        : 'bg-status-error'
                }`}
                title={avg > 0 ? `${avg}/10` : '暂无数据'}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[10px] text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
          {weeklyAverages.map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return (
              <span key={i} className="flex-1 text-center">
                {['日', '一', '二', '三', '四', '五', '六'][d.getDay()]}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
