import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8003';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const propertyService = {
  getProperties: async (limit = 10, filters = {}) => {
    try {
      const params = {
        limit,
        ...filters
      };
      const response = await api.get('/properties/', { params });
      return response.data;
    } catch (error) {
      console.error('API Error details:', error.response || error);
      throw new Error(error.response?.data?.detail || '부동산 정보를 불러오는데 실패했습니다.');
    }
  },

  getProperty: async (propertyId) => {
    try {
      const response = await api.get(`/properties/${propertyId}`);
      return response.data;
    } catch (error) {
      console.error('Get Property Error:', error);
      throw new Error('부동산 정보를 불러오는데 실패했습니다.');
    }
  },

  createProperty: async (data) => {
    try {
      const response = await api.post('/properties/', data);
      return response.data;
    } catch (error) {
      console.error('Create Property Error:', error);
      throw new Error('부동산 정보 생성에 실패했습니다.');
    }
  },

  updateProperty: async (propertyId, data) => {
    try {
      const response = await api.put(`/properties/${propertyId}`, data);
      return response.data;
    } catch (error) {
      console.error('Update Property Error:', error);
      throw new Error('부동산 정보 업데이트에 실패했습니다.');
    }
  },

  deleteProperty: async (propertyId) => {
    try {
      const response = await api.delete(`/properties/${propertyId}`);
      return response.data;
    } catch (error) {
      console.error('Delete Property Error:', error);
      throw new Error('부동산 정보 삭제에 실패했습니다.');
    }
  }
};

export const callService = {
  getCalls: async (limit = 10, filters = {}) => {
    try {
      const params = {
        limit,
        ...filters
      };
      const response = await api.get('/calls/', { params });
      const calls = response.data;

      // 연락처 포맷팅 함수
      const formatPhoneNumber = (phoneNumber) => {
        const cleaned = phoneNumber.replace(/\D/g, '');
        if (cleaned.startsWith('010')) {
          return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
        } else if (cleaned.startsWith('02')) {
          return cleaned.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
        } else {
          return cleaned.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
        }
      };

      // 각 통화 기록의 customer_contact 포맷팅
      calls.forEach(call => {
        if (call.customer_contact) {
          call.customer_contact = formatPhoneNumber(call.customer_contact);
        }
      });

      return calls;
    } catch (error) {
      console.error('API Error details:', error.response || error);
      throw new Error(error.response?.data?.detail || '통화 기록을 불러오는데 실패했습니다.');
    }
  },

  getCall: async (callId) => {
    try {
      const response = await api.get(`/calls/${callId}`);
      return response.data;
    } catch (error) {
      console.error('Get Call Error:', error);
      throw new Error('통화 기록을 불러오는데 실패했습니다.');
    }
  },

  createCall: async (data) => {
    try {
      const response = await api.post('/calls/', data);
      return response.data;
    } catch (error) {
      console.error('Create Call Error:', error);
      throw new Error('통화 기록 생성에 실패했습니다.');
    }
  },

  updateCall: async (callId, data) => {
    try {
      const response = await api.put(`/calls/${callId}`, data);
      return response.data;
    } catch (error) {
      console.error('Update Call Error:', error);
      throw new Error('통화 기록 업데이트에 실패했습니다.');
    }
  },

  deleteCall: async (callId) => {
    try {
      const response = await api.delete(`/calls/${callId}`);
      return response.data;
    } catch (error) {
      console.error('Delete Call Error:', error);
      throw new Error('통화 기록 삭제에 실패했습니다.');
    }
  }
};

export const audioService = {
  playAudio: async (fileName) => {
    const response = await api.get(`/audio/stream/${fileName}`);
    return response.data.url;
  }
};

export const uploadService = {
  async uploadFile(file) {
    try {
      // 1. API Gateway를 통해 Presigned URL 요청
      const urlResponse = await api.post('/audio/upload/', {
        filename: file.name,
        content_type: file.type
      });
      
      if (!urlResponse.data || !urlResponse.data.upload_url) {
        throw new Error('Failed to get upload URL');
      }
      
      const { upload_url } = urlResponse.data;
      
      // 2. Presigned URL로 파일 직접 업로드
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type
        }
      });
      
      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }
      
      return { success: true };
      
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }
};

export default api; 