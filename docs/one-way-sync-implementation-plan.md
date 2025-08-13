# One-way Block Title to Schema Synchronization Implementation Plan

## Overview

This document outlines the implementation plan for one-way synchronization from block titles in the UI to type names in the GraphQL schema editor. The goal is to ensure that changes made to block titles are properly reflected in the schema, while preventing update loops and handling schema type renames appropriately.

## Core Strategy

We'll implement a one-way synchronization approach using:

1. **Change Source Tracking**: Track where each change originates from (UI or schema editor) to prevent loops
2. **Equality Checks**: Only apply updates when values actually change
3. **Debouncing**: Prevent rapid successive updates
4. **Toast Notifications**: When schema types are renamed in the editor, show a notification instead of syncing to block titles
5. **AST Preservation**: When updating schema from block title changes, preserve all custom fields and directives

## Required Dependencies and Imports

Before implementing the changes, ensure these dependencies are available:

```typescript
// Required GraphQL imports for AST manipulation
import { parse, visit, print, Kind } from 'graphql';
import { debounce } from 'lodash'; // For debouncing schema updates

// Types for AST manipulation
import type {
  DocumentNode,
  ObjectTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  FieldDefinitionNode,
  InputValueDefinitionNode,
  TypeNode,
  NamedTypeNode,
  ListTypeNode,
  NonNullTypeNode
} from 'graphql';
```

**Note**: If `lodash` is not already installed, add it:
```bash
npm install lodash
npm install --save-dev @types/lodash
```

## Files and Components Overview

| File/Component | Change Type | Description | Unit Test File |
|---|---|---|---|
| `src/state/schemaState.tsx` | **Update** | Add change source tracking, schema preservation functions, and one-way sync logic | `src/tests/state/schemaState.test.tsx` |
| `src/utils/schemaPreservation.ts` | **Create** | New utility module for AST-based schema manipulation and type renaming | `src/utils/__tests__/schemaPreservation.test.ts` |
| `src/components/SchemaEditorModal.tsx` | **Update** | Integrate debounced schema updates and toast notifications | `src/components/__tests__/SchemaEditorModal.test.tsx` |
| `src/types/schema.ts` | **Create** | New type definitions for change tracking, block info, and schema state | `src/types/__tests__/schema.test.ts` |
| `src/utils/stringUtils.ts` | **Create** | String similarity calculation and case conversion utilities | `src/utils/__tests__/stringUtils.test.ts` |

## File & Component Changes

### 1. `src/state/schemaState.tsx`

This is the central file for our changes, as it manages both the schema and block registry.

#### New State Variables

```typescript
// Track the source of changes to prevent loops
const [changeSource, setChangeSource] = useState<SchemaChangeSource>(null);

// For toast notifications when schema types are renamed
const [schemaRenameNotification, setSchemaRenameNotification] = useState<string | null>(null);
```

#### Modified Functions

```typescript
// Update block title with schema synchronization
const updateBlockTitle = useCallback((blockId: string, newTitle: string) => {
  console.log('Updating block title:', blockId, newTitle, 'changeSource:', changeSource);
  
  // Find the block to update
  setBlockRegistry(prev => {
    const blockToUpdate = prev.find(b => b.id === blockId);
    if (!blockToUpdate) {
      console.log('Block not found:', blockId);
      return prev;
    }
    
    const oldTitle = blockToUpdate.title;
    const oldTypeName = toCamelCase(oldTitle);
    const newTypeName = toCamelCase(newTitle);
    
    console.log('Type names:', { oldTypeName, newTypeName });
    
    // Update the block title
    const updatedRegistry = prev.map(b => 
      b.id === blockId ? { ...b, title: newTitle } : b
    );
    
    // Update the schema with the new type name
    const ast = getSchemaAST();
    if (ast) {
      const updates: TypeNameUpdate[] = [{
        oldName: oldTypeName,
        newName: newTypeName,
        blockType: blockToUpdate.type
      }];
      
      // Preserve fields while updating type names
      const result = updateSchemaTypeNames(schemaData.code, updates);
      if (result.success) {
        // Update schema with the new code
        updateSchema({
          ...schemaData,
          code: result.schema
        }, 'ui');
      }
    }
    
    return updatedRegistry;
  });
}, [changeSource, getSchemaAST, schemaData, updateSchema]);

// Update schema with change source tracking
const updateSchema = useCallback((data: SchemaData, source: SchemaChangeSource) => {
  console.log('Updating schema with source:', source);
  
  // Always set schema data first
  setSchemaData(data);
  setChangeSource(source);
  
  // If this is a schema editor update, check for type name changes
  if (source === 'schema-editor' && schemaData.code !== data.code) {
    try {
      const prevAst = parseSchema(schemaData.code);
      const newAst = parseSchema(data.code);
      
      if (prevAst && newAst) {
        // Find type names in previous and new schema
        const prevTypeNames = findTypeNames(prevAst);
        const newTypeNames = findTypeNames(newAst);
        
        // Check for renamed types
        const removedTypes = prevTypeNames.filter(t => !newTypeNames.includes(t));
        const addedTypes = newTypeNames.filter(t => !prevTypeNames.includes(t));
        
        // If types were removed and added, show notification
        if (removedTypes.length > 0 && addedTypes.length > 0) {
          setSchemaRenameNotification(
            `Type name change detected: ${removedTypes.join(', ')} may have been renamed to ${addedTypes.join(', ')}. Block titles were not updated.`
          );
          
          // Clear notification after 5 seconds
          setTimeout(() => {
            setSchemaRenameNotification(null);
          }, 5000);
        }
      }
    } catch (error) {
      console.error('Error parsing schema:', error);
    }
  }
  
  // Reset change source after a timeout to allow tests to verify it
  const timeout = source === 'schema-editor' ? 1000 : 0;
  setTimeout(() => {
    setChangeSource(null);
  }, timeout);
}, [schemaData.code]);
```

