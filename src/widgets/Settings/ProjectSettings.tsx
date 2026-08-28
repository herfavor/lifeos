/**
 * Project Settings Component
 *
 * Manages project contexts for the global project filter system:
 * - Create, edit, archive projects
 * - Hierarchical project organization
 * - Project colors and icons
 */

import React, { useState, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Archive,
  ArchiveRestore,
  FolderTree,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useProjectContextStore } from '../../stores/useProjectContextStore';
import type { ProjectContext } from '../../types';

// Color palette for project creation
const PROJECT_COLORS = [
  '#ec4899', // Pink/Magenta
  '#8b5cf6', // Purple
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#22c55e', // Green
  '#eab308', // Yellow
  '#f97316', // Orange
  '#ef4444', // Red
];

// Common project icons
const PROJECT_ICONS = ['', '📁', '💼', '🏠', '🎯', '💡', '🔧', '📊', '🎨', '🚀', '⭐', '📝'];

interface ProjectFormData {
  name: string;
  color: string;
  icon: string;
  parentId: string | null;
  description: string;
}

const defaultFormData: ProjectFormData = {
  name: '',
  color: PROJECT_COLORS[0],
  icon: '',
  parentId: null,
  description: '',
};

export const ProjectSettings: React.FC = () => {
  const projects = useProjectContextStore((s) => s.projects);
  const createProject = useProjectContextStore((s) => s.createProject);
  const updateProject = useProjectContextStore((s) => s.updateProject);
  const archiveProject = useProjectContextStore((s) => s.archiveProject);
  const deleteProject = useProjectContextStore((s) => s.deleteProject);
  const getRootProjects = useProjectContextStore((s) => s.getRootProjects);
  const getChildProjects = useProjectContextStore((s) => s.getChildProjects);
  const getArchivedProjects = useProjectContextStore((s) => s.getArchivedProjects);

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProjectFormData>(defaultFormData);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const rootProjects = getRootProjects();
  const archivedProjects = getArchivedProjects();

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleCreate = useCallback(() => {
    setIsCreating(true);
    setEditingId(null);
    setFormData(defaultFormData);
  }, []);

  const handleEdit = useCallback((project: ProjectContext) => {
    setEditingId(project.id);
    setIsCreating(false);
    setFormData({
      name: project.name,
      color: project.color,
      icon: project.icon || '',
      parentId: project.parentId,
      description: project.description || '',
    });
  }, []);

  const handleCancel = useCallback(() => {
    setIsCreating(false);
    setEditingId(null);
    setFormData(defaultFormData);
  }, []);

  const handleSave = useCallback(() => {
    if (!formData.name.trim()) return;

    if (isCreating) {
      createProject({
        name: formData.name.trim(),
        color: formData.color,
        icon: formData.icon || undefined,
        parentId: formData.parentId,
        description: formData.description || undefined,
      });
    } else if (editingId) {
      updateProject(editingId, {
        name: formData.name.trim(),
        color: formData.color,
        icon: formData.icon || undefined,
        parentId: formData.parentId,
        description: formData.description || undefined,
      });
    }

    handleCancel();
  }, [formData, isCreating, editingId, createProject, updateProject, handleCancel]);

  const handleArchive = useCallback((id: string) => {
    archiveProject(id);
  }, [archiveProject]);

  const handleUnarchive = useCallback((id: string) => {
    // Find the project and update to remove archivedAt
    const project = projects.find((p) => p.id === id);
    if (project) {
      updateProject(id, { archivedAt: undefined });
    }
  }, [projects, updateProject]);

  const handleDelete = useCallback((id: string) => {
    deleteProject(id);
    setDeleteConfirmId(null);
  }, [deleteProject]);

  // Get available parent options (exclude self and descendants when editing)
  const getParentOptions = useCallback(() => {
    const activeProjects = projects.filter((p) => !p.archivedAt);

    if (!editingId) return activeProjects;

    // When editing, exclude self and all descendants
    const getDescendantIds = (parentId: string): Set<string> => {
      const ids = new Set<string>();
      const children = projects.filter((p) => p.parentId === parentId);
      children.forEach((child) => {
        ids.add(child.id);
        getDescendantIds(child.id).forEach((id) => ids.add(id));
      });
      return ids;
    };

    const excludeIds = new Set([editingId, ...getDescendantIds(editingId)]);
    return activeProjects.filter((p) => !excludeIds.has(p.id));
  }, [projects, editingId]);

  const renderProjectRow = (project: ProjectContext, level: number = 0) => {
    const children = getChildProjects(project.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(project.id);
    const isEditing = editingId === project.id;

    return (
      <div key={project.id}>
        <div
          className={`
            group flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
            ${isEditing ? 'bg-accent-blue/10 dark:bg-accent-blue/20' : 'hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'}
          `}
          style={{ paddingLeft: `${level * 24 + 12}px` }}
        >
          {/* Expand/collapse */}
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggleExpand(project.id)}
              className="p-0.5 hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-text-light-secondary dark:text-text-dark-secondary" />
              ) : (
                <ChevronRight className="w-4 h-4 text-text-light-secondary dark:text-text-dark-secondary" />
              )}
            </button>
          ) : (
            <span className="w-5" />
          )}

          {/* Color indicator */}
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: project.color }}
          />

          {/* Icon */}
          {project.icon && <span className="text-sm">{project.icon}</span>}

          {/* Name */}
          <span className="flex-1 text-sm font-medium text-text-light-primary dark:text-text-dark-primary truncate">
            {project.name}
          </span>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => handleEdit(project)}
              className="p-1.5 hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated rounded transition-colors"
              title="编辑项目"
              aria-label="编辑项目"
            >
              <Pencil className="w-3.5 h-3.5 text-text-light-secondary dark:text-text-dark-secondary" />
            </button>
            <button
              type="button"
              onClick={() => handleArchive(project.id)}
              className="p-1.5 hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated rounded transition-colors"
              title="归档项目"
              aria-label="归档项目"
            >
              <Archive className="w-3.5 h-3.5 text-text-light-secondary dark:text-text-dark-secondary" />
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {children.map((child) => renderProjectRow(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Projects Card */}
      <div className="bento-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
              <FolderTree className="w-5 h-5" />
              项目
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
              创建并组织项目，以便在平台各处筛选内容。
            </p>
          </div>
          {!isCreating && !editingId && (
            <button
              type="button"
              onClick={handleCreate}
              className="flex items-center gap-2 px-3 py-1.5 rounded-button bg-gradient-button-primary hover:shadow-glow-magenta text-white text-sm font-medium transition-all duration-standard ease-smooth"
            >
              <Plus className="w-4 h-4" />
              新建项目
            </button>
          )}
        </div>

        {/* Create/Edit Form */}
        {(isCreating || editingId) && (
          <div className="mb-4 p-4 rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark">
            <h3 className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
              {isCreating ? '创建新项目' : '编辑项目'}
            </h3>

            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  项目名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：工作、个人、客户 A"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  颜色
                </label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-6 h-6 rounded-full transition-all ${
                        formData.color === color
                          ? 'ring-2 ring-offset-2 ring-accent-blue dark:ring-offset-surface-dark-elevated'
                          : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Icon */}
              <div>
                <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  图标（可选）
                </label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_ICONS.map((icon) => (
                    <button
                      key={icon || 'none'}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`w-8 h-8 rounded-lg text-sm flex items-center justify-center transition-all ${
                        formData.icon === icon
                          ? 'bg-accent-blue/20 ring-2 ring-accent-blue'
                          : 'bg-surface-light dark:bg-surface-dark-elevated hover:bg-surface-light-elevated dark:hover:bg-surface-dark'
                      }`}
                    >
                      {icon || '—'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parent */}
              <div>
                <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  上级项目（可选）
                </label>
                <select
                  value={formData.parentId || ''}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value || null })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue focus:border-transparent"
                >
                  <option value="">无（根项目）</option>
                  {getParentOptions().map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                  描述（可选）
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="此项目的简要描述..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue focus:border-transparent resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-sm rounded-button border border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!formData.name.trim()}
                  className="px-3 py-1.5 text-sm rounded-button bg-gradient-button-primary hover:shadow-glow-magenta text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? '创建' : '保存'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Project List */}
        {rootProjects.length === 0 && !isCreating ? (
          <div className="text-center py-8">
            <FolderTree className="w-12 h-12 mx-auto mb-3 text-text-light-tertiary dark:text-text-dark-tertiary" />
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-2">
              暂无项目
            </p>
            <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
              创建你的第一个项目，开始整理你的工作
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {rootProjects.map((project) => renderProjectRow(project))}
          </div>
        )}

        {/* Archived Section */}
        {archivedProjects.length > 0 && (
          <div className="mt-6 pt-6 border-t border-border-light dark:border-border-dark">
            <button
              type="button"
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center gap-2 text-sm text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
            >
              {showArchived ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <Archive className="w-4 h-4" />
              已归档（{archivedProjects.length}）
            </button>

            {showArchived && (
              <div className="mt-3 space-y-1">
                {archivedProjects.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated opacity-60"
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    {project.icon && <span className="text-sm">{project.icon}</span>}
                    <span className="flex-1 text-sm text-text-light-primary dark:text-text-dark-primary truncate">
                      {project.name}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUnarchive(project.id)}
                        className="p-1.5 hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated rounded transition-colors"
                        title="恢复项目"
                        aria-label="恢复项目"
                      >
                        <ArchiveRestore className="w-3.5 h-3.5 text-text-light-secondary dark:text-text-dark-secondary" />
                      </button>
                      {deleteConfirmId === project.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDelete(project.id)}
                            className="px-2 py-0.5 text-xs bg-accent-red text-white rounded hover:bg-accent-red-hover transition-colors"
                          >
                            删除
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-0.5 text-xs border border-border-light dark:border-border-dark rounded hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(project.id)}
                          className="p-1.5 hover:bg-accent-red/10 dark:hover:bg-accent-red/20 rounded transition-colors"
                          title="永久删除"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-accent-red" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bento-card p-4 bg-accent-blue/10 dark:bg-accent-blue/20 border-accent-blue/20 dark:border-accent-blue/30">
        <h3 className="text-sm font-medium text-accent-blue dark:text-accent-blue mb-2">
          项目的工作原理
        </h3>
        <ul className="text-xs text-text-light-secondary dark:text-text-dark-secondary space-y-1 list-disc list-inside">
          <li>使用顶部的项目筛选器专注于特定项目</li>
          <li>将内容（任务、笔记、事件等）分配给一个或多个项目</li>
          <li>创建层级项目以实现复杂组织（例如：工作 &gt; 客户 A）</li>
          <li>已归档项目会从筛选中隐藏，但会被保留</li>
        </ul>
      </div>
    </div>
  );
};
