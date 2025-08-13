import React, { memo, useCallback } from 'react';
import CloseButton from '../common/CloseButton';
import { useNodeLabelEdit } from '../../hooks/useNodeLabelEdit';
import { Handle, Position } from '@xyflow/react';

interface ProcessorNodeProps {
  id: string;
  data: { 
    label: string;
  };
  selected: boolean;
  onLabelChange?: (nodeId: string, label: string) => void;
  onRemove?: (nodeId: string) => void;
}

const ProcessorNode: React.FC<ProcessorNodeProps> = ({
  id,
  data,
  selected,
  onLabelChange = () => {},
  onRemove
}) => {
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
    nodeType: 'ProcessorNode'
  });

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
        width: '100%',
        height: '100%',
        border: `1px solid ${selected ? '#1a192b' : '#6b7280'}`,
        borderRadius: '5px',
        backgroundColor: '#d1d5db', // Gray
        color: '#222',
        padding: '10px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: selected ? '0 0 0 2px #1a192b' : '0 0 4px rgba(107,114,128,0.15)',
        position: 'relative',
      }}
    >
      {/* Close button */}
      <CloseButton onClick={handleRemoveClick} />
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: '10px',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          paddingBottom: '5px'
        }}
      >
        <div style={{ marginRight: '10px', fontSize: '20px' }}>
          ⚙️
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
              fontWeight: 'bold', 
              border: 'none', 
              background: 'rgba(0,0,0,0.05)', 
              color: '#222',
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
              fontWeight: 'bold', 
              cursor: 'text', 
              fontSize: '1em' 
            }}
          >
            {label}
          </div>
        )}
      </div>
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#444',
        fontSize: '0.8em',
        textAlign: 'center',
        fontStyle: 'italic'
      }}>
        Automated Processor
      </div>
      
      {/* Handle placement matching Trigger node */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="in" 
        style={{ 
          background: '#fff',
          width: '10px',
          height: '10px',
          border: '1px solid #6b7280'
        }} 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        id="out" 
        style={{ 
          background: '#fff',
          width: '10px',
          height: '10px',
          border: '1px solid #6b7280'
        }} 
      />
    </div>
  );
};

export default memo(ProcessorNode);
