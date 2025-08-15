# NodeId-Based Type Tracking Development Plan

## Overview

Transition from name-based type matching to nodeId-based tracking using custom GraphQL directives and AST manipulation. This enables true rename operations and precise block-type mapping.

## Current vs Target Architecture

### Current Implementation (Name-Based)
```typescript
// Current: Check by type name only
const expectedTypeName = toCamelCase(block.title);
if (!typeNames.includes(expectedTypeName)) {
  addMissingTypeToSchema(schema, block);
}
```

### Target Implementation (NodeId-Based)
```typescript
// Target: Check by nodeId directive
const typeWithNodeId = findTypeByNodeId(schema, block.id);
if (!typeWithNodeId) {
  createTypeWithDirective(schema, block);
} else {
  updateTypeTitle(schema, typeWithNodeId, block.title);
}
```

## Call Chain Flow

```ascii
┌─────────────────────────────────────────────────────────────────────┐
│                    NODEID-BASED SYNC CALL CHAIN                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Block Creation/Update                                          │
│     │                                                               │
│     ▼                                                               │
│  2. syncSchemaWithBlocks(blocks, schema)                           │
│     │                                                               │
│     ▼                                                               │
│  3. For each block: ensureBlockHasSchemaTypeByNodeId(block)        │
│     │                                                               │
│     ▼                                                               │
│  4. parseSchemaAST(schema.code) → AST                              │
│     │                                                               │
│     ▼                                                               │
│  5. findTypeByNodeId(AST, block.id) → existing type or null       │
│     │                                                               │
│     ├─── Type EXISTS (by nodeId) ──┐                               │
│     │                               ▼                               │
│     │                        updateTypeInAST(AST, type, block)     │
│     │                        • Rename type if title changed        │
│     │                        • Update directive metadata           │
│     │                        • Preserve custom fields              │
│     │                                                               │
│     └─── Type MISSING ──────┐                                      │
│                               ▼                                     │
│                        createTypeInAST(AST, block)                 │
│                        • Generate type with @eventModelingBlock    │
│                        • Add to Query/Mutation if needed           │
│                        • Set nodeId directive                      │
│     │                                                               │
│     ▼                                                               │
│  6. generateSchemaFromAST(AST) → updated schema string             │
│     │                                                               │
│     ▼                                                               │
│  7. updateSchema({ code: newSchema, source: 'outside' })           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Implementation Plan

### Phase 1: AST Infrastructure & Directive Support

#### 1.1 Add GraphQL AST Dependencies
**File:** `package.json`
```json
{
  "dependencies": {
    "graphql": "^16.8.1",
    "@graphql-tools/schema": "^10.0.0"
  }
}
```

#### 1.2 Create AST Manipulation Utilities
**File:** `src/graphql-ast-utils.ts`
- `parseSchemaToAST(schema: string): DocumentNode`
- `generateSchemaFromAST(ast: DocumentNode): string`
- `findTypeByNodeId(ast: DocumentNode, nodeId: string): TypeDefinitionNode | null`
- `findDirectiveOnType(type: TypeDefinitionNode, directiveName: string): DirectiveNode | null`
- `createEventModelingDirective(nodeId: string, blockType: string): DirectiveNode`
- `updateTypeNameInAST(ast: DocumentNode, oldName: string, newName: string): DocumentNode`
- `addTypeToAST(ast: DocumentNode, typeDefinition: TypeDefinitionNode): DocumentNode`

#### 1.3 Update Schema Libraries with Directive Definition
**File:** `src/components/SchemaEditorModal.tsx` (Line 174)
```typescript
// Update libraries to include directive definition
libraries: schema.libraries || `
directive @eventModelingBlock(
  nodeId: String!
  blockType: String!
  version: Int
) on OBJECT | INPUT_OBJECT
`,
```

### Phase 2: Enhanced Sync Logic

#### 2.1 Replace Name-Based Matching
**File:** `src/state/schemaState.tsx`
- Replace `ensureBlockHasSchemaType()` with `ensureBlockHasSchemaTypeByNodeId()`
- Update `syncBlocksWithSchema()` to use nodeId-based logic
- Modify `getBlockTypeNames()` to work with AST nodes

#### 2.2 Implement Type Creation with Directives
**File:** `src/state/schemaState.tsx`
- Update `generateTypeDefinition()` to include `@eventModelingBlock` directive
- Modify `addMissingTypeToSchema()` to use AST manipulation
- Add directive metadata to all generated types

#### 2.3 Add Type Renaming Capability
**File:** `src/state/schemaState.tsx`
- Implement `renameTypeInSchema(schema, oldName, newName)`
- Update mutation/query field references when types are renamed
- Preserve all custom fields during rename operations

### Phase 3: Cleanup & Optimization

#### 3.1 Orphaned Type Detection
**File:** `src/state/schemaState.tsx`
- `findOrphanedTypes(schema: string, activeBlocks: BlockInfo[]): string[]`
- Optional cleanup of types without corresponding blocks
- User confirmation before removing orphaned types

#### 3.2 Migration Support
**File:** `src/state/schemaState.tsx`
- Detect legacy types without directives
- Prompt user to migrate existing schemas
- Backward compatibility with name-based matching as fallback

## Detailed File Updates

### 1. `src/graphql-ast-utils.ts` (NEW FILE)
```typescript
import { 
  DocumentNode, 
  TypeDefinitionNode, 
  DirectiveNode,
  parse,
  print,
  visit
} from 'graphql';

