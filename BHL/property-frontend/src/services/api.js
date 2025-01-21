import axios from 'axios';
import { flattenData, unflattenPropertyData, unflattenCallData } from '../utils/FlattenData';
import { formatPhoneNumber } from '../utils/FormatTools';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8003';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const propertyService = {
  getProperties: async (page = 1, limit = 10, filters = {}) => {
    try {
      console.log('[API] getProperties 요청:', { page, limit, filters });
      // offset 계산
      const offset = (page - 1) * limit;

      // 필터 중 key=value 형태로 서버에 전달
      // 예: { property_name: 'foo' } → /properties/?property_name=foo
      const params = {
        limit,
        offset,
        ...filters,
      };

      const response = await api.get('/properties/', { params });
      // 서버가 { results, totalCount } 형태로 응답한다고 가정
      const { results, totalCount } = response.data;

      // flattenData 적용
      const flattenedResults = results.map(flattenData);

      // 연락처 포맷팅 적용
      flattenedResults.forEach(property => {
        if (property.owner_contact) {
          property.owner_contact = formatPhoneNumber(property.owner_contact);
        }
        if (property.tenant_contact) {
          property.tenant_contact = formatPhoneNumber(property.tenant_contact);
        }
      });

      console.log('[API] getProperties 응답:', { results: flattenedResults, totalCount });
      return { results: flattenedResults, totalCount };
    } catch (error) {
      console.error('API Error details:', error.response || error);
      throw new Error(error.response?.data?.detail || '부동산 정보를 불러오는데 실패했습니다.');
    }
  },

  getProperty: async (propertyId) => {
    try {
      console.log('[API] getProperty 요청:', { propertyId });
      const response = await api.get(`/properties/${propertyId}`);
      // flattenData 적용
      const flattenedData = flattenData(response.data);
      // 연락처 포맷팅 적용
      if (flattenedData.owner_contact) {
        flattenedData.owner_contact = formatPhoneNumber(flattenedData.owner_contact);
      }
      if (flattenedData.tenant_contact) {
        flattenedData.tenant_contact = formatPhoneNumber(flattenedData.tenant_contact);
      }
      console.log('[API] getProperty 응답:', flattenedData);
      return flattenedData;
    } catch (error) {
      console.error('Get Property Error:', error);
      throw new Error('부동산 정보를 불러오는데 실패했습니다.');
    }
  },

  createProperty: async (data) => {
    try {
      console.log('[API] createProperty 요청:', data);
      const structuredData = unflattenPropertyData(data);
      
      console.log('structuredData', structuredData);

      const response = await api.post('/properties/', structuredData);
      console.log('[API] createProperty 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('Create Property Error:', error);
      throw new Error('부동산 정보 생성에 실패했습니다.');
    }
  },

  updateProperty: async (propertyId, data) => {
    try {
      console.log('[API] updateProperty 요청:', { propertyId, data });
      const structuredData = unflattenPropertyData(data);
      console.log('structuredData', structuredData);
      const response = await api.put(`/properties/${propertyId}`, structuredData);
      console.log('[API] updateProperty 응답:', response.data);
      const flattenedData = flattenData(response.data);
      return flattenedData;
    } catch (error) {
      console.error('Update Property Error:', error);
      throw new Error('부동산 정보 업데이트에 실패했습니다.');
    }
  },

  deleteProperty: async (propertyId) => {
    try {
      console.log('[API] deleteProperty 요청:', { propertyId });
      const response = await api.delete(`/properties/${propertyId}`);
      console.log('[API] deleteProperty 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('Delete Property Error:', error);
      throw new Error('부동산 정보 삭제에 실패했습니다.');
    }
  }
};

export const callService = {
  getCalls: async (page = 1, limit = 10, filters = {}) => {
    try {
      console.log('[API] getCalls 요청:', { page, limit, filters });
      const params = {
        limit,
        offset: (page - 1) * limit,
        ...filters  // 필터 조건 추가
      };
      const response = await api.get('/calls/', { params });
      // 응답 형식이 { results, totalCount }라고 가정
      const { results: calls, totalCount } = response.data; 

      console.log('calls', calls);
      // 각 통화 기록의 flattenData 적용 및 customer_contact 포맷팅
      const flattenedCalls = calls.map(call => {
        const flattenedCall = flattenData(call); // flattenData 적용
        if (flattenedCall.customer_contact) {
          flattenedCall.customer_contact = formatPhoneNumber(flattenedCall.customer_contact);
        }
        if (flattenedCall.owner_contact) {
          flattenedCall.owner_contact = formatPhoneNumber(flattenedCall.owner_contact);
        }
        if (flattenedCall.tenant_contact) {
          flattenedCall.tenant_contact = formatPhoneNumber(flattenedCall.tenant_contact);
        }
        return flattenedCall; // flattenedCall 반환
      });

      console.log('[API] getCalls 응답:', { calls: flattenedCalls, totalCount });
      return { calls: flattenedCalls, totalCount };
    } catch (error) {
      console.error('API Error details:', error.response || error);
      throw new Error(error.response?.data?.detail || '통화 기록을 불러오는데 실패했습니다.');
    }
  },

  getCall: async (callId) => {
    try {
      console.log('[API] getCall 요청:', { callId });
      const response = await api.get(`/calls/${callId}`);
      // flattenData 적용
      const flattenedData = flattenData(response.data);
      if (flattenedData.customer_contact) {
        flattenedData.customer_contact = formatPhoneNumber(flattenedData.customer_contact);
      }
      if (flattenedData.owner_contact) {
        flattenedData.owner_contact = formatPhoneNumber(flattenedData.owner_contact);
      }
      if (flattenedData.tenant_contact) {
        flattenedData.tenant_contact = formatPhoneNumber(flattenedData.tenant_contact);
      }
      console.log('[API] getCall 응답:', flattenedData);
      return flattenedData;
    } catch (error) {
      console.error('Get Call Error:', error);
      throw new Error('통화 기록을 불러오는데 실패했습니다.');
    }
  },

  createCall: async (data) => {
    try {
      console.log('[API] createCall 요청:', data);
      const response = await api.post('/calls/', data);
      console.log('[API] createCall 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('Create Call Error:', error);
      throw new Error('통화 기록 생성에 실패했습니다.');
    }
  },

  updateCall: async (callId, data) => {
    try {
      console.log('[API] updateCall 요청:', { callId, data });
      const unflattenedData = unflattenCallData(data);
      const response = await api.put(`/calls/${callId}`, unflattenedData);
      console.log('[API] updateCall 응답:', response.data);
      return response.data;
    } catch (error) {
      console.error('Update Call Error:', error);
      throw new Error('통화 기록 업데이트에 실패했습니다.');
    }
  },

  deleteCall: async (callId) => {
    try {
      console.log('[API] deleteCall 요청:', { callId });
      const response = await api.delete(`/calls/${callId}`);
      console.log('[API] deleteCall 응답:', response.data);
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
      
      console.log('[API] uploadFile Presigned URL 응답:', urlResponse.data);
      console.log('[API] uploadFile 완료');
      return { success: true };
      
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }
};

export default api; 