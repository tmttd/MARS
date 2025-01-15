// PropertyForm.js
import React from 'react';
import { Card, Form, Row, Col, Button } from 'react-bootstrap';
import { FaBuilding } from 'react-icons/fa';
import LabeledFormGroup from '../common/FormControls/LabeledFormGroup';

/**
 * PropertyForm
 * 
 * @param {object} props
 * @param {object} props.propertyData      - 폼에서 표시할 매물 데이터
 * @param {function} props.onChange        - 필드 값 변경 시 호출되는 콜백 (id, value) => void
 * @param {function} [props.onSubmit]      - '저장' 버튼 클릭 시 호출되는 콜백
 * @param {function} [props.onLoadProperty]- '기존 매물 불러오기' 버튼 클릭 시 호출되는 콜백
 * @param {string}   [props.submitLabel]   - 저장 버튼에 표시할 텍스트 (기본: "저장")
 * @param {array}    [props.formFields]    - 입력 필드 정의를 prop으로 받음
 * @param {boolean}  [props.isDisabled]    - 필드 비활성화 여부
 * @param {node}     [props.rightButton]   - 우측 상단 버튼 (기존 '기존 매물 불러오기' 대체)
 * @param {node}     [props.bottomButton]  - 하단 제출 버튼
 * @param {string}   [props.title]         - 폼 제목
 * @param {string}   [props.propertyInfoKey] - 매물 정보의 키
 * 
 * @description
 * 재사용 가능한 매물 입력 Form 컴포넌트.
 * 매물 기본 정보부터 소유주/세입자 정보까지 한눈에 입력할 수 있도록 구성.
 */
function PropertyForm({
  propertyData,
  onChange,
  onSubmit,
  formFields = [],
  isDisabled = false,
  rightButton = null,
  bottomButton = null,
  title = "매물 입력창",
  propertyInfoKey = 'property_info'
}) {
  const handleFieldChange = (fieldId, value) => {
    if (onChange) {
      onChange(fieldId, value);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (onSubmit) {
      onSubmit();
    }
  };

  return (
    <Card style={{ height: '100%' }}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="m-0 d-flex align-items-center">
            <FaBuilding className="me-2 text-primary" />
            {title}
          </h4>
          {rightButton && rightButton}
        </div>

        <Form onSubmit={handleSubmit}>
          <Row className="g-3">
            {formFields.map((field) => (
              <Col md={field.colSize} key={field.id}>
                <LabeledFormGroup
                  label={field.label}
                  value={propertyData?.[propertyInfoKey]?.[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={field.placeholder}
                  minHeight={field.minHeight}
                  isScrollable={field.isScrollable}
                  disabled={isDisabled}
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
                      value={propertyData?.[propertyInfoKey]?.owner_info?.owner_name || ''}
                      onChange={(e) => handleFieldChange('owner_info.owner_name', e.target.value)}
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="연락처"
                      value={propertyData?.[propertyInfoKey]?.owner_info?.owner_contact || ''}
                      onChange={(e) => handleFieldChange('owner_info.owner_contact', e.target.value)}
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="소유주 메모"
                      value={propertyData?.[propertyInfoKey]?.owner_property_memo || ''}
                      onChange={(e) => handleFieldChange('owner_property_memo', e.target.value)}
                      minHeight="100px"
                      isScrollable
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
                      value={propertyData?.[propertyInfoKey]?.tenant_info?.tenant_name || ''}
                      onChange={(e) => handleFieldChange('tenant_info.tenant_name', e.target.value)}
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="연락처"
                      value={propertyData?.[propertyInfoKey]?.tenant_info?.tenant_contact || ''}
                      onChange={(e) => handleFieldChange('tenant_info.tenant_contact', e.target.value)}
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="세입자 메모"
                      value={propertyData?.[propertyInfoKey]?.tenant_property_memo || ''}
                      onChange={(e) => handleFieldChange('tenant_property_memo', e.target.value)}
                      minHeight="100px"
                      isScrollable
                    />
                  </Col>
                </Row>
              </Col>
            </Row>
          </Row>

          <div className="mt-4">
            {bottomButton}
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
}

export default PropertyForm;