// Core AST manipulation functions
// - Schema parsing and generation
// - NodeId-based type finding
// - Directive creation and management
// - Type renaming with reference updates
```

### 2. `src/state/schemaState.tsx` (MAJOR UPDATES)
**Functions to Replace:**
- `ensureBlockHasSchemaType()` → `ensureBlockHasSchemaTypeByNodeId()`
- `addMissingTypeToSchema()` → `createTypeInAST()` + `updateTypeInAST()`
- `generateTypeDefinition()` → Include directive generation

**New Functions:**
- `findTypeByNodeId(schema: string, nodeId: string): string | null`
- `renameTypeInSchema(schema: string, nodeId: string, newTitle: string): string`
- `cleanupOrphanedTypes(schema: string, activeBlocks: BlockInfo[]): string`

### 3. `src/components/SchemaEditorModal.tsx` (MINOR UPDATE)
**Line 174 Update:**
```typescript
libraries: schema.libraries || `
directive @eventModelingBlock(
  nodeId: String!
  blockType: String!
  version: Int
) on OBJECT | INPUT_OBJECT
`,
```

### 4. `src/types/schema.ts` (MINOR ADDITIONS)
```typescript
// Add directive-related types
export interface EventModelingDirective {
  nodeId: string;
  blockType: 'command' | 'event' | 'view';
  version?: number;
}
```

## Expected Benefits

### ✅ Precise Block-Type Mapping
- Each GraphQL type linked to specific visual block via `nodeId`
- True rename operations instead of add-only behavior
- Maintains data integrity during block modifications

### ✅ Robust AST Manipulation
- Professional-grade schema modifications using GraphQL AST
- Preserves formatting, comments, and complex type structures
- Handles edge cases and malformed schemas gracefully

### ✅ Bidirectional Synchronization Ready
- Foundation for future GraphQL Editor → Block updates
- Metadata stored directly in schema via directives
- Version tracking for schema evolution

### ✅ Developer Experience
- Predictable rename behavior matches user expectations
- Clean schema without orphaned types
- Backward compatibility with existing schemas

## Migration Strategy

1. **Install Dependencies**: Add GraphQL AST libraries
2. **Create AST Utils**: Implement core AST manipulation functions
3. **Update Directive Definition**: Add to schema libraries
4. **Replace Sync Logic**: Implement nodeId-based matching
5. **Add Rename Support**: Enable true type renaming
6. **Test & Validate**: Ensure backward compatibility
7. **Optional Cleanup**: Add orphaned type detection

## Risk Mitigation

- **Backward Compatibility**: Fallback to name-based matching for legacy schemas
- **Error Handling**: Graceful degradation when AST parsing fails
- **Data Preservation**: Never modify existing custom fields
- **User Control**: Optional cleanup with user confirmation
