/**
 * Graph Simulation Configuration
 * D3 force simulation setup for graph visualization
 */

import * as d3 from 'd3';
import type { GraphNode, GraphEdge } from './graphDataProcessor';

export interface SimulationNode extends GraphNode, d3.SimulationNodeDatum {
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface SimulationLink {
  source: string | SimulationNode;
  target: string | SimulationNode;
  type: 'backlink' | 'tag';
  strength: number;
}

/**
 * Create and configure D3 force simulation.
 *
 * The graph is deliberately a little more spacious than a generic force
 * graph: note titles sit under nodes, so circle-only collision radii make a
 * small knowledge graph look like a pile of labels. The extra collision
 * room keeps the first render readable without forcing the user to drag
 * every node apart.
 */
export function createForceSimulation(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number
): d3.Simulation<SimulationNode, SimulationLink> {
  const simNodes: SimulationNode[] = nodes.map((node) => ({ ...node }));
  const simLinks: SimulationLink[] = edges.map((edge) => ({ ...edge }));

  const simulation = d3
    .forceSimulation<SimulationNode, SimulationLink>(simNodes)
    .force(
      'link',
      d3
        .forceLink<SimulationNode, SimulationLink>(simLinks)
        .id((d) => d.id)
        .distance((d) => (d.type === 'backlink' ? 132 : 176))
        .strength((d) => Math.min(0.75, Math.max(0.16, d.strength)))
    )
    .force('charge', d3.forceManyBody().strength(-320))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force(
      'collision',
      d3
        .forceCollide<SimulationNode>()
        .radius((d) => Math.max(40, d.size + 34))
        .strength(0.9)
        .iterations(2)
    )
    .force('x', d3.forceX(width / 2).strength(0.035))
    .force('y', d3.forceY(height / 2).strength(0.035))
    .alphaDecay(0.035)
    .velocityDecay(0.34);

  return simulation;
}

/**
 * Get simulation data after it has run
 */
export function getSimulationData(
  simulation: d3.Simulation<SimulationNode, SimulationLink>
): {
  nodes: SimulationNode[];
  links: SimulationLink[];
} {
  return {
    nodes: simulation.nodes(),
    links: simulation.force('link') ? (simulation.force('link') as d3.ForceLink<SimulationNode, SimulationLink>).links() : [],
  };
}

/**
 * Restart simulation with new alpha
 */
export function restartSimulation(
  simulation: d3.Simulation<SimulationNode, SimulationLink>,
  alpha: number = 0.3
): void {
  simulation.alpha(alpha).restart();
}

/**
 * Stop simulation
 */
export function stopSimulation(
  simulation: d3.Simulation<SimulationNode, SimulationLink>
): void {
  simulation.stop();
}
