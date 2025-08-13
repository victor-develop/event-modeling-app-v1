# Infinite Horizontal Growth for Swimlanes in Event Modeling App

This document explains how the infinite horizontal growth for swimlanes is implemented in commit `792eed65bd1a7111b3fb0ca5febdc4de7469d700`.

## Core Implementation Approach

The implementation uses a combination of:
1. Dynamic width calculation for swimlanes based on child block positions
2. State management through a reducer pattern
3. Automatic width adjustment when blocks are added

## Key Components

### 1. SwimlaneNode Component

The `SwimlaneNode` component has several important features:

```jsx
// In SwimlaneNode.tsx
return (
  <div
    style={{
      width: '100%',
      height: '100%',
      border: '1px solid #ccc',
      borderRadius: '5px',
      backgroundColor: 'rgba(200,200,255,0.2)',
      padding: '10px',
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {/* ... other content ... */}
    <div style={{ 
      flexGrow: 1, 
      display: 'flex', 
      flexDirection: 'row', 
      flexWrap: 'nowrap', 
      overflowX: 'auto' 
    }}>
    </div>
    {/* ... handles ... */}
  </div>
);
```

Key styling properties:
- `width: '100%'` - The swimlane expands to fill its container
- The inner content container uses:
  - `flexDirection: 'row'` - Arranges blocks horizontally
  - `flexWrap: 'nowrap'` - Prevents wrapping to new lines
  - `overflowX: 'auto'` - Allows horizontal scrolling if needed

### 2. Block Positioning Logic

When adding a new block, the component calculates the position based on existing blocks:

```javascript
const onAddBlock = useCallback(() => {
  const parentNode = getNodes().find((node) => node.id === id);
  if (!parentNode) return;

  const childNodes = getNodes().filter((node) => node.parentId === id);

  let newX = 10;
  const blockHeight = 50;
  const blockWidth = 100;
  const blockPadding = 20;
  const topOffsetForBlocks = 80;

  if (childNodes.length > 0) {
    const rightmostChild = childNodes.reduce((prev, current) => {
      // Parse width to number before addition
      const prevWidth = parseFloat(prev.style?.width as string || '0') || 0;
      const currentWidth = parseFloat(current.style?.width as string || '0') || 0;
      return (prev.position.x + prevWidth) > (current.position.x + currentWidth)
        ? prev
        : current;
    });
    // Parse width to number before addition
    newX = rightmostChild.position.x + (parseFloat(rightmostChild.style?.width as string || '0') || blockWidth) + blockPadding;
  }

  const newBlock = {
    id: nanoid(),
    type: 'block',
    position: { x: newX, y: topOffsetForBlocks },
    data: { label: `Block ${childNodes.length + 1}` },
    parentId: id,
    extent: 'parent',
    style: { width: blockWidth, height: blockHeight, border: '1px solid #555', backgroundColor: '#fff' },
  };

  // The swimlane width update logic is now handled in the appReducer (ADD_BLOCK case)
  dispatchAddBlock(newBlock);
}, [id, getNodes, dispatchAddBlock]);
```

Key aspects:
- Finds the rightmost child block
- Calculates new block position based on rightmost block's position + width + padding
- Sets `extent: 'parent'` to keep the block within the swimlane's boundaries

### 3. Swimlane Width Adjustment in Reducer

The critical part of the implementation is in the app reducer, which automatically expands the swimlane width when blocks are added:

```javascript
case 'ADD_BLOCK':
  newNodes = newNodes.concat(command.payload);
  newNodes = newNodes.map((node) => {
    if (node.id === command.payload.parentId) {
      const currentSwimlaneWidth = node.style?.width || 800;
      const potentialRightEdge = command.payload.position.x + (command.payload.style?.width || 100) + 20;
      if (potentialRightEdge > currentSwimlaneWidth) {
        return {
          ...node,
          style: {
            ...node.style,
            width: potentialRightEdge,
          },
        };
      }
    }
    return node;
  });
  break;
```

Key logic:
1. Default swimlane width is 800px if not specified
2. Calculates the potential right edge of the swimlane after adding the new block:
   - `potentialRightEdge = block's x position + block width + padding`
3. If the potential right edge exceeds the current swimlane width, the swimlane width is expanded to accommodate the new block

### 4. Event Sourcing Pattern

The same width adjustment logic is applied in the `applyEvents` function, ensuring that the swimlane width is properly maintained when replaying events:

```javascript
case 'ADD_BLOCK':
  tempNodes = tempNodes.concat(event.payload);
  tempNodes = tempNodes.map((node) => {
    if (node.id === event.payload.parentId) {
      const currentSwimlaneWidth = node.style?.width || 800;
      const potentialRightEdge = event.payload.position.x + (event.payload.style?.width || 100) + 20;
      if (potentialRightEdge > currentSwimlaneWidth) {
        return {
          ...node,
          style: {
            ...node.style,
            width: potentialRightEdge,
          },
        };
      }
    }
    return node;
  });
  break;
```

## Implementation Summary

The infinite horizontal growth for swimlanes is achieved through:

1. **Dynamic Width Calculation**:
   - Swimlanes start with a default width (800px)
   - Width is automatically increased when blocks would exceed the current width

2. **Proper Block Positioning**:
   - New blocks are positioned to the right of the rightmost existing block
   - Adequate padding is maintained between blocks

3. **Centralized Width Management**:
   - Width adjustments happen in the reducer, not in the component
   - This ensures consistent behavior across all actions that add blocks

4. **Flexible Container Styling**:
   - Swimlane uses flex layout with `nowrap` to prevent wrapping
   - Content container allows horizontal overflow with `overflowX: 'auto'`

This approach ensures that swimlanes can grow infinitely as more blocks are added, while maintaining proper layout and positioning of all elements.
