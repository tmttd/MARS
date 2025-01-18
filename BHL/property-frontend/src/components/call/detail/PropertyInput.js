import React from 'react';
import PropertyForm from '../../property/PropertyForm';
import { Button } from 'react-bootstrap';

function PropertyInput({
  propertyData         // 부모로부터 내려받은 매물 데이터
}) {

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
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PropertyForm
        propertyData={propertyData}
        formFields={formFields}
        isDisabled={false}
        rightButton={
          <Button variant="dark" size="md">
            기존 매물 불러오기
          </Button>
        }
        rightButtonType="load"
        title="매물 입력창"
        bottomButton={
          <Button 
                variant="primary" 
                size="lg" 
                type="submit" 
                className="w-100"
              >
                저장하기
              </Button>
        }
        onSubmitSuccess={null}
      />
    </div>
  );
}

export default PropertyInput;
