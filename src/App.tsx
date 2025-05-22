import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import CreatorPage from './pages/CreatorPage';
import NotFoundPage from './pages/NotFoundPage';
import { ThemeProvider } from 'styled-components';
import { valorantTheme } from './styles/theme';

const App: React.FC = () => {
  return (
    <ThemeProvider theme={valorantTheme}>
      <div className="app-container">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/create" element={<CreatorPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </ThemeProvider>
  );
};

export default App; 