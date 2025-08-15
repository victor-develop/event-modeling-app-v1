// State management and event sourcing for Event Modeling App using functional programming patterns
import { applyEdgeChanges, applyNodeChanges, MarkerType } from '@xyflow/react';
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react';

// --- Event Types and Constants ---
export const EventTypes = {
  ReactFlow: {
    CHANGE_NODES: 'CHANGE_NODES',
    CHANGE_EDGES: 'CHANGE_EDGES',
    NEW_CONNECTION: 'NEW_CONNECTION',
  },
  ModelingEditor: {
    ADD_SWIMLANE: 'ADD_SWIMLANE',
    ADD_BLOCK: 'ADD_BLOCK',
    ADD_TRIGGER: 'ADD_TRIGGER',
    ADD_COMMAND: 'ADD_COMMAND',
    ADD_EVENT: 'ADD_EVENT',
    ADD_VIEW: 'ADD_VIEW',
    ADD_UI: 'ADD_UI',
    ADD_PROCESSOR: 'ADD_PROCESSOR',
    UPDATE_NODE_LABEL: 'UPDATE_NODE_LABEL',
    UPDATE_COMMAND_PARAMETERS: 'UPDATE_COMMAND_PARAMETERS',
    UPDATE_EVENT_PAYLOAD: 'UPDATE_EVENT_PAYLOAD',
    UPDATE_VIEW_SOURCES: 'UPDATE_VIEW_SOURCES',
    MOVE_BLOCK: 'MOVE_BLOCK',
    MOVE_NODE: 'MOVE_NODE',
    REMOVE_NODE: 'REMOVE_NODE',
  },
  EventSourcing: {
    TIME_TRAVEL: 'TIME_TRAVEL',
    LOAD_EVENTS: 'LOAD_EVENTS',
    CREATE_SNAPSHOT: 'CREATE_SNAPSHOT',
  }
} as const;

export const TIME_TRAVELLABLE_EVENTS = [
  EventTypes.ReactFlow.NEW_CONNECTION,
  ...Object.values(EventTypes.ModelingEditor),
];

// --- Types ---
export type ReactFlowNativeEventType = 
  { type: typeof EventTypes.ReactFlow.CHANGE_NODES; payload: NodeChange[] }
  | { type: typeof EventTypes.ReactFlow.CHANGE_EDGES; payload: EdgeChange[] }
  | { type: typeof EventTypes.ReactFlow.NEW_CONNECTION; payload: Connection };

export type ModelingEditorEventType =
  | { type: typeof EventTypes.ModelingEditor.ADD_SWIMLANE; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_BLOCK; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_TRIGGER; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_COMMAND; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_EVENT; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_VIEW; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_UI; payload: any }
  | { type: typeof EventTypes.ModelingEditor.ADD_PROCESSOR; payload: any }
  | { type: typeof EventTypes.ModelingEditor.UPDATE_NODE_LABEL; payload: { nodeId: string; label: string } }
  | { type: typeof EventTypes.ModelingEditor.UPDATE_COMMAND_PARAMETERS; payload: { nodeId: string; parameters: Record<string, string> } }
  | { type: typeof EventTypes.ModelingEditor.UPDATE_EVENT_PAYLOAD; payload: { nodeId: string; payload: Record<string, any> } }
  | { type: typeof EventTypes.ModelingEditor.UPDATE_VIEW_SOURCES; payload: { nodeId: string; sourceEvents: string[] } }
  | { type: typeof EventTypes.ModelingEditor.MOVE_BLOCK; payload: { nodeId: string; position: { x: number; y: number } } }
  | { type: typeof EventTypes.ModelingEditor.MOVE_NODE; payload: { nodeId: string; position: { x: number; y: number } } }
  | { type: typeof EventTypes.ModelingEditor.REMOVE_NODE; payload: { nodeId: string } };

