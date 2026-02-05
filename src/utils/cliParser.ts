import { ACTION_IDS } from '../state/actionRegistry';
import type { ActionId } from '../state/actionRegistry';

type CliParseResult =
  | { ok: true; actionId: ActionId; input: unknown }
  | { ok: false; error: string; toastType?: 'info' | 'warning' | 'error' | 'success' };

const tokenize = (input: string): string[] => {
  const tokens: string[] = [];
  const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    if (match[1] !== undefined) tokens.push(match[1]);
    else if (match[2] !== undefined) tokens.push(match[2]);
    else if (match[3] !== undefined) tokens.push(match[3]);
  }
  return tokens;
};

const parseKeyValuePairs = (input: string): Record<string, string> | null => {
  if (!input) return null;
  const result: Record<string, string> = {};
  const pairs = input.split(',').map((pair) => pair.trim()).filter(Boolean);
  for (const pair of pairs) {
    const [key, ...rest] = pair.split('=');
    if (!key || rest.length === 0) return null;
    result[key.trim()] = rest.join('=').trim();
  }
  return result;
};

const parseList = (input: string): string[] | null => {
  if (!input) return null;
  const items = input.split(',').map((item) => item.trim()).filter(Boolean);
  return items.length > 0 ? items : null;
};

const isActionId = (value: string): value is ActionId =>
  ACTION_IDS.includes(value as ActionId);

const parseJsonCommand = (raw: string): CliParseResult => {
  const jsonText = raw.trim();
  if (!jsonText) {
    return { ok: false, error: 'Missing JSON payload after jsoncmd.' };
  }
  try {
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'JSON command must be an object.' };
    }
    const actionId = (parsed.actionId || parsed.action || '').toString();
    if (!isActionId(actionId)) {
      return { ok: false, error: `Unknown actionId: ${actionId}` };
    }
    const input = parsed.input ?? parsed.payload ?? {};
    return { ok: true, actionId, input };
  } catch (error) {
    return { ok: false, error: `Invalid JSON: ${(error as Error).message}` };
  }
};

const helpMessage = [
  'Commands:',
  '  add swimlane <event|command_view|trigger> ["Label"]',
  '  add <trigger|command|event|view|ui|processor> [swimlaneId] ["Label"]',
  '  label <nodeId> "New Label"',
  '  set command-params <nodeId> key=value[,key=value]',
  '  set event-payload <nodeId> key=value[,key=value]',
  '  set view-sources <nodeId> id1,id2',
  '  move <nodeId> <x> <y>',
  '  remove <nodeId>',
  '  connect <sourceId> <targetId>',
  '  jsoncmd {"actionId":"addCommand","input":{...}}',
].join('\n');

export const parseCliInput = (raw: string): CliParseResult => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: 'Command is empty.' };
  }

  if (trimmed.toLowerCase().startsWith('jsoncmd')) {
    const jsonText = trimmed.slice('jsoncmd'.length).trim();
    return parseJsonCommand(jsonText);
  }

  const tokens = tokenize(trimmed);
  if (tokens.length === 0) {
    return { ok: false, error: 'Command is empty.' };
  }

  const [command, ...rest] = tokens;
  switch (command.toLowerCase()) {
    case 'help':
      return { ok: false, error: helpMessage, toastType: 'info' };
    case 'add': {
      const [type, arg1, arg2] = rest;
      if (!type) return { ok: false, error: 'Add command requires a type.' };
      const normalizedType = type.toLowerCase();
      if (normalizedType === 'swimlane') {
        if (!arg1) return { ok: false, error: 'Swimlane kind is required.' };
        return {
          ok: true,
          actionId: 'addSwimlane',
          input: { kind: arg1, label: arg2 },
        };
      }
      const label = rest.length > 1 ? rest[rest.length - 1] : undefined;
      const swimlaneId = rest.length > 1 ? rest[0] : undefined;
      switch (normalizedType) {
        case 'trigger':
          return { ok: true, actionId: 'addTrigger', input: { swimlaneId, label } };
        case 'command':
          return { ok: true, actionId: 'addCommand', input: { swimlaneId, label } };
        case 'event':
          return { ok: true, actionId: 'addEvent', input: { swimlaneId, label } };
        case 'view':
          return { ok: true, actionId: 'addView', input: { swimlaneId, label } };
        case 'ui':
          return { ok: true, actionId: 'addUi', input: { swimlaneId, label } };
        case 'processor':
          return { ok: true, actionId: 'addProcessor', input: { swimlaneId, label } };
        default:
          return { ok: false, error: `Unknown add type: ${type}` };
      }
    }
    case 'label': {
      const [nodeId, ...labelParts] = rest;
      if (!nodeId || labelParts.length === 0) {
        return { ok: false, error: 'Usage: label <nodeId> "New Label"' };
      }
      return { ok: true, actionId: 'updateNodeLabel', input: { nodeId, label: labelParts.join(' ') } };
    }
    case 'set': {
      const [target, nodeId, ...args] = rest;
      if (!target || !nodeId || args.length === 0) {
        return { ok: false, error: 'Usage: set <command-params|event-payload|view-sources> <nodeId> ...' };
      }
      const payloadArg = args.join(' ');
      switch (target.toLowerCase()) {
        case 'command-params': {
          const parameters = parseKeyValuePairs(payloadArg);
          if (!parameters) return { ok: false, error: 'Invalid parameters. Use key=value[,key=value].' };
          return { ok: true, actionId: 'updateCommandParameters', input: { nodeId, parameters } };
        }
        case 'event-payload': {
          const payload = parseKeyValuePairs(payloadArg);
          if (!payload) return { ok: false, error: 'Invalid payload. Use key=value[,key=value].' };
          return { ok: true, actionId: 'updateEventPayload', input: { nodeId, payload } };
        }
        case 'view-sources': {
          const sourceEvents = parseList(payloadArg);
          if (!sourceEvents) return { ok: false, error: 'Invalid sources. Use id1,id2.' };
          return { ok: true, actionId: 'updateViewSources', input: { nodeId, sourceEvents } };
        }
        default:
          return { ok: false, error: `Unknown set target: ${target}` };
      }
    }
    case 'move': {
      const [nodeId, xRaw, yRaw] = rest;
      if (!nodeId || xRaw === undefined || yRaw === undefined) {
        return { ok: false, error: 'Usage: move <nodeId> <x> <y>' };
      }
      const x = Number(xRaw);
      const y = Number(yRaw);
      if (Number.isNaN(x) || Number.isNaN(y)) {
        return { ok: false, error: 'x and y must be numbers.' };
      }
      return { ok: true, actionId: 'moveNode', input: { nodeId, position: { x, y } } };
    }
    case 'remove': {
      const [nodeId] = rest;
      if (!nodeId) return { ok: false, error: 'Usage: remove <nodeId>' };
      return { ok: true, actionId: 'removeNode', input: { nodeId } };
    }
    case 'connect': {
      const [source, target] = rest;
      if (!source || !target) return { ok: false, error: 'Usage: connect <sourceId> <targetId>' };
      return { ok: true, actionId: 'newConnection', input: { source, target } };
    }
    default:
      return { ok: false, error: `Unknown command: ${command}. Type "help" for commands.` };
  }
};

export type { CliParseResult };
