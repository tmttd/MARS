// src/components/property/PropertyTable.js
import React, { useState, useEffect } from 'react';
import { Table, Button, Badge, Form } from 'react-bootstrap';
import { propertyService } from '../../services/api';
import { formatDate } from '../../utils/FormatTools';
import PropertyInfoModal from './detail/PropertyInfoModal';
import { statusOptions } from '../common/FormControls/FormField';
import { commaPrice } from '../../utils/FormatTools';
import '../../styles/common.css';

const PropertyTable = ({ properties, onRefresh, onSortDetailAddress, detailAddressSort }) => {
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
        if (onRefresh) onRefresh();
      } catch (error) {
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  // 상태 변경 처리 함수 (기존 코드 그대로)
  const handleStatusChange = async (propertyId, newStatus) => {
    try {
      const currentProperty = properties.find(p => p.property_id === propertyId);
      if (!currentProperty) {
        throw new Error('Property not found');
      }
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
    // 주소 관련 필드는 여러 정보를 결합하여 표시
    if (field === 'address') {
      return `${property.district || ''} ${property.legal_dong || ''} ${property.detail_address || ''}`.trim() || '-';
    }
    // 상태 필드는 드롭다운으로 렌더링
    if (field === 'status') {
      return (
        <Form.Select
          size="sm"
          value={property.status || ''}
          onChange={(e) => handleStatusChange(property.property_id, e.target.value)}
          style={{
            fontWeight: 'bold',
            fontSize: '0.9rem',
            color: '#000000',
            opacity: 1,
            padding: '4px 8px'
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
    return property[field] || '-';
  };

  const propertyTypeColors = {
    아파트: 'primary',
    오피스텔: 'success',
    상가: 'info',
    기타: 'secondary'
  };

  const renderPropertyTypeBadge = (propertyType) => {
    const badgeColor = propertyTypeColors[propertyType] || 'secondary';
    return <Badge bg={badgeColor}>{propertyType}</Badge>;
  };

  return (
    <div className="table-responsive">
      <Table striped bordered hover className="table-hover">
        <thead style={{ backgroundColor: '#f2f2f2', borderBottom: '2px solid #dee2e6' }}>
          <tr>
            <th style={{ maxWidth: '20px', fontWeight: 'bold', textAlign: 'center' }}>번호</th>
            <th style={{ minWidth: '100px', fontWeight: 'bold', textAlign: 'center' }}>등록일자</th>
            <th style={{ minWidth: '80px', fontWeight: 'bold', textAlign: 'center' }}>소유주</th>
            <th style={{ maxWidth: '40px', fontWeight: 'bold', textAlign: 'center' }}>연락처</th>
            <th style={{ minWidth: '50px', fontWeight: 'bold', textAlign: 'center' }}>종류</th>
            <th style={{ maxWidth: '60px', fontWeight: 'bold', textAlign: 'center' }}>거래 종류</th>
            <th style={{ minWidth: '80px', fontWeight: 'bold', textAlign: 'center' }}>단지명</th>
            {/* 상세주소 헤더에 정렬 토글 onClick 핸들러 추가 */}
            <th
              style={{
                fontWeight: 'bold',
                textAlign: 'center',
                cursor: 'pointer'
              }}
              onClick={onSortDetailAddress}
            >
              상세주소
              {detailAddressSort === 'asc' && <span> ▲</span>}
              {detailAddressSort === 'desc' && <span> ▼</span>}
              {detailAddressSort === null && <span> ↕</span>}
            </th>
            <th style={{ minWidth: '80px', fontWeight: 'bold', textAlign: 'center' }}>보증금(만원)</th>
            <th style={{ minWidth: '60px', fontWeight: 'bold', textAlign: 'center' }}>가격(만원)</th>
            <th style={{ minWidth: '80px', fontWeight: 'bold', textAlign: 'center' }}>면적</th>
            <th style={{ maxWidth: '300px', fontWeight: 'bold', textAlign: 'center', wordWrap: 'break-word' }}>메모</th>
            <th style={{ minWidth: '140px' }}></th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property, index) => (
            <tr key={property.property_id}>
              <td>{property.property_number || index + 1}</td>
              <td>{formatDate(property.created_at)}</td>
              <td>{renderCell(property, 'owner_name')}</td>
              <td>{renderCell(property, 'owner_contact')}</td>
              <td>{renderPropertyTypeBadge(property.property_type)}</td>
              <td>{renderCell(property, 'transaction_type')}</td>
              <td>{renderCell(property, 'property_name')}</td>
              <td>{renderCell(property, 'detail_address')}</td>
              <td>{commaPrice(renderCell(property, 'deposit'))}</td>
              <td>{commaPrice(renderCell(property, 'price'))}</td>
              <td>{renderCell(property, 'area')}평</td>
              <td>{renderCell(property, 'summary_content')}</td>
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
