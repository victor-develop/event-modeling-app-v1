/**
 * Block types for Event Modeling app
 */

/**
 * Defines the kinds of blocks available in the Event Modeling application
 */
export const BlockKind = {
  TRIGGER: 'trigger',
  COMMAND: 'command',
  EVENT: 'event',
  VIEW: 'view',
  UI: 'UI',
  PROCESSOR: 'Processor',
} as const;

export type BlockKind = typeof BlockKind[keyof typeof BlockKind];

/**
 * Data structure for block nodes
 */
export type BlockNodeData = {
  id: string;
  label: string;
  kind: string;
  parentId?: string; // Reference to parent swimlane
  extent?: { width: number; height: number };
  details?: Record<string, unknown>; // For additional metadata
};

/**
 * Props for BlockNode component
 */
export interface BlockNodeProps {
  id: string;
  data: BlockNodeData;
  // Props for dispatching events
  onLabelChange: (nodeId: string, label: string) => void;
  onRemove?: (nodeId: string) => void;
  /** Node dimensions from React Flow (use to constrain content and enable text wrap) */
  width?: number;
  height?: number;
}

/**
 * Returns background color for each block kind
 */
export const BLOCK_KIND_COLORS: Record<string, string> = {
  'trigger': 'rgba(210, 250, 210, 0.8)', // Light green
  'command': 'rgba(200, 230, 255, 0.8)', // Light blue
  'event': 'rgba(255, 240, 150, 0.8)', // Light yellow
  'view': 'rgba(240, 240, 240, 0.8)',  // Light gray
  'UI': 'rgba(255, 220, 220, 0.8)', // Light red/pink
  'Processor': 'rgba(230, 210, 255, 0.8)' // Light purple
};

/**
 * Returns border color for each block kind
 */
export const BLOCK_KIND_BORDERS: Record<string, string> = {
  'trigger': '#27ae60', // Green
  'command': '#3498db', // Blue
  'event': '#f1c40f', // Yellow
  'view': '#95a5a6',  // Gray
  'UI': '#e74c3c', // Red
  'Processor': '#9b59b6' // Purple
};

/**
 * Returns icon for each block kind
 */
export const BLOCK_KIND_ICONS: Record<string, string> = {
  'trigger': '🔔', // Bell
  'command': '⚡', // Lightning
  'event': '📊', // Chart
  'view': '👁️' // Eye
};
