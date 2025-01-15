import React, { useState } from 'react';
import { Table, Button, Form, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { callService } from '../../services/api';

const CallTable = ({ calls, onUpdate }) => {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState({});
  const [editData, setEditData] = useState({});

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    return date.toLocaleString('ko-KR');
  };

  const handleEdit = (id) => {
    setEditMode({ ...editMode, [id]: true });
    setEditData({ ...editData, [id]: calls.find(c => c.job_id === id) });
  };

  const handleSave = async (id) => {
    try {
      const callData = { ...editData[id] };
      const originalCall = calls.find(c => c.job_id === id);
      
      // 변경된 값이 있는지 확인
      const hasChanges = Object.keys(callData).some(key => 
        callData[key] !== originalCall[key]
      );

      if (!hasChanges) {
        alert('변경된 값이 없습니다.');
        return;
      }

      delete callData.job_id;
      
      await callService.updateCall(id, callData);
      setEditMode({ ...editMode, [id]: false });
      if (onUpdate) onUpdate();
    } catch (error) {
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleCancel = (id) => {
    setEditMode({ ...editMode, [id]: false });
    setEditData({ ...editData, [id]: null });
  };

  const handleChange = (id, field, value) => {
    setEditData({
      ...editData,
      [id]: {
        ...editData[id],
        [field]: value
      }
    });
  };

  const handleDetail = (id) => {
    console.log("Selected Call ID:", id);
    navigate(`/calls/${id}`, {
      state: { callData: calls.find(c => c.job_id === id) }
    });
  };

  const renderCell = (call, field, id) => {
    if (editMode[id]) {
      return (
        <Form.Control
          size="sm"
          type="text"
          value={editData[id]?.[field] || ''}
          onChange={(e) => handleChange(id, field, e.target.value)}
        />
      );
    }
    return call[field] || '-';
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
            <th style={{ minWidth: '80px' }}>통화일시</th>
            <th style={{ minWidth: '80px' }}>성명</th>
            <th>연락처</th>
            <th style={{ minWidth: '50px' }}>종류</th>
            <th>거래 종류</th>
            <th style={{ minWidth: '80px' }}>단지명</th>
            <th style={{ minWidth: '80px' }}>상세주소</th>
            <th style={{ minWidth: '180px' }}>통화주제</th>
            <th>통화요약</th>
            <th style={{ minWidth: '130px' }}></th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call, index) => (
            <tr key={call.job_id}>
              <td>{index + 1}</td>
              <td>{formatDateTime(call.recording_date)}</td>
              <td>{renderCell(call, 'customer_name', call.job_id)}</td>
              <td>{renderCell(call, 'customer_contact', call.job_id)}</td>
              <td>
                {renderPropertyTypeBadge(call.extracted_property_info?.property_type)}
              </td>
              <td>{renderCell(call.extracted_property_info || {}, 'transaction_type', call.job_id)}</td>
              <td>{renderCell(call.extracted_property_info || {}, 'property_name', call.job_id)}</td>
              <td>
                {editMode[call.job_id] ? (
                  <Form.Control
                    size="sm"
                    type="text"
                    value={editData[call.job_id].extracted_property_info?.detail_address || ''}
                    onChange={(e) => handleChange(call.job_id, 'detail_address', e.target.value)}
                  />
                ) : (
                  `${call.extracted_property_info?.city || ''} ${call.extracted_property_info?.district || ''}`
                )}
              </td>
              <td>{renderCell(call, 'summary_title', call.job_id)}</td>
              <td>{renderCell(call, 'summary_content', call.job_id)}</td>
              <td className="text-center">
                {editMode[call.job_id] ? (
                  <>
                    <Button 
                      variant="success" 
                      size="sm" 
                      onClick={() => handleSave(call.job_id)}
                      className="me-1"
                    >
                      저장
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => handleCancel(call.job_id)}
                    >
                      취소
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={() => handleEdit(call.job_id)}
                      className="me-1"
                    >
                      수정
                    </Button>
                    <div 
                      className="vr mx-2" 
                      style={{ 
                        display: 'inline-block',
                        height: '20px',
                        margin: '0 4px'
                      }} 
                    />
                    <Button 
                      variant="info" 
                      size="sm" 
                      onClick={() => handleDetail(call.job_id)}
                    >
                      상세
                    </Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default CallTable; 