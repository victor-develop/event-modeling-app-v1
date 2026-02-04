import React, { memo, useCallback } from 'react';
import CloseButton from '../common/CloseButton';
import { useNodeLabelEdit } from '../../hooks/useNodeLabelEdit';
import { Handle, Position } from '@xyflow/react';

const DEFAULT_NODE_WIDTH = 140;
const DEFAULT_NODE_HEIGHT = 100;

interface TriggerNodeProps {
  id: string;
  data: { 
    label: string;
    triggerType: 'ui' | 'api' | 'automated';
  };
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
  const w = typeof width === 'number' ? width : DEFAULT_NODE_WIDTH;
  const h = typeof height === 'number' ? height : DEFAULT_NODE_HEIGHT;
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
    nodeType: 'TriggerNode'
  });

  const getTriggerIcon = () => {
    switch (data.triggerType) {
      case 'ui':
        return '🖥️'; // Computer icon for UI
      case 'api':
        return '🔌'; // Plug icon for API
      case 'automated':
        return '🤖'; // Robot icon for automated process
      default:
        return '🖥️';
    }
  };

  // Handle remove button click
  const handleRemoveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(id);
    }
  }, [id, onRemove]);

  return (
    <div
      style={{
        width: w,
        height: h,
        minWidth: w,
        maxWidth: w,
        minHeight: 0,
        border: `1px solid ${selected ? '#1a192b' : '#ddd'}`,
        borderRadius: '5px',
        backgroundColor: 'white',
        padding: '10px',
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
          borderBottom: '1px solid #eee',
          paddingBottom: '5px',
          minWidth: 0,
        }}
      >
        <div style={{ marginRight: '10px', fontSize: '20px', flexShrink: 0 }}>
          {getTriggerIcon()}
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
              background: 'transparent', 
              fontSize: '1em', 
              outline: 'none' 
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
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#888',
        fontSize: '0.9em',
        textAlign: 'center',
        fontStyle: 'italic'
      }}>
        {data.triggerType === 'ui' ? 'User Interface' : 
         data.triggerType === 'api' ? 'API Endpoint' : 'Automated Process'}
      </div>
      
      {/* Source handle on the right - Triggers can only be sources */}
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(TriggerNode);