export type EventSourcingEventType =
   { type: typeof EventTypes.EventSourcing.TIME_TRAVEL; payload: { index: number } }
  | { type: typeof EventTypes.EventSourcing.LOAD_EVENTS; payload: IntentionEventType[] }
  | { type: typeof EventTypes.EventSourcing.CREATE_SNAPSHOT; payload: { snapshotNodes: any[]; snapshotEdges: any[]; snapshotIndex: number } };

export type IntentionEventType =
  ReactFlowNativeEventType
  | ModelingEditorEventType
  | EventSourcingEventType;

export interface AppState {
  nodes: any[];
  edges: any[];
  events: IntentionEventType[];
  currentEventIndex: number;
  snapshotNodes: any[] | null;
  snapshotEdges: any[] | null;
  snapshotIndex: number;
}

export const initialState: AppState = {
  nodes: [],
  edges: [],
  events: [],
  currentEventIndex: -1,
  snapshotNodes: null,
  snapshotEdges: null,
  snapshotIndex: -1,
};

// --- Functional Programming Utilities ---
type Reducer<S, A> = (state: S, action: A) => S;
type CanvasState = { nodes: any[], edges: any[] };

// Function composition utility (commented out as currently unused)
// const pipe = <T>(...fns: Array<(arg: T) => T>) => 
//   (value: T): T => fns.reduce((acc, fn) => fn(acc), value);

// --- Event Handlers ---

// ReactFlow event handlers
const handleChangeNodes = (payload: NodeChange[], state: CanvasState): CanvasState => ({
  ...state,
  nodes: applyNodeChanges(payload, state.nodes)
});

const handleChangeEdges = (payload: EdgeChange[], state: CanvasState): CanvasState => ({
  ...state,
  edges: applyEdgeChanges(payload, state.edges)
});

const handleNewConnection = (payload: Connection, state: CanvasState): CanvasState => {
  if (!payload.source || !payload.target) return state;
  
  const extendedConnection = payload as any;
  const newEdge = {
    id: `${payload.source}-${payload.target}-${Date.now()}`,
    source: payload.source,
    target: payload.target,
    animated: extendedConnection.animated || false,
    style: extendedConnection.style || {},
    markerEnd: extendedConnection.markerEnd || { type: MarkerType.ArrowClosed },
    type: 'command-pattern',
    data: extendedConnection.data || { pattern: 'default' }
  };
  
  return {
    ...state,
    edges: [...state.edges, newEdge]
  };
};

// Node addition handlers
const handleAddNode = (payload: any, state: CanvasState): CanvasState => ({
  ...state,
  nodes: [...state.nodes, payload]
});

// Handle adding blocks that might require parent swimlane width update
const handleAddBlock = (payload: any, state: CanvasState): CanvasState => {
  const addedNodeState = handleAddNode(payload, state);
  
  // Update parent swimlane width if needed
  const updatedNodes = addedNodeState.nodes.map((node) => {
    if (node.id === payload.parentId) {
      const currentSwimlaneWidth = node.style?.width || 800;
      const potentialRightEdge = payload.position.x + (payload.style?.width || 100) + 20;
      
      if (potentialRightEdge > currentSwimlaneWidth) {
        return {
          ...node,
          style: {
            ...node.style,
            width: potentialRightEdge,
          },
        };
      }
    }
    return node;
  });
  
  return {
    ...addedNodeState,
    nodes: updatedNodes
  };
};

// Node update handlers
const updateNodeProperty = <T>(
  nodeId: string, 
  propertyPath: string[], 
  value: T, 
  state: CanvasState
): CanvasState => {
  const updatedNodes = state.nodes.map(node => {
    if (node.id !== nodeId) return node;
    
    // Create a deep copy of the node
    const updatedNode = { ...node };
    
    // Navigate to the property path and update the value
    let current: any = updatedNode;
    for (let i = 0; i < propertyPath.length - 1; i++) {
      const key = propertyPath[i];
      current[key] = current[key] ? { ...current[key] } : {};
      current = current[key];
    }
    
    // Set the final property
    current[propertyPath[propertyPath.length - 1]] = value;
    
    return updatedNode;
  });
  
  return {
    ...state,
    nodes: updatedNodes
  };
};

