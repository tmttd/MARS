import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import PropertyList from './pages/PropertyList';
import CallList from './pages/CallList';
import CallDetail from './pages/CallDetail';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { FaHome } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/App.css';

function App() {
  return (
    <Router>
      <Navbar bg="light" expand="lg">
        <Container>
          <Navbar.Brand className="fw-bold fs-3 text-primary d-flex align-items-center">
            <FaHome className="me-2" />
            부동산 관리 시스템
          </Navbar.Brand>
          <Nav className="ms-auto">
            <Nav.Link as={Link} to="/properties" className="btn btn-outline-primary me-2">매물 목록</Nav.Link>
            <Nav.Link as={Link} to="/calls" className="btn btn-outline-primary">통화 기록</Nav.Link>
          </Nav>
        </Container>
      </Navbar>

      <Routes>
        <Route path="/properties" element={<PropertyList />} />
        <Route path="/calls" element={<CallList />} />
        <Route path="/calls/:id" element={<CallDetail />} />
        <Route path="/" element={<PropertyList />} />
      </Routes>
    </Router>
  );
}

export default App; 