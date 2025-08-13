# React Flow Tutorial (Based on xyflow-react-example)

This tutorial explains how to use the `@xyflow/react` library for building interactive node-based diagrams, drawing insights from the provided `xyflow-react-example` project.

## 1. Project Setup

The `package.json` shows the core dependencies:

```json
{
  "dependencies": {
    "@xyflow/react": "^11.10.1",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^5.2.0"
  }
}
```

To get started, you would typically:
1. Create a new React project (e.g., with Vite: `npm create vite@latest my-flow-app -- --template react-ts`).
2. Install `@xyflow/react`: `npm install @xyflow/react`.
3. Import the base styles in your `index.css` or `App.css`:
   ```css
   @import '@xyflow/react/dist/style.css';
   ```

## 2. Basic Flow Structure (`App.tsx`)

The `App.tsx` file is the main component that renders the React Flow canvas.

```tsx
import React, { useCallback } from 'react';
import {
  ReactFlow,
  addEdge,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css'; // Import base styles

// Import initial nodes and edges
import { nodes as initialNodes, edges as initialEdges } from './initial-elements';

// Import custom node and edge components
import AnnotationNode from './AnnotationNode';
import ToolbarNode from './ToolbarNode';
import ResizerNode from './ResizerNode';
import CircleNode from './CircleNode';
import TextInputNode from './TextInputNode';
import ButtonEdge from './ButtonEdge';

// Define custom node types
const nodeTypes = {
  annotation: AnnotationNode,
  tools: ToolbarNode,
  resizer: ResizerNode,
  circle: CircleNode,
  textinput: TextInputNode,
};

// Define custom edge types
const edgeTypes = {
  button: ButtonEdge,
};

const OverviewFlow = () => {
  // State management for nodes and edges
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Callback for connecting edges
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView // Fits the view to the initial elements
      attributionPosition="top-right"
      nodeTypes={nodeTypes} // Register custom node types
      edgeTypes={edgeTypes} // Register custom edge types
    >
      <MiniMap zoomable pannable nodeClassName={(node) => node.type} />
      <Controls />
      <Background />
    </ReactFlow>
  );
};

export default OverviewFlow;
```

Key takeaways:
*   `ReactFlow` is the main component.
*   `useNodesState` and `useEdgesState` hooks manage the state of your nodes and edges.
*   `onNodesChange`, `onEdgesChange`, and `onConnect` are essential callbacks for handling user interactions (dragging nodes, connecting edges).
*   `nodeTypes` and `edgeTypes` objects are used to register your custom components for nodes and edges.
*   `MiniMap`, `Controls`, and `Background` are built-in components for enhanced user experience.

## 3. Initial Elements (`initial-elements.jsx`)

This file defines the initial `nodes` and `edges` that will be rendered on the canvas.

```jsx
import { MarkerType } from '@xyflow/react';

export const nodes = [
  {
    id: 'annotation-1',
    type: 'annotation', // Custom node type
    draggable: false,
    selectable: false,
    data: {
      level: 1,
      label: 'Built-in node and edge types. Draggable, deletable and connectable!',
      // ... other data
    },
    position: { x: -200, y: -30 },
  },
  {
    id: '1-1',
    type: 'input', // Built-in node type
    data: { label: 'Input Node' },
    position: { x: 150, y: 0 },
  },
  // ... other nodes
];

export const edges = [
  {
    id: 'e1-2',
    source: '1-1',
    target: '1-2',
    label: 'edge',
    type: 'smoothstep', // Built-in edge type
  },
  {
    id: 'e3-3',
    source: '2-3',
    sourceHandle: 'a',
    target: '3-2',
    type: 'button', // Custom edge type
    animated: true,
    style: { stroke: 'rgb(158, 118, 255)' },
  },
  // ... other edges
];
```

Nodes and edges are objects with properties like `id`, `type`, `data`, and `position`. `type` can be a built-in type (`input`, `default`, `output`, `group`) or a custom type you define.

