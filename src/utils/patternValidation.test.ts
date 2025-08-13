import { describe, it, expect } from 'vitest';
import { isValidConnection, getConnectionPatternType, ConnectionPattern } from './patternValidation';

describe('Pattern Validation', () => {
  describe('isValidConnection', () => {
    it('should allow Trigger -> Command connections', () => {
      const sourceNode = { id: '1', type: 'trigger' };
      const targetNode = { id: '2', type: 'command' };
      
      const result = isValidConnection(sourceNode, targetNode);
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Trigger can initiate a Command');
    });
    
    it('should allow Command -> Event connections', () => {
      const sourceNode = { id: '1', type: 'command' };
      const targetNode = { id: '2', type: 'event' };
      
      const result = isValidConnection(sourceNode, targetNode);
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Command can produce an Event');
    });

    it('should allow Event -> View connections', () => {
      const sourceNode = { id: '1', type: 'event' };
      const targetNode = { id: '2', type: 'view' };
      
      const result = isValidConnection(sourceNode, targetNode);
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Event can be displayed in a View');
    });

    it('should allow Event -> Command connections (Automation Pattern)', () => {
      const sourceNode = { id: '1', type: 'event' };
      const targetNode = { id: '2', type: 'command' };
      
      const result = isValidConnection(sourceNode, targetNode);
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Event can automatically trigger a Command');
    });
    
    it('should allow Event -> Command -> Event connections (Automation Chain)', () => {
      // This test verifies both parts of the automation chain
      // First part: Event -> Command 
      const sourceNode1 = { id: '1', type: 'event' };
      const targetNode1 = { id: '2', type: 'command' };
      
      const result1 = isValidConnection(sourceNode1, targetNode1);
      expect(result1.valid).toBe(true);
      
      // Second part: Command -> Event
      const sourceNode2 = { id: '2', type: 'command' };
      const targetNode2 = { id: '3', type: 'event' };
      
      const result2 = isValidConnection(sourceNode2, targetNode2);
      expect(result2.valid).toBe(true);
    });
    
    it('should not allow Trigger -> Event connections', () => {
      const sourceNode = { id: '1', type: 'trigger' };
      const targetNode = { id: '2', type: 'event' };
      
      const result = isValidConnection(sourceNode, targetNode);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid connection');
    });
    
    it('should not allow Event -> Trigger connections', () => {
      const sourceNode = { id: '1', type: 'event' };
      const targetNode = { id: '2', type: 'trigger' };
      
      const result = isValidConnection(sourceNode, targetNode);
      
      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid connection');
    });
    
    it('should allow View -> UI connections', () => {
      const sourceNode = { id: '4', type: 'view' };
      const targetNode = { id: '5', type: 'UI' };
      
      const result = isValidConnection(sourceNode, targetNode);
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('View can connect to UI block');
    });
    
    it('should allow UI -> Command connections', () => {
      const sourceNode = { id: '5', type: 'UI' };
      const targetNode = { id: '2', type: 'command' };
      
      const result = isValidConnection(sourceNode, targetNode);
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('UI block can connect to Command');
    });
    
    it('should allow Event -> Processor connections', () => {
      const sourceNode = { id: '3', type: 'event' };
      const targetNode = { id: '6', type: 'Processor' };
      
      const result = isValidConnection(sourceNode, targetNode);
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Event can connect to Processor block');
    });
    
    it('should allow View -> Processor connections', () => {
      const sourceNode = { id: '4', type: 'view' };
      const targetNode = { id: '6', type: 'Processor' };
      
      const result = isValidConnection(sourceNode, targetNode);
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('View can connect to Processor block');
    });
    
    it('should allow Processor -> Command connections', () => {
      const sourceNode = { id: '6', type: 'Processor' };
      const targetNode = { id: '2', type: 'command' };
      
      const result = isValidConnection(sourceNode, targetNode);
      
      expect(result.valid).toBe(true);
      expect(result.message).toBe('Processor block can connect to Command');
    });
    
    it('should handle null nodes', () => {
      expect(isValidConnection(null, { id: '2', type: 'command' }).valid).toBe(false);
      expect(isValidConnection({ id: '1', type: 'trigger' }, null).valid).toBe(false);
      expect(isValidConnection(null, null).valid).toBe(false);
    });
  });
  
  describe('getConnectionPatternType', () => {
    it('should identify Command Pattern connections', () => {
      // Trigger -> Command
      const pattern1 = getConnectionPatternType(
        { id: '1', type: 'trigger' },
        { id: '2', type: 'command' }
      );
      expect(pattern1).toBe(ConnectionPattern.COMMAND_PATTERN);
      
      // Command -> Event
      const pattern2 = getConnectionPatternType(
        { id: '2', type: 'command' },
        { id: '3', type: 'event' }
      );
      expect(pattern2).toBe(ConnectionPattern.COMMAND_PATTERN);
    });

    it('should identify View Pattern connections', () => {
      // Event -> View
      const pattern = getConnectionPatternType(
        { id: '3', type: 'event' },
        { id: '4', type: 'view' }
      );
      expect(pattern).toBe(ConnectionPattern.VIEW_PATTERN);
    });
    
    it('should identify Automation Pattern connections', () => {
      // Event -> Command (automation)
      const pattern = getConnectionPatternType(
        { id: '3', type: 'event' },
        { id: '2', type: 'command' }
      );
      expect(pattern).toBe(ConnectionPattern.AUTOMATION_PATTERN);
    });
    
    it('should identify UI Pattern connections', () => {
      // View -> UI
      const pattern1 = getConnectionPatternType(
        { id: '4', type: 'view' },
        { id: '5', type: 'UI' }
      );
      expect(pattern1).toBe(ConnectionPattern.UI_PATTERN);
      
      // UI -> Command
      const pattern2 = getConnectionPatternType(
        { id: '5', type: 'UI' },
        { id: '2', type: 'command' }
      );
      expect(pattern2).toBe(ConnectionPattern.UI_PATTERN);
    });
    
    it('should identify Processor Pattern connections', () => {
      // Event -> Processor
      const pattern1 = getConnectionPatternType(
        { id: '3', type: 'event' },
        { id: '6', type: 'Processor' }
      );
      expect(pattern1).toBe(ConnectionPattern.PROCESSOR_PATTERN);
      
      // View -> Processor
      const pattern2 = getConnectionPatternType(
        { id: '4', type: 'view' },
        { id: '6', type: 'Processor' }
      );
      expect(pattern2).toBe(ConnectionPattern.PROCESSOR_PATTERN);
      
      // Processor -> Command
      const pattern3 = getConnectionPatternType(
        { id: '6', type: 'Processor' },
        { id: '2', type: 'command' }
      );
      expect(pattern3).toBe(ConnectionPattern.PROCESSOR_PATTERN);
    });
    
    it('should return null for invalid connections', () => {
      // Trigger -> Event (invalid)
      const pattern = getConnectionPatternType(
        { id: '1', type: 'trigger' },
        { id: '3', type: 'event' }
      );
      expect(pattern).toBeNull();
    });
  });
});
