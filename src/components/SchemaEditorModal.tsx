import React, { useRef, useEffect, useMemo } from 'react';
import { GraphQLEditor } from 'graphql-editor';
import type { ExternalEditorAPI, PassedSchema } from 'graphql-editor';
import { useSchemaState } from '../state/schemaState';
import { parseSchemaToAST, generateSchemaFromAST } from '../graphql-ast-utils';
import { findTypeNames, parseSchema } from '../utils/schemaPreservation';
import { toCamelCase } from '../utils/stringUtils';
import { BlockInfo } from '../types/schema';

const DEFAULT_LIBRARIES = `
directive @eventModelingBlock(
  nodeId: String!
  blockType: String!
  blockId: String!
  blockEntityType: String!
  version: Int
) on OBJECT | INPUT_OBJECT
`;

// Utility function to convert React Flow nodes to BlockInfo
const convertNodesToBlocks = (nodes: any[]): BlockInfo[] => {
  return nodes
    .filter(node => node.data?.label && ['command', 'event', 'view'].includes(node.type))
    .map(node => ({
      id: node.id,
      title: node.data.label,
      type: node.type as 'command' | 'event' | 'view'
    }));
};

interface SchemaEditorModalProps {
  blockId: string;
  blockTitle: string;
  blockType: 'command' | 'event' | 'view';
  isOpen: boolean;
  onClose: () => void;
  currentNodes: any[]; // React Flow nodes from the current state
}

