import { describe, expect, it } from 'vitest';
import { normalizePersistedNotes } from '../useNotesStore';
import { normalizeAutomationRules } from '../useAutomationStore';
import { normalizeProjects } from '../useProjectContextStore';

describe('persisted state recovery', () => {
  it('repairs notes independently and preserves legacy plain content', () => {
    const notes = normalizePersistedNotes(JSON.stringify({
      good: {
        id: 'good',
        title: '旧笔记',
        content: '# 仍然在这里',
        tags: ['work', 'work', 42],
        createdAt: 'invalid',
      },
      scalar: '只剩下的文本',
      broken: 42,
    }));

    expect(Object.keys(notes)).toEqual(['good', 'scalar']);
    expect(notes.good.contentText).toBe('# 仍然在这里');
    expect(notes.good.tags).toEqual(['work']);
    expect(() => JSON.parse(notes.good.content)).not.toThrow();
    expect(notes.scalar.contentText).toBe('只剩下的文本');
    expect(notes.scalar.createdAt).toBeInstanceOf(Date);
  });

  it('repairs persisted empty Lexical roots as safely editable empty notes', () => {
    const legacyEmptyRoot = JSON.stringify({
      root: { children: [], direction: null, format: '', indent: 0, type: 'root', version: 1 },
    });
    const notes = normalizePersistedNotes({
      empty: { id: 'empty', content: legacyEmptyRoot, contentText: '' },
    });

    const content = JSON.parse(notes.empty.content);
    expect(content.root.children).toHaveLength(1);
    expect(content.root.children[0].type).toBe('paragraph');
    expect(notes.empty.contentText).toBe('');
  });

  it('migrates legacy automation trigger/action fields', () => {
    const rules = normalizeAutomationRules([
      {
        id: 'legacy-rule',
        name: '完成后归档',
        trigger: { event: 'task.completed' },
        action: { type: 'archive', params: {} },
        createdAt: '2025-01-01T00:00:00.000Z',
      },
      null,
    ]);

    expect(rules).toHaveLength(1);
    expect(rules[0].trigger.type).toBe('task.completed');
    expect(rules[0].actions).toEqual([{ type: 'archive', config: {}, delay: undefined }]);
    expect(rules[0].created).toBe('2025-01-01T00:00:00.000Z');
  });

  it('repairs project arrays and filters values that cannot be projects', () => {
    const projects = normalizeProjects(JSON.stringify([
      { id: 'p1', name: '产品', parentId: null, color: '#123456', createdAt: '2025-01-01' },
      { description: '仍可恢复' },
      'bad',
    ]));

    expect(projects).toHaveLength(2);
    expect(projects[0]).toMatchObject({ id: 'p1', name: '产品', color: '#123456' });
    expect(projects[1]).toMatchObject({ id: 'recovered-project-2', name: '恢复的项目 2' });
    expect(projects.every((project) => typeof project.updatedAt === 'string')).toBe(true);
  });
});
