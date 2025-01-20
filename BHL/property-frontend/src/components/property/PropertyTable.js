// src/components/property/PropertyTable.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Badge } from 'react-bootstrap';
import { propertyService } from '../../services/api';
import PropertyInfoModal from './detail/PropertyInfoModal';

const PropertyTable = ({ properties, onRefresh }) => {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    return date.toLocaleString('ko-KR');
  };

  const handleShowDetail = (property) => {
    setSelectedProperty(property);
  };
   
  useEffect(() => {
    if (selectedProperty) {
      setShowDetailModal(true);
    }
  }, [selectedProperty]);

  const handleCloseDetail = () => {
    setShowDetailModal(false);
    setSelectedProperty(null);
  };

  const handleDelete = async (propertyId) => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      try {
        await propertyService.deleteProperty(propertyId);
        // 삭제 성공 후 리스트 갱신
        if (onRefresh) onRefresh();
      } catch (error) {
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const renderCell = (property, field) => {
    // 가격 포맷팅 로직 (예: 억/만원)
    if (field === 'price') {
      const priceValue = property[field];
      if (priceValue) {
        if (priceValue >= 10000) {
          const uk = Math.floor(priceValue / 10000); // 만 단위로 변환
          const man = priceValue % 10000;            // 나머지 만원
          const formattedPrice = [];
          if (uk > 0) formattedPrice.push(`${uk}억`);
          if (man > 0) formattedPrice.push(`${man}만원`);
          return formattedPrice.join(' ') || '-';
        } else {
          return `${priceValue}만원`;
        }
      }
      return '-';
    }

    // address 필드 (city + district + legal_dong 등 합치기)
    if (field === 'address') {
      return `${property.district || ''} ${property.legal_dong || ''} ${property.detail_address || ''}`.trim() || '-';
    }

    // 일반 필드 처리
    return property[field] || '-';
  };

  const propertyTypeColors = {
    아파트: 'primary',
    상가: 'success',
    기타: 'warning',
    오피스텔: 'info',
    사무실: 'dark',
  };

  const renderPropertyTypeBadge = (propertyType) => {
    const badgeColor = propertyTypeColors[propertyType] || 'secondary';
    return <Badge bg={badgeColor}>{propertyType}</Badge>;
  };

  return (
    <div className="table-responsive">
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>번호</th>
            <th>등록일자</th>
            <th>종류</th>
            <th>거래 종류</th>
            <th>주소</th>
            <th>단지명</th>
            <th>가격</th>
            <th>소유주</th>
            <th>연락처</th>
            <th>상태</th>
            <th>메모</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property, index) => (
            <tr key={property.property_id}>
              {/* property_number가 있다면 property.property_number */}
              <td>{property.property_number || index + 1}</td>
              <td>{formatDateTime(property.created_at)}</td>
              <td>{renderPropertyTypeBadge(property.property_type)}</td>
              <td>{renderCell(property, 'transaction_type')}</td>
              <td>{renderCell(property, 'address')}</td>
              <td>{renderCell(property, 'property_name')}</td>
              <td>{renderCell(property, 'price')}</td>
              <td>{renderCell(property, 'owner_name')}</td>
              <td>{renderCell(property, 'owner_contact')}</td>
              <td>{renderCell(property, 'status')}</td>
              <td>{renderCell(property, 'memo')}</td>
              <td className="text-center">
                <Button
                  variant="info"
                  size="sm"
                  onClick={() => handleShowDetail(property)}
                >
                  상세
                </Button>
                <div
                  className="vr mx-2"
                  style={{
                    display: 'inline-block',
                    height: '30px',
                    margin: '0 4px',
                  }}
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(property.property_id)}
                >
                  삭제
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <PropertyInfoModal
        show={showDetailModal}
        onHide={handleCloseDetail}
        propertyData={selectedProperty}
        onUpdate={onRefresh}
      />
      {showDetailModal && console.log('모달이 열릴 때의 selectedProperty:', selectedProperty)}
    </div>
  );
};

export default PropertyTable;
