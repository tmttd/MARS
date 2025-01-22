export const formFields = [
    { id: 'property_type', label: '매물 종류', placeholder: '선택', colSize: 2, type: 'select', 
        options: [        
            { value: '아파트', label: '아파트' },
            { value: '오피스텔', label: '오피스텔' },
            { value: '재건축', label: '재건축' },
            { value: '주상복합', label: '주상복합' },
            { value: '상가', label: '상가' },
            { value: '사무실', label: '사무실' },
            { value: '기타', label: '기타' }
        ]},
    { id: 'transaction_type', label: '거래 종류', placeholder: '선택', colSize: 2, type: 'select',
        options: [
            { value: '매매', label: '매매' },
            { value: '전세', label: '전세' },
            { value: '월세', label: '월세' },
            { value: '임대', label: '임대' },
            { value: '기타', label: '기타' }
        ]},
    { id: 'deposit', label: '보증금(만원)', placeholder: '숫자로 입력', colSize: 3, type: 'text' },
    { id: 'price', label: '가격/월세(만원)', placeholder: '숫자로 입력', colSize: 3, type: 'text' },
    { id: 'premium', label: '권리금(만원)', placeholder: '숫자로 입력', colSize: 2, type: 'text' },
    { id: 'city', label: '시', placeholder: '예: 서울', colSize: 2, type: 'text' },
    { id: 'district', label: '구', placeholder: '예: 강남구', colSize: 2, type: 'text' },
    { id: 'legal_dong', label: '동', placeholder: '예: 역삼동', colSize: 3, type: 'text' },
    { id: 'property_name', label: '단지명', placeholder: '예: 삼성래미안', colSize: 5, type: 'text' },
    { id: 'floor', label: '층', placeholder: '숫자로 입력', colSize: 2, type: 'text', unittext: '층' },
    { id: 'detail_address', label: '상세주소', placeholder: '예: 1동 1305호', colSize: 8, type: 'text' },
    { id: 'area', label: '면적', placeholder: '숫자로 입력', colSize: 2, type: 'text', unittext: 'm²' },
    { id: 'loan_available', label: '대출 관련 정보', placeholder: '', colSize: 9, type: 'text' },
    { id: 'moving_date', label: '입주 가능일', placeholder: '클릭', colSize: 3, type: 'date' },
    {
      id: 'memo',
      label: '메모',
      placeholder: '메모를 입력하세요.',
      colSize: 12,
      minHeight: '100px',
      isScrollable: true,
      type: 'textarea'
    }
  ];

    // 필터 버튼 데이터
export const filterForms = [
        { label: '전체', value: '', type: 'property_name', activeVariant: 'primary', inactiveVariant: 'outline-primary' },
        { label: '르엘', value: '르엘', type: 'property_name', activeVariant: 'success', inactiveVariant: 'outline-success' },
        { label: '아크로', value: '아크로', type: 'property_name', activeVariant: 'warning', inactiveVariant: 'outline-warning' },
        { label: '자이', value: '자이', type: 'property_name', activeVariant: 'info', inactiveVariant: 'outline-info' },
        { label: '아이파크', value: '아이파크', type: 'property_name', activeVariant: 'primary', inactiveVariant: 'outline-primary' },
        { label: '진흥', value: '진흥', type: 'property_name', activeVariant: 'dark', inactiveVariant: 'outline-dark' },
        { label: '엘프론트', value: '엘프론트', type: 'property_name', activeVariant: 'primary', inactiveVariant: 'outline-primary' },
        { 
            label: '기타', 
            value: '기타', 
            type: 'property_name',
            activeVariant: 'secondary',
            inactiveVariant: 'outline-secondary',
            excludeNames: ['르엘', '아크로', '자이', '아이파크', '진흥', '엘프론트']
        }
      ];