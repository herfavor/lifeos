/**
 * Smart Template Store
 *
 * Manages workflow templates that can create multiple items across modules
 * (notes, tasks, events, docs, timers) in a single action.
 * Persisted to IndexedDB via syncedStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSyncedStorage } from '../lib/syncedStorage';
import { v4 as uuidv4 } from 'uuid';

// ==================== TYPES ====================

export type TemplateActionType =
  | 'create-note'
  | 'create-task'
  | 'create-event'
  | 'create-doc'
  | 'start-timer';

export interface TemplateVariable {
  key: string;
  label: string;
  type: 'text' | 'date' | 'select';
  options?: string[]; // For 'select' type
  defaultValue?: string;
}

export interface TemplateAction {
  id: string;
  type: TemplateActionType;
  data: Record<string, unknown>;
}

export interface SmartTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'workflow' | 'meeting' | 'planning' | 'custom';
  actions: TemplateAction[];
  variables: TemplateVariable[];
  usageCount: number;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==================== BUILT-IN TEMPLATES ====================

const BUILT_IN_TEMPLATES: SmartTemplate[] = [
  {
    id: 'weekly-review',
    name: '每周回顾',
    description: '创建每周回顾笔记和规划任务',
    icon: '📅',
    category: 'planning',
    actions: [
      {
        id: 'wr-note',
        type: 'create-note',
        data: {
          title: '每周回顾 — {{date}}',
          content:
            '## 每周回顾\n\n**所属周：** {{date}}\n\n### 本周成就\n- \n\n### 遇到的挑战\n- \n\n### 经验教训\n- \n\n### 下周目标\n- [ ] \n\n### 备注\n',
          tags: ['review', 'weekly'],
        },
      },
      {
        id: 'wr-task-1',
        type: 'create-task',
        data: {
          title: '回顾目标与 OKR',
          description: '每周回顾的一部分（{{date}}）',
          priority: 'high',
          tags: ['weekly-review'],
        },
      },
      {
        id: 'wr-task-2',
        type: 'create-task',
        data: {
          title: '将收件箱清空',
          description: '每周回顾的一部分（{{date}}）',
          priority: 'medium',
          tags: ['weekly-review'],
        },
      },
      {
        id: 'wr-task-3',
        type: 'create-task',
        data: {
          title: '规划下周优先级',
          description: '每周回顾的一部分（{{date}}）',
          priority: 'high',
          tags: ['weekly-review'],
        },
      },
      {
        id: 'wr-task-4',
        type: 'create-task',
        data: {
          title: '回顾并更新项目状态',
          description: '每周回顾的一部分（{{date}}）',
          priority: 'medium',
          tags: ['weekly-review'],
        },
      },
      {
        id: 'wr-task-5',
        type: 'create-task',
        data: {
          title: '归档已完成任务',
          description: '每周回顾的一部分（{{date}}）',
          priority: 'low',
          tags: ['weekly-review'],
        },
      },
    ],
    variables: [
      {
        key: 'date',
        label: '所属周',
        type: 'date',
        defaultValue: new Date().toISOString().split('T')[0],
      },
    ],
    usageCount: 0,
    isBuiltIn: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'sprint-planning',
    name: '迭代规划',
    description: '为新迭代周期创建任务',
    icon: '🏃',
    category: 'planning',
    actions: [
      {
        id: 'sp-task-1',
        type: 'create-task',
        data: {
          title: '审查待办事项并确定优先级',
          description: '迭代：{{sprintName}}',
          priority: 'high',
          tags: ['sprint', '{{sprintName}}'],
        },
      },
      {
        id: 'sp-task-2',
        type: 'create-task',
        data: {
          title: '为选中的事项估算故事点',
          description: '迭代：{{sprintName}}',
          priority: 'high',
          tags: ['sprint', '{{sprintName}}'],
        },
      },
      {
        id: 'sp-task-3',
        type: 'create-task',
        data: {
          title: '定义验收标准',
          description: '迭代：{{sprintName}}',
          priority: 'medium',
          tags: ['sprint', '{{sprintName}}'],
        },
      },
      {
        id: 'sp-task-4',
        type: 'create-task',
        data: {
          title: '将任务分配给团队成员',
          description: '迭代：{{sprintName}}',
          priority: 'medium',
          tags: ['sprint', '{{sprintName}}'],
        },
      },
      {
        id: 'sp-task-5',
        type: 'create-task',
        data: {
          title: '设置迭代看板与跟踪',
          description: '迭代：{{sprintName}}',
          priority: 'low',
          tags: ['sprint', '{{sprintName}}'],
        },
      },
    ],
    variables: [
      {
        key: 'sprintName',
        label: '迭代名称',
        type: 'text',
        defaultValue: '迭代 1',
      },
    ],
    usageCount: 0,
    isBuiltIn: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'meeting-notes',
    name: '会议记录',
    description: '创建会议笔记和日历事件',
    icon: '📋',
    category: 'meeting',
    actions: [
      {
        id: 'mn-note',
        type: 'create-note',
        data: {
          title: '{{meetingTitle}} — 会议记录',
          content:
            '## {{meetingTitle}}\n\n**日期：** {{date}}\n**参会人员：** {{attendees}}\n\n### 议程\n1. \n\n### 讨论要点\n- \n\n### 行动事项\n- [ ] \n\n### 后续步骤\n',
          tags: ['meeting'],
        },
      },
      {
        id: 'mn-event',
        type: 'create-event',
        data: {
          title: '{{meetingTitle}}',
          duration: 60,
        },
      },
    ],
    variables: [
      {
        key: 'meetingTitle',
        label: '会议标题',
        type: 'text',
        defaultValue: '团队同步会',
      },
      {
        key: 'date',
        label: '日期',
        type: 'date',
        defaultValue: new Date().toISOString().split('T')[0],
      },
      {
        key: 'attendees',
        label: '参会人员',
        type: 'text',
        defaultValue: '',
      },
    ],
    usageCount: 0,
    isBuiltIn: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'daily-standup',
    name: '每日站会',
    description: '创建标准格式的站会笔记',
    icon: '☀️',
    category: 'workflow',
    actions: [
      {
        id: 'ds-note',
        type: 'create-note',
        data: {
          title: '站会 — {{date}}',
          content:
            '## 每日站会 — {{date}}\n\n### 昨天\n- \n\n### 今天\n- \n\n### 阻塞事项\n- \n',
          tags: ['standup', 'daily'],
        },
      },
    ],
    variables: [
      {
        key: 'date',
        label: '日期',
        type: 'date',
        defaultValue: new Date().toISOString().split('T')[0],
      },
    ],
    usageCount: 0,
    isBuiltIn: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

// ==================== STORE ====================

interface SmartTemplateState {
  templates: SmartTemplate[];

  createTemplate: (
    template: Omit<SmartTemplate, 'id' | 'usageCount' | 'createdAt' | 'updatedAt'>
  ) => SmartTemplate;
  updateTemplate: (id: string, updates: Partial<SmartTemplate>) => void;
  deleteTemplate: (id: string) => void;
  incrementUsage: (id: string) => void;
  getTemplatesByCategory: (category: string) => SmartTemplate[];
}

export const useSmartTemplateStore = create<SmartTemplateState>()(
  persist(
    (set, get) => ({
      templates: [...BUILT_IN_TEMPLATES],

      createTemplate: (templateData) => {
        const now = new Date().toISOString();
        const newTemplate: SmartTemplate = {
          ...templateData,
          id: uuidv4(),
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          templates: [...state.templates, newTemplate],
        }));

        return newTemplate;
      },

      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id
              ? { ...t, ...updates, updatedAt: new Date().toISOString() }
              : t
          ),
        }));
      },

      deleteTemplate: (id) => {
        const template = get().templates.find((t) => t.id === id);
        if (!template || template.isBuiltIn) return;

        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        }));
      },

      incrementUsage: (id) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id
              ? { ...t, usageCount: t.usageCount + 1, updatedAt: new Date().toISOString() }
              : t
          ),
        }));
      },

      getTemplatesByCategory: (category) => {
        return get().templates.filter((t) => t.category === category);
      },
    }),
    {
      name: 'smart-templates',
      storage: createJSONStorage(() => createSyncedStorage()),
      version: 1,
      partialize: (state) => ({
        templates: state.templates,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<SmartTemplateState>;
        const persistedTemplates = persistedState.templates || [];

        // Ensure built-in templates are always present
        const builtInIds = BUILT_IN_TEMPLATES.map((t) => t.id);
        const customTemplates = persistedTemplates.filter(
          (t) => !builtInIds.includes(t.id)
        );
        // Preserve usage counts for built-ins
        const mergedBuiltIns = BUILT_IN_TEMPLATES.map((builtIn) => {
          const persisted = persistedTemplates.find((t) => t.id === builtIn.id);
          return persisted
            ? { ...builtIn, usageCount: persisted.usageCount }
            : builtIn;
        });

        return {
          ...current,
          templates: [...mergedBuiltIns, ...customTemplates],
        };
      },
    }
  )
);
