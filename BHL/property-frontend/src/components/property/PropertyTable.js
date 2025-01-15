import React, { useState } from 'react';
import { Table, Button, Form, Badge } from 'react-bootstrap';
import { propertyService } from '../../services/api';

const PropertyTable = ({ properties, onUpdate }) => {
  const [editMode, setEditMode] = useState({});
  const [editData, setEditData] = useState({});

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    return date.toLocaleString('ko-KR');
  };

  const handleShowDetail = (property) => {
    console.log(property);
  };

  const handleEdit = (propertyId) => {
    setEditMode({ ...editMode, [propertyId]: true });
    setEditData({ ...editData, [propertyId]: properties.find(p => p.property_id === propertyId) });
  };

  const handleSave = async (propertyId) => {
    try {
      const propertyData = { ...editData[propertyId] };
      const originalProperty = properties.find(p => p.property_id === propertyId);
      
      // 변경된 값이 있는지 확인
      const hasChanges = Object.keys(propertyData).some(key => 
        propertyData[key] !== originalProperty[key]
      );

      if (!hasChanges) {
        alert('변경된 값이 없습니다.');
        return;
      }

      delete propertyData.property_id;
      
      await propertyService.updateProperty(propertyId, propertyData);
      setEditMode({ ...editMode, [propertyId]: false });
      if (onUpdate) onUpdate();
    } catch (error) {
      alert('저장 중 오류가 발생했습니다.');
    }
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

  const handleCancel = (propertyId) => {
    setEditMode({ ...editMode, [propertyId]: false });
    setEditData({ ...editData, [propertyId]: null });
  };

  const handleChange = (propertyId, field, value) => {
    if (field.includes('.')) {
      const [parentKey, childKey] = field.split('.');
      setEditData(prev => ({
        ...prev,
        [propertyId]: {
          ...prev[propertyId],
          [parentKey]: {
            ...prev[propertyId][parentKey],
            [childKey]: value
          }
        }
      }));
    } else {
      setEditData(prev => ({
        ...prev,
        [propertyId]: {
          ...prev[propertyId],
          [field]: value
        }
      }));
    }
  };

  const renderCell = (property, field, id) => {
    if (editMode[id]) {
      const propertyInfoFields = ['property_type', 'transaction_type', 'property_name', 'price', 'memo'];
      const ownerInfoFields = ['owner_name'];

      if (propertyInfoFields.includes(field)) {
        return (
          <Form.Control
            size="sm"
            type="text"
            
            value={editData[id]?.property_info?.[field] || ''}
            onChange={(e) => handleChange(id, `property_info.${field}`, e.target.value)}
          />
        );
      }

      if (ownerInfoFields.includes(field)) {
        return (
          <Form.Control
            size="sm"
            type="text"
            value={editData[id]?.owner_info?.[field] || ''}
            onChange={(e) => handleChange(id, `owner_info.${field}`, e.target.value)}
          />
        );
      }

      return (
        <Form.Control
          size="sm"
          type="text"
          value={editData[id]?.[field] || ''}
          onChange={(e) => handleChange(id, field, e.target.value)}
        />
      );
    }

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

    if (field in (property.owner_info || {})) {
      return property.owner_info[field] || '-';
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
            <th style={{ minWidth: '130px' }}></th>
          </tr>
        </thead>
        <tbody>
          {properties.map((property, index) => (
            <tr key={property.property_id}>
              <td>{index + 1}</td>
              <td>{formatDateTime(property.created_at)}</td>
              <td>
                {renderPropertyTypeBadge(property.property_type)}
              </td>
              <td>{renderCell(property, 'transaction_type', property.property_id)}</td>
              <td>{renderCell(property, 'address', property.property_id)}</td>
              <td>{renderCell(property, 'property_name', property.property_id)}</td>
              <td>{renderCell(property, 'price', property.property_id)}</td>
              <td>{renderCell(property, 'owner_name', property.property_id)}</td>
              <td>{renderCell(property, 'owner_contact', property.property_id)}</td>
              <td>{renderCell(property, 'status', property.property_id)}</td>
              <td>{renderCell(property, 'memo', property.property_id)}</td>
              <td className="text-center">
                <Button 
                  variant="info" 
                  size="sm" 
                  onClick={() => handleShowDetail(property)}
                >
                  상세
                </Button>
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

      {/* 상세보기 모달
      <Modal show={showDetailModal} onHide={handleCloseDetail}>
        <Modal.Header closeButton>
          <Modal.Title>상세 정보</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProperty && (
            <div>
              <p>종류: {selectedProperty.property_type}</p>
              <p>거래 종류: {selectedProperty.transaction_type}</p>
              <p>주소: {selectedProperty.address}</p>
              <p>단지명: {selectedProperty.property_name}</p>
              <p>가격: {selectedProperty.price}만원</p>
              <p>소유주: {selectedProperty.owner_name}</p>
              <p>연락처: {selectedProperty.owner_contact}</p>
              <p>메모: {selectedProperty.memo}</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDetail}>
            닫기
          </Button>
        </Modal.Footer>
      </Modal> */}
    </div>
  );
};

export default PropertyTable;