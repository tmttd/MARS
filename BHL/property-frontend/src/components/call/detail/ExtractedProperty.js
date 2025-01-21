import React, { useState } from 'react';
import { Card, Form, Row, Col, Button } from 'react-bootstrap';
import { FaRobot } from 'react-icons/fa';
import LabeledFormGroup from '../../common/FormControls/LabeledFormGroup';
import RenderReflectButton from '../../common/RenderReflectButton';
import { formFields } from '../../common/FormControls/FormField';

const ExtractedProperty = ({ extractedPropertyData, handlePropertyReflect, propertyReflectCancel }) => {
  const [showActionButtons, setShowActionButtons] = useState(false);

  const handleReflectClick = () => {
    setShowActionButtons(true);
  };

  const handleCompleteClick = () => {
    setShowActionButtons(false);
  };

  return (
    <Card style={{ height: '100%' }}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="m-0 d-flex align-items-center">
            <FaRobot className="me-2 text-primary" />
            AI 추출 매물 정보
          </h4>
          {!showActionButtons ? (
            <Button 
              variant="primary" 
              size="md"
              onClick={handleReflectClick}
            >
              매물 입력창에 반영하기
            </Button>
          ) : (
            <div className="d-flex gap-2">
              <Button 
                variant="dark" 
                size="md"
                onClick={() => handlePropertyReflect('all')}
              >
                한꺼번에 반영
              </Button>
              <Button 
                variant="success" 
                size="md"
                onClick={handleCompleteClick}
              >
                완료
              </Button>
            </div>
          )}
        </div>
        <Form>
          <Row className="g-3">
            {formFields.map((field) => (
              <Col md={field.colSize} key={field.id}>
                <LabeledFormGroup
                  label={field.label}
                  value={extractedPropertyData?.[field.id]}
                  disabled={true}
                  rightElement={
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <RenderReflectButton 
                        fieldId={field.id} 
                        handlePropertyReflect={handlePropertyReflect} 
                        showActionButtons={showActionButtons} 
                      />
                      <RenderReflectButton 
                        fieldId={field.id} 
                        variant="danger"
                        handlePropertyReflect={propertyReflectCancel} 
                        showActionButtons={showActionButtons} 
                        buttonText="취소"
                      />
                    </div>
                  }
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
                      value={extractedPropertyData?.owner_name || ''}
                      disabled={true}
                      rightElement={
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <RenderReflectButton 
                          fieldId="owner_name" 
                          handlePropertyReflect={handlePropertyReflect} 
                          showActionButtons={showActionButtons} 
                        />
                        <RenderReflectButton 
                          fieldId="owner_name" 
                          variant="danger"
                          handlePropertyReflect={propertyReflectCancel} 
                          showActionButtons={showActionButtons} 
                          buttonText="취소"
                        />
                      </div>
                      }
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="연락처"
                      value={extractedPropertyData?.owner_contact || ''}
                      disabled={true}
                      rightElement={
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <RenderReflectButton 
                          fieldId="owner_contact" 
                          handlePropertyReflect={handlePropertyReflect} 
                          showActionButtons={showActionButtons} 
                        />
                        <RenderReflectButton 
                          fieldId="owner_contact" 
                          variant="danger"
                          handlePropertyReflect={propertyReflectCancel} 
                          showActionButtons={showActionButtons} 
                          buttonText="취소"
                        />
                      </div>
                      }
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="소유주 메모"
                      value={extractedPropertyData?.owner_property_memo || ''}
                      disabled={true}
                      rightElement={
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <RenderReflectButton 
                          fieldId="owner_property_memo" 
                          handlePropertyReflect={handlePropertyReflect} 
                          showActionButtons={showActionButtons} 
                        />
                        <RenderReflectButton 
                          fieldId="owner_property_memo" 
                          variant="danger"
                          handlePropertyReflect={propertyReflectCancel} 
                          showActionButtons={showActionButtons} 
                          buttonText="취소"
                        />
                      </div>
                      }
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
                      value={extractedPropertyData?.tenant_name || ''}
                      disabled={true}
                      rightElement={
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <RenderReflectButton 
                          fieldId="tenant_name" 
                          handlePropertyReflect={handlePropertyReflect} 
                          showActionButtons={showActionButtons} 
                        />
                        <RenderReflectButton 
                          fieldId="tenant_name" 
                          variant="danger"
                          handlePropertyReflect={propertyReflectCancel} 
                          showActionButtons={showActionButtons} 
                          buttonText="취소"
                        />
                      </div>
                      }
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="연락처"
                      value={extractedPropertyData?.tenant_contact || ''}
                      disabled={true}
                      rightElement={
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <RenderReflectButton 
                          fieldId="tenant_contact" 
                          handlePropertyReflect={handlePropertyReflect} 
                          showActionButtons={showActionButtons} 
                        />
                        <RenderReflectButton 
                          fieldId="tenant_contact" 
                          variant="danger"
                          handlePropertyReflect={propertyReflectCancel} 
                          showActionButtons={showActionButtons} 
                          buttonText="취소"
                        />
                      </div>
                      }
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="세입자 메모"
                      value={extractedPropertyData?.tenant_property_memo || ''}
                      disabled={true}
                      rightElement={
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <RenderReflectButton 
                          fieldId="tenant_property_memo" 
                          handlePropertyReflect={handlePropertyReflect} 
                          showActionButtons={showActionButtons} 
                        />
                        <RenderReflectButton 
                          fieldId="tenant_property_memo" 
                          variant="danger"
                          handlePropertyReflect={propertyReflectCancel} 
                          showActionButtons={showActionButtons} 
                          buttonText="취소"
                        />
                      </div>
                      }
                      minHeight="100px"
                      isScrollable={true}
                    />
                  </Col>
                </Row>
              </Col>
            </Row>
          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default ExtractedProperty;