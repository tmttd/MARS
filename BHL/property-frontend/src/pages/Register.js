import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock, FaEnvelope } from 'react-icons/fa';
import { authService } from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (formData.password !== formData.confirm_password) {
      setError('비밀번호가 일치하지 않습니다.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const registerData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        confirm_password: formData.confirm_password
      };
      console.log('Sending register data:', registerData);  // 전송 데이터 확인
      
      await authService.register(registerData);
      navigate('/login');
    } catch (err) {
      console.error('Register submit error:', err);  // 에러 상세 로깅
      setError(err.message || '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="mt-5">
      <Card className="mx-auto" style={{ maxWidth: '400px' }}>
        <Card.Body className="p-4">
          <div className="text-center mb-4">
            <span className="material-icons" style={{ fontSize: '48px', color: '#007bff' }}>
              person_add
            </span>
            <h3 className="mt-2">회원가입</h3>
          </div>

          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <div className="position-relative">
                <FaUser className="position-absolute" style={{ top: '12px', left: '10px', color: '#666' }} />
                <Form.Control
                  type="text"
                  name="username"
                  placeholder="아이디"
                  value={formData.username}
                  onChange={handleChange}
                  style={{ paddingLeft: '35px' }}
                  required
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <div className="position-relative">
                <FaEnvelope className="position-absolute" style={{ top: '12px', left: '10px', color: '#666' }} />
                <Form.Control
                  type="email"
                  name="email"
                  placeholder="이메일"
                  value={formData.email}
                  onChange={handleChange}
                  style={{ paddingLeft: '35px' }}
                  required
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-3">
              <div className="position-relative">
                <FaLock className="position-absolute" style={{ top: '12px', left: '10px', color: '#666' }} />
                <Form.Control
                  type="password"
                  name="password"
                  placeholder="비밀번호"
                  value={formData.password}
                  onChange={handleChange}
                  style={{ paddingLeft: '35px' }}
                  required
                />
              </div>
            </Form.Group>

            <Form.Group className="mb-4">
              <div className="position-relative">
                <FaLock className="position-absolute" style={{ top: '12px', left: '10px', color: '#666' }} />
                <Form.Control
                  type="password"
                  name="confirm_password"
                  placeholder="비밀번호 확인"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  style={{ paddingLeft: '35px' }}
                  required
                />
              </div>
            </Form.Group>

            <Button 
              variant="primary" 
              type="submit" 
              className="w-100" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  가입 중...
                </>
              ) : '회원가입'}
            </Button>

            <div className="text-center mt-3">
              <Button 
                variant="link" 
                className="text-decoration-none" 
                onClick={() => navigate('/login')}
              >
                이미 계정이 있으신가요? 로그인
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Register; 