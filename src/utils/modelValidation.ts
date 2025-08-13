import type { Node, Edge } from '@xyflow/react';
import { ConnectionPattern, getConnectionPatternType } from './patternValidation';

// Types for validation results
export interface ValidationResult {
  valid: boolean;
  messages: ValidationMessage[];
}

export interface ValidationMessage {
  type: 'error' | 'warning' | 'info' | 'success';
  message: string;
  affectedNodeIds?: string[];
  affectedEdgeIds?: string[];
}

export interface ModelStatistics {
  totalNodes: number;
  totalEdges: number;
  nodeCountsByType: Record<string, number>;
  patternCounts: {
    commandPatterns: number;
    completeCommandPatterns: number; // Trigger -> Command -> Event chains
    viewPatterns: number;
    automationPatterns: number;
    completeAutomationPatterns: number; // Event -> Command -> Event chains
  };
}

/**
 * Validates a complete model for correctness, identifying incomplete patterns
 * and potential issues
 */
export function validateModel(nodes: Node[], edges: Edge[]): ValidationResult {
  const messages: ValidationMessage[] = [];
  const statistics = analyzeModelStatistics(nodes, edges);

  // Check for empty model
  if (nodes.length === 0) {
    messages.push({
      type: 'info',
      message: 'The model is empty. Start by adding Triggers, Commands, Events, or Views.'
    });
    return { valid: false, messages };
  }

  // Check for nodes without connections
  const disconnectedNodes = findDisconnectedNodes(nodes, edges);
  if (disconnectedNodes.length > 0) {
    messages.push({
      type: 'warning',
      message: `Found ${disconnectedNodes.length} disconnected nodes that are not part of any pattern.`,
      affectedNodeIds: disconnectedNodes.map(node => node.id)
    });
  }

  // Check for incomplete command patterns
  const incompleteCommandPatterns = findIncompleteCommandPatterns(nodes, edges);
  if (incompleteCommandPatterns.length > 0) {
    messages.push({
      type: 'warning',
      message: `Found ${incompleteCommandPatterns.length} incomplete command patterns. Complete pattern is: Trigger -> Command -> Event.`,
      affectedNodeIds: incompleteCommandPatterns.flatMap(p => [p.nodeId, p.relatedNodeId ? p.relatedNodeId : null]).filter(Boolean) as string[]
    });
  }

  // Check for Events without Views
  const eventsWithoutViews = findEventsWithoutViews(nodes, edges);
  if (eventsWithoutViews.length > 0) {
    messages.push({
      type: 'info',
      message: `Found ${eventsWithoutViews.length} events without associated views. Consider adding views to visualize these events.`,
      affectedNodeIds: eventsWithoutViews.map(node => node.id)
    });
  }

  // Check for incomplete automation patterns
  const incompleteAutomationPatterns = findIncompleteAutomationPatterns(nodes, edges);
  if (incompleteAutomationPatterns.length > 0) {
    messages.push({
      type: 'warning',
      message: `Found ${incompleteAutomationPatterns.length} incomplete automation patterns. Complete pattern is: Event -> Command -> Event.`,
      affectedNodeIds: incompleteAutomationPatterns.flatMap(p => [p.nodeId, p.relatedNodeId ? p.relatedNodeId : null]).filter(Boolean) as string[]
    });
  }

  // Add positive feedback if patterns are well formed
  if (statistics.patternCounts.completeCommandPatterns > 0) {
    messages.push({
      type: 'success',
      message: `Found ${statistics.patternCounts.completeCommandPatterns} complete command patterns (Trigger -> Command -> Event).`
    });
  }

  if (statistics.patternCounts.viewPatterns > 0) {
    messages.push({
      type: 'success',
      message: `Found ${statistics.patternCounts.viewPatterns} view patterns (Event -> View).`
    });
  }

  if (statistics.patternCounts.completeAutomationPatterns > 0) {
    messages.push({
      type: 'success',
      message: `Found ${statistics.patternCounts.completeAutomationPatterns} complete automation patterns (Event -> Command -> Event).`
    });
  }

  return {
    valid: messages.filter(m => m.type === 'error').length === 0,
    messages
  };
}

/**
 * Analyzes model statistics to provide insights about the model structure
 */
export function analyzeModelStatistics(nodes: Node[], edges: Edge[]): ModelStatistics {
  // Count nodes by type
  const nodeCountsByType = nodes.reduce((acc, node) => {
    const type = node.type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Count different pattern types
  const commandPatterns = countPatternEdges(edges, nodes, ConnectionPattern.COMMAND_PATTERN);
  const viewPatterns = countPatternEdges(edges, nodes, ConnectionPattern.VIEW_PATTERN);
  const automationPatterns = countPatternEdges(edges, nodes, ConnectionPattern.AUTOMATION_PATTERN);

  // Count complete command patterns (Trigger -> Command -> Event chains)
  const completeCommandPatterns = countCompleteCommandPatterns(nodes, edges);
  
  // Count complete automation patterns (Event -> Command -> Event chains)
  const completeAutomationPatterns = countCompleteAutomationPatterns(nodes, edges);

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    nodeCountsByType,
    patternCounts: {
      commandPatterns,
      completeCommandPatterns,
      viewPatterns,
      automationPatterns,
      completeAutomationPatterns
    }
  };
}

/**
 * Finds nodes that are not connected to any other node
 */
function findDisconnectedNodes(nodes: Node[], edges: Edge[]): Node[] {
  const connectedNodeIds = new Set<string>();
  
  edges.forEach(edge => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });
  
  return nodes.filter(node => 
    // Only consider trigger, command, event, and view nodes
    ['trigger', 'command', 'event', 'view'].includes(node.type || '') && 
    !connectedNodeIds.has(node.id)
  );
}

