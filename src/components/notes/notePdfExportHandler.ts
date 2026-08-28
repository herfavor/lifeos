import type { Note } from '../../types/notes';
import { exportNoteToPDF } from '../../services/notePdfExport';
import { toast } from '../../stores/useToastStore';

/**
 * Export a note with user feedback shared by every Notes layout.
 *
 * Context menus close as soon as an action is chosen, so the progress and
 * result live in toasts. The caller owns the set to keep deduplication scoped
 * to its mounted layout instance.
 */
export async function exportNoteToPDFWithFeedback(
  note: Note,
  exportingNoteIds: Set<string>
): Promise<void> {
  if (exportingNoteIds.has(note.id)) {
    toast.info('正在导出这篇笔记的 PDF');
    return;
  }

  exportingNoteIds.add(note.id);
  toast.info('正在导出 PDF…');

  try {
    await exportNoteToPDF(note, (filename) => {
      toast.success('PDF 已导出', filename);
    });
  } catch {
    toast.error('导出 PDF 失败', '请稍后重试');
  } finally {
    exportingNoteIds.delete(note.id);
  }
}
