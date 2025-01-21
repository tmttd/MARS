// 연락처 포맷팅 함수
export const formatPhoneNumber = (phoneNumber) => {
    const cleaned = phoneNumber.replace(/\D/g, '');
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
    const formattedTime = `${formattedHours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;
    
    return `${formattedDate} ${formattedTime}`;
};

// 등록일자 포맷팅 함수(2025-01-20T01:22:48.554Z -> 2025-01-20)
export const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
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
