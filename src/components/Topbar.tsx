import React, { memo, useCallback, useState } from 'react';

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
  onCliCommand?: (rawCommand: string) => { ok: boolean };
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
  onCliCommand,
  selectedSwimlaneId,
  nodes
}) => {
  const [cliInput, setCliInput] = useState('');

  const handleCliSubmit = useCallback(() => {
    if (!onCliCommand) return;
    const result = onCliCommand(cliInput);
    if (result.ok) {
      setCliInput('');
    }
  }, [cliInput, onCliCommand]);

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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Command</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              value={cliInput}
              placeholder="Type a command (help, add, connect, jsoncmd ...)"
              onChange={(e) => setCliInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCliSubmit();
                }
              }}
              style={{
                padding: '4px 8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                minWidth: '280px'
              }}
            />
            <button onClick={handleCliSubmit} disabled={!cliInput.trim()}>
              Run
            </button>
          </div>
        </div>
        <h2 style={{ margin: 0 }}>Event Modeling App</h2>
      </div>
    </div>
  );
};

export default memo(Topbar);
