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

  // 검색 관련 상태
  // 드롭다운에서는 '연락처', '동호수', '소유주' 옵션만 제공 (단지명 검색은 필터 버튼으로 처리)
  const [searchType, setSearchType] = useState('owner_contact'); // 기본값: 연락처
  const [tempSearchTerm, setTempSearchTerm] = useState('');
  // **중요:** 페이지 최초 렌더링 시 "전체" 버튼이 활성화되도록,
  // 초기값은 filterForms의 "전체" 버튼의 value인 '' (빈 문자열)로 설정
  const [searchFilters, setSearchFilters] = useState({ property_name: '' });

  // '기타' 필터에서 제외할 이름들을 저장하는 상태 (필터 버튼 사용 시)
  const [excludeNames, setExcludeNames] = useState([]);
  // ※ 필요하지 않으면 이 상태는 주석 처리 가능
  // const [excludeNames, setExcludeNames] = useState([]); // (불필요하면 주석 처리)

  // 작업 상태 필터 (라디오 버튼 등, 필요 시 사용)
  const [statusFilter, setStatusFilter] = useState('');
  // ※ 필요하지 않으면 이 상태는 주석 처리 가능
  // const [statusFilter, setStatusFilter] = useState(''); // (불필요하면 주석 처리)

  // 서버로부터 받아온 데이터 상태
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
      // searchFilters와 statusFilter를 합쳐서 API 호출에 사용
      const filters = { ...searchFilters };
      if (statusFilter) {
        filters.status = statusFilter;
      }
      // 서버에서는 { results, totalCount } 형태의 데이터를 반환한다고 가정
      const { results, totalCount } = await propertyService.getProperties(pageNum, ITEMS_PER_PAGE, filters);

      // 각 항목에 페이지 내 번호를 부여
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
  // 5) 검색 조건 변경 시 page=1 리셋 및 데이터 재호출
  // -----------------------
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      setPage(1);
      setSearchParams({ page: '1' });
      fetchProperties(1);
    }
  }, [searchFilters, statusFilter]);

  // -----------------------
  // 5-1) 페이지 변경 시 검색 입력창 초기화
  // -----------------------
  useEffect(() => {
    // 페이지 변경 시 검색 입력창을 초기화하여 불편함을 해소
    setTempSearchTerm('');
  }, [page]);

  // -----------------------
  // 6) 페이지네이션 핸들러
  // -----------------------
  const handlePageChange = (newPage) => {
    setPage(newPage);
    setSearchParams({ page: newPage.toString() });
  };

  // -----------------------
  // 7) 검색 함수 (연락처 또는 상세주소 또는 소유주 검색)
  // -----------------------
  const handleSearch = (value) => {
    let finalValue = value.trim();
    if (searchType === 'owner_contact') {
      finalValue = formatPhoneNumber(finalValue) || finalValue;
    }
    setSearchFilters((prevFilters) => ({
      ...prevFilters,
      [searchType]: finalValue,
    }));
    // setPage와 setSearchParams는 이미 useEffect에 의해 관리됨
    // fetchProperties(1); 호출을 제거하여 중복 호출을 방지합니다.
  };

  // -----------------------
  // 8) 필터 버튼 클릭 핸들러 (예: 단지명 관련 필터)
  // -----------------------
  const handleFilterClick = (filterForm) => {
    // 검색 입력창 초기화
    setTempSearchTerm('');
    // 만약 "전체" 버튼이라면, 모든 검색 조건을 초기화합니다.
    if (filterForm.value === '') {
      setSearchFilters({ property_name: '' });
    } else {
      // "전체"가 아닌 경우, 기존의 다른 검색 조건(예: 연락처 등)을 제거하고, 해당 단지명으로만 설정합니다.
      const newFilters = { property_name: filterForm.value };
      if (filterForm.value === '기타' && filterForm.excludeNames) {
        newFilters.exclude_property_names = filterForm.excludeNames;
      }
      setSearchFilters(newFilters);
    }
  };

  // -----------------------
  // 9) 작업 상태(라디오) 변경 핸들러 (필요 시)
  // -----------------------
  const handleStatusFilterChange = (status) => {
    if (status === '전체') {
      setStatusFilter('');
    } else {
      setStatusFilter(statusFilter === status ? '' : status);
    }
  };
  // ※ 작업 상태 필터가 사용되지 않는다면 위 함수와 관련 상태는 주석 처리 가능:
  // const handleStatusFilterChange = (status) => { ... }; // (불필요하면 주석 처리)

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
  // 12) 페이지네이션 계산
  // -----------------------
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
            {/* 검색 타입 선택 드롭다운: 단지명 관련 옵션은 필터 버튼으로 처리하므로,
                드롭다운에서는 연락처, 동호수, 소유주 옵션만 제공 */}
            <Col md={1}>
              <Form.Select
                value={searchType}
                onChange={(e) => {
                  const newType = e.target.value;
                  setSearchType(newType);
                  // 검색 입력창 초기화
                  setTempSearchTerm('');
                  // 드롭다운과 관련된 모든 필터(연락처, 동호수, 소유주)를 제거
                  setSearchFilters((prevFilters) => {
                    const newFilters = { ...prevFilters };
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
            {/* 검색 입력창 */}
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
                {/* 수정된 X 버튼 조건: tempSearchTerm 또는 searchFilters[searchType]가 있을 때 */}
                {(tempSearchTerm || searchFilters[searchType]) && (
                  <button
                    className="clear-button"
                    onClick={() => {
                      setTempSearchTerm('');
                      // 현재 검색 타입에 해당하는 검색 조건을 제거
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
            {/* 필터 버튼 영역 (예: 단지명 필터 관련) */}
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
