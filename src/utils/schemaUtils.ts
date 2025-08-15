import { getSchemaState } from '../state/schemaState';
import { PassedSchema } from 'graphql-editor';
import type { BlockInfo } from '../types/schema';

/**
 * Exports the current schema data and block registry to the provided export data object
 * @param exportData The export data object to add schema information to
 * @returns The updated export data with schema information
 */
export const addSchemaToExport = (exportData: any) => {
  const state = getSchemaState();
  if (!state) return exportData;

  const { schema, blockRegistry } = state;
  
  return {
    ...exportData,
    schema,
    blockRegistry
  };
};

/**
 * Imports schema data and block registry from imported data
 * @param importedData The imported data containing schema information
 */
export const importSchemaFromData = (importedData: any) => {
  const state = getSchemaState();
  if (!state) return;

  const { updateSchema, registerBlock } = state;
  
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
  
  // Import block registry if it exists
  if (importedData.blockRegistry && Array.isArray(importedData.blockRegistry)) {
    // Register all blocks in the registry
    importedData.blockRegistry.forEach((block: any) => {
      if (block.id && block.title && block.type) {
        const typedBlock: BlockInfo = {
          id: block.id,
          title: block.title,
          type: block.type as 'command' | 'event' | 'view'
        };
        registerBlock(typedBlock);
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
};
