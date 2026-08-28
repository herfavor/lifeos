/**
 * Calendar Management Section
 * Manage user calendars (Work, Personal, etc.) and ICS URL subscriptions
 */

import { useState } from 'react';
import { Plus, Trash2, Eye, EyeOff, RefreshCw, Globe, Pencil } from 'lucide-react';
import { useCalendarStore } from '../../stores/useCalendarStore';
import { importFromICS } from '../../services/icsImportExport';
import type { UserCalendar, ICSSubscription } from '../../types';

const PRESET_COLORS = [
  '#2563eb', '#059669', '#d97706', '#e11d48', '#9333ea',
  '#0d9488', '#4f46e5', '#ea580c', '#84cc16', '#06b6d4',
];

export function CalendarManagementSection() {
  const {
    calendars, addCalendar, updateCalendar, deleteCalendar, toggleCalendarVisibility,
    icsSubscriptions, addICSSubscription, removeICSSubscription, syncICSSubscription,
  } = useCalendarStore();

  const [newCalName, setNewCalName] = useState('');
  const [newCalColor, setNewCalColor] = useState('#2563eb');
  const [editingCal, setEditingCal] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  // ICS subscription form
  const [showICSForm, setShowICSForm] = useState(false);
  const [icsName, setIcsName] = useState('');
  const [icsUrl, setIcsUrl] = useState('');
  const [icsColor, setIcsColor] = useState('#06b6d4');
  const [icsAutoSync, setIcsAutoSync] = useState(60);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ id: string; message: string; type: 'success' | 'error' } | null>(null);

  const handleAddCalendar = () => {
    if (!newCalName.trim()) return;
    addCalendar(newCalName.trim(), newCalColor);
    setNewCalName('');
    setNewCalColor('#2563eb');
  };

  const handleStartEdit = (cal: UserCalendar) => {
    setEditingCal(cal.id);
    setEditName(cal.name);
    setEditColor(cal.color);
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    updateCalendar(id, { name: editName.trim(), color: editColor });
    setEditingCal(null);
  };

  const handleAddICS = () => {
    if (!icsName.trim() || !icsUrl.trim()) return;
    addICSSubscription(icsName.trim(), icsUrl.trim(), icsColor, icsAutoSync);
    setIcsName('');
    setIcsUrl('');
    setIcsColor('#06b6d4');
    setIcsAutoSync(60);
    setShowICSForm(false);
  };

  const handleSync = async (sub: ICSSubscription) => {
    setSyncingId(sub.id);
    setSyncStatus(null);

    try {
      const response = await fetch(sub.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const icsData = await response.text();
      const result = importFromICS(icsData);

      if (result.success && result.events) {
        const count = syncICSSubscription(sub.id, result.events);
        setSyncStatus({ id: sub.id, message: `已同步 ${count} 个事件`, type: 'success' });
      } else {
        setSyncStatus({ id: sub.id, message: result.error || '解析失败', type: 'error' });
      }
    } catch (err) {
      setSyncStatus({ id: sub.id, message: String(err), type: 'error' });
    } finally {
      setSyncingId(null);
      setTimeout(() => setSyncStatus(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendars Section */}
      <div className="bento-card p-6">
        <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
          我的日历
        </h2>

        {/* Calendar list */}
        <div className="space-y-2 mb-4">
          {calendars.map((cal) => (
            <div
              key={cal.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated"
            >
              {editingCal === cal.id ? (
                <>
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(cal.id); }}
                    className="flex-1 px-2 py-1 text-sm bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded text-text-light-primary dark:text-text-dark-primary"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(cal.id)}
                    className="text-xs text-accent-primary hover:underline"
                  >
                    保存
                  </button>
                  <button
                    onClick={() => setEditingCal(null)}
                    className="text-xs text-text-light-secondary hover:underline"
                  >
                    取消
                  </button>
                </>
              ) : (
                <>
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cal.color }}
                  />
                  <span className="flex-1 text-sm text-text-light-primary dark:text-text-dark-primary">
                    {cal.name}
                  </span>
                  <button
                    onClick={() => toggleCalendarVisibility(cal.id)}
                    className="p-1 rounded hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
                    title={cal.visible ? '隐藏日历' : '显示日历'}
                  >
                    {cal.visible ? (
                      <Eye className="w-4 h-4 text-text-light-secondary dark:text-text-dark-secondary" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
                    )}
                  </button>
                  <button
                    onClick={() => handleStartEdit(cal)}
                    className="p-1 rounded hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-text-light-secondary dark:text-text-dark-secondary" />
                  </button>
                  <button
                    onClick={() => deleteCalendar(cal.id)}
                    className="p-1 rounded hover:bg-status-error/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-status-error" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Add calendar form */}
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={newCalColor}
            onChange={(e) => setNewCalColor(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0"
          />
          <input
            type="text"
            value={newCalName}
            onChange={(e) => setNewCalName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddCalendar(); }}
            placeholder="新日历名称"
            className="flex-1 px-3 py-2 text-sm bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary placeholder-text-light-secondary dark:placeholder-text-dark-secondary"
          />
          <button
            onClick={handleAddCalendar}
            disabled={!newCalName.trim()}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium bg-accent-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            添加
          </button>
        </div>

        {/* Preset colors */}
        <div className="flex gap-1.5 mt-3">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setNewCalColor(color)}
              className={`w-5 h-5 rounded-full transition-transform ${
                newCalColor === color ? 'ring-2 ring-offset-1 ring-text-light-primary dark:ring-text-dark-primary scale-110' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      {/* ICS Subscriptions Section */}
      <div className="bento-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            日历订阅
          </h2>
          <button
            onClick={() => setShowICSForm(!showICSForm)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-accent-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Globe className="w-4 h-4" />
            订阅 URL
          </button>
        </div>

        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
          订阅外部 ICS 日历 URL（Google Calendar、Outlook 等）以进行只读同步。
        </p>

        {/* Add subscription form */}
        {showICSForm && (
          <div className="mb-4 p-4 rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated space-y-3">
            <input
              type="text"
              value={icsName}
              onChange={(e) => setIcsName(e.target.value)}
              placeholder="日历名称（例如 Google Calendar）"
              className="w-full px-3 py-2 text-sm bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary placeholder-text-light-secondary"
            />
            <input
              type="url"
              value={icsUrl}
              onChange={(e) => setIcsUrl(e.target.value)}
              placeholder="ICS URL（例如 https://calendar.google.com/...basic.ics）"
              className="w-full px-3 py-2 text-sm bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary placeholder-text-light-secondary"
            />
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={icsColor}
                onChange={(e) => setIcsColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0"
              />
              <div className="flex-1">
                <label className="block text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  自动同步间隔（分钟，0 = 手动）
                </label>
                <input
                  type="number"
                  min={0}
                  step={15}
                  value={icsAutoSync}
                  onChange={(e) => setIcsAutoSync(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 px-2 py-1 text-sm bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded text-text-light-primary dark:text-text-dark-primary"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddICS}
                disabled={!icsName.trim() || !icsUrl.trim()}
                className="px-4 py-2 text-sm font-medium bg-accent-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                添加订阅
              </button>
              <button
                onClick={() => setShowICSForm(false)}
                className="px-4 py-2 text-sm font-medium bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* Subscriptions list */}
        {icsSubscriptions.length === 0 ? (
          <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary italic">
            暂无订阅。添加 ICS URL 以同步外部日历。
          </p>
        ) : (
          <div className="space-y-2">
            {icsSubscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated"
              >
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: sub.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary truncate">
                    {sub.name}
                  </div>
                  <div className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary truncate">
                    {sub.lastSyncedAt
                      ? `上次同步：${new Date(sub.lastSyncedAt).toLocaleString()}`
                      : '从未同步'}
                  </div>
                </div>
                {syncStatus?.id === sub.id && (
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    syncStatus.type === 'success' ? 'bg-status-success/20 text-status-success' : 'bg-status-error/20 text-status-error'
                  }`}>
                    {syncStatus.message}
                  </span>
                )}
                <button
                  onClick={() => handleSync(sub)}
                  disabled={syncingId === sub.id}
                  className="p-1.5 rounded hover:bg-surface-light dark:hover:bg-surface-dark transition-colors disabled:opacity-50"
                  title="立即同步"
                >
                  <RefreshCw className={`w-4 h-4 text-accent-primary ${syncingId === sub.id ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={() => removeICSSubscription(sub.id)}
                  className="p-1.5 rounded hover:bg-status-error/10 transition-colors"
                  title="移除订阅"
                >
                  <Trash2 className="w-3.5 h-3.5 text-status-error" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
