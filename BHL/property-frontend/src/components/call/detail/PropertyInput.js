// PropertyInput.js
import React from 'react';
import PropertyForm from '../../property/PropertyForm';

function PropertyInput({
  propertyData,         // 부모로부터 내려받은 매물 데이터
  handlePropertyChange, // 부모로부터 내려받은 필드 변경 핸들러
}) {
  // 필드 변경 시 바로 부모 함수를 호출
  const handleFieldChange = (fieldId, value) => {
    handlePropertyChange(fieldId, value); 
  };

  // 폼 “저장” 버튼 클릭 시 호출
  const handleFormSubmit = () => {
    // 실제로는 여기에 POST/PUT API 호출 등의 로직을 구현
    console.log('저장할 매물 데이터:', propertyData);
    alert('매물 정보가 저장되었습니다 (개발중).');
  };

  // “기존 매물 불러오기” 버튼 클릭 시 호출
  const handleLoadProperty = () => {
    // 예: 서버에서 기존 매물 불러오기 → setPropertyData
    alert('기존 매물을 불러옵니다 (개발중).');
    // 예시로 더미값을 셋업해볼 수도 있음
    // setPropertyData({
    //   property_type: '아파트',
    //   transaction_type: '매매',
    //   price: '5억',
    //   area: '84㎡',
    //   city: '서울',
    //   district: '강남구',
    //   legal_dong: '역삼동',
    //   detail_address: '123-45',
    //   floor: '10층',
    //   property_name: '삼성래미안',
    //   moving_date: '2024-05-01',
    //   loan_available: '가능',
    //   premium: '500만원',
    //   memo: '이사는 최소 한 달 전 협의 필요',
    //   owner_info: {
    //     owner_name: '김소유',
    //     owner_contact: '010-1234-5678',
    //   },
    //   tenant_info: {
    //     tenant_name: '박세입',
    //     tenant_contact: '010-9876-5432',
    //   },
    //   owner_property_memo: '협의 후 등기까지 2주 소요 예상',
    //   tenant_property_memo: '현재 거주 중, 3월말 이사 예정',
    // });
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PropertyForm
        propertyData={propertyData}
        onChange={handleFieldChange}
        onSubmit={handleFormSubmit}
        onLoadProperty={handleLoadProperty}
        submitLabel="저장"
      />
    </div>
  );
}

export default PropertyInput;
