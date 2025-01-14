import React from 'react';
import { Card, Row, Col, Button } from 'react-bootstrap';
import { FaFileAlt, FaClock, FaUser, FaPhone } from 'react-icons/fa';
import LabeledFormGroup from '../../common/FormControls/LabeledFormGroup';

const CallInformation = ({ 
  editData, 
  isEditingCall, 
  handleEditCall, 
  handleSaveCall, 
  handleCancelCall, 
  handleChange,
  formatDateTime 
}) => {
  return (
    <Card className="mb-4">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="m-0 d-flex align-items-center">
            <FaFileAlt className="me-2 text-primary" />
            통화 정보
          </h4>
          {!isEditingCall ? (
            <Button variant="outline-primary" size="sm" onClick={handleEditCall}>
              수정
            </Button>
          ) : (
            <div>
              <Button variant="success" size="sm" className="me-2" onClick={handleSaveCall}>
                저장
              </Button>
              <Button variant="secondary" size="sm" onClick={handleCancelCall}>
                취소
              </Button>
            </div>
          )}
        </div>
        <Row className="g-3">
          <Col md={3}>
            <LabeledFormGroup
              label="통화일시"
              icon={<FaClock />}
              value={formatDateTime(editData?.recording_date)}
              disabled={true}
            />
          </Col>
          <Col md={3}>
            <LabeledFormGroup
              label="성함"
              icon={<FaUser />}
              value={editData?.customer_name}
              onChange={(e) => handleChange('customer_name', e.target.value)}
              disabled={!isEditingCall}
            />
          </Col>
          <Col md={3}>
            <LabeledFormGroup
              label="연락처"
              icon={<FaPhone />}
              value={editData?.customer_contact}
              onChange={(e) => handleChange('customer_contact', e.target.value)}
              disabled={!isEditingCall}
            />
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default CallInformation;