// src/pages/PropertyList.js
import React, { useState, useEffect, useRef } from 'react';
import { Container, Spinner, Alert, Form, Row, Col, Card, Button, Pagination } from 'react-bootstrap';
import { FaSearch, FaBuilding, FaPhone, FaPlus } from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PropertyTable from '../components/property/PropertyTable';
import { propertyService } from '../services/api';
import { flattenData } from '../components/common/FlattenData';
import '../styles/PropertyList.css';

const PropertyList = () => {
  // -----------------------
  // 1) URL & 상태 관리
  // -----------------------
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // 페이지 번호 (URL 파라미터 page)
  const initialPage = Number(searchParams.get('page')) || 1;
  const [page, setPage] = useState(initialPage);

  // 검색 조건
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('property_name');

  // 서버로부터 가져온 데이터
  const [properties, setProperties] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 페이지당 항목 수
  const ITEMS_PER_PAGE = 10;

  // 첫 마운트 구분용
  const isInitialMount = useRef(true);

  // -----------------------
  // 2) 서버 호출 함수
  // -----------------------
  const fetchProperties = async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      // 필터 객체 구성 (검색어 존재 시, searchType에 맞춰 key=value)
      const filters = {};
      if (searchTerm) {
        filters[searchType] = searchTerm;
      }

      // 서버로부터 { results, totalCount } 구조를 받는다고 가정
      const { results, totalCount } = await propertyService.getProperties(pageNum, ITEMS_PER_PAGE, filters);
      
      // 서버로부터 받은 각 결과를 평탄화
      const flattenedResults = results.map(item => flattenData(item));

      // 페이지별 번호 부여
      const offset = (pageNum - 1) * ITEMS_PER_PAGE;
      const numberedData = flattenedResults.map((item, idx) => ({
        ...item,
        property_number: offset + idx + 1,
      }));

      setProperties(numberedData);
      setTotalPages(Math.ceil(totalCount / ITEMS_PER_PAGE));
      setLoading(false);
    } catch (err) {
      console.error(err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  // -----------------------
  // 3) 페이지 변경 시 서버 호출
  // -----------------------
  useEffect(() => {
    fetchProperties(page);
  }, [page]);

  // -----------------------
  // 3.5) URL 쿼리 파라미터 변경 감지
  // -----------------------
  useEffect(() => {
    const newPage = Number(searchParams.get('page')) || 1;
    if (newPage !== page) {
      setPage(newPage);
    }
  }, [searchParams, page]);

  // -----------------------
  // 4) 검색 조건 변경 시 페이지=1로 리셋
  // -----------------------
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      setPage(1);
      setSearchParams({ page: '1' });
      fetchProperties(1);
    }
  }, [searchTerm, searchType, setSearchParams]);

  // -----------------------
  // 5) 페이지네이션 핸들러
  // -----------------------
  const handlePageChange = (newPage) => {
    setPage(newPage);
    setSearchParams({ page: newPage.toString() });
  };

  // -----------------------
  // 6) 신규 매물 등록
  // -----------------------
  const handlePropertyCreate = () => {
    console.log('신규 매물 추가');
    navigate('/properties/create');
  };

  // -----------------------
  // 7) 로딩/에러 처리
  // -----------------------
  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="text-muted">데이터를 불러오는 중입니다...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger" className="shadow-sm">
          <Alert.Heading>오류 발생</Alert.Heading>
          <p>{error}</p>
        </Alert>
      </Container>
    );
  }

  // -----------------------
  // 8) 화면 렌더링
  // -----------------------
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
                className="d-flex align-items-center"
                onClick={handlePropertyCreate}
              >
                <FaPlus className="me-2" />
                신규 매물 등록
              </Button>
            </div>
          </div>

          {/* 검색 영역 */}
          <Row className="g-3 mb-4">
            <Col md={1}>
              <Form.Select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="shadow-sm border-0"
              >
                <option value="property_name">
                  <FaBuilding className="me-2" />
                  단지명
                </option>
                <option value="owner_contact">
                  <FaPhone className="me-2" />
                  연락처
                </option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <div className="search-container">
                <FaSearch className="search-icon" />
                <Form.Control
                  type="text"
                  placeholder={searchType === 'property_name' ? '단지명(으)로 검색' : '연락처(으)로 검색'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input shadow-sm border-0"
                />
              </div>
            </Col>
          </Row>

          {/* 테이블 */}
          <div className="table-container shadow-sm rounded">
            <PropertyTable
              properties={properties}
              onRefresh={() => fetchProperties(page)} // 삭제 후 새로고침
            />
          </div>

          {/* 페이지네이션 */}
          <div className="d-flex justify-content-center mt-4">
            <Pagination>
              <Pagination.Prev disabled={page === 1} onClick={() => handlePageChange(page - 1)} />
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

export default PropertyList;
