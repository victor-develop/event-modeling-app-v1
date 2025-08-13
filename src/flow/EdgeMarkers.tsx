import React from 'react';

/**
 * Component that renders SVG marker definitions for React Flow edges
 * This must be included within the ReactFlow component for markers to work
 */
export const EdgeMarkers: React.FC = () => {
  return (
    <svg style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0 }}>
      <defs>
        <marker
          id="arrowclosed"
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
        </marker>
      </defs>
    </svg>
  );
};
