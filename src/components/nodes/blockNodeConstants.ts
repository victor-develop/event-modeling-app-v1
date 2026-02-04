import type React from 'react';

/**
 * Shared dimensions and style constants for all block-type nodes
 * (Trigger, Command, Event, View, UI, Processor). Keeps layout and
 * text-wrap behavior consistent without duplication.
 */
export const DEFAULT_NODE_WIDTH = 140;
export const DEFAULT_NODE_HEIGHT = 100;

export function getNodeDimensions(width?: number, height?: number) {
  return {
    w: typeof width === 'number' ? width : DEFAULT_NODE_WIDTH,
    h: typeof height === 'number' ? height : DEFAULT_NODE_HEIGHT,
  };
}

/** Base styles for the label row so long text wraps instead of overflowing */
export const labelRowStyles: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '10px',
  paddingBottom: '5px',
  minWidth: 0,
};

export const labelDisplayStyles: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontWeight: 'bold',
  cursor: 'text',
  fontSize: '1em',
  wordWrap: 'break-word',
  overflowWrap: 'break-word',
  whiteSpace: 'normal',
};

export const iconWrapperStyles: React.CSSProperties = {
  marginRight: '10px',
  fontSize: '20px',
  flexShrink: 0,
};

export const inputBaseStyles: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontWeight: 'bold',
  border: 'none',
  fontSize: '1em',
  outline: 'none',
  borderRadius: '3px',
  padding: '2px 5px',
};
