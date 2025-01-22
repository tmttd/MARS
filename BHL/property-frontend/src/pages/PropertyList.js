// src/pages/PropertyList.js
import React, { useState, useEffect, useRef } from 'react';
import { Container, Spinner, Alert, Form, Row, Col, Card, Button, Pagination } from 'react-bootstrap';
import { FaSearch, FaBuilding, FaPhone, FaPlus, FaTimes } from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PropertyTable from '../components/property/PropertyTable';
import FilterButton from '../components/common/FilterButton';
import { filterForms } from '../components/common/FormControls/FormField';
import { propertyService } from '../services/api';
import '../styles/PropertyList.css';

const PropertyList = () => {
  // -----------------------
  // 1) URL & 상태 관리
  // -----------------------
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialPage = Number(searchParams.get('page')) || 1;
  const [page, setPage] = useState(initialPage);

  const [tempSearchTerm, setTempSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); 
  const [searchType, setSearchType] = useState('property_name');

  // '기타' 필터에서 제외할 이름들을 저장하는 상태
  const [excludeNames, setExcludeNames] = useState([]);

  const [properties, setProperties] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const ITEMS_PER_PAGE = 10;
  const isInitialMount = useRef(true);

  // -----------------------
  // 2) 서버 호출 함수
  // -----------------------
  const fetchProperties = async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const filters = {};
      if (searchTerm) {
        filters[searchType] = searchTerm;
      }
      // "기타" 조건일 때 excludeNames 적용
      if (searchTerm === '기타' && excludeNames.length > 0) {
        filters.exclude_property_names = excludeNames;
      }

      const { results, totalCount } = await propertyService.getProperties(pageNum, ITEMS_PER_PAGE, filters);

      const offset = (pageNum - 1) * ITEMS_PER_PAGE;
      const numberedData = results.map((item, idx) => ({
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // -----------------------
  // 4) URL 쿼리 파라미터 변경 감지
  // -----------------------
  useEffect(() => {
    const newPage = Number(searchParams.get('page')) || 1;
    if (newPage !== page) {
      setPage(newPage);
    }
  }, [searchParams, page]);

  // -----------------------
  // 5) 검색 조건 변경 시 page=1 리셋
  // -----------------------
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      setPage(1);
      setSearchParams({ page: '1' });
      fetchProperties(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, searchType, excludeNames]);

  // -----------------------
  // 6) 페이지네이션 핸들러
  // -----------------------
  const handlePageChange = (newPage) => {
    setPage(newPage);
    setSearchParams({ page: newPage.toString() });
  };

  // -----------------------
  // 7) 검색 버튼 클릭 핸들러
  // -----------------------
  const handleSearch = () => {
    setSearchTerm(tempSearchTerm);
  };

  // -----------------------
  // 8) 필터 버튼 클릭 핸들러
  // -----------------------
  const handleFilterClick = (filterForm) => {
    setSearchType(filterForm.type);
    setTempSearchTerm(filterForm.value);

    if (filterForm.value === '기타' && filterForm.excludeNames) {
      setSearchTerm('기타');
      setExcludeNames(filterForm.excludeNames);
    } else {
      setSearchTerm(filterForm.value);
      setExcludeNames([]);
    }
  };

  const handlePropertyCreate = () => {
    console.log('신규 매물 추가');
    navigate('/properties/create');
  };

  // -----------------------
  // 9) 로딩/에러 처리
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
  // 10) 렌더링
  // -----------------------
  return (
    <Container fluid className="py-4 bg-light min-vh-100">
      <Card className="shadow-sm mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="text-primary mb-0" style={{ fontSize: '1.5rem' }}>
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
                  단지명
                </option>
                <option value="owner_contact">
                  연락처
                </option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <div className="search-container" style={{ position: 'relative' }}>
                <FaSearch className="search-icon" />
                <Form.Control
                  type="text"
                  placeholder={searchType === 'property_name' ? '단지명 검색' : '연락처 검색'}
                  value={tempSearchTerm}
                  onChange={(e) => setTempSearchTerm(e.target.value)}
                  onKeyDown={(e) => { if(e.key === 'Enter') handleSearch(); }}
                  className="search-input shadow-sm border-0"
                />
                {tempSearchTerm && (
                  <button 
                    className="clear-button" 
                    onClick={() => {
                      setTempSearchTerm('');
                      setSearchTerm('');
                    }}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      position: 'absolute', 
                      right: '40px',
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
            {/* 필터 버튼 추가 */}
            <Col md={8}>
              <div className="d-flex flex-wrap align-items-center h-100">
                {filterForms.map((filterForm, index) => (
                  <FilterButton
                    key={index}
                    label={filterForm.label}
                    value={filterForm.value}
                    isActive={
                      searchTerm === filterForm.value && searchType === filterForm.type
                    }
                    onClick={() => handleFilterClick(filterForm)}
                    activeVariant={filterForm.activeVariant}
                    inactiveVariant={filterForm.inactiveVariant}
                  />
                ))}
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
