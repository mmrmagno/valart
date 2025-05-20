import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

async function loadGallery(page = 1) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/gallery`, {
      params: { page }
    });
    return response.data;
  } catch (error) {
    console.error('Error loading gallery:', error);
    return { items: [], total: 0, totalPages: 0, currentPage: 1 };
  }
}

export { loadGallery }; 