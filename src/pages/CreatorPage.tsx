// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import api from '../utils/api';
import Toast from '../components/Toast';

// Types
type GridSize = {
  width: number;
  height: number;
};

type GridMode = 'FHD' | 'Stretched';
type DrawingMode = 'Click' | 'Drag';

// Styled components
const PageContainer = styled.div`
  padding: 30px 0;
  animation: fadeIn 0.5s ease;
`;

const Title = styled.h1`
  font-size: 4rem;
  margin-bottom: 30px;
  color: ${props => props.theme.colors.primary};
  text-align: center;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
  letter-spacing: 2px;
`;

const CreatorSection = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  margin: 0 auto;
  background-color: ${props => props.theme.colors.secondary};
  padding: 30px;
  border-radius: ${props => props.theme.borderRadius};
  box-shadow: ${props => props.theme.boxShadow};
  border-left: 4px solid ${props => props.theme.colors.primary};
  animation: slideUp 0.5s ease;
`;

const ControlPanel = styled.div`
  margin-bottom: 30px;
  padding: 20px;
  background-color: ${props => props.theme.colors.controlBg};
  border-radius: ${props => props.theme.borderRadius};
`;

const ControlGroup = styled.div`
  margin-bottom: 25px;
`;

const ControlLabel = styled.div`
  font-size: 1.2rem;
  font-weight: 500;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  color: ${props => props.theme.colors.tertiary};
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: ${props => props.theme.fonts.main};
`;

const RadioGroup = styled.div`
  display: flex;
  gap: 20px;
  align-items: center;
`;

const RadioOption = styled.label`
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 5px 0;
  
  span {
    font-family: ${props => props.theme.fonts.secondary};
    margin-left: 8px;
    text-transform: uppercase;
    font-size: 0.9rem;
    letter-spacing: 0.5px;
  }
`;

const SliderContainer = styled.div`
  margin-top: 15px;
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  position: relative;
  height: 60px;
`;

// Add a proper interface for the SliderTrack props
interface SliderTrackProps {
  value: number;
  theme: any;
}

const SliderTrack = styled.div<SliderTrackProps>`
  position: relative;
  height: 8px;
  background: #1f2731;
  border-radius: 4px;
  margin: 0 5px;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
  
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: ${props => props.value === 13 ? '100%' : `${((props.value - 1) / (13 - 1)) * 100}%`};
    background: linear-gradient(90deg, ${props => props.theme.colors.primary}, #ff7280);
    border-radius: 4px;
    z-index: 1;
  }
`;

const StyledRangeInput = styled.input`
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 8px;
  background: transparent;
  margin: 10px 0;
  position: relative;
  z-index: 2;
  position: absolute;
  top: 0;
  left: 0;
  
  &:focus {
    outline: none;
  }
  
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${props => props.theme.colors.primary};
    cursor: pointer;
    border: 2px solid #fff;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
    position: relative;
    z-index: 3;
    
    &:hover {
      transform: scale(1.1);
      background: #ff5c69;
    }
  }
  
  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${props => props.theme.colors.primary};
    cursor: pointer;
    border: 2px solid #fff;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    transition: all 0.2s ease;
    position: relative;
    z-index: 3;
    
    &:hover {
      transform: scale(1.1);
      background: #ff5c69;
    }
  }
`;

const SliderValue = styled.div`
  font-size: 1.1rem;
  margin-top: 12px;
  color: ${props => props.theme.colors.primary};
  font-weight: bold;
  text-align: center;
  background: rgba(0, 0, 0, 0.15);
  padding: 5px 12px;
  border-radius: 12px;
  display: inline-block;
  margin-left: auto;
  margin-right: auto;
  position: relative;
  min-width: 40px;
  
  &:after {
    content: '';
    position: absolute;
    top: -5px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-bottom: 5px solid rgba(0, 0, 0, 0.15);
  }
`;

const SliderTicks = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 8px 5px 0;
`;

