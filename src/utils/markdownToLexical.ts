/**
 * Markdown to Lexical Conversion Utility
 *
 * Converts markdown strings to Lexical editor state JSON.
 * Used for importing AI Terminal messages into Notes.
 *
 * @module utils/markdownToLexical
 */

import { $createParagraphNode, $getRoot, createEditor } from 'lexical';
import type { SerializedEditorState } from 'lexical';
import { $convertFromMarkdownString, $convertToMarkdownString, TRANSFORMERS } from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { LinkNode, AutoLinkNode } from '@lexical/link';
import { TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { logger } from '../services/logger';

const log = logger.module('MarkdownToLexical');

/**
 * Lexical nodes configuration for the converter
 * Must match the nodes used in NotesEditor.tsx
 */
const EDITOR_NODES = [
  HeadingNode,
  QuoteNode,
  ListNode,
  ListItemNode,
  CodeNode,
  CodeHighlightNode,
  LinkNode,
  AutoLinkNode,
  TableNode,
  TableCellNode,
  TableRowNode,
];

/**
 * Convert markdown string to Lexical editor state JSON
 *
 * @param markdown - Markdown string to convert
 * @returns Serialized Lexical editor state as JSON string
 *
 * @example
 * ```ts
 * const markdown = '# Hello\n\nThis is **bold** text.';
 * const lexicalJson = markdownToLexical(markdown);
 * // Use lexicalJson as note.content
 * ```
 */
export function markdownToLexical(markdown: string): string {
  try {
    // Create a temporary editor with the same node configuration as NotesEditor
    const editor = createEditor({
      nodes: EDITOR_NODES,
      onError: (error) => {
        log.error('Lexical editor error during conversion', { error });
      },
    });

    // Convert markdown to Lexical state
    editor.update(
      () => {
        $convertFromMarkdownString(markdown, TRANSFORMERS);
      },
      { discrete: true } // Synchronous update
    );

    // Get the serialized state
    const editorState = editor.getEditorState();
    const serializedState = editorState.toJSON();

    log.debug('Converted markdown to Lexical', {
      markdownLength: markdown.length,
      nodeCount: countNodes(serializedState),
    });

    return JSON.stringify(serializedState);
  } catch (error) {
    log.error('Failed to convert markdown to Lexical', { error });
    // Return empty editor state as fallback
    return createEmptyEditorState();
  }
}

/**
 * Convert markdown to Lexical and append to existing content
 *
 * @param existingContent - Existing Lexical JSON content (note.content)
 * @param newMarkdown - New markdown to append
 * @param separator - Optional separator between existing and new content
 * @returns Combined Lexical editor state as JSON string
 */
export function appendMarkdownToLexical(
  existingContent: string,
  newMarkdown: string,
  separator: string = '\n\n---\n\n'
): string {
  try {
    // If no existing content, just convert the new markdown
    if (!existingContent || existingContent === '{}') {
      return markdownToLexical(newMarkdown);
    }

    if (!isValidLexicalJson(existingContent)) {
      log.warn('Invalid existing Lexical content, starting fresh');
      return markdownToLexical(newMarkdown);
    }

    // Merge serialized root children instead of round-tripping the existing
    // document through Markdown. A round trip silently drops custom nodes such
    // as callouts, embeds, images and wiki links.
    const existingState = JSON.parse(existingContent) as SerializedEditorState;
    const appendedState = JSON.parse(markdownToLexical(`${separator}${newMarkdown}`)) as SerializedEditorState;
    existingState.root.children.push(...appendedState.root.children);
    return JSON.stringify(existingState);
  } catch (error) {
    log.error('Failed to append markdown to Lexical', { error });
    // Fallback: just return the new content
    return markdownToLexical(newMarkdown);
  }
}

/**
 * Convert Lexical editor state to markdown
 * Wrapper around existing export functionality
 *
 * @param lexicalJson - Lexical editor state as JSON string
 * @returns Markdown string
 */
export function lexicalToMarkdown(lexicalJson: string): string {
  try {
    if (!lexicalJson || lexicalJson === '{}') {
      return '';
    }

    const editor = createEditor({
      nodes: EDITOR_NODES,
      onError: (error) => {
        log.error('Lexical editor error during markdown export', { error });
      },
    });

    let markdown = '';

    editor.update(
      () => {
        const parsedState = JSON.parse(lexicalJson);
        const editorState = editor.parseEditorState(parsedState);
        editor.setEditorState(editorState);
      },
      { discrete: true }
    );

    editor.getEditorState().read(() => {
      markdown = $convertToMarkdownString(TRANSFORMERS);
    });

    return markdown;
  } catch (error) {
    log.error('Failed to convert Lexical to markdown', { error });
    return '';
  }
}

/**
 * Create an empty Lexical editor state JSON
 *
 * @returns Empty editor state as JSON string
 */
export function createEmptyEditorState(): string {
  const editor = createEditor({
    nodes: EDITOR_NODES,
    onError: () => {},
  });

  // Lexical's initial serialized state has an empty root. That state is not
  // safe to apply with `setEditorState`; every document, including a visually
  // empty note, must contain an element node.
  editor.update(() => {
    const root = $getRoot();
    if (root.getChildrenSize() === 0) {
      root.append($createParagraphNode());
    }
  }, { discrete: true });

  return JSON.stringify(editor.getEditorState().toJSON());
}

/** True when content is a serialized Lexical-shaped document, even if broken. */
function hasLexicalRoot(content: string): boolean {
  try {
    const parsed = JSON.parse(content) as { root?: unknown };
    return typeof parsed === 'object' && parsed !== null &&
      typeof parsed.root === 'object' && parsed.root !== null;
  } catch {
    return false;
  }
}

/**
 * Validate that a string is valid Lexical JSON
 *
 * @param content - Content to validate
 * @returns True if valid Lexical JSON, false otherwise
 */
export function isValidLexicalJson(content: string): boolean {
  try {
    if (!content) return false;

    const parsed = JSON.parse(content);

    // Check for Lexical state structure
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      'root' in parsed &&
      typeof parsed.root === 'object' &&
      parsed.root !== null &&
      parsed.root.type === 'root' &&
      Array.isArray(parsed.root.children) &&
      parsed.root.children.length > 0
    );
  } catch {
    return false;
  }
}

