/**
 * Type definitions for schema-related functionality
 */
import type { DocumentNode } from 'graphql';

/**
 * Source of a schema change to track bidirectional updates
 */
export type SchemaChangeSource = 'ui' | 'schema-editor' | 'initialization' | 'import' | null;

/**
 * Schema data structure with code and libraries
 */
export interface SchemaData {
  code: string;
  libraries?: string;
}

/**
 * Block information for schema generation
 */
export interface BlockInfo {
  id: string;
  title: string;
  type: 'command' | 'event' | 'view';
}

/**
 * Schema preservation result
 */
export interface SchemaPreservationResult {
  success: boolean;
  schema: string;
  error?: Error;
}

/**
 * Type name update operation
 */
export interface TypeNameUpdate {
  oldName: string;
  newName: string;
  blockType: 'command' | 'event' | 'view';
  recreateIfMissing?: boolean; // Flag to recreate the type if it doesn't exist in the schema
}

/**
 * Schema state with change tracking
 */
export interface SchemaState {
  schemaData: SchemaData;
  blockRegistry: BlockInfo[];
  changeSource: SchemaChangeSource;
  updateSchema: (data: SchemaData, source: SchemaChangeSource) => void;
  registerBlock: (block: BlockInfo) => void;
  unregisterBlock: (blockId: string) => void;
  updateBlockTitle: (blockId: string, newTitle: string) => void;
  generateSchema: () => string;
  getSchemaAST: () => DocumentNode | null;
}