const SliderTick = styled.div`
  width: 1px;
  height: 6px;
  background-color: ${props => props.active ? props.theme.colors.primary : '#555'};
  position: relative;
  
  &:after {
    content: '${props => props.value}';
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 0.65rem;
    color: ${props => props.active ? props.theme.colors.primary : '#777'};
    display: ${props => props.showLabel ? 'block' : 'none'};
  }
`;

const GridContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 30px;
  overflow-x: auto;
  padding: 30px 0;
  background-color: ${props => props.theme.colors.background};
  border-radius: ${props => props.theme.borderRadius};
`;

const Grid = styled.div<{ width: number; height: number }>`
  display: grid;
  grid-template-columns: repeat(${props => props.width}, 1fr);
  grid-template-rows: repeat(${props => props.height}, 1fr);
  gap: 1px;
  background-color: ${props => props.theme.colors.gridLine};
  border: 1px solid ${props => props.theme.colors.primary};
  box-shadow: 0 0 15px rgba(255, 70, 85, 0.2);
`;

const Cell = styled.div<{ filled: boolean }>`
  width: 25px;
  height: 25px;
  background-color: ${props => props.filled 
    ? props.theme.colors.gridCell 
    : props.theme.colors.gridBg};
  cursor: pointer;
  transition: background-color 0.1s ease;
  
  &:hover {
    background-color: ${props => props.filled 
      ? props.theme.colors.lightGridCell 
      : 'rgba(255, 70, 85, 0.3)'};
  }
