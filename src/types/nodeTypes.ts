import type { Node as ReactFlowNode, Edge } from '@xyflow/react';

// Extended Node type with positionPerDrop property
export interface Node extends ReactFlowNode {
  positionPerDrop?: { x: number; y: number };
}

// Base node types with common properties
export interface BaseNodeData {
  label: string;
  description?: string;
  notes?: string;
  tags?: string[];
  [key: string]: unknown;
}

// Specific node data types
export interface TriggerNodeData extends BaseNodeData {
  triggerType?: 'user' | 'system' | 'external' | 'time' | 'api';
  actor?: string;
}

export interface CommandNodeData extends BaseNodeData {
  parameters: Record<string, string>;
  validation?: Record<string, string>;
  preconditions?: string[];
}

export interface EventNodeData extends BaseNodeData {
  payload: Record<string, any>;
  version?: string;
  timestamp?: string;
  isExternalEvent?: boolean;
}

export interface ViewNodeData extends BaseNodeData {
  sourceEvents: string[];
  viewType?: 'read' | 'projection' | 'dashboard' | 'report';
  refreshPattern?: 'real-time' | 'scheduled' | 'on-demand';
  permissions?: string[];
}

export interface UINodeData extends BaseNodeData {
  // Add UI node data properties as needed
}

export interface ProcessorNodeData extends BaseNodeData {
  // Add Processor node data properties as needed
}

// Node types with specific data
export interface TriggerNode extends Node {
  type: 'trigger';
  data: TriggerNodeData;
}

export interface CommandNode extends Node {
  type: 'command';
  data: CommandNodeData;
}

export interface EventNode extends Node {
  type: 'event';
  data: EventNodeData;
}

export interface ViewNode extends Node {
  type: 'view';
  data: ViewNodeData;
}

export interface UINode extends Node {
  type: 'UI';
  data: UINodeData;
}

export interface ProcessorNode extends Node {
  type: 'Processor';
  data: ProcessorNodeData;
}

// General Event Modeling node type
export const NodeType = {
  UI: 'UI',
  PROCESSOR: 'Processor',
  TRIGGER: 'trigger',
  COMMAND: 'command',
  EVENT: 'event',
  VIEW: 'view',
};

export type EventModelingNode = 
  | TriggerNode 
  | CommandNode 
  | EventNode 
  | ViewNode 
  | UINode 
  | ProcessorNode;

// Edge data with pattern information
export interface EventModelingEdgeData {
  patternType?: string;
  condition?: string;
  notes?: string;
  isConditional?: boolean;
  [key: string]: unknown;
}

// Edge with pattern information
export interface EventModelingEdge extends Edge {
  data?: EventModelingEdgeData;
}
