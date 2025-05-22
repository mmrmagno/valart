import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useNavigate } from 'react-router-dom';

const glitch = keyframes`
  0% {
    transform: translate(0);
    text-shadow: 0 0 10px #ff4655;
  }
  20% {
    transform: translate(-2px, 2px);
    text-shadow: 2px 2px 10px #ff4655;
  }
  40% {
    transform: translate(-2px, -2px);
    text-shadow: 2px -2px 10px #ff4655;
  }
  60% {
    transform: translate(2px, 2px);
    text-shadow: -2px 2px 10px #ff4655;
  }
  80% {
    transform: translate(2px, -2px);
    text-shadow: -2px -2px 10px #ff4655;
  }
  100% {
    transform: translate(0);
    text-shadow: 0 0 10px #ff4655;
  }
`;

const NotFoundContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: #0f1923;
  color: #ece8e1;
  text-align: center;
  padding: 20px;
  font-family: 'DIN Next LT Pro', 'Arial', sans-serif;
`;

const ErrorCode = styled.h1`
  font-size: 150px;
  margin: 0;
  color: #ff4655;
  font-weight: 800;
  letter-spacing: -5px;
  animation: ${glitch} 2s infinite;
  text-transform: uppercase;
`;

const Message = styled.h2`
  font-size: 24px;
  margin: 20px 0;
  color: #ece8e1;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const SubMessage = styled.p`
  font-size: 18px;
  color: #8b978f;
  margin: 10px 0;
  max-width: 600px;
`;

const HomeButton = styled.button`
  padding: 15px 30px;
  font-size: 18px;
  background: #ff4655;
  border: none;
  color: #ece8e1;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 1px;
  margin-top: 40px;
  position: relative;
  overflow: hidden;

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
  }

  &:hover {
    background: #ff2d3f;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(255, 70, 85, 0.3);

    &:before {
      left: 100%;
    }
  }
`;

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <NotFoundContainer>
      <ErrorCode>404</ErrorCode>
      <Message>AGENT NOT FOUND</Message>
      <SubMessage>
        The coordinates you're looking for don't exist in our database. 
        Return to base and try a different approach.
      </SubMessage>
      <HomeButton onClick={() => navigate('/')}>
        Return to Base
      </HomeButton>
    </NotFoundContainer>
  );
};

export default NotFoundPage; 