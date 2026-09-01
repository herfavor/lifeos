import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useSettingsStore, formatTime } from '../stores/useSettingsStore';

/**
 * HeaderClock Component
 *
 * Displays current time in the header, updating every minute.
 * Respects the global time format setting (12h/24h).
 */
export const HeaderClock: React.FC = () => {
  const timeFormat = useSettingsStore((state) => state.timeFormat);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update immediately
    setCurrentTime(new Date());

    // Calculate ms until next minute to sync updates
    const now = new Date();
    const msUntilNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    // Initial timeout to sync to minute boundary
    const initialTimeout = setTimeout(() => {
      setCurrentTime(new Date());

      // Then update every minute
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 60000);

      // Store interval for cleanup
      return () => clearInterval(interval);
    }, msUntilNextMinute);

    return () => clearTimeout(initialTimeout);
  }, []);

  // Get formatted date for tooltip
  const dateString = currentTime.toLocaleDateString('zh-CN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-button bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark"
      title={dateString}
    >
      <Clock className="h-4 w-4 shrink-0 text-text-light-secondary dark:text-text-dark-secondary" aria-hidden />
      <span className="font-mono text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
        {formatTime(currentTime, timeFormat)}
      </span>
    </div>
  );
};
