// src/pages/CallList.js
import React, { useState, useEffect, useRef } from 'react';
import { Container, Spinner, Alert, Form, Row, Col, Card, Button, Pagination } from 'react-bootstrap';
import { FaSearch, FaPhone, FaUser, FaBuilding, FaTimes, FaCloudUploadAlt } from 'react-icons/fa';
import { useSearchParams, useNavigate } from 'react-router-dom';
import CallTable from '../components/call/CallTable';
import FilterButton from '../components/common/FilterButton';
import { filterForms } from '../components/common/FormControls/FormField';
import { callService, uploadService } from '../services/api';
import '../styles/PropertyList.css'; // 스타일 이름 그대로 사용

const CallList = () => {
  // -----------------------
  // 1) URL & 상태 관리
  // -----------------------
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // 페이지 번호 (URL 파라미터 page)
  const initialPage = Number(searchParams.get('page')) || 1;
  const [page, setPage] = useState(initialPage);

  // 검색 조건
  // 기본값을 ''(전체)로 하여, 첫 로드 시 '전체'가 활성화되도록 함
  const [tempSearchTerm, setTempSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // ''이면 "전체"
  const [searchType, setSearchType] = useState('property_name');

  // '기타' 필터에서 제외할 이름들을 저장하는 상태
  const [excludeNames, setExcludeNames] = useState([]);

  // 서버로부터 가져온 데이터
  const [calls, setCalls] = useState([]);
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
  const fetchCalls = async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      // 필터 객체 구성
      const filters = {};
      if (searchTerm) {
        filters[searchType] = searchTerm;
      }
      if (searchTerm === '기타' && excludeNames.length > 0) {
        filters.exclude_property_names = excludeNames;
      }

      // 서버로부터 { calls, totalCount } 구조를 받는다고 가정
      const { calls: fetchedCalls, totalCount } = await callService.getCalls(pageNum, ITEMS_PER_PAGE, filters);

      // 페이지별 번호 부여
      const offset = (pageNum - 1) * ITEMS_PER_PAGE;
      const numberedData = fetchedCalls.map((item, idx) => ({
        ...item,
        call_number: offset + idx + 1,
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

  // -----------------------
  // 3) 페이지 변경 시 서버 호출
  // -----------------------
  useEffect(() => {
    fetchCalls(page);
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
      // 첫 마운트 시에는 무시
      isInitialMount.current = false;
    } else {
      // 검색 조건이 바뀌면 1페이지로 이동
      setPage(1);
      setSearchParams({ page: '1' });
      fetchCalls(1);
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

  // 검색 버튼 클릭 시 동작
  const handleSearch = () => {
    setSearchTerm(tempSearchTerm);
  };

  // -----------------------
  // 7) 필터 버튼 클릭 핸들러
  // -----------------------
  const handleFilterClick = (filterForm) => {
    setSearchType(filterForm.type);
    setTempSearchTerm(filterForm.value);

    if (filterForm.value === '기타' && filterForm.excludeNames) {
      // '기타'인 경우, searchTerm을 '기타'로 설정하고 excludeNames를 저장
      setSearchTerm('기타');
      setExcludeNames(filterForm.excludeNames);
    } else {
      // '기타'가 아닌 경우, searchTerm을 해당 값으로 설정하고 excludeNames를 초기화
      setSearchTerm(filterForm.value);
      setExcludeNames([]);
    }
  };

  // -----------------------
  // 8) 파일 업로드 핸들러(기존과 동일)
  // -----------------------
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const response = await uploadService.uploadFile(file);
      console.log('Upload response:', response);
      // 업로드 후 현재 페이지 데이터 갱신
      fetchCalls(page);
    } catch (error) {
      console.error('Upload failed:', error);
      setError('파일 업로드에 실패했습니다.');
    }
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
                  연락처
                </option>
                <option value="customer_name">
                  성명
                </option>
                <option value="property_name">
                  단지명
                </option>
              </Form.Select>
            </Col>
            <Col md={3}>
              <div className="search-container" style={{ position: 'relative' }}>
                <FaSearch className="search-icon" />
                <Form.Control
                  type="text"
                  placeholder={
                    searchType === 'customer_contact' ? '연락처 검색'
                    : searchType === 'customer_name' ? '성명 검색'
                    : '단지명 검색'
                  }
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

          {/* CallTable 렌더링 */}
          <div className="table-container shadow-sm rounded">
            <CallTable 
              calls={calls}
              onUpdate={() => fetchCalls(page)} // 삭제 후 새로고침 등
              currentPage={page}
            />
          </div>

          {/* 페이지네이션 */}
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
