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

interface Theme {
  colors: {
    primary: string;
    tertiary: string;
  };
  borderRadius: string;
  transition: string;
}

interface StyledProps {
  theme: Theme;
}

interface PageButtonProps extends StyledProps {
  active?: boolean;
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

// Add new styled components for pagination
const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 40px;
  gap: 10px;
`;

const PageButton = styled.button<PageButtonProps>`
  background-color: ${(props: PageButtonProps) => props.active ? props.theme.colors.primary : 'transparent'};
  color: ${(props: StyledProps) => props.theme.colors.tertiary};
  border: 2px solid ${(props: StyledProps) => props.theme.colors.primary};
  padding: 8px 16px;
  border-radius: ${(props: StyledProps) => props.theme.borderRadius};
  cursor: pointer;
  transition: ${(props: StyledProps) => props.theme.transition};
  font-weight: ${(props: PageButtonProps) => props.active ? 'bold' : 'normal'};

  &:hover {
    background-color: ${(props: StyledProps) => props.theme.colors.primary};
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const PageInfo = styled.span`
  color: ${props => props.theme.colors.tertiary};
  margin: 0 10px;
`;

// Default ASCII art examples with improved designs
const defaultAsciiArts: AsciiArt[] = [
  {
    id: '1',
    art: 
`────────────████████────── 
───────────██████████───── 
──────────█▄▄▄████▄▄▄█──── 
─────────█▀▀▀████▀▀▀█───── 
─────────█▄▄▄████▄▄▄█───── 
──────────██████████────── 
───────────████████─────── 
────────────██████──────── 
─────────────████───────── 
──────────────██──────────`,
    author: 'VALORANT',
    createdAt: '2024-01-01T00:00:00.000Z',
    gridSize: {
      width: 30,
      height: 10
    }
  },
  {
    id: '2',
    art: 
`░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░█░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░█░░░░░░░░░
░░░░░░░░░░█░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░`,
    author: 'Test User',
    createdAt: '2024-01-02T00:00:00.000Z',
    gridSize: {
      width: 26,
      height: 7
    }
  },
  {
    id: '3',
    art: 
`░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░`,
    author: 'Another User',
    createdAt: '2024-01-03T00:00:00.000Z',
    gridSize: {
      width: 26,
      height: 7
    }
  },
  {
    id: '4',
    art: 
`░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░`,
    author: 'Yet Another User',
    createdAt: '2024-01-04T00:00:00.000Z',
    gridSize: {
      width: 26,
      height: 7
    }
  }
];

const HomePage: React.FC = () => {
  const [asciiArts, setAsciiArts] = useState<AsciiArt[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchGallery = async () => {
      try {
        setLoading(true);
        const { items, totalPages: pages } = await loadGallery(currentPage);
        
        // Combine default arts with gallery data
        const combinedArts = [...defaultAsciiArts];
        
        // Add gallery items that don't already exist in default arts
        items.forEach((galleryItem: AsciiArt) => {
          const isDuplicate = combinedArts.some((defaultItem: AsciiArt) => 
            defaultItem.art === galleryItem.art && 
            defaultItem.author === galleryItem.author
          );
          
          if (!isDuplicate) {
            combinedArts.push({
              ...galleryItem,
              id: galleryItem.id || Math.random().toString(36).substr(2, 9)
            });
          }
        });

        setAsciiArts(combinedArts);
        setTotalPages(pages);
      } catch (error) {
        console.error('Error loading gallery:', error);
        setAsciiArts(defaultAsciiArts);
      } finally {
        setLoading(false);
      }
    };

    fetchGallery();
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
          <>
            <GalleryGrid>
              {asciiArts.map((art) => (
                <AsciiArtCard key={art.id} art={art} />
              ))}
            </GalleryGrid>
            {totalPages > 1 && (
              <PaginationContainer>
                <PageButton 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </PageButton>
                <PageInfo>
                  Page {currentPage} of {totalPages}
                </PageInfo>
                <PageButton 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </PageButton>
              </PaginationContainer>
            )}
          </>
        )}
      </GallerySection>
    </PageContainer>
  );
};

export default HomePage; 