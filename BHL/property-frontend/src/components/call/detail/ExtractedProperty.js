import React from 'react';
import { Card, Form, Row, Col, Button } from 'react-bootstrap';
import { FaRobot } from 'react-icons/fa';
import LabeledFormGroup from '../../common/FormControls/LabeledFormGroup';

const ExtractedProperty = ({ extractedPropertyData, handlePropertyReflect }) => {
  return (
    <Card style={{ height: '100%' }}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="m-0 d-flex align-items-center">
            <FaRobot className="me-2 text-primary" />
            AI 추출 매물 정보
          </h4>
        </div>
        <Form>
          <Row className="g-3">
            <Col md={6}>
              <LabeledFormGroup
                label="매물 종류"
                value={extractedPropertyData?.property_type}
                disabled={true}
                rightElement={
                  <Button 
                    variant="primary" 
                    size="sm" 
                    style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                    onClick={() => handlePropertyReflect('property_type')}
                  >
                    반영
                  </Button>
                }
              />
            </Col>
            <Col md={6}>
              <LabeledFormGroup
                label="거래 종류"
                value={extractedPropertyData?.transaction_type}
                disabled={true}
                rightElement={
                  <Button 
                    variant="primary" 
                    size="sm" 
                    style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                    onClick={() => handlePropertyReflect('transaction_type')}
                  >
                    반영
                  </Button>
                }
              />
            </Col>
            <Col md={2}>
              <LabeledFormGroup
                label="시"
                value={extractedPropertyData?.city}
                disabled={true}
                rightElement={
                  <Button 
                    variant="primary" 
                    size="sm" 
                    style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                    onClick={() => handlePropertyReflect('city')}
                  >
                    반영
                  </Button>
                }
              />
            </Col>
            <Col md={2}>
              <LabeledFormGroup
                label="구"
                value={extractedPropertyData?.district}
                disabled={true}
                rightElement={
                  <Button 
                    variant="primary" 
                    size="sm" 
                    style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                    onClick={() => handlePropertyReflect('district')}
                  >
                    반영
                  </Button>
                }
              />
            </Col>
            <Col md={2}>
              <LabeledFormGroup
                label="동"
                value={extractedPropertyData?.legal_dong}
                disabled={true}
                rightElement={
                  <Button 
                    variant="primary" 
                    size="sm" 
                    style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                    onClick={() => handlePropertyReflect('legal_dong')}
                  >
                    반영
                  </Button>
                }
              />
            </Col>
            <Col md={6}>
              <LabeledFormGroup
                label="상세주소"
                value={extractedPropertyData?.detail_address}
                disabled={true}
                rightElement={
                  <Button 
                    variant="primary" 
                    size="sm" 
                    style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                    onClick={() => handlePropertyReflect('detail_address')}
                  >
                    반영
                  </Button>
                }
              />
            </Col>
            <Col md={12}>
              <LabeledFormGroup
                label="단지명"
                value={extractedPropertyData?.property_name}
                disabled={true}
                rightElement={
                  <Button 
                    variant="primary" 
                    size="sm" 
                    style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                    onClick={() => handlePropertyReflect('property_name')}
                  >
                    반영
                  </Button>
                }
              />
            </Col>
          </Row>
          <div className="mt-4">
            <Button 
              variant="primary" 
              size="lg" 
              onClick={() => handlePropertyReflect('all')}
              className="w-100"
            >
              전체 반영
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default ExtractedProperty;