import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import { callService, propertyService } from '../services/api';
import { flattenData } from '../components/common/FlattenData';

// 컴포넌트 import
import BackButton from '../components/common/BackButton';
import CallInformation from '../components/call/detail/CallInformation';
import ExtractedProperty from '../components/call/detail/ExtractedProperty';
import PropertyInput from '../components/call/detail/PropertyInput';
import CallContentModal from '../components/call/detail/CallContentModal';

const CallDetail = () => {
  const { id } = useParams();
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditingCall, setIsEditingCall] = useState(false);
  const [editData, setEditData] = useState(null);
  const [extractedPropertyData, setExtractedPropertyData] = useState({
    property_name: '',
    price: '',
    city: '',
    district: '',
    legal_dong: '',
    detail_address: '',
    loan_available: false,     // boolean 값 가정
    transaction_type: '',
    property_type: '',
    floor: '',
    area: '',
    premium: '',
    owner_property_memo: '',
    owner_name: '',
    owner_contact: '',
    tenant_property_memo: '',
    tenant_name: '',
    tenant_contact: '',
    memo: '',
    moving_date: '',
    deposit: '',
    full_address: '',
    property_id: ''
  });
  const [propertyData, setPropertyData] = useState({
    property_id: '',
    property_name: '',
    price: '',
    city: '',
    district: '',
    legal_dong: '',
    detail_address: '',
    loan_available: false,      // boolean 값 가정
    transaction_type: '',
    property_type: '',
    floor: '',
    area: '',
    premium: '',
    owner_property_memo: '',
    owner_name: '',
    owner_contact: '',
    tenant_property_memo: '',
    tenant_name: '',
    tenant_contact: '',
    memo: '',
    moving_date: '',
    deposit: '',
    full_address: '',
    status: '',
    job_id: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchCall = async () => {
      setLoading(true);
      try {
        const data = await callService.getCall(id);
        console.info("first data:", data);
        
        // extracted_property_info를 평탄화하여 flatData 생성
        const flattenedExtractedProperty = flattenData(data);
        
        // 최상위 필드(property_id 등)를 포함하여 flatData 완성
        const flatData = {...flattenedExtractedProperty};
        
        console.info("flatData:", flatData);
  
        setCall(flatData);
        setEditData(flatData);
        setExtractedPropertyData(flatData);
        
        const propertyInfo = await propertyService.getProperty(flatData.property_id);
        // propertyInfo에도 flattenData를 적용할 수 있음 (필요하다면)
        const flattenedPropertyInfo = flattenData(propertyInfo);
        setPropertyData(flattenedPropertyInfo);
        console.info("propertyData:", flattenedPropertyInfo);
      } catch (error) {
        console.error('Error fetching call:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchCall();
  }, [id]);

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    return date.toLocaleString('ko-KR');
  };

  const handleEditCall = () => {
    setIsEditingCall(true);
  };

  const handleSaveCall = async () => {
    try {
      const hasChanges = ['recording_date', 'customer_name', 'customer_contact', 'transaction_type', 'property_name', 'detail_address', 'memo', 'summary_content'].some(
        key => editData[key] !== call[key]
      );

      if (!hasChanges) {
        alert('변경된 값이 없습니다.');
        return;
      }

      await callService.updateCall(call.job_id, editData);
      setCall(editData);
      setIsEditingCall(false);
      alert('저장되었습니다.');
    } catch (error) {
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleSaveMemo = async () => {
    try {
      if (editData.memo === call.memo) {
        alert('수정 사항이 없습니다.');
        return;
      }
  
      const newMemo = editData.memo || '';
  
      // flat 구조의 데이터를 nested 구조로 변환
      const updatedExtractedPropertyInfo = {
        ...call.extracted_property_info,
        memo: newMemo
      };
  
      await callService.updateCall(call.job_id, { 
        extracted_property_info: updatedExtractedPropertyInfo 
      });
  
      // 로컬 call 객체를 업데이트
      setCall(prev => ({
        ...prev,
        extracted_property_info: updatedExtractedPropertyInfo,
        memo: newMemo  // flat 상태 유지용으로도 저장
      }));
      alert('메모가 저장되었습니다.');
    } catch (error) {
      alert('메모 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteMemo = async () => {
    try {
      const updatedExtractedPropertyInfo = {
        ...call.extracted_property_info,
        memo: null
      };
  
      await callService.updateCall(call.job_id, { 
        extracted_property_info: updatedExtractedPropertyInfo 
      });
  
      setCall(prev => ({
        ...prev,
        extracted_property_info: updatedExtractedPropertyInfo,
        memo: null
      }));

      setEditData(prev => ({
        ...prev,
        extracted_property_info: { ...prev.extracted_property_info, memo: null },
        memo: null
      }));
  
      alert('메모가 삭제되었습니다.');
    } catch (error) {
      alert('메모 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleCancelCall = () => {
    setEditData(call);
    setIsEditingCall(false);
  };

  const handleChange = (fieldPath, value) => {
    // fieldPath가 'extracted_property_info.memo'와 같이 점(.)으로 구분된다면,
    // 이를 분석하여 중첩된 객체를 업데이트합니다.
    const fields = fieldPath.split('.');
    
    // 만약 단일 필드라면, 간단히 처리
    if (fields.length === 1) {
      setEditData(prev => ({
        ...prev,
        [fieldPath]: value
      }));
    } else {
      // 중첩 필드 처리
      setEditData(prev => {
        // 깊은 복사(deep copy)를 통해 원본 객체의 중첩 구조 보존
        let updated = { ...prev };
        let current = updated;
        
        // 마지막 키 이전까지 순회하면서 객체를 탐색
        for (let i = 0; i < fields.length - 1; i++) {
          const key = fields[i];
          current[key] = { ...current[key] };  // 깊은 복사
          current = current[key];
        }
        
        // 마지막 키에 값 할당
        current[fields[fields.length - 1]] = value;
        return updated;
      });
    }
  };

  const handlePropertyChange = (field, value) => {
    setPropertyData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };


  // 반영 버튼 관련 메서드 //

  const handlePropertyReflect = (field) => {
    if (field === 'all') {
      // 모든 필드를 extractedPropertyData에서 propertyData로 덮어쓰기
      setPropertyData({
        ...extractedPropertyData, // 모든 필드를 덮어쓰기
      });
    } else {
      // 특정 필드에 대한 반영
      setPropertyData(prevData => ({
        ...prevData,
        [field]: extractedPropertyData[field],
      }));
    }
  };

  const propertyReflectCancel = (field) => {
    setPropertyData(prevData => ({
      ...prevData,
      [field]: '',
    }));
  };


  // 로딩 중일 때 로딩 화면 표시 //
  if (loading) return <div>Loading...</div>;


  // 페이지 렌더링 //
  return (
    <Container fluid className="py-4">
      <BackButton onClick={() => navigate(-1)} />
      
      <Row className="g-4">
        {/* 통화 정보 섹션 */}
        <Col md={12}>
          <CallInformation 
            editData={editData}
            isEditingCall={isEditingCall}
            handleEditCall={handleEditCall}
            handleSaveCall={handleSaveCall}
            handleCancelCall={handleCancelCall}
            handleChange={handleChange}
            formatDateTime={formatDateTime}
            handleDeleteMemo={handleDeleteMemo}
            handleSaveMemo={handleSaveMemo}
          />
        </Col>

        {/* 매물 정보 섹션 */}
        <Col md={12}>
          <Row className="h-100">
            <Col md={6}>
              <ExtractedProperty 
                extractedPropertyData={extractedPropertyData}
                handlePropertyReflect={handlePropertyReflect}
                propertyReflectCancel={propertyReflectCancel}
              />
            </Col>
            <Col md={6}>
              <PropertyInput 
                propertyData={propertyData}
                jobId={id}
              />
            </Col>
          </Row>
        </Col>
      </Row>

      {/* 통화 내용 모달 */}
      <CallContentModal 
        show={showModal}
        onHide={handleCloseModal}
        content={modalContent}
      />
    </Container>
  );
};

export default CallDetail;