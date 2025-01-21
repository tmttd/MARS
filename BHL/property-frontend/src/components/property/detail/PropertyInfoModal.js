import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import PropertyForm from '../PropertyForm';
import { formFields } from '../../common/FormControls/FormField';

const PropertyInfoModal = ({ 
  show, 
  onHide,
  propertyData,
  onUpdate
}) => {
  const [editedData, setEditedData] = useState(propertyData);

  useEffect(() => {
    setEditedData(propertyData);
  }, [propertyData]);

  return (
    <Modal show={show} onHide={onHide} size="xl" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title></Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <PropertyForm
          propertyData={editedData}
          formFields={formFields}
          title="매물 상세 정보"
          rightButtonType="edit"
          bottomButton={
            <Button 
              variant="primary" 
              size="lg"
              className="w-100"
            >
              저장하기
            </Button>
          }
          onSubmitSuccess={() => {
            onUpdate();
          }}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          닫기
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default PropertyInfoModal;