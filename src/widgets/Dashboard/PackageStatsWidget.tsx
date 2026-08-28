/**
 * Package Stats Widget
 * NPM package download statistics
 */

import React, { useState } from 'react';
import { BaseWidget } from './BaseWidget';

interface PackageStats {
  package: string;
  downloads: number;
  period: string;
}

export const PackageStatsWidget: React.FC = () => {
  const [packageName, setPackageName] = useState('');
  const [stats, setStats] = useState<PackageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async (pkg: string) => {
    if (!pkg.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // NPM registry API - last week downloads
      const response = await fetch(
        `https://api.npmjs.org/downloads/point/last-week/${pkg}`
      );
      if (!response.ok) throw new Error('未找到该包');

      const data = await response.json();
      setStats({
        package: data.package,
        downloads: data.downloads,
        period: '最近 7 天',
      });
    } catch (err) {
      setError('未找到该包');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStats(packageName);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <BaseWidget title="NPM 统计" icon="📦" loading={loading} error={error}>
      <div className="space-y-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={packageName}
            onChange={(e) => setPackageName(e.target.value)}
            placeholder="包名称…"
            className="flex-1 px-3 py-2 text-sm rounded-button bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue transition-all duration-standard ease-smooth"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-button text-sm font-medium transition-all duration-standard ease-smooth"
          >
            查询
          </button>
        </form>

        {stats && (
          <div className="space-y-2">
            <div className="bg-surface-light-elevated dark:bg-surface-dark rounded-button p-3 text-center transition-all duration-standard ease-smooth">
              <div className="text-3xl font-bold text-accent-blue">
                {formatNumber(stats.downloads)}
              </div>
              <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                次下载
              </div>
            </div>

            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-text-light-secondary dark:text-text-dark-secondary">包：</span>
                <span className="text-text-light-primary dark:text-text-dark-primary font-mono">
                  {stats.package}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-light-secondary dark:text-text-dark-secondary">周期：</span>
                <span className="text-text-light-primary dark:text-text-dark-primary">
                  {stats.period}
                </span>
              </div>
            </div>

            <a
              href={`https://www.npmjs.com/package/${stats.package}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-sm text-accent-blue hover:underline"
            >
              在 NPM 上查看 →
            </a>
          </div>
        )}

        {!stats && !loading && !error && (
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary text-center py-4">
            输入包名称以查看统计
          </p>
        )}
      </div>
    </BaseWidget>
  );
};
