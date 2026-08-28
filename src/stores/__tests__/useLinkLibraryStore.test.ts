import { beforeEach, describe, expect, it } from 'vitest';
import {
  normalizePersistedCollections,
  normalizePersistedLinks,
  useLinkLibraryStore,
} from '../useLinkLibraryStore';

describe('bookmark persistence recovery', () => {
  beforeEach(() => {
    useLinkLibraryStore.setState({ links: {}, collections: {}, selectedLinkIds: new Set() });
  });

  it('accepts an empty library', () => {
    expect(normalizePersistedLinks([])).toEqual({});
    expect(normalizePersistedCollections(null)).toEqual({});
  });

  it('recovers legacy arrays and rehydrates all dates', () => {
    const links = normalizePersistedLinks([{
      id: 'legacy',
      url: 'https://example.com',
      title: 'Example',
      createdAt: '2025-01-02T00:00:00.000Z',
      updatedAt: 'not-a-date',
      tags: ['read', 'read', 42],
    }]);

    expect(links.legacy.createdAt).toBeInstanceOf(Date);
    expect(links.legacy.updatedAt).toBeInstanceOf(Date);
    expect(links.legacy.updatedAt.getTime()).toBe(links.legacy.createdAt.getTime());
    expect(links.legacy.tags).toEqual(['read']);
    expect(links.legacy.projectIds).toEqual([]);
    expect(links.legacy.sortOrder).toBe(0);
  });

  it('keeps malformed-but-recoverable records instead of clearing data', () => {
    const links = normalizePersistedLinks({ oldKey: { title: '', createdAt: null } });
    expect(links.oldKey.title).toBe('恢复的收藏 1');
    expect(links.oldKey.url).toBe('');
    expect(Number.isFinite(links.oldKey.createdAt.getTime())).toBe(true);
  });

  it('repairs collection shape without losing referenced link ids', () => {
    const collections = normalizePersistedCollections({
      collection: { name: '阅读', linkIds: ['a', 'a', 'b'], createdAt: 0 },
    });
    expect(collections.collection.linkIds).toEqual(['a', 'b']);
    expect(collections.collection.createdAt).toBeInstanceOf(Date);
  });

  it('recovers a large legacy library without dropping records', () => {
    const legacyLinks = Array.from({ length: 1_000 }, (_, index) => ({
      id: `legacy-${index}`,
      url: `https://example.com/${index}`,
      title: `收藏 ${index}`,
      createdAt: index % 2 === 0 ? '2024-01-01T00:00:00.000Z' : null,
      tags: index % 3 === 0 ? ['legacy'] : undefined,
    }));

    const links = normalizePersistedLinks(JSON.stringify(legacyLinks));

    expect(Object.keys(links)).toHaveLength(1_000);
    expect(links['legacy-0'].url).toBe('https://example.com/0');
    expect(links['legacy-999'].createdAt).toBeInstanceOf(Date);
  });

  it('keeps archive, trash, and restore as distinct recoverable states', () => {
    const link = useLinkLibraryStore.getState().addLink({
      url: 'https://example.com',
      title: 'Example',
      tags: [],
      projectIds: [],
      isFavorite: false,
      isArchived: false,
      sortOrder: 0,
    });

    useLinkLibraryStore.getState().toggleArchived(link.id);
    expect(useLinkLibraryStore.getState().getArchivedLinks()).toHaveLength(1);

    useLinkLibraryStore.getState().deleteLink(link.id);
    expect(useLinkLibraryStore.getState().getArchivedLinks()).toHaveLength(0);
    expect(useLinkLibraryStore.getState().getDeletedLinks()).toHaveLength(1);

    useLinkLibraryStore.getState().restoreLink(link.id);
    expect(useLinkLibraryStore.getState().getDeletedLinks()).toHaveLength(0);
    expect(useLinkLibraryStore.getState().getArchivedLinks()).toHaveLength(1);
  });
});
