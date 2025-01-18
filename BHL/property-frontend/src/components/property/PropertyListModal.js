import React from 'react';
import { Modal, Button, ListGroup } from 'react-bootstrap';

const PropertyListModal = ({ show, onHide, properties, onSelect }) => {
  return (
    console.info("properties:", properties),
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>현재 매물 목록</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ListGroup>
          {properties.map(property => (
            <ListGroup.Item
              key={property.property_id}
              onDoubleClick={() => onSelect(property)}
              style={{ cursor: 'pointer' }}
            >
              {property.property_info?.property_name} - {property.property_info?.price}만원
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          닫기
        </Button>
        <Button variant="primary" onClick={onHide}>
          확인
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PropertyListModal;