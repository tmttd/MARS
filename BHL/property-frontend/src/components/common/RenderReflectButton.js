import React from 'react';
import { Button } from 'react-bootstrap';
  
// 반영 버튼 렌더링 함수
const RenderReflectButton = ({ 
  fieldId, 
  variant = 'primary',
  handlePropertyReflect, 
  showActionButtons, 
  buttonText = '반영', // 기본값 설정
  additionalOnClick // 추가적인 onClick 핸들러
}) => {
  if (!showActionButtons) return null;

  const handleClick = () => {
    handlePropertyReflect(fieldId); // 기본 반영 로직
    if (additionalOnClick) {
      additionalOnClick(); // 추가적인 핸들러 호출
    }
  };

  return (
    <Button 
      variant={variant} 
      size="sm" 
      style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
      onClick={handleClick}
    >
      {buttonText} {/* 버튼 텍스트 */}
    </Button>
  );
};

export default RenderReflectButton;