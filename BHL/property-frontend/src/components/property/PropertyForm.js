// BHL/property-frontend/src/components/property/PropertyForm.js

import React, { useState, useEffect } from 'react';
import { Card, Form, Row, Col, Button } from 'react-bootstrap';
import { FaBuilding } from 'react-icons/fa';
import LabeledFormGroup from '../common/FormControls/LabeledFormGroup';
import { propertyService, callService } from '../../services/api';
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
  // 저장(submit) 진행 중인지 여부를 나타내는 상태 추가
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // 상태 분리: 매물 목록과 선택된 매물
  const [propertyList, setPropertyList] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);

  // 상태 옵션 추가
  const statusOptions = [
    '등록 대기',
    '등록 완료',
    '계약 완료',
    '기간 만료',
  ];

  useEffect(() => {
    setFormData(propertyData);
  }, [propertyData]);

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
    // 중복 클릭 방지: 이미 저장 중이면 실행하지 않음
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // 기존 job_ids 배열 복사 또는 생성 후 jobId 추가 (중복 없이)
      let updatedJobIds = formData.job_ids ? [...formData.job_ids] : [];
      if (jobId && !updatedJobIds.includes(jobId)) {
        updatedJobIds.push(jobId);
      }
      const updatedFormData = { ...formData, job_ids: updatedJobIds };
  
      let savedProperty;
      if (updatedFormData.property_id) {
        console.log('SubmitData', updatedFormData);
        // 업데이트 후 반환되는 데이터(이미 flatten된 데이터)를 변수에 할당
        savedProperty = await propertyService.updateProperty(
          updatedFormData.property_id,
          updatedFormData
        );
        alert('저장되었습니다.');
      } else {
        console.log('CreateData', updatedFormData);
        // 생성 후 반환되는 데이터를 변수에 할당
        savedProperty = await propertyService.createProperty(updatedFormData);
        alert('저장되었습니다.');
      }
  
      // 저장된 부동산의 property_id가 존재하면 최신 데이터를 백엔드로부터 다시 가져온 후 상태 업데이트
      if (savedProperty && savedProperty.property_id) {
        const freshData = await propertyService.getProperty(savedProperty.property_id);
        setFormData(freshData);
      }
  
      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
    } catch (error) {
      console.error('Property save error:', error);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      // 저장 작업이 끝나면 다시 버튼 활성화
      setIsSubmitting(false);
    }
  };
  
  const handleLoad = async () => {
    try {
      const response = await propertyService.getProperties();
      // response에서 results 배열만 추출해서 상태에 저장
      setPropertyList(response.results);  
      setShowModal(true);
    } catch (error) {
      alert('매물 목록을 불러오는 중 오류가 발생했습니다.');
    }
  };

  const handleSelectedProperty = async (property) => {
    setSelectedProperty({ ...property });
    setFormData({ ...property });
  
    try {
      // 기존 call 데이터 조회
      const existingCall = await callService.getCall(jobId);
      
      // Call 데이터 업데이트: 기존 데이터 유지하면서 property_id 추가
      const updatedCall = await callService.updateCall(jobId, { 
        ...existingCall,
        property_id: property.property_id 
      });
      console.info("Call 데이터가 업데이트되었습니다.", updatedCall);
  
      // Property 데이터 업데이트: 기존 job_ids 배열이 있으면 jobId 추가, 없으면 새 배열 생성
      const updatedProperty = await propertyService.updateProperty(
        property.property_id,
        {
          ...property,
          job_ids: property.job_ids
            ? (property.job_ids.includes(jobId) ? property.job_ids : [...property.job_ids, jobId])
            : [jobId]
        }
      );
      console.info("Property 데이터가 업데이트되었습니다.", updatedProperty);
      setFormData(updatedProperty);
    } catch (error) {
      console.error("업데이트 중 오류 발생:", error);
    }
    setShowModal(false);
  
    setTimeout(() => {
      alert("선택한 매물 정보가 반영되었습니다.");
    }, 0);
  };

  // handleStatusChange 함수 추가
  const handleStatusChange = async (newStatus) => {
    try {
      // 항상 로컬 formData는 업데이트
      setFormData(prev => ({
        ...prev,
        status: newStatus
      }));

      // property_id가 있을 때만 서버 업데이트
      if (formData.property_id) {
        const updatedData = {
          ...formData,
          status: newStatus
        };
        
        await propertyService.updateProperty(formData.property_id, updatedData);
      }
    } catch (error) {
      console.error('Status update error:', error);
    }
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
          
          {/* 상태 드롭다운 추가 */}
          <div className="d-flex align-items-center gap-3">
            <div className="d-flex align-items-center">
              <span className="me-2 fw-bold">작업 상태:</span>
              <Form.Select
                size="sm"
                value={formData?.status || ''}
                onChange={(e) => handleStatusChange(e.target.value)}
                style={{
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  width: 'auto',
                  minWidth: '100px'
                }}
              >
                <option value="">선택</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Form.Select>
            </div>
            {renderRightButton()}
          </div>
        </div>

        <Form>
          <Row className="g-3">
            {formFields.map((field) => (
              <Col md={field.colSize} key={field.id}>
                <LabeledFormGroup
                  label={field.label}
                  value={formData?.[field.id] || ''}
                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  placeholder={isDisabled ? '' : field.placeholder}
                  minHeight={field.minHeight}
                  isScrollable={field.isScrollable}
                  disabled={isDisabled}
                  type={field.type}
                  options={field.options}
                  unittext={field.unittext}
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
                      type="text"
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="연락처"
                      value={formData?.owner_contact || ''}
                      onChange={(e) => handleFieldChange('owner_contact', e.target.value)}
                      disabled={isDisabled}
                      type="text"
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="소유주 메모"
                      value={formData?.owner_property_memo || ''}
                      onChange={(e) => handleFieldChange('owner_property_memo', e.target.value)}
                      minHeight="60px"
                      isScrollable
                      disabled={isDisabled}
                      type="textarea"
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
                      type="text"
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="연락처"
                      value={formData?.tenant_contact || ''}
                      onChange={(e) => handleFieldChange('tenant_contact', e.target.value)}
                      disabled={isDisabled}
                      type="text"
                    />
                  </Col>
                  <Col md={11} className="mb-3">
                    <LabeledFormGroup
                      label="세입자 메모"
                      value={formData?.tenant_property_memo || ''}
                      onChange={(e) => handleFieldChange('tenant_property_memo', e.target.value)}
                      minHeight="60px"
                      isScrollable
                      disabled={isDisabled}
                      type="textarea"
                    />
                  </Col>
                </Row>
              </Col>
            </Row>
          </Row>

          {/* bottomButton에 isSubmitting 상태를 disabled prop으로 전달 */}
          {bottomButton && React.cloneElement(bottomButton, {
            onClick: handleSubmit,
            type: 'submit',
            disabled: isSubmitting
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
