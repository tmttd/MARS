// src/pages/PropertyList.js
import React, { useState, useEffect, useRef } from 'react';
import { Container, Spinner, Alert, Form, Row, Col, Card, Button, Pagination } from 'react-bootstrap';
import { FaSearch, FaBuilding, FaPlus, FaTimes } from 'react-icons/fa';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PropertyTable from '../components/property/PropertyTable';
import FilterButton from '../components/common/FilterButton';
import { statusOptions, filterForms } from '../components/common/FormControls/FormField';
import { propertyService } from '../services/api';
import '../styles/PropertyList.css';
import { formatPhoneNumber } from '../utils/FormatTools';

const PropertyList = () => {
  // -----------------------
  // 1) URL 및 상태 관리
  // -----------------------
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialPage = Number(searchParams.get('page')) || 1;
  const [page, setPage] = useState(initialPage);

  // 검색어 관련 상태
  const [tempSearchTerm, setTempSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // 실제 검색어로 서버 호출 시 사용
  const [searchType, setSearchType] = useState('property_name');

  // '기타' 필터에서 제외할 이름들을 저장하는 상태
  const [excludeNames, setExcludeNames] = useState([]);

  // 작업 상태 필터 (라디오 버튼)
  const [statusFilter, setStatusFilter] = useState('');

  // 서버로부터 가져온 데이터 상태
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
      // 필터 객체 구성
      const filters = {};
      if (searchTerm) {
        filters[searchType] = searchTerm;
      }
      if (statusFilter) {
        filters.status = statusFilter;
      }
      // "기타" 조건일 때 excludeNames 적용
      if (searchTerm === '기타' && excludeNames.length > 0) {
        filters.exclude_property_names = excludeNames;
      }

      // 서버에서 { results, totalCount } 구조의 데이터를 반환한다고 가정
      const { results, totalCount } = await propertyService.getProperties(pageNum, ITEMS_PER_PAGE, filters);

      // 페이지별 번호 부여
      const offset = (pageNum - 1) * ITEMS_PER_PAGE;
      const numberedData = results.map((item, idx) => ({
        ...item,
        property_number: offset + idx + 1,
      }));

      setProperties(numberedData);
      setTotalPages(Math.ceil(totalCount / ITEMS_PER_PAGE));
    } catch (err) {
      console.error(err);
      setError(err.message || "매물 정보를 불러오는 데 실패했습니다.");
    } finally {
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
  }, [searchTerm, searchType, excludeNames, statusFilter]);

  // -----------------------
  // 6) 페이지네이션 핸들러
  // -----------------------
  const handlePageChange = (newPage) => {
    setPage(newPage);
    setSearchParams({ page: newPage.toString() });
  };

  // -----------------------
  // 7) 통합 검색 함수 (전화번호 포맷팅 포함)
  // -----------------------
  const handleSearch = (value) => {
    let finalValue = value;
    if (searchType === 'owner_contact') {
      finalValue = formatPhoneNumber(value) || value;
    }
    setSearchTerm(finalValue);
    setPage(1);
    setSearchParams({ page: '1' });
    fetchProperties(1);
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

  // -----------------------
  // 9) 작업 상태(라디오) 변경 핸들러
  // -----------------------
  const handleStatusFilterChange = (status) => {
    if (status === '전체') {
      // '전체'가 선택되면 상태 필터 해제
      setStatusFilter('');
    } else {
      // 같은 상태가 다시 선택되면 해제, 아니면 해당 상태로 설정
      setStatusFilter(statusFilter === status ? '' : status);
    }
  };

  // -----------------------
  // 10) 신규 매물 등록 핸들러
  // -----------------------
  const handlePropertyCreate = () => {
    navigate('/properties/create');
  };

  // -----------------------
  // 11) 로딩/에러 처리
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
  // 12) 렌더링
  // -----------------------
  const PAGE_GROUP_SIZE = 10;
  const currentGroup = Math.floor((page - 1) / PAGE_GROUP_SIZE);
  const startPage = currentGroup * PAGE_GROUP_SIZE + 1;
  const endPage = Math.min(startPage + PAGE_GROUP_SIZE - 1, totalPages);

  return (
    <Container fluid className="py-4 bg-light min-vh-100">
      <Card className="shadow-sm mb-4">
        <Card.Body>
          {/* 상단 타이틀, 작업 상태 필터, 신규 매물 등록 버튼 */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="text-primary mb-0" style={{ fontSize: '1.5rem' }}>
                <FaBuilding className="me-2" />
                부동산 매물 장부
              </h1>
            </div>
            {/* <div className="d-flex align-items-center">
              <span className="me-3 fw-bold">작업 상태:</span>
              {statusOptions.map((status, index) => (
                <Form.Check
                  key={index}
                  type="radio"
                  id={`status-${index}`}
                  name="status-filter"
                  label={status}
                  checked={status === '전체' ? statusFilter === '' : statusFilter === status}
                  onChange={() => handleStatusFilterChange(status)}
                  className="me-3"
                />
              ))}
            </div> */}
            <div>
              <Button variant="primary" className="d-flex align-items-center" onClick={handlePropertyCreate}>
                <FaPlus className="me-2" />
                신규 매물 등록
              </Button>
            </div>
          </div>

          {/* 검색 및 필터 버튼 영역 */}
          <Row className="g-3 mb-4">
            <Col md={1}>
              <Form.Select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                className="shadow-sm border-0"
              >
                <option value="property_name">단지명</option>
                <option value="owner_contact">연락처</option>
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(tempSearchTerm);
                    }
                  }}
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
                      transform: 'translateY(-50%)',
                    }}
                  >
                    <FaTimes />
                  </button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleSearch(tempSearchTerm)}
                  style={{
                    position: 'absolute',
                    right: '0',
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                >
                  검색
                </Button>
              </div>
            </Col>
            {/* 필터 버튼 영역 */}
            <Col md={8}>
              <div className="d-flex flex-wrap align-items-center h-100">
                {filterForms.map((filterForm, index) => (
                  <FilterButton
                    key={index}
                    label={filterForm.label}
                    value={filterForm.value}
                    isActive={searchTerm === filterForm.value && searchType === filterForm.type}
                    onClick={() => handleFilterClick(filterForm)}
                    activeVariant={filterForm.activeVariant}
                    inactiveVariant={filterForm.inactiveVariant}
                  />
                ))}
              </div>
            </Col>
          </Row>

          {/* PropertyTable 렌더링 */}
          <div className="table-container shadow-sm rounded">
            <PropertyTable properties={properties} onRefresh={() => fetchProperties(page)} />
          </div>

          {/* 페이지네이션 */}
          <div className="d-flex justify-content-center mt-4">
            <Pagination>
              {startPage > 1 && (
                <Pagination.First onClick={() => handlePageChange(1)} title="처음 페이지로 이동" />
              )}
              {currentGroup > 0 && (
                <Pagination.Prev onClick={() => handlePageChange(startPage - 1)} title="이전 그룹으로 이동" />
              )}
              {[...Array(endPage - startPage + 1)].map((_, idx) => {
                const pageNum = startPage + idx;
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
              {endPage < totalPages && (
                <Pagination.Next onClick={() => handlePageChange(endPage + 1)} title="다음 그룹으로 이동" />
              )}
              {endPage < totalPages && (
                <Pagination.Last onClick={() => handlePageChange(totalPages)} title="마지막 페이지로 이동" />
              )}
            </Pagination>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default PropertyList;
