import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getPageMetadata } from '../config/pageMetadata';
import { useSettingsStore } from '../stores/useSettingsStore';
import { Breadcrumbs } from './Breadcrumbs';
import { NavigationButtons } from './NavigationButtons';
import { ProjectContextDropdown } from './ProjectContextDropdown';
import { SaveStatusIndicator } from './SaveStatusIndicator';

interface PageHeaderProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

const PROJECT_AWARE_ROUTES = new Set(['/today', '/inbox', '/tasks', '/pm', '/schedule', '/notes', '/links']);

/** A compact orientation bar; page workspaces keep the visual priority. */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title: titleProp,
  subtitle: subtitleProp,
  children,
}) => {
  const location = useLocation();
  const metadata = getPageMetadata(location.pathname);
  const title = titleProp ?? metadata?.title ?? 'LifeOS';
  const subtitle = subtitleProp ?? metadata?.subtitle;
  const timeFormat = useSettingsStore((state) => state.timeFormat);
  const [now, setNow] = useState(() => new Date());

  const showDate = location.pathname === '/overview' || location.pathname === '/today';
  const showProjectContext = PROJECT_AWARE_ROUTES.has(location.pathname);

  useEffect(() => {
    if (!showDate) return;
    setNow(new Date());
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, [showDate]);

  useEffect(() => {
    document.title = title === 'LifeOS' ? 'LifeOS' : `${title} · LifeOS`;
  }, [title]);

  const time = now.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat !== '24h',
  });

  return (
    <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex min-w-0 items-center gap-2">
          <NavigationButtons />
          <Breadcrumbs />
        </div>
        <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
          <h1 className="truncate text-xl font-semibold tracking-tight text-text-light-primary sm:text-2xl dark:text-text-dark-primary">
            {title}
          </h1>
          {subtitle && (
            <p className="hidden truncate pb-0.5 text-sm text-text-light-secondary sm:block dark:text-text-dark-secondary">
              {subtitle}
            </p>
          )}
        </div>
        {children && <div className="mt-2 flex flex-wrap gap-2">{children}</div>}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <SaveStatusIndicator />
        {showProjectContext && (
          <div className="relative z-50 hidden sm:block">
            <ProjectContextDropdown className="max-w-[180px]" />
          </div>
        )}
        {showDate && (
          <Link
            to="/today"
            className="rounded-lg px-2 py-1 text-right transition-colors hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated"
            title="打开今日页"
          >
            <span className="block text-base font-semibold tabular-nums text-text-light-primary dark:text-text-dark-primary">{time}</span>
            <span className="block text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
              {now.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', weekday: 'short' })}
            </span>
          </Link>
        )}
      </div>
    </div>
  );
};

export default PageHeader;
