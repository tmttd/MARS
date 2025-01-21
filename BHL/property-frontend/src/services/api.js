import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8003';

const unflattenPropertyData = (flatData) => {
  if (!flatData) return {};

  // 최상위 레벨 필드 분리
  const {
    // property_info로 들어갈 필드들
    property_name, price, deposit, city, district, legal_dong, detail_address,
    full_address, loan_available, transaction_type, property_type, floor, area,
    premium, memo, moving_date, owner_property_memo, tenant_property_memo,
    // owner_info로 들어갈 필드들
    owner_name, owner_contact,
    // tenant_info로 들어갈 필드들
    tenant_name, tenant_contact,
    // 최상위 유지할 필드들
    property_id, created_at, status,
    ...rest
  } = flatData;

  return {
    property_id,
    created_at,
    status,
    property_info: {
      property_name,
      price,
      deposit,
      city,
      district,
      legal_dong,
      detail_address,
      full_address,
      loan_available,
      transaction_type,
      property_type,
      floor,
      area,
      premium,
      memo,
      moving_date,
      owner_property_memo,    
      tenant_property_memo,   
      owner_info: {
        owner_name,
        owner_contact
      },
      tenant_info: {
        tenant_name,
        tenant_contact
      }
    },
    ...rest
  };
};

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

      return { results, totalCount };
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
      const structuredData = unflattenPropertyData(data);
      
      console.log('structuredData', structuredData);

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
      console.log('structuredData', structuredData);
      const response = await api.put(`/properties/${propertyId}`, structuredData);
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
  getCalls: async (page = 1, limit = 10, filters = {}) => {
    try {
      const params = {
        limit,
        offset: (page - 1) * limit,
        ...filters  // 필터 조건 추가
      };
      const response = await api.get('/calls/', { params });
      // 응답 형식이 { results, totalCount }라고 가정
      const { results: calls, totalCount } = response.data; 

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

      return { calls, totalCount };
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

export const authService = {
  login: async (credentials) => {
    try {
      console.log('Sending login credentials:', credentials);  // 로그 추가
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
      console.log('API register received data:', userData);  // 받은 데이터 확인
      
      // 전송할 데이터 구조 확인
      const registerData = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        confirm_password: userData.confirm_password
      };
      
      console.log('API sending data:', registerData);  // 전송할 데이터 확인
      
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