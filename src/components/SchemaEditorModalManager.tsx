import React, { createContext, useContext, useState } from 'react';
import { SchemaEditorModal } from './SchemaEditorModal';

interface SchemaModalContextValue {
  openSchemaEditor: (blockId: string, blockTitle: string, blockType: 'command' | 'event' | 'view') => void;
  closeSchemaEditor: () => void;
}

interface SchemaModalState {
  isOpen: boolean;
  blockId: string;
  blockTitle: string;
  blockType: 'command' | 'event' | 'view';
}

const SchemaModalContext = createContext<SchemaModalContextValue | undefined>(undefined);

export const useSchemaModal = () => {
  const context = useContext(SchemaModalContext);
  if (!context) {
    throw new Error('useSchemaModal must be used within a SchemaModalProvider');
  }
  return context;
};

export const SchemaModalProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [modalState, setModalState] = useState<SchemaModalState>({
    isOpen: false,
    blockId: '',
    blockTitle: '',
    blockType: 'command',
  });

  // Open the schema editor with focus on a specific block
  const openSchemaEditor = (blockId: string, blockTitle: string, blockType: 'command' | 'event' | 'view') => {
    setModalState({
      isOpen: true,
      blockId,
      blockTitle,
      blockType,
    });
  };

  const closeSchemaEditor = () => {
    setModalState(prev => ({
      ...prev,
      isOpen: false,
    }));
  };

  return (
    <SchemaModalContext.Provider value={{ openSchemaEditor, closeSchemaEditor }}>
      {children}
      <SchemaEditorModal
        blockId={modalState.blockId}
        blockTitle={modalState.blockTitle}
        blockType={modalState.blockType}
        isOpen={modalState.isOpen}
        onClose={closeSchemaEditor}
      />
    </SchemaModalContext.Provider>
  );
};
