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
    price: '',
    area: '',
    city: '',
    district: '',
    legal_dong: '',
    property_name: '',
    detail_address: '',
    floor: '',
    moving_date: '',
    loan_available: '',
    premium: '',
    moving_memo: '',
    owner_name: '',
    owner_contact: '',
    owner_property_memo: '',
    tenant_name: '',
    tenant_contact: '',
    tenant_property_memo: '',
    call_memo: ''
  });
  const [isEditingProperty, setIsEditingProperty] = useState(false);
  const [propertyData, setPropertyData] = useState({
    property_type: '',
    transaction_type: '',
    price: '',
    area: '',
    city: '',
    district: '',
    legal_dong: '',
    floor: '',
    property_name: '',
    detail_address: '',
    moving_date: '',
    loan_available: '',
    premium: '',
    moving_memo: '',
    owner_name: '',
    owner_contact: '',
    owner_property_memo: '',
    tenant_name: '',
    tenant_contact: '',
    tenant_property_memo: ''
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
            price: callData.extracted_property_info.price || '',
            area: callData.extracted_property_info.area || '',
            city: callData.extracted_property_info.city || '',
            district: callData.extracted_property_info.district || '',
            legal_dong: callData.extracted_property_info.legal_dong || '',
            detail_address: callData.extracted_property_info.detail_address || '',
            floor: callData.extracted_property_info.floor || '',
            property_name: callData.extracted_property_info.property_name || '',
            moving_date: callData.extracted_property_info.moving_date || '',
            loan_available: callData.extracted_property_info.loan_available || '',
            premium: callData.extracted_property_info.premium || '',
            moving_memo: callData.extracted_property_info.moving_memo || '',
            owner_name: callData.owner_info?.owner_name || '',
            owner_contact: callData.owner_info?.owner_contact || '',
            owner_property_memo: callData.owner_property_memo || '',
            tenant_name: callData.tenant_info?.tenant_name || '',
            tenant_contact: callData.tenant_info?.tenant_contact || '',
            tenant_property_memo: callData.tenant_property_memo || '',
            call_memo: callData.call_memo || ''
          });

          const propertyData = await propertyService.getProperty(callData.id);
          setPropertyData({
            property_type: propertyData.property_info.property_type || '',
            transaction_type: propertyData.property_info.transaction_type || '',
            price: propertyData.property_info.price || '',
            area: propertyData.property_info.area || '',
            city: propertyData.property_info.city || '',
            district: propertyData.property_info.district || '',
            legal_dong: propertyData.property_info.legal_dong || '',
            detail_address: propertyData.property_info.detail_address || '',
            floor: propertyData.property_info.floor || '',
            property_name: propertyData.property_info.property_name || '',
            moving_date: propertyData.property_info.moving_date || '',
            loan_available: propertyData.property_info.loan_available || '',
            premium: propertyData.property_info.premium || '',
            moving_memo: propertyData.property_info.moving_memo || '',
            owner_name: propertyData.owner_info?.owner_name || '',
            owner_contact: propertyData.owner_info?.owner_contact || '',
            owner_property_memo: propertyData.owner_property_memo || '',
            tenant_name: propertyData.tenant_info?.tenant_name || '',
            tenant_contact: propertyData.tenant_info?.tenant_contact || '',
            tenant_property_memo: propertyData.tenant_property_memo || ''
          });
        } else {
          const data = await callService.getCall(id);
          setCall(data);
          setEditData(data);
          setExtractedPropertyData({
            property_type: data.extracted_property_info.property_type || '',
            transaction_type: data.extracted_property_info.transaction_type || '',
            price: data.extracted_property_info.price || '',
            area: data.extracted_property_info.area || '',
            city: data.extracted_property_info.city || '',
            district: data.extracted_property_info.district || '',
            legal_dong: data.extracted_property_info.legal_dong || '',
            detail_address: data.extracted_property_info.detail_address || '',
            floor: data.extracted_property_info.floor || '',
            property_name: data.extracted_property_info.property_name || '',
            moving_date: data.extracted_property_info.moving_date || '',
            loan_available: data.extracted_property_info.loan_available || '',
            premium: data.extracted_property_info.premium || '',
            moving_memo: data.extracted_property_info.moving_memo || '',
            owner_name: data.owner_info?.owner_name || '',
            owner_contact: data.owner_info?.owner_contact || '',
            owner_property_memo: data.owner_property_memo || '',
            tenant_name: data.tenant_info?.tenant_name || '',
            tenant_contact: data.tenant_info?.tenant_contact || '',
            tenant_property_memo: data.tenant_property_memo || '',
            call_memo: data.call_memo || ''
          });

          const propertyInfo = await propertyService.getProperty(data.id);
          setPropertyData({
            property_type: propertyInfo.property_info.property_type || '',
            transaction_type: propertyInfo.property_info.transaction_type || '',
            price: propertyInfo.property_info.price || '',
            area: propertyInfo.property_info.area || '',
            city: propertyInfo.property_info.city || '',
            district: propertyInfo.property_info.district || '',
            legal_dong: propertyInfo.property_info.legal_dong || '',
            detail_address: propertyInfo.property_info.detail_address || '',
            floor: propertyInfo.property_info.floor || '',
            property_name: propertyInfo.property_info.property_name || '',
            moving_date: propertyInfo.property_info.moving_date || '',
            loan_available: propertyInfo.property_info.loan_available || '',
            premium: propertyInfo.property_info.premium || '',
            moving_memo: propertyInfo.property_info.moving_memo || '',
            owner_name: propertyInfo.owner_info?.owner_name || '',
            owner_contact: propertyInfo.owner_info?.owner_contact || '',
            owner_property_memo: propertyInfo.owner_property_memo || '',
            tenant_name: propertyInfo.tenant_info?.tenant_name || '',
            tenant_contact: propertyInfo.tenant_info?.tenant_contact || '',
            tenant_property_memo: propertyInfo.tenant_property_memo || ''
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