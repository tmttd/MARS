export const flattenData = (data) => {
    if (!data) return {};
  
    // property_info 또는 extracted_property_info 중 존재하는 것을 선택
    const propertyNested = data.property_info || data.extracted_property_info;
    
    // 만약 둘 다 없다면 원본 반환
    if (!propertyNested) return data;
  
    // 선택된 propertyNested에서 owner_info, tenant_info 분리 및 나머지 추출
    const { owner_info, tenant_info, ...restInfo } = propertyNested;
    
    // 최상위 객체에서 property_info와 extracted_property_info 키 제거
    const { property_info, extracted_property_info, ...topLevelFields } = data;
  
    // 최종 평탄화 객체 생성
    return {
      ...topLevelFields,       // 최상위 필드 유지 (예: property_id, customer_contact 등)
      ...restInfo,             // property_nested의 나머지 필드
      ...(owner_info || {}),   // owner_info 내부 필드
      ...(tenant_info || {})   // tenant_info 내부 필드
    };
  };

// undefined인 경우 null로 바꾸는 함수. (pydantic 호환에 필수)

const safeValue = (value) => value === undefined || value === '' ? null : value;

export const unflattenPropertyData = (flatData) => {
  if (!flatData) return {};

  // 최상위 레벨 필드 분리
  const {
    // property_info 안의 필드 //
    property_name, price, deposit, city, district, legal_dong, detail_address,
    full_address, loan_info, transaction_type, property_type, floor, area,
    premium, memo, moving_date, owner_property_memo, tenant_property_memo,
    // owner_info 안의 필드 //
    owner_name, owner_contact,
    // tenant_info 안의 필드 //
    tenant_name, tenant_contact,
    // 최상위 필드 //
    property_id, job_id, created_at, status
  } = flatData;

  return {
    property_id: safeValue(property_id),
    created_at: safeValue(created_at),
    status: safeValue(status),
    job_id: safeValue(job_id),
    property_info: {
      property_name: safeValue(property_name),
      price: safeValue(price),
      deposit: safeValue(deposit),
      loan_info: safeValue(loan_info),
      city: safeValue(city),
      district: safeValue(district),
      legal_dong: safeValue(legal_dong),
      detail_address: safeValue(detail_address),
      full_address: safeValue(full_address),
      transaction_type: safeValue(transaction_type),
      property_type: safeValue(property_type),
      floor: safeValue(floor),
      area: safeValue(area),
      premium: safeValue(premium),
      memo: safeValue(memo),
      moving_date: safeValue(moving_date),
      owner_property_memo: safeValue(owner_property_memo),    
      tenant_property_memo: safeValue(tenant_property_memo),   
      owner_info: {
        owner_name: safeValue(owner_name),
        owner_contact: safeValue(owner_contact)
      },
      tenant_info: {
        tenant_name: safeValue(tenant_name),
        tenant_contact: safeValue(tenant_contact)
      }
    },
  };
};
  
export const unflattenCallData = (flatData) => {
  if (!flatData) return {};

  const {
    // extracted_property_info 안의 필드 //
    property_name, price, deposit, city, district, legal_dong, detail_address,
    full_address, loan_info, transaction_type, property_type, floor, area,
    premium, memo, moving_date, owner_property_memo, tenant_property_memo,
    // owner_info 안의 필드 //
    owner_name, owner_contact,
    // tenant_info 안의 필드 //
    tenant_name, tenant_contact,
    // 최상위 필드 //
    job_id, file_name, customer_name, customer_contact, recording_date,
    text, summary_title, summary_content, property_id, call_memo
  } = flatData;

  return {
    job_id: safeValue(job_id),
    file_name: safeValue(file_name),
    customer_name: safeValue(customer_name),
    customer_contact: safeValue(customer_contact),
    recording_date: safeValue(recording_date),
    text: safeValue(text),
    summary_title: safeValue(summary_title),
    summary_content: safeValue(summary_content),
    property_id: safeValue(property_id),
    call_memo: safeValue(call_memo),
    extracted_property_info: {
      property_name: safeValue(property_name),
      price: safeValue(price),
      deposit: safeValue(deposit),
      loan_info: safeValue(loan_info),
      city: safeValue(city),
      district: safeValue(district),
      legal_dong: safeValue(legal_dong),
      detail_address: safeValue(detail_address),
      full_address: safeValue(full_address),
      transaction_type: safeValue(transaction_type),
      property_type: safeValue(property_type),
      floor: safeValue(floor),
      area: safeValue(area),
      premium: safeValue(premium),
      memo: safeValue(memo),
      moving_date: safeValue(moving_date),
      owner_property_memo: safeValue(owner_property_memo),    
      tenant_property_memo: safeValue(tenant_property_memo),   
      owner_info: {
        owner_name: safeValue(owner_name),
        owner_contact: safeValue(owner_contact)
      },
      tenant_info: {
        tenant_name: safeValue(tenant_name),
        tenant_contact: safeValue(tenant_contact)
      }
    },
  };
};