import React, { memo, useCallback } from 'react';
import CloseButton from '../common/CloseButton';
import { useNodeLabelEdit } from '../../hooks/useNodeLabelEdit';
import { Handle, Position } from '@xyflow/react';
import { useSchemaModal } from '../SchemaEditorModalManager';

const DEFAULT_NODE_WIDTH = 140;
const DEFAULT_NODE_HEIGHT = 100;

interface ViewNodeProps {
  id: string;
  data: { 
    label: string;
    sourceEvents?: string[];
  };
  selected: boolean;
  onLabelChange: (nodeId: string, label: string) => void;
  onSourcesChange?: (nodeId: string, sourceEvents: string[]) => void;
  onRemove?: (nodeId: string) => void;
  width?: number;
  height?: number;
}

const ViewNode: React.FC<ViewNodeProps> = ({
  id,
  data,
  selected,
  onLabelChange,
  // onSourcesChange is currently unused but kept for future implementation
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
    nodeType: 'ViewNode'
  });

  // Handle remove button click
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
        border: `1px solid ${selected ? '#1a192b' : '#ddd'}`,
        borderRadius: '5px',
        backgroundColor: '#2ecc71', // Green for view
        color: 'white',
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
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          paddingBottom: '5px',
          minWidth: 0,
        }}
      >
        <div style={{ marginRight: '10px', fontSize: '20px', flexShrink: 0 }}>
          👁️ {/* Eye icon for View */}
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
      
      {data.sourceEvents && data.sourceEvents.length > 0 && (
        <div style={{ flex: 1, fontSize: '0.9em' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Data sources:</div>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {data.sourceEvents.map((eventId, index) => (
              <li key={index}>{eventId}</li>
            ))}
          </ul>
        </div>
      )}
      
      {(!data.sourceEvents || data.sourceEvents.length === 0) && (
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
          Read model / Query
        </div>
      )}
      
      {/* Schema button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        marginTop: '10px',
        borderTop: '1px solid rgba(0,0,0,0.1)',
        paddingTop: '5px'
      }}>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            openSchemaEditor(id, data.label, 'view');
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

      {/* Target handle on left - Views can be targets */}
      <Handle type="target" position={Position.Left} style={{ background: 'white' }} />
      {/* Source handle on right - Views can now be sources for UI and Processor */}
      <Handle type="source" position={Position.Right} style={{ background: 'white' }} />
    </div>
    </>
  );
};

export default memo(ViewNode);
