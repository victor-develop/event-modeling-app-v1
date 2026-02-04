import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { SwimlaneNodeProps } from '../types/swimlaneTypes';
import { 
  ALLOWED_BLOCK_TYPES, 
  SWIMLANE_KIND_COLORS,
  SWIMLANE_KIND_LABELS 
} from '../types/swimlaneTypes';
import { BLOCK_KIND_BORDERS } from '../types/blockTypes';
import { createBlock, validateBlockInSwimlane } from '../utils/blockCreation';
import { useToast } from '../context/ToastContext';

const SwimlaneNode: React.FC<SwimlaneNodeProps> = ({
  id,
  data,
  dispatchAddBlock,
  dispatchUpdateNodeLabel,
  selected,
}) => {
  const { getNodes } = useReactFlow();
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label);
  const [showControls, setShowControls] = useState(false);
  const [mouseX, setMouseX] = useState(0);
  const [controlBarX, setControlBarX] = useState(0);
  const [isMouseOverBar, setIsMouseOverBar] = useState(false);
  const swimlaneRef = useRef<HTMLDivElement>(null);
  const controlBarRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setLabel(data.label);
    }
  }, [data.label, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const onLabelChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(evt.target.value);
  }, []);

  // Get the allowed block types for this swimlane kind
  const swimlaneKind = data.kind as string | undefined;
  const allowedBlockTypes = swimlaneKind && ALLOWED_BLOCK_TYPES[swimlaneKind] ? ALLOWED_BLOCK_TYPES[swimlaneKind] : [];

  // Create a block of the specific type
  const createBlockInSwimlane = useCallback((blockType: string): void => {
    const parentNode = getNodes().find((node) => node.id === id);
    if (!parentNode) return;

    // Validate if this block type can be added to this swimlane kind
    const swimlaneKind = parentNode.data?.kind as string;
    const validationError = validateBlockInSwimlane(blockType.toLowerCase(), swimlaneKind);
    if (validationError) {
      console.warn(validationError);
      showToast({
        message: validationError,
        type: 'error',
        duration: 5000
      });
      return;
    }

    // Get existing blocks in this swimlane
    const existingBlocks = getNodes().filter((node) => node.parentId === id);
    
    // Use the shared block creation utility
    const newBlock = createBlock({
      blockType: blockType.toLowerCase(),
      parentId: id,
      parentPosition: parentNode.position,
      existingBlocks: existingBlocks
    });

    // The swimlane width update logic is handled in the appReducer (ADD_BLOCK case)
    dispatchAddBlock(newBlock);
  }, [id, getNodes, dispatchAddBlock]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    dispatchUpdateNodeLabel(id, label);
  }, [id, label, dispatchUpdateNodeLabel]);

  const handleKeyDown = useCallback((evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (evt.key === 'Enter') {
      setIsEditing(false);
      dispatchUpdateNodeLabel(id, label);
    }
  }, [id, label, dispatchUpdateNodeLabel]);

  // Focus effect styles - only border and subtle shadow, no overlay
  const focusStyles = selected ? {
    border: '2px solid #3182ce',
    boxShadow: '0 0 0 2px rgba(49, 130, 206, 0.3)',
    zIndex: 10
  } : {};
  
  // Base styles for the swimlane
  const baseStyles: React.CSSProperties = {
    width: '100%',
    height: '100%',
    border: '1px solid #ccc', // Default border, focus border is in focusStyles
    borderRadius: '5px',
    backgroundColor: swimlaneKind && SWIMLANE_KIND_COLORS[swimlaneKind] 
      ? SWIMLANE_KIND_COLORS[swimlaneKind] // Keep original background regardless of selection
      : 'rgba(200,200,255,0.2)',
    padding: '5px 5px 5px 0px', // Reduced left padding to minimize gap
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'relative',
    transition: 'all 0.2s ease',
  };

  // Handle keyboard focus events
  const handleFocus = useCallback(() => {
    // This would be where we'd dispatch an action to select this swimlane
    // if we weren't already using the selected prop
  }, []);
  
  // Handle mouse movement for floating control bar.
  // Convert screen-relative X to node-local X so the bar stays under the cursor at any zoom level.
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (swimlaneRef.current) {
      const rect = swimlaneRef.current.getBoundingClientRect();
      const el = swimlaneRef.current;
      const relativeXScreen = e.clientX - rect.left;
      const renderedWidth = rect.width;
      const layoutWidth = el.clientWidth;
      const scale = renderedWidth > 0 && layoutWidth > 0 ? layoutWidth / renderedWidth : 1;
      const localX = relativeXScreen * scale;
      setMouseX(localX);

      if (!isMouseOverBar) {
        const distance = Math.abs(localX - controlBarX);
        if (distance > 100) {
          setControlBarX(localX);
        }
      }
    }
  }, [controlBarX, isMouseOverBar]);
  
  // Handle mouse enter/leave for showing/hiding control bar
  const handleMouseEnter = useCallback(() => {
    setShowControls(true);
    // Use last known mouse position (zoom-aware), or center if none yet
    if (swimlaneRef.current) {
      const w = swimlaneRef.current.clientWidth;
      setControlBarX(mouseX > 0 && mouseX < w ? mouseX : w / 2);
    }
  }, [mouseX]);
  
  const handleMouseLeave = useCallback(() => {
    setShowControls(false);
  }, []);

  return (
    <div
      ref={swimlaneRef}
      style={{
        ...baseStyles,
        ...focusStyles
      }}
      tabIndex={0} // Make the swimlane focusable with keyboard
      onFocus={handleFocus}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={`${swimlaneKind || 'Unknown'} swimlane: ${label}`} // Accessibility label
    >
      {/* Add vertical drag handle for restricted vertical movement */}
      <div className="vertical-drag-handle" style={{
        position: 'absolute',
        left: '50%',
        top: '0px',
        transform: 'translateX(-50%)',
        width: '30px',
        height: '10px',
        background: selected ? '#3182ce' : '#888',
        borderBottomLeftRadius: '4px',
        borderBottomRightRadius: '4px',
        cursor: 'ns-resize',
        zIndex: 10,
        transition: 'background-color 0.2s ease',
      }} />
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'row' as const, 
        justifyContent: 'space-between' as const, 
        alignItems: 'center' as const,
        marginBottom: '10px',
        padding: '0px',
        backgroundColor: 'transparent',
        borderRadius: '4px',
        transition: 'all 0.2s ease',
      }}>
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={label}
            onChange={onLabelChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{ 
              fontWeight: 'bold', 
              border: 'none', 
              background: 'transparent', 
              fontSize: '1em', 
              outline: 'none',
              flexGrow: 1
            }}
          />
        ) : (
          <div
            onDoubleClick={handleDoubleClick}
            style={{ 
              fontWeight: 'bold', 
              cursor: 'text', 
              fontSize: '1em',
              flexGrow: 1
            }}
          >
            {data.label || (swimlaneKind && SWIMLANE_KIND_LABELS[swimlaneKind] ? SWIMLANE_KIND_LABELS[swimlaneKind] : 'Swimlane')}
          </div>
        )}
        <div className="swimlane-kind-badge" style={{ 
          fontSize: '0.8em', 
          backgroundColor: 'rgba(255,255,255,0.6)', 
          padding: '2px 6px',
          borderRadius: '10px',
          border: 'none',
          transition: 'all 0.2s ease',
        }}>
          {swimlaneKind && SWIMLANE_KIND_LABELS[swimlaneKind] ? SWIMLANE_KIND_LABELS[swimlaneKind] : 'Generic'}
        </div>
      </div>
      
      {/* Floating control bar that follows mouse horizontally but stays fixed at top */}
      {showControls && (
        <div 
          ref={controlBarRef}
          className="floating-control-bar"
          onMouseEnter={() => setIsMouseOverBar(true)}
          onMouseLeave={() => setIsMouseOverBar(false)}
          style={{
            position: 'absolute',
            top: 10, // Fixed at top of swimlane
            left: Math.max(50, Math.min(controlBarX, (swimlaneRef.current?.clientWidth || 500) - 100)),
            transform: 'translateX(-50%)',
            display: 'flex',
            justifyContent: 'center',
            gap: '10px',
            padding: '8px 12px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '20px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            transition: 'left 0.1s ease-out', // Changed from top to left for horizontal movement
            border: '1px solid #ddd',
          }}
        >
          {allowedBlockTypes.map((blockType) => {
            // Map from block type display name to kind value
            const blockKindValue = blockType.toLowerCase();
            // Get color for this block kind
            const buttonBorderColor = BLOCK_KIND_BORDERS[blockKindValue] || '#ddd';
            
            return (
              <button 
                key={blockType}
                onClick={() => createBlockInSwimlane(blockKindValue)}
                className="create-block-button"
                style={{ 
                  padding: '5px 10px',
                  background: '#f0f0f0',
                  border: `1px solid ${buttonBorderColor}`,
                  borderRadius: '3px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title={`Create ${blockType}`}
              >
                <span>+</span> {blockType}
              </button>
            );
          })}
        </div>
      )}
      
      <div style={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'row' as const, 
        flexWrap: 'nowrap' as const, 
        overflowX: 'visible' as const, // Changed from 'auto' to 'visible' to allow infinite growth
        overflowY: 'hidden' as const,
        minHeight: '100px',
        minWidth: '800px', // Added minimum width to prevent collapse
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: '3px',
        padding: '5px 5px 5px 0px', // Reduced left padding to minimize gap
        gap: '10px', // Add spacing between blocks
        alignItems: 'flex-start' as const, // Align blocks at the top
        border: 'none',
        transition: 'all 0.2s ease',
      }}>
        {/* Blocks will render here */}
      </div>
      
      {/* Handles for connections */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{
          background: selected ? '#3182ce' : '#555',
          transition: 'background-color 0.2s ease',
        }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{
          background: selected ? '#3182ce' : '#555',
          transition: 'background-color 0.2s ease',
        }}
      />
    </div>
  );
};

export default memo(SwimlaneNode);
