# Schema State Architecture & Canvas ↔ Modal Sync

This document describes the **schema state** as the single source of truth, how the **event modeling canvas** and the **Schema Editor modal** sync with it, and why **modal mount timing** and **schema.source** are critical for correct behavior.

---

## 1. Overview

The `schemaState.tsx` file is the **central state manager** for the Event Modeling Prototype. It holds one **PassedSchema** (`code`, `libraries`, `source`) and exposes `updateSchema` and `syncSchemaWithBlocks`. The **canvas** drives which types exist (add/rename/remove by block id and title); the **Schema Editor modal** (graphql-editor) drives field-level content. Both read from and write to the same schema state; **source** and **modal open timing** prevent loops and ensure the Relation view parses on re-open.

---

## 2. Core Architecture

```ascii
┌─────────────────────────────────────────────────────────────────────┐
│                        SCHEMA STATE PROVIDER                        │
│                        (schemaState.tsx)                             │
├─────────────────────────────────────────────────────────────────────┤
│  PassedSchema: { code, libraries, source }                          │
│  updateSchema(data)  • preserve source when 'code'|'tree'           │
│  syncSchemaWithBlocks(blocks)  • add/rename/remove types by nodeId  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │   App.tsx       │ │ SchemaEditor    │ │ Import/Export,   │
        │ nodes → blocks  │ │    Modal        │ │ Paste            │
        │ syncSchemaWith  │ │ schema ↔ editor │ │ updateSchema(    │
        │ Blocks()        │ │ setSchema →     │ │   source:'outside│
        └─────────────────┘ └─────────────────┘ └─────────────────┘
```

**Ownership:**

- **Canvas**: which blocks exist, their ids and titles (type names). Drives add/rename/remove of GraphQL types via `syncSchemaWithBlocks`.
- **Schema Editor**: field-level content (what’s inside each type). Writes back via `setSchema` → `updateSchema`.
- **Schema state**: single source of truth; both sides read and write it.

---

## 3. PassedSchema and source

```typescript
interface PassedSchema {
  code: string;
  libraries?: string;
  source: "tree" | "code" | "outside";
}
```

| source     | Meaning |
|-----------|---------|
| `"code"`  | Change from GraphQL code pane in the editor |
| `"tree"`  | Change from visual Relation/tree in the editor |
| `"outside"` | Change from app (sync, import, paste, init) |

**Why it matters:** graphql-editor uses `schema.source` to decide whether to run `generateTreeFromSchema(schema)` when the schema prop changes. If `source === 'tree'` it **skips** to avoid re-parsing after its own tree→code update. If we always passed `'outside'` we’d get redundant parses and flash; if we always passed through and the last save was `'tree'`, re-opening the modal would skip parsing and the Relation view would show “Cannot parse the schema”. Hence we **force `'outside'` only once when the modal opens** (see §6).

---

## 4. Canvas → Schema (blocks drive type add/rename/remove)

When `nodes` change (add/rename/remove block), the app syncs schema so **type names and nodeIds** match blocks. Field contents are preserved.

```ascii
    nodes (state)
         │
         │  App.tsx useEffect([nodes, syncSchemaWithBlocks])
         ▼
    syncSchemaWithBlocks(blocks)
         │
         │  schemaState.tsx (must have schema.code in useCallback deps!)
         │  parseSchemaToAST(schema.code) → change plan (add/rename/remove by nodeId)
         │  applyChangePlan → generateSchemaFromAST → updateSchema({ source: 'outside', code })
         ▼
    schema state updated (source: 'outside')
```

**Important:** `syncSchemaWithBlocks` must depend on **schema.code** in its `useCallback` deps so it always reads the **latest** schema (including user edits in the modal). Otherwise adding a new block would overwrite with a stale schema and clear edited fields.

---

## 5. Schema Editor Modal → Schema (editor drives field content)

When the user edits in the GraphQL editor (code pane or Visual/Relation), the editor calls `setSchema`; we pass that into `updateSchema` and store the new code and **source**.

```ascii
    GraphQLEditor (graphql-editor)
         │
         │  User edits in Code pane   → setSchema({ code, source: 'code' })
         │  User edits in Relation    → setSchema({ code, source: 'tree' })
         ▼
    SchemaEditorModal setSchema callback
         │
         │  updateSchema(newSchema)
         ▼
    schemaState.tsx updateSchema(data)
         │
         │  source = (data.source === 'code' || data.source === 'tree') ? data.source : 'outside'
         │  setSchema({ ...data, source })
         ▼
    schema state updated (source preserved when from editor)
```

We **preserve** `source` when it is `'code'` or `'tree'` so that graphql-editor can avoid redundant `generateTreeFromSchema` when the update came from itself.

---

## 6. Schema → Schema Editor Modal: what we pass in, and when

The modal receives `schema` from context and passes **stableSchema** into `GraphQLEditor`. The editor uses **schema.source** to decide whether to run `generateTreeFromSchema(schema)`:

- **source === 'outside'** → editor runs `generateTreeFromSchema(schema)` (parse and build tree).
- **source === 'tree'** → editor **skips** (avoids re-parsing after its own tree→code update).

So:

- If we **always** passed `source: 'outside'`, every editor update would trigger a re-parse and cause flash.
- If we **always** passed through `schema.source`, then after the user edited in the **Visual** view we’d store `source: 'tree'`. When they **close and re-open** the modal, we’d pass `source: 'tree'` again, the editor would **skip** parsing, and the Relation view would show “Cannot parse the schema”.

Hence we need **modal mount timing**:

