import { useCallback } from 'react';
import { useSchemaState } from '../state/schemaState';

/**
 * Custom hook for handling schema import and export functionality
 * This hook provides functions to integrate with the existing import/export flow
 */
export const useSchemaImportExport = () => {
  const { schemaData, blockRegistry, updateSchema, registerBlock } = useSchemaState();

  /**
   * Adds schema data to the export object
   * @param exportData The export data object
   * @returns Updated export data with schema information
   */
  const addSchemaToExport = useCallback((exportData: any) => {
    return {
      ...exportData,
      schemaData,
      blockRegistry
    };
  }, [schemaData, blockRegistry]);

  /**
   * Imports schema data from imported data
   * @param importedData The imported data containing schema information
   */
  const importSchemaFromData = useCallback((importedData: any) => {
    // Import schema data if it exists
    if (importedData.schemaData) {
      // Ensure schema data has the correct type
      const typedSchemaData = {
        code: typeof importedData.schemaData?.code === 'string' ? importedData.schemaData.code : '',
        libraries: typeof importedData.schemaData?.libraries === 'string' ? importedData.schemaData.libraries : ''
      };
      updateSchema(typedSchemaData, 'import');
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
        updateSchema({
          code: combinedCode.trim(),
          libraries: ''
        }, 'import');
      }
    }
  }, [updateSchema, registerBlock]);

  return {
    addSchemaToExport,
    importSchemaFromData
  };
};
