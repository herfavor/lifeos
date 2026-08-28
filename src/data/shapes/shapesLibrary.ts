/**
 * Shape Library Data
 * Pre-built shapes for diagrams (flowcharts, UML, network, etc.)
 */

import type { ShapeDefinition, ShapeLibrary } from '../../types/shapes';

// ============================================================================
// FLOWCHART SHAPES (P0 - Priority 1)
// ============================================================================

export const flowchartShapes: ShapeDefinition[] = [
  // Process / Action
  {
    id: 'flowchart-process',
    name: '流程',
    category: 'flowchart',
    keywords: ['process', 'action', 'step', 'rectangle', 'task'],
    thumbnail: 'rectangle',
    primitiveType: 'rectangle',
    defaultProps: {
      type: 'shape',
      width: 120,
      height: 60,
      fill: 'var(--accent-cyan)',
      stroke: 'var(--accent-cyan)',
      strokeWidth: 2,
      cornerRadius: 4,
      zIndex: 1,
    },
  },

  // Decision / Branch
  {
    id: 'flowchart-decision',
    name: '判断',
    category: 'flowchart',
    keywords: ['decision', 'if', 'branch', 'diamond', 'condition'],
    thumbnail: 'diamond',
    pathData: 'M 60 0 L 120 40 L 60 80 L 0 40 Z',
    defaultProps: {
      type: 'shape',
      width: 120,
      height: 80,
      fill: 'var(--accent-purple)',
      stroke: 'var(--accent-purple)',
      strokeWidth: 2,
      zIndex: 1,
    },
  },

  // Data / Input/Output
  {
    id: 'flowchart-data',
    name: '数据',
    category: 'flowchart',
    keywords: ['data', 'input', 'output', 'parallelogram', 'io'],
    thumbnail: 'parallelogram',
    pathData: 'M 20 0 L 120 0 L 100 60 L 0 60 Z',
    defaultProps: {
      type: 'shape',
      width: 120,
      height: 60,
      fill: 'var(--accent-magenta)',
      stroke: 'var(--accent-magenta)',
      strokeWidth: 2,
      zIndex: 1,
    },
  },

  // Terminator / Start/End
  {
    id: 'flowchart-terminator',
    name: '起止',
    category: 'flowchart',
    keywords: ['terminator', 'start', 'end', 'rounded', 'pill'],
    thumbnail: 'rounded-rectangle',
    primitiveType: 'rectangle',
    defaultProps: {
      type: 'shape',
      width: 120,
      height: 60,
      fill: 'hsl(150, 70%, 55%)', // Green
      stroke: 'hsl(150, 70%, 55%)',
      strokeWidth: 2,
      cornerRadius: 30, // Fully rounded ends
      zIndex: 1,
    },
  },

  // Document
  {
    id: 'flowchart-document',
    name: '文档',
    category: 'flowchart',
    keywords: ['document', 'file', 'paper', 'wavy'],
    thumbnail: 'document',
    pathData: 'M 0 0 L 120 0 L 120 48 Q 90 58 60 48 Q 30 38 0 48 Z',
    defaultProps: {
      type: 'shape',
      width: 120,
      height: 60,
      fill: 'hsl(30, 70%, 55%)', // Orange
      stroke: 'hsl(30, 70%, 55%)',
      strokeWidth: 2,
      zIndex: 1,
    },
  },

  // Manual Input
  {
    id: 'flowchart-manual-input',
    name: '手动输入',
    category: 'flowchart',
    keywords: ['manual', 'input', 'keyboard', 'trapezoid'],
    thumbnail: 'trapezoid',
    pathData: 'M 0 15 L 120 0 L 120 60 L 0 60 Z',
    defaultProps: {
      type: 'shape',
      width: 120,
      height: 60,
      fill: 'hsl(270, 70%, 55%)', // Purple
      stroke: 'hsl(270, 70%, 55%)',
      strokeWidth: 2,
      zIndex: 1,
    },
  },

  // Display / Output
  {
    id: 'flowchart-display',
    name: '显示',
    category: 'flowchart',
    keywords: ['display', 'output', 'screen', 'monitor'],
    thumbnail: 'display',
    pathData: 'M 0 0 Q 10 30 0 60 L 100 60 Q 120 30 100 0 Z',
    defaultProps: {
      type: 'shape',
      width: 120,
      height: 60,
      fill: 'hsl(200, 70%, 55%)', // Cyan
      stroke: 'hsl(200, 70%, 55%)',
      strokeWidth: 2,
      zIndex: 1,
    },
  },

  // Preparation
  {
    id: 'flowchart-preparation',
    name: '准备',
    category: 'flowchart',
    keywords: ['preparation', 'setup', 'hexagon'],
    thumbnail: 'hexagon',
    pathData: 'M 30 0 L 90 0 L 120 30 L 90 60 L 30 60 L 0 30 Z',
    defaultProps: {
      type: 'shape',
      width: 120,
      height: 60,
      fill: 'hsl(330, 70%, 55%)', // Magenta
      stroke: 'hsl(330, 70%, 55%)',
      strokeWidth: 2,
      zIndex: 1,
    },
  },

  // Delay
  {
    id: 'flowchart-delay',
    name: '延迟',
    category: 'flowchart',
    keywords: ['delay', 'wait', 'pause', 'semi-circle'],
    thumbnail: 'delay',
    pathData: 'M 0 0 L 90 0 Q 120 30 90 60 L 0 60 Z',
    defaultProps: {
      type: 'shape',
      width: 120,
      height: 60,
      fill: 'hsl(60, 70%, 55%)', // Yellow
      stroke: 'hsl(60, 70%, 55%)',
      strokeWidth: 2,
      zIndex: 1,
    },
  },
];

