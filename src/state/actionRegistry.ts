import type { Connection } from '@xyflow/react';
import { nanoid } from 'nanoid';
import type { ToastProps } from '../components/Toast';
import { createBlock, validateBlockInSwimlane } from '../utils/blockCreation';
import { getConnectionPatternType, isValidConnection } from '../utils/patternValidation';
import { EdgePriority } from '../types/edgeTypes';
import { EventTypes } from './eventSourcing';
import type { IntentionEventType } from './eventSourcing';

export type ActionId =
  | 'addSwimlane'
  | 'addTrigger'
  | 'addCommand'
  | 'addEvent'
  | 'addView'
  | 'addUi'
  | 'addProcessor'
  | 'updateNodeLabel'
  | 'updateCommandParameters'
  | 'updateEventPayload'
  | 'updateViewSources'
  | 'moveNode'
  | 'removeNode'
  | 'newConnection';

export type ActionContext = {
  nodes: any[];
  edges: any[];
  selectedSwimlaneId: string | null;
};

export type ActionResult =
  | { ok: true; event: IntentionEventType }
  | { ok: false; error: string; toastType?: ToastProps['type'] };

export type ActionExecutor = (actionId: ActionId, input: unknown) => ActionResult;

type ActionDefinition = {
  id: ActionId;
  buildEvent: (input: any, context: ActionContext) => ActionResult;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const getSelectedSwimlane = (nodes: any[], swimlaneId: string | null) =>
  nodes.find((node) => node.id === swimlaneId && node.type === 'swimlane');

type SwimlaneResult =
  | { ok: false; error: string; toastType?: ToastProps['type'] }
  | { ok: true; swimlane: any };

const getSwimlaneForBlock = (context: ActionContext, swimlaneId?: string): SwimlaneResult => {
  const targetSwimlaneId = swimlaneId || context.selectedSwimlaneId;
  if (!targetSwimlaneId) {
    return { ok: false, error: 'Please select a swimlane first before adding a block.', toastType: 'warning' as const };
  }
  const swimlane = getSelectedSwimlane(context.nodes, targetSwimlaneId);
  if (!swimlane) {
    return { ok: false, error: 'Selected swimlane not found.', toastType: 'warning' as const };
  }
  return { ok: true as const, swimlane };
};

type AddBlockEventType =
  | typeof EventTypes.ModelingEditor.ADD_BLOCK
  | typeof EventTypes.ModelingEditor.ADD_TRIGGER
  | typeof EventTypes.ModelingEditor.ADD_COMMAND
  | typeof EventTypes.ModelingEditor.ADD_EVENT
  | typeof EventTypes.ModelingEditor.ADD_VIEW
  | typeof EventTypes.ModelingEditor.ADD_UI
  | typeof EventTypes.ModelingEditor.ADD_PROCESSOR
  | typeof EventTypes.ModelingEditor.ADD_SWIMLANE;

const createBlockEvent = (
  context: ActionContext,
  blockType: string,
  eventType: AddBlockEventType,
  input: { swimlaneId?: string; label?: string },
): ActionResult => {
  const swimlaneResult = getSwimlaneForBlock(context, input.swimlaneId);
  if (swimlaneResult.ok === false) {
    return { ok: false, error: swimlaneResult.error, toastType: swimlaneResult.toastType };
  }

  const swimlane = swimlaneResult.swimlane;
  const validationError = validateBlockInSwimlane(blockType, swimlane.data?.kind);
  if (validationError) {
    return { ok: false, error: validationError, toastType: 'error' };
  }

  const existingBlocks = context.nodes.filter((node) => node.parentId === swimlane.id);
  const newBlock = createBlock({
    blockType,
    parentId: swimlane.id,
    parentPosition: swimlane.position,
    existingBlocks,
  });

  if (isNonEmptyString(input.label)) {
    newBlock.data = { ...newBlock.data, label: input.label.trim() };
  }

  return {
    ok: true,
    event: {
      type: eventType,
      payload: newBlock,
    },
  };
};

const actionRegistry: Record<ActionId, ActionDefinition> = {
  addSwimlane: {
    id: 'addSwimlane',
    buildEvent: (input: { kind?: string; label?: string }, context) => {
      if (!isRecord(input) || !isNonEmptyString(input.kind)) {
        return { ok: false, error: 'Swimlane kind is required.' };
      }
      const kind = input.kind.trim();
      if (!['event', 'command_view', 'trigger'].includes(kind)) {
        return { ok: false, error: `Invalid swimlane kind: ${kind}.` };
      }

      const id = nanoid();
      const existingSwimlanes = context.nodes.filter((node) => node.type === 'swimlane');
      const label =
        isNonEmptyString(input.label)
          ? input.label.trim()
          : `${kind.charAt(0).toUpperCase() + kind.slice(1).replace('_', ' & ')} Swimlane`;

      const newSwimlane = {
        id,
        type: 'swimlane',
        position: { x: 100, y: 100 + existingSwimlanes.length * 200 },
        style: {
          width: 800,
          height: 150,
          backgroundColor:
            kind === 'event'
              ? '#fff8e1'
              : kind === 'command_view'
              ? '#e3f2fd'
              : kind === 'trigger'
              ? '#e8f5e9'
              : '#f5f5f5',
          border: '1px dashed #aaa',
          borderRadius: '5px',
          padding: '10px',
        },
        data: {
          label,
          kind,
        },
      };

      return {
        ok: true,
        event: {
          type: EventTypes.ModelingEditor.ADD_SWIMLANE,
          payload: newSwimlane,
        },
      };
    },
  },
  addTrigger: {
    id: 'addTrigger',
    buildEvent: (input, context) =>
      createBlockEvent(context, 'trigger', EventTypes.ModelingEditor.ADD_TRIGGER, input || {}),
  },
  addCommand: {
    id: 'addCommand',
    buildEvent: (input, context) =>
      createBlockEvent(context, 'command', EventTypes.ModelingEditor.ADD_COMMAND, input || {}),
  },
  addEvent: {
    id: 'addEvent',
    buildEvent: (input, context) =>
      createBlockEvent(context, 'event', EventTypes.ModelingEditor.ADD_EVENT, input || {}),
  },
  addView: {
    id: 'addView',
    buildEvent: (input, context) =>
      createBlockEvent(context, 'view', EventTypes.ModelingEditor.ADD_VIEW, input || {}),
  },
  addUi: {
    id: 'addUi',
    buildEvent: (input, context) =>
      createBlockEvent(context, 'ui', EventTypes.ModelingEditor.ADD_UI, input || {}),
  },
  addProcessor: {
    id: 'addProcessor',
    buildEvent: (input, context) =>
      createBlockEvent(context, 'processor', EventTypes.ModelingEditor.ADD_PROCESSOR, input || {}),
  },
  updateNodeLabel: {
    id: 'updateNodeLabel',
    buildEvent: (input: { nodeId?: string; label?: string }) => {
      if (!isRecord(input) || !isNonEmptyString(input.nodeId) || !isNonEmptyString(input.label)) {
        return { ok: false, error: 'nodeId and label are required.' };
      }
      return {
        ok: true,
        event: {
          type: EventTypes.ModelingEditor.UPDATE_NODE_LABEL,
          payload: { nodeId: input.nodeId.trim(), label: input.label.trim() },
        },
      };
    },
  },
  updateCommandParameters: {
    id: 'updateCommandParameters',
    buildEvent: (input: { nodeId?: string; parameters?: Record<string, string> }) => {
      if (!isRecord(input) || !isNonEmptyString(input.nodeId) || !isRecord(input.parameters)) {
        return { ok: false, error: 'nodeId and parameters are required.' };
      }
      return {
        ok: true,
        event: {
          type: EventTypes.ModelingEditor.UPDATE_COMMAND_PARAMETERS,
          payload: { nodeId: input.nodeId.trim(), parameters: input.parameters },
        },
      };
    },
  },
  updateEventPayload: {
    id: 'updateEventPayload',
    buildEvent: (input: { nodeId?: string; payload?: Record<string, any> }) => {
      if (!isRecord(input) || !isNonEmptyString(input.nodeId) || !isRecord(input.payload)) {
        return { ok: false, error: 'nodeId and payload are required.' };
      }
      return {
        ok: true,
        event: {
          type: EventTypes.ModelingEditor.UPDATE_EVENT_PAYLOAD,
          payload: { nodeId: input.nodeId.trim(), payload: input.payload },
        },
      };
    },
  },
  updateViewSources: {
    id: 'updateViewSources',
    buildEvent: (input: { nodeId?: string; sourceEvents?: string[] }) => {
      if (!isRecord(input) || !isNonEmptyString(input.nodeId) || !Array.isArray(input.sourceEvents)) {
        return { ok: false, error: 'nodeId and sourceEvents are required.' };
      }
      return {
        ok: true,
        event: {
          type: EventTypes.ModelingEditor.UPDATE_VIEW_SOURCES,
          payload: { nodeId: input.nodeId.trim(), sourceEvents: input.sourceEvents },
        },
      };
    },
  },
  moveNode: {
    id: 'moveNode',
    buildEvent: (input: { nodeId?: string; position?: { x: number; y: number } }) => {
      if (!isRecord(input) || !isNonEmptyString(input.nodeId) || !isRecord(input.position)) {
        return { ok: false, error: 'nodeId and position are required.' };
      }
      const { x, y } = input.position as { x: number; y: number };
      if (typeof x !== 'number' || typeof y !== 'number') {
        return { ok: false, error: 'position.x and position.y must be numbers.' };
      }
      return {
        ok: true,
        event: {
          type: EventTypes.ModelingEditor.MOVE_NODE,
          payload: { nodeId: input.nodeId.trim(), position: { x, y } },
        },
      };
    },
  },
  removeNode: {
    id: 'removeNode',
    buildEvent: (input: { nodeId?: string }) => {
      if (!isRecord(input) || !isNonEmptyString(input.nodeId)) {
        return { ok: false, error: 'nodeId is required.' };
      }
      return {
        ok: true,
        event: {
          type: EventTypes.ModelingEditor.REMOVE_NODE,
          payload: { nodeId: input.nodeId.trim() },
        },
      };
    },
  },
  newConnection: {
    id: 'newConnection',
    buildEvent: (input: { source?: string; target?: string; sourceHandle?: string; targetHandle?: string }, context) => {
      if (!isRecord(input) || !isNonEmptyString(input.source) || !isNonEmptyString(input.target)) {
        return { ok: false, error: 'source and target are required.' };
      }

      const sourceNode = context.nodes.find((node) => node.id === input.source);
      const targetNode = context.nodes.find((node) => node.id === input.target);
      const validationResult = isValidConnection(sourceNode || null, targetNode || null);
      if (!validationResult.valid) {
        return { ok: false, error: validationResult.message, toastType: 'error' };
      }

      const patternType = getConnectionPatternType(sourceNode || null, targetNode || null);
      const enhancedConnection = {
        source: input.source,
        target: input.target,
        sourceHandle: input.sourceHandle,
        targetHandle: input.targetHandle,
        data: {
          patternType,
          priority: EdgePriority.MEDIUM,
        },
      } as Connection;

      return {
        ok: true,
        event: {
          type: EventTypes.ReactFlow.NEW_CONNECTION,
          payload: enhancedConnection,
        },
      };
    },
  },
};

export const executeAction = (
  actionId: ActionId,
  input: unknown,
  context: ActionContext,
  dispatch: (event: IntentionEventType) => void,
  showToast?: (props: Omit<ToastProps, 'onClose'>) => void,
): ActionResult => {
  const action = actionRegistry[actionId];
  if (!action) {
    const error = `Unknown action: ${actionId}`;
    showToast?.({ message: error, type: 'error', duration: 5000 });
    return { ok: false, error };
  }

  const result = action.buildEvent(input, context);
  if (result.ok === false) {
    const message = 'error' in result ? result.error : 'Action failed.';
    const toastType = 'toastType' in result ? result.toastType : 'error';
    showToast?.({ message, type: toastType || 'error', duration: 5000 });
    return result;
  }

  dispatch(result.event);
  return result;
};

export const ACTION_IDS: ActionId[] = [
  'addSwimlane',
  'addTrigger',
  'addCommand',
  'addEvent',
  'addView',
  'addUi',
  'addProcessor',
  'updateNodeLabel',
  'updateCommandParameters',
  'updateEventPayload',
  'updateViewSources',
  'moveNode',
  'removeNode',
  'newConnection',
];
