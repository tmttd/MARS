import React, { useState } from 'react';
import { Card, Form, Row, Col, Button } from 'react-bootstrap';
import { FaRobot } from 'react-icons/fa';
import LabeledFormGroup from '../../common/FormControls/LabeledFormGroup';
import RenderReflectButton from '../../common/RenderReflectButton';

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
            <Col md={3}>
              <LabeledFormGroup
                label="매물 종류"
                value={extractedPropertyData?.property_type}
                disabled={true}
                rightElement={
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <RenderReflectButton 
                    fieldId="property_type" 
                    handlePropertyReflect={handlePropertyReflect} 
                    showActionButtons={showActionButtons} 
                  />
                  <RenderReflectButton 
                    fieldId="property_type" 
                    variant="danger"
                    handlePropertyReflect={propertyReflectCancel} 
                    showActionButtons={showActionButtons} 
                    buttonText="취소"
                  />
                </div>
                }
              />
            </Col>
            <Col md={3}>
              <LabeledFormGroup
                label="거래 종류"
                value={extractedPropertyData?.transaction_type}
                disabled={true}
                rightElement={
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <RenderReflectButton 
                    fieldId="transaction_type" 
                    handlePropertyReflect={handlePropertyReflect} 
                    showActionButtons={showActionButtons} 
                  />
                  <RenderReflectButton 
                    fieldId="transaction_type" 
                    variant="danger"
                    handlePropertyReflect={propertyReflectCancel} 
                    showActionButtons={showActionButtons} 
                    buttonText="취소"
                  />
                </div>
                }
              />
            </Col>
            <Col md={3}>
              <LabeledFormGroup
                label="가격"
                value={extractedPropertyData?.price}
                disabled={true}
                rightElement={
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <RenderReflectButton 
                    fieldId="price" 
                    handlePropertyReflect={handlePropertyReflect} 
                    showActionButtons={showActionButtons} 
                  />
                  <RenderReflectButton 
                    fieldId="price" 
                    variant="danger"
                    handlePropertyReflect={propertyReflectCancel} 
                    showActionButtons={showActionButtons} 
                    buttonText="취소"
                  />
                </div>
                }
              />
            </Col>
            <Col md={3}>
              <LabeledFormGroup
                label="면적"
                value={extractedPropertyData?.area}
                disabled={true}
                rightElement={
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <RenderReflectButton 
                    fieldId="area" 
                    handlePropertyReflect={handlePropertyReflect} 
                    showActionButtons={showActionButtons} 
                  />
                  <RenderReflectButton 
                    fieldId="area" 
                    variant="danger"
                    handlePropertyReflect={propertyReflectCancel} 
                    showActionButtons={showActionButtons} 
                    buttonText="취소"
                  />
                </div>
                }
              />
            </Col>
            <Col md={2}>
              <LabeledFormGroup
                label="시"
                value={extractedPropertyData?.city}
                disabled={true}
                rightElement={
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <RenderReflectButton 
                    fieldId="city" 
                    handlePropertyReflect={handlePropertyReflect} 
                    showActionButtons={showActionButtons} 
                  />
                  <RenderReflectButton 
                    fieldId="city" 
                    variant="danger"
                    handlePropertyReflect={propertyReflectCancel} 
                    showActionButtons={showActionButtons} 
                    buttonText="취소"
                  />
                </div>
                }
              />
            </Col>
            <Col md={2}>
              <LabeledFormGroup
                label="구"
                value={extractedPropertyData?.district}
                disabled={true}
                rightElement={
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <RenderReflectButton 
                    fieldId="district" 
                    handlePropertyReflect={handlePropertyReflect} 
                    showActionButtons={showActionButtons} 
                  />
                  <RenderReflectButton 
                    fieldId="district" 
                    variant="danger"
                    handlePropertyReflect={propertyReflectCancel} 
                    showActionButtons={showActionButtons} 
                    buttonText="취소"
                  />
                </div>
                }
              />
            </Col>
            <Col md={2}>
              <LabeledFormGroup
                label="동"
                value={extractedPropertyData?.legal_dong}
                disabled={true}
                rightElement={
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <RenderReflectButton 
                    fieldId="legal_dong" 
                    handlePropertyReflect={handlePropertyReflect} 
                    showActionButtons={showActionButtons} 
                  />
                  <RenderReflectButton 
                    fieldId="legal_dong" 
                    variant="danger"
                    handlePropertyReflect={propertyReflectCancel} 
                    showActionButtons={showActionButtons} 
                    buttonText="취소"
                  />
                </div>
                }
              />
            </Col>
            <Col md={6}>
              <LabeledFormGroup
                label="상세주소"
                value={extractedPropertyData?.detail_address}
                disabled={true}
                rightElement={
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <RenderReflectButton 
                    fieldId="detail_address" 
                    handlePropertyReflect={handlePropertyReflect} 
                    showActionButtons={showActionButtons} 
                  />
                  <RenderReflectButton 
                    fieldId="detail_address" 
                    variant="danger"
                    handlePropertyReflect={propertyReflectCancel} 
                    showActionButtons={showActionButtons} 
                    buttonText="취소"
                  />
                </div>
                }
              />
            </Col>
            <Col md={2}>
              <LabeledFormGroup
                label="층"
                value={extractedPropertyData?.floor}
                disabled={true}
                rightElement={
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <RenderReflectButton 
                    fieldId="floor" 
                    handlePropertyReflect={handlePropertyReflect} 
                    showActionButtons={showActionButtons} 
                  />
                  <RenderReflectButton 
                    fieldId="floor" 
                    variant="danger"
                    handlePropertyReflect={propertyReflectCancel} 
                    showActionButtons={showActionButtons} 
                    buttonText="취소"
                  />
                </div>
                }
              />
            </Col>
            <Col md={5}>
              <LabeledFormGroup
                label="단지명"
                value={extractedPropertyData?.property_name}
                disabled={true}
                rightElement={
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <RenderReflectButton 
                    fieldId="property_name" 
                    handlePropertyReflect={handlePropertyReflect} 
                    showActionButtons={showActionButtons} 
                  />
                  <RenderReflectButton 
                    fieldId="property_name" 
                    variant="danger"
                    handlePropertyReflect={propertyReflectCancel} 
                    showActionButtons={showActionButtons} 
                    buttonText="취소"
                  />
                </div>
                }
              />
            </Col>
            <Col md={5}>
              <LabeledFormGroup
                label="입주가능일"
                value={extractedPropertyData?.moving_date}
                disabled={true}
                rightElement={
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <RenderReflectButton 
                    fieldId="moving_date" 
                    handlePropertyReflect={handlePropertyReflect} 
                    showActionButtons={showActionButtons} 
                  />
                  <RenderReflectButton 
                    fieldId="moving_date" 
                    variant="danger"
                    handlePropertyReflect={propertyReflectCancel} 
                    showActionButtons={showActionButtons} 
                    buttonText="취소"
                  />
                </div>
                }
              />
            </Col>
            <Col md={6}>
              <LabeledFormGroup
                label="대출여부"
                value={extractedPropertyData?.loan_available}
                disabled={true}
                rightElement={
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <RenderReflectButton 
                    fieldId="loan_available" 
                    handlePropertyReflect={handlePropertyReflect} 
                    showActionButtons={showActionButtons} 
                  />
                  <RenderReflectButton 
                    fieldId="loan_available" 
                    variant="danger"
                    handlePropertyReflect={propertyReflectCancel} 
                    showActionButtons={showActionButtons} 
                    buttonText="취소"
                  />
                </div>
                }
              />
            </Col>
            <Col md={6}>
              <LabeledFormGroup
                label="권리금"
                value={extractedPropertyData?.premium}
                disabled={true}
                rightElement={
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <RenderReflectButton 
                    fieldId="premium" 
                    handlePropertyReflect={handlePropertyReflect} 
                    showActionButtons={showActionButtons} 
                  />
                  <RenderReflectButton 
                    fieldId="premium" 
                    variant="danger"
                    handlePropertyReflect={propertyReflectCancel} 
                    showActionButtons={showActionButtons} 
                    buttonText="취소"
                  />
                </div>
                }
              />
            </Col>
            <Col md={12}>
              <LabeledFormGroup
                label="메모"
                value={extractedPropertyData?.memo}
                disabled={true}
                rightElement={
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <RenderReflectButton 
                    fieldId="memo" 
                    handlePropertyReflect={handlePropertyReflect} 
                    showActionButtons={showActionButtons} 
                  />
                  <RenderReflectButton 
                    fieldId="memo" 
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
            <Row className="mt-4">
              <Col md={6}>
                <h5><strong>소유주 정보</strong></h5>
                <Row>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="성함"
                      value={extractedPropertyData?.owner_info?.owner_name || ''}
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
                      value={extractedPropertyData?.owner_info?.owner_contact || ''}
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
                      value={extractedPropertyData?.tenant_info?.tenant_name || ''}
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
                      value={extractedPropertyData?.tenant_info?.tenant_contact || ''}
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