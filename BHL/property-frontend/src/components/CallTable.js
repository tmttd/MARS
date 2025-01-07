import React, { useState } from 'react';
import { Table, Button, Form, Badge } from 'react-bootstrap';
import { callService } from '../services/api';
import { audioService } from '../services/api';

const CallTable = ({ calls, onUpdate }) => {
  const [editMode, setEditMode] = useState({});
  const [editData, setEditData] = useState({});

  const formatPrice = (price) => {
    if (!price) return '-';
    return `${price.toLocaleString()}만원`;
  };

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
      delete callData.job_id;
      
      await callService.updateCall(jobId, callData);
      setEditMode({ ...editMode, [jobId]: false });
      if (onUpdate) onUpdate();
    } catch (error) {
      alert('저장 중 오류가 발생했습니다.');
    }
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

  const handlePlayAudio = async (fileName) => {
    const audioUrl = await audioService.playAudio("테스트2.m4a");
    window.open(audioUrl, '_blank');
  };

  return (
    <div className="table-responsive">
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>번호</th>
            <th>통화일시</th>
            <th>성함</th>
            <th>성별</th>
            <th>연락처</th>
            <th>종류</th>
            <th>시</th>
            <th>구</th>
            <th>동</th>
            <th>단지명</th>
            <th>동</th>
            <th>호수</th>
            <th>거래가액</th>
            <th>대출여부</th>
            <th>입주가능일</th>
            <th>통화요약</th>
            <th>메모</th>
            <th>작업</th>
            <th>음성재생</th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call, index) => (
            <tr key={call.job_id}>
              {editMode[call.job_id] ? (
                <>
                  <td>{index + 1}</td>
                  <td>{formatDateTime(call.call_datetime)}</td>
                  <td><Form.Control value={editData[call.job_id]?.name || ''} 
                      onChange={(e) => handleChange(call.job_id, 'name', e.target.value)} /></td>
                  <td><Form.Control value={editData[call.job_id]?.gender || ''} 
                      onChange={(e) => handleChange(call.job_id, 'gender', e.target.value)} /></td>
                  <td><Form.Control value={editData[call.job_id]?.contact || ''} 
                      onChange={(e) => handleChange(call.job_id, 'contact', e.target.value)} /></td>
                  <td><Form.Control value={editData[call.job_id]?.property_type || ''} 
                      onChange={(e) => handleChange(call.job_id, 'property_type', e.target.value)} /></td>
                  <td><Form.Control value={editData[call.job_id]?.city || ''} 
                      onChange={(e) => handleChange(call.job_id, 'city', e.target.value)} /></td>
                  <td><Form.Control value={editData[call.job_id]?.district || ''} 
                      onChange={(e) => handleChange(call.job_id, 'district', e.target.value)} /></td>
                  <td><Form.Control value={editData[call.job_id]?.neighborhood || ''} 
                      onChange={(e) => handleChange(call.job_id, 'neighborhood', e.target.value)} /></td>
                  <td><Form.Control value={editData[call.job_id]?.complex_name || ''} 
                      onChange={(e) => handleChange(call.job_id, 'complex_name', e.target.value)} /></td>
                  <td><Form.Control value={editData[call.job_id]?.building || ''} 
                      onChange={(e) => handleChange(call.job_id, 'building', e.target.value)} /></td>
                  <td><Form.Control value={editData[call.job_id]?.unit || ''} 
                      onChange={(e) => handleChange(call.job_id, 'unit', e.target.value)} /></td>
                  <td><Form.Control value={editData[call.job_id]?.price || ''} 
                      onChange={(e) => handleChange(call.job_id, 'price', e.target.value)} /></td>
                  <td><Form.Control value={editData[call.job_id]?.loan_status || ''} 
                      onChange={(e) => handleChange(call.job_id, 'loan_status', e.target.value)} /></td>
                  <td><Form.Control value={editData[call.job_id]?.move_in_date || ''} 
                      onChange={(e) => handleChange(call.job_id, 'move_in_date', e.target.value)} /></td>
                  <td><Form.Control value={editData[call.job_id]?.call_summary || ''} 
                      onChange={(e) => handleChange(call.job_id, 'call_summary', e.target.value)} /></td>
                  <td><Form.Control value={editData[call.job_id]?.memo || ''} 
                      onChange={(e) => handleChange(call.job_id, 'memo', e.target.value)} /></td>
                  <td>
                    <Button variant="secondary" size="sm" onClick={() => handlePlayAudio(call.file_name)}>
                      <i className="bi bi-play-circle"></i> 재생
                    </Button>
                  </td>
                  <td>
                    <Button variant="success" size="sm" onClick={() => handleSave(call.job_id)}>저장</Button>
                  </td>
                </>
              ) : (
                <>
                  <td>{index + 1}</td>
                  <td>{formatDateTime(call.call_datetime)}</td>
                  <td>{call.name || '-'}</td>
                  <td>{call.gender || '-'}</td>
                  <td>{call.contact || '-'}</td>
                  <td><Badge bg="info">{call.property_type || '-'}</Badge></td>
                  <td>{call.city || '-'}</td>
                  <td>{call.district || '-'}</td>
                  <td>{call.neighborhood || '-'}</td>
                  <td>{call.complex_name || '-'}</td>
                  <td>{call.building || '-'}</td>
                  <td>{call.unit || '-'}</td>
                  <td>{formatPrice(call.price)}</td>
                  <td>{call.loan_status || '-'}</td>
                  <td>{call.move_in_date || '-'}</td>
                  <td>{call.call_summary || '-'}</td>
                  <td>{call.memo || '-'}</td>
                  <td>
                    <Button variant="primary" size="sm" onClick={() => handleEdit(call.job_id)}>수정</Button>
                  </td>
                  <td>
                    <Button variant="secondary" size="sm" onClick={() => handlePlayAudio(call.file_name)}>
                      <i className="bi bi-play-circle"></i> 재생
                    </Button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default CallTable; 