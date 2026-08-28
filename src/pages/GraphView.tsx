/**
 * Graph View Page
 * Visual network of notes and their connections
 */

import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GraphCanvas } from '../components/Graph/GraphCanvas';
import { GraphSearch } from '../components/Graph/GraphSearch';
import { OrphanPanel } from '../components/Graph/OrphanPanel';
import { LinkStrengthLegend } from '../components/Graph/LinkStrengthLegend';
import { useNotesStore } from '../stores/useNotesStore';
import { buildGraphData, type GraphFilters, getUniqueTags, getColorGroups } from '../utils/graphDataProcessor';
import { searchGraphNodes, type SearchResult } from '../utils/graphSearch';
import { getOrphansWithSuggestions, detectOrphans } from '../utils/graphOrphanDetection';
import type { GraphSearchFilters } from '../types/graph';
import { Target, X, Palette, AlertCircle } from 'lucide-react';
import { PageContent } from '../components/PageContent';
import { appendMarkdownToLexical, ensureLexicalContent } from '../utils/markdownToLexical';

export default function GraphView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const allNotes = useNotesStore((state) => state.notes);
  const notes = useMemo(
    () => Object.fromEntries(Object.entries(allNotes).filter(([, note]) => !note.deletedAt)),
    [allNotes]
  );
  const updateNote = useNotesStore((state) => state.updateNote);
  const addTag = useNotesStore((state) => state.addTag);

  const [hideOrphans, setHideOrphans] = useState(true);
  const [colorBy, setColorBy] = useState<'none' | 'folder' | 'tag'>('none'); // Color grouping
  const [sizeByConnections, setSizeByConnections] = useState(true); // Node sizing

  // New state for advanced features
  const [showLinkStrength, setShowLinkStrength] = useState(false); // Link strength is an advanced display option
  const [graphSearchFilters, setGraphSearchFilters] = useState<GraphSearchFilters>({}); // Graph search
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null); // Search results
  const [showOrphanPanel, setShowOrphanPanel] = useState(false); // Orphan panel
  const [showDisplayOptions, setShowDisplayOptions] = useState(false);

  // Focus mode state
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [focusDepth, setFocusDepth] = useState(2); // Default 2 hops

  // Get available tags
  const availableTags = useMemo(() => getUniqueTags(notes), [notes]);

  // Persist visual settings to localStorage
  useEffect(() => {
    localStorage.setItem('graph-visual-settings', JSON.stringify({
      colorBy,
      sizeByConnections,
    }));
  }, [colorBy, sizeByConnections]);

  // Restore visual settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('graph-visual-settings');
    if (saved) {
      try {
        const { colorBy: savedColorBy, sizeByConnections: savedSizing } = JSON.parse(saved);
        if (savedColorBy) setColorBy(savedColorBy);
        if (typeof savedSizing === 'boolean') setSizeByConnections(savedSizing);
      } catch (error) {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // URL param support for focus mode
  useEffect(() => {
    const focusParam = searchParams.get('focus');
    if (focusParam && notes[focusParam]) {
      setFocusNodeId(focusParam);
    }
  }, [searchParams, notes]);

  // Persist focus state to localStorage
  useEffect(() => {
    if (focusNodeId) {
      localStorage.setItem('graph-focus', JSON.stringify({ nodeId: focusNodeId, depth: focusDepth }));
    } else {
      localStorage.removeItem('graph-focus');
    }
  }, [focusNodeId, focusDepth]);

  // Restore focus from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('graph-focus');
    if (saved && !searchParams.get('focus')) {
      try {
        const { nodeId, depth } = JSON.parse(saved);
        if (notes[nodeId]) {
          setFocusNodeId(nodeId);
          setFocusDepth(depth);
        } else {
          // Note was deleted, clear saved focus
          localStorage.removeItem('graph-focus');
        }
      } catch (error) {
        localStorage.removeItem('graph-focus');
      }
    }
  }, [notes, searchParams]);

  // Build graph data with filters
  const graphData = useMemo(() => {
    const filters: GraphFilters = {
      hideOrphans,
      focusNodeId: focusNodeId || undefined,
      focusDepth: focusNodeId ? focusDepth : undefined,
      colorBy, // Color grouping
      sizeByConnections, // Node sizing
    };
    return buildGraphData(notes, filters);
  }, [notes, hideOrphans, focusNodeId, focusDepth, colorBy, sizeByConnections]);

  // Keep an unfiltered graph for orphan discovery. The visible graph may hide
  // orphans by default, but the "未连接笔记" panel still needs to know they exist.
  const completeGraphData = useMemo(() => {
    const filters: GraphFilters = {
      hideOrphans: false,
      colorBy,
      sizeByConnections,
    };
    return buildGraphData(notes, filters);
  }, [notes, colorBy, sizeByConnections]);

  // Get color groups for legend
  const colorGroups = useMemo(() => getColorGroups(graphData, colorBy), [graphData, colorBy]);

  const orphanIds = useMemo(() => {
    return detectOrphans(completeGraphData.nodes, completeGraphData.edges);
  }, [completeGraphData]);

  const orphanNodes = useMemo(() => {
    if (!showOrphanPanel) return [];
    return getOrphansWithSuggestions(completeGraphData.nodes, completeGraphData.edges, notes);
  }, [completeGraphData, notes, showOrphanPanel]);

  // Perform graph search when filters change
  useEffect(() => {
    if (Object.keys(graphSearchFilters).length === 0) {
      setSearchResult(null);
      return;
    }

    const result = searchGraphNodes(
      graphData.nodes,
      graphData.edges,
      graphSearchFilters
    );
    setSearchResult(result);
  }, [graphData, graphSearchFilters]);

  // Handle node click - focus on node
  const handleNodeClick = (nodeId: string, nodeType: 'note' | 'tag') => {
    if (nodeType === 'note') {
      setFocusNodeId(nodeId);
      setSearchParams({ focus: nodeId });
    }
  };

  // Handle node double-click - navigate to note
  const handleNodeDoubleClick = (nodeId: string, nodeType: 'note' | 'tag') => {
    if (nodeType === 'note') {
      navigate(`/notes?note=${nodeId}`);
    }
  };

  // Reset focus mode
  const resetFocus = () => {
    setFocusNodeId(null);
    setSearchParams({});
  };

  // Handle creating link from orphan panel
  const handleCreateLink = (orphanId: string, targetId: string) => {
    const orphanNote = notes[orphanId];
    const targetNote = notes[targetId];

    if (!orphanNote || !targetNote) return;

    // Add the target note to the orphan's linkedNotes
    const currentLinkedNotes = orphanNote.linkedNotes || [];
    if (!currentLinkedNotes.includes(targetId)) {
      const wikiLink = `[[${targetNote.title}]]`;
      const currentContent = ensureLexicalContent(orphanNote.content, orphanNote.contentText);
      updateNote(orphanId, {
        linkedNotes: [...currentLinkedNotes, targetId],
        content: appendMarkdownToLexical(currentContent, wikiLink, '\n\n'),
        contentText: `${orphanNote.contentText.trim()}\n\n${wikiLink}`.trim(),
      });
    }
  };

  // Handle adding tag from orphan panel
  const handleAddTag = (orphanId: string, tag: string) => {
    addTag(orphanId, tag);
  };

  // Handle focusing orphan from panel
  const handleFocusOrphan = (nodeId: string) => {
    setFocusNodeId(nodeId);
    setSearchParams({ focus: nodeId });
  };

  // Check if empty
  const hasNotes = Object.keys(notes).length > 0;

  return (
    <PageContent page="graph" variant="full-height">
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* Main graph area */}
        <div className="flex-1 flex flex-col p-6 gap-4 overflow-hidden">
        {/* Focus Mode Banner */}
        {focusNodeId && notes[focusNodeId] && (
          <div className="flex items-center gap-4 rounded-xl border border-accent-primary/20 bg-accent-primary/5 p-3">
            <Target className="w-4 h-4 text-accent-primary flex-shrink-0" />
            <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              聚焦于：{notes[focusNodeId]?.title}
            </span>

            <div className="flex items-center gap-2 ml-auto">
              <label className="flex items-center gap-2">
                <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary whitespace-nowrap">
                  深度：
                </span>
                <input
                  type="range"
                  min="1"
                  max="3"
                  value={focusDepth}
                  onChange={(e) => setFocusDepth(parseInt(e.target.value))}
                  className="w-20 accent-accent-primary"
                />
                <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary w-12">
                  {focusDepth} 跳
                </span>
              </label>

              <button
                onClick={resetFocus}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary transition-colors"
              >
                <X className="w-3 h-3" />
                重置
              </button>
            </div>
          </div>
        )}

        {/* Controls: search is primary; visual tuning stays out of the way. */}
        <div className="flex flex-col gap-2">
          <GraphSearch
            availableTags={availableTags}
            filters={graphSearchFilters}
            onFiltersChange={setGraphSearchFilters}
            resultCount={searchResult?.matchCount}
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setHideOrphans((value) => !value)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                hideOrphans
                  ? 'border-accent-primary/30 bg-accent-primary/5 text-accent-primary'
                  : 'border-border-light text-text-light-secondary dark:border-border-dark dark:text-text-dark-secondary'
              }`}
            >
              {hideOrphans ? '显示孤立节点' : '隐藏孤立节点'}
            </button>
            <button
              type="button"
              onClick={() => setShowOrphanPanel(!showOrphanPanel)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                showOrphanPanel
                  ? 'border-accent-primary/30 bg-accent-primary/5 text-accent-primary'
                  : 'border-border-light text-text-light-secondary dark:border-border-dark dark:text-text-dark-secondary'
              }`}
            >
              <AlertCircle className="h-4 w-4" />
              未连接笔记（{orphanIds.size}）
            </button>
            <button
              type="button"
              onClick={() => setShowDisplayOptions((value) => !value)}
              className="rounded-lg border border-border-light px-3 py-1.5 text-sm text-text-light-secondary hover:text-accent-primary dark:border-border-dark dark:text-text-dark-secondary"
              aria-expanded={showDisplayOptions}
            >
              显示选项
            </button>
            <span className="ml-auto text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
              {graphData.nodes.length} 个节点 · {graphData.edges.length} 条连接
            </span>
          </div>

          {showDisplayOptions && (
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border-light bg-surface-light p-3 text-sm dark:border-border-dark dark:bg-surface-dark">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showLinkStrength}
                  onChange={(e) => setShowLinkStrength(e.target.checked)}
                  className="h-4 w-4 rounded border-border-light text-accent-primary focus:ring-accent-primary dark:border-border-dark"
                />
                <span className="text-text-light-secondary dark:text-text-dark-secondary">链接强度</span>
              </label>
              <div className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
                <select
                  value={colorBy}
                  onChange={(e) => setColorBy(e.target.value as 'none' | 'folder' | 'tag')}
                  className="rounded-lg border border-border-light bg-surface-light px-2.5 py-1.5 text-sm text-text-light-primary outline-none dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-primary"
                >
                  <option value="none">默认颜色</option>
                  <option value="folder">按文件夹</option>
                  <option value="tag">按标签</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sizeByConnections}
                  onChange={(e) => setSizeByConnections(e.target.checked)}
                  className="h-4 w-4 rounded border-border-light text-accent-primary focus:ring-accent-primary dark:border-border-dark"
                />
                <span className="text-text-light-secondary dark:text-text-dark-secondary">按连接数调整大小</span>
              </label>
            </div>
          )}
        </div>

        {/* Graph or Empty State */}
        {!hasNotes ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-text-light-secondary dark:text-text-dark-secondary mb-2">
                还没有笔记
              </p>
              <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
                创建一些带反向链接的笔记，即可查看您的知识图谱
              </p>
            </div>
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-text-light-secondary dark:text-text-dark-secondary mb-2">
                没有符合筛选条件的笔记
              </p>
              <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
                请尝试调整搜索，或显示孤立笔记
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">
            <GraphCanvas
              data={graphData}
              onNodeClick={handleNodeClick}
              onNodeDoubleClick={handleNodeDoubleClick}
              focusNodeId={focusNodeId}
              searchResult={searchResult}
              showLinkStrength={showLinkStrength}
              orphanIds={orphanIds}
            />
          </div>
        )}

        {/* Legends are reference material, not primary graph chrome. */}
        {showDisplayOptions && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-6 text-xs text-text-light-tertiary dark:text-text-dark-tertiary flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--accent-primary)]" />
              <span>笔记</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--accent-secondary)]" />
              <span>标签</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--accent-secondary)] border-2 border-accent-orange" />
              <span>孤立节点</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-[var(--accent-primary)]" />
              <span>反向链接</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-[var(--border-light)] dark:bg-[var(--border-dark)]" />
              <span>标签连接</span>
            </div>
          </div>

          {/* Link Strength Legend */}
          <LinkStrengthLegend enabled={showLinkStrength} />

          {/* Color Groups Legend */}
          {colorBy !== 'none' && colorGroups.size > 0 && (
            <div className="flex items-center gap-4 text-xs text-text-light-tertiary dark:text-text-dark-tertiary flex-wrap">
              <span className="font-medium">{colorBy === 'folder' ? '文件夹：' : '标签：'}</span>
              {Array.from(colorGroups.entries()).map(([name, { color, count }]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span>{name === 'root' ? '根目录' : name}</span>
                  <span className="opacity-60">({count})</span>
                </div>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
          <span className="font-medium">提示：</span>拖动节点调整位置 · 滚动缩放 · 单击聚焦 · 双击打开
        </div>
        </div>

        {/* Orphan Panel (Sidebar) */}
        {showOrphanPanel && (
          <OrphanPanel
            orphans={orphanNodes}
            onFocusOrphan={handleFocusOrphan}
            onCreateLink={handleCreateLink}
            onAddTag={handleAddTag}
            onClose={() => setShowOrphanPanel(false)}
          />
        )}
      </div>
    </PageContent>
  );
}
