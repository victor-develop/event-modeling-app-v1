import React from 'react';
import { getEdgeStyle as centralizedGetEdgeStyle } from './edgeStyling';

// Connection validation types
export const ConnectionPattern = {
  COMMAND_PATTERN: 'command_pattern', // Trigger -> Command -> Event
  VIEW_PATTERN: 'view_pattern', // Event -> View
  AUTOMATION_PATTERN: 'automation_pattern', // Event -> Command
  UI_PATTERN: 'ui_pattern', // View -> UI, UI -> Command
  PROCESSOR_PATTERN: 'processor_pattern', // Event/View -> Processor, Processor -> Command
} as const;

export type ConnectionPattern = typeof ConnectionPattern[keyof typeof ConnectionPattern];

export type ConnectionPatternValidation = {
  sourceNodeTypes: string[];
  targetNodeTypes: string[];
  pattern: ConnectionPattern;
  description: string;
};

// Define valid connection patterns
export const validConnectionPatterns: ConnectionPatternValidation[] = [
  // Command Pattern connections
  {
    sourceNodeTypes: ['trigger'],
    targetNodeTypes: ['command'],
    pattern: ConnectionPattern.COMMAND_PATTERN,
    description: 'Trigger can initiate a Command'
  },
  {
    sourceNodeTypes: ['command'],
    targetNodeTypes: ['event'],
    pattern: ConnectionPattern.COMMAND_PATTERN,
    description: 'Command can produce an Event'
  },
  
  // View Pattern connections
  {
    sourceNodeTypes: ['event'],
    targetNodeTypes: ['view'],
    pattern: ConnectionPattern.VIEW_PATTERN,
    description: 'Event can be displayed in a View'
  },
  // UI Pattern connections
  {
    sourceNodeTypes: ['view'],
    targetNodeTypes: ['UI'],
    pattern: ConnectionPattern.UI_PATTERN,
    description: 'View can connect to UI block'
  },
  {
    sourceNodeTypes: ['UI'],
    targetNodeTypes: ['command'],
    pattern: ConnectionPattern.UI_PATTERN,
    description: 'UI block can connect to Command'
  },
  // Processor Pattern connections
  {
    sourceNodeTypes: ['event'],
    targetNodeTypes: ['Processor'],
    pattern: ConnectionPattern.PROCESSOR_PATTERN,
    description: 'Event can connect to Processor block'
  },
  {
    sourceNodeTypes: ['view'],
    targetNodeTypes: ['Processor'],
    pattern: ConnectionPattern.PROCESSOR_PATTERN,
    description: 'View can connect to Processor block'
  },
  {
    sourceNodeTypes: ['Processor'],
    targetNodeTypes: ['command'],
    pattern: ConnectionPattern.PROCESSOR_PATTERN,
    description: 'Processor block can connect to Command'
  },

  // Automation Pattern connections
  {
    sourceNodeTypes: ['event'],
    targetNodeTypes: ['command'],
    pattern: ConnectionPattern.AUTOMATION_PATTERN,
    description: 'Event can automatically trigger a Command'
  },
];

/**
 * Type for simplified Node objects to make testing easier
 */
export type SimpleNode = {
  id: string;
  type?: string;
  [key: string]: any;
};

/**
 * Checks if a connection is valid according to the defined patterns
 */
export const isValidConnection = (
  sourceNode: SimpleNode | null,
  targetNode: SimpleNode | null
): { valid: boolean; message: string } => {
  if (!sourceNode || !targetNode) {
    return { valid: false, message: 'Source or target node not found' };
  }
  
  const sourceType = sourceNode.type;
  const targetType = targetNode.type;
  
  // Check against valid connection patterns
  const validPattern = validConnectionPatterns.find(
    pattern => 
      pattern.sourceNodeTypes.includes(sourceType || '') &&
      pattern.targetNodeTypes.includes(targetType || '')
  );
  
  if (validPattern) {
    return { valid: true, message: validPattern.description };
  }
  
  return { 
    valid: false, 
    message: `Invalid connection: ${sourceType} cannot connect to ${targetType}` 
  };
};

/**
 * Determines the pattern type of a connection
 */
export const getConnectionPatternType = (
  sourceNode: SimpleNode | null,
  targetNode: SimpleNode | null
): ConnectionPattern | null => {
  if (!sourceNode || !targetNode) {
    return null;
  }
  
  // For Event -> Command connections we have the Automation Pattern
  
  // Find the first matching pattern for other connections
  const matchingPattern = validConnectionPatterns.find(
    pattern => 
      pattern.sourceNodeTypes.includes(sourceNode.type || '') &&
      pattern.targetNodeTypes.includes(targetNode.type || '')
  );
  
  return matchingPattern ? matchingPattern.pattern : null;
};

/**
 * Get edge style based on the connection pattern
 * @deprecated Use the centralized getEdgeStyle from edgeStyling.ts instead
 */
export const getEdgeStyle = (
  sourceNode: SimpleNode | null,
  targetNode: SimpleNode | null
): React.CSSProperties => {
  // Get the pattern type and use the centralized function
  const patternType = getConnectionPatternType(sourceNode, targetNode);
  return centralizedGetEdgeStyle(patternType || undefined);
};
