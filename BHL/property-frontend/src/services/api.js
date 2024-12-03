import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const propertyService = {
  getAllExtractions: async () => {
    try {
      const response = await api.get('/extractions');
      return response.data.extractions;
    } catch (error) {
      throw new Error('데이터를 불러오는데 실패했습니다.');
    }
  },
};

export default api; 