// src/components/property/PropertyTable.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Badge, Form } from 'react-bootstrap';
import { propertyService } from '../../services/api';
import { formatDate } from '../../utils/FormatTools';
import PropertyInfoModal from './detail/PropertyInfoModal';
import { statusOptions } from '../common/FormControls/FormField';

const PropertyTable = ({ properties, onRefresh }) => {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

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

  // status 변경 처리 함수
  const handleStatusChange = async (propertyId, newStatus) => {
    try {
      // 현재 property 데이터 찾기
      const currentProperty = properties.find(p => p.property_id === propertyId);
      if (!currentProperty) {
        throw new Error('Property not found');
      }

      // 기존 데이터를 유지하면서 status만 업데이트
      const updatedData = {
        ...currentProperty,
        status: newStatus
      };

      await propertyService.updateProperty(propertyId, updatedData);
      if (onRefresh) onRefresh();
    } catch (error) {
      alert('상태 업데이트 중 오류가 발생했습니다.');
      console.error('Status update error:', error);
    }
  };

  const renderCell = (property, field) => {
    // address 필드 (city + district + legal_dong 등 합치기)
    if (field === 'address') {
      return `${property.district || ''} ${property.legal_dong || ''} ${property.detail_address || ''}`.trim() || '-';
    }
    
    // status 필드일 경우 드롭다운 렌더링
    if (field === 'status') {
      return (
        <Form.Select
          size="sm"
          value={property.status || ''}
          onChange={(e) => handleStatusChange(property.property_id, e.target.value)}
          style={{
            fontWeight: 'bold',         // 글씨 굵기
            fontSize: '0.9rem',         // 글씨 크기
            color: '#000000',          // 글씨 색상
            opacity: 1,                // 투명도
            padding: '4px 8px'         // 패딩
          }}     
        >
          <option value="">선택</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </Form.Select>
      );
    }

    // 일반 필드 처리
    return property[field] || '-';
  };

  const propertyTypeColors = {
    아파트: 'primary',
    오피스텔: 'success',
    재건축: 'primary',
    주상복합: 'primary',
    상가: 'info',
    사무실: 'dark',
    기타: 'secondary'
  };

  const renderPropertyTypeBadge = (propertyType) => {
    const badgeColor = propertyTypeColors[propertyType] || 'secondary';
    return <Badge bg={badgeColor}>{propertyType}</Badge>;
  };

  return (
    <div className="table-responsive">
      <Table striped bordered hover>
        <thead style={{ backgroundColor: '#f2f2f2', borderBottom: '2px solid #dee2e6' }}>
          <tr>
            <th style={{ maxWidth: '20px', fontWeight: 'bold', textAlign: 'center' }}>번호</th>
            <th style={{ minWidth: '100px', fontWeight: 'bold', textAlign: 'center' }}>등록일자</th>
            <th style={{ minWidth: '80px', fontWeight: 'bold', textAlign: 'center' }}>소유주</th>
            <th style={{ maxWidth: '40px', fontWeight: 'bold', textAlign: 'center' }}>연락처</th>
            <th style={{ minWidth: '50px', fontWeight: 'bold', textAlign: 'center' }}>종류</th>
            <th style={{ maxWidth: '40px', fontWeight: 'bold', textAlign: 'center' }}>거래 종류</th>
            <th style={{ fontWeight: 'bold', textAlign: 'center' }}>주소</th>
            <th style={{ minWidth: '80px', fontWeight: 'bold', textAlign: 'center' }}>단지명</th>
            <th style={{ minWidth: '100px', fontWeight: 'bold', textAlign: 'center' }}>보증금(만원)</th>
            <th style={{ minWidth: '80px', fontWeight: 'bold', textAlign: 'center' }}>가격(만원)</th>
            <th style={{ minWidth: '400px', fontWeight: 'bold', textAlign: 'center' }}>메모</th>
            <th style={{ minWidth: '130px', fontWeight: 'bold', textAlign: 'center' }}>작업상태</th>
            <th style={{ minWidth: '140px' }}></th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property, index) => (
            <tr key={property.property_id}>
              {/* property_number가 있다면 property.property_number */}
              <td>{property.property_number || index + 1}</td>
              <td>{formatDate(property.created_at)}</td>
              <td>{renderCell(property, 'owner_name')}</td>
              <td>{renderCell(property, 'owner_contact')}</td>
              <td>{renderPropertyTypeBadge(property.property_type)}</td>
              <td>{renderCell(property, 'transaction_type')}</td>
              <td>{renderCell(property, 'address')}</td>
              <td>{renderCell(property, 'property_name')}</td>
              <td>{renderCell(property, 'deposit')}</td>
              <td>{renderCell(property, 'price')}</td>
              <td>{renderCell(property, 'memo')}</td>
              <td>{renderCell(property, 'status')}</td>
              <td className="text-center">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleShowDetail(property)}
                  className="me-2"
                >
                  상세
                </Button>
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
