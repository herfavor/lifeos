/**
 * Graph Canvas Component
 * Interactive D3 force-directed graph visualization
 */

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { GraphData, SimulationNode, SimulationEdge } from '../../utils/graphDataProcessor';
import { createForceSimulation, stopSimulation } from '../../utils/graphSimulation';
import {
  calculateAllLinkStrengths,
  getEdgeKey,
  getLinkOpacity,
} from '../../utils/graphLinkStrength';
import type { SearchResult } from '../../utils/graphSearch';
import { getSearchHighlightStyle } from '../../utils/graphSearch';

interface GraphCanvasProps {
  data: GraphData;
  onNodeClick?: (nodeId: string, nodeType: 'note' | 'tag') => void;
  onNodeDoubleClick?: (nodeId: string, nodeType: 'note' | 'tag') => void;
  focusNodeId?: string | null;
  width?: number;
  height?: number;
  searchResult?: SearchResult | null;
  showLinkStrength?: boolean;
  orphanIds?: Set<string>;
}

export function GraphCanvas({
  data,
  onNodeClick,
  onNodeDoubleClick,
  focusNodeId,
  width = 1200,
  height = 800,
  searchResult = null,
  showLinkStrength = false,
  orphanIds = new Set(),
}: GraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const fitGraphRef = useRef<() => void>(() => undefined);
  const [isSimulating, setIsSimulating] = useState(true);

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;
    setIsSimulating(true);

    const linkStrengthMap = showLinkStrength
      ? calculateAllLinkStrengths(data.edges)
      : new Map();

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const g = svg.append('g');

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const fitGraph = (animated = true) => {
      try {
        const bounds = (g.node() as SVGGElement | null)?.getBBox();
        if (!bounds || bounds.width <= 0 || bounds.height <= 0) return;
        const padding = 72;
        const scale = Math.min(
          2.1,
          Math.max(
            0.3,
            Math.min(
              (width - padding * 2) / bounds.width,
              (height - padding * 2) / bounds.height
            )
          )
        );
        const tx = width / 2 - scale * (bounds.x + bounds.width / 2);
        const ty = height / 2 - scale * (bounds.y + bounds.height / 2);
        const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);
        if (animated) {
          svg.transition().duration(240).call(zoom.transform as any, transform);
        } else {
          svg.call(zoom.transform, transform);
        }
      } catch {
        // getBBox is unavailable in some test DOMs. forceCenter still gives a
        // usable fallback and the explicit fit button remains available.
      }
    };
    fitGraphRef.current = () => fitGraph(true);

    const simulation = createForceSimulation(data.nodes, data.edges, width, height);

    svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 20)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 5)
      .attr('markerHeight', 5)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', 'var(--border-light)')
      .attr('class', 'dark:fill-border-dark');

    const link = g
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(data.edges)
      .join('line')
      .attr('stroke', (d) => {
        if (showLinkStrength) {
          const key = getEdgeKey(d.source as string, d.target as string);
          const strengthInfo = linkStrengthMap.get(key);
          if (strengthInfo?.isTagBased) return 'var(--border-light)';
        }
        return d.type === 'backlink' ? 'var(--accent-primary)' : 'var(--border-light)';
      })
      .attr('stroke-opacity', (d) => {
        if (showLinkStrength) {
          const key = getEdgeKey(d.source as string, d.target as string);
          const strengthInfo = linkStrengthMap.get(key);
          if (strengthInfo) return getLinkOpacity(strengthInfo);
        }
        return d.type === 'backlink' ? 0.45 : 0.28;
      })
      .attr('stroke-width', (d) => {
        if (showLinkStrength) {
          const key = getEdgeKey(d.source as string, d.target as string);
          const strengthInfo = linkStrengthMap.get(key);
          if (strengthInfo) return strengthInfo.thickness;
        }
        return d.type === 'backlink' ? 1.5 : 1;
      })
      .attr('stroke-dasharray', (d) => {
        if (showLinkStrength) {
          const key = getEdgeKey(d.source as string, d.target as string);
          const strengthInfo = linkStrengthMap.get(key);
          if (strengthInfo?.isDashed) return '4,4';
        }
        return 'none';
      })
      .attr('marker-end', (d) => (d.type === 'backlink' ? 'url(#arrowhead)' : ''))
      .attr('class', 'dark:stroke-border-dark');

    const node = g
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(data.nodes)
      .join('g')
      .attr('cursor', 'pointer');

    const dragBehavior = d3
      .drag<SVGGElement, SimulationNode>()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.16).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        // Keep the user's placement for this render. A graph that immediately
        // springs back after drag feels broken; rerender/reset layout releases it.
        d.fx = event.x;
        d.fy = event.y;
      });

    (node as d3.Selection<SVGGElement, SimulationNode, SVGGElement, unknown>).call(dragBehavior);

    node
      .append('circle')
      .attr('r', (d) => {
        const highlightStyle = getSearchHighlightStyle(d.id, searchResult);
        if (focusNodeId && d.id === focusNodeId) return d.size * 1.25;
        return d.size * highlightStyle.scale;
      })
      .attr('fill', (d) => d.color)
      .attr('stroke', (d) => {
        if (focusNodeId && d.id === focusNodeId) return 'var(--accent-primary)';
        if (orphanIds.has(d.id)) return 'var(--border-light)';
        return 'var(--surface-light)';
      })
      .attr('stroke-width', (d) => {
        const highlightStyle = getSearchHighlightStyle(d.id, searchResult);
        if (focusNodeId && d.id === focusNodeId) return 3;
        if (orphanIds.has(d.id)) return 2;
        return highlightStyle.strokeWidth;
      })
      .attr('opacity', (d) => getSearchHighlightStyle(d.id, searchResult).opacity)
      .attr('class', 'dark:stroke-surface-dark transition-all duration-300');

    const labels = node
      .append('text')
      .text((d) => (d.label.length > 18 ? `${d.label.slice(0, 17)}…` : d.label))
      .attr('x', 0)
      .attr('y', (d) => d.size + 15)
      .attr('text-anchor', 'middle')
      .attr('opacity', (d) => getSearchHighlightStyle(d.id, searchResult).opacity)
      .attr('class', 'text-[11px] fill-text-light-secondary dark:fill-text-dark-secondary')
      .attr('pointer-events', 'none');

    node.append('title').text((d) => {
      const parts: string[] = [d.label];
      if (d.connections !== undefined) parts.push(`${d.connections} 个连接`);
      if (d.type === 'note' && d.metadata.tags && d.metadata.tags.length > 0) {
        parts.push(`标签：${d.metadata.tags[0]}`);
      }
      if (d.type === 'note' && d.metadata.folder) parts.push(`文件夹：${d.metadata.folder}`);
      return parts.join('\n');
    });

    node.on('click', (event, d) => {
      event.stopPropagation();
      onNodeClick?.(d.id, d.type);
    });

    node.on('dblclick', (event, d) => {
      event.stopPropagation();
      onNodeDoubleClick?.(d.id, d.type);
    });

    node.on('mouseenter', function () {
      d3.select(this).select('circle').attr('stroke-width', 3);
      d3.select(this).select('text').attr('class', 'text-[11px] font-medium fill-text-light-primary dark:fill-text-dark-primary');
    });

    node.on('mouseleave', function (_event, d) {
      const widthForNode = focusNodeId && d.id === focusNodeId ? 3 : orphanIds.has(d.id) ? 2 : 1.5;
      d3.select(this).select('circle').attr('stroke-width', widthForNode);
      labels.attr('class', 'text-[11px] fill-text-light-secondary dark:fill-text-dark-secondary');
    });

    let firstFitDone = false;
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d as unknown as SimulationEdge).source.x ?? 0)
        .attr('y1', (d) => (d as unknown as SimulationEdge).source.y ?? 0)
        .attr('x2', (d) => (d as unknown as SimulationEdge).target.x ?? 0)
        .attr('y2', (d) => (d as unknown as SimulationEdge).target.y ?? 0);

      node.attr('transform', (d) => {
        const simNode = d as SimulationNode;
        return `translate(${simNode.x ?? 0},${simNode.y ?? 0})`;
      });

      // Give the user a useful composition quickly instead of waiting for a
      // long simulation to fully cool before fitting the graph.
      if (!firstFitDone && simulation.alpha() < 0.35) {
        firstFitDone = true;
        fitGraph(false);
      }
    });

    simulation.on('end', () => {
      setIsSimulating(false);
      fitGraph(false);
    });

    return () => {
      fitGraphRef.current = () => undefined;
      stopSimulation(simulation);
    };
  }, [data, width, height, onNodeClick, onNodeDoubleClick, focusNodeId, searchResult, showLinkStrength, orphanIds]);

  return (
    <div className="relative h-full min-h-[420px] w-full">
      <div className="absolute right-3 top-3 z-10 flex items-center gap-2">
        {isSimulating && (
          <span className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">正在布局…</span>
        )}
        <button
          type="button"
          onClick={() => fitGraphRef.current()}
          className="rounded-lg border border-border-light bg-surface-light/90 px-2.5 py-1.5 text-xs font-medium text-text-light-secondary hover:text-accent-primary dark:border-border-dark dark:bg-surface-dark/90 dark:text-text-dark-secondary"
        >
          适应屏幕
        </button>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full min-h-[420px] w-full rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark"
      />
    </div>
  );
}
