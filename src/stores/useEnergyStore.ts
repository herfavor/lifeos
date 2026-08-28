import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import { createSyncedStorage } from '../lib/syncedStorage';

// ==================== TYPES ====================

export interface EnergyLog {
  id: string;
  date: string; // YYYY-MM-DD
  level: number; // 1-10
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  note?: string;
  timestamp: string; // ISO date
}

export interface EnergyPattern {
  dayOfWeek: number; // 0-6 (Sun-Sat)
  avgMorning: number;
  avgAfternoon: number;
  avgEvening: number;
}

type TimeOfDay = 'morning' | 'afternoon' | 'evening';

// ==================== HELPERS ====================

function getDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

// ==================== STORE ====================

interface EnergyState {
  logs: EnergyLog[];

  // Actions
  logEnergy: (level: number, timeOfDay: TimeOfDay, note?: string) => void;
  updateLog: (id: string, updates: Pick<EnergyLog, 'level' | 'timeOfDay'> & { note?: string }) => void;
  getEnergyForDate: (date: string) => EnergyLog[];
  calculatePatterns: () => EnergyPattern[];
  getOptimalTimeForTask: (energyCost: 1 | 2 | 3 | 4 | 5) => string;
  getTodayEnergy: () => EnergyLog[];
  deleteLog: (id: string) => void;
}

export const useEnergyStore = create<EnergyState>()(
  persist(
    (set, get) => ({
      logs: [],

      logEnergy: (level: number, timeOfDay: TimeOfDay, note?: string) => {
        const now = new Date();
        const log: EnergyLog = {
          id: nanoid(),
          date: getDateKey(now),
          level,
          timeOfDay,
          note,
          timestamp: now.toISOString(),
        };

        set((state) => ({
          logs: [...state.logs, log],
        }));
      },

      updateLog: (id, updates) => {
        const level = Math.min(10, Math.max(1, Math.round(updates.level)));
        set((state) => ({
          logs: state.logs.map((log) =>
            log.id === id
              ? {
                  ...log,
                  level,
                  timeOfDay: updates.timeOfDay,
                  note: updates.note?.trim() || undefined,
                }
              : log
          ),
        }));
      },

      getEnergyForDate: (date: string) => {
        return get().logs.filter((log) => log.date === date);
      },

      getTodayEnergy: () => {
        const today = getDateKey(new Date());
        return get().logs.filter((log) => log.date === today);
      },

      deleteLog: (id: string) => {
        set((state) => ({
          logs: state.logs.filter((log) => log.id !== id),
        }));
      },

      calculatePatterns: () => {
        const { logs } = get();
        const fourWeeksAgo = new Date();
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
        const cutoff = getDateKey(fourWeeksAgo);

        const recentLogs = logs.filter((log) => log.date >= cutoff);

        // Group by dayOfWeek and timeOfDay
        const buckets: Record<string, { sum: number; count: number }> = {};

        for (const log of recentLogs) {
          const date = new Date(log.date + 'T12:00:00');
          const dow = date.getDay();
          const key = `${dow}-${log.timeOfDay}`;

          if (!buckets[key]) {
            buckets[key] = { sum: 0, count: 0 };
          }
          buckets[key].sum += log.level;
          buckets[key].count += 1;
        }

        const patterns: EnergyPattern[] = [];
        for (let dow = 0; dow < 7; dow++) {
          const getAvg = (tod: TimeOfDay) => {
            const b = buckets[`${dow}-${tod}`];
            return b ? Math.round((b.sum / b.count) * 10) / 10 : 0;
          };

          patterns.push({
            dayOfWeek: dow,
            avgMorning: getAvg('morning'),
            avgAfternoon: getAvg('afternoon'),
            avgEvening: getAvg('evening'),
          });
        }

        return patterns;
      },

      getOptimalTimeForTask: (energyCost: 1 | 2 | 3 | 4 | 5) => {
        const patterns = get().calculatePatterns();
        const currentTimeOfDay = getCurrentTimeOfDay();

        // For high energy cost tasks, find the time slot with highest average energy
        // For low energy cost, any time works
        if (energyCost <= 2) {
          return `低能量任务任何时间都可以。当前时段：${currentTimeOfDay}`;
        }

        // Find the time slot with highest energy across all days
        let bestDay = '';
        let bestTime: TimeOfDay = 'morning';
        let bestAvg = 0;

        const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const times: TimeOfDay[] = ['morning', 'afternoon', 'evening'];

        for (const pattern of patterns) {
          for (const time of times) {
            const avg =
              time === 'morning'
                ? pattern.avgMorning
                : time === 'afternoon'
                  ? pattern.avgAfternoon
                  : pattern.avgEvening;

            if (avg > bestAvg) {
              bestAvg = avg;
              bestDay = dayNames[pattern.dayOfWeek];
              bestTime = time;
            }
          }
        }

        if (bestAvg === 0) {
          return '数据不足。请连续记录几周能量水平，即可查看规律。';
        }

        return `建议安排在${bestDay} ${bestTime}（平均能量：${bestAvg}/10）`;
      },
    }),
    {
      name: 'energy-data',
      storage: createJSONStorage(() => createSyncedStorage()),
      partialize: (state) => ({
        logs: state.logs,
      }),
    }
  )
);
