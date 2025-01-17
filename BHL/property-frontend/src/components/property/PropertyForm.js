// PropertyForm.js
import React, { useState } from 'react';
import { Card, Form, Row, Col, Button } from 'react-bootstrap';
import { FaBuilding } from 'react-icons/fa';
import LabeledFormGroup from '../common/FormControls/LabeledFormGroup';
import { propertyService } from '../../services/api';

/**
 * PropertyForm
 * 
 * @param {object} props
 * @param {object} props.propertyData      - 폼에서 표시할 매물 데이터
 * @param {array}    [props.formFields]    - 입력 필드 정의를 prop으로 받음
 * @param {node}     [props.rightButton]   - 우측 상단 버튼
 * @param {node}     [props.bottomButton]  - 하단 제출 버튼
 * @param {string}   [props.title]         - 폼 제목
 * @param {string}   [props.rightButtonType] - 우측 상단 버튼의 역할 ('edit' | 'load' | undefined)
 * 
 * @description
 * 재사용 가능한 매물 입력 Form 컴포넌트.
 * 매물 기본 정보부터 소유주/세입자 정보까지 한눈에 입력할 수 있도록 구성.
 */
function PropertyForm({
  propertyData,
  formFields,
  title,
  rightButtonType,  // 'edit' | 'load' | undefined
  rightButton,      // 커스텀 rightButton UI
  bottomButton,    // 커스텀 bottomButton UI
  isDisabled: initialDisabled = true
}) {
  const [formData, setFormData] = useState(propertyData);
  const [isDisabled, setIsDisabled] = useState(initialDisabled);

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  // 완료 버튼용 새로운 핸들러
  const handleComplete = () => {
    setIsDisabled(true);  // 수정 모드 종료
  };

  const handleCancel = () => {
    setFormData(propertyData);  // 원래 데이터로 롤백
    setIsDisabled(true);   // 수정 모드 종료
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (formData.property_id) {
        console.log('SubmitData', formData);
        await propertyService.updateProperty(formData.property_id, formData);
        alert('저장되었습니다.');
      } else {
        console.log('CreateData', formData);
        await propertyService.createProperty(formData);
        alert('저장되었습니다.');
      }
    } catch (error) {
      console.error('Property save error:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleLoad = async () => {
    try {
      const loadedProperty = await propertyService.getProperty(propertyData.property_id);
      setFormData(loadedProperty);
      alert('매물 불러오기 완료');
    } catch (error) {
      console.error('Property load error:', error);
      alert('매물 불러오기 중 오류가 발생했습니다.');
    }
  };

  // 오른쪽 버튼 렌더링 로직
  const renderRightButton = () => {
    // 커스텀 rightButton이 있는 경우
    if (rightButton) {
      return React.cloneElement(rightButton, {
        onClick: rightButtonType === 'load' ? handleLoad : undefined
      });
    }

    // edit 타입일 경우 수정/완료/취소 버튼
    if (rightButtonType === 'edit') {
      if (isDisabled) {
        return (
          <Button variant="primary" size="md" onClick={() => setIsDisabled(false)}>
            수정하기
          </Button>
        );
      }
      return (
        <div className="d-flex gap-2">
          <Button 
            variant="success" 
            size="md" 
            onClick={handleComplete}
          >
            완료
          </Button>
          <Button 
            variant="secondary" 
            size="md" 
            onClick={handleCancel}
          >
            취소
          </Button>
        </div>
      );
    }

    return null;
  };

  return (
    <Card style={{ height: '100%' }}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="m-0 d-flex align-items-center">
            <FaBuilding className="me-2 text-primary" />
            {title}
          </h4>
          {renderRightButton()}
        </div>

        <Form>
          <Row className="g-3">
            {formFields.map((field) => (
              <Col md={field.colSize} key={field.id}>
                <LabeledFormGroup
                  label={field.label}
                  value={formData?.[field.id] || ''}
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
                      value={formData?.owner_name || ''}
                      onChange={(e) => handleFieldChange('owner_name', e.target.value)}
                      disabled={isDisabled}
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="연락처"
                      value={formData?.owner_contact || ''}
                      onChange={(e) => handleFieldChange('owner_contact', e.target.value)}
                      disabled={isDisabled}
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="소유주 메모"
                      value={formData?.owner_property_memo || ''}
                      onChange={(e) => handleFieldChange('owner_property_memo', e.target.value)}
                      minHeight="100px"
                      isScrollable
                      disabled={isDisabled}
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
                      value={formData?.tenant_name || ''}
                      onChange={(e) => handleFieldChange('tenant_name', e.target.value)}
                      disabled={isDisabled}
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="연락처"
                      value={formData?.tenant_contact || ''}
                      onChange={(e) => handleFieldChange('tenant_contact', e.target.value)}
                      disabled={isDisabled}
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="세입자 메모"
                      value={formData?.tenant_property_memo || ''}
                      onChange={(e) => handleFieldChange('tenant_property_memo', e.target.value)}
                      minHeight="100px"
                      isScrollable
                      disabled={isDisabled}
                    />
                  </Col>
                </Row>
              </Col>
            </Row>
          </Row>

          {/* bottmButton이 제공된 경우에만 렌더링 */}
          {bottomButton && React.cloneElement(bottomButton, {
            onClick: handleSubmit,
            type: 'submit'
          })}
        </Form>
      </Card.Body>
    </Card>
  );
}

export default PropertyForm;
