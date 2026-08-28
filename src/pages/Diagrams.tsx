/**
 * Diagrams Page - Library View
 * Grid of all diagrams with create/search/delete
 *
 * Phase 5: Exports DiagramsContent component for embedding in Create page
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoreErrorBoundary } from '../components/StoreErrorBoundary';
import { useDiagramsStore } from '../stores/useDiagramsStore';
import { TemplateGallery } from '../components/DiagramCanvas/TemplateGallery';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { DiagramTemplate } from '../types/diagrams';
import { Plus, Search, Grid3x3, List, FileText, Trash2, RotateCcw } from 'lucide-react';

/**
 * DiagramsContent - Exportable content component for embedding in Create page
 * Phase 5: Renders without page wrapper for use as a tab
 */
export function DiagramsContent() {
  const navigate = useNavigate();
  const diagrams = useDiagramsStore((s) => s.diagrams);
  const createDiagram = useDiagramsStore((s) => s.createDiagram);
  const deleteDiagram = useDiagramsStore((s) => s.deleteDiagram);
  const restoreDiagram = useDiagramsStore((s) => s.restoreDiagram);
  const permanentlyDeleteDiagram = useDiagramsStore((s) => s.permanentlyDeleteDiagram);
  const duplicateDiagram = useDiagramsStore((s) => s.duplicateDiagram);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [diagramToDelete, setDiagramToDelete] = useState<string | null>(null);
  const [diagramToPermanentlyDelete, setDiagramToPermanentlyDelete] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);

  const handleCreateDiagram = () => {
    const newDiagram = createDiagram('未命名图表');
    navigate(`/diagrams/${newDiagram.id}`);
  };

  const handleCreateFromTemplate = (template: DiagramTemplate) => {
    const newDiagram = createDiagram(template.name, {
      elements: template.elements,
      canvasState: {
        zoom: template.canvasState.zoom || 1,
        pan: template.canvasState.pan || { x: 0, y: 0 },
        gridSize: template.canvasState.gridSize || 20,
        snapToGrid: template.canvasState.snapToGrid !== undefined ? template.canvasState.snapToGrid : true,
      },
    });
    navigate(`/diagrams/${newDiagram.id}`);
  };

  const handleOpenDiagram = (id: string) => {
    navigate(`/diagrams/${id}`);
  };

  const handleDeleteDiagram = (id: string) => {
    setDiagramToDelete(id);
  };

  const confirmDeleteDiagram = () => {
    if (diagramToDelete) {
      deleteDiagram(diagramToDelete);
      setDiagramToDelete(null);
    }
  };

  const confirmPermanentDeleteDiagram = () => {
    if (diagramToPermanentlyDelete) {
      permanentlyDeleteDiagram(diagramToPermanentlyDelete);
      setDiagramToPermanentlyDelete(null);
    }
  };

  const handleDuplicateDiagram = (id: string) => {
    const duplicate = duplicateDiagram(id);
    if (duplicate) {
      navigate(`/diagrams/${duplicate.id}`);
    }
  };

  // Active diagrams only; trash is listed separately below.
  const activeDiagrams = diagrams.filter((diagram) => !diagram.deletedAt);
  const trashedDiagrams = diagrams
    .filter((diagram) => diagram.deletedAt)
    .sort((a, b) => new Date(b.deletedAt?.getTime() ?? 0).getTime() - new Date(a.deletedAt?.getTime() ?? 0).getTime());

  // Filter diagrams by search query
  const filteredDiagrams = activeDiagrams.filter((diagram) =>
    diagram.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort by most recently updated
  const sortedDiagrams = [...filteredDiagrams].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark">
        <div>
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
            绘图
          </h2>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            {sortedDiagrams.length} 张绘图
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
            <input
              type="text"
              placeholder="搜索绘图…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>

          {/* View mode toggle */}
          <div className="flex gap-1 bg-surface-light dark:bg-surface-dark rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${
                viewMode === 'grid'
                  ? 'bg-accent-blue dark:bg-accent-blue text-white'
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
              }`}
              aria-label="网格视图"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${
                viewMode === 'list'
                  ? 'bg-accent-blue dark:bg-accent-blue text-white'
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
              }`}
              aria-label="列表视图"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Create buttons */}
          <button
            onClick={() => setShowTemplateGallery(true)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary rounded-lg hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors"
          >
            <FileText className="w-4 h-4" />
            从模板
          </button>
          <button
            onClick={handleCreateDiagram}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue dark:bg-accent-blue text-white rounded-lg hover:bg-accent-blue-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建绘图
          </button>
        </div>
      </header>

      {/* Template Gallery Modal */}
      <TemplateGallery
        isOpen={showTemplateGallery}
        onClose={() => setShowTemplateGallery(false)}
        onSelectTemplate={handleCreateFromTemplate}
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {sortedDiagrams.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 mb-4 rounded-full bg-surface-light dark:bg-surface-dark flex items-center justify-center">
              <Grid3x3 className="w-12 h-12 text-text-light-tertiary dark:text-text-dark-tertiary" />
            </div>
            <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
              {searchQuery ? '未找到绘图' : '还没有绘图'}
            </h2>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6 max-w-md">
              {searchQuery
                ? '请尝试调整搜索条件'
                : '创建您的第一张绘图，用于可视化想法、规划项目或记录工作流程'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleCreateDiagram}
                className="flex items-center gap-2 px-6 py-3 bg-accent-blue dark:bg-accent-blue text-white rounded-lg hover:bg-accent-blue-hover transition-colors"
              >
                <Plus className="w-5 h-5" />
                创建您的第一张绘图
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          // Grid view
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedDiagrams.map((diagram) => (
              <DiagramCard
                key={diagram.id}
                diagram={diagram}
                onOpen={() => handleOpenDiagram(diagram.id)}
                onDelete={() => handleDeleteDiagram(diagram.id)}
                onDuplicate={() => handleDuplicateDiagram(diagram.id)}
              />
            ))}
          </div>
        ) : (
          // List view
          <div className="space-y-2">
            {sortedDiagrams.map((diagram) => (
              <DiagramListItem
                key={diagram.id}
                diagram={diagram}
                onOpen={() => handleOpenDiagram(diagram.id)}
                onDelete={() => handleDeleteDiagram(diagram.id)}
                onDuplicate={() => handleDuplicateDiagram(diagram.id)}
              />
            ))}
          </div>
        )}

        {/* Recycle bin */}
        {trashedDiagrams.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setShowTrash(!showTrash)}
              className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary mb-4"
            >
              <Trash2 className="w-4 h-4" />
              回收站（{trashedDiagrams.length}）
            </button>
            {showTrash && (
              <div className="space-y-2 opacity-70">
                {trashedDiagrams.map((diagram) => (
                  <div
                    key={diagram.id}
                    className="flex items-center justify-between bg-surface-light dark:bg-surface-dark-elevated rounded-lg p-3 border border-border-light dark:border-border-dark"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-text-light-primary dark:text-text-dark-primary">{diagram.title || '未命名绘图'}</p>
                      <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">删除于 {new Date(diagram.deletedAt?.getTime() ?? Date.now()).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => restoreDiagram(diagram.id)}
                        className="p-2 hover:bg-surface-light-alt dark:hover:bg-surface-dark rounded-lg text-text-light-tertiary dark:text-text-dark-tertiary"
                        title="恢复"
                        aria-label={`恢复绘图 ${diagram.title}`}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDiagramToPermanentlyDelete(diagram.id)}
                        className="p-2 hover:bg-status-error/10 rounded-lg text-status-error"
                        title="永久删除"
                        aria-label={`永久删除绘图 ${diagram.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={diagramToDelete !== null}
        onClose={() => setDiagramToDelete(null)}
        onConfirm={confirmDeleteDiagram}
        title="删除绘图"
        message="确定将这张绘图移到回收站吗？之后仍可恢复。"
        confirmText="移到回收站"
        variant="warning"
      />

      <ConfirmDialog
        isOpen={diagramToPermanentlyDelete !== null}
        onClose={() => setDiagramToPermanentlyDelete(null)}
        onConfirm={confirmPermanentDeleteDiagram}
        title="永久删除绘图"
        message="确定要永久删除这张绘图吗？此操作无法撤销。"
        confirmText="永久删除"
        variant="danger"
      />
    </>
  );
}

/**
 * Diagrams Page - Wraps DiagramsContent with page structure
 */
export default function Diagrams() {
  return (
    <StoreErrorBoundary storeName="diagrams">
      <main className="flex flex-col h-full bg-surface-light dark:bg-surface-dark">
        <DiagramsContent />
      </main>
    </StoreErrorBoundary>
  );
}

// Diagram Card Component (Grid View)
interface DiagramCardProps {
  diagram: {
    id: string;
    title: string;
    updatedAt: Date;
    thumbnail?: string;
    elements: unknown[];
  };
  onOpen: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function DiagramCard({ diagram, onOpen, onDelete, onDuplicate }: DiagramCardProps) {
  return (
    <div
      className="group bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
      onClick={onOpen}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-surface-light dark:bg-surface-dark flex items-center justify-center">
        {diagram.thumbnail ? (
          <img src={diagram.thumbnail} alt={diagram.title} className="w-full h-full object-cover" />
        ) : (
          <div className="text-text-light-tertiary dark:text-text-dark-tertiary">
            <Grid3x3 className="w-12 h-12" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate mb-1">
          {diagram.title}
        </h3>
        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
          {diagram.elements.length} 个元素 •{' '}
          {new Date(diagram.updatedAt).toLocaleDateString()}
        </p>

        {/* Actions (show on hover) */}
        <div className="mt-2 flex gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="flex-1 px-2 py-1 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated rounded hover:bg-surface-light dark:hover:bg-surface-dark"
          >
            复制
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="flex-1 px-2 py-1 text-xs bg-accent-red/10 text-accent-red rounded hover:bg-accent-red/20"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

// Diagram List Item Component (List View)
function DiagramListItem({ diagram, onOpen, onDelete, onDuplicate }: DiagramCardProps) {
  return (
    <div
      className="flex items-center gap-4 p-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:shadow-md transition-shadow cursor-pointer"
      onClick={onOpen}
    >
      {/* Thumbnail */}
      <div className="w-20 h-14 bg-surface-light dark:bg-surface-dark rounded flex items-center justify-center flex-shrink-0">
        {diagram.thumbnail ? (
          <img src={diagram.thumbnail} alt={diagram.title} className="w-full h-full object-cover rounded" />
        ) : (
          <Grid3x3 className="w-6 h-6 text-text-light-tertiary dark:text-text-dark-tertiary" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate">
          {diagram.title}
        </h3>
        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
          {diagram.elements.length} 个元素 • 更新于 {new Date(diagram.updatedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="px-3 py-1 text-sm bg-surface-light-elevated dark:bg-surface-dark-elevated rounded hover:bg-surface-light dark:hover:bg-surface-dark"
        >
          复制
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="px-3 py-1 text-sm bg-accent-red/10 text-accent-red rounded hover:bg-accent-red/20"
        >
          删除
        </button>
      </div>
    </div>
  );
}
