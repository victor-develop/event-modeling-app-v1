import React, { createContext, useCallback, useContext, useState } from 'react';
import { PassedSchema } from 'graphql-editor';
import { BlockInfo } from '../types/schema';
import { parseSchema, findTypeNames } from '../utils/schemaPreservation';
import { 
  parseSchemaToAST, 
  generateSchemaFromAST, 
  findTypeByNodeId, 
  addTypeToAST, 
  renameTypeInAST,
  findOrphanedTypes,
  removeTypeFromAST
} from '../graphql-ast-utils';
import { toCamelCase } from '../utils/stringUtils';

// Define the schema state interface
interface SchemaState {
  schema: PassedSchema;
  schemaRenameNotification: string | null;
  updateSchema: (data: PassedSchema) => void;
  syncSchemaWithBlocks: (blocks: BlockInfo[]) => void;
  getSchemaAST: () => ReturnType<typeof parseSchema>;
}

const defaultSchema: PassedSchema = {
  code: `type Query {
  # Add your queries here
  _empty: String
}`,
  libraries: '',
  source: 'outside',
};

const SchemaContext = createContext<SchemaState | undefined>(undefined);

// Type suffix constants to avoid hardcoded strings
const TYPE_SUFFIXES = {
  INPUT: 'Input',
  COMMAND_RESULT: 'CommandResult'
} as const;


// Helper function to generate type definition for a specific type name
const generateTypeDefinition = (typeName: string, blockType: string): string => {
  switch (blockType) {
    case 'command':
      if (typeName.endsWith(TYPE_SUFFIXES.INPUT)) {
        return `input ${typeName} {
  # Define command parameters here
  id: ID!
}`;
      } else if (typeName.endsWith(TYPE_SUFFIXES.COMMAND_RESULT)) {
        return `type ${typeName} {
  # Define command result here
  success: Boolean!
  message: String
}`;
      }
      break;
    case 'event':
      return `type ${typeName} {
  # Define event payload here
  id: ID!
  timestamp: String!
}`;
    case 'view':
      return `type ${typeName} {
  # Define view structure here
  id: ID!
}`;
  }
  return '';
};


// Helper function to generate operation field for a block
const generateOperationField = (block: BlockInfo): string => {
  const typeName = toCamelCase(block.title);
  
  switch (block.type) {
    case 'command':
      return `  ${typeName}(input: ${typeName}${TYPE_SUFFIXES.INPUT}!): ${typeName}${TYPE_SUFFIXES.COMMAND_RESULT}!`;
    case 'view':
      return `  ${typeName}(id: ID!): ${typeName}`;
    default:
      return '';
  }
};


