import React from 'react';
import { Modal, Button } from 'react-bootstrap';
import { FiAlertTriangle } from 'react-icons/fi';

const ErrorModal = ({ show, onHide, errorMessage }) => {
  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton className="bg-danger text-white">
        <Modal.Title>
          <FiAlertTriangle className="me-2" size={24} />
          오류 발생
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="fs-5 text-center">
          {errorMessage || '상세주소가 중복되었습니다. 확인 후 다시 등록하세요.'}
        </div>
      </Modal.Body>
      <Modal.Footer className="justify-content-center">
        <Button variant="outline-danger" onClick={onHide}>
          확인
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ErrorModal;