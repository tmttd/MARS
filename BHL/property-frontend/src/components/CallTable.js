import React, { useState } from 'react';
import { Table, Button, Form, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { callService } from '../services/api';

const CallTable = ({ calls, onUpdate }) => {
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState({});
  const [editData, setEditData] = useState({});

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    return date.toLocaleString('ko-KR');
  };

  const handleEdit = (jobId) => {
    setEditMode({ ...editMode, [jobId]: true });
    setEditData({ ...editData, [jobId]: calls.find(c => c.job_id === jobId) });
  };

  const handleSave = async (jobId) => {
    try {
      const callData = { ...editData[jobId] };
      const originalCall = calls.find(c => c.job_id === jobId);
      
      // 변경된 값이 있는지 확인
      const hasChanges = Object.keys(callData).some(key => 
        callData[key] !== originalCall[key]
      );

      if (!hasChanges) {
        alert('변경된 값이 없습니다.');
        return;
      }

      delete callData.job_id;
      
      await callService.updateCall(jobId, callData);
      setEditMode({ ...editMode, [jobId]: false });
      if (onUpdate) onUpdate();
    } catch (error) {
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleCancel = (jobId) => {
    setEditMode({ ...editMode, [jobId]: false });
    setEditData({ ...editData, [jobId]: null });
  };

  const handleChange = (jobId, field, value) => {
    setEditData({
      ...editData,
      [jobId]: {
        ...editData[jobId],
        [field]: value
      }
    });
  };

  const handleDetail = (jobId) => {
    navigate(`/calls/${jobId}`, {
      state: { callData: calls.find(c => c.job_id === jobId) }
    });
  };

  const renderCell = (call, field, jobId) => {
    if (editMode[jobId]) {
      return (
        <Form.Control
          size="sm"
          type="text"
          value={editData[jobId]?.[field] || ''}
          onChange={(e) => handleChange(jobId, field, e.target.value)}
        />
      );
    }
    return call[field] || '-';
  };

  return (
    <div className="table-responsive">
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>번호</th>
            <th>통화일시</th>
            <th>성명</th>
            <th>연락처</th>
            <th>매물 종류</th>
            <th>거래 유형</th>
            <th>건물명</th>
            <th>상세주소</th>
            <th>통화요약</th>
            <th>메모</th>
            <th style={{ minWidth: '130px' }}></th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call, index) => (
            <tr key={call.job_id}>
              <td>{index + 1}</td>
              <td>{formatDateTime(call.call_datetime)}</td>
              <td>{renderCell(call, 'name', call.job_id)}</td>
              <td>{renderCell(call, 'contact', call.job_id)}</td>
              <td>{renderCell(call, 'property_type', call.job_id)}</td>
              <td>{renderCell(call, 'transaction_type', call.job_id)}</td>
              <td>{renderCell(call, 'complex_name', call.job_id)}</td>
              <td>
                {editMode[call.job_id] ? (
                  <Form.Control
                    size="sm"
                    type="text"
                    value={editData[call.job_id]?.detailed_address || ''}
                    onChange={(e) => handleChange(call.job_id, 'detailed_address', e.target.value)}
                  />
                ) : (
                  `${call.city || ''} ${call.district || ''} ${call.neighborhood || ''}`
                )}
              </td>
              <td>{renderCell(call, 'call_summary', call.job_id)}</td>
              <td>{renderCell(call, 'memo', call.job_id)}</td>
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