// ============================================================================
// BASIC SHAPES (P0 - Priority 1)
// ============================================================================

export const basicShapes: ShapeDefinition[] = [
  // Square
  {
    id: 'basic-square',
    name: '方形',
    category: 'basic',
    keywords: ['square', 'rectangle', 'box'],
    thumbnail: 'square',
    primitiveType: 'rectangle',
    defaultProps: {
      type: 'shape',
      width: 80,
      height: 80,
      fill: 'transparent',
      stroke: 'var(--text-light-primary)',
      strokeWidth: 2,
      zIndex: 1,
    },
  },

  // Circle
  {
    id: 'basic-circle',
    name: '圆形',
    category: 'basic',
    keywords: ['circle', 'round', 'dot'],
    thumbnail: 'circle',
    primitiveType: 'circle',
    defaultProps: {
      type: 'shape',
      width: 80,
      height: 80,
      fill: 'transparent',
      stroke: 'var(--text-light-primary)',
      strokeWidth: 2,
      zIndex: 1,
    },
  },

  // Triangle
  {
    id: 'basic-triangle',
    name: '三角形',
    category: 'basic',
    keywords: ['triangle', 'arrow', 'point'],
    thumbnail: 'triangle',
    pathData: 'M 40 0 L 80 80 L 0 80 Z',
    defaultProps: {
      type: 'shape',
      width: 80,
      height: 80,
      fill: 'transparent',
      stroke: 'var(--text-light-primary)',
      strokeWidth: 2,
      zIndex: 1,
    },
  },

  // Diamond
  {
    id: 'basic-diamond',
    name: '菱形',
    category: 'basic',
    keywords: ['diamond', 'rhombus'],
    thumbnail: 'diamond',
    pathData: 'M 40 0 L 80 40 L 40 80 L 0 40 Z',
    defaultProps: {
      type: 'shape',
      width: 80,
      height: 80,
      fill: 'transparent',
      stroke: 'var(--text-light-primary)',
      strokeWidth: 2,
      zIndex: 1,
    },
  },

  // Pentagon
  {
    id: 'basic-pentagon',
    name: '五边形',
    category: 'basic',
    keywords: ['pentagon', '5-sided'],
    thumbnail: 'pentagon',
    pathData: 'M 40 0 L 80 30 L 64 80 L 16 80 L 0 30 Z',
    defaultProps: {
      type: 'shape',
      width: 80,
      height: 80,
      fill: 'transparent',
      stroke: 'var(--text-light-primary)',
      strokeWidth: 2,
      zIndex: 1,
    },
  },

  // Hexagon
  {
    id: 'basic-hexagon',
    name: '六边形',
    category: 'basic',
    keywords: ['hexagon', '6-sided'],
    thumbnail: 'hexagon',
    pathData: 'M 20 0 L 60 0 L 80 40 L 60 80 L 20 80 L 0 40 Z',
    defaultProps: {
      type: 'shape',
      width: 80,
      height: 80,
      fill: 'transparent',
      stroke: 'var(--text-light-primary)',
      strokeWidth: 2,
      zIndex: 1,
    },
  },

  // Star
  {
    id: 'basic-star',
    name: '星形',
    category: 'basic',
    keywords: ['star', '5-point', 'favorite'],
    thumbnail: 'star',
    pathData: 'M 40 0 L 50 30 L 80 30 L 55 50 L 65 80 L 40 60 L 15 80 L 25 50 L 0 30 L 30 30 Z',
    defaultProps: {
      type: 'shape',
      width: 80,
      height: 80,
      fill: 'transparent',
      stroke: 'var(--text-light-primary)',
      strokeWidth: 2,
      zIndex: 1,
    },
  },

  // Arrow (right)
  {
    id: 'basic-arrow',
    name: '箭头',
    category: 'basic',
    keywords: ['arrow', 'pointer', 'direction', 'right'],
    thumbnail: 'arrow',
    pathData: 'M 0 20 L 60 20 L 60 0 L 100 30 L 60 60 L 60 40 L 0 40 Z',
    defaultProps: {
      type: 'shape',
      width: 100,
      height: 60,
      fill: 'transparent',
      stroke: 'var(--text-light-primary)',
      strokeWidth: 2,
      zIndex: 1,
    },
  },
];

