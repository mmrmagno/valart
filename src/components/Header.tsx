import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';

// Logo SVG component
const LogoSVG = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 32 32" 
    style={{ marginRight: '10px' }}
  >
    <path d="M6 6 L16 26 L26 6" stroke="currentColor" strokeWidth="4" strokeLinejoin="bevel" fill="none" />
    <path d="M10 6 L16 18 L22 6" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <line x1="6" y1="6" x2="26" y2="6" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const HeaderContainer = styled.header`
  background-color: ${props => props.theme.colors.secondary};
  padding: 15px 0;
  border-bottom: 3px solid ${props => props.theme.colors.primary};
  position: relative;

  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 1px;
    background: linear-gradient(90deg, transparent, ${props => props.theme.colors.primary}, transparent);
    opacity: 0.5;
  }
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 20px;
`;

const Logo = styled(Link)`
  font-family: ${props => props.theme.fonts.main};
  font-size: 3rem;
  color: ${props => props.theme.colors.primary};
  text-transform: uppercase;
  letter-spacing: 2px;
  font-weight: bold;
  text-decoration: none;
  text-shadow: 0 0 10px rgba(255, 70, 85, 0.3);
  position: relative;
  transition: ${props => props.theme.transition};
  display: flex;
  align-items: center;
  
  &:hover {
    color: ${props => props.theme.colors.primary};
    transform: scale(1.03);
  }
  
  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: ${props => props.theme.colors.primary};
    transform: scaleX(0.7);
    transform-origin: center;
    transition: transform 0.3s ease;
  }
  
  &:hover:after {
    transform: scaleX(1);
  }
`;

const Nav = styled.nav`
  display: flex;
  gap: 25px;
`;

const NavLink = styled(Link)<{ active: boolean }>`
  font-family: ${props => props.theme.fonts.secondary};
  color: ${props => props.active ? props.theme.colors.primary : props.theme.colors.text};
  text-transform: uppercase;
  font-weight: 500;
  letter-spacing: 1.5px;
  padding: 5px 0;
  transition: ${props => props.theme.transition};
  position: relative;
  text-decoration: none;
  
  &:after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: ${props => props.theme.colors.primary};
    transform: scaleX(${props => props.active ? '1' : '0'});
    transform-origin: center;
    transition: transform 0.3s ease;
  }
  
  &:hover {
    color: ${props => props.theme.colors.primary};
  }
  
  &:hover:after {
    transform: scaleX(1);
  }
`;

const Header: React.FC = () => {
  const location = useLocation();
  
  return (
    <HeaderContainer>
      <HeaderContent>
        <Logo to="/">
          <LogoSVG />
          VALART
        </Logo>
        <Nav>
          <NavLink to="/" active={location.pathname === '/'}>Gallery</NavLink>
          <NavLink to="/create" active={location.pathname === '/create'}>Create</NavLink>
        </Nav>
      </HeaderContent>
    </HeaderContainer>
  );
};

export default Header; 