import type { Edge, Connection } from '@xyflow/react';
import { ConnectionPattern } from '../utils/patternValidation';

// Extend the Edge type to include pattern information
export interface EventModelingEdge extends Edge {
  data?: {
    patternType?: ConnectionPattern;
    condition?: string;
    priority?: number;
    notes?: string;
  };
}

// Extend the Connection type to include pattern information
export interface EventModelingConnection extends Connection {
  data?: {
    patternType?: ConnectionPattern;
    condition?: string;
    priority?: number;
    notes?: string;
  };
}

// Edge condition types
export type EdgeCondition = {
  expression: string;
  description?: string;
};

// Edge priorities for automation patterns
export const EdgePriority = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  CRITICAL: 3
} as const;

export type EdgePriorityType = typeof EdgePriority[keyof typeof EdgePriority];
