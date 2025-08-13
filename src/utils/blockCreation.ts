import { nanoid } from 'nanoid';
import { BlockKind } from '../types/blockTypes';

// Interface for block creation parameters
export interface CreateBlockParams {
  blockType: string;
  parentId: string;
  parentPosition?: { x: number; y: number };
  existingBlocks?: any[];
}

// Interface for the created block
export interface BlockData {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    kind: BlockKind | string;
  };
  parentId: string;
  extent: string;
  style?: {
    width: number;
    height: number;
    border: string;
    backgroundColor: string;
  };
}

/**
 * Creates a new block with consistent naming and styling
 * Used by both topbar and swimlane button block creation
 */
export function createBlock({
  blockType,
  parentId,
  parentPosition = { x: 0, y: 0 },
  existingBlocks = []
}: CreateBlockParams): BlockData {
  // Block dimensions - consistent across all creation methods
  const blockHeight = 100; // Taller blocks for better visibility
  const blockWidth = 140;  // Wider blocks for better content display
  const blockGap = 160;    // Horizontal gap between blocks
  const xOffset = 5;      // Offset from the left edge of swimlane - reduced to minimize left gap
  const yOffset = 100;     // Offset from the top edge of swimlane - increased to avoid overlapping with buttons

  // Map blockType to correct BlockKind
  let blockKind: BlockKind;
  switch (blockType.toLowerCase()) {
    case 'trigger':
      blockKind = BlockKind.TRIGGER;
      break;
    case 'command':
      blockKind = BlockKind.COMMAND;
      break;
    case 'event':
      blockKind = BlockKind.EVENT;
      break;
    case 'view':
      blockKind = BlockKind.VIEW;
      break;
    case 'ui':
      blockKind = BlockKind.UI;
      break;
    case 'processor':
      blockKind = BlockKind.PROCESSOR;
      break;
    default:
      console.error(`Unknown block type: ${blockType}`);
      throw new Error(`Unknown block type: ${blockType}`);
  }

  // Map blockType to correct node type string for React Flow
  // Ensure consistent casing for all block types - React Flow node types are registered with specific casing
  let nodeType: string;
  switch (blockType.toLowerCase()) {
    case 'ui':
      nodeType = 'UI'; // Must match case in customNodeTypes.tsx registration
      break;
    case 'processor':
      nodeType = 'Processor'; // Must match case in customNodeTypes.tsx registration
      break;
    default:
      nodeType = blockType.toLowerCase(); // Other nodes use lowercase
  }

  // Calculate horizontal position for new block
  let xPosition: number;
  if (existingBlocks.length > 0) {
    // Position new block after the last block in this lane
    xPosition = Math.max(...existingBlocks.map((b: any) => b.position.x)) + blockGap;
  } else {
    // Position at the start of the swimlane with offset
    xPosition = parentPosition.x + xOffset;
  }

  // Create consistent label - "New BlockType" for all blocks
  // This ensures consistency between topbar and swimlane button creation
  const label = `New ${blockType.charAt(0).toUpperCase() + blockType.slice(1)}`;

  // Create the block with consistent properties
  return {
    id: nanoid(),
    type: nodeType,
    position: { 
      x: xPosition, 
      y: parentPosition.y + yOffset 
    },
    data: { 
      label,
      kind: blockKind
    },
    parentId,
    extent: 'parent', // Constrain to parent boundaries
    style: { 
      width: blockWidth, 
      height: blockHeight, 
      border: '1px solid #555', 
      backgroundColor: '#fff'
    },
  };
}

/**
 * Validates if a block type can be added to a specific swimlane kind
 * Returns an error message if invalid, or null if valid
 */
export function validateBlockInSwimlane(blockType: string, swimlaneKind: string): string | null {
  // Define allowed swimlanes for each block type
  const allowedSwimlanes: Record<string, string[]> = {
    'trigger': ['trigger'],
    'command': ['command_view'],
    'event': ['event'],
    'view': ['command_view'],
    'ui': ['trigger'],
    'processor': ['trigger']
  };

  const normalizedBlockType = blockType.toLowerCase();
  
  if (!allowedSwimlanes[normalizedBlockType]) {
    return `Unknown block type: ${blockType}`;
  }

  if (!allowedSwimlanes[normalizedBlockType].includes(swimlaneKind)) {
    return `Cannot add a ${blockType} block to this swimlane type. ${blockType} blocks must be in ${allowedSwimlanes[normalizedBlockType].join(' or ')} swimlane.`;
  }

  return null; // Valid combination
}
