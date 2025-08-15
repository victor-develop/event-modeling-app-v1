import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { PassedSchema } from 'graphql-editor';
import type { BlockInfo, TypeNameUpdate } from '../types/schema';
import { parseSchema, findTypeNames, updateSchemaTypeNames } from '../utils/schemaPreservation';
import { toCamelCase } from '../utils/stringUtils';

// Define the schema state interface
interface SchemaState {
  schema: PassedSchema;
  blockRegistry: BlockInfo[];
  schemaRenameNotification: string | null;
  updateSchema: (data: PassedSchema) => void;
  registerBlock: (block: BlockInfo) => void;
  unregisterBlock: (blockId: string) => void;
  updateBlockTitle: (blockId: string, newTitle: string) => void;
  generateSchema: () => string;
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


interface SchemaProviderProps {
  initialBlockRegistry?: BlockInfo[];
  children: React.ReactNode;
}

export const SchemaProvider: React.FC<SchemaProviderProps> = ({ 
  children, 
  initialBlockRegistry = [] 
}) => {
  const [schema, setSchema] = useState<PassedSchema>(defaultSchema);
  const [blockRegistry, setBlockRegistry] = useState<BlockInfo[]>(initialBlockRegistry);
  const [schemaRenameNotification, setSchemaRenameNotification] = useState<string | null>(null);
  const [processedBlocks, setProcessedBlocks] = useState<Set<string>>(new Set());
  
  // Sync blocks with schema when blocks are registered (idempotent)
  useEffect(() => {
    console.log(`[DEBUG] ===== useEffect triggered =====`);
    console.log(`[DEBUG] Block registry length:`, blockRegistry.length);
    console.log(`[DEBUG] Block registry:`, blockRegistry);
    console.log(`[DEBUG] Current schema.code length:`, schema.code.length);
    
    if (blockRegistry.length > 0) {
      console.log(`[DEBUG] Calling syncBlocksWithSchema...`);
      const updatedSchema = syncBlocksWithSchema(blockRegistry, schema.code, processedBlocks, setProcessedBlocks);
      console.log(`[DEBUG] syncBlocksWithSchema returned schema length:`, updatedSchema.length);
      console.log(`[DEBUG] Schema changed:`, updatedSchema !== schema.code);
      
      if (updatedSchema !== schema.code) {
        console.log('[DEBUG] 🔄 Schema updated due to block registry changes');
        console.log('[DEBUG] Old schema:', schema.code);
        console.log('[DEBUG] New schema:', updatedSchema);
        setSchema(prev => ({ ...prev, code: updatedSchema, source: 'outside' }));
      } else {
        console.log('[DEBUG] ✅ Schema unchanged, no update needed');
      }
    } else {
      console.log('[DEBUG] No blocks in registry, skipping sync');
    }
  }, [blockRegistry, schema.code]);
  
  // Parse schema to AST for type name lookups
  const getSchemaAST = useCallback(() => {
    try {
      return parseSchema(schema.code);
    } catch (error) {
      console.error('Error parsing schema:', error);
      return null;
    }
  }, [schema.code]);
  
  // Update schema with change source tracking
  const updateSchema = useCallback((data: PassedSchema) => {
    console.log('[DEBUG] Updating schema with source:', data.source);
    console.log('[DEBUG] Previous schema code:', schema.code);
    console.log('[DEBUG] New schema code:', data.code);
    console.log('[DEBUG] Are they equal?', schema.code === data.code);
    
    // Always set schema data first
    setSchema(data);
    
    // If this is a schema editor update, check for type name changes
    if (data.source === 'code' && schema.code !== data.code) {
      try {
        const prevAst = parseSchema(schema.code);
        const newAst = parseSchema(data.code);
        
        console.log('[DEBUG] Parsed ASTs:', { prevAst: !!prevAst, newAst: !!newAst });
        
        if (prevAst && newAst) {
          // Find type names in previous and new schema
          const prevTypeNames = findTypeNames(prevAst);
          const newTypeNames = findTypeNames(newAst);
          
          console.log('[DEBUG] Schema type names:', { prevTypeNames, newTypeNames });
          
          // Check for renamed types
          const removedTypes = prevTypeNames.filter(t => !newTypeNames.includes(t));
          const addedTypes = newTypeNames.filter(t => !prevTypeNames.includes(t));
          
          console.log('[DEBUG] Type changes:', { removedTypes, addedTypes });
          
          // If types were removed and added, show notification
          if (removedTypes.length > 0 && addedTypes.length > 0) {
            // Find block types that might have been renamed
            const potentiallyRenamedBlocks = blockRegistry.filter(block => {
              const typeName = toCamelCase(block.title);
              return removedTypes.includes(typeName);
            });
            
            console.log('[DEBUG] Potentially renamed blocks:', potentiallyRenamedBlocks);
            
            if (potentiallyRenamedBlocks.length > 0) {
              const blockTitles = potentiallyRenamedBlocks.map(b => b.title).join(', ');
              const notification = `Type name change detected: ${removedTypes.join(', ')} may have been renamed to ${addedTypes.join(', ')}. Block titles for ${blockTitles} were not updated.`;
              
              console.log('[DEBUG] Schema rename notification:', notification);
              setSchemaRenameNotification(notification);
              
              // Clear notification after 5 seconds
              setTimeout(() => {
                setSchemaRenameNotification(null);
              }, 5000);
            }
          }
        }
      } catch (error) {
        console.error('[DEBUG] Error parsing schema:', error);
      }
    } else {
      console.log('[DEBUG] Not checking for type changes:', { 
        isCodeEditor: data.source === 'code', 
        codeChanged: schema.code !== data.code 
      });
    }
  }, [blockRegistry, schema.code]);
  
  // Register a block in the registry (idempotent)
  const registerBlock = useCallback((block: BlockInfo) => {
    console.log('[DEBUG] Registering block:', block);
    setBlockRegistry(prev => {
      // Check if block already exists
      const exists = prev.some(b => b.id === block.id);
      if (exists) {
        console.log('[DEBUG] Block already exists, updating:', block.id);
        // Update existing block
        return prev.map(b => b.id === block.id ? block : b);
      }
      console.log('[DEBUG] Adding new block to registry:', block.id);
      // Add new block - schema sync will happen in useEffect
      return [...prev, block];
    });
  }, []);
  
  // Remove a block from the registry
  const unregisterBlock = useCallback((blockId: string) => {
    setBlockRegistry(prev => prev.filter(b => b.id !== blockId));
  }, []);
  
  // Update a block title with schema synchronization
  const updateBlockTitle = useCallback((blockId: string, newTitle: string) => {
    console.log('[DEBUG] Updating block title:', blockId, newTitle, 'schema.source:', schema.source);
    console.log('[DEBUG] Current schema:', schema);
    
    // Only proceed if change didn't originate from code editor
    if (schema.source === 'code') {
      console.log('[DEBUG] Skipping block title update as change came from code editor');
      return;
    }
    
    // Find the block to update
    setBlockRegistry(prev => {
      console.log('[DEBUG] Current block registry:', prev);
      const blockToUpdate = prev.find(b => b.id === blockId);
      if (!blockToUpdate) {
        console.log('[DEBUG] Block not found:', blockId);
        return prev;
      }
      
      const oldTitle = blockToUpdate.title;
      const oldTypeName = toCamelCase(oldTitle);
      const newTypeName = toCamelCase(newTitle);
      
      console.log('[DEBUG] Type names:', { oldTypeName, newTypeName });
      
      // If the type name hasn't changed, just update the block title
      if (oldTypeName === newTypeName) {
        console.log('[DEBUG] Type name unchanged, just updating block title');
        return prev.map(b => b.id === blockId ? { ...b, title: newTitle } : b);
      }
      
      // Update the block title
      const updatedRegistry = prev.map(b => 
        b.id === blockId ? { ...b, title: newTitle } : b
      );
      console.log('[DEBUG] Updated registry:', updatedRegistry);
      
      // Update the schema with the new type name
      const ast = getSchemaAST();
      console.log('[DEBUG] Got schema AST:', !!ast);
      if (ast) {
        // Check if the old type exists in the schema
        const typeNames = findTypeNames(ast);
        console.log('[DEBUG] Found type names in schema:', typeNames);
        const oldTypeExists = typeNames.includes(oldTypeName);
        
        const updates: TypeNameUpdate[] = [{
          oldName: oldTypeName,
          newName: newTypeName,
          blockType: blockToUpdate.type,
          recreateIfMissing: !oldTypeExists // Recreate if the old type doesn't exist
        }];
        
        // For commands, also update the input type
        if (blockToUpdate.type === 'command') {
          const oldInputExists = typeNames.includes(`${oldTypeName}Input`);
          
          updates.push(
            { 
              oldName: `${oldTypeName}Input`, 
              newName: `${newTypeName}Input`, 
              blockType: 'command',
              recreateIfMissing: !oldInputExists
            }
          );
        }
        
        console.log('[DEBUG] Updating schema type names:', updates, 'oldTypeExists:', oldTypeExists);
        
        // Preserve fields while updating type names
        const result = updateSchemaTypeNames(schema.code, updates);
        console.log('[DEBUG] Schema update result:', result);
        if (result.success) {
          console.log('[DEBUG] Schema update successful. New schema:');
          console.log(result.schema);
          // Update schema with the new code immediately
          updateSchema({
            ...schema,
            code: result.schema,
            source: 'tree'
          });
        } else {
          console.error('[DEBUG] Failed to update schema type names');
        }
      } else {
        console.error('[DEBUG] Failed to parse schema AST');
      }
      
      return updatedRegistry;
    });
  }, [schema.source, schema.code, getSchemaAST, updateSchema]);

// Generate a unified schema from the block registry (for export/compatibility)
const generateSchema = useCallback(() => {
  return syncBlocksWithSchema(blockRegistry, schema.code, processedBlocks, setProcessedBlocks);
}, [blockRegistry, schema.code, processedBlocks]);

// Create the context value
const contextValue = {
  schema,
  blockRegistry,
  schemaRenameNotification,
  updateSchema,
  registerBlock,
  unregisterBlock,
  updateBlockTitle,
  generateSchema,
  getSchemaAST
};

// Set the schema state for external access
useEffect(() => {
  setSchemaState(contextValue);
}, [contextValue]);

// Return the context provider with all values and functions
return (
  <SchemaContext.Provider value={contextValue}>
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

// For external access without hooks
let currentSchemaState: SchemaState | null = null;

export const setSchemaState = (state: SchemaState) => {
  currentSchemaState = state;
};

export const getSchemaState = (): SchemaState | null => {
  return currentSchemaState;
};