## 3.1. Group Nodes

React Flow supports grouping nodes, allowing you to move a parent node (the group) and have its child nodes move along with it. This is achieved by setting the `type` of a node to `'group'` and then assigning a `parentId` to its child nodes.

From `initial-elements.jsx`, you can see an example of a group node and its children:

```jsx
  {
    id: '2-1',
    type: 'group', // This node is a group
    position: {
      x: -170,
      y: 250,
    },
    style: {
      width: 380,
      height: 180,
    },
  },
  {
    id: '2-2',
    data: {},
    type: 'tools', // This node is a child of '2-1'
    position: { x: 50, y: 50 },
    style: {
      width: 80,
      height: 80,
    },
    parentId: '2-1', // Links this node to the group
    extent: 'parent', // Ensures the child stays within the parent's bounds
  },
  {
    id: '2-3',
    type: 'resizer', // This node is also a child of '2-1'
    data: {
      label: 'Resize Me',
    },
    position: { x: 250, y: 50 },
    style: {
      width: 80,
      height: 80,
    },
    parentId: '2-1', // Links this node to the group
    extent: 'parent', // Ensures the child stays within the parent's bounds
  },
```

Key properties for group nodes:
*   `type: 'group'`: Designates a node as a group.
*   `parentId`: For a child node, this property links it to its parent group node's `id`.
*   `extent: 'parent'`: (Optional but recommended) When set to `'parent'`, a child node cannot be dragged outside the bounds of its parent group.

By defining nodes in this way, when you drag the group node (`2-1` in the example), its children (`2-2` and `2-3`) will move along with it.

## 4. Custom Nodes

The example includes several custom node components, demonstrating different functionalities.

### `AnnotationNode.jsx`

A simple custom node for displaying annotations.

```jsx
import { memo } from 'react';

function AnnotationNode({ data }) {
  return (
    <>
      <div className='annotation-content'>
        <div className='annotation-level'>{data.level}.</div>
        <div>{data.label}</div>
      </div>
      {data.arrowStyle && (
        <div className="annotation-arrow" style={data.arrowStyle}>
          ⤹
        </div>
      )}
    </>
  );
}

export default memo(AnnotationNode);
```

Custom nodes receive `data` as a prop, which corresponds to the `data` property of the node object in `initial-elements.jsx`.

### `ToolbarNode.jsx`

Demonstrates `NodeToolbar` for adding interactive elements to a node.

```jsx
import { memo, useState } from 'react';
import { Handle, Position, NodeToolbar } from '@xyflow/react';

function ToolbarNode({ data }) {
  const [emoji, setEmoji] = useState('🚀');

  return (
    <>
      <NodeToolbar isVisible>
        {/* Buttons for changing emoji */}
      </NodeToolbar>
      <div>
        <div>{emoji}</div>
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div>{data.label}</div>
    </>
  );
}

export default memo(ToolbarNode);
```

`NodeToolbar` is a component that can be placed inside a custom node to create a toolbar that appears when the node is selected or hovered.

### `ResizerNode.jsx`

Shows how to make a node resizable using `NodeResizer`.

```jsx
import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';

function ResizerNode({ data }) {
  return (
    <>
      <NodeResizer minWidth={1} minHeight={1} /> {/* Makes the node resizable */}
      <Handle type="target" position={Position.Left} className="custom-handle" />
      <div>{data.label}</div>
      {/* Handles for connecting edges */}
    </>
  );
}

export default memo(ResizerNode);
```

`NodeResizer` is a component that adds resizing functionality to a node.

### `TextInputNode.jsx`

An example of a node with input fields that can dynamically update node dimensions.

```jsx
import React, { Fragment, memo } from 'react';
import { Handle, useStore, Position, useReactFlow } from '@xyflow/react';

export default memo(({ id }) => {
  const { setNodes } = useReactFlow();
  // ... logic for updating dimensions
  return (
    <>
      {/* Input fields for width and height */}
      <Handle type="target" position={Position.Top} className="custom-handle" />
    </>
  );
});
```

