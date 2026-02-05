import React, { memo } from 'react';

const GITHUB_REPO_URL = 'https://github.com/victor-develop/event-modeling-app-v1';

interface TopbarProps {
  onAddSwimlane: (kind: string) => void;
  onAddTrigger: () => void;
  onAddCommand: () => void;
  onAddEvent: () => void;
  onAddView: () => void;
  onAddUI?: () => void;
  onAddProcessor?: () => void;
  onExportEvents: () => void;
  onImportEvents: () => void;
  onCompressSnapshot: () => void;
  onImportModelState?: () => void; // Optional new prop for direct model state import
  selectedSwimlaneId: string | null;
  nodes: any[]; // Using any[] for simplicity, could be more specific with Node type
}

const Topbar: React.FC<TopbarProps> = ({ 
  onAddSwimlane, 
  onAddTrigger,
  onAddCommand,
  onAddEvent,
  onAddView,
  onAddUI,
  onAddProcessor,
  onExportEvents, 
  onImportEvents, 
  onCompressSnapshot,
  onImportModelState,
  selectedSwimlaneId,
  nodes
}) => {
  // Handle add swimlane button clicks for different types
  const handleAddEventSwimlane = () => {
    onAddSwimlane('event');
  };
  
  const handleAddCommandViewSwimlane = () => {
    onAddSwimlane('command_view');
  };
  
  const handleAddTriggerSwimlane = () => {
    onAddSwimlane('trigger');
  };
  return (
    <div
      style={{
        padding: '10px',
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
      }}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Layout</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <button 
              onClick={handleAddTriggerSwimlane} 
              style={{ marginRight: '5px', backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '3px' }}
            >
              Trigger Lane
            </button>
            <button 
              onClick={handleAddCommandViewSwimlane} 
              style={{ marginRight: '5px', backgroundColor: '#3498db', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '3px' }}
            >
              Command & View Lane
            </button>
            <button 
              onClick={handleAddEventSwimlane} 
              style={{ marginRight: '5px', backgroundColor: '#f1c40f', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '3px' }}
            >
              Event Lane
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Building Blocks</span>
          {/* Show all building blocks if no swimlane is selected */}
          {!selectedSwimlaneId && (
            <>
              <button onClick={onAddTrigger} style={{ marginRight: '5px', backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '3px' }}>
                Trigger
              </button>
              <button onClick={onAddCommand} style={{ marginRight: '5px', backgroundColor: '#3498db', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '3px' }}>
                Command
              </button>
              <button onClick={onAddEvent} style={{ marginRight: '5px', backgroundColor: '#f1c40f', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '3px' }}>
                Event
              </button>
              <button onClick={onAddView} style={{ marginRight: '5px', backgroundColor: '#95a5a6', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '3px' }}>
                View
              </button>
              {onAddUI && (
                <button onClick={onAddUI} style={{ marginRight: '5px', backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '3px' }}>
                  UI
                </button>
              )}
              {onAddProcessor && (
                <button onClick={onAddProcessor} style={{ backgroundColor: '#9b59b6', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '3px' }}>
                  Processor
                </button>
              )}
            </>
          )}
          
          {/* Show context-aware building blocks based on selected swimlane type */}
          {selectedSwimlaneId && (() => {
            const selectedSwimlane = nodes.find(node => node.id === selectedSwimlaneId);
            if (!selectedSwimlane || !selectedSwimlane.data) return null;
            
            const swimlaneKind = selectedSwimlane.data.kind;
            
            switch(swimlaneKind) {
              case 'event':
                return (
                  <>
                    <button onClick={onAddEvent} style={{ marginRight: '5px', backgroundColor: '#f1c40f', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '3px' }}>
                      Event
                    </button>
                  </>
                );
              case 'command_view':
                return (
                  <>
                    <button onClick={onAddCommand} style={{ marginRight: '5px', backgroundColor: '#3498db', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '3px' }}>
                      Command
                    </button>
                    <button onClick={onAddView} style={{ marginRight: '5px', backgroundColor: '#95a5a6', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '3px' }}>
                      View
                    </button>
                  </>
                );
              case 'trigger':
                return (
                  <>
                    <button onClick={onAddTrigger} style={{ marginRight: '5px', backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '3px' }}>
                      Trigger
                    </button>
                    {onAddUI && (
                      <button onClick={onAddUI} style={{ marginRight: '5px', backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '3px' }}>
                        UI
                      </button>
                    )}
                    {onAddProcessor && (
                      <button onClick={onAddProcessor} style={{ backgroundColor: '#9b59b6', color: 'white', border: 'none', padding: '3px 8px', borderRadius: '3px' }}>
                        Processor
                      </button>
                    )}
                  </>
                );
              default:
                return null;
            }
          })()}
        
        </div>

        <div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>Model Tools</span>
          <button onClick={onExportEvents} style={{ marginRight: '5px' }}>
            Export Model
          </button>
          <button onClick={onImportEvents} style={{ marginRight: '5px' }}>
            Import Model
          </button>
          <button onClick={onCompressSnapshot} style={{ marginRight: '5px' }}>
            Compress Snapshot
          </button>
          {onImportModelState && (
            <button onClick={onImportModelState} title="For advanced use cases">
              Import JSON State
            </button>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h2 style={{ margin: 0 }}>Event Modeling App</h2>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on GitHub"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 6,
            color: '#333',
            transition: 'color 0.2s, background-color 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.color = '#000';
            e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.color = '#333';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
        </a>
      </div>
    </div>
  );
};

export default memo(Topbar);