// Helper function to add missing types to existing schema
const addMissingTypeToSchema = (currentSchema: string, block: BlockInfo): string => {
  const requiredTypeNames = getBlockTypeNames(block);
  
  let newTypeDefinition = '';
  let newOperationField = '';
  
  try {
    const ast = parseSchema(currentSchema);
    const existingTypes = findTypeNames(ast);
    const missingTypes = requiredTypeNames.filter(name => !existingTypes.includes(name));
    
    console.log(`[DEBUG] Adding missing types for ${block.title}:`, missingTypes);
    
    if (missingTypes.length === 0) {
      return currentSchema; // Nothing to add
    }
    
    // Generate type definitions for missing types
    const newTypeDefinitions: string[] = [];
    
    missingTypes.forEach(typeName => {
      const typeDefinition = generateTypeDefinition(typeName, block.type);
      if (typeDefinition) {
        newTypeDefinitions.push(typeDefinition);
      }
    });
    
    // Generate operation field if the main type is missing
    const mainTypeName = toCamelCase(block.title);
    if (missingTypes.includes(mainTypeName) && (block.type === 'command' || block.type === 'view')) {
      newOperationField = generateOperationField(block);
    }
    
    newTypeDefinition = newTypeDefinitions.join('\n\n');
  } catch (error) {
    console.error('[DEBUG] Error parsing schema for missing types, adding all:', error);
    // Fallback: generate all types for the block
    const allTypeNames = getBlockTypeNames(block);
    const newTypeDefinitions: string[] = [];
    
    allTypeNames.forEach(typeName => {
      const typeDefinition = generateTypeDefinition(typeName, block.type);
      if (typeDefinition) {
        newTypeDefinitions.push(typeDefinition);
      }
    });
    
    newTypeDefinition = newTypeDefinitions.join('\n\n');
    
    if (block.type === 'command' || block.type === 'view') {
      newOperationField = generateOperationField(block);
    }
  }
  
  // If schema is empty, create basic structure
  if (!currentSchema.trim()) {
    let schema = newTypeDefinition + '\n\n';
    if (block.type === 'view') {
      schema += `type Query {\n${newOperationField}\n}\n\n`;
    } else if (block.type === 'command') {
      schema += `type Mutation {\n${newOperationField}\n}`;
    }
    return schema;
  }
  
  // Add type definitions to existing schema
  let updatedSchema = currentSchema;
  
  if (newTypeDefinition) {
    // Add the new type definitions at the end of existing types
    const queryIndex = updatedSchema.indexOf('type Query');
    const mutationIndex = updatedSchema.indexOf('type Mutation');
    const insertIndex = Math.min(
      queryIndex === -1 ? updatedSchema.length : queryIndex,
      mutationIndex === -1 ? updatedSchema.length : mutationIndex
    );
    
    updatedSchema = updatedSchema.slice(0, insertIndex) + 
      newTypeDefinition + '\n\n' + 
      updatedSchema.slice(insertIndex);
  }
  
  // Add operation field if needed
  if (newOperationField) {
    if (block.type === 'view') {
      // Add to Query type
      if (updatedSchema.includes('type Query')) {
        updatedSchema = updatedSchema.replace(
          /(type Query\s*{[^}]*)(})/,
          `$1${newOperationField}\n$2`
        );
      } else {
        updatedSchema += `\ntype Query {\n${newOperationField}\n}`;
      }
    } else if (block.type === 'command') {
      // Add to Mutation type
      if (updatedSchema.includes('type Mutation')) {
        updatedSchema = updatedSchema.replace(
          /(type Mutation\s*{[^}]*)(})/,
          `$1${newOperationField}\n$2`
        );
      } else {
        updatedSchema += `\ntype Mutation {\n${newOperationField}\n}`;
      }
    }
  }
  
  console.log('[DEBUG] Updated schema with missing types:', updatedSchema);
  return updatedSchema;
};

// Enhanced nodeId-based sync functions

/**
 * Enhanced function to ensure block has corresponding schema type using nodeId tracking
 */
const ensureBlockHasSchemaTypeWithNodeId = (block: BlockInfo, currentSchema: string): string => {
  console.log(`[DEBUG] ===== ensureBlockHasSchemaTypeWithNodeId for block: ${block.title} (${block.type}) =====`);
  
  try {
    const ast = parseSchemaToAST(currentSchema);
    
    // Check if type already exists with this nodeId
    const existingType = findTypeByNodeId(ast, block.id);
    
    if (existingType) {
      console.log(`[DEBUG] Found existing type with nodeId ${block.id}:`, existingType.name);
      
      // Check if type name needs to be updated (rename scenario)
      const expectedTypeName = toCamelCase(block.title);
      if (existingType.name !== expectedTypeName) {
        console.log(`[DEBUG] Renaming type from ${existingType.name} to ${expectedTypeName}`);
        const renamedAST = renameTypeInAST(ast, existingType.name, expectedTypeName);
        return generateSchemaFromAST(renamedAST);
      }
      
      // Type exists with correct name, no changes needed
      return currentSchema;
    }
    
    // Type doesn't exist, create it
    const typeName = toCamelCase(block.title);
    console.log(`[DEBUG] Creating new type ${typeName} with nodeId ${block.id}`);
    
    const updatedAST = addTypeToAST(ast, typeName, block.type, block.id);
    return generateSchemaFromAST(updatedAST);
    
  } catch (error) {
    console.error(`[ERROR] Failed to process block ${block.title}:`, error);
    // Fallback to original name-based logic
    return addMissingTypeToSchema(currentSchema, block);
  }
};

/**
 * Enhanced sync function that uses nodeId-based tracking
 */
