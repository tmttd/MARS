import React, { useState } from 'react';
import { Table, Button, Form } from 'react-bootstrap';
import { propertyService } from '../../services/api';

const PropertyTable = ({ extractions, onUpdate }) => {
  const [editMode, setEditMode] = useState({});
  const [editData, setEditData] = useState({});

  const handleEdit = (jobId) => {
    setEditMode({ ...editMode, [jobId]: true });
    setEditData({ ...editData, [jobId]: extractions.find(e => e.job_id === jobId) });
  };

  const handleSave = async (jobId) => {
    try {
      const extractionData = { ...editData[jobId] };
      delete extractionData.job_id;
      
      await propertyService.updateExtraction(jobId, extractionData);
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

  return (
    <div className="table-responsive">
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>매물 종류</th>
            <th>매매가</th>
            <th>주소</th>
            <th>건물명</th>
            <th>층</th>
            <th>동</th>
            <th>보증금</th>
            <th>월세</th>
            <th>권리금</th>
            <th>업종</th>
            <th>소유자</th>
            <th>연락처</th>
            <th>메모</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {extractions.map((extraction) => (
            <tr key={extraction.job_id}>
              {editMode[extraction.job_id] ? (
                <>
                  <td><Form.Control value={editData[extraction.job_id]?.property_type || ''} 
                      onChange={(e) => handleChange(extraction.job_id, 'property_type', e.target.value)} /></td>
                  <td><Form.Control value={editData[extraction.job_id]?.price || ''} 
                      onChange={(e) => handleChange(extraction.job_id, 'price', e.target.value)} /></td>
                  <td><Form.Control value={editData[extraction.job_id]?.address || ''} 
                      onChange={(e) => handleChange(extraction.job_id, 'address', e.target.value)} /></td>
                  <td><Form.Control value={editData[extraction.job_id]?.building_name || ''} 
                      onChange={(e) => handleChange(extraction.job_id, 'building_name', e.target.value)} /></td>
                  <td><Form.Control value={editData[extraction.job_id]?.floor || ''} 
                      onChange={(e) => handleChange(extraction.job_id, 'floor', e.target.value)} /></td>
                  <td><Form.Control value={editData[extraction.job_id]?.dong || ''} 
                      onChange={(e) => handleChange(extraction.job_id, 'dong', e.target.value)} /></td>
                  <td><Form.Control value={editData[extraction.job_id]?.deposit || ''} 
                      onChange={(e) => handleChange(extraction.job_id, 'deposit', e.target.value)} /></td>
                  <td><Form.Control value={editData[extraction.job_id]?.monthly_rent || ''} 
                      onChange={(e) => handleChange(extraction.job_id, 'monthly_rent', e.target.value)} /></td>
                  <td><Form.Control value={editData[extraction.job_id]?.premium || ''} 
                      onChange={(e) => handleChange(extraction.job_id, 'premium', e.target.value)} /></td>
                  <td><Form.Control value={editData[extraction.job_id]?.business_type || ''} 
                      onChange={(e) => handleChange(extraction.job_id, 'business_type', e.target.value)} /></td>
                  <td><Form.Control value={editData[extraction.job_id]?.owner_name || ''} 
                      onChange={(e) => handleChange(extraction.job_id, 'owner_name', e.target.value)} /></td>
                  <td><Form.Control value={editData[extraction.job_id]?.owner_contact || ''} 
                      onChange={(e) => handleChange(extraction.job_id, 'owner_contact', e.target.value)} /></td>
                  <td><Form.Control value={editData[extraction.job_id]?.memo || ''} 
                      onChange={(e) => handleChange(extraction.job_id, 'memo', e.target.value)} /></td>
                  <td>
                    <Button variant="success" size="sm" onClick={() => handleSave(extraction.job_id)}>저장</Button>
                  </td>
                </>
              ) : (
                <>
                  <td>{extraction.property_type}</td>
                  <td>{extraction.price ? `${extraction.price}만원` : '-'}</td>
                  <td>{extraction.address || '-'}</td>
                  <td>{extraction.building_name || '-'}</td>
                  <td>{extraction.floor || '-'}</td>
                  <td>{extraction.dong || '-'}</td>
                  <td>{extraction.deposit ? `${extraction.deposit}만원` : '-'}</td>
                  <td>{extraction.monthly_rent ? `${extraction.monthly_rent}만원` : '-'}</td>
                  <td>{extraction.premium ? `${extraction.premium}만원` : '-'}</td>
                  <td>{extraction.business_type || '-'}</td>
                  <td>{extraction.owner_name || '-'}</td>
                  <td>{extraction.owner_contact || '-'}</td>
                  <td>{extraction.memo || '-'}</td>
                  <td>
                    <Button variant="primary" size="sm" onClick={() => handleEdit(extraction.job_id)}>수정</Button>
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

export default PropertyTable;