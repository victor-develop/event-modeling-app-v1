/**
 * Defines the kinds of swimlanes available in the Event Modeling application
 */
export const SwimlaneKind = {
  EVENT: 'event',
  COMMAND_VIEW: 'command_view',
  TRIGGER: 'trigger'
} as const;

export type SwimlaneKind = typeof SwimlaneKind[keyof typeof SwimlaneKind];

/**
 * Data structure for swimlane nodes
 */
export interface SwimlaneNodeData {
  label: string;
  kind: SwimlaneKind;
  color?: string; // Optional color override
}

/**
 * Defines which block types are allowed in each swimlane kind
 */
export const ALLOWED_BLOCK_TYPES: Record<string, string[]> = {
  'event': ['Event'],
  'command_view': ['Command', 'View'],
  'trigger': ['Trigger', 'UI', 'Processor']
};

/**
 * Returns user-friendly label for swimlane kinds
 */
export const SWIMLANE_KIND_LABELS: Record<string, string> = {
  'event': 'Events',
  'command_view': 'Commands & Read Models',
  'trigger': 'Triggers & User Interface'
};

/**
 * Returns color for each swimlane kind
 */
export const SWIMLANE_KIND_COLORS: Record<string, string> = {
  'event': 'rgba(255, 240, 200, 0.2)', // Light yellow
  'command_view': 'rgba(200, 240, 255, 0.2)', // Light blue
  'trigger': 'rgba(220, 255, 220, 0.2)' // Light green
};

/**
 * Full props for SwimlaneNode component
 */
export interface SwimlaneNodeProps {
  id: string;
  data: SwimlaneNodeData;
  dispatchAddBlock: (blockData: any) => void;
  dispatchUpdateNodeLabel: (nodeId: string, label: string) => void;
  selected?: boolean; // Added to support focus styling
}