const syncBlocksWithSchemaUsingNodeId = (blocks: BlockInfo[], currentSchema: string): string => {
  console.log(`[DEBUG] ===== syncBlocksWithSchemaUsingNodeId =====`);
  console.log(`[DEBUG] Processing ${blocks.length} blocks`);
  
  let updatedSchema = currentSchema;
  
  try {
    // Process each block to ensure it has a corresponding schema type
    for (const block of blocks) {
      updatedSchema = ensureBlockHasSchemaTypeWithNodeId(block, updatedSchema);
    }
    
    // Clean up orphaned types (types that exist in schema but not in blocks)
    const ast = parseSchemaToAST(updatedSchema);
    const orphanedTypeNames = findOrphanedTypes(ast, blocks);
    
    if (orphanedTypeNames.length > 0) {
      console.log(`[DEBUG] Found ${orphanedTypeNames.length} orphaned types:`, orphanedTypeNames);
      
      let cleanedAST = ast;
      for (const typeName of orphanedTypeNames) {
        cleanedAST = removeTypeFromAST(cleanedAST, typeName);
      }
      
      updatedSchema = generateSchemaFromAST(cleanedAST);
    }
    
    console.log(`[DEBUG] Schema sync completed successfully`);
    return updatedSchema;
    
  } catch (error) {
    console.error(`[ERROR] Failed to sync schema with nodeId tracking:`, error);
    // Fallback to original name-based logic
    return syncBlocksWithSchema(blocks, currentSchema, new Set(), () => {});
  }
};

// Centralized mapping between block types and their generated GraphQL type names
const getBlockTypeNames = (block: BlockInfo): string[] => {
  const typeName = toCamelCase(block.title);
  
  switch (block.type) {
    case 'command':
      return [
        `${typeName}${TYPE_SUFFIXES.INPUT}`,
        `${typeName}${TYPE_SUFFIXES.COMMAND_RESULT}`,
        typeName // for the mutation field name
      ];
    case 'event':
      return [typeName];
    case 'view':
      return [typeName];
    default:
      return [typeName];
  }
};

