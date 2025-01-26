import axios from 'axios';
import { flattenData, unflattenPropertyData, unflattenCallData } from '../utils/FlattenData';
import { formatPhoneNumber } from '../utils/FormatTools';
import qs from 'qs';

// 로컬 테스트용
// const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8003';

// 배포용
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://43.203.64.254:8003';


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  withCredentials: true
});

export const propertyService = {
  getProperties: async (page = 1, limit = 10, filters = {}) => {
    try {

      // 기타 필터 처리
      let params = {
        limit,
        offset: (page - 1) * limit,
      };

      if (filters.property_name === '기타' && filters.exclude_property_names) {
        params = {
          ...params,
          property_name: '기타',
          exclude_property_names: filters.exclude_property_names
        };
      } else {
        params = {
          ...params,
          ...filters,
        };
      }

      const response = await api.get('/properties/', {
        params,
        paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' })
      });

      const { results, totalCount } = response.data;

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

      return { results: flattenedResults, totalCount };
    } catch (error) {
      console.error('API Error details:', error.response || error);
      throw new Error(error.response?.data?.detail || '부동산 정보를 불러오는데 실패했습니다.');
    }
  },

  getProperty: async (propertyId) => {
    try {
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
      return flattenedData;
    } catch (error) {
      console.error('Get Property Error:', error);
      throw new Error('부동산 정보를 불러오는데 실패했습니다.');
    }
  },

  createProperty: async (data) => {
    try {
      const structuredData = unflattenPropertyData(data);
      const response = await api.post('/properties/', structuredData);
      return response.data;
    } catch (error) {
      console.error('Create Property Error:', error);
      throw new Error('부동산 정보 생성에 실패했습니다.');
    }
  },

  updateProperty: async (propertyId, data) => {
    try {
      const structuredData = unflattenPropertyData(data);
      const response = await api.put(`/properties/${propertyId}`, structuredData);
      const flattenedData = flattenData(response.data);
      return flattenedData;
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
  getCalls: async (page = 1, limit = 10, filters = {}) => {
    try {
      // 기타 필터 처리
      let params = {
        limit,
        offset: (page - 1) * limit,
      };

      if (filters.property_name === '기타' && filters.exclude_property_names) {
        params = {
          ...params,
          property_name: '기타',
          exclude_property_names: filters.exclude_property_names
        };
      } else {
        params = {
          ...params,
          ...filters,
        };
      }

      const response = await api.get('/calls/', {
        params,
        paramsSerializer: params => qs.stringify(params, { arrayFormat: 'repeat' })
      });

      const { results: calls, totalCount } = response.data;

      const flattenedCalls = calls.map(call => {
        const flattenedCall = flattenData(call);
        if (flattenedCall.customer_contact) {
          flattenedCall.customer_contact = formatPhoneNumber(flattenedCall.customer_contact);
        }
        if (flattenedCall.owner_contact) {
          flattenedCall.owner_contact = formatPhoneNumber(flattenedCall.owner_contact);
        }
        if (flattenedCall.tenant_contact) {
          flattenedCall.tenant_contact = formatPhoneNumber(flattenedCall.tenant_contact);
        }
        return flattenedCall;
      });

      return { calls: flattenedCalls, totalCount };
    } catch (error) {
      console.error('API Error details:', error.response || error);
      throw new Error(error.response?.data?.detail || '통화 기록을 불러오는데 실패했습니다.');
    }
  },

  getCall: async (callId) => {
    try {
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
      return flattenedData;
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
      const unflattenedData = unflattenCallData(data);
      const response = await api.put(`/calls/${callId}`, unflattenedData);
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
    // localStorage에서 현재 로그인한 사용자 정보 가져오기
    const token = localStorage.getItem('token');
    const decodedToken = token ? JSON.parse(atob(token.split('.')[1])) : null;
    const userName = decodedToken ? decodedToken.sub : null;

    const response = await api.get(`/audio/stream/${fileName}`, {
      params: { user_name: userName }
    });
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

export const authService = {
  login: async (credentials) => {
    try {
      const response = await api.post('/login', {
        username: credentials.username,
        password: credentials.password
      });
      
      // 토큰을 localStorage에 저장
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        // axios 인스턴스의 기본 헤더에 토큰 설정
        api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
      }
      
      return response.data;
    } catch (error) {
      console.error('Login Error:', error.response?.data || error);
      if (error.response?.status === 401) {
        throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
      }
      throw new Error('로그인 처리 중 오류가 발생했습니다.');
    }
  },

  register: async (userData) => {
    try {
      
      // 전송할 데이터 구조 확인
      const registerData = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        confirm_password: userData.confirm_password
      };
      
      const response = await api.post('/register', registerData);
      return response.data;
    } catch (error) {
      console.error('Register Error:', error.response?.data || error);
      
      // 서버에서 받은 에러 메시지 처리
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // validation 에러의 경우 첫 번째 에러 메시지 사용
          throw new Error(error.response.data.detail[0].msg);
        } else {
          // 일반적인 에러 메시지
          throw new Error(error.response.data.detail);
        }
      }
      
      // 기본 에러 메시지
      throw new Error('회원가입 처리 중 오류가 발생했습니다.');
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/users/me');
      return response.data;
    } catch (error) {
      console.error('Get Current User Error:', error);
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  }
};

// axios 인터셉터 설정 - 토큰이 있으면 자동으로 헤더에 포함
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api; 