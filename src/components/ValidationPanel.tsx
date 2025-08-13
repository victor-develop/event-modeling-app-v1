import React, { memo, useState, useEffect } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { validateModel, type ValidationMessage, type ModelStatistics, analyzeModelStatistics } from '../utils/modelValidation';

interface ValidationPanelProps {
  nodes: Node[];
  edges: Edge[];
  onNodeSelect?: (nodeId: string) => void;
  onEdgeSelect?: (edgeId: string) => void;
}

const ValidationPanel: React.FC<ValidationPanelProps> = ({
  nodes,
  edges,
  onNodeSelect,
  onEdgeSelect
}) => {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'validation' | 'statistics'>('validation');
  const [validationResults, setValidationResults] = useState<ValidationMessage[]>([]);
  const [statistics, setStatistics] = useState<ModelStatistics | null>(null);
  
  // Run validation when nodes or edges change
  useEffect(() => {
    const results = validateModel(nodes, edges);
    setValidationResults(results.messages);
    
    const stats = analyzeModelStatistics(nodes, edges);
    setStatistics(stats);
  }, [nodes, edges]);

  // Get message icon and color based on type
  const getMessageStyles = (type: ValidationMessage['type']) => {
    switch(type) {
      case 'error':
        return { icon: '❌', color: '#e74c3c', bgColor: '#fadbd8' };
      case 'warning':
        return { icon: '⚠️', color: '#f39c12', bgColor: '#fef5e7' };
      case 'info':
        return { icon: 'ℹ️', color: '#3498db', bgColor: '#ebf5fb' };
      case 'success':
        return { icon: '✅', color: '#2ecc71', bgColor: '#eafaf1' };
      default:
        return { icon: 'ℹ️', color: '#3498db', bgColor: '#ebf5fb' };
    }
  };

  // Handle clicking on affected nodes/edges
  const handleAffectedItemClick = (nodeIds?: string[], edgeIds?: string[]) => {
    // If only one node is affected, select it
    if (nodeIds && nodeIds.length === 1 && onNodeSelect) {
      onNodeSelect(nodeIds[0]);
    }
    
    // If only one edge is affected, select it
    if (edgeIds && edgeIds.length === 1 && onEdgeSelect) {
      onEdgeSelect(edgeIds[0]);
    }
  };

  if (!expanded) {
    return (
      <div 
        style={{ 
          position: 'absolute', 
          bottom: '10px', 
          right: '10px',
          background: '#fff',
          padding: '5px 10px',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          zIndex: 10
        }}
        onClick={() => setExpanded(true)}
      >
        Show Validation
      </div>
    );
  }

  return (
    <div 
      style={{ 
        position: 'absolute', 
        bottom: '10px', 
        right: '10px',
        width: '350px',
        maxHeight: '40vh',
        overflowY: 'auto',
        background: '#fff',
        borderRadius: '4px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        zIndex: 10
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        padding: '8px 10px',
        borderBottom: '1px solid #eee',
        background: '#f8f8f8',
        borderTopLeftRadius: '4px',
        borderTopRightRadius: '4px'
      }}>
        <h3 style={{ margin: 0, fontSize: '14px' }}>Model Validation</h3>
        <div>
          <button 
            style={{ 
              border: 'none', 
              background: 'none', 
              cursor: 'pointer',
              fontSize: '16px',
              padding: '0 5px'
            }}
            onClick={() => setExpanded(false)}
          >
            −
          </button>
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid #eee'
      }}>
        <button 
          style={{ 
            flex: 1, 
            padding: '8px', 
            border: 'none', 
            borderBottom: activeTab === 'validation' ? '2px solid #3498db' : 'none',
            background: activeTab === 'validation' ? '#ebf5fb' : '#fff',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('validation')}
        >
          Validation
        </button>
        <button 
          style={{ 
            flex: 1, 
            padding: '8px', 
            border: 'none', 
            borderBottom: activeTab === 'statistics' ? '2px solid #3498db' : 'none',
            background: activeTab === 'statistics' ? '#ebf5fb' : '#fff',
            cursor: 'pointer'
          }}
          onClick={() => setActiveTab('statistics')}
        >
          Statistics
        </button>
      </div>
      
      <div style={{ padding: '10px' }}>
        {activeTab === 'validation' ? (
          <div>
            {validationResults.length === 0 ? (
              <p style={{ color: '#7f8c8d', textAlign: 'center' }}>No validation issues found</p>
            ) : (
              validationResults.map((message, index) => {
                const styles = getMessageStyles(message.type);
                return (
                  <div 
                    key={index}
                    style={{ 
                      marginBottom: '8px', 
                      padding: '8px 10px',
                      borderRadius: '4px',
                      backgroundColor: styles.bgColor,
                      borderLeft: `4px solid ${styles.color}`,
                      cursor: message.affectedNodeIds?.length ? 'pointer' : 'default'
                    }}
                    onClick={() => handleAffectedItemClick(message.affectedNodeIds, message.affectedEdgeIds)}
                    title={message.affectedNodeIds?.length ? "Click to highlight affected elements" : ""}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: '8px' }}>{styles.icon}</span>
                      <span>{message.message}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div>
            {statistics && (
              <>
                <h4 style={{ fontSize: '14px', marginTop: '0' }}>Model Composition</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td>Total Nodes:</td>
                      <td>{statistics.totalNodes}</td>
                    </tr>
                    <tr>
                      <td>Total Edges:</td>
                      <td>{statistics.totalEdges}</td>
                    </tr>
                    {Object.entries(statistics.nodeCountsByType).map(([type, count]) => (
                      <tr key={type}>
                        <td>{type.charAt(0).toUpperCase() + type.slice(1)}s:</td>
                        <td>{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                <h4 style={{ fontSize: '14px' }}>Pattern Analysis</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td>Command Patterns:</td>
                      <td>{statistics.patternCounts.completeCommandPatterns} / {statistics.patternCounts.commandPatterns}</td>
                    </tr>
                    <tr>
                      <td>View Patterns:</td>
                      <td>{statistics.patternCounts.viewPatterns}</td>
                    </tr>
                    <tr>
                      <td>Automation Patterns:</td>
                      <td>{statistics.patternCounts.completeAutomationPatterns} / {statistics.patternCounts.automationPatterns}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ 
                  marginTop: '10px', 
                  padding: '8px', 
                  backgroundColor: '#f8f9fa', 
                  borderRadius: '4px',
                  fontSize: '12px'
                }}>
                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Pattern Completion Rates:</p>
                  {statistics.patternCounts.commandPatterns > 0 && (
                    <div>
                      Command Patterns: 
                      <div 
                        style={{ 
                          height: '6px', 
                          width: '100%', 
                          backgroundColor: '#eee', 
                          borderRadius: '3px',
                          marginTop: '3px' 
                        }}
                      >
                        <div 
                          style={{ 
                            height: '100%', 
                            width: `${(statistics.patternCounts.completeCommandPatterns / statistics.patternCounts.commandPatterns) * 100}%`,
                            backgroundColor: '#3498db',
                            borderRadius: '3px'
                          }} 
                        />
                      </div>
                    </div>
                  )}
                  
                  {statistics.patternCounts.automationPatterns > 0 && (
                    <div style={{ marginTop: '5px' }}>
                      Automation Patterns: 
                      <div 
                        style={{ 
                          height: '6px', 
                          width: '100%', 
                          backgroundColor: '#eee', 
                          borderRadius: '3px',
                          marginTop: '3px' 
                        }}
                      >
                        <div 
                          style={{ 
                            height: '100%', 
                            width: `${(statistics.patternCounts.completeAutomationPatterns / statistics.patternCounts.automationPatterns) * 100}%`,
                            backgroundColor: '#9b59b6',
                            borderRadius: '3px'
                          }} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(ValidationPanel);
