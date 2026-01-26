import React, { createContext, useCallback, useContext, useState } from 'react';
import { PassedSchema } from 'graphql-editor';
import { BlockInfo } from '../types/schema';
import { parseSchemaToAST, generateSchemaFromAST, addTypeToAST, findRelatedTypes, renameTypeInAST, removeTypeFromAST, getDirectiveArgumentValue, DIRECTIVE_NAMES, NODEID_SUFFIXES, findOrphanedTypes } from '../graphql-ast-utils';
import { toCamelCase } from '../utils/stringUtils';
import { ParserTree, ParserField } from 'graphql-js-tree';

// Define the schema state interface
interface SchemaState {
  schema: PassedSchema;
  schemaRenameNotification: string | null;
  updateSchema: (data: PassedSchema) => void;
  syncSchemaWithBlocks: (blocks: BlockInfo[]) => void;
  getSchemaAST: () => ParserTree;
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


// Helper function to generate composite nodeId based on type role






// Enhanced nodeId-based sync functions


// Define change plan interface
interface SchemaChangePlan {
  typesToAdd: Array<{ typeName: string; blockType: string; nodeId: string }>;
  typesToRename: Array<{ oldName: string; newName: string; nodeId: string }>;
  typesToRemove: string[];
}

// Helper functions for functional approach
const collectBlockChanges = (blocks: BlockInfo[], ast: ParserTree): SchemaChangePlan => 
  blocks.reduce((plan, block) => {
    const blockChanges = analyzeBlockSchemaChanges(block, ast);
    return {
      typesToAdd: [...plan.typesToAdd, ...blockChanges.typesToAdd],
      typesToRename: [...plan.typesToRename, ...blockChanges.typesToRename],
      typesToRemove: plan.typesToRemove
    };
  }, { typesToAdd: [], typesToRename: [], typesToRemove: [] } as SchemaChangePlan);

const addOrphanedTypesToPlan = (plan: SchemaChangePlan, ast: ParserTree, blocks: BlockInfo[]): SchemaChangePlan => {
  const orphanedTypes = findOrphanedTypes(ast, blocks);
  const orphanedTypeNames = orphanedTypes.map(type => type.name);
  
  if (orphanedTypeNames.length > 0) {
    console.log(`[DEBUG] Found ${orphanedTypeNames.length} orphaned types:`, orphanedTypeNames);
  }
  
  return {
    ...plan,
    typesToRemove: [...plan.typesToRemove, ...orphanedTypeNames]
  };
};

const applyRenames = (ast: ParserTree, renames: Array<{ oldName: string; newName: string; nodeId: string }>): ParserTree =>
  renames.reduce((currentAST, rename) => {
    console.log(`[DEBUG] Renaming type: ${rename.oldName} -> ${rename.newName}`);
    return renameTypeInAST(currentAST, rename.oldName, rename.newName);
  }, ast);

const applyAdditions = (ast: ParserTree, additions: Array<{ typeName: string; blockType: string; nodeId: string }>): ParserTree =>
  additions.reduce((currentAST, addition) => {
    console.log(`[DEBUG] Adding type: ${addition.typeName} (${addition.blockType})`);
    return addTypeToAST(currentAST, addition.typeName, addition.blockType, addition.nodeId);
  }, ast);

const applyRemovals = (ast: ParserTree, removals: string[]): ParserTree =>
  removals.reduce((currentAST, typeName) => {
    console.log(`[DEBUG] Removing orphaned type: ${typeName}`);
    return removeTypeFromAST(currentAST, typeName);
  }, ast);

const applyChangePlan = (ast: ParserTree, plan: SchemaChangePlan): ParserTree => {
  const withRenames = applyRenames(ast, plan.typesToRename);
  const withAdditions = applyAdditions(withRenames, plan.typesToAdd);
  return applyRemovals(withAdditions, plan.typesToRemove);
};

// Functional composition helper
const pipe = function<T>(value: T) {
  return {
    to: function<U>(fn: (arg: T) => U) { return pipe(fn(value)); },
    value: () => value
  };
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

// Generate the correct nodeId for a specific type within a block
const getNodeIdForType = (block: BlockInfo, typeName: string): string => {
  const baseTypeName = toCamelCase(block.title);
  
  if (block.type === 'command') {
    if (typeName === `${baseTypeName}${TYPE_SUFFIXES.INPUT}`) {
      return `${block.id}${NODEID_SUFFIXES.INPUT}`;
    } else if (typeName === `${baseTypeName}${TYPE_SUFFIXES.COMMAND_RESULT}`) {
      return `${block.id}${NODEID_SUFFIXES.RESULT}`;
    } else if (typeName === baseTypeName) {
      // Mutation field uses base nodeId
      return block.id;
    }
  }
  
  // For non-command blocks or unrecognized patterns, use base nodeId
  return block.id;
};

/**
 * Analyze what schema changes are needed for a block without applying them
 * Uses existing helper functions for better code reuse
 */
const analyzeBlockSchemaChanges = (block: BlockInfo, ast: ParserTree): SchemaChangePlan => {
  const requiredTypeNames = getBlockTypeNames(block);
  
  console.log(`[DEBUG] ===== analyzeBlockSchemaChanges for block: ${block.id} ${block.title} (${block.type}) =====`);
  console.log(`[DEBUG] Required type names:`, requiredTypeNames);
  
  const changes: SchemaChangePlan = {
    typesToAdd: [],
    typesToRename: [],
    typesToRemove: []
  };
  
  // Use findRelatedTypes to get all existing types for this block
  const existingRelatedTypes = findRelatedTypes(ast, block.id);
  console.log(`[DEBUG] Found ${existingRelatedTypes.length} existing related types for block ${block.id}`);
  
  // Create a map of existing types by their nodeId for quick lookup
  const existingTypesByNodeId = new Map<string, ParserField>();
  existingRelatedTypes.forEach(type => {
    // Extract nodeId from the type's directive
    const directive = type.directives?.find(d => d.name === DIRECTIVE_NAMES.EVENT_MODELING_BLOCK);
    if (directive) {
      const nodeIdArg = directive.args?.find(arg => arg.name === 'nodeId');
      if (nodeIdArg) {
        const nodeIdValue = getDirectiveArgumentValue(nodeIdArg);
        if (nodeIdValue) {
          existingTypesByNodeId.set(nodeIdValue, type);
        }
      }
    }
  });
  debugger;
  // Check each required type with its specific nodeId
  for (const typeName of requiredTypeNames) {
    // Get the correct nodeId for this specific type
    const typeNodeId = getNodeIdForType(block, typeName);
    
    console.log(`[DEBUG] Checking type ${typeName} with nodeId ${typeNodeId}`);
    
    // Check if we have an existing type with this nodeId
    const existingType = existingTypesByNodeId.get(typeNodeId);
    
    if (existingType) {
      // Type exists with this nodeId - check if name matches
      if (existingType.name !== typeName) {
        console.log(`[DEBUG] Type with nodeId ${typeNodeId} exists but has wrong name: ${existingType.name} -> ${typeName}`);
        changes.typesToRename.push({
          oldName: existingType.name,
          newName: typeName,
          nodeId: typeNodeId
        });
      } else {
        console.log(`[DEBUG] Type ${typeName} already exists with correct nodeId ${typeNodeId}`);
      }
    } else {
      // No type found with this nodeId - need to add it
      console.log(`[DEBUG] Type ${typeName} needs to be added for nodeId ${typeNodeId}`);
      changes.typesToAdd.push({
        typeName,
        blockType: block.type,
        nodeId: typeNodeId
      });
    }
  }
  debugger;
  return changes;
};




export const SchemaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [schema, setSchema] = useState<PassedSchema>(defaultSchema);
  const [schemaRenameNotification, setSchemaRenameNotification] = useState<string | null>(null);

  // Function to update the schema
  const updateSchema = useCallback((data: PassedSchema) => {
    console.log('[DEBUG] updateSchema called with source:', data.source);
    console.log('[DEBUG] updateSchema called with data:', data);
    setSchema({
      ...data,
      source: "outside"
    });
    
    // Clear rename notification when schema is updated
    if (schemaRenameNotification) {
      setSchemaRenameNotification(null);
    }
  }, [schemaRenameNotification]);

  // Function to sync schema with blocks using nodeId-based logic only
  const syncSchemaWithBlocks = useCallback((blocks: BlockInfo[]) => {
    console.log('[DEBUG] ===== syncSchemaWithBlocks called =====');
    console.log('[DEBUG] Current blocks:', blocks);
    console.log('[DEBUG] Current schema code length:', schema.code.length);
    
    try {
      const ast = parseSchemaToAST(schema.code);
      
      // Collect all change plans for blocks
      const changePlan = pipe(collectBlockChanges(blocks, ast))
        .to(plan => addOrphanedTypesToPlan(plan, ast, blocks))
        .value();
      
      // Only update schema if there are actual changes needed
      const hasChanges = changePlan.typesToAdd.length > 0 || 
                        changePlan.typesToRename.length > 0 || 
                        changePlan.typesToRemove.length > 0;
      
      if (hasChanges) {
        console.log('[DEBUG] Changes detected, updating schema:', {
          toAdd: changePlan.typesToAdd.length,
          toRename: changePlan.typesToRename.length,
          toRemove: changePlan.typesToRemove.length
        });
        
        const updatedAST = applyChangePlan(ast, changePlan);
        const updatedSchemaCode = generateSchemaFromAST(updatedAST);
        debugger
        updateSchema({
          source: 'outside',
          code: updatedSchemaCode
        });
      } else {
        console.log('[DEBUG] No changes needed, schema is up to date');
      }
    } catch (error) {
      debugger;
      console.error('[ERROR] NodeId-based sync failed:', error);
      // No fallback - fail fast if nodeId sync doesn't work
    }
  }, [updateSchema]);

  // Function to get the schema AST
  const getSchemaAST = useCallback(() => {
    return parseSchemaToAST(schema.code);
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

