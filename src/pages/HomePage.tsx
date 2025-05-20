import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import AsciiArtCard from '../components/AsciiArtCard';
import { Link } from 'react-router-dom';
import { loadGallery } from '../utils/galleryLoader';

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

// Valorant-style V SVG for background element
const ValSVG = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="600" 
    height="600" 
    viewBox="0 0 32 32"
    style={{ 
      position: 'absolute', 
      top: '50%', 
      left: '50%', 
      transform: 'translate(-50%, -50%)', 
      opacity: 0.03,
      zIndex: -1
    }}
  >
    <path d="M6 6 L16 26 L26 6" stroke="#FF4655" strokeWidth="6" fill="none" />
  </svg>
);

// Styled components
const PageContainer = styled.div`
  padding: 30px 0;
  animation: fadeIn 0.5s ease;
  position: relative;
  overflow: hidden;
`;

const HeroSection = styled.div`
  text-align: center;
  margin-bottom: 60px;
  position: relative;
  padding: 40px 20px;
  
  &:after {
    content: '';
    position: absolute;
    bottom: -30px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 3px;
    background: ${props => props.theme.colors.primary};
  }
`;

const Title = styled.h1`
  font-size: 5rem;
  margin-bottom: 15px;
  color: ${props => props.theme.colors.primary};
  text-align: center;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  letter-spacing: 2px;
  text-transform: uppercase;
  line-height: 1;
  
  @media (max-width: 768px) {
    font-size: 3.5rem;
  }
`;

const Subtitle = styled.p`
  text-align: center;
  margin-bottom: 30px;
  font-size: 1.2rem;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  color: ${props => props.theme.colors.tertiary};
  line-height: 1.6;
`;

const CreateButton = styled(Link)`
  display: inline-block;
  background-color: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.tertiary};
  padding: 15px 40px;
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
  border-radius: ${props => props.theme.borderRadius};
  transition: ${props => props.theme.transition};
  text-decoration: none;
  margin-top: 20px;
  position: relative;
  overflow: hidden;
  box-shadow: 0 8px 16px rgba(255, 70, 85, 0.2);
  clip-path: polygon(0 0, 100% 0, 100% 85%, 85% 100%, 0 100%); /* Valorant-style angle */
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.8s ease;
  }
  
  &:hover {
    background-color: #ff5c69;
    transform: translateY(-3px);
    box-shadow: 0 12px 20px rgba(255, 70, 85, 0.3);
  }
  
  &:hover:before {
    left: 100%;
  }
  
  &:active {
    transform: translateY(-1px);
  }
`;

const GallerySection = styled.div`
  margin-top: 80px;
  position: relative;
  padding: 0 20px;
`;

const GalleryHeader = styled.h2`
  font-size: 3rem;
  margin-bottom: 40px;
  color: ${props => props.theme.colors.tertiary};
  text-align: center;
  text-transform: uppercase;
  position: relative;
  
  &:after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 3px;
    background: ${props => props.theme.colors.primary};
  }
  
  @media (max-width: 768px) {
    font-size: 2.5rem;
  }
`;

const GalleryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 30px;
  margin-top: 40px;
  animation: slideUp 0.5s ease;
  max-width: 1440px;
  margin-left: auto;
  margin-right: auto;
`;

const LoadingText = styled.p`
  text-align: center;
  font-size: 1.2rem;
  padding: 80px 0;
  color: ${props => props.theme.colors.tertiary};
  
  &:after {
    content: '...';
    animation: loadingDots 1.5s infinite;
  }
  
  @keyframes loadingDots {
    0%, 20% { content: '.'; }
    40%, 60% { content: '..'; }
    80%, 100% { content: '...'; }
  }
