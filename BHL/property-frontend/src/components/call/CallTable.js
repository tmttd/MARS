import React, { useState } from 'react';
import { Table, Button, Form, Badge } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { callService } from '../../services/api';
import { formatDateTime } from '../../utils/FormatTools';

const CallTable = ({ calls, onUpdate, currentPage }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleDelete = async (id) => {
    const isConfirmed = window.confirm('정말로 삭제하시겠습니까?');
    if (isConfirmed) {
      await callService.deleteCall(id);
      if (onUpdate) onUpdate();
    }
  };

  const handleDetail = (id) => {
    navigate(`/calls/${id}?page=${currentPage}`);
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
    return (
      <Badge bg={badgeColor}>
        {propertyType}
      </Badge>
    );
  };

  return (
    <div className="table-responsive">
      <Table striped bordered hover>
        <thead style={{ backgroundColor: '#f2f2f2', borderBottom: '2px solid #dee2e6' }}>
          <tr>
            <th style={{ maxWidth: '20px', fontWeight: 'bold', textAlign: 'center' }}>번호</th>
            <th style={{ minWidth: '80px', fontWeight: 'bold', textAlign: 'center' }}>통화일시</th>
            <th style={{ minWidth: '80px', fontWeight: 'bold', textAlign: 'center' }}>성명</th>
            <th style={{ fontWeight: 'bold', textAlign: 'center' }}>연락처</th>
            <th style={{ minWidth: '50px', fontWeight: 'bold', textAlign: 'center' }}>종류</th>
            <th style={{ minWidth: '40px', fontWeight: 'bold', textAlign: 'center' }}>거래 종류</th>
            <th style={{ minWidth: '50px', fontWeight: 'bold', textAlign: 'center' }}>위치</th>
            <th style={{ minWidth: '80px', fontWeight: 'bold', textAlign: 'center' }}>단지명</th>
            <th style={{ minWidth: '180px', fontWeight: 'bold', textAlign: 'center' }}>통화주제</th>
            <th style={{ fontWeight: 'bold', textAlign: 'center' }}>통화요약</th> 
            <th style={{ minWidth: '140px' }}></th>
          </tr>
        </thead>
        <tbody>
          {calls.map((call) => (
            <tr key={call.job_id}>
              <td>{call.call_number}</td>
              <td>{formatDateTime(call.recording_date)}</td>
              <td>{call.customer_name || '-'}</td>
              <td>{call.customer_contact || '-'}</td>
              <td>{renderPropertyTypeBadge(call.property_type)}</td>
              <td>{call.transaction_type || '-'}</td>
              <td>
                <span>
                  {call.district || ''} {call.legal_dong || ''}
                </span>
              </td>
              <td>{call.property_name || '-'}</td>
              <td>{call.summary_title || '-'}</td>
              <td>{call.summary_content || '-'}</td>
              <td className="text-center">
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => handleDetail(call.job_id)}
                  className="me-2"
                >
                  상세
                </Button>
                <Button 
                  variant="danger" 
                  size="sm" 
                  onClick={() => handleDelete(call.job_id)}
                >
                  삭제
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default CallTable; 