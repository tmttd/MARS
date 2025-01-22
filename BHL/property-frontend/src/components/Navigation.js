import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaHome } from 'react-icons/fa';
import { authService } from '../services/api';

const Navigation = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  // 로그인 상태 체크 함수
  const checkLoginStatus = () => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  };

  useEffect(() => {
    checkLoginStatus();
    window.addEventListener('storage', checkLoginStatus);
    window.addEventListener('loginStateChange', checkLoginStatus);

    return () => {
      window.removeEventListener('storage', checkLoginStatus);
      window.removeEventListener('loginStateChange', checkLoginStatus);
    };
  }, []);

  const handleLogout = () => {
    authService.logout();
    setIsLoggedIn(false);
    window.dispatchEvent(new Event('loginStateChange'));
    navigate('/login');
  };

  return (
    <Navbar bg="light" expand="lg">
      <Container>
        <Navbar.Brand as={Link} to="/home" className="fw-bold fs-3 text-primary d-flex align-items-center">
          <FaHome className="me-2" />
          주여사의 라움부동산 관리 시스템
        </Navbar.Brand>
        <Nav className="ms-auto">
          <Nav.Link as={Link} to="/home" className="btn btn-outline-light">
            <span className="material-icons" style={{ fontSize: '20px', marginRight: '5px' }}>
              home
            </span>
            메인 화면
          </Nav.Link>
          <Nav.Link as={Link} to="/properties/create" className="btn btn-outline-primary">
            <span className="material-icons" style={{ fontSize: '20px', marginRight: '5px' }}>
              add_home
            </span>
            신규 매물 등록
          </Nav.Link>
          <Nav.Link as={Link} to="/calls" className="btn btn-outline-primary me-2">
            <span className="material-icons" style={{ fontSize: '20px', marginRight: '5px' }}>
              phone_callback
            </span>
            통화 기록
          </Nav.Link>
          <Nav.Link as={Link} to="/properties" className="btn btn-outline-primary me-2">
            <span className="material-icons" style={{ fontSize: '20px', marginRight: '5px' }}>
              apartment
            </span>
            매물 관리
          </Nav.Link>
          {isLoggedIn ? (
            <Nav.Link onClick={handleLogout} className="btn btn-outline-primary">
              <span className="material-icons" style={{ fontSize: '20px', marginRight: '5px' }}>
                logout
              </span>
              로그아웃
            </Nav.Link>
          ) : (
            <Nav.Link as={Link} to="/login" className="btn btn-outline-primary">
              <span className="material-icons" style={{ fontSize: '20px', marginRight: '5px' }}>
                login
              </span>
              로그인
            </Nav.Link>
          )}
        </Nav>
      </Container>
    </Navbar>
  );
};

export default Navigation; 