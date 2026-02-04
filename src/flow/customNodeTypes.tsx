// React is used implicitly by JSX
import SwimlaneNode from '../components/SwimlaneNode';
import TriggerNode from '../components/nodes/TriggerNode';
import CommandNode from '../components/nodes/CommandNode';
import EventNode from '../components/nodes/EventNode';
import ViewNode from '../components/nodes/ViewNode';
import UINode from '../components/nodes/UINode';
import ProcessorNode from '../components/nodes/ProcessorNode';

// The dispatch* functions must be passed in from App for correct closure
export function createCustomNodeTypes({
  dispatch,
  dispatchUpdateNodeLabel,
  dispatchUpdateCommandParameters,
  dispatchUpdateEventPayload,
  dispatchUpdateViewSources,
  dispatchRemoveNode
}: {
  dispatch: any,
  dispatchUpdateNodeLabel: (nodeId: string, label: string) => void,
  dispatchUpdateCommandParameters: (nodeId: string, parameters: Record<string, string>) => void,
  dispatchUpdateEventPayload: (nodeId: string, payload: Record<string, any>) => void,
  dispatchUpdateViewSources: (nodeId: string, sourceEvents: string[]) => void,
  dispatchRemoveNode: (nodeId: string) => void
}) {
  return {
    swimlane: (nodeProps: any) => (
      <SwimlaneNode
        {...nodeProps}
        dispatchAddBlock={(blockData: any) => {
          switch (blockData.type) {
            case 'trigger':
              dispatch({ type: 'ADD_TRIGGER', payload: blockData });
              break;
            case 'command':
              dispatch({ type: 'ADD_COMMAND', payload: blockData });
              break;
            case 'event':
              dispatch({ type: 'ADD_EVENT', payload: blockData });
              break;
            case 'view':
              dispatch({ type: 'ADD_VIEW', payload: blockData });
              break;
            case 'ui':
            case 'UI':
              dispatch({ type: 'ADD_UI', payload: blockData });
              break;
            case 'processor':
            case 'Processor':
              dispatch({ type: 'ADD_PROCESSOR', payload: blockData });
              break;
            default:
              console.error(`Unknown block type: ${blockData.type}`);
          }
        }}
        dispatchUpdateNodeLabel={dispatchUpdateNodeLabel}
      />
    ),
    trigger: (nodeProps: any) => <TriggerNode {...nodeProps} onLabelChange={dispatchUpdateNodeLabel} onRemove={dispatchRemoveNode} />,
    command: (nodeProps: any) => <CommandNode {...nodeProps} onLabelChange={dispatchUpdateNodeLabel} onParametersChange={dispatchUpdateCommandParameters} onRemove={dispatchRemoveNode} />,
    event: (nodeProps: any) => <EventNode {...nodeProps} onLabelChange={dispatchUpdateNodeLabel} onPayloadChange={dispatchUpdateEventPayload} onRemove={dispatchRemoveNode} />,
    view: (nodeProps: any) => <ViewNode {...nodeProps} onLabelChange={dispatchUpdateNodeLabel} onSourcesChange={dispatchUpdateViewSources} onRemove={dispatchRemoveNode} />,
    UI: (nodeProps: any) => <UINode {...nodeProps} onLabelChange={dispatchUpdateNodeLabel} onRemove={dispatchRemoveNode} />,
    Processor: (nodeProps: any) => <ProcessorNode {...nodeProps} onLabelChange={dispatchUpdateNodeLabel} onRemove={dispatchRemoveNode} />,
  };
}
