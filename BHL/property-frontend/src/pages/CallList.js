// src/pages/CallList.js
import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Spinner,
  Alert,
  Form,
  Row,
  Col,
  Card,
  Button,
  Pagination,
} from 'react-bootstrap';
import {
  FaSearch,
  FaPhone,
  FaUser,
  FaBuilding,
  FaTimes,
  FaCloudUploadAlt,
} from 'react-icons/fa';
import { useSearchParams, useNavigate } from 'react-router-dom';
import CallTable from '../components/call/CallTable';
import FilterButton from '../components/common/FilterButton';
import { filterForms } from '../components/common/FormControls/FormField';
import { callService, uploadService } from '../services/api';
import { formatPhoneNumber, formatToISODatetime } from '../utils/FormatTools';
import '../styles/PropertyList.css'; // 기존 스타일 재사용
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const CallList = () => {
  // -----------------------
  // 1) URL 및 상태 관리
  // -----------------------
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialPage = Number(searchParams.get('page')) || 1;
  const [page, setPage] = useState(initialPage);

  // 검색 관련 상태
  // 드롭다운에서는 '연락처', '성명', '통화일시' 옵션만 제공 (단지명 검색은 필터 버튼으로 처리)
  const [searchType, setSearchType] = useState('customer_contact'); // 기본값: 연락처
  const [tempSearchTerm, setTempSearchTerm] = useState('');
  // **중요:** 초기에는 "전체"가 활성화되도록, filterForms의 "전체" 버튼의 value인 빈 문자열('')와 일치시킵니다.
  const [searchFilters, setSearchFilters] = useState({ property_name: '' });

  // 날짜 검색을 위한 상태 (통화일시)
  const [recordingDate, setRecordingDate] = useState(null);

  // 서버로부터 받아온 데이터 상태
  const [calls, setCalls] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const ITEMS_PER_PAGE = 10;
  const isInitialMount = useRef(true);

  // -----------------------
  // 2) 서버 호출 함수
  // -----------------------
  const fetchCalls = async (pageNum = 1) => {
    setLoading(true);
    setError(null);
    try {
      // 필터 객체 구성: searchFilters와 추가로 recordingDate가 있다면 포함
      const filters = { ...searchFilters };
      if (recordingDate) {
        filters.recording_date = formatToISODatetime(recordingDate);
      }
      // callService.getCalls는 { calls, totalCount } 구조의 데이터를 반환한다고 가정
      const { calls: fetchedCalls, totalCount } = await callService.getCalls(
        pageNum,
        ITEMS_PER_PAGE,
        filters
      );

      // 각 항목에 페이지 번호를 부여
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
  // 5) 검색 조건 변경 시 page=1 리셋 및 데이터 재호출
  // -----------------------
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      setPage(1);
      setSearchParams({ page: '1' });
      fetchCalls(1);
    }
  }, [searchFilters, recordingDate]);

  // -----------------------
  // 5-1) 페이지 변경 시 검색 입력창 초기화
  // -----------------------
  useEffect(() => {
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
  // 7) 통합 검색 함수 (전화번호 포맷팅 포함)
  // -----------------------
  const handleSearch = (value) => {
    let finalValue = value.trim();
    if (searchType === 'customer_contact') {
      finalValue = formatPhoneNumber(finalValue) || finalValue;
    }
    // 기존의 검색 조건과 병합하여 해당 필드 업데이트
    setSearchFilters((prevFilters) => ({
      ...prevFilters,
      [searchType]: finalValue,
    }));
    // useEffect가 searchFilters 변경을 감지하여 API 호출하므로, 여기서 fetchCalls는 호출하지 않습니다.
  };

  // -----------------------
  // 8) 필터 버튼 클릭 핸들러 (예: 단지명 관련 필터)
  // -----------------------
  const handleFilterClick = (filterForm) => {
    // 검색 입력창 초기화
    setTempSearchTerm('');
    // 단지명 필터의 경우, "전체" 버튼이면 빈 문자열로 초기화,
    // 그 외에는 해당 단지명만 적용 (기타의 경우 exclude_property_names 포함)
    if (filterForm.value === '') {
      setSearchFilters({ property_name: '' });
    } else {
      const newFilters = { property_name: filterForm.value };
      if (filterForm.value === '기타' && filterForm.excludeNames) {
        newFilters.exclude_property_names = filterForm.excludeNames;
      }
      setSearchFilters(newFilters);
    }
    // ★★ 여기서 기존에 있던 setSearchType(filterForm.type)를 제거합니다.
    // 즉, 드롭다운의 검색 타입은 사용자가 직접 선택한 상태를 유지합니다.
  };

  // -----------------------
  // 9) 파일 업로드 핸들러 (기존과 동일)
  // -----------------------
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const response = await uploadService.uploadFile(file);
      console.log('Upload response:', response);
      fetchCalls(page);
    } catch (error) {
      console.error('Upload failed:', error);
      setError('파일 업로드에 실패했습니다.');
    }
  };

  // -----------------------
  // 10) 로딩/에러 처리
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
  // 11) 페이지네이션 계산
  // -----------------------
  const PAGE_GROUP_SIZE = 10;
  const currentGroup = Math.floor((page - 1) / PAGE_GROUP_SIZE);
  const startPage = currentGroup * PAGE_GROUP_SIZE + 1;
  const endPage = Math.min(startPage + PAGE_GROUP_SIZE - 1, totalPages);

  return (
    <Container fluid className="py-4 bg-light min-vh-100">
      <Card className="shadow-sm mb-4">
        <Card.Body>
          {/* 상단 타이틀 및 파일 업로드 버튼 */}
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
                <Button variant="primary" as="span" className="d-flex align-items-center">
                  <FaCloudUploadAlt className="me-2" />
                  음성파일 업로드
                </Button>
              </label>
            </div>
          </div>
          {/* 검색 필터 UI */}
          <Row className="g-3 mb-4">
            {/* 검색 타입 선택 드롭다운:
                CallList의 경우 '연락처', '성명', '통화일시' 옵션 제공 (단지명 옵션 제거) */}
            <Col md={1}>
              <Form.Select
                value={searchType}
                onChange={(e) => {
                  const newType = e.target.value;
                  setSearchType(newType);
                  // 검색 입력창 초기화
                  setTempSearchTerm('');
                  // 드롭다운과 관련된 필터(연락처, 성명, 통화일시)를 제거
                  setSearchFilters((prevFilters) => {
                    const newFilters = { ...prevFilters };
                    delete newFilters["customer_contact"];
                    delete newFilters["customer_name"];
                    delete newFilters["recording_date"];
                    return newFilters;
                  });
                }}
                className="shadow-sm border-0"
              >
                <option value="customer_contact">연락처</option>
                <option value="customer_name">성명</option>
                <option value="recording_date">통화일시</option>
              </Form.Select>
            </Col>
            {/* 검색 입력창 */}
            <Col md={3}>
              <div className="search-container" style={{ position: 'relative' }}>
                <FaSearch className="search-icon" />
                {searchType === 'recording_date' ? (
                  <DatePicker
                    selected={recordingDate}
                    onChange={(date) => {
                      setRecordingDate(date);
                      setSearchFilters((prevFilters) => ({
                        ...prevFilters,
                        recording_date: formatToISODatetime(date),
                      }));
                    }}
                    dateFormat="yyyy-MM-dd"
                    placeholderText="날짜 선택"
                    className="form-control search-input shadow-sm border-0"
                  />
                ) : (
                  <Form.Control
                    type="text"
                    placeholder={
                      searchType === 'customer_contact'
                        ? '연락처 검색'
                        : searchType === 'customer_name'
                        ? '성명 검색'
                        : ''
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
                )}
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
            {/* 필터 버튼 영역 */}
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
          {/* CallTable 렌더링 */}
          <div className="table-container shadow-sm rounded">
            <CallTable
              calls={calls}
              onUpdate={() => fetchCalls(page)}
              currentPage={page}
            />
          </div>
          {/* 페이지네이션 */}
          <div className="d-flex justify-content-center mt-4">
            <Pagination>
              {startPage > 1 && (
                <Pagination.First
                  onClick={() => handlePageChange(1)}
                  title="처음 페이지로 이동"
                />
              )}
              {currentGroup > 0 && (
                <Pagination.Prev
                  onClick={() => handlePageChange(startPage - 1)}
                  title="이전 그룹으로 이동"
                />
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
                <Pagination.Next
                  onClick={() => handlePageChange(endPage + 1)}
                  title="다음 그룹으로 이동"
                />
              )}
              {endPage < totalPages && (
                <Pagination.Last
                  onClick={() => handlePageChange(totalPages)}
                  title="마지막 페이지로 이동"
                />
              )}
            </Pagination>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default CallList;
