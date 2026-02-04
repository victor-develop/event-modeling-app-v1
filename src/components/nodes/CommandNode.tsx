import React, { memo, useCallback } from 'react';
import CloseButton from '../common/CloseButton';
import { useNodeLabelEdit } from '../../hooks/useNodeLabelEdit';
import { Handle, Position } from '@xyflow/react';
import { useSchemaModal } from '../SchemaEditorModalManager';

const DEFAULT_NODE_WIDTH = 140;
const DEFAULT_NODE_HEIGHT = 100;

interface CommandNodeProps {
  id: string;
  data: { 
    label: string;
    parameters?: Record<string, string>;
  };
  selected: boolean;
  onLabelChange: (nodeId: string, label: string) => void;
  onParametersChange?: (nodeId: string, parameters: Record<string, string>) => void;
  onRemove?: (nodeId: string) => void;
  width?: number;
  height?: number;
}

const CommandNode: React.FC<CommandNodeProps> = ({
  id,
  data,
  selected,
  onLabelChange,
  // onParametersChange is currently unused but kept for future implementation
  onRemove,
  width,
  height,
}) => {
  const w = typeof width === 'number' ? width : DEFAULT_NODE_WIDTH;
  const h = typeof height === 'number' ? height : DEFAULT_NODE_HEIGHT;
  const { openSchemaEditor } = useSchemaModal();
  const {
    label,
    isEditing,
    inputRef,
    handleLabelChange,
    handleDoubleClick,
    handleBlur,
    handleKeyDown
  } = useNodeLabelEdit({
    id,
    initialLabel: data.label,
    onLabelChange,
    nodeType: 'CommandNode'
  });

  const handleRemoveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(id);
    }
  }, [id, onRemove]);

  return (
    <>
      <div
        style={{
          width: w,
          height: h,
          minWidth: w,
          maxWidth: w,
          minHeight: 0,
          padding: '10px',
          borderRadius: '5px',
          backgroundColor: '#3498db',
          color: 'white',
          border: `1px solid ${selected ? '#1a192b' : '#ddd'}`,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          boxShadow: selected ? '0 0 0 2px #1a192b' : 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
      {/* Close button */}
      <CloseButton onClick={handleRemoveClick} />
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '10px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          paddingBottom: '5px',
          minWidth: 0,
        }}
      >
        <div style={{ marginRight: '10px', fontSize: '20px', flexShrink: 0 }}>
          ⚡ {/* Lightning bolt for Command */}
        </div>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={handleLabelChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{ 
              flex: 1,
              minWidth: 0,
              fontWeight: 'bold', 
              border: 'none', 
              background: 'rgba(255,255,255,0.1)', 
              color: 'white',
              fontSize: '1em', 
              outline: 'none',
              borderRadius: '3px',
              padding: '2px 5px'
            }}
          />
        ) : (
          <div
            onDoubleClick={handleDoubleClick}
            style={{ 
              flex: 1,
              minWidth: 0,
              fontWeight: 'bold', 
              cursor: 'text', 
              fontSize: '1em',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              whiteSpace: 'normal',
            }}
          >
            {data.label}
          </div>
        )}
      </div>
      
      {data.parameters && Object.keys(data.parameters).length > 0 && (
        <div style={{ flex: 1, fontSize: '0.9em' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Parameters:</div>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {Object.entries(data.parameters).map(([key, value]) => (
              <li key={key}>{key}: {value}</li>
            ))}
          </ul>
        </div>
      )}
      
      {(!data.parameters || Object.keys(data.parameters).length === 0) && (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.7)',
          fontSize: '0.9em',
          textAlign: 'center',
          fontStyle: 'italic'
        }}>
          Intent to change state
        </div>
      )}
      
      {/* Schema button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginTop: '10px',
        borderTop: '1px solid rgba(255,255,255,0.2)',
        paddingTop: '5px'
      }}>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            openSchemaEditor(id, data.label, 'command');
          }}
          style={{
            backgroundColor: '#9b59b6',
            color: 'white',
            border: 'none',
            padding: '3px 8px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Edit Schema
        </button>
      </div>

      {/* Handle on both left and right */}
      <Handle type="target" position={Position.Left} style={{ background: 'white' }} />
      <Handle type="source" position={Position.Right} style={{ background: 'white' }} />
    </div>
    </>
  );
};

export default memo(CommandNode);
