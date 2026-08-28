import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportNoteToPDF } from '../../../services/notePdfExport';
import { useToastStore } from '../../../stores/useToastStore';
import type { Note } from '../../../types/notes';
import { exportNoteToPDFWithFeedback } from '../notePdfExportHandler';

vi.mock('../../../services/notePdfExport', () => ({
  exportNoteToPDF: vi.fn(),
}));

const note: Note = {
  id: 'note-pdf',
  folderId: null,
  title: '导出测试',
  content: '',
  contentText: '测试内容',
  tags: [],
  projectIds: [],
  createdAt: new Date('2026-08-27T00:00:00.000Z'),
  updatedAt: new Date('2026-08-27T00:00:00.000Z'),
  isPinned: false,
  isArchived: false,
};

describe('exportNoteToPDFWithFeedback', () => {
  const exportNoteToPDFMock = vi.mocked(exportNoteToPDF);

  beforeEach(() => {
    exportNoteToPDFMock.mockReset();
    useToastStore.setState({ toasts: [] });
  });

  it('calls the PDF export service and reports the generated filename', async () => {
    exportNoteToPDFMock.mockImplementation(async (_note, onSuccess) => {
      onSuccess?.('导出测试-2026-08-27.pdf');
    });

    await exportNoteToPDFWithFeedback(note, new Set());

    expect(exportNoteToPDFMock).toHaveBeenCalledWith(note, expect.any(Function));
    expect(useToastStore.getState().toasts).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'success', message: 'PDF 已导出', description: '导出测试-2026-08-27.pdf' }),
    ]));
  });

  it('shows a visible error when the PDF service fails', async () => {
    exportNoteToPDFMock.mockRejectedValue(new Error('jsPDF unavailable'));

    await exportNoteToPDFWithFeedback(note, new Set());

    expect(useToastStore.getState().toasts).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'error', message: '导出 PDF 失败', description: '请稍后重试' }),
    ]));
  });

  it('does not start a duplicate export while the first one is pending', async () => {
    let resolveExport: (() => void) | undefined;
    exportNoteToPDFMock.mockImplementation(() => new Promise<void>((resolve) => {
      resolveExport = resolve;
    }));
    const exportingNoteIds = new Set<string>();

    const firstExport = exportNoteToPDFWithFeedback(note, exportingNoteIds);
    await exportNoteToPDFWithFeedback(note, exportingNoteIds);

    expect(exportNoteToPDFMock).toHaveBeenCalledTimes(1);
    expect(useToastStore.getState().toasts).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'info', message: '正在导出这篇笔记的 PDF' }),
    ]));

    resolveExport?.();
    await firstExport;
    expect(exportingNoteIds).not.toContain(note.id);
  });
});
