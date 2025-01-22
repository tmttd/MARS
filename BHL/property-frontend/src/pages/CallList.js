import React, { useState, useEffect, useRef } from 'react';
import { Container, Spinner, Alert, Form, Row, Col, Card, Button, Pagination } from 'react-bootstrap';
import { FaSearch, FaPhone, FaBuilding, FaTimes, FaUser, FaCloudUploadAlt } from 'react-icons/fa';
import { useSearchParams } from 'react-router-dom'; // useSearchParams 추가
import CallTable from '../components/call/CallTable';
import { callService } from '../services/api';
import { uploadService } from '../services/api';
import '../styles/PropertyList.css';

const CallList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPage = Number(searchParams.get('page')) || 1;
  const initialMount = useRef(true);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tempSearchTerm, setTempSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('customer_contact');
  const prevSearchTerm = useRef(searchTerm);
  const prevSearchType = useRef(searchType);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 10; // 한 페이지에 보여줄 데이터 수

  const fetchCalls = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      // 필터 조건을 filters 객체로 구성
      const filters = {};
      if (searchTerm) {
        filters[searchType] = searchTerm;
      }
      
      const { calls: fetchedCalls, totalCount } = await callService.getCalls(page, ITEMS_PER_PAGE, filters);
      
      // call_number를 페이지 번호와 ITEMS_PER_PAGE 기반으로 계산
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const numberedData = fetchedCalls.map((call, index) => ({
        ...call,
        call_number: offset + index + 1,
      }));
      setCalls(numberedData);
      setTotalPages(Math.ceil(totalCount / ITEMS_PER_PAGE));
    } catch (err) {
      if (err.response?.status === 403) {
        setError("로그인이 필요한 서비스입니다. 로그인 후 이용해주세요.");
      } else {
        setError(err.message || "통화 기록을 불러오는데 실패했습니다.");
      }
    } finally {
      setLoading(false);
    }
  };

  // 페이지 번호가 변경될 때마다 데이터 로드
  useEffect(() => {
    fetchCalls(page);
  }, [page]);

  // URL 쿼리 파라미터 변경 감지: 브라우저 뒤로가기 등으로 인한 page 값 변경 처리
  useEffect(() => {
    const newPage = Number(searchParams.get('page')) || 1;
    if (newPage !== page) {
      setPage(newPage);
    }
  }, [searchParams, page]);

  // 검색 조건 변경 시 페이지 리셋
  useEffect(() => {
    const termChanged = prevSearchTerm.current !== searchTerm;
    const typeChanged = prevSearchType.current !== searchType;

    // 레퍼런스 업데이트
    prevSearchTerm.current = searchTerm;
    prevSearchType.current = searchType;

    // 실제 변경이 있었을 때만 페이지 리셋
    if (termChanged || typeChanged) {
      setPage(1);
      setSearchParams({ page: '1' });
      fetchCalls(1);
    }
  }, [searchTerm, searchType, setSearchParams]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    setSearchParams({ page: newPage.toString() }); // URL 쿼리 파라미터 업데이트
  };

  // 검색 버튼 클릭 시 동작하는 함수
  const handleSearch = () => {
    setSearchTerm(tempSearchTerm);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const response = await uploadService.uploadFile(file);
      console.log('Upload response:', response);
      await fetchCalls(page); // 현재 페이지 기준으로 데이터 갱신
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
          {/* 상단의 타이틀 및 파일 업로드 버튼 */}
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

          {/* 검색 필터 UI */}
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
                  <FaBuilding className="me-2" />단지명
                </option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <div className="search-container" style={{ position: 'relative' }}>
                <FaSearch className="search-icon" />
                <Form.Control
                  type="text"
                  placeholder={`${searchType === 'customer_contact' ? '연락처' : 
                                searchType === 'customer_name' ? '성명' : '단지명'}(으)로 검색`}
                  value={tempSearchTerm}
                  onChange={(e) => setTempSearchTerm(e.target.value)}
                  onKeyDown={(e) => { if(e.key === 'Enter') handleSearch(); }}
                  className="search-input shadow-sm border-0"
                />
                {tempSearchTerm && (
                  <button 
                    className="clear-button" 
                    onClick={() => {
                      setTempSearchTerm('')
                      setSearchTerm('')
                    }}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      position: 'absolute', 
                      right: '40px',  // 버튼 옆 여유 공간 확보
                      top: '50%', 
                      transform: 'translateY(-50%)' 
                    }}
                  >
                    <FaTimes />
                  </button>
                )}
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handleSearch}
                  style={{
                    position: 'absolute',
                    right: '0',
                    top: '50%',
                    transform: 'translateY(-50%)'
                  }}
                >
                  검색
                </Button>
              </div>
            </Col>
          </Row>

          {/* CallTable 및 Pagination */}
          <div className="table-container shadow-sm rounded">
            <CallTable 
              calls={calls}
              onUpdate={() => fetchCalls(page)}
              currentPage={page}
            />
          </div>

          <div className="d-flex justify-content-center mt-4">
            <Pagination>
              <Pagination.Prev 
                disabled={page === 1} 
                onClick={() => handlePageChange(page - 1)} 
              />
              {[...Array(totalPages)].map((_, idx) => {
                const pageNum = idx + 1;
                return (
                  <Pagination.Item 
                    key={pageNum} 
                    active={pageNum === page}
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Pagination.Item>
                );
              })}
              <Pagination.Next 
                disabled={page === totalPages} 
                onClick={() => handlePageChange(page + 1)} 
              />
            </Pagination>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default CallList;
