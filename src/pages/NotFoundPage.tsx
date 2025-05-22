import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';

const float = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
  100% { transform: translateY(0px); }
`;

const NotFoundContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  color: white;
  text-align: center;
  padding: 20px;
`;

const ErrorCode = styled.h1`
  font-size: 120px;
  margin: 0;
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ${float} 3s ease-in-out infinite;
`;

const Message = styled.h2`
  font-size: 24px;
  margin: 20px 0;
  color: #e0e0e0;
`;

const HomeButton = styled.button`
  padding: 12px 24px;
  font-size: 18px;
  background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
  border: none;
  border-radius: 25px;
  color: white;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  margin-top: 30px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  }
`;

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <NotFoundContainer>
      <ErrorCode>404</ErrorCode>
      <Message>Oops! Looks like you've ventured into the void.</Message>
      <Message>Don't worry, even the best artists sometimes miss the canvas.</Message>
      <HomeButton onClick={() => navigate('/')}>
        Return to Gallery
      </HomeButton>
    </NotFoundContainer>
  );
};

export default NotFoundPage; 