import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { VersionHistoryPanel } from '../VersionHistoryPanel';
import { useNoteVersionStore } from '../../../stores/useNoteVersionStore';
import { useNotesStore } from '../../../stores/useNotesStore';

describe('VersionHistoryPanel', () => {
  beforeEach(() => {
    useNoteVersionStore.setState({ versions: {} });
    useNotesStore.setState({ notes: {} });
  });

  it('uses a stable empty snapshot when a note has no versions', () => {
    const { container, rerender } = render(<VersionHistoryPanel noteId="note-without-history" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<VersionHistoryPanel noteId="note-without-history" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('repairs an empty-root version before restoring it to the note', () => {
    const note = useNotesStore.getState().createNote({ title: '当前笔记' });
    const legacyEmptyRoot = JSON.stringify({
      root: { children: [], direction: null, format: '', indent: 0, type: 'root', version: 1 },
    });
    useNoteVersionStore.setState({
      versions: {
        [note.id]: [{
          id: 'legacy-version',
          noteId: note.id,
          title: '已恢复笔记',
          content: legacyEmptyRoot,
          contentText: '已恢复的文本',
          savedAt: new Date('2026-08-27T00:00:00.000Z'),
          wordCount: 1,
          changeSummary: '旧版本',
        }],
      },
    });

    render(<VersionHistoryPanel noteId={note.id} />);
    fireEvent.click(screen.getByRole('button', { name: /版本历史/ }));
    fireEvent.click(screen.getByTitle('恢复此版本'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^恢复/ }));

    const restored = useNotesStore.getState().getNote(note.id);
    expect(restored?.title).toBe('已恢复笔记');
    expect(restored?.contentText).toBe('已恢复的文本');
    const content = JSON.parse(restored?.content ?? '{}');
    expect(content.root.children).toHaveLength(1);
    expect(content.root.children[0].type).toBe('paragraph');
  });
});
