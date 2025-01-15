import React, { useState, useEffect } from 'react';
import { Container, Spinner, Alert, Form, Row, Col, Card, Button } from 'react-bootstrap';
import { FaSearch, FaPhone, FaBuilding, FaTimes, FaUser, FaCloudUploadAlt } from 'react-icons/fa';
import CallTable from '../components/call/CallTable';
import { callService } from '../services/api';
import { uploadService } from '../services/api';
import '../styles/PropertyList.css';

const CallList = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('customer_contact');

  const fetchCalls = async () => {
    try {
      const data = await callService.getCalls();
      // 통화일시 기준으로 내림차순 정렬
      const sortedData = data.sort((a, b) => 
        new Date(b.recording_date) - new Date(a.recording_date)
      );
      console.error("Sorted Data:", sortedData);
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
    fetchCalls(); // 컴포넌트가 마운트될 때마다 데이터를 가져옴
  }, []); // 빈 배열을 사용하여 컴포넌트가 처음 마운트될 때만 호출

  const filteredCalls = calls.filter(call => {
    if (!searchTerm) return true;
    
    switch (searchType) {
      case 'customer_contact':
        return call.customer_contact?.toLowerCase().includes(searchTerm.toLowerCase());
      case 'customer_name':
        return call.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());  
      case 'property_name':
        return call.extracted_property_info.property_name?.toLowerCase().includes(searchTerm.toLowerCase());
      default:
        return true;
    }
  });

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const response = await uploadService.uploadFile(file);
      console.log('Upload response:', response);
      await fetchCalls();
    } catch (error) {
      console.error('Upload failed:', error);
      setError('파일 업로드에 실패했습니다.');
    }
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
            <h1 className="text-primary mb-0" style={{ fontSize: '1.5rem' }}>
              <FaPhone className="me-2" />
              통화 기록 목록
            </h1>
            
            <div>
              <input
                type="file"
                accept="audio/*"
                style={{ display: 'none' }}
                id="upload-audio-file"
                onChange={handleFileUpload}
              />
              <label htmlFor="upload-audio-file">
                <Button
                  variant="primary"
                  as="span"
                  className="d-flex align-items-center"
                >
                  <FaCloudUploadAlt className="me-2" />
                  음성파일 업로드
                </Button>
              </label>
            </div>
          </div>
          
          <Row className="g-3 mb-4">
            <Col md={1}>
              <Form.Select 
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="shadow-sm border-0"
              >
                <option value="customer_contact">
                  <FaPhone className="me-2" />연락처
                </option>
                <option value="customer_name">
                  <FaUser className="me-2" />성명
                </option>
                <option value="property_name">
                  <FaBuilding className="me-2" />건물명
                </option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <div className="search-container">
                <FaSearch className="search-icon" />
                <Form.Control
                  type="text"
                  placeholder={`${
                    searchType === 'customer_contact' ? '연락처' : 
                    searchType === 'customer_name' ? '성명' : '건물명'
                  }(으)로 검색`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input shadow-sm border-0"
                />
                {searchTerm && (
                  <button 
                    className="clear-button" 
                    onClick={() => setSearchTerm('')}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      position: 'absolute', 
                      right: '10px', 
                      top: '50%', 
                      transform: 'translateY(-50%)' 
                    }}
                  >
                    <FaTimes />
                  </button>
                )}
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