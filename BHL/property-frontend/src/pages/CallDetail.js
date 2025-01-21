import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import { callService, propertyService } from '../services/api';
import { formatDateTime } from '../utils/FormatTools';
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
    loan_info: '',     // boolean 값 가정
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
    property_id: '',
    call_memo: ''
  });
  const [propertyData, setPropertyData] = useState({
    property_id: '',
    property_name: '',
    price: '',
    city: '',
    district: '',
    legal_dong: '',
    detail_address: '',
    loan_info: '',      // boolean 값 가정
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
        
        setCall(data);
        setEditData(data);
        setExtractedPropertyData(data);
        
        const propertyInfo = await propertyService.getProperty(data.property_id);
        setPropertyData(propertyInfo);
        console.info("propertyData:", propertyInfo);
      } catch (error) {
        console.error('Error fetching call:', error);
      } finally {
        setLoading(false);
      }
    };
  
    fetchCall();
  }, [id]);

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
      if (editData.call_memo === call.call_memo) {
        alert('수정 사항이 없습니다.');
        return;
      }

      const newMemo = editData.call_memo || '';

      // 기존 데이터 가져오기
      const updatedCallData = { ...call, call_memo: newMemo };

      await callService.updateCall(call.job_id, updatedCallData);

      setCall(updatedCallData);
      setIsEditingCall(false);
      alert('메모가 저장되었습니다.');
    } catch (error) {
      alert('메모 저장 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteMemo = async () => {
    try {
      await callService.updateCall(call.job_id, { 
        call_memo: null 
      });
  
      setCall(prev => ({
        ...prev,
        call_memo: null
      }));

      setEditData(prev => ({
        ...prev,
        call_memo: null
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

  const handleChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
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
    console.log(`handlePropertyReflect 호출됨. field: ${field}`);
    console.log('extractedPropertyData:', extractedPropertyData);
    
    if (field === 'all') {
      // 모든 필드를 extractedPropertyData에서 propertyData로 덮어쓰기
      setPropertyData({
        ...extractedPropertyData, // 모든 필드를 덮어쓰기
      });
      console.log('propertyData 업데이트 (all):', {
        ...extractedPropertyData,
      });
    } else {
      // 특정 필드에 대한 반영
      setPropertyData(prevData => ({
        ...prevData,
        [field]: extractedPropertyData[field],
      }));
      console.log(`propertyData 업데이트 (${field}):`, {
        ...propertyData,
        [field]: extractedPropertyData[field],
      });
    }
  };

  const propertyReflectCancel = (field) => {
    console.log(`propertyReflectCancel 호출됨. field: ${field}`);
    
    setPropertyData(prevData => ({
      ...prevData,
      [field]: '',
    }));
    console.log(`propertyData 업데이트 취소 (${field}):`, {
      ...propertyData,
      [field]: '',
    });
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