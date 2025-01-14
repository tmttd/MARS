import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const CallContentModal = ({ show, onHide, content }) => {
  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>통화 내용</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ fontSize: '2.0rem' }}>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {content}
        </pre>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          닫기
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default CallContentModal;