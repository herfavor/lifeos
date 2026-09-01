/**
 * CalloutNode - Custom Lexical DecoratorNode for Callout/Admonition Blocks
 *
 * Types: info (blue), warning (yellow), tip (green), danger (red)
 * Renders as a styled container with icon + colored border/background
 */

import React, { useState, useCallback } from 'react';
import { AlertTriangle, Info, Lightbulb, Siren, X, type LucideIcon } from 'lucide-react';
import { DecoratorNode } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type {
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
  EditorConfig,
} from 'lexical';

export type CalloutType = 'info' | 'warning' | 'tip' | 'danger';

export interface CalloutPayload {
  calloutType: CalloutType;
  title?: string;
  content?: string;
  key?: NodeKey;
}

export type SerializedCalloutNode = Spread<
  {
    calloutType: CalloutType;
    title: string;
    content: string;
  },
  SerializedLexicalNode
>;

const CALLOUT_CONFIG: Record<
  CalloutType,
  { icon: LucideIcon; label: string; borderColor: string; bgColor: string; textColor: string }
> = {
  info: {
    icon: Info,
    label: '信息',
    borderColor: 'border-status-info-border dark:border-status-info-border-dark',
    bgColor: 'bg-status-info-bg dark:bg-status-info-bg-dark',
    textColor: 'text-status-info-text dark:text-status-info-text-dark',
  },
  warning: {
    icon: AlertTriangle,
    label: '警告',
    borderColor: 'border-status-warning-border dark:border-status-warning-border-dark',
    bgColor: 'bg-status-warning-bg dark:bg-status-warning-bg-dark',
    textColor: 'text-status-warning-text dark:text-status-warning-text-dark',
  },
  tip: {
    icon: Lightbulb,
    label: 'Tip',
    borderColor: 'border-status-success-border dark:border-status-success-border-dark',
    bgColor: 'bg-status-success-bg dark:bg-status-success-bg-dark',
    textColor: 'text-status-success-text dark:text-status-success-text-dark',
  },
  danger: {
    icon: Siren,
    label: '危险',
    borderColor: 'border-status-error-border dark:border-status-error-border-dark',
    bgColor: 'bg-status-error-bg dark:bg-status-error-bg-dark',
    textColor: 'text-status-error-text dark:text-status-error-text-dark',
  },
};

/**
 * CalloutComponent - React component rendered by the DecoratorNode
 */
function CalloutComponent({
  nodeKey,
  calloutType,
  title,
  content,
}: {
  nodeKey: NodeKey;
  calloutType: CalloutType;
  title: string;
  content: string;
}) {
  const [editor] = useLexicalComposerContext();
  const [editableTitle, setEditableTitle] = useState(title);
  const [editableContent, setEditableContent] = useState(content);
  const config = CALLOUT_CONFIG[calloutType];

  const updateNode = useCallback(
    (newTitle: string, newContent: string) => {
      editor.update(() => {
        const node = editor.getEditorState()._nodeMap.get(nodeKey);
        if (node && $isCalloutNode(node)) {
          const writable = node.getWritable();
          writable.__title = newTitle;
          writable.__content = newContent;
        }
      });
    },
    [editor, nodeKey]
  );

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setEditableTitle(newTitle);
      updateNode(newTitle, editableContent);
    },
    [updateNode, editableContent]
  );

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setEditableContent(newContent);
      updateNode(editableTitle, newContent);
    },
    [updateNode, editableTitle]
  );

  const handleDelete = useCallback(() => {
    editor.update(() => {
      const node = editor.getEditorState()._nodeMap.get(nodeKey);
      if (node) {
        node.remove();
      }
    });
  }, [editor, nodeKey]);

  return (
    <div
      className={`my-4 border-l-4 rounded-r-lg p-4 ${config.borderColor} ${config.bgColor} group relative`}
    >
      {/* Delete button */}
      <button
        onClick={handleDelete}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100 transition-opacity p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-xs"
        title="Remove callout"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Title row */}
      <div className={`flex items-center gap-2 mb-2 ${config.textColor} font-semibold`}>
        <config.icon className="w-4 h-4 shrink-0" />
        <input
          type="text"
          value={editableTitle}
          onChange={handleTitleChange}
          placeholder={config.label}
          className={`bg-transparent border-none outline-none font-semibold flex-1 ${config.textColor} placeholder:opacity-50`}
        />
      </div>

      {/* Content */}
      <textarea
        value={editableContent}
        onChange={handleContentChange}
        placeholder="Type callout content here..."
        className={`w-full bg-transparent border-none outline-none resize-none text-sm leading-relaxed text-text-light-primary dark:text-text-dark-primary placeholder:opacity-40 min-h-[2rem]`}
        rows={Math.max(1, editableContent.split('\n').length)}
      />
    </div>
  );
}

export class CalloutNode extends DecoratorNode<React.ReactElement> {
  __calloutType: CalloutType;
  __title: string;
  __content: string;

  static getType(): string {
    return 'callout';
  }

  static clone(node: CalloutNode): CalloutNode {
    return new CalloutNode(node.__calloutType, node.__title, node.__content, node.__key);
  }

  static importJSON(serializedNode: SerializedCalloutNode): CalloutNode {
    return $createCalloutNode({
      calloutType: serializedNode.calloutType,
      title: serializedNode.title,
      content: serializedNode.content,
    });
  }

  exportJSON(): SerializedCalloutNode {
    return {
      type: 'callout',
      version: 1,
      calloutType: this.__calloutType,
      title: this.__title,
      content: this.__content,
    };
  }

  constructor(calloutType: CalloutType, title: string, content: string, key?: NodeKey) {
    super(key);
    this.__calloutType = calloutType;
    this.__title = title;
    this.__content = content;
  }

  createDOM(_config: EditorConfig): HTMLElement {
    const div = document.createElement('div');
    div.className = 'callout-node';
    return div;
  }

  updateDOM(): boolean {
    return false;
  }

  decorate(): React.ReactElement {
    return (
      <CalloutComponent
        nodeKey={this.__key}
        calloutType={this.__calloutType}
        title={this.__title}
        content={this.__content}
      />
    );
  }

  getTextContent(): string {
    return `${this.__title}\n${this.__content}`;
  }

  isInline(): boolean {
    return false;
  }
}

export function $createCalloutNode(payload: CalloutPayload): CalloutNode {
  return new CalloutNode(
    payload.calloutType,
    payload.title ?? '',
    payload.content ?? '',
    payload.key
  );
}

export function $isCalloutNode(node: LexicalNode | null | undefined): node is CalloutNode {
  return node instanceof CalloutNode;
}
