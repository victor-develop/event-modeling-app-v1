# Event Modeling Application

This is a React application built with Vite and TypeScript, designed to demonstrate event modeling concepts using the `@xyflow/react` library for interactive node-based diagrams. It showcases a robust time-traveling feature, allowing users to navigate through the history of changes made to their event models.

## Key Features

### Core Features

*   **Interactive Event Modeling:** Create and manipulate event models using the four core building blocks (Trigger, Command, Event, View) following the EventModeling.org methodology.
*   **Time-Traveling with Event Sourcing Principles:**
    *   All changes to the diagram are recorded as a sequence of immutable events.
    *   The application's state can be reconstructed by replaying these events from the beginning up to any point in time, enabling powerful undo/redo and historical inspection.

### Pattern Support

*   **Command Pattern:** Create and validate Trigger → Command → Event patterns.
*   **View Pattern:** Connect events to views for displaying event data.
*   **Automation Pattern:** Implement Event → Command → Event chains for automated processes.
*   **Enhanced Validations:** Real-time validation of pattern completeness and correctness.

### Data Management

*   **Enhanced Export/Import:**
    *   **Export Full Model:** Save the entire model state including nodes, edges, events, and metadata.
    *   **Import Model:** Load a previously exported model with support for both legacy and new formats.
    *   **Advanced Import:** Direct JSON state import for advanced users and tooling integration.
*   **Model Statistics:** Track and display comprehensive model statistics and pattern completion rates.
### User Experience

*   **Enhanced History Panel:**
    *   Tabbed interface for history navigation, pattern analysis, and detailed inspection.
    *   Visual indicators for pattern types and completeness.
    *   Detailed property inspection for nodes and edges.
*   **Validation Panel:**
    *   Real-time validation feedback for model correctness.
    *   Highlighting of disconnected nodes and incomplete patterns.
    *   Interactive error and warning messages with element selection.
    *   Model statistics and pattern completion visualization.
*   **Compress Snapshot:**
    *   Optimize storage and performance by creating a "snapshot" of the current diagram state.
    *   When a snapshot is taken, all events leading up to that point are effectively "compressed" and removed from the active event log.
    *   The snapshot becomes the new earliest point to which the history can be rewound, saving memory and speeding up history replay for older states.

## Technologies Used

*   **React:** A JavaScript library for building user interfaces.
*   **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript with robust type safety.
*   **Webpack:** Build tool configured for both development and production environments.
*   **@xyflow/react:** A powerful library for building interactive node-based editors and diagrams.
*   **GraphQL Editor:** Visual GraphQL schema editor for managing event model schemas.
*   **nanoid:** A tiny, secure, URL-friendly, unique string ID generator.

## GraphQL Schema Integration

This application integrates with the GraphQL Editor library to provide visual schema editing capabilities. Understanding the `PassedSchema` interface and its `source` parameter is crucial for proper implementation.

### PassedSchema Interface

```typescript
interface PassedSchema {
  code: string;           // GraphQL schema code
  libraries?: string;     // Additional libraries
  source: "tree" | "code" | "outside";  // Change origin tracking
}
```

### Critical: Understanding the 'source' Parameter

The `source` parameter is **automatically set by the GraphQL Editor** and should **never be manually overridden** in most cases. It indicates where the schema change originated:

- **`"code"`** → Changes from the GraphQL code editor (text-based editing)
- **`"tree"`** → Changes from the visual tree editor (drag-and-drop, visual editing)  
- **`"outside"`** → External changes (imports, programmatic updates, initialization)

### ❌ Common Mistake - DO NOT DO THIS:
```typescript
// WRONG: Overriding the source parameter
setSchema={(newSchema: PassedSchema) => {
  updateSchema({
    ...newSchema,
    source: 'code'  // ❌ This breaks the editor's internal logic
  });
}}
```

### ✅ Correct Implementation:
```typescript
// CORRECT: Pass through the source from GraphQL Editor
setSchema={(newSchema: PassedSchema) => {
  updateSchema(newSchema);  // ✅ Preserves the editor's source tracking
}}
```