/**
 * Finds nodes that are part of an incomplete command pattern
 * (trigger without command, command without event, etc.)
 */
function findIncompleteCommandPatterns(nodes: Node[], edges: Edge[]): Array<{nodeId: string, relatedNodeId?: string, issue: string}> {
  const issues: Array<{nodeId: string, relatedNodeId?: string, issue: string}> = [];
  
  // Find triggers without commands
  const triggersWithCommands = new Set<string>();
  
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode?.type === 'trigger' && targetNode?.type === 'command') {
      triggersWithCommands.add(sourceNode.id);
    }
  });
  
  // Check all triggers to find those without commands
  nodes.filter(n => n.type === 'trigger').forEach(triggerNode => {
    if (!triggersWithCommands.has(triggerNode.id)) {
      issues.push({
        nodeId: triggerNode.id,
        issue: 'Trigger without Command'
      });
    }
  });
  
  // Find commands without events
  const commandsWithEvents = new Set<string>();
  
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode?.type === 'command' && targetNode?.type === 'event') {
      commandsWithEvents.add(sourceNode.id);
    }
  });
  
  // Check all commands to find those without events
  nodes.filter(n => n.type === 'command').forEach(commandNode => {
    if (!commandsWithEvents.has(commandNode.id)) {
      // Find any trigger connected to this command
      const relatedTrigger = edges.find(edge => 
        edge.target === commandNode.id && 
        nodes.find(n => n.id === edge.source)?.type === 'trigger'
      );
      
      issues.push({
        nodeId: commandNode.id,
        relatedNodeId: relatedTrigger ? relatedTrigger.source : undefined,
        issue: 'Command without Event'
      });
    }
  });
  
  return issues;
}

/**
 * Finds events that don't have any associated view
 */
function findEventsWithoutViews(nodes: Node[], edges: Edge[]): Node[] {
  const eventsWithViews = new Set<string>();
  
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode?.type === 'event' && targetNode?.type === 'view') {
      eventsWithViews.add(sourceNode.id);
    }
  });
  
  return nodes.filter(n => 
    n.type === 'event' && !eventsWithViews.has(n.id)
  );
}

/**
 * Finds nodes that are part of an incomplete automation pattern
 * (event triggering command but command not producing event)
 */
function findIncompleteAutomationPatterns(nodes: Node[], edges: Edge[]): Array<{nodeId: string, relatedNodeId?: string, issue: string}> {
  const issues: Array<{nodeId: string, relatedNodeId?: string, issue: string}> = [];
  
  // Find events that trigger commands
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode?.type === 'event' && targetNode?.type === 'command') {
      // Check if this command produces an event
      const commandProducesEvent = edges.some(e => 
        e.source === targetNode.id && 
        nodes.find(n => n.id === e.target)?.type === 'event'
      );
      
      if (!commandProducesEvent) {
        issues.push({
          nodeId: targetNode.id,
          relatedNodeId: sourceNode.id,
          issue: 'Command in automation pattern without resulting Event'
        });
      }
    }
  });
  
  return issues;
}

/**
 * Count edges of a specific pattern type
 */
function countPatternEdges(edges: Edge[], nodes: Node[], patternType: ConnectionPattern): number {
  return edges.filter(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    return getConnectionPatternType(sourceNode || null, targetNode || null) === patternType;
  }).length;
}

/**
 * Count complete command patterns (Trigger -> Command -> Event chains)
 */
function countCompleteCommandPatterns(nodes: Node[], edges: Edge[]): number {
  // Find all command nodes
  const commandNodes = nodes.filter(n => n.type === 'command');
  
  // Count how many have both incoming trigger and outgoing event
  return commandNodes.filter(commandNode => {
    const hasTrigger = edges.some(edge => 
      edge.target === commandNode.id &&
      nodes.find(n => n.id === edge.source)?.type === 'trigger'
    );
    
    const producesEvent = edges.some(edge =>
      edge.source === commandNode.id &&
      nodes.find(n => n.id === edge.target)?.type === 'event'
    );
    
    return hasTrigger && producesEvent;
  }).length;
}

/**
 * Count complete automation patterns (Event -> Command -> Event chains)
 */
function countCompleteAutomationPatterns(nodes: Node[], edges: Edge[]): number {
  let count = 0;
  
  // Find all commands that are triggered by events
  edges.forEach(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (sourceNode?.type === 'event' && targetNode?.type === 'command') {
      // Check if this command produces an event
      const commandProducesEvent = edges.some(e => 
        e.source === targetNode.id && 
        nodes.find(n => n.id === e.target)?.type === 'event'
      );
      
      if (commandProducesEvent) {
        count++;
      }
    }
  });
  
  return count;
}