/**
 * Enforce the Note content contract without rewriting an already-valid rich
 * document. `contentText` is treated as Markdown only when rich content is
 * missing or malformed.
 */
export function ensureLexicalContent(content?: string | null, contentText?: string | null): string {
  if (content && isValidLexicalJson(content)) return content;
  if (contentText?.trim()) return markdownToLexical(contentText);
  // A few legacy callers stored plain Markdown in `content` before the
  // Lexical/contentText contract was documented. Recover it instead of
  // replacing it with an empty state.
  // Invalid serialized editor JSON (notably legacy `root.children: []`) is
  // not Markdown. Treat it as an empty document instead of putting its JSON
  // source into the user's note.
  if (content?.trim() && !hasLexicalRoot(content)) return markdownToLexical(content);
  return createEmptyEditorState();
}

/** Replace one plain-text occurrence while preserving the surrounding AST. */
export function replaceTextInLexical(
  content: string,
  search: string,
  replacement: string,
  occurrence = 0
): string {
  if (!search || !isValidLexicalJson(content)) return content;

  try {
    const state = JSON.parse(content) as Record<string, unknown>;
    let remaining = Math.max(0, occurrence);
    let replaced = false;
    const needle = search.toLocaleLowerCase();

    const visit = (value: unknown): void => {
      if (replaced || typeof value !== 'object' || value === null) return;
      const node = value as Record<string, unknown>;
      if (node.type === 'text' && typeof node.text === 'string') {
        const lower = node.text.toLocaleLowerCase();
        let from = 0;
        while (!replaced) {
          const index = lower.indexOf(needle, from);
          if (index < 0) break;
          if (remaining === 0) {
            node.text = `${node.text.slice(0, index)}${replacement}${node.text.slice(index + search.length)}`;
            replaced = true;
            break;
          }
          remaining -= 1;
          from = index + search.length;
        }
      }
      if (Array.isArray(node.children)) node.children.forEach(visit);
    };

    visit(state.root);
    return replaced ? JSON.stringify(state) : content;
  } catch {
    return content;
  }
}

/**
 * Count nodes in a serialized editor state (for debugging)
 */
function countNodes(state: SerializedEditorState): number {
  try {
    let count = 0;
    const countRecursive = (node: unknown) => {
      if (typeof node === 'object' && node !== null) {
        count++;
        if ('children' in node && Array.isArray((node as Record<string, unknown>).children)) {
          (node as { children: unknown[] }).children.forEach(countRecursive);
        }
      }
    };
    countRecursive(state.root);
    return count;
  } catch {
    return 0;
  }
}
