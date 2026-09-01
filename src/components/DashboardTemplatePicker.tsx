/**
 * Dashboard Template Picker
 *
 * Shows starter layout templates when the dashboard is empty.
 * Allows users to quickly bootstrap their dashboard with a curated layout.
 */

import React from 'react';
import { useWidgetStore } from '../stores/useWidgetStore';
import { getWidget } from '../widgets/Dashboard/WidgetRegistry';
import { Briefcase, FolderOpen, LayoutGrid, Sparkles, Sun, type LucideIcon } from 'lucide-react';

interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  widgets: string[];
  sizes: Record<string, 1 | 2 | 3>;
}

const TEMPLATES: DashboardTemplate[] = [
  {
    id: 'lifeos-default',
    name: '我的今天',
    description: '今天、快速记录、近期日程、项目与笔记——克制的日常布局',
    icon: Sun,
    widgets: ['myday', 'quickadd', 'upcomingevents', 'portfolio', 'recentnotes'],
    sizes: {
      myday: 1,
      quickadd: 1,
      upcomingevents: 1,
      portfolio: 1,
      recentnotes: 1,
    },
  },
  {
    id: 'productivity',
    name: '高效专注',
    description: '任务概览、日历、番茄钟和笔记，助你高效完成工作',
    icon: Briefcase,
    widgets: ['taskssummary', 'upcomingevents', 'pomodoro', 'recentnotes', 'quickadd'],
    sizes: {
      taskssummary: 1,
      upcomingevents: 1,
      pomodoro: 1,
      recentnotes: 1,
      quickadd: 1,
    },
  },
  {
    id: 'projects',
    name: '项目总览',
    description: '项目健康度、每周洞察与近期日程，掌握整体进展',
    icon: FolderOpen,
    widgets: ['portfolio', 'taskssummary', 'weeklyinsights', 'upcomingevents'],
    sizes: {
      portfolio: 2,
      taskssummary: 1,
      weeklyinsights: 1,
      upcomingevents: 1,
    },
  },
  {
    id: 'minimal',
    name: '极简',
    description: '只保留快速记录和今天——最少干扰',
    icon: Sparkles,
    widgets: ['quickadd', 'myday'],
    sizes: {
      quickadd: 2,
      myday: 1,
    },
  },
];

interface DashboardTemplatePickerProps {
  onCustomize: () => void;
}

export const DashboardTemplatePicker: React.FC<DashboardTemplatePickerProps> = ({
  onCustomize,
}) => {
  const enableWidget = useWidgetStore((state) => state.enableWidget);
  const setWidgetSize = useWidgetStore((state) => state.setWidgetSize);
  const reorderWidgets = useWidgetStore((state) => state.reorderWidgets);

  const applyTemplate = (template: DashboardTemplate) => {
    // Enable each widget and set its size
    template.widgets.forEach((widgetId) => {
      enableWidget(widgetId);
    });

    Object.entries(template.sizes).forEach(([widgetId, size]) => {
      setWidgetSize(widgetId, size);
    });

    // Set the order
    reorderWidgets(template.widgets);
  };

  return (
    <div className="text-center py-8 animate-fade-in">
      {/* Hero */}
      <div className="flex justify-center mb-6">
        <div className="p-6 bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10 dark:from-accent-primary/10 dark:to-accent-primary/10 rounded-2xl">
          <LayoutGrid className="w-16 h-16 text-accent-primary" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
        设置你的首页
      </h2>
      <p className="text-text-light-secondary dark:text-text-dark-secondary mb-8 max-w-md mx-auto">
        选择一个入门模板或从零开始自定义。之后随时可以更改布局。
      </p>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
        {TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => applyTemplate(template)}
            className="p-5 rounded-card border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark-elevated hover:border-accent-primary/50 hover:shadow-lg transition-all duration-standard ease-smooth text-left group"
          >
            <div className="flex items-center gap-3 mb-3">
              <template.icon className="h-8 w-8 text-accent-primary group-hover:scale-110 transition-transform duration-standard ease-smooth" aria-hidden />
              <div>
                <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
                  {template.name}
                </h3>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                  {template.widgets.length} 个组件
                </p>
              </div>
            </div>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-3">
              {template.description}
            </p>
            {/* Widget preview pills */}
            <div className="flex flex-wrap gap-1">
              {template.widgets.slice(0, 5).map((wId) => {
                const w = getWidget(wId);
                return w ? (
                  <span
                    key={wId}
                    className="text-xs px-2 py-0.5 rounded-full bg-surface-light-elevated dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary"
                  >
                    {w.icon} {w.name}
                  </span>
                ) : null;
              })}
              {template.widgets.length > 5 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-surface-light-elevated dark:bg-surface-dark text-text-light-tertiary dark:text-text-dark-tertiary">
                  +{template.widgets.length - 5} 更多
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Custom option */}
      <button
        onClick={onCustomize}
        className="px-6 py-3 bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark text-text-light-primary dark:text-text-dark-primary rounded-button font-medium transition-all duration-standard ease-smooth"
      >
        或从零开始自定义…
      </button>
    </div>
  );
};
