/**
 * Undo tests: every executed write returns an UndoDescriptor, and
 * undoAgentOperation reverses it through the same stores.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { executeAgentAction } from '../executor';
import { undoAgentOperation } from '../undo';
import { useKanbanStore } from '../../../../stores/useKanbanStore';
import { useCalendarStore } from '../../../../stores/useCalendarStore';
import { useNotesStore } from '../../../../stores/useNotesStore';

beforeEach(() => {
  useKanbanStore.setState({ tasks: [] });
  useCalendarStore.setState({ events: {} });
  useNotesStore.setState({ notes: {} });
});

describe('undoAgentOperation', () => {
  it('undoes create_task (task vanishes)', async () => {
    const created = await executeAgentAction('create_task', { title: '临时任务' });
    expect(created.undo).toBeDefined();
    expect(useKanbanStore.getState().tasks).toHaveLength(1);

    const undone = await undoAgentOperation(created.undo!);
    expect(undone.success).toBe(true);
    expect(useKanbanStore.getState().tasks).toHaveLength(0);
  });

  it('undoes complete_task (status restored)', async () => {
    const created = await executeAgentAction('create_task', { title: '写周报', status: 'inprogress' });
    const before = await executeAgentAction('complete_task', { taskId: created.refId });
    expect(useKanbanStore.getState().tasks[0].status).toBe('done');

    const undone = await undoAgentOperation(before.undo!);
    expect(undone.success).toBe(true);
    expect(useKanbanStore.getState().tasks[0].status).toBe('inprogress');
  });

  it('undoes create_event and delete_event', async () => {
    const created = await executeAgentAction('create_event', {
      date: '2026-08-28',
      title: '开会',
      startTime: '10:00',
    });
    expect(created.undo).toBeDefined();
    expect(useCalendarStore.getState().events?.['2026-8-28']).toHaveLength(1);

    const undone = await undoAgentOperation(created.undo!);
    expect(undone.success).toBe(true);
    expect(useCalendarStore.getState().events?.['2026-8-28'] ?? []).toHaveLength(0);

    // Recreate then delete, then undo the deletion.
    const again = await executeAgentAction('create_event', {
      date: '2026-08-29',
      title: '站会',
      startTime: '09:30',
    });
    const deleted = await executeAgentAction('delete_event', { eventId: again.refId });
    expect((useCalendarStore.getState().events?.['2026-8-29'] ?? []).length).toBe(0);

    const undoneDelete = await undoAgentOperation(deleted.undo!);
    expect(undoneDelete.success).toBe(true);
    expect(useCalendarStore.getState().events?.['2026-8-29'] ?? []).toHaveLength(1);
  });

  it('undoes archive_note (note restored to active list)', async () => {
    const created = await executeAgentAction('create_note', { title: '灵感', content: '内容' });
    const archived = await executeAgentAction('archive_note', { noteId: created.refId });
    const afterArchive = useNotesStore.getState().getNote(created.refId!);
    expect(afterArchive?.isArchived).toBe(true);

    const undone = await undoAgentOperation(archived.undo!);
    expect(undone.success).toBe(true);
    expect(useNotesStore.getState().getNote(created.refId!)?.isArchived).toBe(false);
  });
});
