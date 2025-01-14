import React, { useState, useEffect } from 'react';
import { Container, Spinner, Alert, Form, Row, Col, Card } from 'react-bootstrap';
import { FaSearch, FaBuilding, FaPhone } from 'react-icons/fa';
import PropertyTable from '../components/property/PropertyTable';
import { propertyService } from '../services/api';
import '../styles/PropertyList.css';

const PropertyList = () => {
  const [extractions, setExtractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('building_name');

  const fetchExtractions = async () => {
    try {
      const data = await propertyService.getAllExtractions();
      setExtractions(data);
      setLoading(false);
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExtractions();
  }, []);

  const filteredExtractions = extractions.filter(extraction => {
    if (!searchTerm) return true;
    const value = extraction[searchType]?.toString().toLowerCase() || '';
    return value.includes(searchTerm.toLowerCase());
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
            <FaBuilding className="me-2" />
            부동산 매물 추출 데이터
          </h1>
          
          <Row className="g-3 mb-4">
            <Col md={3}>
              <Form.Select 
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="shadow-sm border-0"
              >
                <option value="building_name">
                  <FaBuilding className="me-2" />건물명
                </option>
                <option value="owner_contact">
                  <FaPhone className="me-2" />연락처
                </option>
              </Form.Select>
            </Col>
            <Col md={9}>
              <div className="search-container">
                <FaSearch className="search-icon" />
                <Form.Control
                  type="text"
                  placeholder={`${searchType === 'building_name' ? '건물명' : '연락처'}으로 검색`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input shadow-sm border-0"
                />
              </div>
            </Col>
          </Row>

          <div className="table-container shadow-sm rounded">
            <PropertyTable 
              extractions={filteredExtractions} 
              onUpdate={fetchExtractions}
            />
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default PropertyList;