### Why This Matters

The GraphQL Editor uses the `source` parameter internally for:
- **Loop Prevention**: Avoiding infinite update cycles between code and tree views
- **UI State Management**: Determining which view should be updated
- **Change Tracking**: Understanding the origin of modifications for proper handling

### Integration Pattern

When integrating with the GraphQL Editor:

1. **Provide schema with `source: 'outside'`** when passing data TO the editor
2. **Never modify the `source`** when receiving data FROM the editor
3. **Let the editor manage its own source tracking** for internal operations

```typescript
// Correct integration pattern
<GraphQLEditor
  schema={{
    code: schema.code,
    libraries: schema.libraries,
    source: 'outside' as const,  // ✅ Indicates external update
  }}
  setSchema={(newSchema: PassedSchema) => {
    updateSchema(newSchema);     // ✅ Pass through unchanged
  }}
/>
```

This pattern ensures proper bidirectional synchronization between your application state and the GraphQL Editor without breaking the editor's internal change tracking mechanisms.

## Event Modeling Concepts

### Building Blocks

1. **Trigger** - External inputs that initiate processes (user actions, time-based events, external system events)
2. **Command** - Instructions to perform actions or make changes to the system
3. **Event** - Facts about what has happened in the system, the source of truth
4. **View** - Representations of data derived from events

### Patterns

1. **Command Pattern** (Trigger → Command → Event)
   - How user actions or external triggers result in system changes
   - Example: User clicks submit (Trigger) → Submit Form (Command) → Form Submitted (Event)

2. **View Pattern** (Event → View)
   - How system state is presented to users
   - Example: Order Placed (Event) → Order List (View)

3. **Automation Pattern** (Event → Command → Event)
   - How events can trigger automatic processes
   - Example: Order Placed (Event) → Ship Order (Command) → Order Shipped (Event)

