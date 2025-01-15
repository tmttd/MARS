import React, { useState } from 'react';
import { Table, Button, Form, Badge } from 'react-bootstrap';
import { propertyService } from '../../services/api';
import PropertyInfoModal from './detail/PropertyInfoModal';

const PropertyTable = ({ properties, onUpdate }) => {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    return date.toLocaleString('ko-KR');
  };

  const handleShowDetail = (property) => {
    setSelectedProperty(property);
    setShowDetailModal(true);
  };

  const handleDelete = async (propertyId) => {
    if (window.confirm('정말로 삭제하시겠습니까?')) {
      try {
        await propertyService.deleteProperty(propertyId);
        if (onUpdate) onUpdate();
      } catch (error) {
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const renderCell = (property, field) => {

    if (field === 'price') {
      return property.property_info?.[field] ? `${property.property_info[field]}만원` : '-';
    }

    if (field === 'address') {
      return `${property.property_info?.district || ''} ${property.property_info?.legal_dong || ''} ${property.property_info?.detail_address || ''}`;
    }

    if (field in property) {
      return property[field] || '-';
    }

    if (field in (property.property_info || {})) {
      return property.property_info[field] || '-';
    }

    if (field in (property.property_info.owner_info || {})) {
      return property.property_info.owner_info[field] || '-';
    }

    return '-';
  };

  const propertyTypeColors = {
    아파트: 'primary',
    상가: 'success',
    기타: 'warning',
    오피스텔: 'info',
    사무실: 'dark',
  };

  const renderPropertyTypeBadge = (propertyType) => {
    const badgeColor = propertyTypeColors[propertyType] || 'secondary'; // 기본 색상
    return (
      <Badge bg={badgeColor}>
        {propertyType}
      </Badge>
    );
  };

  return (
    <div className="table-responsive">
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>번호</th>
            <th style={{ minWidth: '50px' }}>등록일자</th>
            <th style={{ minWidth: '50px' }}>종류</th>
            <th style={{ minWidth: '40px' }}>거래 종류</th>
            <th style={{ minWidth: '200px' }}>주소</th>
            <th style={{ minWidth: '80px' }}>단지명</th>
            <th style={{ minWidth: '90px' }}>가격</th>
            <th style={{ minWidth: '80px' }}>소유주</th>
            <th style={{ minWidth: '150px' }}>연락처</th>
            <th style={{ minWidth: '80px' }}>상태</th>
            <th style={{ minWidth: '500px' }}>메모</th>
            <th style={{ minWidth: '130px' }}></th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property, index) => (
            <tr key={property.property_id}>
              <td>{index + 1}</td>
              <td>{formatDateTime(property.created_at)}</td>
              <td>
                {renderPropertyTypeBadge(property.property_info.property_type)}
              </td>
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
                  variant="primary" 
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
                        margin: '0 4px'
                      }} 
                    />
                <Button 
                  variant="danger" 
                  size="sm" 
                  onClick={() => handleDelete(property.property_id)}
                  className="ms-1"
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
        onHide={() => setShowDetailModal(false)}
        propertyData={selectedProperty}
        onUpdate={onUpdate}
      />  
      {console.log(selectedProperty)}
    </div>
  );
};

export default PropertyTable;