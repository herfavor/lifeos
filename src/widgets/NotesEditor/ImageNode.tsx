/**
 * Custom Image Node for Lexical Editor
 * Supports image upload, resize, alt text, and delete
 */

import React, { useState, useCallback, useEffect } from 'react';
import { $getNodeByKey, DecoratorNode } from 'lexical';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { Pencil, Trash2 } from 'lucide-react';
import { indexedDBService } from '../../services/indexedDB';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type {
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
  EditorConfig,
} from 'lexical';

export interface ImagePayload {
  altText: string;
  height?: number;
  maxWidth?: number;
  src: string;
  width?: number;
  imageId?: string;
  key?: NodeKey;
}

export type SerializedImageNode = Spread<
  {
    altText: string;
    height?: number;
    maxWidth: number;
    src: string;
    width?: number;
    imageId?: string;
  },
  SerializedLexicalNode
>;

export class ImageNode extends DecoratorNode<React.ReactElement> {
  __src: string;
  __altText: string;
  __width: 'inherit' | number;
  __height: 'inherit' | number;
  __maxWidth: number;
  __imageId: string;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(
      node.__src,
      node.__altText,
      node.__maxWidth,
      node.__width,
      node.__height,
      node.__imageId,
      node.__key
    );
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    const { altText, height, width, maxWidth, src, imageId } = serializedNode;
    const node = $createImageNode({
      altText,
      height,
      maxWidth,
      src,
      width,
      imageId,
    });
    return node;
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.getAltText(),
      height: this.__height === 'inherit' ? 0 : this.__height,
      maxWidth: this.__maxWidth,
      src: this.getSrc(),
      type: 'image',
      version: 1,
      width: this.__width === 'inherit' ? 0 : this.__width,
      imageId: this.__imageId,
    };
  }

  constructor(
    src: string,
    altText: string,
    maxWidth: number,
    width?: 'inherit' | number,
    height?: 'inherit' | number,
    imageId?: string,
    key?: NodeKey
  ) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__maxWidth = maxWidth;
    this.__width = width || 'inherit';
    this.__height = height || 'inherit';
    this.__imageId = imageId || '';
  }

  createDOM(config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    const theme = config.theme;
    const className = theme.image;
    if (className !== undefined) {
      span.className = className;
    }
    return span;
  }

  updateDOM(): false {
    return false;
  }

  getSrc(): string {
    return this.__src;
  }

  getAltText(): string {
    return this.__altText;
  }

  setAltText(altText: string): void {
    const writable = this.getWritable();
    writable.__altText = altText;
  }

  setWidth(width: number): void {
    const writable = this.getWritable();
    writable.__width = width;
  }

  decorate(): React.ReactElement {
    return (
      <ImageComponent
        src={this.__src}
        altText={this.__altText}
        width={this.__width}
        height={this.__height}
        maxWidth={this.__maxWidth}
        imageId={this.__imageId}
        nodeKey={this.__key}
      />
    );
  }
}

/**
 * Image Component with Controls
 * Handles resize, alt text editing, and delete
 */
