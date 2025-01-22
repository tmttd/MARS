import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import PropertyList from './pages/PropertyList';
import CallList from './pages/CallList';
import CallDetail from './pages/CallDetail';
import PropertyCreate from './pages/PropertyCreate';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { FaHome } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/App.css';

function App() {
  return (
    <Router>
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
            <Nav.Link as={Link} to="/login" className="btn btn-outline-primary">
              <span className="material-icons" style={{ fontSize: '20px', marginRight: '5px' }}>
                login
              </span>
              로그인
            </Nav.Link>
          </Nav>
        </Container>
      </Navbar>

      <Routes>
        <Route path="/properties" element={<PropertyList />} />
        <Route path="/properties/create" element={<PropertyCreate />} />
        <Route path="/calls" element={<CallList />} />
        <Route path="/calls/:id" element={<CallDetail />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App; 