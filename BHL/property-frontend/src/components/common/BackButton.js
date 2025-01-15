import React from 'react';
import { FaArrowLeft } from 'react-icons/fa';

const BackButton = ({ onClick }) => {
  return (
    <span 
      className="mb-4 p-0 text-primary"
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <FaArrowLeft className="me-2" />
      목록으로 돌아가기
    </span>
  );
};

export default BackButton;