const handleUpdateNodeLabel = (payload: { nodeId: string; label: string }, state: CanvasState): CanvasState => {  
  // Update the node property in the state - that's all we need to do
  // Components will handle schema registration via their own useEffect hooks
  return updateNodeProperty(payload.nodeId, ['data', 'label'], payload.label, state);
};

const handleUpdateCommandParameters = (payload: { nodeId: string; parameters: Record<string, string> }, state: CanvasState): CanvasState => 
  updateNodeProperty(payload.nodeId, ['data', 'parameters'], payload.parameters, state);

const handleUpdateEventPayload = (payload: { nodeId: string; payload: Record<string, any> }, state: CanvasState): CanvasState => 
  updateNodeProperty(payload.nodeId, ['data', 'payload'], payload.payload, state);

const handleUpdateViewSources = (payload: { nodeId: string; sourceEvents: string[] }, state: CanvasState): CanvasState => 
  updateNodeProperty(payload.nodeId, ['data', 'sourceEvents'], payload.sourceEvents, state);

const handleMoveNode = (payload: { nodeId: string; position: { x: number; y: number } }, state: CanvasState): CanvasState => {
  const updatedNodes = state.nodes.map(node => 
    node.id === payload.nodeId
      ? { 
          ...node, 
          position: payload.position,
          positionPerDrop: payload.position // Store the position after drop
        }
      : node
  );
  
  return {
    ...state,
    nodes: updatedNodes
  };
};

const handleRemoveNode = (payload: { nodeId: string }, state: CanvasState): CanvasState => ({
  ...state,
  nodes: state.nodes.filter(node => node.id !== payload.nodeId),
  edges: state.edges.filter(edge => 
    edge.source !== payload.nodeId && 
    edge.target !== payload.nodeId
  )
});

// --- Canvas Reducer ---
export const reduceCanvas = (command: IntentionEventType, nodes: any[], edges: any[]): CanvasState => {
  const state: CanvasState = { nodes, edges };
  
  switch (command.type) {
    case EventTypes.ReactFlow.CHANGE_NODES:
      return handleChangeNodes(command.payload, state);
      
    case EventTypes.ReactFlow.CHANGE_EDGES:
      return handleChangeEdges(command.payload, state);
      
    case EventTypes.ReactFlow.NEW_CONNECTION:
      return handleNewConnection(command.payload, state);
      
    case EventTypes.ModelingEditor.ADD_SWIMLANE:
      return handleAddNode(command.payload, state);
      
    case EventTypes.ModelingEditor.ADD_BLOCK:
    case EventTypes.ModelingEditor.ADD_TRIGGER:
    case EventTypes.ModelingEditor.ADD_COMMAND:
    case EventTypes.ModelingEditor.ADD_EVENT:
    case EventTypes.ModelingEditor.ADD_VIEW:
    case EventTypes.ModelingEditor.ADD_UI:
    case EventTypes.ModelingEditor.ADD_PROCESSOR:
      return handleAddBlock(command.payload, state);
      
    case EventTypes.ModelingEditor.UPDATE_NODE_LABEL:
      return handleUpdateNodeLabel(command.payload, state);
      
    case EventTypes.ModelingEditor.UPDATE_COMMAND_PARAMETERS:
      return handleUpdateCommandParameters(command.payload, state);
      
    case EventTypes.ModelingEditor.UPDATE_EVENT_PAYLOAD:
      return handleUpdateEventPayload(command.payload, state);
      
    case EventTypes.ModelingEditor.UPDATE_VIEW_SOURCES:
      return handleUpdateViewSources(command.payload, state);
      
    case EventTypes.ModelingEditor.MOVE_BLOCK:
    case EventTypes.ModelingEditor.MOVE_NODE:
      return handleMoveNode(command.payload, state);
      
    case EventTypes.ModelingEditor.REMOVE_NODE:
      return handleRemoveNode(command.payload, state);
      
    default:
      return state;
  }
};

