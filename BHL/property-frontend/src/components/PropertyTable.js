import React from 'react';
import { Table } from 'react-bootstrap';

const PropertyTable = ({ extractions }) => {
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
          </tr>
        </thead>
        <tbody>
          {extractions.map((extraction) => (
            <tr key={extraction.job_id}>
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
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  );
};

export default PropertyTable; 