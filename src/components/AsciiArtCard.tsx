// @ts-nocheck
import React from 'react';
import styled from 'styled-components';

// Types
interface AsciiArt {
  id: string;
  art: string;
  author: string;
  createdAt: string;
  gridSize: {
    width: number;
    height: number;
  };
}

interface AsciiArtCardProps {
  art: AsciiArt;
}

// Styled components
const Card = styled.div`
  background-color: ${props => props.theme.colors.cardBg};
  border: 1px solid #333;
  border-radius: ${props => props.theme.borderRadius};
  padding: 25px;
  transition: ${props => props.theme.transition};
  position: relative;
  overflow: hidden;
  animation: fadeIn 0.5s ease;
  clip-path: polygon(0 0, 100% 0, 100% 92%, 92% 100%, 0 100%); /* Valorant-style angle */
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 5px;
    height: 100%;
    background-color: ${props => props.theme.colors.primary};
  }
  
  &:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 20px rgba(0, 0, 0, 0.3);
  }
`;

const ArtDisplay = styled.pre`
  background-color: ${props => props.theme.colors.secondary};
  padding: 20px;
  border-radius: ${props => props.theme.borderRadius};
  font-family: ${props => props.theme.fonts.mono};
  white-space: pre;
  overflow-x: auto;
  color: ${props => props.theme.colors.text};
  line-height: 1;
  border: 1px solid #444;
  margin-bottom: 20px;
  text-align: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
`;

const ArtInfo = styled.div`
  margin-top: 15px;
`;

const ArtTitle = styled.h3`
  color: ${props => props.theme.colors.primary};
  font-size: 1.4rem;
  margin-bottom: 15px;
  font-family: ${props => props.theme.fonts.main};
  letter-spacing: 1px;
`;

const AuthorInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 15px;
  font-size: 0.9rem;
  color: #aaa;
`;

const AuthorName = styled.span`
  color: ${props => props.theme.colors.tertiary};
  font-weight: 500;
`;

const DateInfo = styled.span`
  color: #888;
  font-size: 0.85rem;
`;

const Button = styled.button`
  background-color: ${props => props.theme.colors.primary};
  color: white;
  border: none;
  padding: 10px 18px;
  border-radius: ${props => props.theme.borderRadius};
  cursor: pointer;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  transition: ${props => props.theme.transition};
  clip-path: polygon(0 0, 100% 0, 100% 85%, 85% 100%, 0 100%); /* Valorant-style angle */
  
  &:hover {
    background-color: #ff5c69;
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const GridSize = styled.div`
  color: #888;
  font-size: 0.85rem;
  margin-top: 10px;
  font-style: italic;
`;

const CopyIcon: React.FC = () => (
  <svg 
    width="14" 
    height="14" 
    viewBox="0 0 24 24"
    fill="none"
    style={{ marginRight: '6px' }}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8 4V16C8 16.5304 8.21071 17.0391 8.58579 17.4142C8.96086 17.7893 9.46957 18 10 18H18C18.5304 18 19.0391 17.7893 19.4142 17.4142C19.7893 17.0391 20 16.5304 20 16V7.242C20 6.97556 19.9467 6.71181 19.8433 6.46624C19.7399 6.22068 19.5885 5.99824 19.398 5.812L16.188 2.602C16.0018 2.41148 15.7793 2.26012 15.5338 2.15672C15.2882 2.05333 15.0244 2 14.758 2H10C9.46957 2 8.96086 2.21071 8.58579 2.58579C8.21071 2.96086 8 3.46957 8 4Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16 18V20C16 20.5304 15.7893 21.0391 15.4142 21.4142C15.0391 21.7893 14.5304 22 14 22H6C5.46957 22 4.96086 21.7893 4.58579 21.4142C4.21071 21.0391 4 20.5304 4 20V8C4 7.46957 4.21071 6.96086 4.58579 6.58579C4.96086 6.21071 5.46957 6 6 6H8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const AsciiArtCard: React.FC<AsciiArtCardProps> = ({ art }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(art.art);
    // No alert to avoid interruption
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Generate a random name for the art based on the author
  const getArtName = () => {
    const names = [
      `${art.author}'s Masterpiece`,
      `${art.author}'s Design`,
      `Created by ${art.author}`,
      `${art.author}'s Art`
    ];
    // Use the art id to consistently pick the same name
    const index = parseInt(art.id) % names.length;
    return names[index];
  };

  return (
    <Card>
      <ArtTitle>{getArtName()}</ArtTitle>
      <ArtDisplay>{art.art}</ArtDisplay>
      <ArtInfo>
        <Button onClick={handleCopy}>
          <CopyIcon />
          Copy to Clipboard
        </Button>
        <AuthorInfo>
          <AuthorName>By: {art.author}</AuthorName>
          <DateInfo>{formatDate(art.createdAt)}</DateInfo>
        </AuthorInfo>
        <GridSize>Grid size: {art.gridSize.width} x {art.gridSize.height}</GridSize>
      </ArtInfo>
    </Card>
  );
};

export default AsciiArtCard; 