`;

// Default ASCII art examples with improved designs
const defaultAsciiArts: AsciiArt[] = [
  {
    id: '1',
    art: 
`────────────████████────── 
───────────██████████───── 
──────────█▄▄▄████▄▄▄█──── 
─────▄───█░░░░░██░░░░░█─── 
─────█──░░░▓■▓░░░░▓■▓░░░── 
─────█──▐█░▓▓▓░██░▓▓▓░█▌── 
─────█──▐██░░░████░░░██▌── 
─────█──▐█▛██████████▛█▌── 
──▌▌▌▄▄──██▚████████▞██─── 
──▌▌▌▀█──████▀████▀████─── 
──▄▄▄██───████▄■■▄████──── 
──▜███▛────██████████───── 
───███──────████████──────`,
    author: 'Nerd',
    createdAt: new Date().toISOString(),
    gridSize: { width: 32, height: 13 }
  },
  {
    id: '2',
    art: 
`▒▒▒▒▒▒▒▄██████████▄▒▒▒▒▒▒
▒▒▒▒▒▒▄██████████████▄▒▒▒▒
▒▒▒▒██████████████████▒▒▒▒
▒▒▒▐███▀▀▀▀▀██▀▀▀▀▀███▌▒▒▒
▒▒▒███▒▒▌■▐▒▒▒▒▌■▐▒▒███▒▒▒
▒▒▒▐██▄▒▀▀▀▒▒▒▒▀▀▀▒▄██▌▒▒▒
▒▒▒▒▀████▒▄▄▒▒▄▄▒████▀▒▒▒▒
▒▒▒▒▒▐███▒▒▒▀▒▒▀▒▒▒███▌▒▒▒
▒▒▒▒▒▒███▒▒▒▒▒▒▒▒▒▒▒███▒▒▒
▒▒▒▒▒▒▒██▒▒▀▀▀▀▀▀▀▀▒▒██▒▒▒
▒▒▒▒▒▒▒▐██▄▒▒▒▒▒▒▒▒▄██▌▒▒▒
▒▒▒▒▒▒▒▒▀████████████▀▒▒▒▒`,
    author: 'Gorilla',
    createdAt: new Date().toISOString(),
    gridSize: { width: 28, height: 12 }
  },
  {
    id: '3',
    art: 
`░░░░█░░░░░░░█░░░░░░░░░░░░
░░░░█░█░░░░░█░█░░░░░░░░██
░░░░░█░░░░░█░░█████░░█░░
░░░█░░█░░░█░░░░░░░░░░░█░
░░░█░░█░░░█░░█░░░█░░█░░░
░░█░░░░░░█░░█░░█░░░░░█░░
░░░███░░░█░██░░█░░░░█░█░
░░░░░█░█░░█░░░█░░░░░░░░░
░░░░░░██░█░░░░█░░░░░░░░░
░░░░░░░░█░░░░█░░░░░░░░░░
░░░░░░░█░░░░░░█░░░░░░░░░
░░░░░░█░░░░░░░░█░░██░░██
░░████░░██░█░░░░░░░░░░░░
░░░░██░░██░░░░██░░██░░░░`,
    author: 'Cat',
    createdAt: new Date().toISOString(),
    gridSize: { width: 26, height: 14 }
  },
  {
    id: '4',
    art: 
`░░░░░░░░░███████░░░░░░░░
░░░░░░░░░█░░░░░░░█░░░░░░
░░░░░░░░░█░░░░░░░░░█░░░░
░░░░░░░░░█░░░███████░░░░
░░░░░░░░░█░░█░░░███░█░░░
░░░░░░░░███░░█░░░░██░█░░
░░░░░░░░█░░█░░█░░░░░░░█░
░░░░░░░░█░░█░░█░░░░░░░█░
░░░░░░░░█░░█░░░███████░░
░░░░░░░░█░░█░░░░░░░░░█░░
░░░░░░░░█░░█░░░░░░░░░█░░
░░░░░░░░█░░█░░░░░░░░░█░░
░░░░░░░░█░░█░░░░░░░░░█░░`,
    author: 'Amongus',
    createdAt: new Date().toISOString(),
    gridSize: { width: 26, height: 13 }
  }
];

const HomePage: React.FC = () => {
  const [asciiArts, setAsciiArts] = useState<AsciiArt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        const galleryData = await loadGallery();
        setAsciiArts(galleryData);
      } catch (error) {
        console.error('Error loading gallery:', error);
        setAsciiArts(defaultAsciiArts);
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, []);

  return (
    <PageContainer>
      <ValSVG />
      <HeroSection>
        <Title>VALART</Title>
        <Subtitle>
          Create and explore ASCII art inspired by Valorant. 
          Express your creativity with our easy-to-use drawing tool and share your creations with the community.
        </Subtitle>
        <CreateButton to="/create">Create Art</CreateButton>
      </HeroSection>

      <GallerySection>
        <GalleryHeader>Gallery</GalleryHeader>
        {loading ? (
          <LoadingText>Loading gallery</LoadingText>
        ) : (
          <GalleryGrid>
            {asciiArts.map((art) => (
              <AsciiArtCard key={art.id} art={art} />
            ))}
          </GalleryGrid>
        )}
      </GallerySection>
    </PageContainer>
  );
};

export default HomePage; 