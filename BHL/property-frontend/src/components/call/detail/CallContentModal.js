import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const CallContentModal = ({ show, onHide, content }) => {
  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>통화 내용</Modal.Title>
      </Modal.Header>
      <Modal.Body
        style={{
          fontSize: '2.0rem',
          overflowY: 'auto',               // 세로 스크롤 활성화
          maxHeight: '80vh'                // 최대 높이를 화면의 70%로 제한
        }}
      >
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