export const SchemaEditorModal: React.FC<SchemaEditorModalProps> = ({
  blockId,
  blockTitle,
  blockType,
  isOpen,
  onClose,
  currentNodes,
}) => {
  const { schema, updateSchema, syncSchemaWithBlocks } = useSchemaState();
  const editorRef = useRef<ExternalEditorAPI>(null);
  // When modal just opened we pass source 'outside' once so the editor runs generateTreeFromSchema
  // and the Relation view parses. After that we pass through schema.source. Ref stays false until
  // after the first render when open, then we set it true; when modal closes we reset to false.
  const hasPassedOutsideForThisOpenRef = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      hasPassedOutsideForThisOpenRef.current = false;
    } else {
      hasPassedOutsideForThisOpenRef.current = true;
    }
  }, [isOpen]);

  // Stable schema reference: only change when code/libraries/source or open-state change.
  // Normalize schema by round-tripping through our parser/generator so the Relation view can
  // always parse it when the modal is re-opened.
  const stableSchema = useMemo<PassedSchema>(() => {
    let code = schema.code;
    try {
      if (code && code.trim()) {
        const ast = parseSchemaToAST(code);
        if (ast?.nodes && ast.nodes.length > 0) {
          const generated = generateSchemaFromAST(ast);
          code = generated;
          console.log('[DEBUG-SCHEMA-NORMALIZE] Round-trip OK, normalized schema for editor', { nodeCount: ast.nodes.length, codeLength: generated.length });
        } else {
          console.log('[DEBUG-SCHEMA-NORMALIZE] Parse OK but empty AST, passing through', { codeLength: code.length });
        }
      } else {
        console.log('[DEBUG-SCHEMA-NORMALIZE] Empty or whitespace schema, passing through');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const snippet = code.length > 300 ? `${code.slice(0, 150)}...${code.slice(-150)}` : code;
      console.warn('[DEBUG-SCHEMA-NORMALIZE] Normalize failed, passing original schema to editor', {
        error: message,
        codeLength: code.length,
        snippet,
      });
      if (err instanceof Error && err.stack) {
        console.warn('[DEBUG-SCHEMA-NORMALIZE] Stack:', err.stack);
      }
    }
    // First time after opening (hasPassedOutsideForThisOpenRef false): pass 'outside' so the
    // editor parses and Relation view renders. Then pass through schema.source so editor edits
    // don't trigger redundant generateTreeFromSchema.
    const forceOutsideOnce = isOpen && !hasPassedOutsideForThisOpenRef.current;
    const source = forceOutsideOnce ? 'outside' : (schema.source ?? 'outside');
    return {
      code,
      libraries: schema.libraries ?? DEFAULT_LIBRARIES,
      source,
    };
  }, [schema.code, schema.libraries, schema.source, isOpen]);
  
  // Log when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('[DEBUG-MODAL] Schema editor opened with:', {
        blockId,
        blockTitle,
        blockType,
        currentSchema: schema.code
      });
      
      // Check if the type exists in the schema
      try {
        const ast = parseSchema(schema.code);
        if (ast) {
          const typeNames = findTypeNames(ast);
          const typeName = toCamelCase(blockTitle);
          console.log('[DEBUG-MODAL] Current type names in schema:', typeNames);
          console.log('[DEBUG-MODAL] Looking for type:', typeName);
          console.log('[DEBUG-MODAL] Type exists in schema:', typeNames.includes(typeName));
        }
      } catch (error) {
        console.error('[DEBUG-MODAL] Error parsing schema:', error);
      }
    }
  }, [isOpen, blockId, blockTitle, blockType, schema.code]);
  
  // Sync schema with current blocks when the modal opens or nodes change
  useEffect(() => {
    if (isOpen && currentNodes.length > 0) {
      const blocks = convertNodesToBlocks(currentNodes);
      console.log('[DEBUG-MODAL] Syncing schema with current blocks:', blocks);
      syncSchemaWithBlocks(blocks);
    }
  }, [isOpen, currentNodes, syncSchemaWithBlocks]);

  // Focus on the current block type when the editor opens
  useEffect(() => {
    if (isOpen && editorRef.current) {
      // Use setTimeout to ensure the editor is fully loaded
      const timer = setTimeout(() => {
        try {
          // Try to navigate to the block's type in the editor
          // We'll implement focusing on specific types in the future if needed
          console.log(`Opening schema editor focused on: ${blockTitle}`);
        } catch (err) {
          console.error('Failed to navigate to type:', err);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, blockTitle]);
  
  if (!isOpen) return null;
  
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        // Close when clicking the backdrop
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '95%',
          height: '95%',
          backgroundColor: '#fff',
          borderRadius: '8px',
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 5px 15px rgba(0,0,0,0.5)',
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the modal content
      >
        <div style={{ 
          padding: '15px 20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid #eee',
          backgroundColor: '#f8f9fa'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>
            <span style={{ color: '#9b59b6', marginRight: '10px' }}>✏️</span>
            GraphQL Schema Editor
            {blockTitle && <span style={{ fontSize: '16px', color: '#666', marginLeft: '10px' }}>• Focused on: {blockTitle}</span>}
          </h3>
          <div>
            <button 
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid #ccc',
                borderRadius: '4px',
                padding: '5px 15px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Close
            </button>
          </div>
        </div>
        <div style={{ 
          flex: 1, 
          overflow: 'visible'
        }}>
          {/* Debug schema before passing to editor */}
          {(() => {
            console.log('[DEBUG-EDITOR] Schema being passed to GraphQL Editor:');
            console.log('[DEBUG-EDITOR] Code:', JSON.stringify(schema.code));
            console.log('[DEBUG-EDITOR] Libraries:', JSON.stringify(schema.libraries || ''));
            console.log('[DEBUG-EDITOR] Code length:', schema.code.length);
            console.log('[DEBUG-EDITOR] Is empty?', !schema.code.trim());
            return null;
          })()}
          <div style={{ height: '100%', overflow: 'visible' }}>
            <GraphQLEditor
              ref={editorRef}
              schema={stableSchema}
              setSchema={(newSchema: PassedSchema) => {
                // Update schema with source tracking to prevent infinite loops
                updateSchema(newSchema);
              }}
              path="schema.graphql"
              title="Event Modeling Schema"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
