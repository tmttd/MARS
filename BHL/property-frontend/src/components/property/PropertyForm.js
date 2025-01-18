// PropertyForm.js
import React, { useState } from 'react';
import { Card, Form, Row, Col, Button } from 'react-bootstrap';
import { FaBuilding } from 'react-icons/fa';
import LabeledFormGroup from '../common/FormControls/LabeledFormGroup';
import { propertyService, callService } from '../../services/api';
import { flattenData } from '../common/FlattenData';
import PropertyListModal from './PropertyListModal';

function PropertyForm({
  propertyData,
  formFields,
  title,
  rightButtonType,  // 'edit' | 'load' | undefined
  rightButton,      // 커스텀 rightButton UI
  bottomButton,     // 커스텀 bottomButton UI
  isDisabled: initialDisabled = true,
  onSubmitSuccess,
  jobId = null
}) {
  const [formData, setFormData] = useState(propertyData);
  const [isDisabled, setIsDisabled] = useState(initialDisabled);
  const [showModal, setShowModal] = useState(false);
  
  // 상태 분리: 매물 목록과 선택된 매물
  const [propertyList, setPropertyList] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);

  const handleFieldChange = (fieldId, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleComplete = () => {
    setIsDisabled(true);
  };

  const handleCancel = () => {
    setFormData(propertyData);
    setIsDisabled(true);
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
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error) {
      console.error('Property save error:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleLoad = async () => {
    try {
      const response = await propertyService.getProperties();
      setPropertyList(response);  // 매물 목록 상태 업데이트
      setShowModal(true);
    } catch (error) {
      alert('매물 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  const handleSelectedProperty = async (property) => {
    const flattenedProperty = flattenData(property);
    setSelectedProperty(flattenedProperty);
    setFormData(flattenedProperty);

    try {
      // Call 데이터 업데이트: property_id 설정
      const updatedCall = await callService.updateCall(jobId, { 
        property_id: flattenedProperty.property_id 
      });
      console.info("Call 데이터가 업데이트되었습니다.", updatedCall);
  
      // Property 데이터 업데이트: job_id 포함
      const updatedProperty = await propertyService.updateProperty(
        flattenedProperty.property_id,
        {
          ...flattenedProperty,
          job_id: jobId
        }
      );
      console.info("Property 데이터가 업데이트되었습니다.", updatedProperty);
      // 업데이트된 property 데이터를 로컬 상태에 반영
      setFormData(updatedProperty);
    } catch (error) {
      console.error("업데이트 중 오류 발생:", error);
    }
    setShowModal(false);
  
    setTimeout(() => {
      alert("선택한 매물 정보가 반영되었습니다.");
    }, 0);
  };

  const renderRightButton = () => {
    if (rightButton) {
      return React.cloneElement(rightButton, {
        onClick: rightButtonType === 'load' ? handleLoad : undefined
      });
    }
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

          {bottomButton && React.cloneElement(bottomButton, {
            onClick: handleSubmit,
            type: 'submit'
          })}

          <PropertyListModal
            show={showModal}
            onHide={() => setShowModal(false)}
            properties={propertyList}
            onSelect={handleSelectedProperty}
          />
        </Form>
      </Card.Body>
    </Card>
  );
}

export default PropertyForm;