```ascii
    Modal closed    hasPassedOutsideForThisOpenRef = false
         │
         │  User opens modal (isOpen = true)
         ▼
    First render (modal open)
         │  ref still false → forceOutsideOnce = true → pass source: 'outside'
         │  Editor runs generateTreeFromSchema → Relation view parses and renders
         ▼
    useEffect([isOpen]) runs → hasPassedOutsideForThisOpenRef = true
         │
         │  Subsequent renders (user edits, etc.) → pass schema.source ('code'/'tree')
         │  No redundant generateTreeFromSchema, no flash
         ▼
    User closes modal → useEffect sets ref = false (ready for next open)
```

```ascii
    ┌──────────────┐     open      ┌──────────────────────────────────────┐
    │ Modal closed │ ────────────► │ First pass: source = 'outside'        │
    │ ref = false  │                │ Editor: generateTreeFromSchema()     │
    └──────────────┘                │ Relation view: parses, shows graph   │
                                    └─────────────────┬────────────────────┘
                                                      │
                                    effect: ref = true
                                                      │
                                                      ▼
                                    ┌──────────────────────────────────────┐
                                    │ Later passes: source = schema.source │
                                    │ ('code' | 'tree')                     │
                                    │ Editor: no re-parse, no flash        │
                                    └──────────────────────────────────────┘
```

---

## 7. Normalization (round-trip) before passing to editor

Schema saved after editing in the **Visual** view can sometimes be in a form that graphql-editor’s worker fails to parse when the modal is re-opened. We **normalize** by round-tripping through our parser/generator so the string we pass is parseable:

```ascii
    schema.code (from state)
         │
         │  try: parseSchemaToAST(code) → generateSchemaFromAST(ast)
         │  success → use generated code; fail → use original
         ▼
    stableSchema.code (passed to GraphQLEditor)
```

We use the same `graphql-ast-utils` (graphql-js-tree) as the editor worker.

---

## 8. Summary table

| Event                    | Who writes schema     | source stored   | Next time modal opens      |
|--------------------------|------------------------|-----------------|----------------------------|
| User edits in Code pane  | Editor → updateSchema  | `'code'`        | We force `'outside'` once  |
| User edits in Relation   | Editor → updateSchema  | `'tree'`        | We force `'outside'` once  |
| Add/rename/remove block  | syncSchemaWithBlocks   | `'outside'`     | We force `'outside'` once  |
| Import / paste           | App → updateSchema     | `'outside'`     | We force `'outside'` once  |

So: **on first render after opening the modal we always pass source `'outside'` once**, then pass through `schema.source` so editor state doesn’t trigger redundant re-parses.

---

## 9. Current implementation: nodeId-based sync and directive

The app uses a **custom directive** to tie schema types to canvas blocks so we can **rename** (not only add) and remove orphaned types.

```graphql
directive @eventModelingBlock(
  nodeId: String!
  blockType: String!
  version: Int
) on OBJECT | INPUT_OBJECT

type UserRegistration @eventModelingBlock(
  nodeId: "abc123"
  blockType: "command"
  version: 1
) {
  id: ID!
  email: String!
}
```

**Block → schema sync (syncSchemaWithBlocks):**

```ascii
  blocks (from nodes)     parseSchemaToAST(schema.code)
         │                            │
         ▼                            ▼
  collectBlockChanges(blocks, ast) → change plan
         │  typesToAdd, typesToRename, typesToRemove (by nodeId)
         ▼
  addOrphanedTypesToPlan (findOrphanedTypes uses extractBaseNodeId so
         │  composite nodeIds like block-123-input are not wrongly removed)
         ▼
  applyChangePlan: applyRenames → applyAdditions → applyRemovals
         │
         ▼
  generateSchemaFromAST → updateSchema({ source: 'outside', code })
```

- **Rename**: same block id, title changed → typesToRename (oldName → newName by nodeId); `renameTypeInAST` preserves fields.
- **Orphan removal**: `findOrphanedTypes` uses **base** nodeId (e.g. `block-123` from `block-123-input`) so command Input/Result types are not removed while the block is active.

---

## 10. Loop prevention (summary)

```ascii
┌─────────────────┐    source === 'code'|'tree'?   ┌─────────────────┐
│ updateSchema()  │ ─────────────────────────────► │ Pass through     │
│   called        │         YES (from editor)       │ source; editor   │
└─────────────────┘                                 │ can skip re-parse│
        │                                           └─────────────────┘
        ▼ NO (app: sync / import / paste)
┌─────────────────┐
│ Store source:   │
│ 'outside'       │
└─────────────────┘
```

Modal side: first pass after open forces `'outside'` so Relation view parses; later passes use stored `schema.source` to avoid flash.

---

## 11. Key files

| File | Role |
|------|------|
| `src/state/schemaState.tsx` | Schema state, `updateSchema` (preserve source), `syncSchemaWithBlocks` (depends on schema.code), nodeId-based change plan |
| `src/components/SchemaEditorModal.tsx` | `stableSchema` (normalize + force `outside` once via ref), passes schema to GraphQLEditor |
| `src/components/SchemaEditorModalManager.tsx` | Modal open/close state, passes currentNodes to modal |
| `src/App.tsx` | Calls `syncSchemaWithBlocks(blocks)` when `nodes` change |
| `src/graphql-ast-utils.ts` | parseSchemaToAST, generateSchemaFromAST, renameTypeInAST, findOrphanedTypes (base nodeId), etc. |

See also: `docs/GRAPHQL_SCHEMA_EDITOR_FLASH_ANALYSIS.md` for the original flash and source-handling analysis.
