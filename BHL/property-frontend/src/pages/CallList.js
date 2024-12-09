import React, { useState, useEffect } from 'react';
import { Container, Spinner, Alert, Form, Row, Col, Card } from 'react-bootstrap';
import { FaSearch, FaPhone, FaBuilding } from 'react-icons/fa';
import CallTable from '../components/CallTable';
import { callService } from '../services/api';
import './PropertyList.css';

const CallList = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('contact');

  const fetchCalls = async () => {
    try {
      const data = await callService.getAllCalls();
      // 통화일시 기준으로 내림차순 정렬
      const sortedData = data.sort((a, b) => 
        new Date(b.call_datetime) - new Date(a.call_datetime)
      );
      // 번호 재할당
      const numberedData = sortedData.map((call, index) => ({
        ...call,
        call_number: sortedData.length - index // 역순으로 번호 부여
      }));
      setCalls(numberedData);
      setLoading(false);
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, []);

  const filteredCalls = calls.filter(call => {
    if (!searchTerm) return true;
    
    switch (searchType) {
      case 'contact':
        return call.contact?.toLowerCase().includes(searchTerm.toLowerCase());
      case 'complex_name':
        return call.complex_name?.toLowerCase().includes(searchTerm.toLowerCase());
      default:
        return true;
    }
  });

  if (loading) return (
    <Container className="d-flex justify-content-center align-items-center min-vh-100">
      <div className="text-center">
        <Spinner animation="border" variant="primary" className="mb-3" />
        <p className="text-muted">데이터를 불러오는 중입니다...</p>
      </div>
    </Container>
  );

  if (error) return (
    <Container className="mt-5">
      <Alert variant="danger" className="shadow-sm">
        <Alert.Heading>오류 발생</Alert.Heading>
        <p>{error}</p>
      </Alert>
    </Container>
  );

  return (
    <Container fluid className="py-4 bg-light min-vh-100">
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <h1 className="text-primary mb-4">
            <FaPhone className="me-2" />
            통화 기록 목록
          </h1>
          
          <Row className="g-3 mb-4">
            <Col md={3}>
              <Form.Select 
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="shadow-sm border-0"
              >
                <option value="contact">
                  <FaPhone className="me-2" />연락처
                </option>
                <option value="complex_name">
                  <FaBuilding className="me-2" />단지명
                </option>
              </Form.Select>
            </Col>
            <Col md={9}>
              <div className="search-container">
                <FaSearch className="search-icon" />
                <Form.Control
                  type="text"
                  placeholder={`${searchType === 'contact' ? '연락처' : '단지명'}으로 검색`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input shadow-sm border-0"
                />
              </div>
            </Col>
          </Row>

          <div className="table-container shadow-sm rounded">
            <CallTable 
              calls={filteredCalls} 
              onUpdate={fetchCalls}
            />
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default CallList;