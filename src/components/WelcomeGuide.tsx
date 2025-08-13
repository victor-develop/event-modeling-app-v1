import React, { useState, useEffect } from 'react';

interface WelcomeGuideProps {
  onClose: () => void;
}

const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ onClose }) => {
  const [visible, setVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  
  // Close automatically after 60 seconds if user doesn't interact
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose();
    }, 60000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  const handleClose = () => {
    setVisible(false);
    onClose();
  };
  
  const steps = [
    {
      title: 'Welcome to Event Modeling App',
      content: 'This application helps you create event-driven system models using the EventModeling.org methodology. Follow this quick guide to get started!'
    },
    {
      title: 'Building Blocks',
      content: 'Use the toolbar at the top to add the four building blocks: Triggers (user actions), Commands (instructions), Events (facts), and Views (projections).'
    },
    {
      title: 'Creating Patterns',
      content: 'Connect nodes to create patterns: Command Pattern (Trigger→Command→Event), View Pattern (Event→View), and Automation Pattern (Event→Command→Event).'
    },
    {
      title: 'Validation & Analysis',
      content: 'The Validation Panel in the bottom right provides real-time feedback on your model correctness. Click on validation messages to highlight affected elements.'
    },
    {
      title: 'History & Time Travel',
      content: 'Use the History Panel on the right to navigate through the history of your model changes and inspect detailed properties of selected elements.'
    }
  ];
  
  if (!visible) return null;
  
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      borderRadius: '8px',
      padding: '20px',
      width: '500px',
      maxWidth: '90vw',
      zIndex: 1000
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '15px' 
      }}>
        <h2 style={{ 
          margin: 0, 
          fontSize: '18px', 
          color: '#2980b9'
        }}>
          {steps[currentStep].title}
        </h2>
        <button 
          onClick={handleClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '20px',
            color: '#7f8c8d'
          }}
        >
          ×
        </button>
      </div>
      
      <div style={{
        padding: '10px 0',
        fontSize: '15px',
        lineHeight: '1.5',
        color: '#34495e',
        minHeight: '80px'
      }}>
        {steps[currentStep].content}
      </div>
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '20px'
      }}>
        <div>
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep(prev => prev - 1)}
              style={{
                background: '#f8f9fa',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '8px 16px',
                cursor: 'pointer'
              }}
            >
              Previous
            </button>
          )}
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center'
        }}>
          {steps.map((_, idx) => (
            <div 
              key={idx}
              onClick={() => setCurrentStep(idx)}
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: currentStep === idx ? '#3498db' : '#e0e0e0',
                margin: '0 4px',
                cursor: 'pointer'
              }}
            />
          ))}
        </div>
        
        <div>
          {currentStep < steps.length - 1 ? (
            <button
              onClick={() => setCurrentStep(prev => prev + 1)}
              style={{
                background: '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                cursor: 'pointer'
              }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleClose}
              style={{
                background: '#2ecc71',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                cursor: 'pointer'
              }}
            >
              Get Started
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WelcomeGuide;
