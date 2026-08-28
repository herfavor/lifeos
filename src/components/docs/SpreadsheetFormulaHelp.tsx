/**
 * SpreadsheetFormulaHelp Component
 *
 * Provides formula autocomplete suggestions and help tooltips
 * for the spreadsheet formula bar.
 */

import { useCallback, useMemo, useState, useEffect, useRef } from 'react';

/** Formula definition for autocomplete and help */
interface FormulaDefinition {
  name: string;
  category: string;
  syntax: string;
  description: string;
  example: string;
}

/** All supported formulas with help info */
const FORMULA_DEFINITIONS: FormulaDefinition[] = [
  // Math
  { name: 'SUM', category: '数学', syntax: 'SUM(range)', description: '将范围内的所有数字相加', example: '=SUM(A1:A10)' },
  { name: 'AVERAGE', category: '数学', syntax: 'AVERAGE(range)', description: '返回范围内数字的平均值', example: '=AVERAGE(B1:B20)' },
  { name: 'MIN', category: '数学', syntax: 'MIN(range)', description: '返回范围内最小的数字', example: '=MIN(A1:A50)' },
  { name: 'MAX', category: '数学', syntax: 'MAX(range)', description: '返回范围内最大的数字', example: '=MAX(A1:A50)' },
  { name: 'COUNT', category: '数学', syntax: 'COUNT(range)', description: '统计包含数字的单元格数量', example: '=COUNT(A1:A100)' },
  { name: 'COUNTA', category: '数学', syntax: 'COUNTA(range)', description: '统计非空单元格数量', example: '=COUNTA(A1:A100)' },
  { name: 'ROUND', category: '数学', syntax: 'ROUND(number, digits)', description: '将数字四舍五入到指定小数位数', example: '=ROUND(3.14159, 2)' },
  { name: 'ABS', category: '数学', syntax: 'ABS(number)', description: '返回绝对值', example: '=ABS(-5)' },
  { name: 'MEDIAN', category: '数学', syntax: 'MEDIAN(range)', description: '返回中位数', example: '=MEDIAN(A1:A20)' },
  { name: 'POWER', category: '数学', syntax: 'POWER(base, exp)', description: '返回底数的指数次幂', example: '=POWER(2, 8)' },

  // Conditional
  { name: 'SUMIF', category: '条件', syntax: 'SUMIF(range, criteria, [sum_range])', description: '对符合条件的单元格求和', example: '=SUMIF(A1:A10, ">5", B1:B10)' },
  { name: 'COUNTIF', category: '条件', syntax: 'COUNTIF(range, criteria)', description: '统计符合条件的单元格数量', example: '=COUNTIF(A1:A10, "Yes")' },
  { name: 'AVERAGEIF', category: '条件', syntax: 'AVERAGEIF(range, criteria, [avg_range])', description: '计算符合条件的单元格的平均值', example: '=AVERAGEIF(A1:A10, ">0", B1:B10)' },

  // Lookup
  { name: 'VLOOKUP', category: '查找', syntax: 'VLOOKUP(value, range, col_index, [approx])', description: '在范围的第一列中查找并返回另一列的值', example: '=VLOOKUP("Apple", A1:C10, 3, FALSE)' },
  { name: 'HLOOKUP', category: '查找', syntax: 'HLOOKUP(value, range, row_index, [approx])', description: '在范围的第一行中查找并返回另一行的值', example: '=HLOOKUP("Q1", A1:D5, 3, FALSE)' },
  { name: 'INDEX', category: '查找', syntax: 'INDEX(range, row_num, [col_num])', description: '返回范围内指定行和列的值', example: '=INDEX(A1:C10, 3, 2)' },
  { name: 'MATCH', category: '查找', syntax: 'MATCH(value, range, [type])', description: '返回值在范围中的位置', example: '=MATCH("Apple", A1:A10, 0)' },

  // Logic
  { name: 'IF', category: '逻辑', syntax: 'IF(condition, value_if_true, value_if_false)', description: '条件为真时返回一个值，否则返回另一个值', example: '=IF(A1>10, "High", "Low")' },
  { name: 'AND', category: '逻辑', syntax: 'AND(condition1, condition2, ...)', description: '所有条件为真时返回 TRUE', example: '=AND(A1>0, B1<100)' },
  { name: 'OR', category: '逻辑', syntax: 'OR(condition1, condition2, ...)', description: '任一条件为真时返回 TRUE', example: '=OR(A1="Yes", B1="Yes")' },
  { name: 'NOT', category: '逻辑', syntax: 'NOT(condition)', description: '反转条件的逻辑值', example: '=NOT(A1>10)' },
  { name: 'IFERROR', category: '逻辑', syntax: 'IFERROR(value, error_value)', description: '当值为错误时返回指定值', example: '=IFERROR(A1/B1, 0)' },

  // Text
  { name: 'CONCATENATE', category: '文本', syntax: 'CONCATENATE(text1, text2, ...)', description: '将多个文本字符串连接起来', example: '=CONCATENATE(A1, " ", B1)' },
  { name: 'LEFT', category: '文本', syntax: 'LEFT(text, num_chars)', description: '返回最左侧的字符', example: '=LEFT(A1, 3)' },
  { name: 'RIGHT', category: '文本', syntax: 'RIGHT(text, num_chars)', description: '返回最右侧的字符', example: '=RIGHT(A1, 4)' },
  { name: 'MID', category: '文本', syntax: 'MID(text, start, num_chars)', description: '返回从中间位置开始的字符', example: '=MID(A1, 2, 5)' },
  { name: 'LEN', category: '文本', syntax: 'LEN(text)', description: '返回文本的长度', example: '=LEN(A1)' },
  { name: 'TRIM', category: '文本', syntax: 'TRIM(text)', description: '移除多余的空格', example: '=TRIM(A1)' },
  { name: 'UPPER', category: '文本', syntax: 'UPPER(text)', description: '转换为大写', example: '=UPPER(A1)' },
  { name: 'LOWER', category: '文本', syntax: 'LOWER(text)', description: '转换为小写', example: '=LOWER(A1)' },
  { name: 'SUBSTITUTE', category: '文本', syntax: 'SUBSTITUTE(text, old, new)', description: '替换文本中出现的字符串', example: '=SUBSTITUTE(A1, "old", "new")' },
  { name: 'TEXT', category: '文本', syntax: 'TEXT(value, format)', description: '将数字格式化为文本', example: '=TEXT(0.75, "0.0%")' },

  // Date
  { name: 'TODAY', category: '日期', syntax: 'TODAY()', description: '返回当前日期', example: '=TODAY()' },
  { name: 'NOW', category: '日期', syntax: 'NOW()', description: '返回当前日期和时间', example: '=NOW()' },
  { name: 'DATE', category: '日期', syntax: 'DATE(year, month, day)', description: '根据年、月、日创建日期', example: '=DATE(2024, 1, 15)' },
  { name: 'YEAR', category: '日期', syntax: 'YEAR(date)', description: '从日期中返回年份', example: '=YEAR(A1)' },
  { name: 'MONTH', category: '日期', syntax: 'MONTH(date)', description: '从日期中返回月份', example: '=MONTH(A1)' },
  { name: 'DAY', category: '日期', syntax: 'DAY(date)', description: '从日期中返回日', example: '=DAY(A1)' },
];

