/**
 * Layer Panel Component
 * Z-index management with reordering, lock, and visibility controls
 */

import { useState } from 'react';
import {
  ChevronRight,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Square,
  Circle,
  Type,
  Minus,
  ArrowRight,
  Shapes,
} from 'lucide-react';
import type { DiagramElement } from '../../types/diagrams';

interface LayerPanelProps {
  elements: DiagramElement[];
  selectedElementIds: string[];
  onSelectElement: (id: string, addToSelection: boolean) => void;
  onUpdateElements: (elements: DiagramElement[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const elementTypeIcons: Record<string, React.ReactNode> = {
  rectangle: <Square className="w-4 h-4" />,
  circle: <Circle className="w-4 h-4" />,
  ellipse: <Circle className="w-4 h-4" />,
  text: <Type className="w-4 h-4" />,
  line: <Minus className="w-4 h-4" />,
  arrow: <ArrowRight className="w-4 h-4" />,
  shape: <Shapes className="w-4 h-4" />,
};

const elementTypeLabels: Record<string, string> = {
  rectangle: '矩形',
  circle: '圆形',
  ellipse: '椭圆',
  text: '文本',
  line: '直线',
  arrow: '箭头',
  shape: '形状',
};

export function LayerPanel({
  elements,
  selectedElementIds,
  onSelectElement,
  onUpdateElements,
  isOpen,
  onToggle,
}: LayerPanelProps) {
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOverElement, setDragOverElement] = useState<string | null>(null);

  // Sort elements by z-index (highest first for visual stacking order)
  const sortedElements = [...elements]
    .filter((el) => el.type !== 'arrow' && el.type !== 'line') // Exclude connectors from layer panel
    .sort((a, b) => b.zIndex - a.zIndex);

  const handleToggleVisibility = (id: string) => {
    const updatedElements = elements.map((el) =>
      el.id === id ? { ...el, hidden: !el.hidden } : el
    );
    onUpdateElements(updatedElements);
  };

  const handleToggleLock = (id: string) => {
    const updatedElements = elements.map((el) =>
      el.id === id ? { ...el, locked: !el.locked } : el
    );
    onUpdateElements(updatedElements);
  };

  const handleBringToFront = (id: string) => {
    const maxZ = Math.max(...elements.map((el) => el.zIndex));
    const updatedElements = elements.map((el) =>
      el.id === id ? { ...el, zIndex: maxZ + 1 } : el
    );
    onUpdateElements(updatedElements);
  };

  const handleSendToBack = (id: string) => {
    const minZ = Math.min(...elements.map((el) => el.zIndex));
    const updatedElements = elements.map((el) =>
      el.id === id ? { ...el, zIndex: minZ - 1 } : el
    );
    onUpdateElements(updatedElements);
  };

  const handleMoveForward = (id: string) => {
    const element = elements.find((el) => el.id === id);
    if (!element) return;

    // Find next higher z-index
    const higherElements = elements.filter((el) => el.zIndex > element.zIndex);
    if (higherElements.length === 0) return;

    const nextZ = Math.min(...higherElements.map((el) => el.zIndex));
    const updatedElements = elements.map((el) =>
      el.id === id ? { ...el, zIndex: nextZ + 1 } : el
    );
    onUpdateElements(updatedElements);
  };

  const handleMoveBackward = (id: string) => {
    const element = elements.find((el) => el.id === id);
    if (!element) return;

    // Find next lower z-index
    const lowerElements = elements.filter((el) => el.zIndex < element.zIndex);
    if (lowerElements.length === 0) return;

    const nextZ = Math.max(...lowerElements.map((el) => el.zIndex));
    const updatedElements = elements.map((el) =>
      el.id === id ? { ...el, zIndex: nextZ - 1 } : el
    );
    onUpdateElements(updatedElements);
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedElement(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedElement && draggedElement !== id) {
      setDragOverElement(id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedElement || draggedElement === targetId) {
      setDraggedElement(null);
      setDragOverElement(null);
      return;
    }

    const draggedEl = elements.find((el) => el.id === draggedElement);
    const targetEl = elements.find((el) => el.id === targetId);

    if (!draggedEl || !targetEl) {
      setDraggedElement(null);
      setDragOverElement(null);
      return;
    }

    // Swap z-indices
    const updatedElements = elements.map((el) => {
      if (el.id === draggedElement) {
        return { ...el, zIndex: targetEl.zIndex };
      }
      if (el.id === targetId) {
        return { ...el, zIndex: draggedEl.zIndex };
      }
      return el;
    });

    onUpdateElements(updatedElements);
    setDraggedElement(null);
    setDragOverElement(null);
  };

  const getElementLabel = (element: DiagramElement): string => {
    if (element.text) {
      return element.text.length > 20 ? element.text.substring(0, 20) + '...' : element.text;
    }
    return elementTypeLabels[element.type] || element.type;
  };

  return (
    <div
      className={`
        relative
        bg-surface-light dark:bg-surface-dark border-l border-border-light dark:border-border-dark
        transition-all duration-300
        ${isOpen ? 'w-64' : 'w-0'}
        overflow-visible flex flex-col shrink-0
      `}
    >
      {/* Toggle button - positioned to stick out from panel */}
      <button
        onClick={onToggle}
        className="
          absolute top-3 z-10 p-1.5
          bg-surface-light dark:bg-surface-dark
          border border-border-light dark:border-border-dark
          hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated
          rounded-l transition-all duration-300
          -left-8
        "
        aria-label={isOpen ? '关闭图层面板' : '打开图层面板'}
        title={isOpen ? '关闭图层' : '打开图层'}
      >
        <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? '' : 'rotate-180'}`} />
      </button>

      {/* Panel content - clips overflow when collapsed */}
      <div className={`flex flex-col h-full ${isOpen ? '' : 'overflow-hidden'}`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border-light dark:border-border-dark shrink-0">
          <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary whitespace-nowrap">
            图层
          </h3>
        </div>

      {/* Layer List */}
      <div className="flex-1 overflow-y-auto p-2">
        {sortedElements.length === 0 ? (
          <div className="text-center py-8 text-text-light-tertiary dark:text-text-dark-tertiary text-sm">
            暂无图层
          </div>
        ) : (
          <div className="space-y-1">
            {sortedElements.map((element) => (
              <div
                key={element.id}
                draggable
                onDragStart={(e) => handleDragStart(e, element.id)}
                onDragOver={(e) => handleDragOver(e, element.id)}
                onDrop={(e) => handleDrop(e, element.id)}
                onClick={(e) => onSelectElement(element.id, e.shiftKey)}
                className={`
                  group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors
                  ${
                    selectedElementIds.includes(element.id)
                      ? 'bg-accent-primary/20 border-2 border-accent-primary'
                      : 'border-2 border-transparent hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
                  }
                  ${element.hidden ? 'opacity-50' : ''}
                  ${dragOverElement === element.id ? 'ring-2 ring-accent-primary' : ''}
                `}
              >
                {/* Element Icon */}
                <div className="text-text-light-secondary dark:text-text-dark-secondary shrink-0">
                  {elementTypeIcons[element.type] || <Square className="w-4 h-4" />}
                </div>

                {/* Element Label */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-light-primary dark:text-text-dark-primary truncate">
                    {getElementLabel(element)}
                  </div>
                  <div className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                    z: {element.zIndex}
                  </div>
                </div>

                {/* Controls (show on hover) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleVisibility(element.id);
                    }}
                    className="p-1 hover:bg-surface-light dark:hover:bg-surface-dark rounded"
                    aria-label={element.hidden ? '显示图层' : '隐藏图层'}
                    title={element.hidden ? '显示' : '隐藏'}
                  >
                    {element.hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleLock(element.id);
                    }}
                    className="p-1 hover:bg-surface-light dark:hover:bg-surface-dark rounded"
                    aria-label={element.locked ? '解锁图层' : '锁定图层'}
                    title={element.locked ? '解锁' : '锁定'}
                  >
                    {element.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      {sortedElements.length > 0 && selectedElementIds.length > 0 && (
        <div className="p-2 border-t border-border-light dark:border-border-dark shrink-0">
          <div className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mb-2 px-1">
            层级顺序操作
          </div>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => selectedElementIds.forEach(handleBringToFront)}
              className="px-2 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark rounded transition-colors"
            >
              置顶
            </button>
            <button
              onClick={() => selectedElementIds.forEach(handleSendToBack)}
              className="px-2 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark rounded transition-colors"
            >
              置底
            </button>
            <button
              onClick={() => selectedElementIds.forEach(handleMoveForward)}
              className="px-2 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark rounded transition-colors"
            >
              前移
            </button>
            <button
              onClick={() => selectedElementIds.forEach(handleMoveBackward)}
              className="px-2 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark rounded transition-colors"
            >
              后移
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
