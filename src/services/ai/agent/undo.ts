/**
 * Agent Undo
 *
 * Reverses an executed agent action using the SAME business store APIs the
 * UI uses — never a parallel implementation. Every case restores the
 * pre-action state captured in UndoDescriptor.detail.
 */

import type { ActionResult, UndoDescriptor } from './types';
import { useKanbanStore } from '../../../stores/useKanbanStore';
import { useCalendarStore } from '../../../stores/useCalendarStore';
import { useNotesStore } from '../../../stores/useNotesStore';
import { useProjectContextStore } from '../../../stores/useProjectContextStore';
import { useLinkLibraryStore } from '../../../stores/useLinkLibraryStore';
import { useAutomationStore } from '../../../stores/useAutomationStore';
import { useHabitStore } from '../../../stores/useHabitStore';
import { useEnergyStore } from '../../../stores/useEnergyStore';
import { useTimeTrackingStore } from '../../../stores/useTimeTrackingStore';
import { useFocusModeStore } from '../../../stores/useFocusModeStore';
import { useDailyPlanningStore } from '../../../stores/useDailyPlanningStore';
import { useRoutineStore } from '../../../stores/useRoutineStore';
import { useResourceStore } from '../../../stores/useResourceStore';
import { useTemplateStore } from '../../../stores/useTemplateStore';
import type { Task } from '../../../types';

function str(detail: Record<string, unknown>, key: string): string | undefined {
  const v = detail[key];
  return typeof v === 'string' && v ? v : undefined;
}

function strArr(detail: Record<string, unknown>, key: string): string[] {
  return Array.isArray(detail[key]) ? (detail[key] as string[]) : [];
}

/**
 * Reverse one operation described by an UndoDescriptor.
 * Returns { success, message } — never throws.
 */
