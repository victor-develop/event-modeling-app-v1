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
  executeAction,
  dispatchUpdateNodeLabel,
  dispatchUpdateCommandParameters,
  dispatchUpdateEventPayload,
  dispatchUpdateViewSources,
  dispatchRemoveNode
}: {
  executeAction: (actionId: import('../state/actionRegistry').ActionId, input: unknown) => import('../state/actionRegistry').ActionResult,
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
        executeAction={executeAction}
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
