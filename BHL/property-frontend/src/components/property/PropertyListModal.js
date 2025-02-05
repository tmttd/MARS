// src/components/PropertyListModal.js
import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button, Table, Pagination, Badge, Form } from 'react-bootstrap';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { formatPhoneNumber } from '../../utils/FormatTools';
import { propertyService } from '../../services/api';
import FilterButton from '../../components/common/FilterButton';
import { filterForms } from '../../components/common/FormControls/FormField';
import '../../styles/PropertyListModal.css'; // CSS 파일 추가

const PropertyListModal = ({ show, onHide, properties: initialProperties, onSelect }) => {
  // -----------------------
  // 1) 상태 관리
  // -----------------------
  const [currentPage, setCurrentPage] = useState(1);
  const [properties, setProperties] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // 필터 관련 상태 (PropertyList와 동일)
  const [tempSearchTerm, setTempSearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('property_name');
  const [excludeNames, setExcludeNames] = useState([]);

  // 선택된 매물을 구분하기 위한 상태 추가
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);

  // 첫 마운트 구분용 (필터 조건 변경 시 페이지 리셋 처리)
  const isInitialMount = useRef(true);

  // 매물 종류별 Badge 색상 정의
  const propertyTypeColors = {
    아파트: 'primary',
    오피스텔: 'success',
    상가: 'info',
    기타: 'secondary'
  };

  // Badge 렌더링 함수
  const renderPropertyTypeBadge = (propertyType) => {
    const badgeColor = propertyTypeColors[propertyType] || 'secondary';
    return (
      <Badge bg={badgeColor}>
        {propertyType || '기타'}
      </Badge>
    );
  };

  // -----------------------
  // 2) 서버 호출 함수 (필터 포함)
  // -----------------------
  const fetchProperties = async (page) => {
    try {
      // 필터 객체 구성 (필요한 경우 필터를 확장 가능)
      const filters = {};
      if (searchTerm) {
        filters[searchType] = searchTerm;
      }
      if (searchTerm === '기타' && excludeNames.length > 0) {
        filters.exclude_property_names = excludeNames;
      }

      const { results, totalCount } = await propertyService.getProperties(page, limit, filters);
      
      // 페이지별 번호 부여
      const offset = (page - 1) * limit;
      const numberedData = results.map((item, idx) => ({
        ...item,
        property_number: offset + idx + 1,
      }));

      setProperties(numberedData);
      setTotalCount(totalCount);
    } catch (error) {
      console.error('매물 목록 조회 실패:', error);
    }
  };

  const totalPages = Math.ceil(totalCount / limit);

  // -----------------------
  // 3) 페이지 변경 및 필터링 조건 변경 시 서버 호출
  // -----------------------
  // 페이지 번호 변경 시 호출
  useEffect(() => {
    fetchProperties(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  // 필터 조건 변경 시 페이지를 1로 리셋하고 서버 호출
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      setCurrentPage(1);
      fetchProperties(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, searchType, excludeNames]);

  // -----------------------
  // 4) 이벤트 핸들러
  // -----------------------
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleSearch = (value) => {
    let finalValue = value;
    if (searchType === 'owner_contact') {
      finalValue = formatPhoneNumber(value) || value;
    }
    setSearchTerm(finalValue);
    setCurrentPage(1);
  };

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
  // 5) 렌더링
  // -----------------------
  return (
    <>
      {console.info("properties:", properties)}
      <Modal show={show} onHide={onHide} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>현재 매물 목록</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {/* 검색 및 필터링 UI */}
          <div className="mb-3">
            <div className="d-flex align-items-center">
              <Form.Select
                value={searchType}
                onChange={(e) => setSearchType(e.target.value)}
                style={{ width: '150px' }}
                className="me-2"
              >
                <option value="property_name">단지명</option>
                <option value="owner_contact">연락처</option>
              </Form.Select>
              <div className="position-relative flex-grow-1 me-2">
                <FaSearch
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#aaa'
                  }}
                />
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
                  style={{ paddingLeft: '2.5rem' }}
                />
                {tempSearchTerm && (
                  <Button
                    variant="link"
                    onClick={() => {
                      setTempSearchTerm('');
                      setSearchTerm('');
                    }}
                    style={{
                      position: 'absolute',
                      right: '40px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      padding: 0,
                      color: '#aaa'
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
                    transform: 'translateY(-50%)'
                  }}
                >
                  검색
                </Button>
              </div>
            </div>
            {/* 필터 버튼 영역 */}
            <div className="d-flex flex-wrap align-items-center mt-2">
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
                  className="me-2 mb-2"
                />
              ))}
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
              {properties.map(property => (
                <tr
                  key={property.property_id}
                  onClick={() => {
                    console.log('Row clicked:', property.property_id);
                    setSelectedPropertyId(property.property_id);
                  }}
                  onDoubleClick={() => onSelect(property)}
                  className={selectedPropertyId === property.property_id ? 'selected-row' : ''}
                  style={{ cursor: 'pointer' }}
                >
                  <td className="text-center">{property.property_number}</td>
                  <td>{property.owner_name || '-'}</td>
                  <td>{property.owner_contact || '-'}</td>
                  <td className="text-center">
                    {renderPropertyTypeBadge(property.property_type)}
                  </td>
                  <td className="text-center">{property.transaction_type || '-'}</td>
                  <td>{property.property_name || '-'}</td>
                  <td>{property.detail_address || '-'}</td>
                  <td className="text-center">{property.area ? `${property.area}평` : '-'}</td>
                  <td className="text-end">{property.deposit ? `${property.deposit}` : '-'}</td>
                  <td className="text-end">{property.price ? `${property.price}` : '-'}</td>
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
    </>
  );
};

export default PropertyListModal;
