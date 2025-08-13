import { describe, it, expect, beforeEach } from 'vitest';
import { nanoid } from 'nanoid';
import { EventTypes, appReducer, initialState } from '../state/eventSourcing';
import { SwimlaneKind, ALLOWED_BLOCK_TYPES } from '../types/swimlaneTypes';
import { BlockKind } from '../types/blockTypes';

// Helper to create events
const createEvent = (type: any, payload: any) => {
  return { type, payload };
};

describe('Swimlane and Block Architecture', () => {
  let state: any;

  beforeEach(() => {
    state = { ...initialState };
  });

  describe('Swimlane Vertical Stacking', () => {
    it('should position new swimlanes vertically stacked', () => {
      // Add first swimlane
      const firstSwimlaneId = nanoid();
      state = appReducer(state, createEvent(EventTypes.ModelingEditor.ADD_SWIMLANE, {
        id: firstSwimlaneId,
        type: 'swimlane',
        position: { x: 100, y: 50 },
        style: { width: 900, height: 200 },
        data: { label: 'Event Lane', kind: SwimlaneKind.EVENT }
      }));

      // Add second swimlane
      const secondSwimlaneId = nanoid();
      state = appReducer(state, createEvent(EventTypes.ModelingEditor.ADD_SWIMLANE, {
        id: secondSwimlaneId,
        type: 'swimlane',
        position: { x: 100, y: 300 }, // Should be below the first swimlane (50 + 200 + 50 gap)
        style: { width: 900, height: 200 },
        data: { label: 'Command Lane', kind: SwimlaneKind.COMMAND_VIEW }
      }));

      // Get the swimlanes from the state
      const swimlanes = state.nodes.filter((node: any) => node.type === 'swimlane');
      
      // Assert swimlanes are vertically stacked (second is below the first)
      expect(swimlanes.length).toBe(2);
      expect(swimlanes[0].position.y).toBe(50);
      expect(swimlanes[1].position.y).toBe(300);
      
      // Assert second swimlane is positioned below the first
      const firstSwimlaneBottom = swimlanes[0].position.y + swimlanes[0].style.height;
      expect(swimlanes[1].position.y).toBeGreaterThan(firstSwimlaneBottom);
    });
  });

  describe('Block Creation and Horizontal Layout', () => {
    it('should position blocks horizontally within swimlanes', () => {
      // Add a swimlane
      const swimlaneId = nanoid();
      state = appReducer(state, createEvent(EventTypes.ModelingEditor.ADD_SWIMLANE, {
        id: swimlaneId,
        type: 'swimlane',
        position: { x: 100, y: 50 },
        style: { width: 900, height: 200 },
        data: { label: 'Event Lane', kind: SwimlaneKind.EVENT }
      }));

      // Add first block to the swimlane
      const firstBlockId = nanoid();
      state = appReducer(state, createEvent(EventTypes.ModelingEditor.ADD_BLOCK, {
        id: firstBlockId,
        type: 'block',
        position: { x: 10, y: 20 },
        style: { width: 140, height: 100 },
        data: { label: 'Block 1', kind: BlockKind.EVENT },
        parentId: swimlaneId,
        extent: 'parent'
      }));

      // Add second block to the swimlane
      const secondBlockId = nanoid();
      state = appReducer(state, createEvent(EventTypes.ModelingEditor.ADD_BLOCK, {
        id: secondBlockId,
        type: 'block',
        position: { x: 170, y: 20 }, // 10 + 140 + 20 padding
        style: { width: 140, height: 100 },
        data: { label: 'Block 2', kind: BlockKind.EVENT },
        parentId: swimlaneId,
        extent: 'parent'
      }));

      // Get the blocks from the state
      const blocks = state.nodes.filter((node: any) => node.parentId === swimlaneId);
      
      // Assert blocks are laid out horizontally (second is to the right of the first)
      expect(blocks.length).toBe(2);
      expect(blocks[0].position.x).toBe(10);
      expect(blocks[1].position.x).toBe(170);
      expect(blocks[0].position.y).toBe(blocks[1].position.y); // Same vertical position
      
      // Assert swimlane is wide enough to contain blocks
      const swimlane = state.nodes.find((node: any) => node.id === swimlaneId);
      const rightmostBlockEdge = blocks[1].position.x + blocks[1].style.width + 30; // 30px padding
      expect(parseFloat(swimlane.style.width)).toBeGreaterThanOrEqual(rightmostBlockEdge);
    });

    it('should grow the swimlane width when adding more blocks', () => {
      // Add a swimlane with initial width
      const swimlaneId = nanoid();
      const initialWidth = 500;
      state = appReducer(state, createEvent(EventTypes.ModelingEditor.ADD_SWIMLANE, {
        id: swimlaneId,
        type: 'swimlane',
        position: { x: 100, y: 50 },
        style: { width: initialWidth, height: 200 },
        data: { label: 'Event Lane', kind: SwimlaneKind.EVENT }
      }));

      // Add blocks that will require the swimlane to grow
      for (let i = 0; i < 5; i++) {
        const blockId = nanoid();
        const blockWidth = 140;
        const blockX = 10 + i * (blockWidth + 20); // 20px padding between blocks
        
        state = appReducer(state, createEvent(EventTypes.ModelingEditor.ADD_BLOCK, {
          id: blockId,
          type: 'block',
          position: { x: blockX, y: 20 },
          style: { width: blockWidth, height: 100 },
          data: { label: `Block ${i+1}`, kind: BlockKind.EVENT },
          parentId: swimlaneId,
          extent: 'parent'
        }));
      }

      // Get the swimlane and blocks
      const swimlane = state.nodes.find((node: any) => node.id === swimlaneId);
      const blocks = state.nodes.filter((node: any) => node.parentId === swimlaneId);
      
      // Assert we have all 5 blocks
      expect(blocks.length).toBe(5);
      
      // Calculate expected minimum width
      const lastBlock = blocks[blocks.length - 1];
      const expectedMinWidth = lastBlock.position.x + lastBlock.style.width + 30; // 30px padding
      
      // Assert swimlane width has grown from initial width
      expect(parseFloat(swimlane.style.width)).toBeGreaterThan(initialWidth);
      expect(parseFloat(swimlane.style.width)).toBeGreaterThanOrEqual(expectedMinWidth);
    });
  });

  describe('Block Type Restrictions by Swimlane Kind', () => {
    it('should only allow compatible block types based on swimlane kind', () => {
      // Check that each swimlane kind has the correct allowed block types based on capitalization
      expect(ALLOWED_BLOCK_TYPES[SwimlaneKind.EVENT]).toContain('Event');
      expect(ALLOWED_BLOCK_TYPES[SwimlaneKind.COMMAND_VIEW]).toContain('Command');
      expect(ALLOWED_BLOCK_TYPES[SwimlaneKind.TRIGGER]).toContain('Trigger');
      
      // EVENT swimlane should not allow TRIGGER blocks
      expect(ALLOWED_BLOCK_TYPES[SwimlaneKind.EVENT]).not.toContain('Trigger');
      
      // COMMAND_VIEW swimlane should not allow EVENT blocks
      expect(ALLOWED_BLOCK_TYPES[SwimlaneKind.COMMAND_VIEW]).not.toContain('Event');
      
      // TRIGGER swimlane should not allow COMMAND blocks
      expect(ALLOWED_BLOCK_TYPES[SwimlaneKind.TRIGGER]).not.toContain('Command');
    });
  });

  describe('Parent-Child Relationship', () => {
    it('should maintain correct parentId and extent relationships', () => {
      // Add a swimlane
      const swimlaneId = nanoid();
      state = appReducer(state, createEvent(EventTypes.ModelingEditor.ADD_SWIMLANE, {
        id: swimlaneId,
        type: 'swimlane',
        position: { x: 100, y: 50 },
        style: { width: 900, height: 200 },
        data: { label: 'Event Lane', kind: SwimlaneKind.EVENT }
      }));

      // Add a block to the swimlane
      const blockId = nanoid();
      state = appReducer(state, createEvent(EventTypes.ModelingEditor.ADD_BLOCK, {
        id: blockId,
        type: 'block',
        position: { x: 10, y: 20 },
        style: { width: 140, height: 100 },
        data: { label: 'Event Block', kind: BlockKind.EVENT },
        parentId: swimlaneId,
        extent: 'parent'
      }));

      // Get the block
      const block = state.nodes.find((node: any) => node.id === blockId);
      
      // Assert parentId and extent are set correctly
      expect(block.parentId).toBe(swimlaneId);
      expect(block.extent).toBe('parent');
    });
  });
});
