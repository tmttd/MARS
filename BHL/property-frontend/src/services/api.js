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
      // 데이터 구조 변환
      const extractions = response.data.extractions.map(item => ({
        job_id: item.job_id,
        ...item.extraction
      }));
      return extractions;
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('데이터를 불러오는데 실패했습니다.');
    }
  },

  updateExtraction: async (jobId, data) => {
    try {
      const response = await api.put(`/extractions/${jobId}`, data);
      return response.data;
    } catch (error) {
      console.error('Update Error:', error);
      throw new Error('데이터 업데이트에 실패했습니다.');
    }
  },
};

export default api; 