/**
 * World Clock Widget
 *
 * Shows current time in multiple timezones
 */

import React, { useState, useEffect } from 'react';
import { BaseWidget } from './BaseWidget';

interface TimeZoneData {
  name: string;
  timezone: string;
  emoji: string;
}

const TIMEZONES: TimeZoneData[] = [
  { name: '纽约', timezone: 'America/New_York', emoji: '🗽' },
  { name: '伦敦', timezone: 'Europe/London', emoji: '🇬🇧' },
  { name: '东京', timezone: 'Asia/Tokyo', emoji: '🗼' },
  { name: '悉尼', timezone: 'Australia/Sydney', emoji: '🦘' },
  { name: '迪拜', timezone: 'Asia/Dubai', emoji: '🏜️' },
];

export const WorldClockWidget: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (timezone: string) => {
    return currentTime.toLocaleTimeString('zh-CN', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (timezone: string) => {
    return currentTime.toLocaleDateString('zh-CN', {
      timeZone: timezone,
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <BaseWidget title="世界时钟" icon="🌍">
      <div className="space-y-2">
        {TIMEZONES.map((tz) => (
          <div
            key={tz.timezone}
            className="flex items-center justify-between p-2 rounded bg-surface-light-elevated dark:bg-surface-dark"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{tz.emoji}</span>
              <div>
                <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                  {tz.name}
                </p>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  {formatDate(tz.timezone)}
                </p>
              </div>
            </div>
            <span className="text-lg font-semibold text-accent-primary">
              {formatTime(tz.timezone)}
            </span>
          </div>
        ))}
      </div>
    </BaseWidget>
  );
};