export async function undoAgentOperation(undo: UndoDescriptor): Promise<ActionResult> {
  try {
    const { kind, action, refId, detail = {} } = undo;
    switch (`${action}:${kind}`) {
      // ── tasks
      case 'created:task': {
        if (!refId) return { success: false, message: '无法撤销：缺少目标 id' };
        // deleteTask 为软删除(归档),直接恢复再硬删除使其彻底消失。
        useKanbanStore.getState().archiveTask(refId);
        useKanbanStore.getState().deleteArchivedTask(refId);
        return { success: true, message: '已撤销创建任务' };
      }
      case 'updated:task': {
        if (!refId) return { success: false, message: '无法撤销：缺少目标 id' };
        const patch: Partial<Task> = {};
        const t = str(detail, 'title');
        if (t) patch.title = t;
        patch.description = str(detail, 'description') ?? '';
        patch.priority = (detail.priority as Task['priority']) || 'medium';
        patch.dueDate = str(detail, 'dueDate') ?? null;
        patch.startDate = str(detail, 'startDate') ?? null;
        const tags = strArr(detail, 'tags');
        patch.tags = tags;
        const status = (detail.status as Task['status']) || 'todo';
        const kanban = useKanbanStore.getState();
        const current = (kanban.tasks ?? []).find((t2) => t2.id === refId);
        if (current && current.status !== status) kanban.moveTask(refId, status);
        kanban.updateTask(refId, patch);
        return { success: true, message: '已撤销修改任务' };
      }
      case 'completed:task': {
        if (!refId) return { success: false, message: '无法撤销：缺少目标 id' };
        useKanbanStore.getState().moveTask(refId, (str(detail, 'status') as Task['status']) || 'todo');
        return { success: true, message: '已撤销完成任务' };
      }
      case 'deleted:task':
      case 'archived:task': {
        if (!refId) return { success: false, message: '无法撤销：缺少目标 id' };
        useKanbanStore.getState().restoreTask(refId);
        return { success: true, message: '已撤销任务归档/删除' };
      }

      // ── events
      case 'created:event': {
        const dateKey = str(detail, 'dateKey');
        if (!refId || !dateKey) return { success: false, message: '无法撤销：缺少日程数据' };
        useCalendarStore.getState().deleteEvent(dateKey, refId);
        return { success: true, message: '已撤销创建日程' };
      }
      case 'updated:event': {
        const newDateKey = str(detail, 'newDateKey');
        if (newDateKey && refId) {
          // 改期:删除新日期上的新事件,并用原数据在原日期重建。
          useCalendarStore.getState().deleteEvent(newDateKey, refId);
          const oldTitle = str(detail, 'oldTitle') ?? '（原日程）';
          useCalendarStore.getState().addEvent(
            str(detail, 'oldDateKey') ?? newDateKey,
            oldTitle,
            str(detail, 'oldDescription') ?? '',
            {
              startTime: str(detail, 'oldStartTime'),
              endTime: str(detail, 'oldEndTime'),
            }
          );
          return { success: true, message: '已撤销日程改期' };
        }
        if (!refId) return { success: false, message: '无法撤销：缺少日程 id' };
        const dateKey = str(detail, 'dateKey');
        if (!dateKey) return { success: false, message: '无法撤销：缺少日程日期' };
        useCalendarStore.getState().updateEvent(
          dateKey,
          refId,
          str(detail, 'oldTitle') ?? '（原日程）',
          str(detail, 'oldDescription') ?? '',
          {
            startTime: str(detail, 'oldStartTime'),
            endTime: str(detail, 'oldEndTime'),
          }
        );
        return { success: true, message: '已撤销修改日程' };
      }
      case 'deleted:event': {
        const dateKey = str(detail, 'dateKey');
        if (!dateKey) return { success: false, message: '无法撤销：缺少日程日期' };
        useCalendarStore.getState().addEvent(
          dateKey,
          str(detail, 'title') ?? '（已恢复日程）',
          str(detail, 'description') ?? '',
          {
            startTime: str(detail, 'startTime'),
            endTime: str(detail, 'endTime'),
          }
        );
        return { success: true, message: '已撤销删除日程' };
      }

      // ── notes
      case 'created:note': {
        if (!refId) return { success: false, message: '无法撤销：缺少笔记 id' };
        useNotesStore.getState().deleteNote(refId);
        return { success: true, message: '已撤销创建笔记' };
      }
      case 'updated:note': {
        if (!refId) return { success: false, message: '无法撤销：缺少笔记 id' };
        const patch: { title?: string; content?: string; contentText?: string; tags?: string[] } = {};
        const t = str(detail, 'titleBefore');
        if (t) patch.title = t;
        if (detail.contentBefore !== undefined && detail.contentTextBefore !== undefined) {
          patch.content = detail.contentBefore as string;
          patch.contentText = detail.contentTextBefore as string;
        }
        const tags = strArr(detail, 'tagsBefore');
        if (tags.length) patch.tags = tags;
        useNotesStore.getState().updateNote(refId, patch);
        return { success: true, message: '已撤销修改笔记' };
      }
      case 'archived:note': {
        if (!refId) return { success: false, message: '无法撤销：缺少笔记 id' };
        useNotesStore.getState().unarchiveNotes([refId]);
        return { success: true, message: '已撤销归档笔记' };
      }
      case 'deleted:note': {
        if (!refId) return { success: false, message: '无法撤销：缺少笔记 id' };
        useNotesStore.getState().restoreNote(refId);
        return { success: true, message: '已撤销删除笔记' };
      }

      // ── projects
      case 'created:project': {
        if (!refId) return { success: false, message: '无法撤销：缺少项目 id' };
        useProjectContextStore.getState().archiveProject(refId);
        return { success: true, message: '已撤销创建项目' };
      }
      case 'updated:project': {
        if (!refId) return { success: false, message: '无法撤销：缺少项目 id' };
        const patch: Record<string, string | null> = {};
        const n = str(detail, 'nameBefore');
        if (n) patch.name = n;
        patch.description = str(detail, 'descriptionBefore') ?? '';
        patch.color = str(detail, 'colorBefore') ?? '';
        useProjectContextStore.getState().updateProject(refId, patch);
        const parentId = typeof detail.parentIdBefore === 'string' ? detail.parentIdBefore : null;
        useProjectContextStore.getState().moveProject(refId, parentId);
        return { success: true, message: '已撤销修改项目' };
      }
      case 'archived:project': {
        if (!refId) return { success: false, message: '无法撤销：缺少项目 id' };
        useProjectContextStore.getState().restoreProject(refId);
        return { success: true, message: '已撤销归档项目' };
      }

      // ── links
      case 'created:link': {
        if (!refId) return { success: false, message: '无法撤销：缺少收藏 id' };
        useLinkLibraryStore.getState().deleteLink(refId);
        return { success: true, message: '已撤销收藏' };
      }
      case 'updated:link': {
        if (!refId) return { success: false, message: '无法撤销：缺少收藏 id' };
        const patch: Record<string, unknown> = {
          title: str(detail, 'title') ?? '（原收藏）',
          tags: strArr(detail, 'tags'),
          isFavorite: detail.isFavorite === true,
          isArchived: detail.isArchived === true,
          projectIds: strArr(detail, 'projectIds'),
        };
        const url = str(detail, 'url');
        if (url) patch.url = url;
        const description = str(detail, 'description');
        if (description !== undefined) patch.description = description;
        useLinkLibraryStore.getState().updateLink(refId, patch);
        return { success: true, message: '已撤销修改收藏' };
      }
      case 'deleted:link': {
        const title = str(detail, 'title') ?? '（已恢复收藏）';
        useLinkLibraryStore.getState().addLink({
          url: str(detail, 'url') ?? '',
          title,
          description: str(detail, 'description'),
          tags: strArr(detail, 'tags'),
          projectIds: strArr(detail, 'projectIds'),
          isFavorite: detail.isFavorite === true,
          isArchived: false,
          sortOrder: 0,
        });
        return { success: true, message: '已撤销删除收藏' };
      }

      // ── automations
      case 'created:automation': {
        if (!refId) return { success: false, message: '无法撤销：缺少自动化 id' };
        useAutomationStore.getState().deleteRule(refId);
        return { success: true, message: '已撤销创建自动化' };
      }
      case 'toggled:automation': {
        if (!refId) return { success: false, message: '无法撤销：缺少自动化 id' };
        useAutomationStore.getState().toggleRule(refId);
        return { success: true, message: '已撤销自动化开关' };
      }

      // ── habits
      case 'created:habit': {
        if (!refId) return { success: false, message: '无法撤销：缺少习惯 id' };
        useHabitStore.getState().archiveHabit(refId);
        return { success: true, message: '已撤销创建习惯' };
      }
      case 'checked:habit': {
        if (!refId) return { success: false, message: '无法撤销：缺少习惯 id' };
        useHabitStore.getState().toggleCompletion(refId, str(detail, 'date') ?? '');
        return { success: true, message: '已撤销习惯打卡' };
      }
      case 'archived:habit': {
        if (!refId) return { success: false, message: '无法撤销：缺少习惯 id' };
        useHabitStore.getState().restoreHabit(refId);
        return { success: true, message: '已撤销归档习惯' };
      }

      // ── energy
      case 'logged:energy': {
        if (!refId) return { success: false, message: '无法撤销：缺少记录 id' };
        useEnergyStore.getState().deleteLog(refId);
        return { success: true, message: '已撤销能量记录' };
      }

      // ── time tracking
      case 'started:time': {
        const store = useTimeTrackingStore.getState();
        if (store.activeEntry?.id === refId) await store.stopTimer();
        return { success: true, message: '已撤销开始计时' };
      }
      case 'stopped:time': {
        // stop 或补录在 state 中留下一条已结束记录,撤销 = 删除该记录。
        if (refId) await useTimeTrackingStore.getState().deleteEntry(refId);
        return { success: true, message: '已撤销时间记录' };
      }

      // ── focus
      case 'started:focus': {
        useFocusModeStore.getState().endFocus();
        return { success: true, message: '已撤销开始专注' };
      }
      case 'stopped:focus': {
        const linked = typeof refId === 'string' ? refId : undefined;
        useFocusModeStore.getState().startFocus(linked);
        return { success: true, message: '已撤销结束专注' };
      }

      // ── daily goals
      case 'created:goal': {
        const dateKey = str(detail, 'dateKey');
        if (!refId || !dateKey) return { success: false, message: '无法撤销：缺少目标数据' };
        useDailyPlanningStore.getState().removeGoal(dateKey, refId);
        return { success: true, message: '已撤销添加目标' };
      }
      case 'updated:goal': {
        const dateKey = str(detail, 'dateKey');
        if (!refId || !dateKey) return { success: false, message: '无法撤销：缺少目标数据' };
        useDailyPlanningStore.getState().toggleGoal(dateKey, refId);
        return { success: true, message: '已撤销目标勾选' };
      }

      // ── routines / resources / templates
      case 'created:routine': {
        if (!refId) return { success: false, message: '无法撤销：缺少例行 id' };
        useRoutineStore.getState().deleteRoutine(refId);
        return { success: true, message: '已撤销创建例行' };
      }
      case 'created:resource': {
        if (!refId) return { success: false, message: '无法撤销：缺少资源 id' };
        useResourceStore.getState().deleteResource(refId);
        return { success: true, message: '已撤销创建资源' };
      }
      case 'updated:resource': {
        if (!refId) return { success: false, message: '无法撤销：缺少资源 id' };
        const patch: Record<string, unknown> = {
          name: str(detail, 'name') ?? '（原资源）',
          capacity: typeof detail.capacity === 'number' ? detail.capacity : 40,
          skills: strArr(detail, 'skills'),
        };
        const email = str(detail, 'email');
        if (email) patch.email = email;
        useResourceStore.getState().updateResource(refId, patch);
        return { success: true, message: '已撤销修改资源' };
      }
      case 'created:template': {
        if (!refId) return { success: false, message: '无法撤销：缺少模板 id' };
        useTemplateStore.getState().deleteTemplate(refId);
        return { success: true, message: '已撤销创建模板' };
      }

      default:
        return { success: false, message: `该操作暂不支持撤销（${action}:${kind}）` };
    }
  } catch (error) {
    return {
      success: false,
      message: `撤销失败：${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
