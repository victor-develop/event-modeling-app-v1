import { PassedSchema } from 'graphql-editor';
import type { BlockInfo } from '../types/schema';

/**
 * Exports the current schema data and blocks to the provided export data object
 * @param exportData The export data object to add schema information to
 * @param schema Current schema state
 * @param blocks Current blocks from React Flow nodes
 * @returns The updated export data with schema information
 */
export const addSchemaToExport = (exportData: any, schema: PassedSchema, blocks: BlockInfo[]) => {
  return {
    ...exportData,
    schema,
    blocks
  };
};

/**
 * Imports schema data from imported data
 * @param importedData The imported data containing schema information
 * @param updateSchema Function to update the schema state
 * @param syncSchemaWithBlocks Function to sync schema with blocks
 * @returns Imported blocks if any exist
 */
export const importSchemaFromData = (
  importedData: any, 
  updateSchema: (schema: PassedSchema) => void,
  syncSchemaWithBlocks: (blocks: BlockInfo[]) => void
): BlockInfo[] => {
  const importedBlocks: BlockInfo[] = [];
  
  // Import schema data if it exists (support both old 'schemaData' and new 'schema' formats)
  const schemaToImport = importedData.schema || importedData.schemaData;
  if (schemaToImport) {
    // Ensure schema data has the correct PassedSchema type
    const typedSchema: PassedSchema = {
      code: typeof schemaToImport?.code === 'string' ? schemaToImport.code : '',
      libraries: typeof schemaToImport?.libraries === 'string' ? schemaToImport.libraries : '',
      source: 'outside' as const
    };
    updateSchema(typedSchema);
  }
  
  // Import blocks if they exist (new format)
  if (importedData.blocks && Array.isArray(importedData.blocks)) {
    importedData.blocks.forEach((block: any) => {
      if (block.id && block.title && block.type) {
        const typedBlock: BlockInfo = {
          id: block.id,
          title: block.title,
          type: block.type as 'command' | 'event' | 'view'
        };
        importedBlocks.push(typedBlock);
      }
    });
  }
  
  // Import legacy block registry if it exists
  if (importedData.blockRegistry && Array.isArray(importedData.blockRegistry)) {
    importedData.blockRegistry.forEach((block: any) => {
      if (block.id && block.title && block.type) {
        const typedBlock: BlockInfo = {
          id: block.id,
          title: block.title,
          type: block.type as 'command' | 'event' | 'view'
        };
        importedBlocks.push(typedBlock);
      }
    });
  }
  
  // Handle legacy schema format (per-block schemas)
  if (importedData.schemas && !importedData.schemaData && !importedData.schema) {
    // Convert old format to new format
    let combinedCode = '';
    
    // Extract all schemas and combine them
    Object.entries(importedData.schemas).forEach(([blockId, schemaData]: [string, any]) => {
      if (typeof schemaData?.code === 'string' && schemaData.code.trim()) {
        combinedCode += `\n\n${schemaData.code}`;
      }
    });
    
    if (combinedCode) {
      const typedSchema: PassedSchema = {
        code: combinedCode.trim(),
        libraries: '',
        source: 'outside' as const
      };
      updateSchema(typedSchema);
    }
  }
  
  // Sync schema with imported blocks if any exist
  if (importedBlocks.length > 0) {
    syncSchemaWithBlocks(importedBlocks);
  }
  
  return importedBlocks;
};
