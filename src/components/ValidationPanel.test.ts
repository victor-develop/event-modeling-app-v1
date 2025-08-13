import { describe, it, expect } from 'vitest';
import { validateModel, analyzeModelStatistics } from '../utils/modelValidation';
import type { Node, Edge } from '@xyflow/react';

// Mock nodes and edges for testing
const mockNodes: Node[] = [
  { id: 'trigger1', type: 'trigger', position: { x: 100, y: 100 }, data: {} },
  { id: 'command1', type: 'command', position: { x: 200, y: 100 }, data: {} },
  { id: 'event1', type: 'event', position: { x: 300, y: 100 }, data: {} },
  { id: 'view1', type: 'view', position: { x: 400, y: 100 }, data: {} },
  { id: 'event2', type: 'event', position: { x: 500, y: 200 }, data: {} }, // Disconnected event
];

// Mock complete command pattern
const mockCommandPatternEdges: Edge[] = [
  { id: 'e1', source: 'trigger1', target: 'command1', type: 'command-pattern', data: { pattern: 'command-pattern' } },
  { id: 'e2', source: 'command1', target: 'event1', type: 'command-pattern', data: { pattern: 'command-pattern' } },
  { id: 'e3', source: 'event1', target: 'view1', type: 'view-pattern', data: { pattern: 'view-pattern' } },
];

// Mock incomplete command pattern
const mockIncompleteCommandPatternEdges: Edge[] = [
  { id: 'e1', source: 'trigger1', target: 'command1', type: 'command-pattern', data: { pattern: 'command-pattern' } },
  // Missing command1 -> event1 connection
  { id: 'e3', source: 'event1', target: 'view1', type: 'view-pattern', data: { pattern: 'view-pattern' } },
];

describe('Validation Functionality', () => {
  it('detects complete patterns correctly', () => {
    const validationResult = validateModel(mockNodes, mockCommandPatternEdges);
    
    // Should have success message for complete command pattern
    expect(validationResult.messages.some(m => 
      m.type === 'success' && m.message.includes('command patterns')
    )).toBeTruthy();
    
    // Should have success message for complete view pattern
    expect(validationResult.messages.some(m => 
      m.type === 'success' && m.message.includes('view patterns')
    )).toBeTruthy();
  });
  
  it('detects incomplete command patterns', () => {
    const validationResult = validateModel(mockNodes, mockIncompleteCommandPatternEdges);
    
    // Should have warning for incomplete command pattern
    expect(validationResult.messages.some(m => 
      m.type === 'warning' && m.message.includes('incomplete command patterns')
    )).toBeTruthy();
  });
  
  it('detects disconnected nodes', () => {
    const validationResult = validateModel(mockNodes, mockCommandPatternEdges);
    
    // Should detect event2 as disconnected
    expect(validationResult.messages.some(m => 
      m.type === 'warning' && 
      m.message.includes('disconnected nodes') &&
      m.affectedNodeIds?.includes('event2')
    )).toBeTruthy();
  });
});

describe('Statistics Analysis', () => {
  it('calculates model statistics correctly', () => {
    const stats = analyzeModelStatistics(mockNodes, mockCommandPatternEdges);
    
    expect(stats.totalNodes).toBe(5);
    expect(stats.totalEdges).toBe(3);
    
    // Check node counts by type
    expect(stats.nodeCountsByType.trigger).toBe(1);
    expect(stats.nodeCountsByType.command).toBe(1);
    expect(stats.nodeCountsByType.event).toBe(2);
    expect(stats.nodeCountsByType.view).toBe(1);
    
    // Check pattern counts
    expect(stats.patternCounts.commandPatterns).toBe(2); // We have 2 command-pattern edges
    expect(stats.patternCounts.completeCommandPatterns).toBe(1);
    expect(stats.patternCounts.viewPatterns).toBe(1);
  });
  
  it('identifies incomplete patterns in statistics', () => {
    const stats = analyzeModelStatistics(mockNodes, mockIncompleteCommandPatternEdges);
    
    expect(stats.patternCounts.commandPatterns).toBe(1);
    expect(stats.patternCounts.completeCommandPatterns).toBe(0); // Should be zero because it's incomplete
    expect(stats.patternCounts.viewPatterns).toBe(1);
  });
});