// --- Event Sourcing Logic ---
export const applyEvents = (
  events: IntentionEventType[],
  targetIndex: number,
  initialNodes: any[] = [],
  initialEdges: any[] = [],
  startIndex: number = 0,
): CanvasState => {
  if (targetIndex < startIndex || events.length === 0) {
    return { nodes: initialNodes, edges: initialEdges };
  }
  
  return events
    .slice(startIndex, targetIndex + 1)
    .reduce(
      (state, event) => reduceCanvas(event, state.nodes, state.edges),
      { nodes: [...initialNodes], edges: [...initialEdges] }
    );
};

// --- Event Sourcing Handlers ---
const handleTimeTravel = (
  command: { type: typeof EventTypes.EventSourcing.TIME_TRAVEL; payload: { index: number } },
  state: AppState
): AppState => {
  const startNodes = state.snapshotNodes || [];
  const startEdges = state.snapshotEdges || [];
  const startIndex = state.snapshotNodes && state.snapshotEdges ? 0 : 0;
  
  const { nodes: replayedNodes, edges: replayedEdges } = applyEvents(
    state.events,
    command.payload.index,
    startNodes,
    startEdges,
    startIndex
  );
  
  return {
    ...state,
    nodes: replayedNodes,
    edges: replayedEdges,
    currentEventIndex: command.payload.index,
  };
};

const handleLoadEvents = (
  command: { type: typeof EventTypes.EventSourcing.LOAD_EVENTS; payload: IntentionEventType[] },
  state: AppState
): AppState => {
  const newEvents = command.payload;
  const newCurrentEventIndex = newEvents.length > 0 ? newEvents.length - 1 : -1;
  const { nodes: newNodes, edges: newEdges } = applyEvents(newEvents, newCurrentEventIndex);
  
  return {
    ...state,
    nodes: newNodes,
    edges: newEdges,
    events: newEvents,
    currentEventIndex: newCurrentEventIndex,
    snapshotNodes: null,
    snapshotEdges: null,
    snapshotIndex: -1,
  };
};

const handleCreateSnapshot = (
  command: { 
    type: typeof EventTypes.EventSourcing.CREATE_SNAPSHOT; 
    payload: { snapshotNodes: any[]; snapshotEdges: any[]; snapshotIndex: number } 
  },
  state: AppState
): AppState => {
  const { snapshotNodes, snapshotEdges, snapshotIndex } = command.payload;
  const remainingEvents = state.events.slice(snapshotIndex + 1);
  
  return {
    ...state,
    nodes: snapshotNodes,
    edges: snapshotEdges,
    events: remainingEvents,
    currentEventIndex: -1,
    snapshotNodes: snapshotNodes,
    snapshotEdges: snapshotEdges,
    snapshotIndex: snapshotIndex,
  };
};

const handleCanvasEvent = (command: IntentionEventType, state: AppState): AppState => {
  const { nodes: newNodes, edges: newEdges } = reduceCanvas(command, state.nodes, state.edges);
  
  const isTimeTravellable = TIME_TRAVELLABLE_EVENTS.includes(command.type as any);
  
  const newEvents = isTimeTravellable
    ? [...state.events.slice(0, state.currentEventIndex + 1), command]
    : state.events;
    
  const newCurrentEventIndex = isTimeTravellable
    ? state.currentEventIndex + 1
    : state.currentEventIndex;
  
  return {
    ...state,
    nodes: newNodes,
    edges: newEdges,
    events: newEvents,
    currentEventIndex: newCurrentEventIndex,
  };
};

// --- Main Reducer ---
export const appReducer: Reducer<AppState, IntentionEventType> = (state, command) => {
  switch (command.type) {
    case EventTypes.EventSourcing.TIME_TRAVEL:
      return handleTimeTravel(command, state);
      
    case EventTypes.EventSourcing.LOAD_EVENTS:
      return handleLoadEvents(command, state);
      
    case EventTypes.EventSourcing.CREATE_SNAPSHOT:
      return handleCreateSnapshot(command, state);
      
    default:
      return handleCanvasEvent(command, state);
  }
};
