import React, { useRef, useEffect, useCallback } from 'react';
import { GraphQLEditor } from 'graphql-editor';
import type { ExternalEditorAPI, PassedSchema } from 'graphql-editor';
import { useSchemaState } from '../state/schemaState';
import { findTypeNames, parseSchema } from '../utils/schemaPreservation';
import { toCamelCase, fromCamelCase, findMostSimilarString } from '../utils/stringUtils';

interface SchemaEditorModalProps {
  blockId: string;
  blockTitle: string;
  blockType: 'command' | 'event' | 'view';
  isOpen: boolean;
  onClose: () => void;
}

export const SchemaEditorModal: React.FC<SchemaEditorModalProps> = ({
  blockId,
  blockTitle,
  blockType,
  isOpen,
  onClose,
}) => {
  const { schemaData, updateSchema, registerBlock, blockRegistry, updateBlockTitle } = useSchemaState();
  const editorRef = useRef<ExternalEditorAPI>(null);
  
  // Log when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('[DEBUG-MODAL] Schema editor opened with:', {
        blockId,
        blockTitle,
        blockType,
        currentSchema: schemaData.code
      });
      
      // Check if the type exists in the schema
      try {
        const ast = parseSchema(schemaData.code);
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
  }, [isOpen, blockId, blockTitle, blockType, schemaData.code]);
  
  // Register this block when the component mounts or block details change
  useEffect(() => {
    if (blockId && blockTitle) {
      registerBlock({
        id: blockId,
        title: blockTitle,
        type: blockType
      });
    }
  }, [blockId, blockTitle, blockType, registerBlock]);
  
  // Detect schema changes to update block titles
  const detectSchemaChanges = useCallback((newSchema: string) => {
    if (!schemaData.code || schemaData.code === newSchema) return;
    
    const prevSchema = schemaData.code;
    
    // Parse previous and current schema
    const prevAst = parseSchema(prevSchema);
    const newAst = parseSchema(newSchema);
    
    if (!prevAst || !newAst) return;
    
    const prevTypeNames = findTypeNames(prevAst);
    const newTypeNames = findTypeNames(newAst);
    
    console.log('Detecting schema changes:', { prevTypeNames, newTypeNames });
    
    // Find blocks that might need title updates
    blockRegistry.forEach(block => {
      const blockTypeName = toCamelCase(block.title);
      
      // Skip if the type still exists with the same name
      if (newTypeNames.includes(blockTypeName)) return;
      
      // Check if the type was removed completely (not just renamed)
      if (!prevTypeNames.includes(blockTypeName)) return;
      
      // For command blocks, also check input and result types
      let commandTypesExist = false;
      if (block.type === 'command') {
        const inputType = `${blockTypeName}Input`;
        const resultType = `${blockTypeName}Result`;
        commandTypesExist = newTypeNames.includes(inputType) || newTypeNames.includes(resultType);
        if (commandTypesExist) return;
      }
      
      console.log('Looking for similar type to:', blockTypeName);
      
      // Find the most similar type name in the new schema
      const similarType = findMostSimilarString(blockTypeName, newTypeNames, 0.7);
      if (similarType) {
        console.log('Found similar type:', similarType);
        // Update block title based on the renamed type
        const newTitle = fromCamelCase(similarType.string);
        if (newTitle !== block.title) {
          console.log('Updating block title from', block.title, 'to', newTitle);
          // Use updateBlockTitle to ensure bidirectional sync
          updateBlockTitle(block.id, newTitle);
        }
      }
    });
  }, [blockRegistry, updateBlockTitle, schemaData.code]);
  
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
        zIndex: 9999, // Ensure it's above everything else
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
          overflow: 'hidden',
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
        <div style={{ flex: 1 }}>
          {/* Debug schema before passing to editor */}
          {(() => {
            console.log('[DEBUG-EDITOR] Schema being passed to GraphQL Editor:');
            console.log('[DEBUG-EDITOR] Code:', JSON.stringify(schemaData.code));
            console.log('[DEBUG-EDITOR] Libraries:', JSON.stringify(schemaData.libraries || ''));
            console.log('[DEBUG-EDITOR] Code length:', schemaData.code.length);
            console.log('[DEBUG-EDITOR] Is empty?', !schemaData.code.trim());
            return null;
          })()}
          <GraphQLEditor
            ref={editorRef}
            schema={{
              code: schemaData.code,
              libraries: schemaData.libraries || '',
              source: 'outside',
            }}
            setSchema={(newSchema: PassedSchema) => {
              // Process schema changes to detect type name updates
              detectSchemaChanges(newSchema.code);
              
              // Update schema with source tracking to prevent infinite loops
              updateSchema({
                code: newSchema.code,
                libraries: newSchema.libraries || '',
              }, 'schema-editor');
            }}
            path="schema.graphql"
            title="Event Modeling Schema"
          />
        </div>
      </div>
    </div>
  );
};
