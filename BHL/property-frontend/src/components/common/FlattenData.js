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
  