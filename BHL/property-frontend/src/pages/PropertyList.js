import React, { useState, useEffect } from 'react';
import { Container, Spinner, Alert, Form, Row, Col, Card, Button } from 'react-bootstrap';
import { FaSearch, FaBuilding, FaPhone, FaPlus } from 'react-icons/fa';
import PropertyTable from '../components/property/PropertyTable';
import { propertyService } from '../services/api';
import '../styles/PropertyList.css';
import { useNavigate } from 'react-router-dom';

const flattenPropertyData = (property) => {
  if (!property) return {};

  // property_info가 없으면 원본 객체 반환
  if (!property.property_info) return property;

  // property_info에서 필요한 데이터 추출
  const { owner_info, tenant_info, ...restInfo } = property.property_info;
  
  // 기본 property 객체에서 property_info 제거하고 나머지 데이터만 유지
  const { property_info, ...baseProperty } = property;

  // 최종 객체 생성
  return {
    ...baseProperty,
    ...restInfo,
    ...(owner_info || {}),
    ...(tenant_info || {})
  };
};

const PropertyList = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('property_name');
  const navigate = useNavigate();

  const fetchProperties = async () => {
    try {
      const data = await propertyService.getProperties();
      const flattenedData = data.map(property => flattenPropertyData(property));
      setProperties(flattenedData);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const filteredProperties = properties.filter(property => {
    if (!searchTerm) return true;
    
    switch(searchType) {
      case 'property_name':
        return property.property_name?.toLowerCase().includes(searchTerm.toLowerCase());
      case 'owner_contact':
        return property.owner_contact?.toLowerCase().includes(searchTerm.toLowerCase());
      default:
        return true;
    }
  });

  const handlePropertyCreate = () => {
    console.log('신규 매물 추가');
    navigate('/properties/create');
  };

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
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="text-primary mb-4" style={{ fontSize: '1.5rem' }}>
              <FaBuilding className="me-2" />
              부동산 매물 장부
            </h1>
            <div>
              <Button
                variant="primary"
                as="span"
                className="d-flex align-items-center"
                onClick={handlePropertyCreate}
              >
                  <FaPlus className="me-2" />
                  신규 매물 등록
                </Button>
            </div>
          </div>
          <Row className="g-3 mb-4">
            <Col md={1}>
              <Form.Select 
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="shadow-sm border-0"
              >
                <option value="property_name">
                  <FaBuilding className="me-2" />단지명
                </option>
                <option value="owner_contact">
                  <FaPhone className="me-2" />연락처
                </option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <div className="search-container">
                <FaSearch className="search-icon" />
                <Form.Control
                  type="text"
                  placeholder={`${searchType === 'property_name' ? '단지명' : '연락처'}(으)로 검색`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input shadow-sm border-0"
                />
              </div>
            </Col>
          </Row>

          <div className="table-container shadow-sm rounded">
            <PropertyTable 
              properties={filteredProperties}
              onRefresh={fetchProperties}
            />
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default PropertyList;