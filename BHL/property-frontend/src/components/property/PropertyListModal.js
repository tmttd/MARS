// src/components/PropertyListModal.js
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Table, Pagination, Badge, Form } from 'react-bootstrap';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { formatPhoneNumber } from '../../utils/FormatTools';
import { propertyService } from '../../services/api';
import FilterButton from '../../components/common/FilterButton';
import { filterForms } from '../../components/common/FormControls/FormField';
import '../../styles/PropertyListModal.css';

const PropertyListModal = ({ show, onHide, onSelect }) => {
  // -----------------------
  // 1) 상태 관리
  // -----------------------
  const [currentPage, setCurrentPage] = useState(1);
  const [properties, setProperties] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // 검색 입력창 값
  const [tempSearchTerm, setTempSearchTerm] = useState('');

  // **searchFilters** 객체로 여러 필드 동시 관리.
  // PropertyList와 동일하게, 처음에는 단지명 "전체" = '' 으로 설정
  const [searchFilters, setSearchFilters] = useState({ property_name: '' });

  // 드롭다운에서 선택된 검색 타입(연락처, 소유주, 동호수)
  const [searchType, setSearchType] = useState('owner_contact');

  // 첫 마운트 판별 (필터 변경 시 페이지 리셋)
  const isInitialMount = useRef(true);

  // 더블 클릭/선택된 매물
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);

  // -----------------------
  // 2) 서버 호출
  // -----------------------
  const fetchProperties = async (pageNum) => {
    try {
      // PropertyList처럼, searchFilters를 그대로 전달
      const filters = { ...searchFilters };
      const { results, totalCount } = await propertyService.getProperties(pageNum, limit, filters);
      const offset = (pageNum - 1) * limit;
      const numbered = results.map((item, idx) => ({
        ...item,
        property_number: offset + idx + 1,
      }));
      setProperties(numbered);
      setTotalCount(totalCount);
    } catch (error) {
      console.error('매물 목록 조회 실패:', error);
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  // -----------------------
  // 3) useEffect
  // -----------------------
  useEffect(() => {
    fetchProperties(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      // searchFilters 변경 시 page=1로 리셋, 다시 fetch
      setCurrentPage(1);
      fetchProperties(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchFilters]);

  // -----------------------
  // 4) 이벤트 핸들러
  // -----------------------
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  /**
   * 드롭다운 변경 시, PropertyList와 동일하게
   * - tempSearchTerm 초기화
   * - 기존에 설정된 (owner_contact, owner_name, detail_address) 삭제
   */
  const handleSearchTypeChange = (newType) => {
    setSearchType(newType);
    setTempSearchTerm('');
    setSearchFilters((prev) => {
      const updated = { ...prev };
      // 연락처, 소유주, 동호수 필드는 제거 (단지명은 필터 버튼이 관리하므로 유지)
      delete updated.owner_contact;
      delete updated.owner_name;
      delete updated.detail_address;
      return updated;
    });
  };

  /**
   * 검색 함수 (PropertyList와 동일)
   * - searchType: owner_contact | owner_name | detail_address
   * - 병합 후 setSearchFilters
   */
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

  /**
   * X 버튼 클릭 (검색창 초기화)
   * - tempSearchTerm 비우고 searchFilters에서 해당 키만 제거
   */
  const clearSearchField = () => {
    setTempSearchTerm('');
    setSearchFilters((prev) => {
      const updated = { ...prev };
      delete updated[searchType];
      return updated;
    });
  };

  /**
   * 필터 버튼 클릭 (단지명 필터) - PropertyList 로직 그대로
   * - "전체" 클릭 시 searchFilters를 { property_name: '' }로 재설정 (=> 기존 연락처 등 제거)
   * - "기타" 클릭 시 '기타' + exclude_property_names
   * - 그 외 단지명 클릭 시 해당 단지명만
   */
  const handleFilterClick = (filterForm) => {
    // 검색 입력창 초기화
    setTempSearchTerm('');

    if (filterForm.value === '') {
      // "전체" 버튼이면 property_name만 ''로
      setSearchFilters({ property_name: '' });
    } else {
      // "전체"가 아닌 경우
      const newFilters = { property_name: filterForm.value };
      if (filterForm.value === '기타' && filterForm.excludeNames) {
        newFilters.exclude_property_names = filterForm.excludeNames;
      }
      setSearchFilters(newFilters);
    }
  };

  // -----------------------
  // 5) 렌더링
  // -----------------------
  // 배지
  const propertyTypeColors = {
    아파트: 'primary',
    오피스텔: 'success',
    상가: 'info',
    기타: 'secondary',
  };
  const renderPropertyTypeBadge = (type) => {
    const color = propertyTypeColors[type] || 'secondary';
    return <Badge bg={color}>{type || '기타'}</Badge>;
  };

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>현재 매물 목록</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* 검색/필터 영역 */}
        <div className="mb-3">
          <div className="d-flex align-items-center">
            {/* 드롭다운 */}
            <Form.Select
              value={searchType}
              onChange={(e) => handleSearchTypeChange(e.target.value)}
              style={{ width: '150px' }}
              className="me-2"
            >
              <option value="owner_contact">연락처</option>
              <option value="owner_name">소유주</option>
              <option value="detail_address">동호수</option>
            </Form.Select>
            {/* 검색 입력창 */}
            <div className="position-relative flex-grow-1 me-2">
              <FaSearch
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#aaa',
                }}
              />
              <Form.Control
                type="text"
                placeholder={
                  searchType === 'owner_contact'
                    ? '연락처 검색'
                    : searchType === 'owner_name'
                    ? '소유주 검색'
                    : '동호수 검색'
                }
                value={tempSearchTerm}
                onChange={(e) => setTempSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch(tempSearchTerm);
                }}
                style={{ paddingLeft: '2.5rem' }}
              />
              {(tempSearchTerm || searchFilters[searchType]) && (
                <Button
                  variant="link"
                  onClick={clearSearchField}
                  style={{
                    position: 'absolute',
                    right: '40px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    padding: 0,
                    color: '#aaa',
                  }}
                >
                  <FaTimes />
                </Button>
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
          </div>
          {/* 필터 버튼 영역 (단지명) */}
          <div className="d-flex flex-wrap align-items-center mt-2">
            {filterForms.map((filterForm, index) => {
              // PropertyList 처럼: filterForm.type === 'property_name' 기준
              const isActive =
                searchFilters.property_name === filterForm.value &&
                !searchFilters.exclude_property_names;
              const isEtcActive =
                filterForm.value === '기타' &&
                searchFilters.property_name === '기타' &&
                searchFilters.exclude_property_names?.length > 0;

              return (
                <FilterButton
                  key={index}
                  label={filterForm.label}
                  value={filterForm.value}
                  isActive={isActive || isEtcActive}
                  onClick={() => handleFilterClick(filterForm)}
                  activeVariant={filterForm.activeVariant}
                  inactiveVariant={filterForm.inactiveVariant}
                  className="me-2 mb-2"
                />
              );
            })}
          </div>
        </div>
        {/* 매물 테이블 */}
        <Table className="table-striped table-bordered">
          <thead>
            <tr>
              <th className="text-center" style={{ fontWeight: 'bold' }}>번호</th>
              <th className="text-center" style={{ fontWeight: 'bold' }}>소유주</th>
              <th className="text-center" style={{ fontWeight: 'bold' }}>연락처</th>
              <th className="text-center" style={{ fontWeight: 'bold' }}>종류</th>
              <th className="text-center" style={{ fontWeight: 'bold' }}>거래 종류</th>
              <th className="text-center" style={{ fontWeight: 'bold' }}>단지명</th>
              <th className="text-center" style={{ fontWeight: 'bold' }}>상세주소</th>
              <th className="text-center" style={{ fontWeight: 'bold' }}>보증금(만원)</th>
              <th className="text-center" style={{ fontWeight: 'bold' }}>가격(만원)</th>
              <th className="text-center" style={{ fontWeight: 'bold' }}>면적</th>
              <th className="text-center" style={{ fontWeight: 'bold' }}>메모</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => (
              <tr
                key={property.property_id}
                onClick={() => setSelectedPropertyId(property.property_id)}
                onDoubleClick={() => onSelect(property)}
                className={
                  selectedPropertyId === property.property_id ? 'selected-row' : ''
                }
                style={{ cursor: 'pointer' }}
              >
                <td className="text-center">{property.property_number}</td>
                <td>{property.owner_name || '-'}</td>
                <td>{property.owner_contact || '-'}</td>
                <td className="text-center">{property.property_type || '-'}</td>
                <td className="text-center">{property.transaction_type || '-'}</td>
                <td>{property.property_name || '-'}</td>
                <td>{property.detail_address || '-'}</td>
                <td className="text-end">{property.deposit ? property.deposit : '-'}</td>
                <td className="text-end">{property.price ? property.price : '-'}</td>
                <td className="text-center">{property.area ? `${property.area}평` : '-'}</td>
                <td>{property.memo || '-'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Modal.Body>
      <Modal.Footer>
        <div className="w-100 d-flex justify-content-center mb-3">
          <Pagination>
            <Pagination.First
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            />
            <Pagination.Prev
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            />
            {[...Array(totalPages)].map((_, idx) => (
              <Pagination.Item
                key={idx + 1}
                active={idx + 1 === currentPage}
                onClick={() => handlePageChange(idx + 1)}
              >
                {idx + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            />
            <Pagination.Last
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            />
          </Pagination>
        </div>
        <Button variant="secondary" onClick={onHide}>
          닫기
        </Button>
        <Button variant="primary" onClick={onHide}>
          확인
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PropertyListModal;
