import React from 'react';
import { Card, Form, Row, Col, Button } from 'react-bootstrap';
import { FaBuilding } from 'react-icons/fa';
import LabeledFormGroup from '../../common/FormControls/LabeledFormGroup';

const PropertyInput = ({ propertyData, handlePropertyChange }) => {
  const formFields = [
    { id: 'property_type', label: '매물 종류', placeholder: '예: 아파트', colSize: 3 },
    { id: 'transaction_type', label: '거래 종류', placeholder: '예: 매매', colSize: 3 },
    { id: 'price', label: '가격', placeholder: '예: 5억', colSize: 3 },
    { id: 'area', label: '면적', placeholder: '예: 84㎡', colSize: 3 },
    { id: 'city', label: '시', placeholder: '예: 서울', colSize: 2 },
    { id: 'district', label: '구', placeholder: '예: 강남구', colSize: 2 },
    { id: 'legal_dong', label: '동', placeholder: '예: 역삼동', colSize: 2 },
    { id: 'detail_address', label: '상세주소', placeholder: '예: 123-45', colSize: 6 },
    { id: 'floor', label: '층', placeholder: '예: 10층', colSize: 2 },
    { id: 'property_name', label: '단지명', placeholder: '예: 삼성래미안', colSize: 5 },
    { id: 'moving_date', label: '입주 가능일', placeholder: '예: 2024-05-01', colSize: 5 },
    { id: 'loan_available', label: '대출여부', placeholder: '예: 가능', colSize: 6 },
    { id: 'premium', label: '권리금', placeholder: '예: 500만원', colSize: 6 },
    { id: 'moving_memo', label: '이사 메모', placeholder: '메모를 입력하세요.', colSize: 12, minHeight: '100px', isScrollable: true }
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
                  value={propertyData?.[field.id] || ''}
                  onChange={(e) => handlePropertyChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  minHeight={field.minHeight}
                  isScrollable={field.isScrollable}
                />
              </Col>
            ))}
          <Row className="mt-4">
              <Col md={6}>
                <h5><strong>소유주 정보</strong></h5>
                <Row>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="성함"
                      value={propertyData?.owner_info?.owner_name || ''}
                      disabled={false}
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="연락처"
                      value={propertyData?.owner_info?.owner_contact || ''}
                      disabled={false}
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="소유주 메모"
                      value={propertyData?.owner_property_memo || ''}
                      disabled={false}
                      minHeight="100px"
                      isScrollable={true}
                    />
                  </Col>
                </Row>
              </Col>

              <Col md={6}>
                <h5><strong>세입자 정보</strong></h5>
                <Row>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="성함"
                      value={propertyData?.tenant_info?.tenant_name || ''}
                      disabled={false}
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="연락처"
                      value={propertyData?.tenant_info?.tenant_contact || ''}
                      disabled={false}
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="세입자 메모"
                      value={propertyData?.tenant_property_memo || ''}
                      disabled={false}
                      minHeight="100px"
                      isScrollable={true}
                    />
                  </Col>
                </Row>
              </Col>
            </Row>
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
