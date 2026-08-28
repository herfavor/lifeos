import { describe, expect, it } from 'vitest';
import { createEditor } from 'lexical';
import {
  appendMarkdownToLexical,
  createEmptyEditorState,
  ensureLexicalContent,
  isValidLexicalJson,
  lexicalToMarkdown,
  markdownToLexical,
  replaceTextInLexical,
} from '../markdownToLexical';

describe('markdownToLexical note content codec', () => {
  it('converts headings, lists and fenced code into a parseable editor state', () => {
    const content = markdownToLexical('# 标题\n\n- 一项\n\n```ts\nconst answer = 42\n```');

    expect(isValidLexicalJson(content)).toBe(true);
    const state = JSON.parse(content);
    expect(state.root.children.some((node: { type: string }) => node.type === 'heading')).toBe(true);
    expect(state.root.children.some((node: { type: string }) => node.type === 'code')).toBe(true);
    expect(lexicalToMarkdown(content)).toContain('const answer = 42');
  });

  it('repairs legacy plain text and creates a valid empty state', () => {
    expect(lexicalToMarkdown(ensureLexicalContent('', '中文内容'))).toContain('中文内容');
    expect(lexicalToMarkdown(ensureLexicalContent('legacy markdown', ''))).toContain('legacy markdown');
    expect(isValidLexicalJson(ensureLexicalContent('', ''))).toBe(true);
    expect(isValidLexicalJson(createEmptyEditorState())).toBe(true);
  });

  it('repairs legacy empty-root editor states without treating their JSON as text', () => {
    const legacyEmptyRoot = JSON.stringify({
      root: {
        children: [],
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    });

    expect(isValidLexicalJson(legacyEmptyRoot)).toBe(false);
    const repaired = ensureLexicalContent(legacyEmptyRoot, '');
    const state = JSON.parse(repaired);
    expect(state.root.children).toHaveLength(1);
    expect(state.root.children[0].type).toBe('paragraph');
    expect(lexicalToMarkdown(repaired)).not.toContain('"children"');
  });

  it('keeps an existing non-empty rich document unchanged', () => {
    const richContent = JSON.stringify({
      root: {
        children: [{ type: 'callout', version: 1, calloutType: 'info', children: [] }],
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    });

    expect(ensureLexicalContent(richContent, 'fallback text')).toBe(richContent);
  });

  it('creates empty content that Lexical can parse and set', () => {
    const editor = createEditor();
    const content = createEmptyEditorState();

    expect(() => editor.setEditorState(editor.parseEditorState(content))).not.toThrow();
  });

  it('preserves existing custom nodes when appending Markdown', () => {
    const customState = JSON.stringify({
      root: {
        children: [{ type: 'callout', version: 1, calloutType: 'info', children: [] }],
        direction: null,
        format: '',
        indent: 0,
        type: 'root',
        version: 1,
      },
    });

    const appended = appendMarkdownToLexical(customState, '[[目标笔记]]', '\n\n');
    const parsed = JSON.parse(appended);
    expect(parsed.root.children[0].type).toBe('callout');
    expect(JSON.stringify(parsed)).toContain('[[目标笔记]]');
  });

  it('replaces a text occurrence without rewriting the rest of the AST', () => {
    const original = markdownToLexical('Alpha and Alpha');
    const replaced = replaceTextInLexical(original, 'Alpha', '[[Alpha]]', 1);

    expect(JSON.stringify(JSON.parse(replaced))).toContain('[[Alpha]]');
    expect(lexicalToMarkdown(replaced)).toContain('Alpha and');
    expect(isValidLexicalJson(replaced)).toBe(true);
  });
});
