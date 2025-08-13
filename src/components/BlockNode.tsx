import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { BlockNodeProps } from '../types/blockTypes';
import { BLOCK_KIND_COLORS, BLOCK_KIND_BORDERS, BLOCK_KIND_ICONS } from '../types/blockTypes';

// Using BlockNodeProps type from blockTypes.ts

const BlockNode: React.FC<BlockNodeProps> = ({
  id,
  data,
  onLabelChange,
  onRemove,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setLabel(data.label);
    }
  }, [data.label, isEditing]);

  // Focus the input when entering edit mode
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleLabelInputChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(evt.target.value);
  }, []);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    console.log('BlockNode handleBlur', { id, label, dataLabel: data.label });
    setIsEditing(false);
    // Always update the label when editing is complete
    console.log('BlockNode calling onLabelChange on blur', { id, label });
    onLabelChange(id, label);
  }, [id, label, data.label, onLabelChange]);

  const handleKeyDown = useCallback((evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (evt.key === 'Enter') {
      setIsEditing(false);
      // Always update the label when pressing Enter
      onLabelChange(id, label);
    }
  }, [id, label, onLabelChange]);

  // Get block kind from data
  const blockKind = data.kind as string || 'event'; // Default to event if not specified
  const blockColor = BLOCK_KIND_COLORS[blockKind] || '#ffffff';
  const blockBorder = BLOCK_KIND_BORDERS[blockKind] || '#cccccc';
  const blockIcon = BLOCK_KIND_ICONS[blockKind] || '📄';

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
        border: `1px solid ${blockBorder}`,
        borderRadius: '5px',
        backgroundColor: blockColor,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '10px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        position: 'relative',
      }}
    >
      {/* Close button */}
      <div 
        onClick={handleRemoveClick}
        style={{
          position: 'absolute',
          top: '2px',
          right: '2px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          cursor: 'pointer',
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#666',
          border: '1px solid #ccc',
          zIndex: 10,
        }}
      >
        ×
      </div>
      <div style={{ 
        fontSize: '16px', 
        marginBottom: '5px' 
      }}>
        {blockIcon}
      </div>
      
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={label}
          onChange={handleLabelInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            border: 'none',
            background: 'transparent',
            textAlign: 'center',
            width: '100%',
            padding: '5px',
            boxSizing: 'border-box',
            outline: 'none',
            boxShadow: 'none',
            fontSize: '14px',
          }}
        />
      ) : (
        <div
          onDoubleClick={handleDoubleClick}
          style={{ 
            cursor: 'text', 
            padding: '5px', 
            width: '100%', 
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          {data.label}
        </div>
      )}

      {/* Add details or other information based on block kind */}
      {data.details && Object.keys(data.details).length > 0 && (
        <div style={{ 
          marginTop: '5px', 
          fontSize: '12px', 
          color: '#555', 
          textAlign: 'center' 
        }}>
          {Object.keys(data.details).length} details
        </div>
      )}
      
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(BlockNode);