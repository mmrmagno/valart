// @ts-nocheck
import axios from 'axios';

// Types
interface SubmissionData {
  authorName: string;
  creationName: string;
  art: string;
  gridSize: {
    width: number;
    height: number;
  };
  email?: string;
}

// Get API URL from environment variable
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

// Only show warning in development
if (process.env.NODE_ENV === 'development' && !API_BASE_URL) {
  console.warn('REACT_APP_API_URL is not defined in environment variables');
}

const api = {
  /**
   * Submit ASCII art for publication
   * @param data The submission data including author name, creation name, art, and grid size
   * @returns A promise with the server response
   */
  submitArt: async (data: SubmissionData) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/submit`, {
        authorName: data.authorName,
        creationName: data.creationName,
        art: data.art,
        gridSize: data.gridSize,
        authorEmail: data.email
      });
      
      return {
        success: true,
        message: "Art submitted successfully!",
        emailSent: !!data.email,
        data: {
          id: Math.random().toString(36).substr(2, 9),
          ...data,
          createdAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error submitting art:', error);
      throw error;
    }
  }
};

export default api; 