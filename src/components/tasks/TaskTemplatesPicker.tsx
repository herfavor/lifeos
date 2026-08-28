import React, { useState } from 'react';
import { useKanbanStore } from '../../stores/useKanbanStore';
import type { TaskPriority } from '../../types';

interface TaskTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  defaultPriority: TaskPriority;
  defaultTags: string[];
  subtasks: string[];
}

const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'bug-report',
    name: '缺陷报告',
    icon: '🐛',
    description: '以结构化子任务跟踪并修复缺陷',
    defaultPriority: 'high',
    defaultTags: ['bug'],
    subtasks: ['复现问题', '调查根本原因', '实施修复', '编写测试', '部署修复'],
  },
  {
    id: 'feature-request',
    name: '功能需求',
    icon: '✨',
    description: '端到端规划并实现一个新功能',
    defaultPriority: 'medium',
    defaultTags: ['feature'],
    subtasks: ['设计与规格说明', '实现核心功能', '编写测试', '更新文档', '代码审查'],
  },
  {
    id: 'sprint-planning',
    name: '冲刺规划',
    icon: '🏃',
    description: '组织一次冲刺规划会议',
    defaultPriority: 'high',
    defaultTags: ['planning'],
    subtasks: ['审查待办列表', '估算故事点', '分配任务', '设定冲刺目标', '创建冲刺看板'],
  },
  {
    id: 'code-review',
    name: '代码审查',
    icon: '🔍',
    description: '结构化的代码审查流程',
    defaultPriority: 'medium',
    defaultTags: ['review'],
    subtasks: ['阅读 PR 描述', '检查代码变更', '本地运行测试', '留下审查意见', '批准或请求修改'],
  },
  {
    id: 'deployment',
    name: '部署',
    icon: '🚀',
    description: '部署到生产环境的检查清单',
    defaultPriority: 'high',
    defaultTags: ['deploy'],
    subtasks: ['运行完整测试套件', '检查预发布环境', '创建部署标签', '部署到生产环境', '在生产环境验证', '监控指标'],
  },
  {
    id: 'research',
    name: '调研冲刺',
    icon: '🔬',
    description: '对技术问题进行限时调研',
    defaultPriority: 'medium',
    defaultTags: ['research'],
    subtasks: ['明确调研问题', '收集资料', '评估方案', '撰写调研总结', '提出建议'],
  },
];

interface TaskTemplatesPickerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TaskTemplatesPicker: React.FC<TaskTemplatesPickerProps> = ({ isOpen, onClose }) => {
  const { addTask, addSubtask } = useKanbanStore();
  const [taskTitle, setTaskTitle] = useState('');

  if (!isOpen) return null;

  const handleCreateFromTemplate = (template: TaskTemplate) => {
    const title = taskTitle.trim() || template.name;

    // Create the parent task
    addTask({
      title,
      description: template.description,
      status: 'todo',
      priority: template.defaultPriority,
      tags: template.defaultTags,
      startDate: null,
      dueDate: null,
      projectIds: [],
    });

    // Get the created task (latest in store)
    const tasks = useKanbanStore.getState().tasks;
    const newTask = tasks[tasks.length - 1];

    if (newTask) {
      // Add subtasks
      template.subtasks.forEach((subtaskTitle) => {
        addSubtask(newTask.id, {
          title: subtaskTitle,
          completed: false,
        });
      });
    }

    setTaskTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border-light dark:border-border-dark">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            从模板创建
          </h2>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            从预置的任务结构开始
          </p>
        </div>

        {/* Optional custom title */}
        <div className="p-4 border-b border-border-light dark:border-border-dark">
          <input
            type="text"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="自定义任务标题（可选）…"
            className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
          />
        </div>

        {/* Templates grid */}
        <div className="p-4 overflow-y-auto max-h-[50vh] space-y-2">
          {TASK_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleCreateFromTemplate(template)}
              className="w-full text-left p-4 rounded-lg border border-border-light dark:border-border-dark hover:border-accent-blue hover:bg-accent-blue/5 transition-colors"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{template.icon}</span>
                <div className="flex-1">
                  <h3 className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    {template.name}
                  </h3>
                  <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
                    {template.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      template.defaultPriority === 'high'
                        ? 'bg-status-error/10 text-status-error'
                        : 'bg-status-warning/10 text-status-warning-text dark:text-status-warning-text-dark'
                    }`}>
                      {template.defaultPriority === 'high' ? '高' : '中'}
                    </span>
                    {template.defaultTags.map((tag) => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-accent-blue/10 text-accent-blue">
                        #{tag}
                      </span>
                    ))}
                    <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary ml-auto">
                      {template.subtasks.length} 个子任务
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="p-4 border-t border-border-light dark:border-border-dark">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm rounded-lg border border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};
