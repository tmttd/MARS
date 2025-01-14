import React from 'react';
import { Card, Form, Row, Col, Button } from 'react-bootstrap';
import { FaBuilding } from 'react-icons/fa';
import LabeledFormGroup from '../../common/FormControls/LabeledFormGroup';

const PropertyInput = ({ propertyData, handlePropertyChange }) => {
  const formFields = [
    { id: 'property_type', label: '매물 종류', placeholder: '예: 아파트', colSize: 6 },
    { id: 'transaction_type', label: '거래유형', placeholder: '예: 매매', colSize: 6 },
    { id: 'city', label: '시', placeholder: '예: 서울', colSize: 2 },
    { id: 'district', label: '구', placeholder: '예: 강남구', colSize: 2 },
    { id: 'legal_dong', label: '동', placeholder: '예: 역삼동', colSize: 2 },
    { id: 'detail_address', label: '상세주소', placeholder: '예: 123-45', colSize: 6 },
    { id: 'property_name', label: '단지명', placeholder: '예: 삼성래미안', colSize: 12 }
  ];

  return (
    <Card style={{ height: '100%' }}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="m-0 d-flex align-items-center">
            <FaBuilding className="me-2 text-primary" />
            매물 입력창
          </h4>
        </div>
        <Form>
          <Row className="g-3">
            {formFields.map(field => (
              <Col md={field.colSize} key={field.id}>
                <LabeledFormGroup
                  label={field.label}
                  value={propertyData?.[field.id]}
                  onChange={(e) => handlePropertyChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                />
              </Col>
            ))}
          </Row>
          <div className="mt-4">
            <Button 
              variant="primary" 
              size="lg" 
              onClick={() => alert('구현 중입니다.')}
              className="w-100"
            >
              저장
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default PropertyInput;
