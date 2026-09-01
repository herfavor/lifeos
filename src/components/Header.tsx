import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, CheckSquare, FileText, Home, Moon, Settings, Sun } from 'lucide-react';
import { useThemeStore } from '../stores/useThemeStore';
import { HeaderClock } from './HeaderClock';

/**
 * Simple Header component - minimal styling
 */
export const Header: React.FC = () => {
  const { mode, toggleTheme } = useThemeStore();
  const location = useLocation();
  const logoSrc = mode === 'dark' ? '/images/logos/lifeos-logo-white.svg' : '/images/logos/lifeos-logo.svg';

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark">
      <div className="container mx-auto px-4 py-3">
        {/* Top row: Branding + Controls */}
        <div className="flex items-center justify-between gap-4 mb-3">
          {/* Branding */}
          <Link to="/" className="flex flex-col">
            <img
              src={logoSrc}
              alt="LifeOS Logo"
              className="h-11 w-auto object-contain"
            />
            <p className="text-[10px] tracking-[0.2em] uppercase text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
              本地优先的个人管理平台
            </p>
          </Link>

          {/* Clock + Theme Toggle */}
          <div className="flex items-center gap-2">
            <HeaderClock />
            <button
              onClick={toggleTheme}
              className="p-2 rounded-button border border-border-light dark:border-border-dark hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-all duration-standard ease-smooth"
              title={`切换到${mode === 'dark' ? '浅色' : '深色'}模式`}
              aria-label={mode === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
            >
              {mode === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-2 overflow-x-auto">
          {[
            { to: '/', label: '首页', icon: Home },
            { to: '/notes', label: '笔记', icon: FileText },
            { to: '/schedule', label: '日程', icon: CalendarDays },
            { to: '/tasks', label: '任务', icon: CheckSquare },
            { to: '/settings', label: '设置', icon: Settings },
          ].map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={`
                inline-flex items-center gap-1.5 px-3 py-2 rounded-button text-sm font-medium transition-all duration-standard ease-smooth
                ${
                  isActive(to)
                    ? 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary'
                    : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
                }
              `}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
};
