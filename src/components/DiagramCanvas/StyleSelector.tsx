/**
 * StyleSelector Component
 * UI for selecting diagram drawing style (normal, hand-drawn, cartoon)
 * and adjusting roughness/bowing parameters
 */

import { Sparkles, Pencil, Circle } from 'lucide-react';
import type { DrawingStyle } from '../../types/diagrams';

interface StyleSelectorProps {
  currentStyle: DrawingStyle;
  roughness: number;
  bowing: number;
  onStyleChange: (style: DrawingStyle) => void;
  onRoughnessChange: (roughness: number) => void;
  onBowingChange: (bowing: number) => void;
}

export function StyleSelector({
  currentStyle,
  roughness,
  bowing,
  onStyleChange,
  onRoughnessChange,
  onBowingChange,
}: StyleSelectorProps) {
  const styles: Array<{value: DrawingStyle; label: string; icon: typeof Circle}> = [
    { value: 'normal', label: '标准', icon: Circle },
    { value: 'hand-drawn', label: '手绘', icon: Pencil },
    { value: 'cartoon', label: '卡通', icon: Sparkles },
  ];

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-lg space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          绘图样式
        </label>
        <div className="flex gap-2">
          {styles.map((style) => {
            const Icon = style.icon;
            const isActive = currentStyle === style.value;

            return (
              <button
                key={style.value}
                onClick={() => onStyleChange(style.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent-blue text-white'
                    : 'bg-surface-light-secondary dark:bg-surface-dark-secondary text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
                }`}
                aria-label={`将样式设置为${style.label}`}
                aria-pressed={isActive}
              >
                <Icon className="w-4 h-4" />
                {style.label}
              </button>
            );
          })}
        </div>
      </div>

      {currentStyle === 'hand-drawn' && (
        <div className="space-y-3 pt-2 border-t border-border-light dark:border-border-dark">
          <div>
            <label
              htmlFor="roughness-slider"
              className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1"
            >
              粗糙度：{roughness.toFixed(1)}
            </label>
            <input
              id="roughness-slider"
              type="range"
              min="0"
              max="3"
              step="0.1"
              value={roughness}
              onChange={(e) => onRoughnessChange(parseFloat(e.target.value))}
              className="w-full accent-accent-blue"
              aria-label="调整粗糙度（线条的草绘程度）"
            />
            <div className="flex justify-between text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">
              <span>平滑</span>
              <span>草绘</span>
            </div>
          </div>

          <div>
            <label
              htmlFor="bowing-slider"
              className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1"
            >
              弯曲度：{bowing.toFixed(1)}
            </label>
            <input
              id="bowing-slider"
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={bowing}
              onChange={(e) => onBowingChange(parseFloat(e.target.value))}
              className="w-full accent-accent-blue"
              aria-label="调整弯曲度（线条的弯曲程度）"
            />
            <div className="flex justify-between text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">
              <span>平直</span>
              <span>弯曲</span>
            </div>
          </div>
        </div>
      )}

      {currentStyle === 'cartoon' && (
        <div className="p-3 bg-accent-blue/10 rounded-md">
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            卡通风格使用预设值，呈现活泼圆润的外观。
          </p>
        </div>
      )}

      <div className="pt-2 border-t border-border-light dark:border-border-dark">
        <h4 className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          样式预览
        </h4>
        <div className="bg-white dark:bg-surface-dark-secondary p-4 rounded-md border border-border-light dark:border-border-dark">
          <svg width="100%" height="60" viewBox="0 0 200 60" className="overflow-visible">
            {currentStyle === 'normal' && (
              <>
                <rect
                  x="10"
                  y="10"
                  width="40"
                  height="40"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-accent-blue"
                />
                <circle
                  cx="90"
                  cy="30"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-accent-green"
                />
                <line
                  x1="130"
                  y1="30"
                  x2="190"
                  y2="30"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-accent-purple"
                />
              </>
            )}
            {currentStyle !== 'normal' && (
              <text
                x="100"
                y="35"
                textAnchor="middle"
                className="text-sm fill-text-light-tertiary dark:fill-text-dark-tertiary"
              >
                {currentStyle === 'hand-drawn' ? '以手绘样式预览形状' : '以卡通样式预览形状'}
              </text>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
}
