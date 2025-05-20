import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  duration?: number;
  visible: boolean;
  onClose: () => void;
  type?: ToastType;
}

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const fadeOut = keyframes`
  from { opacity: 1; transform: translateY(0); }
  to { opacity: 0; transform: translateY(20px); }
`;

const ToastContainer = styled.div<{ isVisible: boolean; type: ToastType }>`
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background-color: ${props => props.theme.colors.secondary};
  color: ${props => props.theme.colors.tertiary};
  padding: 12px 24px;
  border-radius: ${props => props.theme.borderRadius};
  border-left: 3px solid ${props => {
    switch (props.type) {
      case 'error': return '#ff4655';
      case 'warning': return '#ffaa44';
      case 'info': return '#44aaff';
      case 'success':
      default: return props.theme.colors.primary;
    }
  }};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  display: flex;
  align-items: center;
  animation: ${props => props.isVisible ? fadeIn : fadeOut} 0.3s ease forwards;
  clip-path: polygon(0 0, 100% 0, 100% 85%, 85% 100%, 0 100%); /* Valorant-style angle */
`;

const ToastIcon = styled.div<{ type: ToastType }>`
  color: ${props => {
    switch (props.type) {
      case 'error': return '#ff4655';
      case 'warning': return '#ffaa44';
      case 'info': return '#44aaff';
      case 'success':
      default: return props.theme.colors.primary;
    }
  }};
  margin-right: 10px;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  
  svg {
    width: 18px;
    height: 18px;
  }
`;

const ToastMessage = styled.span`
  font-family: ${props => props.theme.fonts.secondary};
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

// Valorant-style success checkmark SVG
const CheckmarkSVG = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M5 12L10 17L19 8" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

// Error X mark SVG
const ErrorSVG = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M6 6L18 18M6 18L18 6" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

// Warning exclamation mark SVG
const WarningSVG = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M12 9V14M12 17.5V18" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

// Info icon SVG
const InfoSVG = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path 
      d="M12 16V12M12 8H12.01" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

const IconByType = {
  success: CheckmarkSVG,
  error: ErrorSVG,
  warning: WarningSVG,
  info: InfoSVG
};

const Toast: React.FC<ToastProps> = ({ 
  message, 
  duration = 3000, 
  visible, 
  onClose,
  type = 'success'
}) => {
  const [isVisible, setIsVisible] = useState(visible);
  const Icon = IconByType[type];

  useEffect(() => {
    setIsVisible(visible);
    
    if (visible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for fade out animation
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  return isVisible ? (
    <ToastContainer isVisible={isVisible} type={type}>
      <ToastIcon type={type}>
        <Icon />
      </ToastIcon>
      <ToastMessage>{message}</ToastMessage>
    </ToastContainer>
  ) : null;
};

export default Toast; 