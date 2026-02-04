import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useNodeLabelEdit } from '../../hooks/useNodeLabelEdit';
import BaseBlockNode from './BaseBlockNode';

interface TriggerNodeProps {
  id: string;
  data: { label: string; triggerType: 'ui' | 'api' | 'automated' };
  selected: boolean;
  onLabelChange: (nodeId: string, label: string) => void;
  onRemove?: (nodeId: string) => void;
  width?: number;
  height?: number;
}

const TriggerNode: React.FC<TriggerNodeProps> = ({
  id,
  data,
  selected,
  onLabelChange,
  onRemove,
  width,
  height,
}) => {
  const labelEdit = useNodeLabelEdit({
    id,
    initialLabel: data.label,
    onLabelChange,
    nodeType: 'TriggerNode',
  });

  const getTriggerIcon = () => {
    switch (data.triggerType) {
      case 'ui': return '🖥️';
      case 'api': return '🔌';
      case 'automated': return '🤖';
      default: return '🖥️';
    }
  };

  const subtitle =
    data.triggerType === 'ui'
      ? 'User Interface'
      : data.triggerType === 'api'
        ? 'API Endpoint'
        : 'Automated Process';

  return (
    <>
      <BaseBlockNode
        id={id}
        selected={selected}
        onRemove={onRemove}
        width={width}
        height={height}
        backgroundColor="white"
        borderColor={selected ? '#1a192b' : '#ddd'}
        color="#222"
        boxShadow={selected ? '0 0 0 2px #1a192b' : 'none'}
        icon={getTriggerIcon()}
        headerBorderBottom="1px solid #eee"
        inputBackground="transparent"
        labelProps={{
          ...labelEdit,
          displayLabel: data.label,
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#888',
            fontSize: '0.9em',
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          {subtitle}
        </div>
      </BaseBlockNode>
      <Handle type="source" position={Position.Right} />
    </>
  );
};

export default memo(TriggerNode);