/** Category colors for visual grouping */
const CATEGORY_COLORS: Record<string, string> = {
  数学: 'text-blue-500',
  条件: 'text-amber-500',
  查找: 'text-green-500',
  逻辑: 'text-purple-500',
  文本: 'text-pink-500',
  日期: 'text-cyan-500',
};

interface FormulaAutocompletePanelProps {
  /** Current formula bar input value */
  inputValue: string;
  /** Whether the formula bar is actively being edited */
  isEditing: boolean;
  /** Callback when a formula suggestion is selected */
  onSelect: (formula: FormulaDefinition) => void;
}

/**
 * Extract the current function name being typed from a formula string.
 * Returns null if not currently typing a function name.
 */
function extractCurrentFunctionToken(input: string): string | null {
  if (!input.startsWith('=')) return null;

  // Find the last incomplete function name
  // Match the last sequence of uppercase letters before a '(' or at end of string
  const match = input.match(/([A-Z]+)\s*\(?$/i);
  if (match) return match[1].toUpperCase();

  return null;
}

export function FormulaAutocompletePanel({
  inputValue,
  isEditing,
  onSelect,
}: FormulaAutocompletePanelProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const currentToken = useMemo(
    () => extractCurrentFunctionToken(inputValue),
    [inputValue]
  );

  const suggestions = useMemo(() => {
    if (!currentToken || currentToken.length < 1) return [];
    return FORMULA_DEFINITIONS.filter((f) =>
      f.name.startsWith(currentToken)
    ).slice(0, 8);
  }, [currentToken]);

  // Reset selection when suggestions change
  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement | undefined;
      selectedEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isEditing || suggestions.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="absolute top-full left-16 z-50 mt-1 w-96 max-h-64 overflow-y-auto rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shadow-xl"
    >
      {suggestions.map((formula, index) => (
        <button
          key={formula.name}
          onMouseDown={(e) => {
            e.preventDefault(); // Prevent formula bar blur
            onSelect(formula);
          }}
          onMouseEnter={() => setSelectedIndex(index)}
          className={`w-full text-left px-3 py-2 flex flex-col gap-0.5 border-b border-border-light/50 dark:border-border-dark/50 last:border-b-0 transition-colors ${
            index === selectedIndex
              ? 'bg-accent-primary/10'
              : 'hover:bg-surface-light-alt dark:hover:bg-surface-dark-elevated'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${CATEGORY_COLORS[formula.category] || 'text-text-light-tertiary'}`}>
              {formula.category}
            </span>
            <span className="font-mono text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
              {formula.name}
            </span>
          </div>
          <span className="text-xs font-mono text-text-light-tertiary dark:text-text-dark-tertiary">
            {formula.syntax}
          </span>
          <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            {formula.description}
          </span>
        </button>
      ))}
    </div>
  );
}

