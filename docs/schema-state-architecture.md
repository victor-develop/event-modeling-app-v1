# Schema State Architecture Documentation

## Overview

The `schemaState.tsx` file is the **central state manager** for the Event Modeling Prototype, orchestrating bidirectional sync between the visual UI and GraphQL schema editor using GraphQL Editor's `PassedSchema` interface.

## Core Architecture

```ascii
┌─────────────────────────────────────────────────────────────────────┐
│                        SCHEMA STATE PROVIDER                        │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐  │
│  │   PassedSchema  │    │  BlockRegistry  │    │  Notifications  │  │
│  │ • code: string  │    │ • id: string    │    │ • rename alerts │  │
│  │ • libraries     │    │ • title: string │    │ • type changes  │  │
│  │ • source: enum  │    │ • type: enum    │    │ • sync status   │  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │   App.tsx       │ │ SchemaEditor    │ │   Utilities     │
        │ • Event nodes   │ │    Modal        │ │ • Import/Export │
        │ • Block mgmt    │ │ • GraphQL Edit  │ │ • Schema Utils  │
        └─────────────────┘ └─────────────────┘ └─────────────────┘
```

## Key Components

### **PassedSchema Interface**
```typescript
interface PassedSchema {
  code: string;           // GraphQL schema code
  libraries?: string;     // Additional libraries
  source: "tree" | "code" | "outside";  // Change origin
}
```

**Source Values:**
- `"code"` → Changes from GraphQL code editor
- `"tree"` → Changes from visual UI/tree editor  
- `"outside"` → External changes (imports, initialization)

### **Core Functions**

| Function | Purpose | Loop Prevention |
|----------|---------|-----------------|
| `updateSchema(data: PassedSchema)` | Updates schema with source tracking | ✅ Via `data.source` |
| `registerBlock(block: BlockInfo)` | Adds/updates blocks, handles title changes | ✅ Via idempotent sync |
| `unregisterBlock(blockId)` | Removes blocks from registry | ✅ Via registry updates |

## Bidirectional Sync Flow

```ascii
┌─────────────────┐    updateSchema()    ┌─────────────────┐
│  UI Components  │ ──────────────────► │  Schema State   │
│  (Visual Tree)  │ ◄────────────────── │   Provider      │
└─────────────────┘   schema updates    └─────────────────┘
        │                                        │
        ▼                                        ▼
┌─────────────────┐                    ┌─────────────────┐
│ Block Registry  │                    │ GraphQL Editor  │
│ Management      │                    │   (Code View)   │
└─────────────────┘                    └─────────────────┘
        │              Loop Prevention           │
        │            via source tracking        │
        └────────────────────────────────────────┘
```

## Loop Prevention Strategy

```ascii
┌─────────────────┐    source === 'code'?    ┌─────────────────┐
│ updateSchema()  │ ──────────────────────► │ Skip tree regen │
│   called        │         YES             │ (prevent loop)  │
└─────────────────┘                         └─────────────────┘
        │
        ▼ NO
┌─────────────────┐
│ Proceed with    │
│ type name sync  │
│ and updates     │
└─────────────────┘
```

## Integration Examples

### **App.tsx Integration**
```typescript
const { schema, updateSchema, registerBlock } = useSchemaState();

// Event node creation automatically registers blocks
// Import/export uses schema state for persistence
// Block title changes trigger schema updates
```

### **SchemaEditorModal Integration**
```typescript
const { schema, updateSchema } = useSchemaState();

// GraphQL Editor receives: { ...schema, source: 'outside' }
// Editor changes trigger: updateSchema({ ...newSchema, source: 'code' })
// Loop prevention: source='code' skips tree regeneration
```

## Unified Call Chain (Fixed Implementation)

Both block creation and title updates now use the **same idempotent logic** to ensure consistent behavior:

### **Block Creation Flow**

