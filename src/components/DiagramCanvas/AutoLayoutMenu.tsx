/**
 * Auto-Layout Menu Component
 * Dropdown menu for selecting layout algorithms
 */

import { GitBranch, Grid3x3, Network } from 'lucide-react';
import type { LayoutAlgorithm } from '../../types/diagrams';

interface AutoLayoutMenuProps {
  onApplyLayout: (algorithm: LayoutAlgorithm) => void;
  disabled?: boolean;
}

const layoutOptions: Array<{
  algorithm: LayoutAlgorithm;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    algorithm: 'tree',
    label: '树形布局',
    description: '自上而下的层级排列',
    icon: <GitBranch className="w-5 h-5" />,
  },
  {
    algorithm: 'force',
    label: '力导向布局',
    description: '基于排斥力的自然有机布局',
    icon: <Network className="w-5 h-5" />,
  },
  {
    algorithm: 'grid',
    label: '网格布局',
    description: '间距均匀的网格排列',
    icon: <Grid3x3 className="w-5 h-5" />,
  },
];

export function AutoLayoutMenu({ onApplyLayout, disabled = false }: AutoLayoutMenuProps) {
  return (
    <div className="flex flex-col gap-1">
      {layoutOptions.map((option) => (
        <button
          key={option.algorithm}
          onClick={() => onApplyLayout(option.algorithm)}
          disabled={disabled}
          className={`
            flex items-start gap-3 p-3 rounded-lg text-left transition-colors
            ${
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
            }
          `}
          title={disabled ? '请先选择要应用布局的元素' : option.description}
        >
          <div className="text-accent-primary shrink-0 mt-0.5">
            {option.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-text-light-primary dark:text-text-dark-primary">
              {option.label}
            </h4>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              {option.description}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
