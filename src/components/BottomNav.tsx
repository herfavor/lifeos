import React, { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Circle, MoreHorizontal, Settings, X } from 'lucide-react';
import { CORE_FEATURES, getFeature } from '../config/features';
import { NAV_ICONS } from './Sidebar';

interface BottomNavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  path: string;
}

// Mobile keeps the daily loop one tap away; everything else lives in More.
const MAIN_FEATURE_IDS = new Set(['today', 'inbox', 'tasks', 'notes']);

const toNavItem = (id: string): BottomNavItem | null => {
  const feature = getFeature(id);
  if (!feature?.path) return null;
  return {
    icon: NAV_ICONS[id] ?? Circle,
    label: feature.label,
    path: feature.path,
  };
};

const mainItems: BottomNavItem[] = CORE_FEATURES
  .filter((feature) => MAIN_FEATURE_IDS.has(feature.id) && feature.path)
  .map((feature) => ({
    icon: NAV_ICONS[feature.id] ?? Circle,
    label: feature.label,
    path: feature.path!,
  }));

const moreItems: BottomNavItem[] = [
  toNavItem('ai-assistant'),
  ...CORE_FEATURES
    .filter((feature) => !MAIN_FEATURE_IDS.has(feature.id) && feature.path)
    .map((feature) => ({ icon: NAV_ICONS[feature.id] ?? Circle, label: feature.label, path: feature.path! })),
  toNavItem('home'),
  toNavItem('bookmarks'),
  toNavItem('docs-center'),
  toNavItem('focus'),
  { icon: Settings, label: '设置', path: '/settings' },
].filter((item): item is BottomNavItem => item !== null);

const allItems = [...mainItems, ...moreItems];

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  const isActive = useCallback(
    (path: string) => {
      const [pathname, query] = path.split('?');
      if (pathname === '/') return location.pathname === '/';
      if (location.pathname !== pathname && !location.pathname.startsWith(`${pathname}/`)) {
        return false;
      }

      if (query) {
        const expected = new URLSearchParams(query);
        const current = new URLSearchParams(location.search);
        return Array.from(expected.entries()).every(([key, value]) => current.get(key) === value);
      }

      // Query-specific routes take precedence over their parent page so only
      // one navigation item is highlighted at a time.
      const hasSpecificMatch = allItems.some((item) => {
        if (!item.path.startsWith(`${pathname}?`)) return false;
        const expected = new URLSearchParams(item.path.split('?')[1]);
        const current = new URLSearchParams(location.search);
        return Array.from(expected.entries()).every(([key, value]) => current.get(key) === value);
      });
      return !hasSpecificMatch;
    },
    [location.pathname, location.search]
  );

  const isMoreActive = moreItems.some((item) => isActive(item.path));

  useEffect(() => {
    setShowMore(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!showMore) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMore(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showMore]);

  return (
    <>
      {showMore && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-[49] backdrop-blur-sm"
          onClick={() => setShowMore(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`
          md:hidden fixed bottom-[60px] left-0 right-0 z-50
          bg-surface-light dark:bg-surface-dark
          border-t border-border-light dark:border-border-dark
          max-h-[calc(100dvh-60px)] overflow-y-auto overscroll-contain
          rounded-t-2xl shadow-2xl
          transition-transform duration-200 ease-out
          ${showMore ? 'translate-y-0' : 'translate-y-full'}
        `}
        role="dialog"
        aria-label="更多导航选项"
        aria-hidden={!showMore}
      >
        <div className="p-4 pb-2">
          <div className="w-8 h-1 bg-border-light dark:bg-border-dark rounded-full mx-auto mb-4" />

          <div className="grid grid-cols-3 gap-2">
            {moreItems.map(({ icon: Icon, label, path }) => (
              <Link
                key={path}
                to={path}
                className={`
                  flex flex-col items-center justify-center gap-1.5
                  min-h-[64px] rounded-xl
                  transition-colors duration-150
                  ${
                    isActive(path)
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
                  }
                `}
                onClick={() => setShowMore(false)}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-light dark:bg-surface-dark border-t border-border-light dark:border-border-dark"
        aria-label="移动端导航"
      >
        <div className="flex items-stretch justify-around h-[60px]">
          {mainItems.map(({ icon: Icon, label, path }) => {
            const active = isActive(path);
            return (
              <Link
                key={path}
                to={path}
                className={`
                  flex flex-col items-center justify-center gap-0.5
                  min-w-[52px] min-h-[44px] flex-1
                  transition-colors duration-150
                  ${active ? 'text-accent-primary' : 'text-text-light-secondary dark:text-text-dark-secondary'}
                `}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="text-[11px] font-medium leading-tight">{label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => setShowMore((prev) => !prev)}
            className={`
              flex flex-col items-center justify-center gap-0.5
              min-w-[52px] min-h-[44px] flex-1
              transition-colors duration-150
              ${showMore || isMoreActive ? 'text-accent-primary' : 'text-text-light-secondary dark:text-text-dark-secondary'}
            `}
            aria-expanded={showMore}
            aria-label="更多导航选项"
          >
            {showMore ? <X className="h-4 w-4" aria-hidden="true" /> : <MoreHorizontal className="h-4 w-4" aria-hidden="true" />}
            <span className="text-[11px] font-medium leading-tight">更多</span>
          </button>
        </div>

        <div className="h-[env(safe-area-inset-bottom,0px)] bg-surface-light dark:bg-surface-dark" />
      </nav>
    </>
  );
};
