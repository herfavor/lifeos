/**
 * TagColorPicker Component
 *
 * Color picker for assigning colors to tags
 * Features:
 * - 12-color palette grid (same as Status field colors)
 * - "No color" option
 * - Preview of tag with selected color
 */

import { Check } from 'lucide-react';

export interface TagColorPickerProps {
  /** Selected color (semantic token name) */
  selectedColor?: string;
  /** Callback when color is selected */
  onColorSelect: (color: string) => void;
  /** Tag name for preview */
  tagName: string;
}

/**
 * Available tag colors (semantic tokens)
 * Same palette as Status custom field type
 */
export const TAG_COLORS = [
  { name: 'blue', token: 'accent-blue', displayName: '蓝色' },
  { name: 'cyan', token: 'accent-primary', displayName: '青色' },
  { name: 'purple', token: 'accent-purple', displayName: '紫色' },
  { name: 'magenta', token: 'accent-primary', displayName: '品红' },
  { name: 'green', token: 'status-success', displayName: '绿色' },
  { name: 'yellow', token: 'status-warning', displayName: '黄色' },
  { name: 'orange', token: 'accent-orange', displayName: '橙色' },
  { name: 'red', token: 'status-error', displayName: '红色' },
  { name: 'gray', token: 'text-light-tertiary', displayName: '灰色' },
  { name: 'slate', token: 'border-light', displayName: '蓝灰' },
  { name: 'pink', token: 'accent-pink', displayName: '粉色' },
  { name: 'indigo', token: 'accent-indigo', displayName: '靛蓝' },
] as const;

export function TagColorPicker({ selectedColor, onColorSelect, tagName }: TagColorPickerProps) {
  return (
    <div className="space-y-4">
      {/* Preview */}
      <div>
        <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
          预览
        </label>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded ${
              selectedColor
                ? `bg-${selectedColor}/10 text-${selectedColor} dark:bg-${selectedColor}/20`
                : 'bg-border-light dark:bg-border-dark text-text-light-secondary dark:text-text-dark-secondary'
            }`}
          >
            {tagName}
          </span>
        </div>
      </div>

      {/* Color Grid */}
      <div>
        <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
          选择颜色
        </label>
        <div className="grid grid-cols-4 gap-2">
          {/* No Color Option */}
          <button
            onClick={() => onColorSelect('')}
            className={`
              relative h-10 rounded border-2 transition-all
              bg-surface-light-elevated dark:bg-surface-dark-elevated
              ${
                !selectedColor
                  ? 'border-accent-primary'
                  : 'border-border-light dark:border-border-dark hover:border-accent-primary/50'
              }
            `}
            title="无颜色"
          >
            <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">无</span>
            {!selectedColor && (
              <Check className="absolute top-1 right-1 w-3 h-3 text-accent-primary" />
            )}
          </button>

          {/* Color Options */}
          {TAG_COLORS.map((color) => (
            <button
              key={color.name}
              onClick={() => onColorSelect(color.token)}
              className={`
                relative h-10 rounded border-2 transition-all
                bg-${color.token} bg-opacity-20 dark:bg-opacity-30
                ${
                  selectedColor === color.token
                    ? 'border-accent-primary'
                    : 'border-border-light dark:border-border-dark hover:border-accent-primary/50'
                }
              `}
              title={color.displayName}
            >
              {selectedColor === color.token && (
                <Check className="absolute top-1 right-1 w-3 h-3 text-accent-primary" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
