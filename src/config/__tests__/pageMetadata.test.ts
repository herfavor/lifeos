import { describe, expect, it } from 'vitest';
import { getPageMetadata, getPageTitle } from '../pageMetadata';

describe('page metadata', () => {
  it('describes Inbox as a distinct decision surface', () => {
    expect(getPageMetadata('/inbox')).toEqual({
      title: '收件箱',
      subtitle: '先看清未决定的内容，再安排下一步',
    });
  });

  it('uses the concise AI product label', () => {
    expect(getPageTitle('/ai')).toBe('AI');
  });

  it('keeps nested editor routes on their parent metadata', () => {
    expect(getPageTitle('/create/example')).toBe('文档');
    expect(getPageTitle('/diagrams/example')).toBe('绘图');
  });
});