This node uses `useReactFlow` to access `setNodes` for updating node properties programmatically.

## 5. Inter-Node Communication and State Management

In React Flow, nodes often need to interact with each other or with the overall flow state. This can be achieved through various mechanisms, primarily using the `useReactFlow` hook and managing node/edge state.

### Observing and Updating Other Nodes (Example: `TextInputNode` and `ResizerNode`)

The `TextInputNode.jsx` demonstrates how one node can observe and even modify the properties of another node. In this example, the `TextInputNode` displays and allows editing of the `width` and `height` of the `ResizerNode` (which has `id: '2-3'`).

```jsx
import React, { Fragment, memo } from 'react';
import { Handle, useStore, Position, useReactFlow } from '@xyflow/react';

export default memo(({ id }) => {
  const { setNodes } = useReactFlow(); // Access setNodes to update other nodes

  const dimensions = useStore((s) => {
    const node = s.nodeLookup.get('2-3'); // Directly access node '2-3'
    if (
      !node ||
      !node.measured.width ||
      !node.measured.height ||
      !s.edges.some((edge) => edge.target === id)
    ) {
      return null;
    }
    return {
      width: node.measured.width,
      height: node.measured.height,
    };
  });

  const updateDimension = (attr) => (event) => {
    const value = parseInt(event.target.value);

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === '2-3') { // Target node '2-3'
          // ... logic to update width/height of node '2-3'
          return {
            ...n,
            style: {
              ...n.style,
              [attr]: newSize[attr],
            },
          };
        }
        return n;
      }),
    );
  };

  return (
    <>
      {/* Input fields for width and height */}
      <Handle type="target" position={Position.Top} className="custom-handle" />
    </>
  );
});
```

Key aspects of this interaction:
*   **`useReactFlow()`**: Provides access to the `setNodes` function, which is crucial for programmatically updating the state of nodes in the flow.
*   **`useStore()`**: Allows a component to subscribe to specific parts of the React Flow store. Here, it's used to get the `measured.width` and `measured.height` of a specific node (`'2-3'`).
*   **Direct Node ID Reference**: The `TextInputNode` directly references the `id` of the `ResizerNode` (`'2-3'`) to access and modify its properties.

### Implementing Interactions Between Nodes (e.g., Toolbar to Child Node)

While the provided example's `ToolbarNode` primarily manages its own internal state (the emoji), the principles demonstrated by `TextInputNode` can be extended to implement interactions where one node's actions affect another.

To achieve an interaction where clicking an icon on a "parent" node (like the `ToolbarNode`) changes a "child" node (like the `ResizerNode` or `TextInputNode`), you would typically:

1.  **Pass Callbacks/Props**: The "parent" node could receive a callback function as a prop from `App.tsx` (or a higher-level component). This callback would then update the state of the target "child" node.
2.  **Centralized State Management**: For more complex interactions, a centralized state management solution (e.g., React Context, Redux, Zustand) could be used to manage the state of nodes and allow components to dispatch actions that update other nodes.
3.  **`useReactFlow().setNodes`**: The "parent" node could directly use `setNodes` (obtained from `useReactFlow()`) to update the properties of the target "child" node, similar to how `TextInputNode` updates `ResizerNode`. This would require the "parent" node to know the `id` of the "child" node it intends to affect.

For example, if the `ToolbarNode` needed to change a property of the `ResizerNode`, it could receive the `setNodes` function and the `id` of the `ResizerNode` as props, or access them via `useReactFlow()` and then use `setNodes` to update the `ResizerNode`'s data or style.

## 6. Styling (`index.css`, `xy-theme.css`)

Custom edges allow for more complex interactions and rendering.

```jsx
import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
} from '@xyflow/react';

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = () => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id)); // Example: delete edge on click
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          className="button-edge__label nodrag nopan"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          <button className="button-edge__button" onClick={onEdgeClick}>
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
```

