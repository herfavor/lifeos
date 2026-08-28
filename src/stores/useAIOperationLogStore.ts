/**
 * AI Operation Log Store
 *
 * Audit trail of every AI-executed write. Each record carries:
 * - what happened (tool + zh-CN summary + success)
 * - how it happened (auto-executed vs. user-confirmed)
 * - where to verify it (destination link → the exact UI the user would
 *   have operated manually)
 * - how to reverse it (UndoDescriptor, executed via the same store APIs)
 *
 * Persisted (capped) so the "AI 操作记录" panel survives navigation.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { AgentDestination } from '../services/ai/agent/capabilityMeta';
import type { UndoDescriptor } from '../services/ai/agent/types';

export const MAX_AI_OPERATION_RECORDS = 100;

export interface AIOperationRecord {
  id: string;
  ts: number;
  tool: string;
  /** zh-CN one-liner, e.g. 已创建任务「写周报」 */
  summary: string;
  success: boolean;
  /** auto = 自动执行模式; confirmed = 用户在确认卡片上批准 */
  source: 'auto' | 'confirmed';
  /** Human name of the affected entity kind (task / event / note …). */
  entityKind?: string;
  refId?: string;
  /** 查看结果 → the exact module UI, identical to a manual change. */
  destination?: AgentDestination;
  /** How to reverse this operation. */
  undo?: UndoDescriptor;
  undone: boolean;
}

interface AIOperationLogState {
  records: AIOperationRecord[];

  /** Append one record (newest first, capped). */
  addRecord: (record: Omit<AIOperationRecord, 'id' | 'ts' | 'undone'>) => string;
  markUndone: (id: string) => void;
  removeRecord: (id: string) => void;
  clear: () => void;
}

export const useAIOperationLogStore = create<AIOperationLogState>()(
  persist(
    (set) => ({
      records: [],

      addRecord: (record) => {
        const id = uuidv4();
        set((state) => ({
          records: [
            { ...record, id, ts: Date.now(), undone: false },
            ...state.records,
          ].slice(0, MAX_AI_OPERATION_RECORDS),
        }));
        return id;
      },

      markUndone: (id) =>
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, undone: true } : r
          ),
        })),

      removeRecord: (id) =>
        set((state) => ({
          records: state.records.filter((r) => r.id !== id),
        })),

      clear: () => set({ records: [] }),
    }),
    {
      name: 'lifeos-ai-operation-log-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    }
  )
);

/** Entity-kind zh label for a tool id (used on log rows). */
export function entityKindLabel(tool: string): string {
  const map: Record<string, string> = {
    list_tasks: '任务', create_task: '任务', update_task: '任务', complete_task: '任务',
    delete_task: '任务', archive_task: '任务', restore_task: '任务',
    add_checklist_item: '任务清单', toggle_checklist_item: '任务清单', delete_checklist_item: '任务清单',
    add_comment: '任务评论', add_subtask: '任务子任务', toggle_subtask: '任务子任务',
    list_events: '日程', create_event: '日程', update_event: '日程', delete_event: '日程',
    create_note: '笔记', append_note: '笔记', update_note: '笔记', archive_note: '笔记',
    delete_note: '笔记', restore_note: '笔记', pin_note: '笔记', list_notes: '笔记',
    list_projects: '项目', create_project: '项目', update_project: '项目', archive_project: '项目',
    list_links: '收藏', create_link: '收藏', update_link: '收藏', delete_link: '收藏',
    list_automations: '自动化', create_automation: '自动化', toggle_automation: '自动化', delete_automation: '自动化',
    list_habits: '习惯', create_habit: '习惯', complete_habit: '习惯打卡', archive_habit: '习惯',
    list_energy: '精力', log_energy: '精力',
    list_time_entries: '时间', start_timer: '计时', stop_timer: '计时', add_time_entry: '时间', delete_time_entry: '时间',
    start_focus: '专注', end_focus: '专注',
    add_goal: '每日目标', toggle_goal: '每日目标',
    list_routines: '例行', create_routine: '例行', delete_routine: '例行',
    list_resources: '资源', create_resource: '资源', update_resource: '资源',
    list_templates: '任务模板', create_template: '任务模板',
  };
  return map[tool] ?? '数据';
}
