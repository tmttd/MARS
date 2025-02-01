import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Pagination, Badge } from 'react-bootstrap';
import { formatPrice } from '../../utils/FormatTools';
import { propertyService } from '../../services/api';

const PropertyListModal = ({ show, onHide, properties: initialProperties, onSelect }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [properties, setProperties] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  // 매물 종류별 Badge 색상 정의
  const propertyTypeColors = {
    아파트: 'primary',
    오피스텔: 'primary',
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

  useEffect(() => {
    fetchProperties(currentPage);
  }, [currentPage]);

  const fetchProperties = async (page) => {
    try {
      const { results, totalCount } = await propertyService.getProperties(page, limit);
      
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

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <>
      {console.info("properties:", properties)}
      <Modal show={show} onHide={onHide} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>현재 매물 목록</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Table className='table-striped table-bordered'>
            <thead>
              <tr>
                <th className="text-center" style={{ fontWeight: 'bold' }}>번호</th>
                <th className="text-center" style={{ fontWeight: 'bold' }}>소유주</th>
                <th className="text-center" style={{ fontWeight: 'bold' }}>소유주 연락처</th>
                <th className="text-center" style={{ fontWeight: 'bold' }}>매물종류</th>
                <th className="text-center" style={{ fontWeight: 'bold' }}>거래종류</th>
                <th className="text-center" style={{ fontWeight: 'bold' }}>단지명</th>
                <th className="text-center" style={{ fontWeight: 'bold' }}>세부주소</th>
                <th className="text-center" style={{ fontWeight: 'bold' }}>면적</th>
                <th className="text-center" style={{ fontWeight: 'bold' }}>가격</th>
                <th className="text-center" style={{ fontWeight: 'bold' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {properties.map(property => (
                <tr
                  key={property.property_id}
                  onDoubleClick={() => onSelect(property)}
                  style={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: '#f8f9fa'
                    }
                  }}
                >
                  <td className="text-center">{property.property_number}</td>
                  <td>{property.owner_name || '-'}</td>
                  <td>{property.owner_contact || '-'}</td>
                  <td className="text-center">
                    {renderPropertyTypeBadge(property.property_type)}
                  </td>
                  <td className="text-center">{property.transaction_type || '-'}</td>
                  <td>{property.property_name || '이름 없음'}</td>
                  <td>{property.detail_address || '-'}</td>
                  <td className="text-center">{property.area ? `${property.area}m²` : '-'}</td>
                  <td className="text-end">{property.price ? `${formatPrice(property.price)}` : '가격 정보 없음'}</td>
                  <td>{property.status || '-'}</td>
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