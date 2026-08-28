/**
 * DocumentToolbar Component
 *
 * Toolbar for the TipTap document editor with formatting controls.
 * Organized into logical groups: text formatting, paragraphs, lists, inserts.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Code,
  Image,
  Link,
  Table,
  Minus,
  Undo,
  Redo,
  Palette,
  Download,
} from 'lucide-react';
import { exportDocument, EXPORT_FORMATS, type ExportFormat } from './documentExport';

interface DocumentToolbarProps {
  editor: Editor;
  documentTitle: string;
  onAddImage: () => void;
  onSetLink: () => void;
  onInsertTable: () => void;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  title: string;
  ariaExpanded?: boolean;
  ariaHasPopup?: 'menu';
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  title,
  ariaExpanded,
  ariaHasPopup,
  children,
}: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`p-1.5 rounded transition-colors ${
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : isActive
          ? 'bg-accent-primary/10 text-accent-primary'
          : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-alt dark:hover:bg-surface-dark hover:text-text-light-primary dark:hover:text-text-dark-primary'
      }`}
      aria-pressed={isActive}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHasPopup}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return (
    <div className="w-px h-6 bg-border-light dark:bg-border-dark mx-1" />
  );
}

// Color presets for text color
const TEXT_COLORS = [
  { name: '默认', value: null },
  { name: '灰色', value: '#6B7280' },
  { name: '红色', value: '#EF4444' },
  { name: '橙色', value: '#F97316' },
  { name: '黄色', value: '#EAB308' },
  { name: '绿色', value: '#22C55E' },
  { name: '蓝色', value: '#3B82F6' },
  { name: '紫色', value: '#8B5CF6' },
  { name: '粉色', value: '#EC4899' },
];

// Highlight colors
const HIGHLIGHT_COLORS = [
  { name: '黄色', value: '#FEF08A' },
  { name: '绿色', value: '#BBF7D0' },
  { name: '蓝色', value: '#BFDBFE' },
  { name: '紫色', value: '#DDD6FE' },
  { name: '粉色', value: '#FBCFE8' },
];

type ToolbarMenu = 'text-color' | 'highlight' | 'export';

export function DocumentToolbar({
  editor,
  documentTitle,
  onAddImage,
  onSetLink,
  onInsertTable,
}: DocumentToolbarProps) {
  const [openMenu, setOpenMenu] = useState<ToolbarMenu | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null);
    };

    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [openMenu]);

  const toggleMenu = useCallback((menu: ToolbarMenu) => {
    setOpenMenu((currentMenu) => (currentMenu === menu ? null : menu));
  }, []);

  // Handle document export
  const handleExport = useCallback(
    (format: ExportFormat) => {
      exportDocument(editor, documentTitle, format);
      setOpenMenu(null);
    },
    [editor, documentTitle]
  );

  // Set text color
  const setColor = useCallback(
    (color: string | null) => {
      if (color === null) {
        editor.chain().focus().unsetColor().run();
      } else {
        editor.chain().focus().setColor(color).run();
      }
      setOpenMenu(null);
    },
    [editor]
  );

  // Set highlight color
  const setHighlight = useCallback(
    (color: string) => {
      editor.chain().focus().toggleHighlight({ color }).run();
      setOpenMenu(null);
    },
    [editor]
  );

  return (
    <div
      ref={toolbarRef}
      className="flex flex-wrap items-center gap-0.5 p-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-t-lg mb-[-1px] overflow-visible"
    >
      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="撤销 (Ctrl+Z)"
      >
        <Undo className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="重做 (Ctrl+Y)"
      >
        <Redo className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Text Formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive('bold')}
        title="加粗 (Ctrl+B)"
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive('italic')}
        title="斜体 (Ctrl+I)"
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive('underline')}
        title="下划线 (Ctrl+U)"
      >
        <Underline className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive('strike')}
        title="删除线"
      >
        <Strikethrough className="w-4 h-4" />
      </ToolbarButton>

      {/* Text Color Dropdown */}
      <div className="relative">
        <ToolbarButton
          onClick={() => toggleMenu('text-color')}
          title="文字颜色"
          ariaExpanded={openMenu === 'text-color'}
          ariaHasPopup="menu"
        >
          <Palette className="w-4 h-4" />
        </ToolbarButton>
        {openMenu === 'text-color' && (
        <div
          className="absolute top-full left-0 mt-1 p-2 bg-surface-light dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg shadow-lg z-50"
          role="menu"
          aria-label="文字颜色"
        >
          <div className="flex gap-1">
            {TEXT_COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => setColor(color.value)}
                className="w-5 h-5 rounded border border-border-light dark:border-border-dark hover:scale-110 transition-transform"
                style={{ backgroundColor: color.value || 'transparent' }}
                title={color.name}
                aria-label={color.name}
                role="menuitem"
              >
                {color.value === null && (
                  <span className="text-xs">×</span>
                )}
              </button>
            ))}
          </div>
        </div>
        )}
      </div>

      {/* Highlight Dropdown */}
      <div className="relative">
        <ToolbarButton
          onClick={() => toggleMenu('highlight')}
          isActive={editor.isActive('highlight')}
          title="高亮"
          ariaExpanded={openMenu === 'highlight'}
          ariaHasPopup="menu"
        >
          <Highlighter className="w-4 h-4" />
        </ToolbarButton>
        {openMenu === 'highlight' && (
        <div
          className="absolute top-full left-0 mt-1 p-2 bg-surface-light dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg shadow-lg z-50"
          role="menu"
          aria-label="高亮颜色"
        >
          <div className="flex gap-1">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.name}
                onClick={() => setHighlight(color.value)}
                className="w-5 h-5 rounded border border-border-light dark:border-border-dark hover:scale-110 transition-transform"
                style={{ backgroundColor: color.value }}
                title={color.name}
                aria-label={color.name}
                role="menuitem"
              />
            ))}
          </div>
        </div>
        )}
      </div>

      <ToolbarDivider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive('heading', { level: 1 })}
        title="标题 1"
      >
        <Heading1 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive('heading', { level: 2 })}
        title="标题 2"
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive('heading', { level: 3 })}
        title="标题 3"
      >
        <Heading3 className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        isActive={editor.isActive({ textAlign: 'left' })}
        title="左对齐"
      >
        <AlignLeft className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        isActive={editor.isActive({ textAlign: 'center' })}
        title="居中对齐"
      >
        <AlignCenter className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        isActive={editor.isActive({ textAlign: 'right' })}
        title="右对齐"
      >
        <AlignRight className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
        isActive={editor.isActive({ textAlign: 'justify' })}
        title="两端对齐"
      >
        <AlignJustify className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive('bulletList')}
        title="无序列表"
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive('orderedList')}
        title="有序列表"
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        isActive={editor.isActive('taskList')}
        title="任务列表"
      >
        <CheckSquare className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Block Elements */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive('blockquote')}
        title="引用"
      >
        <Quote className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        isActive={editor.isActive('codeBlock')}
        title="代码块"
      >
        <Code className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="分割线"
      >
        <Minus className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Inserts */}
      <ToolbarButton onClick={onSetLink} isActive={editor.isActive('link')} title="链接">
        <Link className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={onAddImage} title="图片">
        <Image className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton onClick={onInsertTable} title="表格">
        <Table className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarDivider />

      {/* Export Dropdown */}
      <div className="relative">
        <ToolbarButton
          onClick={() => toggleMenu('export')}
          title="导出文档"
          ariaExpanded={openMenu === 'export'}
          ariaHasPopup="menu"
        >
          <Download className="w-4 h-4" />
        </ToolbarButton>
        {openMenu === 'export' && (
        <div
          className="absolute top-full right-0 mt-1 py-1 bg-surface-light dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg shadow-lg z-50 min-w-[150px]"
          role="menu"
          aria-label="导出文档"
        >
          {EXPORT_FORMATS.map((format) => (
            <button
              key={format.id}
              onClick={() => handleExport(format.id)}
              className="w-full px-3 py-1.5 text-left text-sm text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light-alt dark:hover:bg-surface-dark transition-colors flex items-center gap-2"
              role="menuitem"
            >
              <span className="flex-1">{format.label}</span>
              <span className="text-text-light-tertiary dark:text-text-dark-tertiary text-xs">
                {format.extension}
              </span>
            </button>
          ))}
        </div>
        )}
      </div>
    </div>
  );
}

export default DocumentToolbar;
