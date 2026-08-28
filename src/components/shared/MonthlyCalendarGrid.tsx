import { useMemo, type ReactNode } from 'react';

interface DayData {
  day: number;
  dateKey: string; // YYYY-M-D format (standard internal format)
  isoDateKey: string; // YYYY-MM-DD format (for API lookups)
  isToday: boolean;
  isCurrentMonth: boolean;
}

interface MonthlyCalendarGridProps {
  year: number;
  month: number; // 0-11 (JavaScript month)
  renderDayContent: (data: DayData) => ReactNode;
  onDayClick?: (dateKey: string) => void;
  onDayDoubleClick?: (dateKey: string) => void;
  /** Denser cells for planning pages that pair the month with an agenda. */
  compact?: boolean;
}

/**
 * MonthlyCalendarGrid - Shared calendar grid component
 * Provides consistent calendar layout with customizable day content via render props.
 * Used by both TimeEntryCalendar and MonthlyTimeReport.
 */
export function MonthlyCalendarGrid({
  year,
  month,
  renderDayContent,
  onDayClick,
  onDayDoubleClick,
  compact = false,
}: MonthlyCalendarGridProps) {
  const dayHeaders = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  const calendarData = useMemo(() => {
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    const days: (DayData | null)[] = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = year === todayYear && month === todayMonth && day === todayDate;
      const dateKey = `${year}-${month + 1}-${day}`;
      const isoDateKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

      days.push({
        day,
        dateKey,
        isoDateKey,
        isToday,
        isCurrentMonth: true,
      });
    }

    return days;
  }, [year, month]);

  return (
    <div className={`rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark ${compact ? 'p-2.5' : 'p-5'}`}>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {dayHeaders.map((day) => (
          <div
            key={day}
            className={`text-center font-medium text-text-light-tertiary dark:text-text-dark-tertiary ${compact ? 'py-1 text-[11px]' : 'py-2 text-xs'}`}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarData.map((dayData, index) => {
          if (dayData === null) {
            return (
              <div
                key={`empty-${index}`}
                className={`${compact ? 'min-h-[50px]' : 'min-h-[74px]'} rounded-lg border border-transparent bg-surface-light-elevated/35 dark:bg-surface-dark-elevated/35`}
              />
            );
          }

          return (
            <button
              key={dayData.dateKey}
              onClick={() => onDayClick?.(dayData.dateKey)}
              onDoubleClick={() => onDayDoubleClick?.(dayData.dateKey)}
              className={`${compact ? 'min-h-[50px] p-1.5' : 'min-h-[74px] p-2'} group rounded-lg border text-left transition-colors ${
                dayData.isToday
                  ? 'border-accent-primary/60 bg-accent-primary/5'
                  : 'border-border-light/70 bg-surface-light hover:border-accent-primary/30 hover:bg-surface-light-elevated/40 dark:border-border-dark/70 dark:bg-surface-dark dark:hover:bg-surface-dark-elevated/40'
              }`}
            >
              <div
                className={`${compact ? 'text-[11px]' : 'text-xs'} mb-1 font-semibold ${
                  dayData.isToday
                    ? 'text-accent-primary'
                    : 'text-text-light-primary dark:text-text-dark-primary'
                }`}
              >
                {dayData.day}
              </div>

              {renderDayContent(dayData)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
