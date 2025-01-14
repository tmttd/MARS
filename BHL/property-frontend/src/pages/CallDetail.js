import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import { callService, audioService, propertyService } from '../services/api';

// 컴포넌트 import
import BackButton from '../components/common/BackButton';
import CallInformation from '../components/call/detail/CallInformation';
import ExtractedProperty from '../components/call/detail/ExtractedProperty';
import PropertyInput from '../components/call/detail/PropertyInput';
import CallContentModal from '../components/call/detail/CallContentModal';

const CallDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditingCall, setIsEditingCall] = useState(false);
  const [editData, setEditData] = useState(null);
  const [extractedPropertyData, setExtractedPropertyData] = useState({
    property_type: '',
    transaction_type: '',
    city: '',
    district: '',
    legal_dong: '',
    property_name: '',
    detail_address: '',
    call_memo: ''
  });
  const [isEditingProperty, setIsEditingProperty] = useState(false);
  const [propertyData, setPropertyData] = useState({
    property_type: '',
    transaction_type: '',
    city: '',
    district: '',
    legal_dong: '',
    property_name: '',
    detail_address: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const fetchCall = async () => {
      try {
        if (location.state?.callData) {
          const callData = location.state.callData;
          setCall(callData);
          setEditData(callData);
          setExtractedPropertyData({
            property_type: callData.extracted_property_info.property_type || '',
            transaction_type: callData.extracted_property_info.transaction_type || '',
            city: callData.extracted_property_info.city || '',
            district: callData.extracted_property_info.district || '',
            legal_dong: callData.extracted_property_info.legal_dong || '',
            property_name: callData.extracted_property_info.property_name || '',
            detail_address: callData.extracted_property_info.detail_address || '',
            call_memo: callData.call_memo || ''
          });

          const propertyInfo = await propertyService.getProperty(callData.id);
          setPropertyData({
            property_type: propertyInfo.property_type || '',
            transaction_type: propertyInfo.transaction_type || '',
            city: propertyInfo.city || '',
            district: propertyInfo.district || '',
            legal_dong: propertyInfo.legal_dong || '',
            property_name: propertyInfo.property_name || '',
            detail_address: propertyInfo.detail_address || ''
          });
        } else {
          const data = await callService.getCall(id);
          setCall(data);
          setEditData(data);
          setExtractedPropertyData({
            property_type: data.extracted_property_info.property_type || '',
            transaction_type: data.extracted_property_info.transaction_type || '',
            city: data.extracted_property_info.city || '',
            district: data.extracted_property_info.district || '',
            legal_dong: data.extracted_property_info.legal_dong || '',
            property_name: data.extracted_property_info.property_name || '',
            detail_address: data.extracted_property_info.detail_address || '',
            call_memo: data.call_memo || ''
          });

          const propertyInfo = await propertyService.getProperty(data.id);
          setPropertyData({
            property_type: propertyInfo.property_type || '',
            transaction_type: propertyInfo.transaction_type || '',
            city: propertyInfo.city || '',
            district: propertyInfo.district || '',
            legal_dong: propertyInfo.legal_dong || '',
            property_name: propertyInfo.property_name || '',
            detail_address: propertyInfo.detail_address || ''
          });
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching call:', error);
        setLoading(false);
      }
    };

    fetchCall();
  }, [id, location.state]);

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    return date.toLocaleString('ko-KR');
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEditCall = () => {
    setIsEditingCall(true);
  };

  const handleSaveCall = async () => {
    try {
      const hasChanges = ['recording_date', 'customer_name', 'customer_contact', 'text', 'summary_content'].some(
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

      await callService.updateCall(call.job_id, { call_memo: editData.call_memo });
      setCall(prev => ({ ...prev, call_memo: editData.call_memo }));
      alert('메모가 저장되었습니다.');
    } catch (error) {
      alert('메모 저장 중 오류가 발생했습니다.');
    }
  };

  const handleCancelCall = () => {
    setEditData(call);
    setIsEditingCall(false);
  };

  const handleCancelMemo = () => {
    setEditData(prev => ({ ...prev, call_memo: call.call_memo }));
  };

  const handleChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEditProperty = () => {
    setIsEditingProperty(true);
  };

  const handleSaveProperty = async () => {
    try {
      const hasChanges = Object.keys(propertyData).some(key => 
        propertyData[key] !== (call.property_info[key] || '')
      );

      if (!hasChanges) {
        alert('변경된 값이 없습니다.');
        return;
      }

      // 임시 알림
      alert('구현중입니다.');
      setIsEditingProperty(false);
      
      // TODO: 실제 API 구현 시 아래 코드 사용
      // await propertyService.updateProperty(call.job_id, extractedPropertyData);
      // setCall(prev => ({ ...prev, ...extractedPropertyData }));
      // setIsEditingProperty(false);
      // alert('매물 정보가 저장되었습니다.');
      
    } catch (error) {
      alert('매물 정보 저장 중 오류가 발생했습니다.');
    }
  };

  const handleCancelProperty = () => {
    setPropertyData({
      property_type: call.property_info.property_type || '',
      transaction_type: call.property_info.transaction_type || '',
      city: call.property_info.city || '',
      district: call.property_info.district || '',
      property_name: call.property_info.property_name || '',
      detail_address: call.property_info.detail_address || '',
      legal_dong: call.property_info.legal_dong || ''
    });
    setIsEditingProperty(false);
  };

  const handlePropertyChange = (field, value) => {
    setPropertyData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleShowModal = (content) => {
    setModalContent(content);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handlePropertyReflect = (field) => {
    // 해당 필드에 반영 로직을 구현합니다.
    console.log(`Reflecting property: ${field}`);
    // 필요한 로직 추가
  };

  if (loading) return <div>Loading...</div>;

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
            handleDeleteMemo={handleCancelMemo}
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
              />
            </Col>
            <Col md={6}>
              <PropertyInput 
                propertyData={propertyData}
                handlePropertyChange={handlePropertyChange}
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