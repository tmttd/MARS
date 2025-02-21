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
  // URL 및 상태 관리
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialPage = Number(searchParams.get('page')) || 1;
  const [page, setPage] = useState(initialPage);

  // 검색 관련 상태
  const [searchType, setSearchType] = useState('owner_contact'); // 기본: 연락처
  const [tempSearchTerm, setTempSearchTerm] = useState('');
  const [searchFilters, setSearchFilters] = useState({ property_name: '' });
  const [excludeNames, setExcludeNames] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');

  // 정렬 상태: null이면 기본(등록일자 내림차순), "detail_address"/"-detail_address", "property_name" 등
  const [ordering, setOrdering] = useState(null);

  // 서버에서 받아온 데이터 상태
  const [properties, setProperties] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const ITEMS_PER_PAGE = 10;
  const isInitialMount = useRef(true);

  // 서버 호출 함수
  const fetchProperties = async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      const filters = { ...searchFilters };
      if (statusFilter) filters.status = statusFilter;
      if (ordering) filters.ordering = ordering;
      const { results, totalCount } = await propertyService.getProperties(pageNum, ITEMS_PER_PAGE, filters);
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

  // 페이지 변경 시 호출
  useEffect(() => {
    fetchProperties(page);
  }, [page]);

  // URL 쿼리 파라미터 변경 감지
  useEffect(() => {
    const newPage = Number(searchParams.get('page')) || 1;
    if (newPage !== page) setPage(newPage);
  }, [searchParams, page]);

  // 검색 조건 변경 시 페이지 1로 리셋
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      setPage(1);
      setSearchParams({ page: '1' });
      fetchProperties(1);
    }
  }, [searchFilters, statusFilter]);

  // 정렬 상태(ordering) 변경 시 페이지 1로 리셋
  useEffect(() => {
    setPage(1);
    setSearchParams({ page: '1' });
    fetchProperties(1);
  }, [ordering]);

  // 페이지 변경 시 검색 입력창 초기화
  useEffect(() => {
    setTempSearchTerm('');
  }, [page]);

  // 페이지네이션 핸들러
  const handlePageChange = (newPage) => {
    setPage(newPage);
    setSearchParams({ page: newPage.toString() });
  };

  // 검색 함수
  const handleSearch = (value) => {
    let finalValue = value.trim();
    if (searchType === 'owner_contact') {
      finalValue = formatPhoneNumber(finalValue) || finalValue;
    }
    setSearchFilters((prev) => ({
      ...prev,
      [searchType]: finalValue,
    }));
  };

  // 필터 버튼 클릭 핸들러 (단지명 관련 필터)
  const handleFilterClick = (filterForm) => {
    setTempSearchTerm('');
    if (filterForm.value === '') {
      // '전체' 클릭 시: property_name 필터 초기화하고, 기본 정렬(등록일자 정렬)로 복귀
      setSearchFilters({ property_name: '' });
      setOrdering(null);
    } else {
      // 나머지 필터 버튼 클릭 시: property_name 필터 적용과 함께 오름차순 정렬을 상세주소 기준("detail_address")으로 설정
      const newFilters = { property_name: filterForm.value };
      if (filterForm.value === '기타' && filterForm.excludeNames) {
        newFilters.exclude_property_names = filterForm.excludeNames;
      }
      setSearchFilters(newFilters);
      setOrdering("detail_address");
    }
  };

  // 작업 상태(라디오) 변경 핸들러
  const handleStatusFilterChange = (status) => {
    if (status === '전체') {
      setStatusFilter('');
    } else {
      setStatusFilter(statusFilter === status ? '' : status);
    }
  };

  // 신규 매물 등록 핸들러
  const handlePropertyCreate = () => {
    navigate('/properties/create');
  };

  // 상세주소 헤더 클릭 시 정렬 토글: null → "detail_address" → "-detail_address" → null
  const toggleDetailAddressSort = () => {
    setOrdering((prev) => {
      if (prev !== "detail_address" && prev !== "-detail_address") {
        return "detail_address";
      } else if (prev === "detail_address") {
        return "-detail_address";
      } else {
        return null;
      }
    });
  };

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

  const PAGE_GROUP_SIZE = 10;
  const currentGroup = Math.floor((page - 1) / PAGE_GROUP_SIZE);
  const startPage = currentGroup * PAGE_GROUP_SIZE + 1;
  const endPage = Math.min(startPage + PAGE_GROUP_SIZE - 1, totalPages);

  return (
    <Container fluid className="py-4 bg-light min-vh-100">
      <Card className="shadow-sm mb-4">
        <Card.Body>
          {/* 상단 타이틀 및 신규 매물 등록 버튼 */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="text-primary mb-0" style={{ fontSize: '1.5rem' }}>
                <FaBuilding className="me-2" />
                부동산 매물 장부
              </h1>
            </div>
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
                onChange={(e) => {
                  const newType = e.target.value;
                  setSearchType(newType);
                  setTempSearchTerm('');
                  setSearchFilters((prev) => {
                    const newFilters = { ...prev };
                    delete newFilters["owner_contact"];
                    delete newFilters["detail_address"];
                    delete newFilters["owner_name"];
                    return newFilters;
                  });
                }}
                className="shadow-sm border-0"
              >
                <option value="owner_contact">연락처</option>
                <option value="detail_address">동호수</option>
                <option value="owner_name">소유주</option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <div className="search-container" style={{ position: 'relative' }}>
                <FaSearch className="search-icon" />
                <Form.Control
                  type="text"
                  placeholder={
                    searchType === 'owner_contact' ? '연락처 검색' :
                    searchType === 'detail_address' ? '동호수로 검색' :
                    searchType === 'owner_name' ? '소유주 검색' : ''
                  }
                  value={tempSearchTerm}
                  onChange={(e) => setTempSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch(tempSearchTerm);
                    }
                  }}
                  className="search-input shadow-sm border-0"
                />
                {(tempSearchTerm || searchFilters[searchType]) && (
                  <button
                    className="clear-button"
                    onClick={() => {
                      setTempSearchTerm('');
                      setSearchFilters((prev) => {
                        const newFilters = { ...prev };
                        delete newFilters[searchType];
                        return newFilters;
                      });
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
            <Col md={8}>
              <div className="d-flex flex-wrap align-items-center h-100">
                {filterForms.map((filterForm, index) => (
                  <FilterButton
                    key={index}
                    label={filterForm.label}
                    value={filterForm.value}
                    isActive={searchFilters[filterForm.type] === filterForm.value}
                    onClick={() => handleFilterClick(filterForm)}
                    activeVariant={filterForm.activeVariant}
                    inactiveVariant={filterForm.inactiveVariant}
                  />
                ))}
              </div>
            </Col>
          </Row>

          {/* PropertyTable 렌더링 – 헤더의 상세주소 클릭 시 toggleDetailAddressSort 호출 */}
          <div className="table-container shadow-sm rounded">
            <PropertyTable 
              properties={properties} 
              onRefresh={() => fetchProperties(page)}
              onSortDetailAddress={toggleDetailAddressSort}
              ordering={ordering}
            />
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
