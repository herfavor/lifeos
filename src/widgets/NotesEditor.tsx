/**
 * Notes Editor Component
 *
 * Rich text editor using Lexical
 * Auto-saves changes to Notes store (debounced)
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { $createCodeNode, CodeNode, CodeHighlightNode } from '@lexical/code';
import { LinkNode } from '@lexical/link';
import { INSERT_TABLE_COMMAND, TableNode, TableCellNode, TableRowNode } from '@lexical/table';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { AutoLinkPlugin } from '@lexical/react/LexicalAutoLinkPlugin';
import { AutoLinkNode } from '@lexical/link';
import { TRANSFORMERS, CHECK_LIST } from '@lexical/markdown';
import {
  $getRoot,
  $getSelection,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  $isRangeSelection,
  $createParagraphNode,
  UNDO_COMMAND,
  REDO_COMMAND,
  $isParagraphNode,
  $isTextNode,
  COMMAND_PRIORITY_HIGH,
  KEY_DOWN_COMMAND,
} from 'lexical';
import type { ElementFormatType } from 'lexical';
import type { EditorState } from 'lexical';
import {
  registerRichText,
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode
} from '@lexical/rich-text';
import type { HeadingTagType } from '@lexical/rich-text';
import {
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_CHECK_LIST_COMMAND,
  $isListNode
} from '@lexical/list';
import { registerCodeHighlighting } from '@lexical/code';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode';
import { HorizontalRulePlugin } from '@lexical/react/LexicalHorizontalRulePlugin';
import { INSERT_HORIZONTAL_RULE_COMMAND } from '@lexical/react/LexicalHorizontalRuleNode';
import { $patchStyleText } from '@lexical/selection';

// URL matcher for AutoLinkPlugin
const URL_MATCHER =
  /((https?:\/\/(www\.)?)|(www\.))[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;

const MATCHERS = [
  (text: string) => {
    const match = URL_MATCHER.exec(text);
    if (match === null) {
      return null;
    }
    const fullMatch = match[0];
    return {
      index: match.index,
      length: fullMatch.length,
      text: fullMatch,
      url: fullMatch.startsWith('http') ? fullMatch : `https://${fullMatch}`,
    };
  },
];
import { motion } from 'framer-motion';
import { useNotesStore } from '../stores/useNotesStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { TagPicker } from '../components/TagPicker';
import { CustomFieldEditor } from '../components/CustomFieldEditor';
import { NOTE_CONSTANTS } from '../types/notes';
import { ImageNode, $createImageNode } from './NotesEditor/ImageNode';
import { TaskEmbedNode } from '../components/editor/nodes/TaskEmbedNode';
import { EventEmbedNode } from '../components/editor/nodes/EventEmbedNode';
import { SpreadsheetEmbedNode } from '../components/editor/nodes/SpreadsheetEmbedNode';
import { CalloutNode, $createCalloutNode } from '../components/editor/nodes/CalloutNode';
import type { CalloutType } from '../components/editor/nodes/CalloutNode';
import { ToggleNode, $createToggleNode } from '../components/editor/nodes/ToggleNode';
import { MathBlockNode, $createMathBlockNode } from '../components/editor/nodes/MathBlockNode';
import { MermaidBlockNode, $createMermaidBlockNode } from '../components/editor/nodes/MermaidBlockNode';
import { VideoEmbedNode, $createVideoEmbedNode } from '../components/editor/nodes/VideoEmbedNode';
import { indexedDBService } from '../services/indexedDB';
import { BacklinksPanel } from '../components/BacklinksPanel';
import { LinkedEventsPanel } from '../components/notes/LinkedEventsPanel';
import { VersionHistoryPanel } from '../components/notes/VersionHistoryPanel';
import { useNoteVersionStore } from '../stores/useNoteVersionStore';
import { toast } from '../stores/useToastStore';
import WikiLinkAutocompletePlugin from '../components/editor/WikiLinkAutocompletePlugin';
import WikiLinkTransformPlugin from '../components/editor/WikiLinkTransformPlugin';
import HoverPreviewPlugin from '../components/editor/plugins/HoverPreviewPlugin';
import BlockReferencePlugin from '../components/editor/plugins/BlockReferencePlugin';
import HashtagPlugin from '../components/editor/plugins/HashtagPlugin';
import EmbedPlugin from '../components/editor/plugins/EmbedPlugin';
import { WikiLinkNode } from '../components/editor/WikiLinkNode';
import { HashtagNode } from '../components/editor/nodes/HashtagNode';
import { TableOfContentsNode, $createTableOfContentsNode } from '../components/editor/nodes/TableOfContentsNode';
import TableOfContentsPlugin from '../components/editor/plugins/TableOfContentsPlugin';
import FileAttachmentPlugin from '../components/editor/plugins/FileAttachmentPlugin';
import { NoteAttachmentsList } from '../components/notes/NoteAttachmentsList';
import { NoteAliasEditor } from '../components/notes/NoteAliasEditor';
import OutlinePanelPlugin from '../components/editor/plugins/OutlinePanelPlugin';
import type { OutlineHeading } from '../components/editor/plugins/OutlinePanelPlugin';
import { NoteOutlinePanel } from '../components/editor/NoteOutlinePanel';
import { AlertTriangle, ChevronRight, Info, List, Play, Redo2, Settings2, Siren, SquareCheck, Table, Undo2, Workflow, FileText, Lightbulb, ListTree, X } from 'lucide-react';
import { useAnnounce } from '../hooks/useAnnounce';
import { ensureLexicalContent } from '../utils/markdownToLexical';

/**
 * Keyboard Shortcuts Plugin
 * Registers rich text keyboard shortcuts (Cmd+B, Cmd+I, Cmd+U)
 */
const KeyboardShortcutsPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return registerRichText(editor);
  }, [editor]);

  return null;
};

