import { useCallback } from 'react';
import { useSchemaState } from '../state/schemaState';
import { PassedSchema } from 'graphql-editor';
import type { BlockInfo } from '../types/schema';

/**
 * Custom hook for handling schema import and export functionality
 * This hook provides functions to integrate with the existing import/export flow
 */
export const useSchemaImportExport = () => {
  const { schema, updateSchema, syncSchemaWithBlocks } = useSchemaState();

  /**
   * Adds schema data to the export object
   * @param exportData The export data object
   * @param blocks Current blocks from React Flow nodes
   * @returns Updated export data with schema information
   */
  const addSchemaToExport = useCallback((exportData: any, blocks: BlockInfo[]) => {
    return {
      ...exportData,
      schema,
      blocks
    };
  }, [schema]);

  /**
   * Imports schema data from imported data
   * @param importedData The imported data containing schema information
   * @returns Imported blocks if any exist
   */
  const importSchemaFromData = useCallback((importedData: any): BlockInfo[] => {
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
    
    // Handle legacy schemas format (for backward compatibility)
    if (importedData.schemas && !importedData.schemaData && !importedData.schema) {
      let combinedCode = '';
      
      // Extract all schemas and combine them
      Object.entries(importedData.schemas).forEach(([_, schemaData]: [string, any]) => {
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
  }, [updateSchema, syncSchemaWithBlocks]);

  return {
    addSchemaToExport,
    importSchemaFromData
  };
};
