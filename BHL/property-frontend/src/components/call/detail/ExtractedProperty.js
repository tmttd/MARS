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
            <Col md={3}>
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
            <Col md={3}>
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
            <Col md={3}>
              <LabeledFormGroup
                label="가격"
                value={extractedPropertyData?.price}
                disabled={true}
                rightElement={
                  <Button 
                    variant="primary" 
                    size="sm" 
                    style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                    onClick={() => handlePropertyReflect('price')}
                  >
                    반영
                  </Button>
                }
              />
            </Col>
            <Col md={3}>
              <LabeledFormGroup
                label="면적"
                value={extractedPropertyData?.area}
                disabled={true}
                rightElement={
                  <Button 
                    variant="primary" 
                    size="sm" 
                    style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                    onClick={() => handlePropertyReflect('area')}
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
            <Col md={2}>
              <LabeledFormGroup
                label="층"
                value={extractedPropertyData?.floor}
                disabled={true}
                rightElement={
                  <Button 
                    variant="primary" 
                    size="sm" 
                    style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                    onClick={() => handlePropertyReflect('floor')}
                  >
                    반영
                  </Button>
                }
              />
            </Col>
            <Col md={5}>
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
            <Col md={5}>
              <LabeledFormGroup
                label="입주가능일"
                value={extractedPropertyData?.moving_date}
                disabled={true}
                rightElement={
                  <Button 
                    variant="primary" 
                    size="sm" 
                    style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                    onClick={() => handlePropertyReflect('moving_date')}
                  >
                    반영
                  </Button>
                }
              />
            </Col>
            <Col md={6}>
              <LabeledFormGroup
                label="대출여부"
                value={extractedPropertyData?.loan_available}
                disabled={true}
                rightElement={
                  <Button 
                    variant="primary" 
                    size="sm" 
                    style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                    onClick={() => handlePropertyReflect('loan_available')}
                  >
                    반영
                  </Button>
                }
              />
            </Col>
            <Col md={6}>
              <LabeledFormGroup
                label="권리금"
                value={extractedPropertyData?.premium}
                disabled={true}
                rightElement={
                  <Button 
                    variant="primary" 
                    size="sm" 
                    style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                    onClick={() => handlePropertyReflect('premium')}
                  >
                    반영
                  </Button>
                }
              />
            </Col>
            <Col md={12}>
              <LabeledFormGroup
                label="이사 메모"
                value={extractedPropertyData?.moving_memo}
                disabled={true}
                rightElement={
                  <Button 
                    variant="primary" 
                    size="sm" 
                    style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                    onClick={() => handlePropertyReflect('moving_memo')}
                  >
                    반영
                  </Button>
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
                        <Button 
                          variant="primary" 
                          size="sm" 
                          style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                          onClick={() => handlePropertyReflect('moving_memo')}
                        >
                          반영
                        </Button>
                      }
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="연락처"
                      value={extractedPropertyData?.owner_info?.owner_contact || ''}
                      disabled={true}
                      rightElement={
                        <Button 
                          variant="primary" 
                          size="sm" 
                          style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                          onClick={() => handlePropertyReflect('moving_memo')}
                        >
                          반영
                        </Button>
                      }
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="소유주 메모"
                      value={extractedPropertyData?.owner_property_memo || ''}
                      disabled={true}
                      rightElement={
                        <Button 
                          variant="primary" 
                          size="sm" 
                          style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                          onClick={() => handlePropertyReflect('moving_memo')}
                        >
                          반영
                        </Button>
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
                        <Button 
                          variant="primary" 
                          size="sm" 
                          style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                          onClick={() => handlePropertyReflect('moving_memo')}
                        >
                          반영
                        </Button>
                      }
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="연락처"
                      value={extractedPropertyData?.tenant_info?.tenant_contact || ''}
                      disabled={true}
                      rightElement={
                        <Button 
                          variant="primary" 
                          size="sm" 
                          style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                          onClick={() => handlePropertyReflect('moving_memo')}
                        >
                          반영
                        </Button>
                      }
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="세입자 메모"
                      value={extractedPropertyData?.tenant_property_memo || ''}
                      disabled={true}
                      rightElement={
                        <Button 
                          variant="primary" 
                          size="sm" 
                          style={{fontSize: '0.8rem', padding: '0.2rem 0.5rem'}}
                          onClick={() => handlePropertyReflect('moving_memo')}
                        >
                          반영
                        </Button>
                      }
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