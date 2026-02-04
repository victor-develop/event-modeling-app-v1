import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useNodeLabelEdit } from '../../hooks/useNodeLabelEdit';
import BaseBlockNode from './BaseBlockNode';

interface UINodeProps {
  id: string;
  data: { label: string };
  selected: boolean;
  onLabelChange?: (nodeId: string, label: string) => void;
  onRemove?: (nodeId: string) => void;
  width?: number;
  height?: number;
}

const UINode: React.FC<UINodeProps> = ({
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
    nodeType: 'UINode',
  });

  return (
    <>
      <BaseBlockNode
        id={id}
        selected={selected}
        onRemove={onRemove}
        width={width}
        height={height}
        backgroundColor="#a78bfa"
        borderColor={selected ? '#1a192b' : '#7c3aed'}
        color="white"
        boxShadow={selected ? '0 0 0 2px #1a192b' : '0 0 4px rgba(124,58,237,0.15)'}
        icon="🖥️"
        headerBorderBottom="1px solid rgba(255,255,255,0.2)"
        inputBackground="rgba(255,255,255,0.1)"
        labelProps={{ ...labelEdit, displayLabel: labelEdit.label }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.8)',
            fontSize: '0.8em',
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          User Interface
        </div>
      </BaseBlockNode>
      <Handle type="target" position={Position.Left} id="in" style={{ background: 'white', width: 10, height: 10, border: '1px solid #7c3aed' }} />
      <Handle type="source" position={Position.Right} id="out" style={{ background: 'white', width: 10, height: 10, border: '1px solid #7c3aed' }} />
    </>
  );
};

export default memo(UINode);
