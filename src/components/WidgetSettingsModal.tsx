/**
 * Widget Settings Modal
 *
 * Clean modal interface for configuring widget settings
 * - Widget size (1x, 2x, 3x)
 * - Extensible for widget-specific settings
 */

import React, { useState } from 'react';
import { useWidgetStore } from '../stores/useWidgetStore';
import { getWidget } from '../widgets/Dashboard/WidgetRegistry';
import { WidgetConfigPanel } from './WidgetConfigPanel';

/** Preset accent colors for widget theming */
const ACCENT_COLORS = [
  { label: '默认', value: '' },
  { label: '蓝色', value: '#3b82f6' },
  { label: '紫色', value: '#8b5cf6' },
  { label: '粉色', value: '#ec4899' },
  { label: '红色', value: '#ef4444' },
  { label: '橙色', value: '#f97316' },
  { label: '黄色', value: '#eab308' },
  { label: '绿色', value: '#22c55e' },
  { label: '蓝绿色', value: '#14b8a6' },
  { label: '青色', value: '#06b6d4' },
];

interface WidgetSettingsModalProps {
  widgetId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const WidgetSettingsModal: React.FC<WidgetSettingsModalProps> = ({
  widgetId,
  isOpen,
  onClose,
}) => {
  const widgetSizes = useWidgetStore((state) => state.widgetSizes);
  const setWidgetSize = useWidgetStore((state) => state.setWidgetSize);
  const widgetSettings = useWidgetStore((state) => state.getWidgetSettings(widgetId));
  const updateWidgetSettings = useWidgetStore((state) => state.updateWidgetSettings);
  const currentSize = widgetSizes[widgetId] || 1;
  const [selectedSize, setSelectedSize] = useState<1 | 2 | 3>(currentSize);
  const [accentColor, setAccentColor] = useState(widgetSettings.accentColor ?? '');

  const widgetMeta = getWidget(widgetId);
  const isWeatherMap = widgetId === 'weathermap';

  const handleApply = () => {
    setWidgetSize(widgetId, selectedSize);
    updateWidgetSettings(widgetId, { accentColor: accentColor || undefined });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div
          className="bg-surface-light dark:bg-surface-dark-elevated rounded-button shadow-2xl border border-border-light dark:border-border-dark w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark">
            <h2 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
              组件设置
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated rounded-button transition-all duration-standard ease-smooth"
              aria-label="关闭"
            >
              <svg
                className="w-4 h-4 text-text-light-secondary dark:text-text-dark-secondary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-4 space-y-4">
            {/* Widget Info */}
            <div>
              <h3 className="text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-0.5">
                {widgetMeta?.name || widgetId}
              </h3>
              <p className="text-[10px] text-text-light-secondary dark:text-text-dark-secondary">
                {widgetMeta?.description || '配置组件设置'}
              </p>
            </div>

            {/* Size Selector */}
            {!isWeatherMap && (
              <div>
                <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  组件大小
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {([1, 2, 3] as const).map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`
                        relative px-3 py-2 rounded-button border-2 transition-all duration-standard ease-smooth
                        ${selectedSize === size
                          ? 'border-accent-blue bg-accent-blue/10 dark:bg-accent-blue/20'
                          : 'border-border-light dark:border-border-dark hover:border-accent-blue/50'
                        }
                      `}
                    >
                      <div className="text-center">
                        <div className="text-base font-bold text-text-light-primary dark:text-text-dark-primary">
                          {size}x
                        </div>
                        <div className="text-[9px] text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
                          {size === 1 ? '紧凑' : size === 2 ? '中等' : '宽屏'}
                        </div>
                      </div>
                      {selectedSize === size && (
                        <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-accent-blue rounded-full flex items-center justify-center">
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isWeatherMap && (
              <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                天气地图的大小已锁定，以确保交互式地图的最佳显示。
              </div>
            )}

            {/* Widget-Specific Configuration */}
            <div>
              <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                组件配置
              </label>
              <div className="p-3 bg-surface-light dark:bg-surface-dark rounded-button border border-border-light dark:border-border-dark">
                <WidgetConfigPanel widgetId={widgetId} />
              </div>
            </div>

            {/* Accent Color Picker */}
            <div>
              <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                强调色
              </label>
              <div className="flex flex-wrap gap-2">
                {ACCENT_COLORS.map((color) => (
                  <button
                    key={color.value || 'default'}
                    onClick={() => setAccentColor(color.value)}
                    className={`w-7 h-7 rounded-full border-2 transition-all duration-standard ease-smooth flex items-center justify-center ${
                      accentColor === color.value
                        ? 'border-text-light-primary dark:border-text-dark-primary scale-110'
                        : 'border-border-light dark:border-border-dark hover:scale-105'
                    }`}
                    style={color.value ? { backgroundColor: color.value } : undefined}
                    title={color.label}
                    aria-label={`将强调色设置为 ${color.label}`}
                  >
                    {!color.value && (
                      <svg className="w-4 h-4 text-text-light-secondary dark:text-text-dark-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    )}
                    {accentColor === color.value && color.value && (
                      <svg className="w-3.5 h-3.5 text-white drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-text-light-secondary dark:text-text-dark-secondary mt-1.5">
                为组件添加彩色顶部边框
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-light dark:border-border-dark">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated rounded-button transition-all duration-standard ease-smooth"
            >
              取消
            </button>
            <button
              onClick={handleApply}
              className="px-3 py-1.5 text-xs font-medium bg-accent-blue hover:bg-accent-blue-hover text-white rounded-button transition-all duration-standard ease-smooth"
            >
              应用
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
