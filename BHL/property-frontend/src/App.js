import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import PropertyList from './pages/PropertyList';
import CallList from './pages/CallList';
import { Navbar, Nav, Container } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
    <Router>
      <Navbar bg="light" expand="lg">
        <Container>
          <Navbar.Brand>부동산 관리 시스템</Navbar.Brand>
          <Nav>
            <Nav.Link as={Link} to="/properties">매물 목록</Nav.Link>
            <Nav.Link as={Link} to="/calls">통화 기록</Nav.Link>
          </Nav>
        </Container>
      </Navbar>

      <Routes>
        <Route path="/properties" element={<PropertyList />} />
        <Route path="/calls" element={<CallList />} />
        <Route path="/" element={<PropertyList />} />
      </Routes>
    </Router>
  );
}

export default App; 