For more information on Event Modeling, visit [eventmodeling.org](https://eventmodeling.org/posts/event-modeling-cheatsheet/).

## React Flow Change Interception Patterns

The application implements specific constraints and behaviors using React Flow's change handling system. This pattern enables fine-grained control over how nodes and edges behave in the diagram.

### Understanding Change Types

React Flow exposes different types of changes through callbacks like `onNodesChange` and `onEdgesChange`. These changes can be intercepted, filtered, modified, or blocked before being applied to the state:

#### Node Change Types

- **`position`**: When nodes are moved (contains `position`, `positionAbsolute`, and `dragging` properties)
- **`dimensions`**: When nodes are resized (contains `dimensions`, `resizing`, and `setAttributes` properties)
- **`select`**: When nodes are selected/deselected (contains `selected` property)
- **`remove`**: When nodes are deleted
- **`add`**: When new nodes are added (contains the entire node object as `item`)
- **`replace`**: When nodes are replaced with new versions (contains `id` and `item`)

#### Edge Change Types

- **`select`**: When edges are selected/deselected (contains `selected` property)
- **`remove`**: When edges are deleted
- **`add`**: When new edges are added (contains the entire edge object as `item`)
- **`replace`**: When edges are replaced with new versions (contains `id` and `item`)

### Implementing Change Interception

The application uses several patterns to intercept and control node and edge changes:

1. **Node & Edge Changes Restrictions:**
   * Swimlanes are prevented from being moved by filtering out position changes for nodes of type `swimlane`
   * Block nodes are constrained to move only horizontally by preserving their original y-position

Here's how different change types can be handled:
```typescript
const onNodesChange = useCallback(
  (changes: NodeChange[]) => {
    // Process each change based on its type
    const processedChanges = changes.map(change => {
      // Handle different change types
      switch (change.type) {
        case 'position':
          // Prevent swimlane movement
          const node = nodes.find(n => n.id === change.id);
          if (node?.type === 'swimlane') {
            // Return null to filter this change out later
            return null;
          }
          
          // Constrain block nodes to horizontal movement only
          if (node?.type === 'block' && change.position) {
            return {
              ...change,
              position: { x: change.position.x, y: node.position.y }
            };
          }
          break;
          
        case 'select':
          // Example: Prevent selection of certain node types
          const selectNode = nodes.find(n => n.id === change.id);
          if (selectNode?.type === 'special-node' && change.selected) {
            return null; // Prevent selection of special nodes
          }
          break;
          
        case 'remove':
          // Example: Prevent deletion of locked nodes
          const removeNode = nodes.find(n => n.id === change.id);
          if (removeNode?.data?.locked) {
            return null; // Prevent removal of locked nodes
          }
          break;
          
        case 'add':
          // Example: Modify properties of newly added nodes
          if (change.item.type === 'block') {
            return {
              ...change,
              item: {
                ...change.item,
                data: { ...change.item.data, initialized: true }
              }
            };
          }
          break;
      }
      return change;
    }).filter(Boolean); // Remove null entries (changes we want to block)
    
    // Apply the filtered and transformed changes
    if (processedChanges.length > 0) {
      dispatchNodeChanges(processedChanges);
    }
  },
  [dispatchNodeChanges, nodes],
);
```

Similarly for edges, we can implement a comprehensive `onEdgesChange` handler:

```typescript
const onEdgesChange = useCallback(
  (changes: EdgeChange[]) => {
    const processedChanges = changes.map(change => {
      switch (change.type) {
        case 'select':
          // Example: Log edge selections for analytics
          console.log('Edge selected:', change.id, change.selected);
          break;
          
        case 'remove':
          // Example: Prevent deletion of critical connections
          const edge = edges.find(e => e.id === change.id);
          if (edge?.data?.critical) {
            return null; // Block deletion of critical edges
          }
          break;
          
        case 'add':
          // Example: Modify properties of newly added edges
          return {
            ...change,
            item: {
              ...change.item,
              animated: true, // Make all new edges animated
              style: { stroke: '#ff0000' } // Style new edges
            }
          };
      }
      return change;
    }).filter(Boolean); // Remove null entries
    
    if (processedChanges.length > 0) {
      dispatchEdgeChanges(processedChanges);
    }
  },
  [dispatchEdgeChanges, edges],
);
```

### Best Practices for Change Interception

1. **Handle All Change Types:** Be aware of all possible change types and handle them appropriately
2. **Filter Changes:** Remove unwanted changes by returning `null` or filtering the array
3. **Transform Changes:** Modify changes by creating new objects with altered properties
4. **Preserve Immutability:** Always create new objects when modifying changes
5. **Optimize Performance:** Only process necessary changes and avoid expensive operations
6. **Apply Changes:** Use the appropriate dispatch function after processing

This pattern provides complete control over React Flow's behavior while maintaining a clean architecture that separates concerns.

## How to Run

To get this project up and running on your local machine, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd event-modeling-app
    ```
    (Note: Replace `<repository-url>` with the actual URL if this were a real repository.)

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    ```
    This will start the Vite development server, and you can access the application in your browser, usually at `http://localhost:5173`.

4.  **Run tests:**
    ```bash
    npm test -- --run
    ```
    This will execute all unit tests in non-interactive mode using Vitest.

## Usage Guide

### Creating a Model

1. Use the Topbar buttons to add building blocks (Trigger, Command, Event, View)
2. Connect nodes by clicking and dragging from connection points
3. Observe real-time validation feedback in the Validation Panel

### Working with Patterns

1. **Command Pattern:** Connect a Trigger to a Command, then connect the Command to an Event
2. **View Pattern:** Connect an Event to a View
3. **Automation Pattern:** Connect an Event to a Command, then connect the Command to another Event

### Importing and Exporting

1. Click "Export Model" to save your complete model
2. Click "Import Model" to load a previously saved model
3. Advanced users can use "Import JSON" for direct model state import

### History and Time Travel

1. Use the History panel to navigate through previous states
2. View pattern statistics and details in the respective tabs
3. Select nodes or edges to inspect their detailed properties

## Extending the Application

### How to Add a New Building Block Type

The application supports adding new building block types beyond the core six (Trigger, Command, Event, View, UI, Processor). Here's how to add a new building block type:

1. **Create the Node Component:**
   - Create a new file in `src/components/nodes/` (e.g., `NewBlockNode.tsx`)
   - Implement a React component that follows the styling patterns of existing nodes
   - Use the following template structure:

   ```typescript
   import React, { useState, useRef } from 'react';
   import { Handle, Position } from '@xyflow/react';

   export interface NewBlockNodeProps {
     id: string;
     data: {
       label: string;
       // Add any block-specific properties here
     };
     selected: boolean;
     onLabelChange: (nodeId: string, label: string) => void;
   }

   const NewBlockNode: React.FC<NewBlockNodeProps> = ({ id, data, selected, onLabelChange }) => {
     // Implement label editing using useNodeLabelEdit hook or similar pattern
     
     return (
       <div style={{
         // Follow styling consistency with other nodes
         width: '100%',
         height: '100%',
         border: `1px solid ${selected ? '#1a192b' : '#ddd'}`,
         borderRadius: '5px',
         backgroundColor: '#yourColor', // Choose a distinct color
         padding: '10px',
         display: 'flex',
         flexDirection: 'column',
         boxShadow: selected ? '0 0 0 2px #1a192b' : 'none',
       }}>
         {/* Header section with icon and label */}
         <div style={{ /* Header styling */ }}>
           <div style={{ marginRight: '10px', fontSize: '16px' }}>🔍</div>
           {/* Label editing implementation */}
         </div>
         
         {/* Description section */}
         <div style={{ /* Description styling */ }}>
           Block Description
         </div>
         
         {/* Handles - position based on connection rules */}
         <Handle type="target" position={Position.Left} id="in" />
         <Handle type="source" position={Position.Right} id="out" />
       </div>
     );
   };

   export default NewBlockNode;
   ```

2. **Register the Node Type:**
   - Add the new node type to `src/flow/customNodeTypes.tsx`:
   ```typescript
   import NewBlockNode from '../components/nodes/NewBlockNode';
   
   export const nodeTypes = {
     // Existing node types
     'NewBlock': NewBlockNode,  // Use PascalCase for the key
   };
   ```
   
   - Ensure the case of the node type matches exactly between the registration and usage

3. **Update Block Type Mapping:**
   - In `src/components/SwimlaneNode.tsx`, add a mapping for the new block type:
   ```typescript
   // Map lowercase block type to React Flow node type
   const getNodeType = (blockType: string) => {
     switch (blockType.toLowerCase()) {
       // Existing mappings
       case 'newblock': return 'NewBlock';  // Map lowercase to PascalCase
       default: return blockType;
     }
   };
   ```
   
   - Important: Make sure to handle case conversion consistently. For example:
   ```typescript
   if (nodeType === 'newblock') nodeType = 'NewBlock';
   ```

4. **Add Event Handling:**
   - In `src/state/eventSourcing.ts`, add a new action type:
   ```typescript
   export const EventTypes = {
     // Existing types
     ModelingEditor: {
       // Existing types
       ADD_NEWBLOCK: 'ADD_NEWBLOCK',
     }
   }
   
   export type ModelingEditorEventType =
     // Existing types
     | { type: typeof EventTypes.ModelingEditor.ADD_NEWBLOCK; payload: any }
   ```
   
   - In `App.tsx`, add dispatch and handler functions:
   ```typescript
   const dispatchAddNewBlock = useCallback((node: any) => {
     dispatch({
       type: EventTypes.ModelingEditor.ADD_NEWBLOCK,
       payload: node
     });
   }, [dispatch]);
   
   const addNewBlock = useCallback(() => {
     // Implementation similar to other block creation functions
     // with appropriate swimlane validation
   }, [dispatchAddNewBlock, selectedSwimlaneId, nodes]);
   ```

5. **Define Connection Rules:**
   - Update connection validation in your pattern validation utilities to define:
     - Which block types can connect to your new block
     - Which block types your new block can connect to
   - Example rule: "NewBlock can only accept connections from Event blocks and can only connect to View blocks"
   - Add appropriate handles to your node component based on these rules

6. **Swimlane Restrictions:**
   - Define which swimlane(s) can contain your new block type
   - Update swimlane logic to enforce these restrictions
   - Example: UI and Processor blocks are restricted to trigger swimlanes only

7. **Add to UI:**
   - Update the Topbar component to include a button for your new block type:
   ```typescript
   // In Topbar.tsx
   interface TopbarProps {
     // Existing props
     onAddNewBlock?: () => void;
   }
   
   // In the render function
   {onAddNewBlock && (
     <button onClick={onAddNewBlock} style={{ /* styling */ }}>
       NewBlock
     </button>
   )}
   ```
   
   - Pass the handler from App.tsx:
   ```typescript
   <Topbar
     // Existing props
     onAddNewBlock={addNewBlock}
   />
   ```

8. **Add Styling:**
   - Define colors for your new block type in `src/types/blockTypes.ts`:
   ```typescript
   export const BLOCK_KIND_COLORS: Record<string, string> = {
     // Existing colors
     'NewBlock': 'rgba(your-color-here)',
   };
   
   export const BLOCK_KIND_BORDERS: Record<string, string> = {
     // Existing borders
     'NewBlock': '#your-border-color',
   };
   ```

9. **Styling Consistency Guidelines:**
   - **Text Size:** Use 0.9em for labels, 0.8em for descriptions
   - **Icon Size:** 16px for block icons
   - **Colors:** Choose a distinct color that doesn't clash with existing blocks
   - **Dimensions:** Match other blocks' width and height
   - **Handles:** Position handles consistently (typically left for incoming, right for outgoing)
   - **Borders:** 1px borders with slightly darker shade of the background color
   - **Shadows:** Subtle shadows with 0 0 4px rgba(color, 0.15)

### How to Add a New Swimlane Type

1. **Define the Swimlane Kind:**
   - Add a new swimlane kind to your swimlane type definitions
   - Example: `export type SwimlaneKind = 'event' | 'command_view' | 'trigger' | 'new_lane';`

2. **Update Swimlane Creation Logic:**
   - Modify the swimlane creation function to support the new kind
   - Define the swimlane's position in the vertical stack
   - Set appropriate styling and labels

3. **Define Block Type Restrictions:**
   - Specify which block types are allowed in the new swimlane
   - Update validation logic to enforce these restrictions

4. **Update UI Components:**
   - Add UI elements to create or interact with the new swimlane type
   - Ensure consistent styling with existing swimlanes

5. **Connection Validation:**
   - Update connection validation rules to account for the new swimlane
   - Define how blocks in this swimlane can connect to blocks in other swimlanes

### Connection Rules and Restrictions

When defining connection rules for new block types, consider:

1. **Source and Target Compatibility:**
   - Which block types can be sources for your new block
   - Which block types your new block can target

2. **Swimlane Crossing Rules:**
   - Whether connections can cross between specific swimlanes
   - Direction of allowed crossings (e.g., only top-to-bottom)

3. **Pattern Validation:**
   - How your new block fits into existing patterns (Command, View, Automation)
   - Whether it creates new patterns that need validation

4. **Handle Positioning:**
   - Position handles based on expected connection directions
   - Left handles for incoming connections, right handles for outgoing is the convention

### Example: UI and Processor Blocks

The application includes two specialized block types beyond the core four:

1. **UI Block:**
   - **Styling:** Purple background with computer icon (🖥️)
   - **Connections:** Accepts connections only from View blocks
   - **Swimlane:** Only allowed in 'trigger' swimlane
   - **Handles:** Incoming handle on left, outgoing handle on right

2. **Processor Block:**
   - **Styling:** Gray background with gear icon (⚙️)
   - **Connections:** Accepts connections from Event or View blocks
   - **Swimlane:** Only allowed in 'trigger' swimlane
   - **Handles:** Incoming handle on left, outgoing handle on right

These examples demonstrate how specialized blocks can be added to extend the application's modeling capabilities while maintaining consistent styling and behavior.

## Todos
- [ ] Do not fire a MOVE_NODE event when a node's actual position is NOT moved
