import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Form, Button, Card, Modal } from 'react-bootstrap';
import { FaPlay, FaPause, FaArrowLeft, FaClock, FaUser, FaPhone, FaFileAlt, FaBuilding, FaEdit, FaFileAudio, FaComments, FaFileWord } from 'react-icons/fa';
import { callService, audioService, propertyService } from '../services/api';
import '../styles/common.css';

const CallDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(new Audio());
  const [isEditingCall, setIsEditingCall] = useState(false);
  const [isEditingMemo, setIsEditingMemo] = useState(false);
  const [editData, setEditData] = useState(null);
  const [isEditingProperty, setIsEditingProperty] = useState(false);
  const [propertyData, setPropertyData] = useState(null);
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
          setPropertyData({
            property_type: callData.extracted_property_info.property_type || '',
            transaction_type: callData.extracted_property_info.transaction_type || '',
            city: callData.extracted_property_info.city || '',
            district: callData.extracted_property_info.district || '',
            complex_name: callData.extracted_property_info.property_name || '',
            detailed_address: callData.extracted_property_info.detail_address || ''
          });
        } else {
          const data = await callService.getCall(id);
          setCall(data);
          setEditData(data);
          setPropertyData({
            property_type: data.extracted_property_info.property_type || '',
            transaction_type: data.extracted_property_info.transaction_type || '',
            city: data.extracted_property_info.city || '',
            district: data.extracted_property_info.district || '',
            complex_name: data.extracted_property_info.property_name || '',
            detailed_address: data.extracted_property_info.detail_address || ''
          });
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching call:', error);
        setLoading(false);
      }
    };

    fetchCall();

    return () => {
      audioRef.current.pause();
      audioRef.current.src = '';
    };
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

  const handlePlayAudio = async () => {
    try {
      if (!audioRef.current.src) {
        const audioUrl = await audioService.playAudio(call.file_name);
        audioRef.current.src = audioUrl;
        
        audioRef.current.addEventListener('loadedmetadata', () => {
          setDuration(audioRef.current.duration);
        });

        audioRef.current.addEventListener('timeupdate', () => {
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        });

        audioRef.current.addEventListener('ended', () => {
          setIsPlaying(false);
          setProgress(0);
        });
      }

      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const handleProgressClick = (e) => {
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedValue = (x / rect.width) * audioRef.current.duration;
    audioRef.current.currentTime = clickedValue;
  };

  const handleEditCall = () => {
    setIsEditingCall(true);
  };

  const handleEditMemo = () => {
    setIsEditingMemo(true);
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
      if (editData.memo === call.memo) {
        alert('변경된 값이 없습니다.');
        return;
      }

      await callService.updateCall(call.job_id, { memo: editData.memo });
      setCall(prev => ({ ...prev, memo: editData.memo }));
      setIsEditingMemo(false);
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
    setEditData(prev => ({ ...prev, memo: call.memo }));
    setIsEditingMemo(false);
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
        propertyData[key] !== (call[key] || '')
      );

      if (!hasChanges) {
        alert('변경된 값이 없습니다.');
        return;
      }

      // 임시 알림
      alert('구현중입니다.');
      setIsEditingProperty(false);
      
      // TODO: 실제 API 구현 시 아래 코드 사용
      // await propertyService.updateProperty(call.job_id, propertyData);
      // setCall(prev => ({ ...prev, ...propertyData }));
      // setIsEditingProperty(false);
      // alert('매물 정보가 저장되었습니다.');
      
    } catch (error) {
      alert('매물 정보 저장 중 오류가 발생했습니다.');
    }
  };

  const handleCancelProperty = () => {
    setPropertyData({
      property_type: call.property_type || '',
      transaction_type: call.transaction_type || '',
      city: call.city || '',
      district: call.district || '',
      neighborhood: call.neighborhood || '',
      complex_name: call.complex_name || '',
      detailed_address: call.detailed_address || ''
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

  if (loading) return <div>Loading...</div>;

  return (
    <Container fluid className="py-4">
      <Button
        variant="link"
        className="mb-4 text-decoration-none"
        onClick={() => navigate(-1)}
      >
        <FaArrowLeft className="me-2" />
        목록으로 돌아가기
      </Button>

      <Row className="g-4">
        <Col md={12}>
          <Card className="mb-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="m-0 d-flex align-items-center">
                  <FaFileAlt className="me-2 text-primary" />
                  통화 정보
                </h4>
                {!isEditingCall ? (
                  <Button variant="outline-primary" size="sm" onClick={handleEditCall}>
                    수정
                  </Button>
                ) : (
                  <div>
                    <Button variant="success" size="sm" className="me-2" onClick={handleSaveCall}>
                      저장
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleCancelCall}>
                      취소
                    </Button>
                  </div>
                )}
              </div>
              <Form>
                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="d-flex align-items-center">
                        <FaClock className="me-2 text-muted" />
                        통화일시
                      </Form.Label>
                      <Form.Control 
                        value={isEditingCall ? editData?.recording_date : formatDateTime(editData?.recording_date) || ''}
                        onChange={(e) => handleChange('recording_date', e.target.value)}
                        disabled={!isEditingCall}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="d-flex align-items-center">
                        <FaUser className="me-2 text-muted" />
                        성명
                      </Form.Label>
                      <Form.Control 
                        value={editData?.customer_name || ''}
                        onChange={(e) => handleChange('customer_name', e.target.value)}
                        disabled={!isEditingCall}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label className="d-flex align-items-center">
                        <FaPhone className="me-2 text-muted" />
                        연락처
                      </Form.Label>
                      <Form.Control 
                        value={editData?.customer_contact || ''}
                        onChange={(e) => handleChange('customer_contact', e.target.value)}
                        disabled={!isEditingCall}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="d-flex align-items-center">
                        <FaComments className="me-2 text-muted" />
                        통화 요약
                      </Form.Label>
                      <Form.Control 
                        as="textarea" 
                        style={{ minHeight: '100px' }}
                        value={editData?.summary_content || ''}
                        onChange={(e) => handleChange('summary_content', e.target.value)}
                        disabled={!isEditingCall}
                      />
                    </Form.Group>
                  </Col>

                  <Col md={12} className="mb-2">
                    <Card className="mb-2">
                      <Card.Body>
                        <h4 className="mb-4 d-flex align-items-center">
                          <FaFileAudio className="me-2 text-primary" />
                          음성 재생
                        </h4>
                        <div className="d-flex align-items-center gap-3">
                          <Button 
                            variant="primary" 
                            onClick={handlePlayAudio}
                            className="d-flex align-items-center"
                            style={{ minWidth: '100px' }}
                          >
                            {isPlaying ? <FaPause className="me-2" /> : <FaPlay className="me-2" />}
                            재생
                          </Button>
                          <div className="audio-progress flex-grow-1">
                            <div 
                              className="progress-bar-container" 
                              onClick={handleProgressClick}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="progress">
                                <div 
                                  className="progress-bar" 
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                            <div className="d-flex justify-content-between mt-2">
                              <small className="text-muted">
                                {formatTime(duration * (progress / 100))}
                              </small>
                              <small className="text-muted">
                                {formatTime(duration)}
                              </small>
                            </div>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>

                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="d-flex align-items-center">
                        <FaFileWord className="me-2 text-muted" />
                        통화 내용
                      </Form.Label>
                      <Form.Control 
                        as="textarea" 
                        style={{ minHeight: '200px' }}
                        value={editData?.text || ''}
                        onChange={(e) => handleChange('text', e.target.value)}
                        disabled={!isEditingCall}
                      />
                      <div className="text-end">
                        <Button variant="link" onClick={() => handleShowModal(editData?.text || '')}>
                          전체 내용 보기
                        </Button>
                      </div>
                    </Form.Group>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="mb-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="m-0 d-flex align-items-center">
                  <FaEdit className="me-2 text-primary" />
                  메모
                </h4>
                {!isEditingMemo ? (
                  <Button variant="outline-primary" size="sm" onClick={handleEditMemo}>
                    수정
                  </Button>
                ) : (
                  <div>
                    <Button variant="success" size="sm" className="me-2" onClick={handleSaveMemo}>
                      저장
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleCancelMemo}>
                      취소
                    </Button>
                  </div>
                )}
              </div>
              <Form.Control 
                as="textarea" 
                rows={5} 
                value={editData?.memo || ''}
                onChange={(e) => setEditData(prev => ({ ...prev, memo: e.target.value }))}
                disabled={!isEditingMemo}
                placeholder="메모를 입력하세요..."
              />
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="mb-4">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="m-0 d-flex align-items-center">
                  <FaBuilding className="me-2 text-primary" />
                  매물 정보
                </h4>
                {!isEditingProperty ? (
                  <Button variant="outline-primary" size="sm" onClick={handleEditProperty}>
                    수정
                  </Button>
                ) : (
                  <div>
                    <Button variant="success" size="sm" className="me-2" onClick={handleSaveProperty}>
                      저장
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleCancelProperty}>
                      취소
                    </Button>
                  </div>
                )}
              </div>
              <Form>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>매물 종류</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={propertyData?.property_type || ''}
                        onChange={(e) => handlePropertyChange('property_type', e.target.value)}
                        disabled={!isEditingProperty}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>거래유형</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={propertyData?.transaction_type || ''}
                        onChange={(e) => handlePropertyChange('transaction_type', e.target.value)}
                        disabled={!isEditingProperty}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>시</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={propertyData?.city || ''}
                        onChange={(e) => handlePropertyChange('city', e.target.value)}
                        disabled={!isEditingProperty}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>구</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={propertyData?.district || ''}
                        onChange={(e) => handlePropertyChange('district', e.target.value)}
                        disabled={!isEditingProperty}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label>동</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={propertyData?.neighborhood || ''}
                        onChange={(e) => handlePropertyChange('neighborhood', e.target.value)}
                        disabled={!isEditingProperty}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label>단지명</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={propertyData?.complex_name || ''}
                        onChange={(e) => handlePropertyChange('complex_name', e.target.value)}
                        disabled={!isEditingProperty}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label>상세주소</Form.Label>
                      <Form.Control 
                        type="text" 
                        value={propertyData?.detailed_address || ''}
                        onChange={(e) => handlePropertyChange('detailed_address', e.target.value)}
                        disabled={!isEditingProperty}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="mt-4">
                  <Button 
                    variant="primary" 
                    size="lg" 
                    onClick={() => alert('구현 중입니다.')}
                    className="w-100"
                  >
                    생성
                  </Button>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal for displaying call content */}
      <Modal show={showModal} onHide={handleCloseModal} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>통화 내용</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ fontSize: '2.0rem' }}>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{modalContent}</pre>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            닫기
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CallDetail;