### 2. `src/utils/schemaPreservation.ts`

This new utility file will handle AST-based schema manipulation to preserve custom fields when renaming types.

```typescript
import { parse, visit, print, Kind } from 'graphql';
import type { DocumentNode, ObjectTypeDefinitionNode } from 'graphql';
import type { TypeNameUpdate } from '../types/schema';

/**
 * Parse a GraphQL schema string into an AST
 */
export const parseSchema = (schemaString: string): DocumentNode | null => {
  try {
    return parse(schemaString);
  } catch (error) {
    console.error('Failed to parse schema:', error);
    return null;
  }
};

/**
 * Find all type names in a GraphQL schema AST
 */
export const findTypeNames = (ast: DocumentNode): string[] => {
  const typeNames: string[] = [];
  
  visit(ast, {
    ObjectTypeDefinition(node) {
      typeNames.push(node.name.value);
    }
  });
  
  return typeNames;
};

/**
 * Update type names in a GraphQL schema while preserving all fields
 */
export const updateSchemaTypeNames = (
  schemaString: string, 
  updates: TypeNameUpdate[]
): { success: boolean; schema: string } => {
  try {
    const ast = parse(schemaString);
    
    // Create a map of old name to new name for quick lookup
    const updateMap: Record<string, string> = {};
    updates.forEach(update => {
      updateMap[update.oldName] = update.newName;
    });
    
    // Visit and modify the AST
    const updatedAst = visit(ast, {
      ObjectTypeDefinition(node) {
        const oldName = node.name.value;
        const newName = updateMap[oldName];
        
        if (newName) {
          // Return a new node with the updated name but preserve all other properties
          return {
            ...node,
            name: {
              ...node.name,
              value: newName
            }
          };
        }
        
        return undefined; // No change
      }
    });
    
    // Print the updated AST back to a string
    return {
      success: true,
      schema: print(updatedAst)
    };
  } catch (error) {
    console.error('Failed to update schema type names:', error);
    return {
      success: false,
      schema: schemaString
    };
  }
};
```

### 3. `src/components/SchemaEditorModal.tsx`

Update the SchemaEditorModal to include toast notifications for schema type renames:

```typescript
// Add toast notification display
{schemaRenameNotification && (
  <div className="toast-notification">
    <div className="toast-content">
      <span className="toast-icon">ℹ️</span>
      <span>{schemaRenameNotification}</span>
      <button 
        className="toast-close" 
        onClick={() => setSchemaRenameNotification(null)}
      >
        ×
      </button>
    </div>
  </div>
)}
```

### 4. `src/types/schema.ts`

Create type definitions for our schema state:

```typescript
export type BlockType = 'command' | 'event' | 'view';

export interface BlockInfo {
  id: string;
  title: string;
  type: BlockType;
}

export interface SchemaData {
  code: string;
  libraries: string;
}

export type SchemaChangeSource = 'ui' | 'schema-editor' | 'initialization' | null;

export interface TypeNameUpdate {
  oldName: string;
  newName: string;
  blockType: BlockType;
}
```

## Implementation Steps

1. **Create type definitions** in `src/types/schema.ts`
2. **Create string utilities** in `src/utils/stringUtils.ts`
3. **Create schema preservation utilities** in `src/utils/schemaPreservation.ts`
4. **Update schema state** in `src/state/schemaState.tsx` to implement one-way sync
5. **Add toast notifications** to `src/components/SchemaEditorModal.tsx`
6. **Write comprehensive unit tests** for all modified and new files
7. **Integration testing** to verify end-to-end functionality

## Testing Plan

### Unit Tests

1. **Schema State Tests**
   - Test change source tracking
   - Test block title updates propagate to schema
   - Test schema type renames show notifications but don't update block titles
   - Test error handling

2. **Schema Preservation Tests**
   - Test type name updates preserve fields
   - Test error handling for invalid schemas

3. **String Utility Tests**
   - Test case conversion functions
   - Test string similarity functions

### Integration Tests

1. **End-to-End Flow**
   - Test block title changes update schema
   - Test schema type renames show notifications
   - Test schema preservation during updates

## Conclusion

This implementation plan outlines a one-way synchronization approach from block titles to schema type names, with appropriate notifications when schema types are renamed. By focusing on one-way sync, we simplify the implementation and reduce the risk of infinite update loops while still providing a good user experience.
