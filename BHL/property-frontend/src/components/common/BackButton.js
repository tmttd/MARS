import React from 'react';
import { Button } from 'react-bootstrap';
import { FaArrowLeft } from 'react-icons/fa';

const BackButton = ({ onClick }) => {
  return (
    <Button 
      variant="link" 
      className="mb-4 p-0 text-dark" 
      onClick={onClick}
    >
      <FaArrowLeft className="me-2" />
      뒤로가기
    </Button>
  );
};

export default BackButton;