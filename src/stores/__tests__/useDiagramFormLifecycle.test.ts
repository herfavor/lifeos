import { beforeEach, describe, expect, it } from 'vitest';
import { useDiagramsStore } from '../useDiagramsStore';
import { useFormsStore } from '../useFormsStore';

describe('diagram recycle-bin lifecycle', () => {
  beforeEach(() => {
    useDiagramsStore.setState({ diagrams: [] });
  });

  it('moves deleted diagrams to trash instead of removing them', () => {
    const diagram = useDiagramsStore.getState().createDiagram('流程 A');
    useDiagramsStore.getState().deleteDiagram(diagram.id);

    const trashed = useDiagramsStore.getState().diagrams.find((d) => d.id === diagram.id);
    expect(trashed).toBeDefined();
    expect(trashed?.deletedAt).toBeInstanceOf(Date);
  });

  it('restores a trashed diagram and permanently deletes on request', () => {
    const diagram = useDiagramsStore.getState().createDiagram('流程 B');
    useDiagramsStore.getState().deleteDiagram(diagram.id);

    useDiagramsStore.getState().restoreDiagram(diagram.id);
    const restored = useDiagramsStore.getState().diagrams.find((d) => d.id === diagram.id);
    expect(restored?.deletedAt).toBeUndefined();

    useDiagramsStore.getState().deleteDiagram(diagram.id);
    useDiagramsStore.getState().permanentlyDeleteDiagram(diagram.id);
    expect(useDiagramsStore.getState().diagrams.some((d) => d.id === diagram.id)).toBe(false);
  });
});

describe('form recycle-bin lifecycle', () => {
  beforeEach(() => {
    useFormsStore.setState({ forms: [], responses: [] });
  });

  it('moves deleted forms to trash and keeps responses until permanent deletion', () => {
    const form = useFormsStore.getState().createForm('问卷 A');
    useFormsStore.getState().submitResponse(form.id, { q1: 'yes' });

    useFormsStore.getState().deleteForm(form.id);
    const trashed = useFormsStore.getState().forms.find((f) => f.id === form.id);
    expect(trashed?.deletedAt).toBeInstanceOf(Date);
    expect(useFormsStore.getState().responses).toHaveLength(1);

    useFormsStore.getState().restoreForm(form.id);
    const restored = useFormsStore.getState().forms.find((f) => f.id === form.id);
    expect(restored?.deletedAt).toBeUndefined();

    useFormsStore.getState().deleteForm(form.id);
    useFormsStore.getState().permanentlyDeleteForm(form.id);
    expect(useFormsStore.getState().forms.some((f) => f.id === form.id)).toBe(false);
    expect(useFormsStore.getState().responses).toHaveLength(0);
  });
});
