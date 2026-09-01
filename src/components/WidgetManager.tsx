/**
 * Dashboard widget manager.
 */

import React, { useEffect, useRef, useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Modal } from './Modal';
import { Briefcase, GripVertical, Puzzle, Star, X, type LucideIcon } from 'lucide-react';
import { useWidgetStore } from '../stores/useWidgetStore';
import { getAllWidgets, getWidget, type WidgetCategory } from '../widgets/Dashboard/WidgetRegistry';
import { isWidgetExposed } from '../config/features';

interface WidgetManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const categoryNames: Record<WidgetCategory, { label: string; Icon: LucideIcon }> = {
  core: { label: '核心', Icon: Star },
  productivity: { label: '效率', Icon: Briefcase },
  custom: { label: '自定义', Icon: Puzzle },
};

const SortableItem: React.FC<{ id: string }> = ({ id }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const widget = getWidget(id);
  if (!widget) return null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className="flex items-center gap-3 p-3 bg-surface-light-elevated dark:bg-surface-dark rounded-button cursor-move hover:bg-surface-light dark:hover:bg-surface-dark-elevated transition-all duration-standard ease-smooth"
    >
      <span className="text-2xl">{widget.icon}</span>
      <div className="flex-1">
        <h4 className="font-medium text-text-light-primary dark:text-text-dark-primary">{widget.name}</h4>
        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">{widget.description}</p>
      </div>
      <span className="text-text-light-secondary dark:text-text-dark-secondary"><GripVertical className="w-4 h-4" /></span>
    </div>
  );
};

export const WidgetManager: React.FC<WidgetManagerProps> = ({ isOpen, onClose }) => {
  const { enabledWidgets, enableWidget, disableWidget, reorderWidgets } = useWidgetStore();
  const [activeTab, setActiveTab] = useState<'enabled' | 'available'>('enabled');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | 'all'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const allWidgets = getAllWidgets().filter((widget) => isWidgetExposed(widget.id));
  const availableWidgets = allWidgets.filter((widget) => !enabledWidgets.includes(widget.id));
  const filteredAvailableWidgets = availableWidgets.filter((widget) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      widget.name.toLowerCase().includes(query) ||
      widget.description.toLowerCase().includes(query);
    const matchesCategory = selectedCategory === 'all' || widget.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = enabledWidgets.indexOf(active.id as string);
    const newIndex = enabledWidgets.indexOf(over.id as string);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = [...enabledWidgets];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    reorderWidgets(next);
  };

  useEffect(() => {
    if (activeTab === 'available') searchInputRef.current?.focus();
  }, [activeTab]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, selectedCategory]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const maxIndex = filteredAvailableWidgets.length - 1;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((index) => Math.min(index + 1, maxIndex));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && filteredAvailableWidgets[selectedIndex]) {
      event.preventDefault();
      enableWidget(filteredAvailableWidgets[selectedIndex].id);
      setSearchQuery('');
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setSearchQuery('');
      searchInputRef.current?.focus();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="自定义首页组件" maxWidth="2xl">
      <div className="w-full">
        <div className="flex gap-2 mb-4 border-b border-border-light dark:border-border-dark">
          <button
            onClick={() => setActiveTab('enabled')}
            className={`px-4 py-2 font-medium transition-all duration-standard ease-smooth ${activeTab === 'enabled' ? 'text-accent-primary border-b-2 border-accent-primary' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}
          >
            已启用组件 ({enabledWidgets.length})
          </button>
          <button
            onClick={() => setActiveTab('available')}
            className={`px-4 py-2 font-medium transition-all duration-standard ease-smooth ${activeTab === 'available' ? 'text-accent-primary border-b-2 border-accent-primary' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}
          >
            可用组件 ({availableWidgets.length})
          </button>
        </div>

        <div className="min-h-[300px]">
          {activeTab === 'enabled' ? (
            <div className="space-y-4">
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">拖动调整顺序，点击停用不需要的组件。</p>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={enabledWidgets} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {enabledWidgets.map((id) => {
                      if (!getWidget(id)) return null;
                      return (
                        <div key={id} className="flex items-center gap-2">
                          <div className="flex-1"><SortableItem id={id} /></div>
                          <button
                            onClick={() => disableWidget(id)}
                            className="p-2 text-accent-red hover:bg-accent-red/10 dark:hover:bg-accent-red/20 rounded-button"
                            title="停用组件"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
              {enabledWidgets.length === 0 && (
                <div className="text-center py-12 text-text-light-secondary dark:text-text-dark-secondary">
                  尚未启用扩展组件。首页固定工作流无需依赖组件即可使用。
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="搜索组件…（↑↓ 选择，Enter 添加，ESC 清除）"
                className="w-full px-4 py-2 rounded-button bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary"
              />

              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-button text-sm font-medium ${selectedCategory === 'all' ? 'bg-accent-primary text-white' : 'bg-surface-light-elevated dark:bg-surface-dark'}`}
                >
                  全部 ({availableWidgets.length})
                </button>
                {Object.entries(categoryNames).map(([category, { label, Icon }]) => {
                  const count = availableWidgets.filter((widget) => widget.category === category).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category as WidgetCategory)}
                      className={`px-3 py-1.5 rounded-button text-sm font-medium ${selectedCategory === category ? 'bg-accent-primary text-white' : 'bg-surface-light-elevated dark:bg-surface-dark'}`}
                    >
                      <Icon className="w-3.5 h-3.5 inline mr-1" />
                      {label} ({count})
                    </button>
                  );
                })}
              </div>

              {filteredAvailableWidgets.length === 0 ? (
                <div className="text-center py-12 text-text-light-secondary dark:text-text-dark-secondary">
                  没有找到匹配的组件。
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredAvailableWidgets.map((widget, index) => (
                    <button
                      key={widget.id}
                      onClick={() => enableWidget(widget.id)}
                      className={`flex flex-col items-center gap-2 p-4 rounded-button text-center border transition-all duration-standard ease-smooth ${index === selectedIndex ? 'bg-accent-blue/10 ring-2 ring-accent-blue border-accent-blue/30' : 'bg-surface-light-elevated dark:bg-surface-dark border-transparent'}`}
                    >
                      <span className="text-3xl">{widget.icon}</span>
                      <div>
                        <h4 className="font-medium text-sm text-text-light-primary dark:text-text-dark-primary">{widget.name}</h4>
                        <p className="text-[11px] text-text-light-secondary dark:text-text-dark-secondary mt-0.5">{widget.description}</p>
                      </div>
                      <span className="text-[9px] uppercase tracking-wider text-text-light-tertiary dark:text-text-dark-tertiary">{widget.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-accent-blue text-white rounded-button hover:bg-accent-blue-hover">
            完成
          </button>
        </div>
      </div>
    </Modal>
  );
};
