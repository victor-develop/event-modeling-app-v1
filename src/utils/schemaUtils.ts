import { getSchemaState } from '../state/schemaState';
import type { SchemaData, BlockInfo } from '../types/schema';

/**
 * Exports the current schema data and block registry to the provided export data object
 * @param exportData The export data object to add schema information to
 * @returns The updated export data with schema information
 */
export const addSchemaToExport = (exportData: any) => {
  const state = getSchemaState();
  if (!state) return exportData;

  const { schemaData, blockRegistry } = state;
  
  return {
    ...exportData,
    schemaData,
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
  
  // Import schema data if it exists
  if (importedData.schemaData) {
    // Ensure schema data has the correct type
    const typedSchemaData: SchemaData = {
      code: typeof importedData.schemaData?.code === 'string' ? importedData.schemaData.code : '',
      libraries: typeof importedData.schemaData?.libraries === 'string' ? importedData.schemaData.libraries : ''
    };
    updateSchema(typedSchemaData, 'import');
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
  if (importedData.schemas && !importedData.schemaData) {
    // Convert old format to new format
    let combinedCode = '';
    
    // Extract all schemas and combine them
    Object.entries(importedData.schemas).forEach(([blockId, schemaData]: [string, any]) => {
      if (typeof schemaData?.code === 'string' && schemaData.code.trim()) {
        combinedCode += `\n\n${schemaData.code}`;
      }
    });
    
    if (combinedCode) {
      updateSchema(
        {
          code: combinedCode.trim(),
          libraries: '',
        },
        'import',
      );
    }
  }
};
