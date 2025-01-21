import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap';
import BackButton from '../components/common/BackButton';
import PropertyForm from '../components/property/PropertyForm';
import { formFields } from '../components/common/FormControls/FormField';

const PropertyCreate = () => {
  const [propertyData, setPropertyData] = useState({
    property_name: null,
    price: null,
    city: null,
    district: null,
    legal_dong: null,
    detail_address: null,
    loan_available: null,
    transaction_type: null,
    property_type: null,
    floor: null,
    area: null,
    premium: null,
    owner_property_memo: null,
    owner_name: null,
    owner_contact: null,
    tenant_property_memo: null,
    tenant_name: null,
    tenant_contact: null,
    memo: null,
    moving_date: null
  });

  const navigate = useNavigate();

  // 페이지 렌더링 //
  return (
    <Container fluid className="py-4">
      <BackButton onClick={() => navigate(-1)} />
      
      <Row className="g-4">
        {/* 매물 입력창 렌더링 */}
        <Col md={12}>
            <PropertyForm
            propertyData={propertyData}
            formFields={formFields}
            title="신규 매물 등록"
            rightButtonType="load"
            rightButton={
                <Button variant="dark" size="md">
                  기존 매물 불러오기
                </Button>
              }
            bottomButton={
                <Button 
                      variant="primary" 
                      size="lg" 
                      type="submit" 
                      className="w-100"
                    >
                      저장하기
                    </Button>
              }
            isDisabled={false}
            onSubmitSuccess={null}
            />
        </Col>
      </Row>
    </Container>
  );
};

export default PropertyCreate;