import { beforeEach, describe, expect, it } from 'vitest';
import { useDocsStore } from '../useDocsStore';
import { useProjectContextStore } from '../useProjectContextStore';

describe('useDocsStore document lifecycle', () => {
  beforeEach(() => {
    useProjectContextStore.setState({ projects: [], activeProjectIds: [] });
    useDocsStore.setState({ docs: [], folders: [], activeDocId: null });
  });

  it('archives and restores a document without losing its content', () => {
    const id = useDocsStore.getState().createDoc('doc', '成果文档');

    useDocsStore.getState().archiveDoc(id);
    expect(useDocsStore.getState().getFilteredDocs()).toHaveLength(0);
    expect(useDocsStore.getState().getArchivedDocs()[0]).toMatchObject({ id, title: '成果文档' });

    useDocsStore.getState().restoreDoc(id);
    expect(useDocsStore.getState().getFilteredDocs()[0]).toMatchObject({ id, title: '成果文档' });
  });

  it('moves deletion through the recycle bin before permanent removal', () => {
    const id = useDocsStore.getState().createDoc('doc', '待删除文档');

    useDocsStore.getState().deleteDoc(id);
    expect(useDocsStore.getState().getDeletedDocs()[0]?.id).toBe(id);
    expect(useDocsStore.getState().docs.some((doc) => doc.id === id)).toBe(true);

    useDocsStore.getState().permanentlyDeleteDoc(id);
    expect(useDocsStore.getState().docs.some((doc) => doc.id === id)).toBe(false);
  });
});
