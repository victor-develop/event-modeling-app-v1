import React, { useState, useEffect } from 'react';

export interface ToastProps {
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  duration?: number;
  onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  duration = 3000, 
  onClose 
}) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) onClose();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  // Define styles based on toast type
  const getBackgroundColor = () => {
    switch (type) {
      case 'error': return '#f44336';
      case 'warning': return '#ff9800';
      case 'success': return '#4caf50';
      case 'info':
      default: return '#2196f3';
    }
  };
  
  if (!visible) return null;
  
  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: getBackgroundColor(),
        color: 'white',
        padding: '12px 20px',
        borderRadius: '4px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        zIndex: 9999,
        maxWidth: '80%',
        animation: 'fadeIn 0.3s, fadeOut 0.3s 2.7s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div>{message}</div>
      <button
        onClick={() => {
          setVisible(false);
          if (onClose) onClose();
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'white',
          marginLeft: '15px',
          cursor: 'pointer',
          fontSize: '16px',
        }}
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