```ascii
┌─────────────────────────────────────────────────────────────────────┐
│                      BLOCK CREATION CALL CHAIN                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. User clicks "Add Command/Event/View"                           │
│     │                                                               │
│     ▼                                                               │
│  2. createBlock() → dispatch(ADD_NODE) → registerBlock()            │
│     │                                                               │
│     ▼                                                               │
│  3. registerBlock() adds block to blockRegistry                    │
│     │                                                               │
│     ▼                                                               │
│  4. useEffect([blockRegistry, schema.code]) triggers               │
│     │                                                               │
│     ▼                                                               │
│  5. syncBlocksWithSchema(blockRegistry, schema.code)               │
│     │                                                               │
│     ▼                                                               │
│  6. For each block: ensureBlockHasSchemaType(block, schema)        │
│     │                                                               │
│     ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │  parseSchema(schema) → findTypeNames() → check if exists       ││
│  │     │                                                           ││
│  │     ├─── Type EXISTS → return schema unchanged                  ││
│  │     │                                                           ││
│  │     └─── Type MISSING → addMissingTypeToSchema()                ││
│  │                        • Add minimal type definition            ││
│  │                        • Add to Query/Mutation if needed       ││
│  └─────────────────────────────────────────────────────────────────┘│
│     │                                                               │
│     ▼                                                               │
│  7. If schema changed: setSchema({...prev, code: newSchema})       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### **Title Update Flow**

```ascii
┌─────────────────────────────────────────────────────────────────────┐
│                     TITLE UPDATE CALL CHAIN                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. User edits block title inline                                  │
│     │                                                               │
│     ▼                                                               │
│  2. dispatch(UPDATE_NODE_LABEL) → updates node state               │
│     │                                                               │
│     ▼                                                               │
│  3. Components detect state change via useEffect hooks             │
│     │                                                               │
│     ▼                                                               │
│  4. SAME useEffect([blockRegistry, schema.code]) triggers          │
│     │                                                               │
│     ▼                                                               │
│  5. SAME syncBlocksWithSchema(blockRegistry, schema.code)          │
│     │                                                               │
│     ▼                                                               │
│  6. SAME ensureBlockHasSchemaType() logic                          │
│     │   • Checks if types for new title exist                      │
│     │   • Adds missing types if needed                             │
│     │   • Preserves existing custom fields                         │
│     ▼                                                               │
│  7. If schema changed: setSchema({...prev, code: newSchema})       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### **Key Improvements**

**✅ True Idempotency:**
- Same logic for both block creation and title updates
- Checks if type exists before making any changes
- Only modifies schema when absolutely necessary

**✅ Data Preservation:**
- Never destroys existing custom GraphQL fields
- Preserves comments, complex types, and developer customizations
- Only adds missing types with minimal structure

**✅ Consistent Behavior:**
- Predictable outcomes regardless of trigger
- Single unified flow for all block operations
- Developer-friendly approach to schema management

**✅ Simplified Architecture:**
- Removed complex `updateBlockTitle()` function
- Single path through `registerBlock()` for all block changes
- Eliminated duplicate type creation issues

### **Detailed Steps**

1. **Block Registration**: `registerBlock()` updates the block registry (handles both new blocks and title changes)
2. **Dependency Trigger**: `useEffect()` detects registry changes and calls `syncBlocksWithSchema()`
3. **Idempotent Sync**: For each block, `ensureBlockHasSchemaType()` checks if corresponding GraphQL type exists
4. **Conditional Addition**: Only missing types are added via `addMissingTypeToSchema()`
5. **Schema Update**: If any changes were made, `updateSchema()` triggers GraphQL Editor re-render

### **Before vs After Comparison**

| Aspect | Before (Complex) | After (Simplified) |
|--------|------------------|-------------------|
| **Block Creation** | `registerBlock()` → sync | `registerBlock()` → sync |
| **Title Updates** | `updateBlockTitle()` → complex renaming | `registerBlock()` → sync |
| **Architecture** | Two separate flows | Single unified flow |
| **Duplicate Types** | ❌ Possible conflicts | ✅ Prevented by idempotency |
| **Custom Fields** | ✅ Preserved | ✅ Always preserved |
| **Behavior** | ❌ Two different paths | ✅ Consistent single path |
| **Developer UX** | ❌ Complex debugging | ✅ Simple and predictable |

### **GraphQL Editor Reflection**

In both scenarios, the GraphQL Editor automatically reflects changes because:

```ascii
┌─────────────────────────────────────────────────────────────────────┐
│                   GRAPHQL EDITOR AUTO-REFLECTION                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  SchemaEditorModal Component:                                       │
│                                                                     │
│  const { schema } = useSchemaState();                               │
│                                                                     │
│  <GraphQLEditor                                                     │
│    schema={{                                                        │
│      code: schema.code,        ← Always current schema             │
│      libraries: schema.libraries,                                  │
│      source: 'outside'         ← Indicates external update         │
│    }}                                                               │
│    setSchema={(newSchema) => {                                      │
│      updateSchema({                                                 │
│        ...newSchema,                                                │
│        source: 'code'          ← Marks as editor change            │
│      });                                                            │
│    }}                                                               │
│  />                                                                 │
│                                                                     │
│  • React's state updates automatically re-render the editor        │
│  • GraphQL Editor receives new schema prop and updates display     │
│  • Source tracking prevents loops when editor makes changes        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Benefits

- **🎯 Loop Prevention**: Uses GraphQL Editor's built-in source tracking
- **🔧 Type Safety**: Standardized `PassedSchema` interface
- **⬅️ Backward Compatibility**: Supports old and new export formats
- **🚀 Clean Integration**: Aligns with GraphQL Editor patterns

The schema state provides a robust, centralized solution for managing bidirectional synchronization between visual event modeling and GraphQL schema editing with automatic loop prevention.
