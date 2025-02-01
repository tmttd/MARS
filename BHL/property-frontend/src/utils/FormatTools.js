// 연락처 포맷팅 함수
export const formatPhoneNumber = (phoneNumber) => {
    // null, undefined, 빈 문자열 체크
    if (!phoneNumber) return null;
    
    const cleaned = phoneNumber.replace(/\D/g, '');
    // 숫자가 없는 경우도 처리
    if (!cleaned) return null;
    
    if (cleaned.startsWith('010')) {
      return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    } else if (cleaned.startsWith('02')) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
    } else {
      return cleaned.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
    }
};

// 통화일시 포맷팅 함수(2025-01-20T01:22:48.554Z -> 2025-01-20 오전 10:22:48)
export const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const formattedDate = formatDate(dateString);

    // 시간 포맷팅
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    // 오전/오후 구분
    const ampm = hours >= 12 ? '오후' : '오전';
    const formattedHours = hours % 12 || 12; // 12시간제로 변환

    // 최종 포맷팅
    const formattedTime = `${ampm} ${formattedHours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    return `${formattedDate} ${formattedTime}`;
};

export const formatToISODatetime = (date) => {
  if (!date) return null;

  const dateObj = date instanceof Date ? date : new Date(date);
  if (isNaN(dateObj.getTime())) return null;

  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');

  // 타임존 보정 없이 KST의 자정(00:00:00)을 문자열로 반환
  return `${year}-${month}-${day}T00:00:00`;
};

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  // UTC 기준 시간에 9시간을 더하여 KST로 변환
  date.setHours(date.getHours() + 9);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// 가격 포맷팅 함수 (예: 억/만원)
export const formatPrice = (priceValue) => {
    if (priceValue) {
      if (priceValue >= 10000) {
        const uk = Math.floor(priceValue / 10000); // 만 단위로 변환
        const man = priceValue % 10000;            // 나머지 만원
        const formattedPrice = [];
        if (uk > 0) formattedPrice.push(`${uk}억`);
        if (man > 0) formattedPrice.push(`${man}만원`);
        return formattedPrice.join(' ') || '-';
      } else {
        return `${priceValue}만원`;
      }
    }
    return '-';
  };

// 가격 포맷팅 함수 (예: 1000000 -> 1,000,000)
export const commaPrice = (priceValue) => {
    if (priceValue) {
        return priceValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    return '-';
};