Custom edges receive props like `sourceX`, `sourceY`, `targetX`, `targetY` for positioning. `BaseEdge` renders the actual edge line, and `EdgeLabelRenderer` allows you to render custom HTML elements along the edge, like the button in this example.

### 5.1. Adding Edge Labels

You can add labels to your edges to provide more information. React Flow offers two main ways to do this:

#### Simple Text Labels

For simple text labels, you can directly add a `label` property to your edge object in `initial-elements.jsx`:

```jsx
export const edges = [
  {
    id: 'e1-2',
    source: '1-1',
    target: '1-2',
    label: 'edge', // Simple text label
    type: 'smoothstep',
  },
  // ...
];
```

#### Custom Component Labels (`EdgeLabelRenderer`)

For more complex or interactive labels, you can use the `EdgeLabelRenderer` component within your custom edge component. This allows you to render any React component as an edge label. The `ButtonEdge.jsx` provides a good example:

```jsx
import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer, // Import EdgeLabelRenderer
  getBezierPath,
  useReactFlow,
} from '@xyflow/react';

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = () => {
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer> {/* Use EdgeLabelRenderer to position custom content */}
        <div
          className="button-edge__label nodrag nopan"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          <button className="button-edge__button" onClick={onEdgeClick}>
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
```

Key points for `EdgeLabelRenderer`:
*   It should be used inside your custom edge component.
*   `getBezierPath` (or `getStraightPath`, `getStepPath`) provides `labelX` and `labelY` coordinates, which you can use to position your custom label along the edge.
*   The `transform` CSS property is commonly used to center the label at `(labelX, labelY)`.
*   The `nodrag` and `nopan` classes (or similar styling) are often applied to prevent the label from interfering with dragging or panning the flow.

## 6. Styling (`index.css`, `xy-theme.css`)

The example uses two CSS files for styling:
*   `index.css`: Contains general styles for the app and specific styles for custom nodes and edges (e.g., `.react-flow__node-circle`, `.button-edge__label`).
*   `xy-theme.css`: Provides custom CSS variables and overrides for React Flow's default theming, allowing for consistent styling across the application.

It's important to import `@xyflow/react/dist/style.css` first, then your custom styles to override or extend them.

## Using App Reducer Pattern

```
import React, { useReducer } from 'react';
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import { nodes as initialNodes, edges as initialEdges } from './initial-elements';

const initialState = {
  nodes: initialNodes,
  edges: initialEdges,
  selectedNodes: [],
  selectedEdges: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_NODES':
      return { ...state, nodes: action.payload };
    case 'SET_EDGES':
      return { ...state, edges: action.payload };
    case 'ON_NODES_CHANGE':
      return { ...state, nodes: applyNodeChanges(action.payload, state.nodes) };
    case 'ON_EDGES_CHANGE':
      return { ...state, edges: applyEdgeChanges(action.payload, state.edges) };
    case 'SET_SELECTED_NODES_AND_EDGES':
      return {
        ...state,
        selectedNodes: action.payload.nodes,
        selectedEdges: action.payload.edges,
      };
    case 'SET_SELECTED_NODES':
      return { ...state, selectedNodes: action.payload };
    default:
      return state;
  }
}

export function FlowWithReducer() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Example usage:
  // dispatch({ type: 'SET_NODES', payload: [...] })
  // dispatch({ type: 'ON_NODES_CHANGE', payload: [...] })
  // etc.

  // Pass dispatch or wrapped handlers to your React Flow instance as needed

  return (
    // ... your component rendering logic using state.nodes, state.edges, etc.
    <div>
      {/* Render your flow UI here */}
    </div>
  );
}
```

## Conclusion

This `xyflow-react-example` provides a solid foundation for understanding and implementing various features of `@xyflow/react`. By studying its structure and components, you can learn to create complex and interactive node-based applications.