/**
 * Code Highlight Plugin
 * Registers Prism-based syntax highlighting for code blocks
 */
const CodeHighlightPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return registerCodeHighlighting(editor);
  }, [editor]);

  return null;
};

/**
 * Word Count Plugin
 * Tracks word and character count from editor content
 */
const WordCountPlugin: React.FC<{ onUpdate: (words: number, chars: number) => void }> = ({ onUpdate }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerTextContentListener((textContent) => {
      const words = textContent.trim().split(/\s+/).filter(Boolean).length;
      const chars = textContent.length;
      onUpdate(words, chars);
    });
  }, [editor, onUpdate]);

  return null;
};

/**
 * Image Upload Plugin
 * Handles drag-and-drop and paste events for images
 */
const ImageUploadPlugin: React.FC<{ noteId: string }> = ({ noteId }) => {
  const [editor] = useLexicalComposerContext();
  const [isDragging, setIsDragging] = useState(false);

  const uploadImage = useCallback(async (file: File) => {
    try {
      // Store image in IndexedDB with compression
      const imageId = await indexedDBService.storeImage(noteId, file);

      // Retrieve compressed blob
      const blob = await indexedDBService.getImage(imageId);
      if (!blob) {
        console.error('Failed to retrieve stored image');
        return;
      }

      // Create blob URL for rendering
      const blobUrl = URL.createObjectURL(blob);

      // Insert image node into editor
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const imageNode = $createImageNode({
            altText: file.name,
            src: blobUrl,
            imageId: imageId,
          });
          selection.insertNodes([imageNode]);
        }
      });

    } catch (error) {
      console.error('Failed to upload image:', error);
    }
  }, [editor, noteId]);

  useEffect(() => {
    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    // Drag and drop handlers
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragging(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      // Only hide if leaving the editor entirely
      if (e.target === editorElement) {
        setIsDragging(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer?.files || []);
      const imageFiles = files.filter(file => file.type.startsWith('image/'));

      for (const file of imageFiles) {
        await uploadImage(file);
      }
    };

    // Paste handler
    const handlePaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items || []);
      const imageItems = items.filter(item => item.type.startsWith('image/'));

      if (imageItems.length > 0) {
        e.preventDefault();

        for (const item of imageItems) {
          const file = item.getAsFile();
          if (file) {
            await uploadImage(file);
          }
        }
      }
    };

    editorElement.addEventListener('dragenter', handleDragEnter);
    editorElement.addEventListener('dragover', handleDragOver);
    editorElement.addEventListener('dragleave', handleDragLeave);
    editorElement.addEventListener('drop', handleDrop);
    editorElement.addEventListener('paste', handlePaste);

    return () => {
      editorElement.removeEventListener('dragenter', handleDragEnter);
      editorElement.removeEventListener('dragover', handleDragOver);
      editorElement.removeEventListener('dragleave', handleDragLeave);
      editorElement.removeEventListener('drop', handleDrop);
      editorElement.removeEventListener('paste', handlePaste);
    };
  }, [editor, uploadImage]);

  // Drag overlay
  if (isDragging) {
    return (
      <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-accent-primary bg-accent-primary/10">
        <div className="bg-surface-light dark:bg-surface-dark px-6 py-4 rounded-lg shadow-elevated">
          <p className="text-lg font-semibold text-accent-primary">将图片拖放到此处</p>
        </div>
      </div>
    );
  }

  return null;
};

/**
 * Slash Command Plugin
 * Detects '/' and shows command menu
 */
const SlashCommandPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();
  const [showMenu, setShowMenu] = useState(false);
  const [query, setQuery] = useState('');
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const clearSlashCommand = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const node = selection.anchor.getNode();
        if ($isTextNode(node)) {
          const cursorOffset = selection.anchor.offset;
          const slashIndex = node.getTextContent().slice(0, cursorOffset).lastIndexOf('/');
          if (slashIndex >= 0) {
            node.spliceText(slashIndex, cursorOffset - slashIndex, '', true);
            node.select(slashIndex, slashIndex);
          }
        }
      }
    });
  }, [editor]);

  const insertCallout = useCallback((calloutType: CalloutType) => {
    clearSlashCommand();
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const calloutNode = $createCalloutNode({ calloutType });
        selection.insertNodes([calloutNode]);
      }
    });
  }, [editor, clearSlashCommand]);

  const insertToggle = useCallback(() => {
    clearSlashCommand();
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const toggleNode = $createToggleNode({ isOpen: true });
        selection.insertNodes([toggleNode]);
      }
    });
  }, [editor, clearSlashCommand]);

  const insertHR = useCallback(() => {
    clearSlashCommand();
    editor.dispatchCommand(INSERT_HORIZONTAL_RULE_COMMAND, undefined);
  }, [editor, clearSlashCommand]);

  const formatAsHeading = useCallback((tag: HeadingTagType) => {
    clearSlashCommand();
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        const element = anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();
        const heading = $createHeadingNode(tag);
        element.replace(heading, true);
      }
    });
  }, [editor, clearSlashCommand]);

  const formatAsQuote = useCallback(() => {
    clearSlashCommand();
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        const element = anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();
        if (!$isListNode(element)) {
          const quote = $createQuoteNode();
          element.replace(quote, true);
        }
      }
    });
  }, [editor, clearSlashCommand]);

  const formatAsCodeBlock = useCallback(() => {
    clearSlashCommand();
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        const element = anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();
        const codeNode = $createCodeNode();
        element.replace(codeNode, true);
      }
    });
  }, [editor, clearSlashCommand]);

  const commands = [
    { id: 'heading1', label: '标题 1', keywords: ['h1', 'heading', '一级标题'], icon: 'H1', action: () => formatAsHeading('h1') },
    { id: 'heading2', label: '标题 2', keywords: ['h2', 'heading', '二级标题'], icon: 'H2', action: () => formatAsHeading('h2') },
    { id: 'heading3', label: '标题 3', keywords: ['h3', 'heading', '三级标题'], icon: 'H3', action: () => formatAsHeading('h3') },
    { id: 'bullet-list', label: '项目符号列表', keywords: ['bullet', 'list', 'ul', '列表'], icon: '•', action: () => {
      clearSlashCommand();
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    }},
    { id: 'number-list', label: '编号列表', keywords: ['number', 'list', 'ol', '有序列表'], icon: '1.', action: () => {
      clearSlashCommand();
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    }},
    { id: 'code', label: '代码块', keywords: ['code', '代码', '代码块'], icon: '</>', action: formatAsCodeBlock },
    { id: 'table', label: '表格', keywords: ['table', 'grid', '表格'], icon: <Table className="h-4 w-4" aria-hidden />, action: () => {
      clearSlashCommand();
      editor.dispatchCommand(INSERT_TABLE_COMMAND, { rows: '3', columns: '3', includeHeaders: true });
    }},
    { id: 'quote', label: '引用', keywords: ['quote', 'blockquote', '引用'], icon: '"', action: formatAsQuote },
    { id: 'divider', label: '分隔线', keywords: ['divider', 'hr', '分隔线'], icon: '—', action: insertHR },
    { id: 'callout-info', label: '提示框（信息）', keywords: ['callout', 'info', '信息'], icon: <Info className="h-4 w-4" aria-hidden />, action: () => insertCallout('info') },
    { id: 'callout-warning', label: '提示框（警告）', keywords: ['callout', 'warning', '警告'], icon: <AlertTriangle className="h-4 w-4" aria-hidden />, action: () => insertCallout('warning') },
    { id: 'callout-tip', label: '提示框（提示）', keywords: ['callout', 'tip', '提示'], icon: <Lightbulb className="h-4 w-4" aria-hidden />, action: () => insertCallout('tip') },
    { id: 'callout-danger', label: '提示框（危险）', keywords: ['callout', 'danger', '危险'], icon: <Siren className="h-4 w-4" aria-hidden />, action: () => insertCallout('danger') },
    { id: 'toggle', label: '折叠块', keywords: ['toggle', 'details', '折叠'], icon: <ChevronRight className="h-4 w-4" aria-hidden />, action: insertToggle },
    { id: 'toc', label: '目录', keywords: ['toc', 'contents', '目录'], icon: <ListTree className="h-4 w-4" aria-hidden />, action: () => {
      clearSlashCommand();
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const tocNode = $createTableOfContentsNode();
          selection.insertNodes([tocNode]);
        }
      });
    }},
    { id: 'math', label: '数学公式', keywords: ['math', 'formula', '数学', '公式'], icon: '∑', action: () => {
      clearSlashCommand();
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const mathNode = $createMathBlockNode({});
          selection.insertNodes([mathNode]);
        }
      });
    }},
    { id: 'mermaid', label: 'Mermaid 图表', keywords: ['mermaid', 'diagram', '图表'], icon: <Workflow className="h-4 w-4" aria-hidden />, action: () => {
      clearSlashCommand();
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const mermaidNode = $createMermaidBlockNode({});
          selection.insertNodes([mermaidNode]);
        }
      });
    }},
    { id: 'video', label: '视频', keywords: ['video', 'embed', '视频'], icon: <Play className="h-4 w-4" aria-hidden />, action: () => {
      clearSlashCommand();
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const videoNode = $createVideoEmbedNode({});
          selection.insertNodes([videoNode]);
        }
      });
    }},
  ];

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredCommands = commands.filter((command) =>
    [command.id, command.label, ...command.keywords]
      .some((value) => value.toLocaleLowerCase().includes(normalizedQuery))
  );

  useEffect(() => setSelectedIndex(0), [query]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          setShowMenu(false);
          return;
        }

        const anchorNode = selection.anchor.getNode();
        if (!$isTextNode(anchorNode)) {
          setShowMenu(false);
          return;
        }

        const textBeforeCursor = anchorNode
          .getTextContent()
          .slice(0, selection.anchor.offset);
        const match = textBeforeCursor.match(/(?:^|\s)\/([^\s/]*)$/);
        if (match) {
          setQuery(match[1]);
          setShowMenu(true);

          const nativeSelection = window.getSelection();
          if (nativeSelection && nativeSelection.rangeCount > 0) {
            const range = nativeSelection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setMenuPosition({
              top: rect.bottom + 6,
              left: Math.max(8, Math.min(rect.left, window.innerWidth - 300)),
            });
          }
        } else {
          setShowMenu(false);
        }
      });
    });
  }, [editor]);

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event) => {
        if (!showMenu || filteredCommands.length === 0) return false;
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSelectedIndex((index) => (index + 1) % filteredCommands.length);
          return true;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSelectedIndex((index) => (index - 1 + filteredCommands.length) % filteredCommands.length);
          return true;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          filteredCommands[selectedIndex]?.action();
          setShowMenu(false);
          return true;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          setShowMenu(false);
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [editor, filteredCommands, selectedIndex, showMenu]);

  if (!showMenu || filteredCommands.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: `${menuPosition.top}px`,
        left: `${menuPosition.left}px`,
        zIndex: 1000,
      }}
      className="max-h-80 min-w-[260px] overflow-y-auto rounded-xl border border-border-light bg-surface-light py-2 shadow-elevated dark:border-border-dark dark:bg-surface-dark-elevated"
      role="menu"
      aria-label="插入内容"
    >
      {filteredCommands.map((cmd, index) => (
        <button
          key={cmd.id}
          onClick={() => {
            cmd.action();
            setShowMenu(false);
          }}
          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
            index === selectedIndex
              ? 'bg-accent-primary/10 text-accent-primary'
              : 'hover:bg-surface-light-elevated dark:hover:bg-surface-dark'
          }`}
          role="menuitem"
          aria-current={index === selectedIndex ? 'true' : undefined}
        >
          <span className="text-text-light-secondary dark:text-text-dark-secondary font-mono">
            {cmd.icon}
          </span>
          <span className="text-text-light-primary dark:text-text-dark-primary">
            {cmd.label}
          </span>
        </button>
      ))}
    </div>
  );
};

/**
 * View Mode Type
 */
type ViewMode = 'edit' | 'preview';

/**
 * Editor Toolbar Component
 */
const EditorToolbar: React.FC<{
  wordCount: number;
  charCount: number;
  noteId: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  outlineOpen: boolean;
  onToggleOutline: () => void;
}> = ({ wordCount, charCount, noteId, viewMode, onViewModeChange, outlineOpen, onToggleOutline }) => {
  const [editor] = useLexicalComposerContext();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showMoreFormatting, setShowMoreFormatting] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('javascript');

  const HIGHLIGHT_COLORS = [
    { label: '黄色', color: '#fef08a', darkColor: '#854d0e40' },
    { label: '绿色', color: '#bbf7d0', darkColor: '#14532d40' },
    { label: '蓝色', color: '#bfdbfe', darkColor: '#1e3a5f40' },
    { label: '粉色', color: '#fbcfe8', darkColor: '#831843a0' },
    { label: '紫色', color: '#e9d5ff', darkColor: '#581c87a0' },
  ] as const;

  const applyHighlight = useCallback((color: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { 'background-color': color });
      }
    });
    setShowHighlightPicker(false);
  }, [editor]);

  const removeHighlight = useCallback(() => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { 'background-color': null });
      }
    });
    setShowHighlightPicker(false);
  }, [editor]);

  const formatText = (format: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatHeading = (headingSize: HeadingTagType) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        const element = anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();

        if ($isHeadingNode(element) && element.getTag() === headingSize) {
          // If already this heading, convert to paragraph
          const paragraph = $createParagraphNode();
          element.replace(paragraph, true);
        } else {
          // Convert to heading
          const heading = $createHeadingNode(headingSize);
          element.replace(heading, true);
        }
      }
    });
  };

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        const element = anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();

        if (!$isParagraphNode(element) && !$isListNode(element)) {
          const paragraph = $createParagraphNode();
          element.replace(paragraph, true);
        }
      }
    });
  };

  const formatQuote = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const anchorNode = selection.anchor.getNode();
        const element = anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow();

        if ($isQuoteNode(element)) {
          // If already a quote, convert to paragraph
          const paragraph = $createParagraphNode();
          element.replace(paragraph, true);
        } else if (!$isListNode(element)) {
          const quote = $createQuoteNode();
          element.replace(quote, true);
        }
      }
    });
  };

  const formatBulletList = () => {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  };

  const formatNumberedList = () => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
  };

  const formatCheckList = () => {
    editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
  };

  const formatAlignment = (alignment: ElementFormatType) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment);
  };

  const insertCodeBlock = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const anchorNode = selection.anchor.getNode();
      const element = anchorNode.getKey() === 'root'
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();
      element.replace($createCodeNode(codeLanguage), true);
    });
  };

  const insertTable = () => {
    editor.dispatchCommand(INSERT_TABLE_COMMAND, {
      rows: '3',
      columns: '3',
      includeHeaders: true,
    });
  };

  const undo = () => {
    editor.dispatchCommand(UNDO_COMMAND, undefined);
  };

  const redo = () => {
    editor.dispatchCommand(REDO_COMMAND, undefined);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input immediately
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    try {
      // Store image in IndexedDB with compression
      const imageId = await indexedDBService.storeImage(noteId, file);

      // Retrieve compressed blob
      const blob = await indexedDBService.getImage(imageId);
      if (!blob) {
        console.error('Failed to retrieve stored image');
        return;
      }

      // Create blob URL for rendering
      const blobUrl = URL.createObjectURL(blob);

      // Insert image node into editor
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const imageNode = $createImageNode({
            altText: file.name,
            src: blobUrl,
            imageId: imageId,
          });
          selection.insertNodes([imageNode]);
        }
      });

    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error(
        '上传图片失败',
        `${error instanceof Error ? error.message : '未知错误'}。请检查文件大小（最大 5MB）和存储配额。`
      );
    }
  };

  const btnClass = "shrink-0 rounded-md px-2 py-1.5 text-sm text-text-light-secondary transition-colors hover:bg-surface-light-elevated hover:text-text-light-primary dark:text-text-dark-secondary dark:hover:bg-surface-dark-elevated dark:hover:text-text-dark-primary";
  const dividerClass = "h-5 w-px bg-border-light dark:bg-border-dark";

  return (
    <div className="border-b border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark" role="toolbar" aria-label="笔记编辑工具栏">
      <div className="flex min-h-11 items-center gap-1 overflow-x-auto px-2">
        <button onClick={undo} className={btnClass} title="撤销 (Cmd+Z)"><Undo2 className="h-4 w-4" aria-hidden /></button>
        <button onClick={redo} className={btnClass} title="重做 (Cmd+Shift+Z)"><Redo2 className="h-4 w-4" aria-hidden /></button>
        <div className={dividerClass} />

        <button onClick={() => formatText('bold')} className={btnClass} title="加粗 (Cmd+B)">
          <span className="font-bold text-text-light-primary dark:text-text-dark-primary">B</span>
        </button>
        <button onClick={() => formatText('italic')} className={btnClass} title="斜体 (Cmd+I)">
          <span className="italic text-text-light-primary dark:text-text-dark-primary">I</span>
        </button>
        <button onClick={() => formatHeading('h2')} className={btnClass} title="二级标题">
          <span className="font-semibold">H2</span>
        </button>
        <button onClick={formatBulletList} className={btnClass} title="项目符号列表"><List className="h-4 w-4" aria-hidden /></button>
        <button onClick={formatCheckList} className={btnClass} title="任务清单"><SquareCheck className="h-4 w-4" aria-hidden /></button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />
        <button onClick={() => fileInputRef.current?.click()} className={btnClass} title="插入图片">图片</button>

        <button
          type="button"
          onClick={() => setShowMoreFormatting((value) => !value)}
          className={`${btnClass} ${showMoreFormatting ? 'bg-accent-primary/10 text-accent-primary' : ''}`}
          aria-expanded={showMoreFormatting}
        >
          更多
        </button>

        <div className="min-w-3 flex-1" />

        <button
          onClick={onToggleOutline}
          className={`${btnClass} ${outlineOpen ? 'bg-accent-primary/10 text-accent-primary' : ''}`}
          title="大纲"
          aria-pressed={outlineOpen}
        >
          <List size={16} />
        </button>

        <div className="flex items-center rounded-lg border border-border-light p-0.5 dark:border-border-dark">
          <button
            onClick={() => onViewModeChange('edit')}
            className={`rounded-md px-2 py-1 text-xs transition-colors ${viewMode === 'edit' ? 'bg-surface-light-elevated font-medium text-text-light-primary dark:bg-surface-dark-elevated dark:text-text-dark-primary' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}
            aria-pressed={viewMode === 'edit'}
          >
            编辑
          </button>
          <button
            onClick={() => onViewModeChange('preview')}
            className={`rounded-md px-2 py-1 text-xs transition-colors ${viewMode === 'preview' ? 'bg-surface-light-elevated font-medium text-text-light-primary dark:bg-surface-dark-elevated dark:text-text-dark-primary' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}
            aria-pressed={viewMode === 'preview'}
          >
            预览
          </button>
        </div>
        <span className="whitespace-nowrap px-1 text-[11px] text-text-light-tertiary dark:text-text-dark-tertiary">
          {wordCount} 词 · {charCount} 字
        </span>
      </div>

      {showMoreFormatting && (
        <div className="flex flex-wrap items-center gap-1 border-t border-border-light/70 px-2 py-2 dark:border-border-dark/70">
          <button onClick={() => formatText('underline')} className={btnClass} title="下划线"><span className="underline">U</span></button>
          <button onClick={() => formatText('strikethrough')} className={btnClass} title="删除线"><span className="line-through">S</span></button>
          <button onClick={() => formatText('code')} className={btnClass} title="行内代码">&lt;/&gt;</button>

          <div className="flex items-center rounded-lg border border-border-light dark:border-border-dark">
            <button onClick={insertCodeBlock} className={btnClass} title="插入代码块">{'{ }'}</button>
            <label htmlFor="code-block-language" className="sr-only">代码块语言</label>
            <select
              id="code-block-language"
              value={codeLanguage}
              onChange={(event) => setCodeLanguage(event.target.value)}
              className="mr-1 max-w-24 bg-transparent py-1 text-xs text-text-light-secondary outline-none dark:text-text-dark-secondary"
            >
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="python">Python</option>
              <option value="bash">Bash</option>
              <option value="json">JSON</option>
              <option value="css">CSS</option>
              <option value="markdown">Markdown</option>
              <option value="">纯文本</option>
            </select>
          </div>

          <div className="relative">
            <button onClick={() => setShowHighlightPicker(!showHighlightPicker)} className={btnClass} title="高亮">高亮</button>
            {showHighlightPicker && (
              <div className="absolute left-0 top-full z-50 mt-1 flex gap-1 rounded-lg border border-border-light bg-surface-light p-2 shadow-lg dark:border-border-dark dark:bg-surface-dark-elevated">
                {HIGHLIGHT_COLORS.map((hc) => (
                  <button
                    key={hc.label}
                    onClick={() => applyHighlight(hc.color)}
                    className="h-6 w-6 rounded border border-border-light transition-transform hover:scale-110 dark:border-border-dark"
                    style={{ backgroundColor: hc.color }}
                    title={hc.label}
                  />
                ))}
                <button onClick={removeHighlight} className="h-6 w-6 rounded border border-border-light text-xs dark:border-border-dark" title="移除高亮"><X className="h-3.5 w-3.5" aria-hidden /></button>
              </div>
            )}
          </div>

          <div className={dividerClass} />
          <button onClick={() => formatHeading('h1')} className={btnClass}>H1</button>
          <button onClick={() => formatHeading('h2')} className={btnClass}>H2</button>
          <button onClick={() => formatHeading('h3')} className={btnClass}>H3</button>
          <button onClick={formatParagraph} className={btnClass}>正文</button>

          <div className={dividerClass} />
          <button onClick={formatNumberedList} className={btnClass} title="编号列表">1.</button>
          <button onClick={formatQuote} className={btnClass} title="引用">引用</button>
          <button onClick={insertTable} className={btnClass} title="插入表格">表格</button>

          <div className={dividerClass} />
          <button onClick={() => formatAlignment('left')} className={btnClass}>左对齐</button>
          <button onClick={() => formatAlignment('center')} className={btnClass}>居中</button>
          <button onClick={() => formatAlignment('right')} className={btnClass}>右对齐</button>
          <button onClick={() => formatAlignment('justify')} className={btnClass}>两端</button>
        </div>
      )}
    </div>
  );
};

/**
 * Read-Only Mode Plugin
 * Controls whether the editor is in read-only mode
 */
const ReadOnlyPlugin: React.FC<{ isReadOnly: boolean }> = ({ isReadOnly }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.setEditable(!isReadOnly);
  }, [editor, isReadOnly]);

  return null;
};

/**
 * Auto-save Plugin
 * Debounces editor changes and saves to store
 */
const AutoSavePlugin: React.FC<{ noteId: string }> = ({ noteId }) => {
  const [isSaving, setIsSaving] = useState(false);
  const updateNote = useNotesStore((state) => state.updateNote);
  const announce = useAnnounce();

  const initialNote = useNotesStore.getState().notes[noteId];
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastContentRef = useRef<string>(initialNote?.content ?? '');
  const lastTextRef = useRef<string>(initialNote?.contentText ?? '');
  const pendingSaveRef = useRef<{ content: string; contentText: string } | null>(null);
  const lastVersionSaveRef = useRef<number>(0);

  const flushPendingSave = useCallback((withFeedback: boolean) => {
    const pending = pendingSaveRef.current;
    if (!pending) return;
    pendingSaveRef.current = null;

    if (withFeedback) setIsSaving(true);
    try {
      updateNote(noteId, pending);
      lastContentRef.current = pending.content;
      lastTextRef.current = pending.contentText;

      if (withFeedback) announce('笔记已保存到本地存储队列');

      const now = Date.now();
      const versionStore = useNoteVersionStore.getState();
      if (
        now - lastVersionSaveRef.current >= NOTE_CONSTANTS.VERSION_SAVE_INTERVAL_MS &&
        versionStore.shouldSaveVersion(noteId, pending.contentText)
      ) {
        const note = useNotesStore.getState().notes[noteId];
        if (note) {
          versionStore.saveVersion({
            noteId,
            title: note.title,
            content: pending.content,
            contentText: pending.contentText,
          });
          lastVersionSaveRef.current = now;
        }
      }

      if (withFeedback) window.setTimeout(() => setIsSaving(false), 300);
    } catch (error) {
      console.error('Failed to queue note save:', error);
      if (withFeedback) setIsSaving(false);
    }
  }, [announce, noteId, updateNote]);

  const handleChange = useCallback((editorState: EditorState) => {
    editorState.read(() => {
      const root = $getRoot();
      const contentText = root.getTextContent();
      const contentJson = JSON.stringify(editorState.toJSON());

      // Skip save if content hasn't actually changed
      if (contentJson === lastContentRef.current && contentText === lastTextRef.current) {
        return;
      }

      // Clear previous timeout to implement proper debouncing
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }

      pendingSaveRef.current = { content: contentJson, contentText };
      timeoutIdRef.current = setTimeout(() => {
        timeoutIdRef.current = null;
        flushPendingSave(true);
      }, NOTE_CONSTANTS.AUTOSAVE_DEBOUNCE_MS);
    });
  }, [flushPendingSave]);

  // Flush the last keystrokes when switching notes, navigating away or when
  // the browser backgrounds the page. Clearing the timer alone lost up to two
  // seconds of edits.
  useEffect(() => {
    const handlePageHide = () => flushPendingSave(false);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
      flushPendingSave(false);
    };
  }, [flushPendingSave]);

  return (
    <>
      <OnChangePlugin onChange={handleChange} />
      {isSaving && (
        <div className="absolute top-2 right-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
          保存中…
        </div>
      )}
    </>
  );
};

/** Keep version restores and other explicit store updates visible in-place. */
const ExternalContentSyncPlugin: React.FC<{
  content: string;
  contentText: string;
}> = ({ content, contentText }) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const normalized = ensureLexicalContent(content, contentText);
    const current = JSON.stringify(editor.getEditorState().toJSON());
    if (normalized === current) return;

    try {
      editor.setEditorState(editor.parseEditorState(normalized));
    } catch (error) {
      console.error('Failed to apply external note content:', error);
    }
  }, [content, contentText, editor]);

  return null;
};

/**
 * Lexical Editor Configuration
 */
const getEditorConfig = (initialContent?: string) => ({
  namespace: 'NotesEditor',
  editorState: initialContent || null,
  theme: {
    root: 'editor-root',
    paragraph: 'editor-paragraph leading-relaxed', // 1.625 line-height for readability
    text: {
      bold: 'font-bold',
      italic: 'italic',
      underline: 'underline',
      strikethrough: 'line-through',
      code: 'font-mono bg-surface-light-elevated dark:bg-surface-dark-elevated px-1.5 py-0.5 rounded text-sm',
    },
    heading: {
      h1: 'text-4xl font-bold mt-8 mb-4 leading-tight tracking-tight',
      h2: 'text-3xl font-bold mt-6 mb-3 leading-snug',
      h3: 'text-2xl font-semibold mt-5 mb-2 leading-normal',
    },
    list: {
      ul: 'list-disc list-inside my-4 space-y-1.5',
      ol: 'list-decimal list-inside my-4 space-y-1.5',
      listitem: 'my-1 leading-relaxed',
      checklist: 'editor-checklist my-4 space-y-1.5 list-none pl-0',
      listitemChecked: 'editor-checklist-item editor-checklist-item--checked line-through opacity-60',
      listitemUnchecked: 'editor-checklist-item editor-checklist-item--unchecked',
    },
    quote: 'border-l-4 border-accent-primary bg-surface-light-elevated dark:bg-surface-dark-elevated pl-4 py-3 italic my-4 rounded-r',
    code: 'bg-surface-dark dark:bg-surface-dark-elevated text-text-dark-primary p-4 rounded-lg font-mono text-sm my-4 overflow-x-auto shadow-sm',
    codeHighlight: {
      atrule: 'text-purple-400',
      attr: 'text-yellow-300',
      boolean: 'text-orange-400',
      builtin: 'text-cyan-400',
      cdata: 'text-gray-500',
      char: 'text-green-400',
      class: 'text-yellow-300',
      'class-name': 'text-yellow-300',
      comment: 'text-gray-500 italic',
      constant: 'text-orange-400',
      deleted: 'text-red-400',
      doctype: 'text-gray-500',
      entity: 'text-red-400',
      function: 'text-blue-400',
      important: 'text-orange-400 font-bold',
      inserted: 'text-green-400',
      keyword: 'text-purple-400',
      namespace: 'text-red-400',
      number: 'text-orange-400',
      operator: 'text-cyan-400',
      prolog: 'text-gray-500',
      property: 'text-cyan-400',
      punctuation: 'text-gray-400',
      regex: 'text-yellow-300',
      selector: 'text-green-400',
      string: 'text-green-400',
      symbol: 'text-orange-400',
      tag: 'text-red-400',
      url: 'text-cyan-400',
      variable: 'text-red-400',
    },
    link: 'text-accent-primary hover:underline transition-colors',
  },
  nodes: [
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
    ImageNode,
    TaskEmbedNode,
    EventEmbedNode,
    SpreadsheetEmbedNode,
    WikiLinkNode,
    HashtagNode,
    HorizontalRuleNode,
    CalloutNode,
    ToggleNode,
    TableOfContentsNode,
    MathBlockNode,
    MermaidBlockNode,
    VideoEmbedNode,
  ],
  onError: (error: Error) => {
    console.error('Lexical error:', error);
  },
});

/**
 * Notes Editor Props
 */
interface NotesEditorProps {
  noteId: string;
  blockId?: string; // Optional block ID to scroll to (from URL hash)
}

/**
 * Tags Input Component
 * Simple tag management with pills
 */
const TagsInput: React.FC<{ noteId: string; tags: string[] }> = ({ noteId, tags }) => {
  const addTag = useNotesStore((state) => state.addTag);
  const removeTag = useNotesStore((state) => state.removeTag);

  const handleAddTag = (tag: string) => {
    addTag(noteId, tag);
  };

  const handleRemoveTag = (tag: string) => {
    removeTag(noteId, tag);
  };

  return (
    <div className="mt-3">
      <TagPicker
        selectedTags={tags}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        maxTags={NOTE_CONSTANTS.MAX_TAGS}
      />
    </div>
  );
};

/**
 * Custom Fields Section Component
 * Renders custom fields defined in settings for notes
 */
const NoteCustomFields: React.FC<{ noteId: string; note: ReturnType<typeof useNotesStore.getState>['notes'][number] }> = ({ noteId, note }) => {
  const { customFieldDefinitions } = useSettingsStore();
  const noteFields = customFieldDefinitions.notes;

  if (noteFields.length === 0) return null;

  return (
    <div className="mt-4 space-y-3">
      <div className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
        自定义字段
      </div>
      {noteFields.map((field) => {
        const currentValue = note.customFields?.[field.id];

        return (
          <div key={field.id}>
            <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
              {field.name}
              {field.required && (
                <span className="text-status-error-text dark:text-status-error-text-dark ml-1">*</span>
              )}
            </label>
            {field.description && (
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1">
                {field.description}
              </p>
            )}
            <CustomFieldEditor
              field={field}
              value={currentValue}
              onChange={(value) => {
                const updatedCustomFields = {
                  ...note.customFields,
                  [field.id]: value,
                };
                useNotesStore.getState().updateNote(noteId, { customFields: updatedCustomFields });
              }}
            />
          </div>
        );
      })}
    </div>
  );
};

/**
 * Notes Editor Component
 */
export const NotesEditor: React.FC<NotesEditorProps> = ({ noteId, blockId }) => {
  const note = useNotesStore((state) => state.getNote(noteId));
  const notes = useNotesStore((state) => state.notes);
  const notesArray = useMemo(
    () => Object.values(notes).filter((item) => !item.deletedAt),
    [notes]
  );
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [outlineHeadings, setOutlineHeadings] = useState<OutlineHeading[]>([]);

  // Keyboard shortcut for toggling view mode (Cmd+E)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setViewMode((prev) => (prev === 'edit' ? 'preview' : 'edit'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Memoize editor config to prevent Lexical re-initialization
  // Only recreate when noteId changes, not when content changes
  const editorConfig = useMemo(
    () => getEditorConfig(ensureLexicalContent(note?.content, note?.contentText)),
    [noteId] // Key on noteId only, not note.content
  );

  const handleWordCountUpdate = useCallback((words: number, chars: number) => {
    setWordCount(words);
    setCharCount(chars);
  }, []);

  const handleOutlineHeadingsChange = useCallback((headings: OutlineHeading[]) => {
    setOutlineHeadings(headings);
  }, []);

  const handleToggleOutline = useCallback(() => {
    setOutlineOpen((prev) => !prev);
  }, []);

  if (!note) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center text-text-light-secondary dark:text-text-dark-secondary">
        未找到笔记
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex-1 flex flex-col min-h-0 bg-surface-light dark:bg-surface-dark"
    >
      {/* Note Title & Tags */}
      <div className="flex-shrink-0 border-b border-border-light px-5 py-3 dark:border-border-dark">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={note.title}
            onChange={(e) =>
              useNotesStore.getState().updateNote(noteId, { title: e.target.value })
            }
            placeholder="无标题笔记"
            className="min-w-0 flex-1 border-none bg-transparent text-2xl font-semibold text-text-light-primary outline-none placeholder-text-light-secondary dark:text-text-dark-primary dark:placeholder-text-dark-secondary"
          />
          <button
            type="button"
            onClick={() => setDetailsOpen((value) => !value)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              detailsOpen
                ? 'bg-accent-primary/10 text-accent-primary'
                : 'text-text-light-secondary hover:bg-surface-light-elevated dark:text-text-dark-secondary dark:hover:bg-surface-dark-elevated'
            }`}
            aria-expanded={detailsOpen}
          >
            <Settings2 className="h-4 w-4" /> 详情
          </button>
        </div>
        {detailsOpen && (
          <div className="mt-3 rounded-xl bg-surface-light-elevated p-3 dark:bg-surface-dark-elevated">
            <TagsInput noteId={noteId} tags={note.tags} />
            <NoteAliasEditor noteId={noteId} aliases={note.aliases ?? []} />
            <NoteCustomFields noteId={noteId} note={note} />
          </div>
        )}
      </div>

      {/* Lexical Editor */}
      <LexicalComposer key={noteId} initialConfig={editorConfig}>
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex-shrink-0">
            <EditorToolbar
              wordCount={wordCount}
              charCount={charCount}
              noteId={noteId}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              outlineOpen={outlineOpen}
              onToggleOutline={handleToggleOutline}
            />
          </div>

          {/* Editor Content + Outline Panel */}
          <div className="flex-1 flex min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className={`relative mx-auto min-h-full w-full max-w-[860px] rounded-xl border bg-surface-light px-7 py-6 dark:bg-surface-dark ${
              viewMode === 'preview'
                ? 'border-accent-primary/30'
                : 'border-border-light dark:border-border-dark'
            }`}>
              {/* Preview mode indicator */}
              {viewMode === 'preview' && (
                <div className="absolute top-2 right-2 px-2 py-0.5 text-xs bg-accent-primary/10 text-accent-primary rounded">
                  预览模式
                </div>
              )}
              <RichTextPlugin
                contentEditable={
                  <ContentEditable
                    className={`editor-content outline-none w-full h-full text-text-light-primary dark:text-text-dark-primary text-base ${
                      viewMode === 'preview' ? 'cursor-default select-text' : ''
                    }`}
                  />
                }
                placeholder={
                  viewMode === 'edit' ? (
                    <div className="editor-placeholder absolute top-6 left-6 text-text-light-secondary dark:text-text-dark-secondary pointer-events-none opacity-60">
                      开始书写…
                    </div>
                  ) : null
                }
                ErrorBoundary={LexicalErrorBoundary}
              />
            <ReadOnlyPlugin isReadOnly={viewMode === 'preview'} />
            <HistoryPlugin />
            <ListPlugin />
            <CheckListPlugin />
            <TablePlugin />
            <CodeHighlightPlugin />
            <HorizontalRulePlugin />
            <MarkdownShortcutPlugin transformers={[...TRANSFORMERS, CHECK_LIST]} />
            <AutoLinkPlugin matchers={MATCHERS} />
            <KeyboardShortcutsPlugin />
            <WordCountPlugin onUpdate={handleWordCountUpdate} />
            {viewMode === 'edit' && <SlashCommandPlugin />}
            {viewMode === 'edit' && <ImageUploadPlugin noteId={noteId} />}
            {viewMode === 'edit' && <EmbedPlugin />}
            <TableOfContentsPlugin />
            <OutlinePanelPlugin onHeadingsChange={handleOutlineHeadingsChange} />
            {viewMode === 'edit' && <FileAttachmentPlugin noteId={noteId} />}
            <AutoSavePlugin noteId={noteId} />
            <ExternalContentSyncPlugin content={note.content} contentText={note.contentText} />
            <WikiLinkAutocompletePlugin notes={notesArray} currentFolderId={note.folderId} />
            <WikiLinkTransformPlugin notes={notes} />
            <HoverPreviewPlugin notes={notes} />
            <BlockReferencePlugin targetBlockId={blockId} />
            {viewMode === 'edit' && (
              <HashtagPlugin
                onHashtagsChange={(tags) => {
                  useNotesStore.getState().updateNote(noteId, { tags });
                }}
              />
            )}
            </div>
          </div>

          {/* Outline Panel */}
          <NoteOutlinePanel headings={outlineHeadings} isOpen={outlineOpen} />
          </div>
        </div>
      </LexicalComposer>

      {/* Attachments Panel */}
      <div className="flex-shrink-0">
        <NoteAttachmentsList noteId={noteId} />
      </div>

      {/* Backlinks Panel */}
      <div className="flex-shrink-0">
        <BacklinksPanel noteId={noteId} />
      </div>

      {/* Linked Calendar Events Panel */}
      <div className="flex-shrink-0">
        <LinkedEventsPanel noteId={noteId} />
      </div>

      {/* Version History Panel */}
      <div className="flex-shrink-0">
        <VersionHistoryPanel noteId={noteId} />
      </div>
    </motion.div>
  );
};

/**
 * Empty State - No Note Selected
 */
interface NotesEditorEmptyProps {
  hasNotes: boolean;
  onCreate: () => void;
  onCreateFromTemplate: () => void;
}

export const NotesEditorEmpty: React.FC<NotesEditorEmptyProps> = ({ hasNotes, onCreate, onCreateFromTemplate }) => {
  return (
    <div className="flex-1 min-h-0 flex items-center justify-center bg-surface-light-elevated dark:bg-surface-dark">
      <div className="text-center max-w-md px-8 animate-fade-in">
        <div className="flex justify-center mb-6">
          <div className="p-8 bg-gradient-to-br from-accent-primary/10 to-accent-secondary/10 rounded-3xl">
            <FileText className="h-12 w-12 text-accent-primary" aria-hidden />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary mb-4 tracking-tight">
          {hasNotes ? '选择一篇笔记' : '开始沉淀第一篇笔记'}
        </h2>
        <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4 leading-relaxed">
          {hasNotes
            ? '从左侧选择内容继续编辑，或创建一篇新笔记。'
            : '记录想法、过程和结论，内容会保存在本地设备上。'}
        </p>
        <div className="mb-5 flex flex-wrap justify-center gap-2">
          <button onClick={onCreate} className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            新建空白笔记
          </button>
          <button onClick={onCreateFromTemplate} className="rounded-lg border border-border-light px-4 py-2 text-sm font-medium text-text-light-primary hover:border-accent-primary dark:border-border-dark dark:text-text-dark-primary">
            从模板创建
          </button>
        </div>
        <div className="space-y-2 text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
          <p className="flex items-center justify-center gap-2">
            <kbd className="px-2 py-1 bg-surface-light dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded font-mono text-xs">Ctrl/Cmd+N</kbd>
            新建笔记
          </p>
          <p className="flex items-center justify-center gap-2">
            <kbd className="px-2 py-1 bg-surface-light dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded font-mono text-xs">Ctrl/Cmd+K</kbd>
            搜索笔记
          </p>
        </div>
      </div>
    </div>
  );
};
