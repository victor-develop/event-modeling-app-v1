import React, { memo, useState, useMemo, useCallback } from 'react';
import type { Node, Edge } from '@xyflow/react';

interface HistoryPanelProps {
  events: any[];
  currentEventIndex: number;
  onTimeTravel: (index: number) => void;
  // Props for snapshot information
  snapshotNodes: any[] | null;
  // Current state for pattern visualization
  nodes?: Node[];
  edges?: Edge[];
  // Current selected element (if any)
  selectedNodeId?: string | null;
  selectedEdgeId?: string | null;
}

// Component to display JSON details with syntax highlighting
const JsonDetails: React.FC<{ data: any }> = ({ data }) => {
  return (
    <pre
      style={{
        backgroundColor: '#f5f5f5',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '11px',
        overflow: 'auto',
        maxHeight: '200px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        border: '1px solid #ddd',
        margin: '5px 0',
      }}
    >
      {JSON.stringify(data, null, 2)}
    </pre>
  );
};

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  events,
  currentEventIndex,
  onTimeTravel,
  snapshotNodes,
  nodes = [], // Current nodes for visualization
  edges = [], // Current edges for visualization
  selectedNodeId = null,
  selectedEdgeId = null,
}) => {
  // State for active tab
  const [activeTab, setActiveTab] = useState<'history' | 'patterns' | 'details'>('history');

  // Panel expand/collapse (default expanded)
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // State to track expanded event details
  const [expandedEventIndex, setExpandedEventIndex] = useState<number | null>(null);
  
  // Toggle expanded state for an event
  const toggleEventDetails = useCallback((index: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the parent onClick (time travel)
    setExpandedEventIndex(prevIndex => prevIndex === index ? null : index);
  }, []);
  const handlePrev = useCallback(() => {
    if (currentEventIndex > -1) { // Allow going back to -1 (snapshot)
      onTimeTravel(currentEventIndex - 1);
    }
  }, [currentEventIndex, onTimeTravel]);

  const handleNext = useCallback(() => {
    if (currentEventIndex < events.length - 1) {
      onTimeTravel(currentEventIndex + 1);
    }
  }, [currentEventIndex, events.length, onTimeTravel]);

  const isSnapshotActive = currentEventIndex === -1 && snapshotNodes !== null;

  // Count patterns in the current model
  const patternCounts = useMemo(() => {
    const counts = {
      command: 0,
      view: 0,
      automation: 0,
      total: edges.length
    };

    edges.forEach(edge => {
      if (edge.data?.patternType === 'command') counts.command++;
      else if (edge.data?.patternType === 'view') counts.view++;
      else if (edge.data?.patternType === 'automation') counts.automation++;
    });
    
    return counts;
  }, [edges]);

  // Detect incomplete patterns
  const incompletePatterns = useMemo(() => {
    // Check for Commands without connected Events
    const commandsWithoutEvents = nodes
      .filter(node => node.type === 'command')
      .filter(command => {
        // Find if this command has any outgoing edge to an event
        return !edges.some(edge => 
          edge.source === command.id && 
          nodes.find(n => n.id === edge.target)?.type === 'event'
        );
      });
    
    // Check for Events without connected Views
    const eventsWithoutViews = nodes
      .filter(node => node.type === 'event')
      .filter(event => {
        // Find if this event has any outgoing edge to a view
        return !edges.some(edge => 
          edge.source === event.id && 
          nodes.find(n => n.id === edge.target)?.type === 'view'
        );
      });
    
    return {
      commandsWithoutEvents: commandsWithoutEvents.length,
      eventsWithoutViews: eventsWithoutViews.length,
    };
  }, [nodes, edges]);

  // Determine selected element based on props passed from App.tsx
  const selectedElement = useMemo(() => {
    if (selectedNodeId) {
      return { id: selectedNodeId, type: 'node' as const };
    } else if (selectedEdgeId) {
      return { id: selectedEdgeId, type: 'edge' as const };
    }
    return null;
  }, [selectedNodeId, selectedEdgeId]);

  // Get details of selected element
  const selectedDetails = useMemo(() => {
    if (!selectedElement) return null;
    
    if (selectedElement.type === 'node') {
      const node = nodes.find(n => n.id === selectedElement.id);
      return node ? {
        id: node.id,
        type: node.type,
        data: node.data,
      } : null;
    } else {
      const edge = edges.find(e => e.id === selectedElement.id);
      if (!edge) return null;
      
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      
      return {
        id: edge.id,
        pattern: edge.data?.patternType || 'unknown',
        source: source?.data?.label || edge.source,
        sourceType: source?.type,
        target: target?.data?.label || edge.target,
        targetType: target?.type,
        data: edge.data,
      };
    }
  }, [selectedElement, nodes, edges]);

  return (
    <div
      style={{
        width: isCollapsed ? '40px' : '300px',
        minWidth: isCollapsed ? '40px' : undefined,
        height: '100%',
        backgroundColor: '#f8f8f8',
        borderLeft: '1px solid #eee',
        padding: isCollapsed ? '10px 6px' : '10px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width 0.2s ease, min-width 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isCollapsed ? 0 : '10px' }}>
        {isCollapsed ? (
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            title="Expand panel"
            style={{
              writingMode: 'vertical-rl',
              textOrientation: 'mixed',
              transform: 'rotate(180deg)',
              width: '100%',
              padding: '8px 0',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#555',
            }}
          >
            History
          </button>
        ) : (
          <>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Event Modeling</h3>
            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              title="Collapse panel"
              aria-label="Collapse panel"
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '4px',
                fontSize: '16px',
                lineHeight: 1,
                color: '#666',
              }}
            >
              ◀
            </button>
          </>
        )}
      </div>
      
      {/* Tab navigation - hide when collapsed */}
      {!isCollapsed && (
      <div style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: '10px' }}>
        <div 
          onClick={() => setActiveTab('history')} 
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            borderBottom: activeTab === 'history' ? '2px solid #0066cc' : 'none',
            fontWeight: activeTab === 'history' ? 'bold' : 'normal'
          }}
        >
          History
        </div>
        <div 
          onClick={() => setActiveTab('patterns')} 
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            borderBottom: activeTab === 'patterns' ? '2px solid #0066cc' : 'none',
            fontWeight: activeTab === 'patterns' ? 'bold' : 'normal'
          }}
        >
          Patterns
        </div>
        <div 
          onClick={() => setActiveTab('details')} 
          style={{
            padding: '8px 12px',
            cursor: 'pointer',
            borderBottom: activeTab === 'details' ? '2px solid #0066cc' : 'none',
            fontWeight: activeTab === 'details' ? 'bold' : 'normal'
          }}
        >
          Details
        </div>
      </div>
      )}

      {/* History tab content - hide when collapsed */}
      {!isCollapsed && activeTab === 'history' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <button onClick={handlePrev} disabled={currentEventIndex <= -1}>
              Previous
            </button>
            <button onClick={handleNext} disabled={currentEventIndex >= events.length - 1}>
              Next
            </button>
          </div>
          <div style={{ flexGrow: 1, overflowY: 'auto' }}>
            {snapshotNodes && (
              <div
                style={{
                  padding: '5px',
                  backgroundColor: isSnapshotActive ? '#e0e0e0' : 'transparent',
                  cursor: 'pointer',
                  marginBottom: '5px',
                  borderRadius: '3px',
                  fontWeight: 'bold',
                  color: '#555',
                }}
                onClick={() => onTimeTravel(-1)}
              >
                Starting Point (Snapshot)
              </div>
            )}
            {events.map((event, index) => {
              // Enhanced event display with pattern detection
              let eventColor = '#f0f0f0';
              let eventIcon = '📄';
              
              // Color-code based on event type
              if (event.type.includes('ADD_TRIGGER')) {
                eventIcon = '🔔';
                eventColor = '#fff8e1';
              } else if (event.type.includes('ADD_COMMAND')) {
                eventIcon = '⚡';
                eventColor = '#e3f2fd';
              } else if (event.type.includes('ADD_EVENT')) {
                eventIcon = '📦';
                eventColor = '#e8f5e9';
              } else if (event.type.includes('ADD_VIEW')) {
                eventIcon = '👁️';
                eventColor = '#f3e5f5';
              } else if (event.type.includes('NEW_CONNECTION')) {
                eventIcon = '🔗';
                eventColor = '#ede7f6';
              }
              
              return (
                <div
                  key={index}
                  style={{
                    padding: '8px',
                    backgroundColor: index === currentEventIndex ? '#e0e0e0' : eventColor,
                    cursor: 'pointer',
                    marginBottom: '5px',
                    borderRadius: '3px',
                    borderLeft: index === currentEventIndex ? '3px solid #0066cc' : 'none',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-line',
                    overflowWrap: 'break-word',
                  }}
                  onClick={() => onTimeTravel(index)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: '5px' }}>{eventIcon}</span>
                      <strong>{event.type.replace(/.*\./, '')}</strong>
                    </div>
                    <button
                      onClick={(e) => toggleEventDetails(index, e)}
                      style={{
                        background: 'none',
                        border: '1px solid #ddd',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '0px 6px',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: '#f0f0f0',
                      }}
                      title={expandedEventIndex === index ? 'Hide details' : 'Show details'}
                    >
                      {expandedEventIndex === index ? '−' : '+'}
                    </button>
                  </div>
                  {event.payload && event.payload.id && <div style={{ fontSize: '12px', color: '#666' }}>ID: {event.payload.id}</div>}
                  {event.payload && event.payload.label && <div style={{ fontSize: '13px' }}>{event.payload.label}</div>}
                  {event.type.includes('NEW_CONNECTION') && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      {event.payload.source} → {event.payload.target}
                    </div>
                  )}
                  
                  {/* Expandable JSON details */}
                  {expandedEventIndex === index && event.payload && (
                    <JsonDetails data={event.payload} />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Patterns tab content - hide when collapsed */}
      {!isCollapsed && activeTab === 'patterns' && (
        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ marginTop: 0 }}>Pattern Summary</h4>
            <div style={{ marginBottom: '5px' }}>
              <span style={{ fontWeight: 'bold', color: '#0066cc' }}>Command Pattern:</span> {patternCounts.command}
            </div>
            <div style={{ marginBottom: '5px' }}>
              <span style={{ fontWeight: 'bold', color: '#4caf50' }}>View Pattern:</span> {patternCounts.view}
            </div>
            <div style={{ marginBottom: '5px' }}>
              <span style={{ fontWeight: 'bold', color: '#9c27b0' }}>Automation Pattern:</span> {patternCounts.automation}
            </div>
            <div style={{ marginBottom: '5px', fontWeight: 'bold' }}>
              Total Connections: {patternCounts.total}
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ marginTop: 0 }}>Node Distribution</h4>
            <div style={{ marginBottom: '5px' }}>
              <span style={{ fontWeight: 'bold', color: '#ff9800' }}>Triggers:</span> {nodes.filter(n => n.type === 'trigger').length}
            </div>
            <div style={{ marginBottom: '5px' }}>
              <span style={{ fontWeight: 'bold', color: '#2196f3' }}>Commands:</span> {nodes.filter(n => n.type === 'command').length}
            </div>
            <div style={{ marginBottom: '5px' }}>
              <span style={{ fontWeight: 'bold', color: '#4caf50' }}>Events:</span> {nodes.filter(n => n.type === 'event').length}
            </div>
            <div style={{ marginBottom: '5px' }}>
              <span style={{ fontWeight: 'bold', color: '#9c27b0' }}>Views:</span> {nodes.filter(n => n.type === 'view').length}
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ marginTop: 0, color: incompletePatterns.commandsWithoutEvents || incompletePatterns.eventsWithoutViews ? '#f44336' : '#000' }}>
              {incompletePatterns.commandsWithoutEvents || incompletePatterns.eventsWithoutViews ? '⚠️ Pattern Issues' : '✅ Pattern Completeness'}
            </h4>
            {incompletePatterns.commandsWithoutEvents > 0 && (
              <div style={{ marginBottom: '5px', color: '#f44336' }}>
                {incompletePatterns.commandsWithoutEvents} Command{incompletePatterns.commandsWithoutEvents > 1 ? 's' : ''} without Events
              </div>
            )}
            {incompletePatterns.eventsWithoutViews > 0 && (
              <div style={{ marginBottom: '5px', color: '#f44336' }}>
                {incompletePatterns.eventsWithoutViews} Event{incompletePatterns.eventsWithoutViews > 1 ? 's' : ''} without Views
              </div>
            )}
            {!incompletePatterns.commandsWithoutEvents && !incompletePatterns.eventsWithoutViews && (
              <div style={{ color: '#4caf50' }}>
                All patterns are complete!
              </div>
            )}
          </div>

          <div>
            <h4 style={{ marginTop: 0 }}>Select an element on the canvas to view details</h4>
          </div>
        </div>
      )}

      {/* Details tab content - hide when collapsed */}
      {!isCollapsed && activeTab === 'details' && (
        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
          {!selectedElement ? (
            <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
              Select a node or edge on the canvas to view details
            </div>
          ) : (
            <div>
              <h4>{selectedElement.type === 'node' ? 'Node Details' : 'Edge Details'}</h4>
              {selectedDetails && (
                <div>
                  {selectedElement.type === 'node' ? (
                    // Node details
                    <>
                      <div style={{ marginBottom: '5px' }}>
                        <strong>Type:</strong> {selectedDetails.type}
                      </div>
                      <div style={{ marginBottom: '5px' }}>
                        <strong>Label:</strong> {selectedDetails.data && 'label' in selectedDetails.data ? String(selectedDetails.data.label) : ''}
                      </div>
                      {selectedDetails.type === 'trigger' && (
                        <>
                          <div style={{ marginBottom: '5px' }}>
                            <strong>Trigger Type:</strong> {selectedDetails.data && 'triggerType' in selectedDetails.data ? String(selectedDetails.data.triggerType) : 'Not specified'}
                          </div>
                          <div style={{ marginBottom: '5px' }}>
                            <strong>Input Type:</strong> {selectedDetails.data && 'inputType' in selectedDetails.data ? String(selectedDetails.data.inputType) : 'Not specified'}
                          </div>
                        </>
                      )}
                      {selectedDetails.type === 'command' && (
                        <>
                          <div style={{ marginBottom: '5px' }}>
                            <strong>Parameters:</strong>
                          </div>
                          <div style={{ marginBottom: '10px', paddingLeft: '10px' }}>
                            {selectedDetails.data && typeof selectedDetails.data.parameters === 'object' && selectedDetails.data.parameters !== null && 
                             Object.keys(selectedDetails.data.parameters).length > 0 ? (
                              Object.entries(selectedDetails.data.parameters as Record<string, unknown>).map(([key, value]) => (
                                <div key={key}>{key}: {String(value)}</div>
                              ))
                            ) : (
                              <div style={{ fontStyle: 'italic', color: '#666' }}>No parameters</div>
                            )}
                          </div>
                          <div style={{ marginBottom: '5px' }}>
                            <strong>Preconditions:</strong>
                          </div>
                          <div style={{ marginBottom: '10px', paddingLeft: '10px' }}>
                            {selectedDetails.data && Array.isArray(selectedDetails.data.preconditions) && 
                             selectedDetails.data.preconditions.length > 0 ? (
                              selectedDetails.data.preconditions.map((cond: string, i: number) => (
                                <div key={i}>{cond}</div>
                              ))
                            ) : (
                              <div style={{ fontStyle: 'italic', color: '#666' }}>No preconditions</div>
                            )}
                          </div>
                        </>
                      )}
                      {selectedDetails.type === 'event' && (
                        <>
                          <div style={{ marginBottom: '5px' }}>
                            <strong>Payload:</strong>
                          </div>
                          <div style={{ marginBottom: '10px', paddingLeft: '10px' }}>
                            {selectedDetails.data && typeof selectedDetails.data.payload === 'object' && selectedDetails.data.payload !== null && 
                             Object.keys(selectedDetails.data.payload).length > 0 ? (
                              Object.entries(selectedDetails.data.payload as Record<string, unknown>).map(([key, value]) => (
                                <div key={key}>{key}: {String(value)}</div>
                              ))
                            ) : (
                              <div style={{ fontStyle: 'italic', color: '#666' }}>Empty payload</div>
                            )}
                          </div>
                          <div style={{ marginBottom: '5px' }}>
                            <strong>Version:</strong> {selectedDetails.data && selectedDetails.data.version ? String(selectedDetails.data.version) : '1.0'}
                          </div>
                        </>
                      )}
                      {selectedDetails.type === 'view' && (
                        <>
                          <div style={{ marginBottom: '5px' }}>
                            <strong>View Type:</strong> {selectedDetails.data && selectedDetails.data.viewType ? String(selectedDetails.data.viewType) : 'Not specified'}
                          </div>
                          <div style={{ marginBottom: '5px' }}>
                            <strong>Refresh Pattern:</strong> {selectedDetails.data && selectedDetails.data.refreshPattern ? String(selectedDetails.data.refreshPattern) : 'Not specified'}
                          </div>
                          <div style={{ marginBottom: '5px' }}>
                            <strong>Source Events:</strong>
                          </div>
                          <div style={{ marginBottom: '10px', paddingLeft: '10px' }}>
                            {selectedDetails.data && Array.isArray(selectedDetails.data.sourceEvents) && 
                             selectedDetails.data.sourceEvents.length > 0 ? (
                              selectedDetails.data.sourceEvents.map((eventId: string, i: number) => {
                                const eventNode = nodes.find(n => n.id === eventId);
                                return <div key={i}>{eventNode && eventNode.data && 'label' in eventNode.data ? String(eventNode.data.label) : eventId}</div>;
                              })
                            ) : (
                              <div style={{ fontStyle: 'italic', color: '#666' }}>No source events</div>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    // Edge details
                    <>
                      <div style={{ marginBottom: '5px' }}>
                        <strong>Pattern:</strong> {selectedDetails.pattern === 'command' ? 'Command Pattern' : 
                                                 selectedDetails.pattern === 'view' ? 'View Pattern' : 
                                                 selectedDetails.pattern === 'automation' ? 'Automation Pattern' : 'Unknown'}
                      </div>
                      <div style={{ marginBottom: '5px' }}>
                        <strong>Source:</strong> {String(selectedDetails.source)} ({String(selectedDetails.sourceType)})
                      </div>
                      <div style={{ marginBottom: '5px' }}>
                        <strong>Target:</strong> {String(selectedDetails.target)} ({String(selectedDetails.targetType)})
                      </div>
                      {selectedDetails.data && typeof selectedDetails.data === 'object' && 'condition' in selectedDetails.data && selectedDetails.data.condition && (
                        <div style={{ marginBottom: '5px' }}>
                          <strong>Condition:</strong> {String(selectedDetails.data.condition)}
                        </div>
                      )}
                      {selectedDetails.data && typeof selectedDetails.data === 'object' && 'notes' in selectedDetails.data && selectedDetails.data.notes && (
                        <div style={{ marginBottom: '5px' }}>
                          <strong>Notes:</strong> {String(selectedDetails.data.notes)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Export to allow usage in App.tsx
export default memo(HistoryPanel);
