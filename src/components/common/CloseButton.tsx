import React from 'react';

interface CloseButtonProps {
  onClick: (e: React.MouseEvent) => void;
}

const CloseButton: React.FC<CloseButtonProps> = ({ onClick }) => {
  return (
    <div 
      onClick={onClick}
      style={{
        position: 'absolute',
        top: '2px',
        right: '2px',
        width: '16px',
        height: '16px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        fontSize: '12px',
        fontWeight: 'bold',
        color: '#666',
        border: '1px solid #ccc',
        zIndex: 10,
      }}
    >
      ×
    </div>
  );
};

export default CloseButton;