// Unified idempotent function to ensure block has corresponding schema type
const ensureBlockHasSchemaType = (block: BlockInfo, currentSchema: string, processedBlocks: Set<string>, setProcessedBlocks: React.Dispatch<React.SetStateAction<Set<string>>>): string => {
  const requiredTypeNames = getBlockTypeNames(block);
  const blockKey = `${block.id}-${block.title}-${block.type}`;
  
  console.log(`[DEBUG] ===== ensureBlockHasSchemaType for block: ${block.title} (${block.type}) =====`);
  console.log(`[DEBUG] Block key:`, blockKey);
  console.log(`[DEBUG] Already processed:`, processedBlocks.has(blockKey));
  console.log(`[DEBUG] Required type names:`, requiredTypeNames);
  console.log(`[DEBUG] Current schema length:`, currentSchema.length);
  
  try {
    const ast = parseSchema(currentSchema);
    const existingTypes = findTypeNames(ast);
    
    // For command blocks, also check if the mutation field exists
    let existingFields: string[] = [];
    if (block.type === 'command') {
      // Extract mutation field names from the schema
      const mutationMatch = currentSchema.match(/type Mutation\s*{([^}]*)}/);
      if (mutationMatch) {
        const mutationBody = mutationMatch[1];
        const fieldMatches = mutationBody.match(/(\w+)\s*\(/g);
        if (fieldMatches) {
          existingFields = fieldMatches.map(match => match.replace(/\s*\(/, ''));
        }
      }
    }
    
    console.log(`[DEBUG] Existing types found in schema:`, existingTypes);
    console.log(`[DEBUG] Existing mutation fields:`, existingFields);
    console.log(`[DEBUG] Checking if types ${requiredTypeNames.join(', ')} exist in:`, [...existingTypes, ...existingFields]);
    
    // Check if ALL required types exist (including mutation fields for commands)
    const allItemsExist = [...existingTypes, ...existingFields];
    const allTypesExist = requiredTypeNames.every(typeName => allItemsExist.includes(typeName));
    const missingTypes = requiredTypeNames.filter(typeName => !allItemsExist.includes(typeName));
    
    console.log(`[DEBUG] All types exist:`, allTypesExist);
    console.log(`[DEBUG] Missing types:`, missingTypes);
    
    if (allTypesExist) {
      // All types exist → Leave schema alone (preserve custom fields)
      console.log(`[DEBUG] ✅ All types for block ${block.title} already exist, preserving existing schema`);
      return currentSchema;
    } else {
      // Some types missing → Add missing ones surgically, but only once per block
      if (processedBlocks.has(blockKey)) {
        console.log(`[DEBUG] 🚫 Block ${block.title} already processed, skipping to prevent endless loop`);
        return currentSchema;
      }
      
      console.log(`[DEBUG] ✅ Adding missing types for block ${block.title} (FIRST TIME):`, missingTypes);
      setProcessedBlocks(prev => new Set(prev).add(blockKey));
      return addMissingTypeToSchema(currentSchema, block);
    }
  } catch (error) {
    console.error('[DEBUG] ❌ Error parsing schema:', error);
    if (processedBlocks.has(blockKey)) {
      console.log(`[DEBUG] 🚫 Block ${block.title} already processed, skipping fallback`);
      return currentSchema;
    }
    console.log(`[DEBUG] ✅ Fallback: adding all types for block ${block.title} (FIRST TIME)`);
    setProcessedBlocks(prev => new Set(prev).add(blockKey));
    return addMissingTypeToSchema(currentSchema, block);
  }
};

// Helper function to sync all blocks with schema incrementally
const syncBlocksWithSchema = (blocks: BlockInfo[], currentSchema: string, processedBlocks: Set<string>, setProcessedBlocks: React.Dispatch<React.SetStateAction<Set<string>>>): string => {
  console.log(`[DEBUG] ===== syncBlocksWithSchema called =====`);
  console.log('[DEBUG] Syncing blocks with schema:', blocks.length, 'blocks');
  console.log('[DEBUG] Input schema length:', currentSchema.length);
  console.log('[DEBUG] Processed blocks:', Array.from(processedBlocks));
  
  let updatedSchema = currentSchema;
  
  blocks.forEach((block, index) => {
    console.log(`[DEBUG] Processing block ${index + 1}/${blocks.length}: ${block.title} (${block.type})`);
    const beforeLength = updatedSchema.length;
    updatedSchema = ensureBlockHasSchemaType(block, updatedSchema, processedBlocks, setProcessedBlocks);
    const afterLength = updatedSchema.length;
    console.log(`[DEBUG] Schema length change: ${beforeLength} -> ${afterLength} (${afterLength - beforeLength})`);
  });
  
  console.log('[DEBUG] Final schema length:', updatedSchema.length);
  return updatedSchema;
};



export const SchemaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [schema, setSchema] = useState<PassedSchema>(defaultSchema);
  const [schemaRenameNotification, setSchemaRenameNotification] = useState<string | null>(null);
  const [processedBlocks, setProcessedBlocks] = useState<Set<string>>(new Set());

  // Function to update the schema
  const updateSchema = useCallback((data: PassedSchema) => {
    console.log('[DEBUG] updateSchema called with source:', data.source);
    setSchema(data);
    
    // Clear rename notification when schema is updated
    if (schemaRenameNotification) {
      setSchemaRenameNotification(null);
    }
  }, [schemaRenameNotification]);

  // Function to sync schema with blocks using enhanced nodeId-based logic
  const syncSchemaWithBlocks = useCallback((blocks: BlockInfo[]) => {
    console.log('[DEBUG] ===== syncSchemaWithBlocks called =====');
    console.log('[DEBUG] Current blocks:', blocks);
    console.log('[DEBUG] Current schema code length:', schema.code.length);
    
    // Try enhanced nodeId-based sync first
    let updatedSchemaCode: string;
    try {
      updatedSchemaCode = syncBlocksWithSchemaUsingNodeId(blocks, schema.code);
      console.log('[DEBUG] Successfully used nodeId-based sync');
    } catch (error) {
      console.warn('[DEBUG] NodeId-based sync failed, falling back to name-based sync:', error);
      updatedSchemaCode = syncBlocksWithSchema(blocks, schema.code, processedBlocks, setProcessedBlocks);
    }
    
    if (updatedSchemaCode !== schema.code) {
      console.log('[DEBUG] Schema updated, setting new schema');
      updateSchema({
        ...schema,
        code: updatedSchemaCode
      });
    } else {
      console.log('[DEBUG] Schema unchanged, no update needed');
    }
  }, [schema, processedBlocks, updateSchema]);

  // Function to get the schema AST
  const getSchemaAST = useCallback(() => {
    return parseSchema(schema.code);
  }, [schema.code]);

  return (
    <SchemaContext.Provider value={{
      schema,
      schemaRenameNotification,
      updateSchema,
      syncSchemaWithBlocks,
      getSchemaAST,
    }}>
      {children}
    </SchemaContext.Provider>
  );
};

// Hook to use schema state within components
export const useSchemaState = () => {
  const context = useContext(SchemaContext);
  if (!context) {
    throw new Error('useSchemaState must be used within a SchemaProvider');
  }
  return context;
};

