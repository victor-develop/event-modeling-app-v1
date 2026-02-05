import React, { createContext, useCallback, useContext, useState } from 'react';
import { PassedSchema } from 'graphql-editor';
import { BlockInfo } from '../types/schema';
import { parseSchemaToAST, generateSchemaFromAST, addTypeToAST, findRelatedTypes, renameTypeInAST, removeTypeFromAST, getBlockIdAndEntityTypeFromDirective, DIRECTIVE_NAMES, findOrphanedTypes, BLOCK_ENTITY_TYPES } from '../graphql-ast-utils';
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


// Define change plan interface (use blockId + blockEntityType instead of nodeId)
interface SchemaChangePlan {
  typesToAdd: Array<{ typeName: string; blockType: string; blockId: string; blockEntityType: string }>;
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

const applyAdditions = (ast: ParserTree, additions: SchemaChangePlan['typesToAdd']): ParserTree =>
  additions.reduce((currentAST, addition) => {
    console.log(`[DEBUG] Adding type: ${addition.typeName} (${addition.blockType}) ${addition.blockEntityType}`);
    return addTypeToAST(currentAST, addition.typeName, addition.blockType, addition.blockId, addition.blockEntityType);
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


// Centralized mapping: type names and their blockEntityType per block.
// Command: input + result; event/view: single 'block'.
const getBlockTypeEntries = (block: BlockInfo): Array<{ typeName: string; blockEntityType: string }> => {
  const typeName = toCamelCase(block.title);
  switch (block.type) {
    case 'command':
      return [
        { typeName: `${typeName}${TYPE_SUFFIXES.INPUT}`, blockEntityType: BLOCK_ENTITY_TYPES.INPUT },
        { typeName: `${typeName}${TYPE_SUFFIXES.COMMAND_RESULT}`, blockEntityType: BLOCK_ENTITY_TYPES.RESULT },
      ];
    case 'event':
    case 'view':
    default:
      return [{ typeName, blockEntityType: BLOCK_ENTITY_TYPES.BLOCK }];
  }
};

/**
 * Analyze what schema changes are needed for a block without applying them.
 * Matches existing types by blockId + blockEntityType (from @eventModelingBlock).
 */
const analyzeBlockSchemaChanges = (block: BlockInfo, ast: ParserTree): SchemaChangePlan => {
  const requiredEntries = getBlockTypeEntries(block);
  const changes: SchemaChangePlan = {
    typesToAdd: [],
    typesToRename: [],
    typesToRemove: []
  };

  const existingRelatedTypes = findRelatedTypes(ast, block.id);
  const existingByBlockEntityType = new Map<string, ParserField>();
  existingRelatedTypes.forEach(type => {
    const directive = type.directives?.find(d => d.name === DIRECTIVE_NAMES.EVENT_MODELING_BLOCK);
    const { blockId: bid, blockEntityType: ety } = getBlockIdAndEntityTypeFromDirective(directive);
    if (bid && ety) existingByBlockEntityType.set(`${bid}\t${ety}`, type);
  });

  for (const { typeName, blockEntityType } of requiredEntries) {
    const key = `${block.id}\t${blockEntityType}`;
    const existingType = existingByBlockEntityType.get(key);

    if (existingType) {
      if (existingType.name !== typeName) {
        changes.typesToRename.push({
          oldName: existingType.name,
          newName: typeName,
          nodeId: key
        });
      }
    } else {
      changes.typesToAdd.push({
        typeName,
        blockType: block.type,
        blockId: block.id,
        blockEntityType
      });
    }
  }
  return changes;
};




export const SchemaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [schema, setSchema] = useState<PassedSchema>(defaultSchema);
  const [schemaRenameNotification, setSchemaRenameNotification] = useState<string | null>(null);

  // Function to update the schema.
  // Preserve editor-originated source ("code" | "tree") so graphql-editor can skip
  // redundant generateTreeFromSchema when source === "tree". App-driven updates
  // (syncSchemaWithBlocks, import, paste) pass source: "outside" and keep full control.
  const updateSchema = useCallback((data: PassedSchema) => {
    console.log('[DEBUG] updateSchema called with source:', data.source);
    console.log('[DEBUG] updateSchema called with data:', data);
    const source = (data.source === 'code' || data.source === 'tree') ? data.source : 'outside';
    setSchema({
      ...data,
      source,
    });
    
    // Clear rename notification when schema is updated
    if (schemaRenameNotification) {
      setSchemaRenameNotification(null);
    }
  }, [schemaRenameNotification]);

  // Function to sync schema with blocks using nodeId-based logic only.
  // Depends on schema.code so we always read the latest schema (including user edits);
  // otherwise adding a new block would overwrite with a stale schema and clear edited fields.
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
        updateSchema({
          source: 'outside',
          code: updatedSchemaCode
        });
      } else {
        console.log('[DEBUG] No changes needed, schema is up to date');
      }
    } catch (error) {
      console.error('[ERROR] NodeId-based sync failed:', error);
      // No fallback - fail fast if nodeId sync doesn't work
    }
  }, [updateSchema, schema.code]);

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

