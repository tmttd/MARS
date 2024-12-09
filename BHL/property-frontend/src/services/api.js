import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8003';

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
      if (!response.data || !response.data.extractions) {
        throw new Error('Invalid response format');
      }
      const extractions = response.data.extractions.map(item => ({
        job_id: item.job_id,
        ...item.extraction
      }));
      return extractions;
    } catch (error) {
      console.error('API Error details:', error.response || error);
      throw new Error(error.response?.data?.detail || '데이터를 불러오는데 실패했습니다.');
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

export const callService = {
  getAllCalls: async () => {
    try {
      const response = await api.get('/calls');
      console.log('API Response:', response.data);
      
      if (!response.data || !response.data.calls) {
        throw new Error('Invalid response format');
      }
      
      const calls = response.data.calls.map(item => {
        if (!item.summarization?.extraction) {
          console.warn('Invalid call data format:', item);
          return null;
        }
        
        const extraction = item.summarization.extraction;
        return {
          job_id: item.job_id,
          created_at: item.created_at,
          ...extraction,
          // 필드가 없는 경우 기본값 설정
          call_number: extraction.call_number || '-',
          call_datetime: extraction.call_datetime || new Date().toISOString(),
          price: extraction.price ? parseInt(extraction.price) : null
        };
      }).filter(Boolean);
      
      // 날짜순 정렬
      return calls.sort((a, b) => 
        new Date(b.call_datetime) - new Date(a.call_datetime)
      );
    } catch (error) {
      console.error('API Error details:', error.response || error);
      throw new Error('통화 기록을 불러오는데 실패했습니다.');
    }
  },
  
  updateCall: async (jobId, data) => {
    try {
      const response = await api.put(`/calls/${jobId}`, data);
      return response.data;
    } catch (error) {
      console.error('Update Error:', error);
      throw new Error('통화 기록 업데이트에 실패했습니다.');
    }
  }
};

export default api; 