function ImageComponent({
  src,
  altText,
  width,
  height,
  maxWidth,
  imageId,
  nodeKey,
}: {
  src: string;
  altText: string;
  width: 'inherit' | number;
  height: 'inherit' | number;
  maxWidth: number;
  imageId: string;
  nodeKey: NodeKey;
}) {
  const [editor] = useLexicalComposerContext();
  const [isHovered, setIsHovered] = useState(false);
  const [showAltEditor, setShowAltEditor] = useState(false);
  const [editedAltText, setEditedAltText] = useState(altText);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [displaySrc, setDisplaySrc] = useState(imageId ? '' : src);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (!imageId) {
      setDisplaySrc(src);
      setLoadFailed(false);
      return;
    }

    let cancelled = false;
    let restoredUrl: string | null = null;

    indexedDBService
      .getImage(imageId)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) {
          // Non-blob sources (for example an imported HTTPS image) remain usable.
          if (src && !src.startsWith('blob:')) setDisplaySrc(src);
          else setLoadFailed(true);
          return;
        }
        restoredUrl = URL.createObjectURL(blob);
        setDisplaySrc(restoredUrl);
        setLoadFailed(false);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      if (restoredUrl) URL.revokeObjectURL(restoredUrl);
    };
  }, [imageId, src]);

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirm(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    try {
      // Delete from IndexedDB
      if (imageId) {
        await indexedDBService.deleteImage(imageId);
      }

      // Remove node from editor
      editor.update(() => {
        const node = $getNodeByKey(nodeKey);
        if (node) {
          node.remove();
        }
      });

      if (import.meta.env.DEV) console.log(`✅ Deleted image: ${imageId}`);
    } catch (error) {
      console.error('Failed to delete image:', error);
    } finally {
      setShowDeleteConfirm(false);
    }
  }, [imageId, editor, nodeKey]);

  const handleSaveAltText = () => {
    editor.update(() => {
      const node = $getNodeByKey(nodeKey);
      if (node && node instanceof ImageNode) {
        node.setAltText(editedAltText);
      }
    });
    setShowAltEditor(false);
    if (import.meta.env.DEV) console.log(`✅ Updated alt text: "${editedAltText}"`);
  };

  return (
    <div
      className="inline-block my-4 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Resizable container */}
      <div
        className="resize inline-block overflow-auto rounded-lg border-2 border-transparent transition-all duration-200 hover:border-accent-primary/30"
        style={{
          maxWidth: maxWidth,
          resize: 'both',
        }}
      >
        {displaySrc ? (
          <img
            src={displaySrc}
            alt={altText}
            onError={() => {
              setLoadFailed(true);
              setDisplaySrc('');
            }}
            style={{
              width: width === 'inherit' ? '100%' : width,
              height: height === 'inherit' ? 'auto' : height,
              display: 'block',
            }}
            className="max-w-full h-auto rounded-lg pointer-events-none"
            draggable={false}
          />
        ) : (
          <div className="flex min-h-32 min-w-56 items-center justify-center rounded-lg bg-surface-light-elevated px-5 text-sm text-text-light-secondary dark:bg-surface-dark-elevated dark:text-text-dark-secondary">
            {loadFailed ? '图片数据不可用，可删除后重新插入' : '正在恢复本地图片…'}
          </div>
        )}
      </div>

      {/* Hover controls - positioned below image with proper spacing */}
      {isHovered && !showAltEditor && (
        <div className="flex items-center justify-center gap-2 mt-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100 transition-opacity duration-200">
          <button
            onClick={() => setShowAltEditor(true)}
            className="rounded-lg border border-border-light bg-surface-light px-3 py-1 text-sm text-text-light-primary shadow-elevated transition-colors hover:bg-accent-primary hover:text-white dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-primary"
            title="编辑替代文本"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden /> 替代文本
          </button>
          <button
            onClick={handleDeleteClick}
            className="px-3 py-1 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary hover:bg-accent-red hover:text-white transition-colors shadow-elevated"
            title="删除图片"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> 删除
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="删除图片"
        message="确定删除这张图片？此操作无法撤销。"
        confirmText="删除"
        variant="danger"
      />

      {/* Alt text editor modal */}
      {showAltEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-dark/50" onClick={() => setShowAltEditor(false)}>
          <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-elevated p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
              编辑替代文本
            </h3>
            <textarea
              value={editedAltText}
              onChange={(e) => setEditedAltText(e.target.value)}
              className="h-24 w-full resize-none rounded-lg border border-border-light bg-surface-light-elevated px-3 py-2 text-text-light-primary focus:outline-none focus:ring-2 focus:ring-accent-primary dark:border-border-dark dark:bg-surface-dark-elevated dark:text-text-dark-primary"
              placeholder="为屏幕阅读器描述这张图片…"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => setShowAltEditor(false)}
                className="px-4 py-2 text-sm text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveAltText}
                className="rounded-lg bg-accent-primary px-4 py-2 text-sm text-white transition-opacity hover:opacity-90"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function $createImageNode({
  altText,
  height,
  maxWidth = 800,
  src,
  width,
  imageId,
  key,
}: ImagePayload): ImageNode {
  return new ImageNode(src, altText, maxWidth, width, height, imageId, key);
}

export function $isImageNode(
  node: LexicalNode | null | undefined
): node is ImageNode {
  return node instanceof ImageNode;
}
