/**
 * Saved Dashboard Layouts Section
 *
 * Save, load, and manage dashboard widget layouts.
 */

import React, { useState } from 'react';
import { LayoutGrid, Save, Trash2, Download } from 'lucide-react';
import { useWidgetStore } from '../../stores/useWidgetStore';

export const SavedLayoutsSection: React.FC = () => {
  const savedLayouts = useWidgetStore((s) => s.savedLayouts);
  const saveLayout = useWidgetStore((s) => s.saveLayout);
  const loadLayout = useWidgetStore((s) => s.loadLayout);
  const deleteLayout = useWidgetStore((s) => s.deleteLayout);

  const [layoutName, setLayoutName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  const handleSave = () => {
    const name = layoutName.trim();
    if (!name) return;
    saveLayout(name);
    setLayoutName('');
    setShowSaveInput(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setShowSaveInput(false);
      setLayoutName('');
    }
  };

  return (
    <div className="bento-card p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-5 h-5 text-accent-primary" />
          <h2 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            已保存布局
          </h2>
        </div>
        {!showSaveInput && (
          <button
            onClick={() => setShowSaveInput(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-accent-primary text-white hover:bg-accent-primary-hover transition-colors"
          >
            <Save className="w-3 h-3" />
            保存当前布局
          </button>
        )}
      </div>
      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
        保存并恢复首页扩展组件布局。
      </p>

      {/* Save Input */}
      {showSaveInput && (
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={layoutName}
            onChange={(e) => setLayoutName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="布局名称…"
            autoFocus
            className="flex-1 px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
          <button
            onClick={handleSave}
            disabled={!layoutName.trim()}
            className="px-4 py-2 bg-accent-primary text-white rounded-lg text-sm font-medium hover:bg-accent-primary-hover disabled:opacity-50 transition-colors"
          >
            保存
          </button>
          <button
            onClick={() => {
              setShowSaveInput(false);
              setLayoutName('');
            }}
            className="px-4 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary rounded-lg text-sm font-medium hover:bg-border-light dark:hover:bg-border-dark transition-colors"
          >
            取消
          </button>
        </div>
      )}

      {/* Saved Layouts List */}
      {savedLayouts.length === 0 ? (
        <div className="text-center py-8 text-text-light-tertiary dark:text-text-dark-tertiary">
          <LayoutGrid className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无已保存的布局</p>
          <p className="text-xs mt-1">保存当前首页组件布局，以便在不同布局间切换</p>
        </div>
      ) : (
        <div className="space-y-2">
          {savedLayouts.map((layout) => (
            <div
              key={layout.id}
              className="flex items-center justify-between p-3 rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary truncate">
                  {layout.name}
                </p>
                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                  {layout.enabledWidgets.length} 个组件 &middot;{' '}
                  {new Date(layout.savedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => loadLayout(layout.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg text-accent-primary hover:bg-accent-primary/10 transition-colors"
                  title="加载此布局"
                >
                  <Download className="w-3 h-3" />
                  加载
                </button>
                <button
                  onClick={() => deleteLayout(layout.id)}
                  className="p-1.5 text-text-light-tertiary dark:text-text-dark-tertiary hover:text-accent-red transition-colors rounded-lg"
                  title="删除此布局"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
