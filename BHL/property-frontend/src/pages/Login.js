import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { FaUser, FaLock } from 'react-icons/fa';
import { authService } from '../services/api';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await authService.login(formData);
      window.dispatchEvent(new Event('loginStateChange'));
      navigate('/');
    } catch (err) {
      setError(err.message);
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
              account_circle
            </span>
            <h3 className="mt-2">로그인</h3>
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

            <Form.Group className="mb-4">
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
                  로그인 중...
                </>
              ) : '로그인'}
            </Button>

            <div className="text-center mt-3">
              <Button 
                variant="link" 
                className="text-decoration-none" 
                onClick={() => navigate('/register')}
              >
                회원가입
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default Login;
