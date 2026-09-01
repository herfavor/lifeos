import React, { useState, useEffect } from 'react';
import type { Task } from '../types';
import { parseRecurrenceNaturalLanguage } from '../utils/naturalLanguageRecurrence';
import { TemplatePicker } from './TemplatePicker';
import { useTemplateStore } from '../stores/useTemplateStore';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';

interface RecurrencePickerProps {
  value: Task['recurrence'];
  onChange: (recurrence: Task['recurrence']) => void;
  onClose?: () => void;
}

/**
 * RecurrencePicker Component
 * UI for setting up recurring task patterns
 *
 * Features:
 * - Frequency selection (daily, weekly, monthly, yearly)
 * - Interval input (every X days/weeks/months/years)
 * - Day of week picker (for weekly)
 * - Day of month picker (for monthly)
 * - End condition (never, after X occurrences, until date)
 * - Clear visual feedback
 * - Matches Calendar event recurrence UI patterns
 */
export const RecurrencePicker: React.FC<RecurrencePickerProps> = ({
  value,
  onChange,
  onClose,
}) => {
  // Local state (synced with value prop)
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>(
    value?.frequency || 'weekly'
  );
  const [interval, setInterval] = useState<number>(value?.interval || 1);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(value?.daysOfWeek || []);
  const [dayOfMonth, setDayOfMonth] = useState<number | undefined>(value?.dayOfMonth);
  const [weekOfMonth, setWeekOfMonth] = useState<1 | 2 | 3 | 4 | -1 | undefined>(value?.weekOfMonth);
  const [dayOfWeekInMonth, setDayOfWeekInMonth] = useState<number | undefined>(value?.dayOfWeekInMonth);
  const [monthlyMode, setMonthlyMode] = useState<'day' | 'ordinal'>('day');
  const [endType, setEndType] = useState<'never' | 'after' | 'until'>(value?.endType || 'never');
  const [endCount, setEndCount] = useState<number | undefined>(value?.endCount);
  const [endDate, setEndDate] = useState<string | undefined>(value?.endDate);
  const [recurFromCompletion, setRecurFromCompletion] = useState<boolean>(value?.recurFromCompletion || false);
  const [templateId, setTemplateId] = useState<string | undefined>(value?.templateId);

  // Natural language input state
  const [naturalInput, setNaturalInput] = useState<string>('');
  const [parseError, setParseError] = useState<string | null>(null);

  // Advanced section toggle
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Template store
  const { templates } = useTemplateStore();

  // Sync local state with value prop when it changes
  useEffect(() => {
    if (value) {
      setFrequency(value.frequency);
      setInterval(value.interval);
      setDaysOfWeek(value.daysOfWeek || []);
      setDayOfMonth(value.dayOfMonth);
      setWeekOfMonth(value.weekOfMonth);
      setDayOfWeekInMonth(value.dayOfWeekInMonth);
      // Set monthlyMode based on which fields are present
      if (value.weekOfMonth !== undefined && value.dayOfWeekInMonth !== undefined) {
        setMonthlyMode('ordinal');
      } else {
        setMonthlyMode('day');
      }
      setEndType(value.endType);
      setEndCount(value.endCount);
      setEndDate(value.endDate);
      setRecurFromCompletion(value.recurFromCompletion || false);
      setTemplateId(value.templateId);
    }
  }, [value]);

  // Helper: Parse natural language input
  const handleParseNaturalLanguage = () => {
    if (!naturalInput.trim()) {
      setParseError(null);
      return;
    }

    const parsed = parseRecurrenceNaturalLanguage(naturalInput);
    if (parsed) {
      // Auto-fill fields from parsed rule
      setFrequency(parsed.frequency);
      if (parsed.interval !== undefined) setInterval(parsed.interval);
      if (parsed.daysOfWeek) setDaysOfWeek(parsed.daysOfWeek);
      if (parsed.dayOfMonth !== undefined) setDayOfMonth(parsed.dayOfMonth);
      if (parsed.weekOfMonth !== undefined) setWeekOfMonth(parsed.weekOfMonth);
      if (parsed.dayOfWeekInMonth !== undefined) setDayOfWeekInMonth(parsed.dayOfWeekInMonth);
      // Set monthlyMode based on which fields are present
      if (parsed.weekOfMonth !== undefined && parsed.dayOfWeekInMonth !== undefined) {
        setMonthlyMode('ordinal');
      } else if (parsed.dayOfMonth !== undefined) {
        setMonthlyMode('day');
      }
      setEndType(parsed.endType);
      if (parsed.endCount !== undefined) setEndCount(parsed.endCount);
      if (parsed.endDate) setEndDate(parsed.endDate);
      setParseError(null);
    } else {
      setParseError('无法解析输入。请尝试 "every 2 weeks on Monday"');
    }
  };

  // Helper: Toggle day of week selection
  const toggleDayOfWeek = (day: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b)
    );
  };

  // Helper: Build recurrence summary text
  const getRecurrenceSummary = (): string => {
    let summary = '重复：';

    // Frequency and interval
    const intervalUnitLabels: Record<string, string> = { daily: '天', weekly: '周', monthly: '月', yearly: '年' };
    const singleFrequencyLabels: Record<string, string> = { daily: '每天', weekly: '每周', monthly: '每月', yearly: '每年' };
    if (interval === 1) {
      summary += singleFrequencyLabels[frequency];
    } else {
      summary += `每 ${interval} ${intervalUnitLabels[frequency]}`;
    }

    // Days of week (for weekly)
    if (frequency === 'weekly' && daysOfWeek.length > 0) {
      const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      const selectedDays = daysOfWeek.map((d) => dayNames[d]).join('、');
      summary += `，在 ${selectedDays}`;
    }

    // Day of month or ordinal pattern (for monthly)
    if (frequency === 'monthly') {
      if (weekOfMonth !== undefined && dayOfWeekInMonth !== undefined) {
        const ordinalStr = { '1': '第一个', '2': '第二个', '3': '第三个', '4': '第四个', '-1': '最后一个' }[weekOfMonth.toString()];
        const dayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        summary += `，在${ordinalStr}${dayNames[dayOfWeekInMonth]}`;
      } else if (dayOfMonth) {
        summary += `，在每月 ${dayOfMonth} 日`;
      }
    }

    // End condition
    if (endType === 'after' && endCount) {
      summary += `，在 ${endCount} 次后结束`;
    } else if (endType === 'until' && endDate) {
      summary += `，在 ${endDate} 结束`;
    }

    return summary;
  };

  // Save recurrence and call onChange
  const handleSave = () => {
    const recurrence: Task['recurrence'] = {
      frequency,
      interval,
      daysOfWeek: frequency === 'weekly' ? daysOfWeek : undefined,
      dayOfMonth: frequency === 'monthly' && monthlyMode === 'day' ? dayOfMonth : undefined,
      weekOfMonth: frequency === 'monthly' && monthlyMode === 'ordinal' ? weekOfMonth : undefined,
      dayOfWeekInMonth: frequency === 'monthly' && monthlyMode === 'ordinal' ? dayOfWeekInMonth : undefined,
      endType,
      endCount: endType === 'after' ? endCount : undefined,
      endDate: endType === 'until' ? endDate : undefined,
      recurFromCompletion,
      templateId,
    };

    onChange(recurrence);
    if (onClose) onClose();
  };

  // Clear recurrence
  const handleClear = () => {
    onChange(undefined);
    if (onClose) onClose();
  };

  return (
    <div className="space-y-4 p-4 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
          设置重复
        </h3>
        {value && (
          <button
            onClick={handleClear}
            className="text-xs text-accent-red hover:text-accent-red-hover dark:text-accent-red dark:hover:text-accent-red-hover"
          >
            清除
          </button>
        )}
      </div>

      {/* Natural Language Input (Quick Setup) */}
      <div>
        <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
          快速设置（可选）
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={naturalInput}
            onChange={(e) => setNaturalInput(e.target.value)}
            onBlur={handleParseNaturalLanguage}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleParseNaturalLanguage();
              }
            }}
            placeholder="例如：every 2 weeks on Monday"
            className="flex-1 px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue outline-none"
          />
          {naturalInput && (
            <button
              onClick={() => {
                setNaturalInput('');
                setParseError(null);
              }}
              className="px-3 py-2 text-sm text-text-light-tertiary dark:text-text-dark-tertiary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
            >
              清除
            </button>
          )}
        </div>
        {parseError && (
          <p className="text-xs text-accent-red dark:text-accent-red mt-1">{parseError}</p>
        )}
        {naturalInput && !parseError && (
          <p className="text-xs text-accent-green dark:text-accent-green mt-1">
            <Check className="w-3 h-3 inline mr-1" />
            解析成功
          </p>
        )}
      </div>

      {/* Frequency */}
      <div>
        <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
          频率
        </label>
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly')}
          className="w-full p-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue outline-none"
        >
          <option value="daily">每天</option>
          <option value="weekly">每周</option>
          <option value="monthly">每月</option>
          <option value="yearly">每年</option>
        </select>
      </div>

      {/* Interval */}
      <div>
        <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
          重复间隔
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="999"
            value={interval}
            onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-20 p-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue outline-none"
          />
          <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            {frequency === 'daily' && '天'}
            {frequency === 'weekly' && '周'}
            {frequency === 'monthly' && '月'}
            {frequency === 'yearly' && '年'}
          </span>
        </div>
      </div>

      {/* Days of Week (for weekly) */}
      {frequency === 'weekly' && (
        <div>
          <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
            重复于
          </label>
          <div className="flex gap-2">
            {['日', '一', '二', '三', '四', '五', '六'].map((day, index) => (
              <button
                key={day}
                onClick={() => toggleDayOfWeek(index)}
                className={`
                  flex-1 py-2 px-1 text-xs font-medium rounded-lg transition-colors
                  ${
                    daysOfWeek.includes(index)
                      ? 'bg-accent-blue text-white'
                      : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
                  }
                `}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Pattern Selection */}
      {frequency === 'monthly' && (
        <div className="space-y-3">
          <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
            重复于
          </label>

          {/* Option 1: Specific day of month */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="monthly-mode"
              checked={monthlyMode === 'day'}
              onChange={() => setMonthlyMode('day')}
              className="w-4 h-4 text-accent-blue focus:ring-2 focus:ring-accent-blue"
            />
            <span className="text-sm text-text-light-primary dark:text-text-dark-primary">日期</span>
            <input
              type="number"
              min="1"
              max="31"
              value={dayOfMonth || ''}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setDayOfMonth(val >= 1 && val <= 31 ? val : undefined);
                setMonthlyMode('day');
              }}
              placeholder="1-31"
              disabled={monthlyMode !== 'day'}
              className="w-20 p-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue outline-none disabled:opacity-50"
            />
          </label>

          {/* Option 2: Ordinal pattern (first Monday, last Friday, etc.) */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="monthly-mode"
              checked={monthlyMode === 'ordinal'}
              onChange={() => setMonthlyMode('ordinal')}
              className="w-4 h-4 text-accent-blue focus:ring-2 focus:ring-accent-blue"
            />
            <span className="text-sm text-text-light-primary dark:text-text-dark-primary">第</span>
            <select
              value={weekOfMonth || 1}
              onChange={(e) => {
                setWeekOfMonth(parseInt(e.target.value) as 1 | 2 | 3 | 4 | -1);
                setMonthlyMode('ordinal');
              }}
              disabled={monthlyMode !== 'ordinal'}
              className="p-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue outline-none disabled:opacity-50"
            >
              <option value={1}>一</option>
              <option value={2}>二</option>
              <option value={3}>三</option>
              <option value={4}>四</option>
              <option value={-1}>最后</option>
            </select>
            <select
              value={dayOfWeekInMonth !== undefined ? dayOfWeekInMonth : 1}
              onChange={(e) => {
                setDayOfWeekInMonth(parseInt(e.target.value));
                setMonthlyMode('ordinal');
              }}
              disabled={monthlyMode !== 'ordinal'}
              className="p-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue outline-none disabled:opacity-50"
            >
              <option value={0}>星期日</option>
              <option value={1}>星期一</option>
              <option value={2}>星期二</option>
              <option value={3}>星期三</option>
              <option value={4}>星期四</option>
              <option value={5}>星期五</option>
              <option value={6}>星期六</option>
            </select>
          </label>
        </div>
      )}

      {/* Recur from Completion Date */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={recurFromCompletion}
            onChange={(e) => setRecurFromCompletion(e.target.checked)}
            className="w-4 h-4 text-accent-blue focus:ring-2 focus:ring-accent-blue rounded"
          />
          <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
            从完成日期开始重复
          </span>
        </label>
        <p className="mt-1 ml-6 text-xs text-text-light-secondary dark:text-text-dark-secondary">
          启用后，下一次重复将从你完成任务的时间计算（而非截止日期）
        </p>
      </div>

      {/* End Condition */}
      <div>
        <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
          结束条件
        </label>
        <div className="space-y-3">
          {/* Never */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="endType"
              checked={endType === 'never'}
              onChange={() => setEndType('never')}
              className="w-4 h-4 text-accent-blue focus:ring-2 focus:ring-accent-blue"
            />
            <span className="text-sm text-text-light-primary dark:text-text-dark-primary">从不</span>
          </label>

          {/* After X occurrences */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="endType"
              checked={endType === 'after'}
              onChange={() => setEndType('after')}
              className="w-4 h-4 text-accent-blue focus:ring-2 focus:ring-accent-blue"
            />
            <span className="text-sm text-text-light-primary dark:text-text-dark-primary">在</span>
            <input
              type="number"
              min="1"
              max="999"
              value={endCount || ''}
              onChange={(e) => {
                setEndType('after');
                setEndCount(Math.max(1, parseInt(e.target.value) || 1));
              }}
              disabled={endType !== 'after'}
              className="w-20 p-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue outline-none disabled:opacity-50"
            />
            <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">次后</span>
          </label>

          {/* Until date */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="endType"
              checked={endType === 'until'}
              onChange={() => setEndType('until')}
              className="w-4 h-4 text-accent-blue focus:ring-2 focus:ring-accent-blue"
            />
            <span className="text-sm text-text-light-primary dark:text-text-dark-primary">直到</span>
            <input
              type="date"
              value={endDate || ''}
              onChange={(e) => {
                setEndType('until');
                setEndDate(e.target.value);
              }}
              disabled={endType !== 'until'}
              className="p-1.5 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue outline-none disabled:opacity-50"
            />
          </label>
        </div>
      </div>

      {/* Advanced Section */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
        >
          {showAdvanced ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
          高级
        </button>
        {showAdvanced && (
          <div className="mt-3 space-y-3 pl-6">
            <TemplatePicker
              value={templateId}
              onChange={setTemplateId}
              templates={templates}
            />
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="p-3 bg-accent-blue/10 dark:bg-accent-blue/20 rounded-lg">
        <p className="text-xs text-text-light-primary dark:text-text-dark-primary">
          {getRecurrenceSummary()}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 py-2 px-4 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors"
        >
          保存
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="py-2 px-4 bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary text-sm font-medium rounded-lg hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
          >
            取消
          </button>
        )}
      </div>
    </div>
  );
};
