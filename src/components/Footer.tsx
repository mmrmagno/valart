import React from 'react';
import styled from 'styled-components';

const FooterContainer = styled.footer`
  padding: 30px 0;
  background-color: ${props => props.theme.colors.secondary};
  margin-top: 60px;
  border-top: 3px solid ${props => props.theme.colors.primary};
  position: relative;
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 1px;
    background: linear-gradient(90deg, transparent, ${props => props.theme.colors.primary}, transparent);
    opacity: 0.3;
  }
`;

const FooterContent = styled.div`
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Logo = styled.div`
  font-family: ${props => props.theme.fonts.main};
  font-size: 2.5rem;
  color: ${props => props.theme.colors.primary};
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: bold;
  margin-bottom: 20px;
  text-shadow: 0 0 10px rgba(255, 70, 85, 0.3);
`;

const FooterText = styled.p`
  color: ${props => props.theme.colors.tertiary};
  text-align: center;
  margin-bottom: 25px;
  max-width: 600px;
  font-size: 0.95rem;
  line-height: 1.6;
`;

const FooterLinks = styled.div`
  display: flex;
  gap: 30px;
  margin-bottom: 30px;
`;

const FooterLink = styled.a`
  color: ${props => props.theme.colors.primary};
  text-decoration: none;
  font-weight: 600;
  position: relative;
  
  &:after {
    content: '';
    position: absolute;
    bottom: -3px;
    left: 0;
    width: 100%;
    height: 2px;
    background-color: ${props => props.theme.colors.primary};
    transform: scaleX(0);
    transition: transform 0.3s ease;
    transform-origin: center;
  }
  
  &:hover {
    color: ${props => props.theme.colors.primary};
  }
  
  &:hover:after {
    transform: scaleX(1);
  }
`;

const CreatorBadge = styled.div`
  margin-top: 20px;
  font-size: 0.9rem;
  color: ${props => props.theme.colors.tertiary};
  display: flex;
  align-items: center;
  gap: 8px;
  
  a {
    color: ${props => props.theme.colors.primary};
    text-decoration: none;
    font-weight: 600;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const Footer: React.FC = () => {
  return (
    <FooterContainer>
      <FooterContent>
        <Logo>VALART</Logo>
        <FooterText>
          Create, share, and explore ASCII art inspired by Valorant.
          Express your creativity with our easy-to-use drawing tool.
        </FooterText>
        <FooterLinks>
          <FooterLink href="https://github.com/mmrmagno" target="_blank" rel="noopener noreferrer">
            GitHub
          </FooterLink>
          <FooterLink href="https://marc-os.com" target="_blank" rel="noopener noreferrer">
            Marc's Website
          </FooterLink>
        </FooterLinks>
        <CreatorBadge>
          Created with ♥ by <a href="https://marc-os.com" target="_blank" rel="noopener noreferrer">Marc Magno</a> © {new Date().getFullYear()}
        </CreatorBadge>
      </FooterContent>
    </FooterContainer>
  );
};

export default Footer; 