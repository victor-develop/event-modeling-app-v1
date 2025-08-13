import { useState, useRef, useEffect, useCallback } from 'react';

interface UseNodeLabelEditProps {
  id: string;
  initialLabel: string;
  onLabelChange: (nodeId: string, label: string) => void;
  nodeType: string; // For logging purposes
}

interface UseNodeLabelEditResult {
  label: string;
  isEditing: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleLabelChange: (evt: React.ChangeEvent<HTMLInputElement>) => void;
  handleDoubleClick: () => void;
  handleBlur: () => void;
  handleKeyDown: (evt: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * Custom hook for node label editing functionality
 * Provides consistent label editing behavior across all node types
 */
export const useNodeLabelEdit = ({
  id,
  initialLabel,
  onLabelChange,
  nodeType
}: UseNodeLabelEditProps): UseNodeLabelEditResult => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(initialLabel);
  const inputRef = useRef<HTMLInputElement>(null);

  // Only update local label state when initialLabel changes from outside
  // This prevents overriding our local edits when we're updating the label
  useEffect(() => {
    console.log(`${nodeType} useEffect initialLabel changed`, { initialLabel, currentLabel: label });
    setLabel(initialLabel);
  }, [initialLabel, nodeType]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    }
  }, [isEditing]);

  // Handle input change
  const handleLabelChange = useCallback((evt: React.ChangeEvent<HTMLInputElement>) => {
    console.log(`${nodeType} handleLabelChange BEFORE`, { id, currentLabel: label, newValue: evt.target.value });
    setLabel(evt.target.value);
    console.log(`${nodeType} handleLabelChange AFTER`, { id, updatedLabel: evt.target.value });
  }, [id, label, nodeType]);

  // Handle double click to start editing
  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
  }, []);

  // Handle blur to save changes
  const handleBlur = useCallback(() => {
    console.log(`${nodeType} handleBlur BEFORE`, { id, label, initialLabel, isEditing });
    setIsEditing(false);
    // Always update the label when editing is complete
    console.log(`${nodeType} calling onLabelChange on blur`, { id, label });
    onLabelChange(id, label);
    console.log(`${nodeType} handleBlur AFTER`, { id, label, initialLabel });
  }, [id, label, initialLabel, onLabelChange, isEditing, nodeType]);

  // Handle Enter key to save changes
  const handleKeyDown = useCallback((evt: React.KeyboardEvent<HTMLInputElement>) => {
    if (evt.key === 'Enter') {
      console.log(`${nodeType} handleKeyDown Enter BEFORE`, { id, label, initialLabel, isEditing });
      setIsEditing(false);
      // Always update the label when pressing Enter
      console.log(`${nodeType} calling onLabelChange on Enter`, { id, label });
      onLabelChange(id, label);
      console.log(`${nodeType} handleKeyDown Enter AFTER`, { id, label, initialLabel });
    }
  }, [id, label, initialLabel, onLabelChange, isEditing, nodeType]);

  return {
    label,
    isEditing,
    inputRef,
    handleLabelChange,
    handleDoubleClick,
    handleBlur,
    handleKeyDown
  };
};
