import { useCallback } from 'react';
import { useSchemaState } from '../state/schemaState';
import { PassedSchema } from 'graphql-editor';

/**
 * Custom hook for handling schema import and export functionality
 * This hook provides functions to integrate with the existing import/export flow
 */
export const useSchemaImportExport = () => {
  const { schema, blockRegistry, updateSchema, registerBlock } = useSchemaState();

  /**
   * Adds schema data to the export object
   * @param exportData The export data object
   * @returns Updated export data with schema information
   */
  const addSchemaToExport = useCallback((exportData: any) => {
    return {
      ...exportData,
      schema,
      blockRegistry
    };
  }, [schema, blockRegistry]);

  /**
   * Imports schema data from imported data
   * @param importedData The imported data containing schema information
   */
  const importSchemaFromData = useCallback((importedData: any) => {
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
      // Clear existing registry by recreating it
      const newRegistry = [...importedData.blockRegistry]
        .filter(block => block.id && block.title && block.type)
        .map(block => ({
          id: block.id,
          title: block.title,
          type: block.type as 'command' | 'event' | 'view'
        }));
      
      // Register all blocks in the registry
      newRegistry.forEach(block => {
        registerBlock(block);
      });
    }
    
    // Handle legacy schemas format (for backward compatibility)
    if (importedData.schemas && !importedData.schemaData && !importedData.schema) {
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
  }, [updateSchema, registerBlock]);

  return {
    addSchemaToExport,
    importSchemaFromData
  };
};