// ============================================================================
// UML SHAPES (P2 - Deferred)
// ============================================================================

export const umlShapes: ShapeDefinition[] = [];

// ============================================================================
// EXTENDED SHAPES (P2)
// ============================================================================

import {
  cloudComputingShapes,
  peopleShapes,
  networkShapesExtended,
  dataFlowShapes,
  chartShapes,
} from './diagram-shapes-extended';

// ============================================================================
// SHAPE LIBRARY EXPORT
// ============================================================================

export const shapeLibrary: ShapeLibrary = {
  flowchart: flowchartShapes,
  basic: basicShapes,
  uml: umlShapes,
  network: networkShapesExtended,
  'cloud-computing': cloudComputingShapes,
  people: peopleShapes,
  'data-flow': dataFlowShapes,
  charts: chartShapes,
};

// Helper function to get shape by ID
export function getShapeDefinition(shapeId: string): ShapeDefinition | undefined {
  const allShapes = [
    ...flowchartShapes,
    ...basicShapes,
    ...umlShapes,
    ...networkShapesExtended,
    ...cloudComputingShapes,
    ...peopleShapes,
    ...dataFlowShapes,
    ...chartShapes,
  ];
  return allShapes.find((shape) => shape.id === shapeId);
}

// Helper function to search shapes
export function searchShapes(query: string): ShapeDefinition[] {
  const lowerQuery = query.toLowerCase();
  const allShapes = [
    ...flowchartShapes,
    ...basicShapes,
    ...umlShapes,
    ...networkShapesExtended,
    ...cloudComputingShapes,
    ...peopleShapes,
    ...dataFlowShapes,
    ...chartShapes,
  ];

  return allShapes.filter(
    (shape) =>
      shape.name.toLowerCase().includes(lowerQuery) ||
      shape.keywords.some((keyword) => keyword.toLowerCase().includes(lowerQuery))
  );
}
