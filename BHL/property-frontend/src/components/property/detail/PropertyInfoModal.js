import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import PropertyForm from '../PropertyForm';

const PropertyInfoModal = ({ 
  show, 
  onHide, 
  propertyData
}) => {
  const [editedData, setEditedData] = useState(propertyData);

  useEffect(() => {
    setEditedData(propertyData);
  }, [propertyData]);

  const formFields = [
    { id: 'property_type', label: '매물 종류', placeholder: '예: 아파트', colSize: 3 },
    { id: 'transaction_type', label: '거래 종류', placeholder: '예: 매매', colSize: 3 },
    { id: 'price', label: '가격', placeholder: '예: 5억', colSize: 3 },
    { id: 'area', label: '면적', placeholder: '예: 84㎡', colSize: 3 },
    { id: 'city', label: '시', placeholder: '예: 서울', colSize: 2 },
    { id: 'district', label: '구', placeholder: '예: 강남구', colSize: 2 },
    { id: 'legal_dong', label: '동', placeholder: '예: 역삼동', colSize: 2 },
    { id: 'detail_address', label: '상세주소', placeholder: '예: 123-45', colSize: 6 },
    { id: 'floor', label: '층', placeholder: '예: 10층', colSize: 2 },
    { id: 'property_name', label: '단지명', placeholder: '예: 삼성래미안', colSize: 5 },
    { id: 'moving_date', label: '입주 가능일', placeholder: '예: 2024-05-01', colSize: 5 },
    { id: 'loan_available', label: '대출여부', placeholder: '예: 가능', colSize: 6 },
    { id: 'premium', label: '권리금', placeholder: '예: 500만원', colSize: 6 },
    {
      id: 'memo',
      label: '메모',
      placeholder: '메모를 입력하세요.',
      colSize: 12,
      minHeight: '100px',
      isScrollable: true
    }
  ];

  return (
    <Modal show={show} onHide={onHide} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title></Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <PropertyForm
          propertyData={editedData}
          formFields={formFields}
          title="매물 상세 정보"
          rightButtonType="edit"
          bottomButton={
            <Button 
              variant="primary" 
              size="lg"
              className="w-100"
            >
              저장하기
            </Button>
          }
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          닫기
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PropertyInfoModal;