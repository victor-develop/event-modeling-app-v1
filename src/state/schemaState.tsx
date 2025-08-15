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

// Helper function to generate a unified schema from block registry
const generateUnifiedSchema = (blocks: BlockInfo[]): string => {
  console.log('[DEBUG] Generating schema for blocks:', blocks);
  
  const commandTypes: string[] = [];
  const eventTypes: string[] = [];
  const viewTypes: string[] = [];
  const queryFields: string[] = [];
  const mutationFields: string[] = [];
  
  blocks.forEach(block => {
    const typeName = toCamelCase(block.title);
    console.log(`[DEBUG] Processing block: ${block.title} -> ${typeName} (${block.type})`);
    
    switch (block.type) {
      case 'command':
        commandTypes.push(`input ${typeName}Input {
  # Define command parameters here
  id: ID!
}`);
        mutationFields.push(`  ${typeName}(input: ${typeName}Input!): Boolean!`);
        break;
      case 'event':
        eventTypes.push(`type ${typeName} {
  # Define event payload here
  id: ID!
  timestamp: String!
}`);
        break;
      case 'view':
        viewTypes.push(`type ${typeName} {
  # Define view structure here
  id: ID!
}`);
        queryFields.push(`  ${typeName}(id: ID!): ${typeName}`);
        break;
    }
  });
  
  let schema = '';
  
  // Add all type definitions first
  if ([...commandTypes, ...eventTypes, ...viewTypes].length > 0) {
    schema += [...commandTypes, ...eventTypes, ...viewTypes].join('\n\n');
    schema += '\n\n';
  }
  
  // GraphQL requires at least a Query type - always add it
  if (queryFields.length > 0) {
    schema += `type Query {\n${queryFields.join('\n')}\n}\n\n`;
  } else {
    // Add empty Query type if no view blocks exist
    schema += `type Query {\n  # Add your queries here\n  _empty: String\n}\n\n`;
  }
  
  // Add Mutation type if we have commands
  if (mutationFields.length > 0) {
    schema += `type Mutation {\n${mutationFields.join('\n')}\n}\n\n`;
  }
  
  const finalSchema = schema.trim();
  console.log('[DEBUG] Generated schema:', finalSchema);
  console.log('[DEBUG] Schema length:', finalSchema.length);
  
  return finalSchema;
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
  const [initialSchemaGenerated, setInitialSchemaGenerated] = useState(false);
  const [schemaRenameNotification, setSchemaRenameNotification] = useState<string | null>(null);
  
  // Generate initial schema when blocks are registered
  useEffect(() => {
    if (blockRegistry.length > 0 && !initialSchemaGenerated) {
      const generatedSchema = generateUnifiedSchema(blockRegistry);
      setSchema(prev => ({ ...prev, code: generatedSchema, source: 'outside' }));
      setInitialSchemaGenerated(true);
    }
  }, [blockRegistry, initialSchemaGenerated]);
  
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
  
  // Register a block in the registry
  const registerBlock = useCallback((block: BlockInfo) => {
    setBlockRegistry(prev => {
      // Check if block already exists
      const exists = prev.some(b => b.id === block.id);
      if (exists) {
        // Update existing block
        return prev.map(b => b.id === block.id ? block : b);
      }
      // Add new block
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

// Generate a unified schema from the block registry
const generateSchema = useCallback(() => {
  return generateUnifiedSchema(blockRegistry);
}, [blockRegistry]);

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