`;

const ButtonBar = styled.div`
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
`;

const ActionButton = styled.button`
  background-color: ${props => props.theme.colors.buttonBg};
  color: ${props => props.theme.colors.buttonText};
  padding: 12px 25px;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  border-radius: ${props => props.theme.borderRadius};
  transition: ${props => props.theme.transition};
  text-transform: uppercase;
  letter-spacing: 1px;
  
  &:hover {
    background-color: #ff5c69;
    transform: translateY(-2px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const ResetButton = styled(ActionButton)`
  background-color: #333;
  
  &:hover {
    background-color: #555;
  }
`;

const AsciiOutput = styled.pre`
  background-color: #0a141b;
  padding: 20px;
  border-radius: ${props => props.theme.borderRadius};
  font-family: ${props => props.theme.fonts.mono};
  white-space: pre;
  overflow-x: auto;
  margin-top: 30px;
  color: ${props => props.theme.colors.text};
  line-height: 1;
  border: 1px solid ${props => props.theme.colors.primary};
  text-align: center;
`;

const PublishForm = styled.div`
  margin-top: 30px;
  padding-top: 30px;
  border-top: 1px solid ${props => props.theme.colors.primary};
`;

const PublishTitle = styled.h3`
  font-size: 1.8rem;
  margin-bottom: 20px;
  color: ${props => props.theme.colors.primary};
  text-transform: uppercase;
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: ${props => props.theme.colors.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-size: 0.9rem;
`;

const FormDescription = styled.div`
  color: #999;
  font-size: 0.8rem;
  margin-top: 6px;
  font-style: italic;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  background-color: #0a141b;
  border: 1px solid #3f3f3f;
  color: ${props => props.theme.colors.text};
  border-radius: ${props => props.theme.borderRadius};
  
  &:focus {
    border-color: ${props => props.theme.colors.primary};
    outline: none;
  }
  
  &[type="email"] {
    border-left: 3px solid ${props => props.theme.colors.tertiary};
  }
`;

const SubmitButton = styled(ActionButton)`
  margin-top: 10px;
`;

const CreatorPage: React.FC = () => {
  // State for grid configuration
  const [resolution, setResolution] = useState<GridMode>('FHD');
  const [height, setHeight] = useState<number>(7);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>('Click');
  
  // Grid state
  const [gridSize, setGridSize] = useState<GridSize>({ width: 26, height: 7 });
  const [filledCells, setFilledCells] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  // Form state
  const [authorName, setAuthorName] = useState<string>('');
  const [creationName, setCreationName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [asciiOutput, setAsciiOutput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<string>('');
  
  // Toast state
  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('success');
  
  // Refs
  const gridRef = useRef<HTMLDivElement>(null);
  
  // Update grid size when resolution or height changes
  useEffect(() => {
    const width = resolution === 'FHD' ? 26 : 27;
    const newGridSize = { width, height };
    setGridSize(newGridSize);
    
    // Preserve existing art within new dimensions
    const newFilledCells = new Set<string>();
    filledCells.forEach(cellKey => {
      const [row, col] = cellKey.split('-').map(Number);
      if (row < height && col < width) {
        newFilledCells.add(cellKey);
      }
    });
    setFilledCells(newFilledCells);
  }, [resolution, height]);

  // Update ASCII output whenever filled cells change
  useEffect(() => {
    generateAsciiArt();
  }, [filledCells, gridSize]);

  // Handle cell click
  const handleCellClick = (row: number, col: number) => {
    const cellKey = `${row}-${col}`;
    const newFilledCells = new Set(filledCells);
    
    if (filledCells.has(cellKey)) {
      newFilledCells.delete(cellKey);
    } else {
      newFilledCells.add(cellKey);
    }
    
    setFilledCells(newFilledCells);
  };

  // Handle mouse events for drag mode
  const handleMouseDown = (row: number, col: number) => {
    if (drawingMode === 'Drag') {
      setIsDragging(true);
      handleCellClick(row, col);
    }
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (isDragging && drawingMode === 'Drag') {
      handleCellClick(row, col);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Reset grid
  const handleReset = () => {
    setFilledCells(new Set());
  };

  // Generate ASCII art from filled cells
  const generateAsciiArt = () => {
    let art = '';
    
    for (let row = 0; row < gridSize.height; row++) {
      let rowStr = '';
      for (let col = 0; col < gridSize.width; col++) {
        rowStr += filledCells.has(`${row}-${col}`) ? '█' : '░';
      }
      // Don't trim spaces - we want to preserve the exact grid
      art += rowStr + '\n';
    }
    
    // Remove trailing newline
    art = art.replace(/\n$/, '');
    setAsciiOutput(art);
  };

  // Show toast notification
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);
  };

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(asciiOutput);
    showToast('Copied to clipboard!', 'success');
  };

  // Download ASCII art
  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([asciiOutput], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'ascii-art.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('Downloaded successfully!', 'success');
  };

  // Publish ASCII art
  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authorName.trim()) {
      showToast('Please enter your name', 'warning');
      return;
    }
    
    if (!creationName.trim()) {
      showToast('Please give your creation a name', 'warning');
      return;
    }
    
    if (!asciiOutput.trim()) {
      showToast('Please create some ASCII art first', 'warning');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitStatus('');
    
    try {
      const result = await api.submitArt({
        authorName,
        creationName,
        art: asciiOutput,
        gridSize,
        email: email.trim() || undefined // Only include if provided
      });
      
      setSubmitStatus('success');
      setAuthorName('');
      setCreationName('');
      setEmail('');
      
      if (email && result.emailSent) {
        showToast('Success! Your creation has been submitted. A confirmation email has been sent.', 'success');
      } else if (email && !result.emailSent) {
        showToast('Your creation was submitted, but we couldn\'t send a confirmation email. Please check your email address.', 'warning');
      } else {
        showToast('Success! Your creation has been submitted.', 'success');
      }
    } catch (error) {
      setSubmitStatus('error');
      showToast('Failed to submit your art. Please try again later.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderGrid = () => {
    const cells = [];
    
    for (let row = 0; row < gridSize.height; row++) {
      for (let col = 0; col < gridSize.width; col++) {
        const cellKey = `${row}-${col}`;
        const isFilled = filledCells.has(cellKey);
        
        cells.push(
          <Cell 
            key={cellKey}
            filled={isFilled}
            onClick={() => drawingMode === 'Click' && handleCellClick(row, col)}
            onMouseDown={() => handleMouseDown(row, col)}
            onMouseEnter={() => handleMouseEnter(row, col)}
          />
        );
      }
    }
    
    return cells;
  };

  return (
    <PageContainer>
      <Title>CREATE ASCII ART</Title>
      
      <CreatorSection>
        <ControlPanel>
          <ControlGroup>
            <ControlLabel>Resolution</ControlLabel>
            <RadioGroup>
              <RadioOption>
                <input 
                  type="radio" 
                  id="fhd" 
                  name="resolution" 
                  checked={resolution === 'FHD'} 
                  onChange={() => setResolution('FHD')} 
                />
                <span>Full HD</span>
              </RadioOption>
              <RadioOption>
                <input 
                  type="radio" 
                  id="stretched" 
                  name="resolution" 
                  checked={resolution === 'Stretched'} 
                  onChange={() => setResolution('Stretched')} 
                />
                <span>Stretched</span>
              </RadioOption>
            </RadioGroup>
          </ControlGroup>
          
          <ControlGroup>
            <ControlLabel>Height (1-13 default: 7)</ControlLabel>
            <SliderContainer>
              <SliderTrack value={height}>
                <StyledRangeInput 
                  type="range" 
                  min="1" 
                  max="13" 
                  value={height} 
                  onChange={(e) => setHeight(parseInt(e.target.value))} 
                />
              </SliderTrack>
              <SliderTicks>
                {[1, 3, 5, 7, 9, 11, 13].map(tick => (
                  <SliderTick 
                    key={tick} 
                    value={tick} 
                    active={height >= tick}
                    showLabel={true}
                  />
                ))}
              </SliderTicks>
              <SliderValue>{height}</SliderValue>
            </SliderContainer>
          </ControlGroup>
          
          <ControlGroup>
            <ControlLabel>Drawing mode</ControlLabel>
            <RadioGroup>
              <RadioOption>
                <input 
                  type="radio" 
                  id="click" 
                  name="drawingMode" 
                  checked={drawingMode === 'Click'} 
                  onChange={() => setDrawingMode('Click')} 
                />
                <span>Click</span>
              </RadioOption>
              <RadioOption>
                <input 
                  type="radio" 
                  id="drag" 
                  name="drawingMode" 
                  checked={drawingMode === 'Drag'} 
                  onChange={() => setDrawingMode('Drag')} 
                />
                <span>Drag</span>
              </RadioOption>
            </RadioGroup>
          </ControlGroup>
        </ControlPanel>
        
        <GridContainer 
          onMouseUp={handleMouseUp} 
          onMouseLeave={handleMouseUp}
        >
          <Grid 
            ref={gridRef}
            width={gridSize.width} 
            height={gridSize.height}
          >
            {renderGrid()}
          </Grid>
        </GridContainer>
        
        <ButtonBar>
          <ActionButton onClick={handleCopy}>Copy</ActionButton>
          <ActionButton onClick={handleDownload}>Download</ActionButton>
          <ResetButton onClick={handleReset}>Reset</ResetButton>
        </ButtonBar>
        
        {asciiOutput && (
          <AsciiOutput>{asciiOutput}</AsciiOutput>
        )}
        
        <PublishForm>
          <PublishTitle>Submit Your Creation</PublishTitle>
          <form onSubmit={handlePublish}>
            <FormGroup>
              <Label htmlFor="creationName">Creation Name</Label>
              <Input 
                type="text" 
                id="creationName" 
                value={creationName} 
                onChange={(e) => setCreationName(e.target.value)} 
                placeholder="Name your ASCII art creation" 
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="authorName">Your Name</Label>
              <Input 
                type="text" 
                id="authorName" 
                value={authorName} 
                onChange={(e) => setAuthorName(e.target.value)} 
                placeholder="Enter your name or nickname" 
              />
            </FormGroup>
            <FormGroup>
              <Label htmlFor="email">Email</Label>
              <FormDescription>We'll send you a confirmation when your creation is approved. Email is optional.</FormDescription>
              <Input 
                type="email" 
                id="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Enter your email" 
              />
            </FormGroup>
            <SubmitButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit for Publication'}
            </SubmitButton>
          </form>
        </PublishForm>
      </CreatorSection>
      
      <Toast 
        message={toastMessage}
        visible={toastVisible}
        onClose={() => setToastVisible(false)}
        type={toastType}
      />
    </PageContainer>
  );
};

export default CreatorPage; 