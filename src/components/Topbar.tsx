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
  onCliCommand?: (rawCommand: string) => { ok: boolean; message?: string; toastType?: string };
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
  const [isCliExpanded, setIsCliExpanded] = useState(false);
  const [cliFeedback, setCliFeedback] = useState<{ message: string; type: string } | null>(null);

  const handleCliSubmit = useCallback(() => {
    if (!onCliCommand) return;
    const result = onCliCommand(cliInput);
    
    setCliFeedback({ 
      message: result.message || (result.ok ? 'Command executed successfully' : 'Command failed'),
      type: result.toastType || (result.ok ? 'success' : 'error')
    });

    if (result.ok) {
      setCliInput('');
    }
  }, [cliInput, onCliCommand]);

  const toggleCli = useCallback(() => {
    setIsCliExpanded(prev => !prev);
    setCliFeedback(null);
  }, []);

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
    <>
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
      <h2 style={{ margin: 0 }}>Event Modeling App</h2>
    </div>
    
    <div style={{
      backgroundColor: '#333',
      borderBottom: '1px solid #444',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      padding: isCliExpanded ? '10px 20px' : '6px 20px',
      animation: isCliExpanded ? 'slideDown 0.2s ease-out' : 'none'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>CLI</span>
          {!isCliExpanded && (
            <span style={{ fontSize: '12px', color: '#888' }}>
              Press to expand command input
            </span>
          )}
        </div>
        <button 
          onClick={toggleCli}
          style={{
            backgroundColor: isCliExpanded ? '#666' : '#444',
            color: 'white',
            border: 'none',
            padding: '5px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          {isCliExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isCliExpanded && (
        <>
          <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
            <span style={{ color: '#aaa', fontFamily: 'monospace', paddingTop: '6px' }}>$</span>
            <input
              type="text"
              value={cliInput}
              placeholder="Type a command (help, add, connect, jsoncmd ...) - Press Enter to run"
              onChange={(e) => setCliInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCliSubmit();
                }
              }}
              style={{
                flexGrow: 1,
                padding: '6px 12px',
                backgroundColor: '#222',
                color: '#0f0',
                border: '1px solid #555',
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontSize: '14px',
                outline: 'none'
              }}
              autoFocus
            />
            <button 
              onClick={handleCliSubmit} 
              disabled={!cliInput.trim()}
              style={{
                padding: '6px 20px',
                backgroundColor: '#444',
                color: 'white',
                border: '1px solid #555',
                borderRadius: '4px',
                cursor: cliInput.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              Run
            </button>
          </div>
          
          {cliFeedback && (
            <div style={{
              position: 'relative',
              padding: '8px 12px',
              backgroundColor: cliFeedback.type === 'error' ? 'rgba(244, 67, 54, 0.1)' : 
                             cliFeedback.type === 'warning' ? 'rgba(255, 152, 0, 0.1)' :
                             cliFeedback.type === 'info' ? 'rgba(33, 150, 243, 0.1)' :
                             'rgba(76, 175, 80, 0.1)',
              color: cliFeedback.type === 'error' ? '#ff8a80' : 
                     cliFeedback.type === 'warning' ? '#ffd180' :
                     cliFeedback.type === 'info' ? '#80d8ff' :
                     '#b9f6ca',
              borderLeft: `3px solid ${
                cliFeedback.type === 'error' ? '#f44336' : 
                cliFeedback.type === 'warning' ? '#ff9800' :
                cliFeedback.type === 'info' ? '#2196f3' :
                '#4caf50'
              }`,
              fontFamily: 'monospace',
              fontSize: '13px',
              whiteSpace: 'pre-wrap',
              maxHeight: '150px',
              overflowY: 'auto'
            }}>
              <button 
                onClick={() => setCliFeedback(null)}
                style={{
                  position: 'absolute',
                  top: '5px',
                  right: '5px',
                  background: 'none',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  opacity: 0.6,
                  fontSize: '10px'
                }}
                title="Clear output"
              >
                ✕ Clear
              </button>
              {cliFeedback.message}
            </div>
          )}
        </>
      )}
    </div>
    <style>{`
      @keyframes slideDown {
        from { transform: translateY(-10px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `}</style>
    </>
  );
};

export default memo(Topbar);
