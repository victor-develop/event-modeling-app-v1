import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useNodeLabelEdit } from '../../hooks/useNodeLabelEdit';
import BaseBlockNode from './BaseBlockNode';

interface ProcessorNodeProps {
  id: string;
  data: { label: string };
  selected: boolean;
  onLabelChange?: (nodeId: string, label: string) => void;
  onRemove?: (nodeId: string) => void;
  width?: number;
  height?: number;
}

const ProcessorNode: React.FC<ProcessorNodeProps> = ({
  id,
  data,
  selected,
  onLabelChange = () => {},
  onRemove,
  width,
  height,
}) => {
  const labelEdit = useNodeLabelEdit({
    id,
    initialLabel: data.label,
    onLabelChange,
    nodeType: 'ProcessorNode',
  });

  return (
    <>
      <BaseBlockNode
        id={id}
        selected={selected}
        onRemove={onRemove}
        width={width}
        height={height}
        backgroundColor="#d1d5db"
        borderColor={selected ? '#1a192b' : '#6b7280'}
        color="#222"
        boxShadow={selected ? '0 0 0 2px #1a192b' : '0 0 4px rgba(107,114,128,0.15)'}
        icon="⚙️"
        headerBorderBottom="1px solid rgba(0,0,0,0.1)"
        inputBackground="rgba(0,0,0,0.05)"
        labelProps={{ ...labelEdit, displayLabel: labelEdit.label }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#444',
            fontSize: '0.8em',
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          Automated Processor
        </div>
      </BaseBlockNode>
      <Handle type="target" position={Position.Left} id="in" style={{ background: '#fff', width: 10, height: 10, border: '1px solid #6b7280' }} />
      <Handle type="source" position={Position.Right} id="out" style={{ background: '#fff', width: 10, height: 10, border: '1px solid #6b7280' }} />
    </>
  );
};

export default memo(ProcessorNode);