interface FormulaHelpTooltipProps {
  /** Current formula bar input value */
  inputValue: string;
  /** Whether the formula bar is actively being edited */
  isEditing: boolean;
}

/**
 * Extract the function name from the current formula to show help for.
 * Detects the most recently opened function (closest unmatched '(' from right).
 */
function extractActiveFunction(input: string): string | null {
  if (!input.startsWith('=')) return null;

  const expr = input.slice(1);
  let depth = 0;

  // Walk from right to find the function around the cursor
  for (let i = expr.length - 1; i >= 0; i--) {
    if (expr[i] === ')') depth++;
    if (expr[i] === '(') {
      if (depth > 0) {
        depth--;
      } else {
        // Found unmatched '(' — get the function name before it
        const before = expr.slice(0, i);
        const match = before.match(/([A-Z]+)\s*$/i);
        if (match) return match[1].toUpperCase();
        return null;
      }
    }
  }

  return null;
}

export function FormulaHelpTooltip({
  inputValue,
  isEditing,
}: FormulaHelpTooltipProps) {
  const funcName = useMemo(
    () => extractActiveFunction(inputValue),
    [inputValue]
  );

  const formula = useMemo(() => {
    if (!funcName) return null;
    return FORMULA_DEFINITIONS.find((f) => f.name === funcName) ?? null;
  }, [funcName]);

  if (!isEditing || !formula) return null;

  return (
    <div className="absolute top-full left-16 z-40 mt-1 w-80 p-3 rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark shadow-lg">
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`text-xs font-medium ${CATEGORY_COLORS[formula.category] || ''}`}>
          {formula.category}
        </span>
        <span className="font-mono text-sm font-bold text-text-light-primary dark:text-text-dark-primary">
          {formula.name}
        </span>
      </div>
      <div className="font-mono text-xs text-accent-primary bg-accent-primary/5 px-2 py-1 rounded mb-1.5">
        {formula.syntax}
      </div>
      <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1.5">
        {formula.description}
      </p>
      <div className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
        示例： <span className="font-mono">{formula.example}</span>
      </div>
    </div>
  );
}

/** Hook for managing formula autocomplete keyboard navigation */
export function useFormulaAutocomplete(
  inputValue: string,
  isEditing: boolean,
  onInsert: (text: string) => void
) {
  const currentToken = useMemo(
    () => extractCurrentFunctionToken(inputValue),
    [inputValue]
  );

  const suggestions = useMemo(() => {
    if (!currentToken || currentToken.length < 1) return [];
    return FORMULA_DEFINITIONS.filter((f) =>
      f.name.startsWith(currentToken)
    ).slice(0, 8);
  }, [currentToken]);

  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [suggestions]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isEditing || suggestions.length === 0) return false;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        return true;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        return true;
      }
      if (e.key === 'Tab' && suggestions.length > 0) {
        e.preventDefault();
        const selected = suggestions[selectedIndex];
        if (selected && currentToken) {
          // Replace the current token with the full function name + opening paren
          const replacement = selected.name + '(';
          const before = inputValue.slice(0, inputValue.length - currentToken.length);
          onInsert(before + replacement);
        }
        return true;
      }

      return false;
    },
    [isEditing, suggestions, selectedIndex, currentToken, inputValue, onInsert]
  );

  return {
    suggestions,
    selectedIndex,
    handleKeyDown,
  };
}
