import { Position, getSmoothStepPath } from '@xyflow/react';
import { getEdgeStyle } from '../utils/edgeStyling';
import { ConnectionPattern } from '../utils/patternValidation';

// This function returns the edgeTypes object for React Flow
export function createCustomEdgeTypes() {
  return {
    'command-pattern': (props: any) => {
      // Get pattern type from props or use default
      let patternType: ConnectionPattern | undefined;
      
      if (props.data?.patternType) {
        if (props.data.patternType === 'command') {
          patternType = ConnectionPattern.COMMAND_PATTERN;
        } else if (props.data.patternType === 'view') {
          patternType = ConnectionPattern.VIEW_PATTERN;
        } else if (props.data.patternType === 'automation') {
          patternType = ConnectionPattern.AUTOMATION_PATTERN;
        } else if (props.data.patternType === 'ui') {
          patternType = ConnectionPattern.UI_PATTERN;
        } else if (props.data.patternType === 'processor') {
          patternType = ConnectionPattern.PROCESSOR_PATTERN;
        }
      }
      
      // Get edge style from centralized utility
      const edgeStyle = getEdgeStyle(patternType);
      
      // Get source and target positions
      const sourceX = props.sourceX;
      const sourceY = props.sourceY;
      const targetX = props.targetX;
      const targetY = props.targetY;
      
      // Determine source and target positions based on the node positions
      const sourcePosition = props.sourcePosition || Position.Right;
      const targetPosition = props.targetPosition || Position.Left;
      
      // Generate a smooth step path
      const [path] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        borderRadius: 10, // Add a slight curve radius
      });
      
      // Extract the markerEnd from edgeStyle to apply directly to the path
      const { markerEnd, ...otherStyles } = edgeStyle;
      
      return (
        <g>
          <path
            className="react-flow__edge-path"
            d={path}
            style={otherStyles}
            markerEnd="url(#arrowclosed)"
          />
          {props.data?.condition && (
            <text
              className="react-flow__edge-text"
              x={(sourceX + targetX) / 2}
              y={(sourceY + targetY) / 2 - 10}
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fill: '#777', fontSize: '12px', background: '#f5f5f5' }}
            >
              {"?"}
            </text>
          )}
        </g>
      );
    },
  };
}
