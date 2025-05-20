import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

async function loadGallery() {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/gallery`);
    return response.data;
  } catch (error) {
    console.error('Error loading gallery:', error);
    return [];
  }
}

export { loadGallery }; 