import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useNodeLabelEdit } from '../../hooks/useNodeLabelEdit';
import { useSchemaModal } from '../SchemaEditorModalManager';
import BaseBlockNode from './BaseBlockNode';

interface EventNodeProps {
  id: string;
  data: { label: string; payload?: Record<string, any> };
  selected: boolean;
  onLabelChange: (nodeId: string, label: string) => void;
  onPayloadChange?: (nodeId: string, payload: Record<string, any>) => void;
  onRemove?: (nodeId: string) => void;
  width?: number;
  height?: number;
}

const EventNode: React.FC<EventNodeProps> = ({
  id,
  data,
  selected,
  onLabelChange,
  onRemove,
  width,
  height,
}) => {
  const { openSchemaEditor } = useSchemaModal();
  const labelEdit = useNodeLabelEdit({
    id,
    initialLabel: data.label,
    onLabelChange,
    nodeType: 'EventNode',
  });

  const hasPayload = data.payload && Object.keys(data.payload).length > 0;

  return (
    <>
    <BaseBlockNode
      id={id}
      selected={selected}
      onRemove={onRemove}
      width={width}
      height={height}
      backgroundColor="#f39c12"
      borderColor={selected ? '#1a192b' : '#ddd'}
      color="white"
      boxShadow={selected ? '0 0 0 2px #1a192b' : 'none'}
      icon="📝"
      headerBorderBottom="1px solid rgba(255,255,255,0.2)"
      inputBackground="rgba(255,255,255,0.1)"
      labelProps={{ ...labelEdit, displayLabel: data.label }}
    >
      {hasPayload ? (
        <div style={{ flex: 1, fontSize: '0.9em' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Payload:</div>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {Object.entries(data.payload!).map(([key, value]) => (
              <li key={key}>{key}: {String(value)}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.9em',
            textAlign: 'center',
            fontStyle: 'italic',
          }}
        >
          Business fact / State change
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '10px',
          borderTop: '1px solid rgba(0,0,0,0.1)',
          paddingTop: '5px',
        }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            openSchemaEditor(id, data.label, 'event');
          }}
          style={{
            backgroundColor: '#9b59b6',
            color: 'white',
            border: 'none',
            padding: '3px 8px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Edit Schema
        </button>
      </div>
    </BaseBlockNode>
      <Handle type="target" position={Position.Left} style={{ background: 'white' }} />
      <Handle type="source" position={Position.Right} style={{ background: 'white' }} />
    </>
  );
};

export default memo(EventNode);
