import React, { useState, useRef, useEffect } from 'react';
import { Card, Row, Col, Button } from 'react-bootstrap';
import { FaFileAlt, FaClock, FaUser, FaPhone, FaComments, FaFileAudio, FaStickyNote, FaFile } from 'react-icons/fa';
import { audioService } from '../../../services/api';
import LabeledFormGroup from '../../common/FormControls/LabeledFormGroup';
import AudioPlayer from './AudioPlayer';
import CallContentModal from './CallContentModal';

const CallInformation = ({ 
  editData, 
  isEditingCall, 
  handleEditCall, 
  handleSaveCall, 
  handleCancelCall, 
  handleChange,
  handleCancelMemo,
  handleSaveMemo,
  formatDateTime 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef(new Audio());
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    return () => {
      audioRef.current.pause();
      audioRef.current.src = '';
    };
  }, []);

  const handlePlayAudio = async () => {
    try {
      if (!audioRef.current.src) {
        const audioUrl = await audioService.playAudio(editData.file_name);
        audioRef.current.src = audioUrl;
        
        audioRef.current.addEventListener('loadedmetadata', () => {
          setDuration(audioRef.current.duration);
        });

        audioRef.current.addEventListener('timeupdate', () => {
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
          setCurrentTime(audioRef.current.currentTime);
        });

        audioRef.current.addEventListener('ended', () => {
          setIsPlaying(false);
          setProgress(0);
          setCurrentTime(0);
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
    setCurrentTime(clickedValue);
  };

  return (
    <>
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
          <Row className="g-3">
            <Col md={4}>
              <LabeledFormGroup
                label="통화일시"
                icon={<FaClock />}
                value={formatDateTime(editData?.recording_date)}
                disabled={true}
              />
            </Col>
            <Col md={4}>
              <LabeledFormGroup
                label="성함"
                icon={<FaUser />}
                value={editData?.customer_name}
                onChange={(e) => handleChange('customer_name', e.target.value)}
                disabled={!isEditingCall}
              />
            </Col>
            <Col md={4}>
              <LabeledFormGroup
                label="연락처"
                icon={<FaPhone />}
                value={editData?.customer_contact}
                onChange={(e) => handleChange('customer_contact', e.target.value)}
                disabled={!isEditingCall}
              />
            </Col>
            <Col md={6}>
              <LabeledFormGroup
                label="AI 통화 요약"
                icon={<FaComments />}
                type="textarea"
                value={editData?.summary_content}
                onChange={(e) => handleChange('summary_content', e.target.value)}
                disabled={!isEditingCall}
                minHeight="100px"
                isScrollable={true}
              />
            </Col>
            <Col md={6}>
              <LabeledFormGroup
                label="통화 재생"
                icon={<FaFileAudio />}
                value={
                  <AudioPlayer
                    isPlaying={isPlaying}
                    progress={progress}
                    duration={duration}
                    currentTime={currentTime}
                    onPlayClick={handlePlayAudio}
                    onProgressClick={handleProgressClick}
                  />
                }
                customContent={true}
              />
            </Col>
            <Col md={6}>
              <LabeledFormGroup
                label="통화 내용"
                icon={<FaFile />}
                type="textarea"
                value={editData?.text}
                onChange={(e) => handleChange('text', e.target.value)}
                disabled={!isEditingCall}
                minHeight="200px"
                isScrollable={true}
              />
              <div 
                className="text-primary mt-2" 
                style={{ cursor: 'pointer', textAlign: 'right', textDecoration: 'underline' }}
                onClick={() => setShowModal(true)}
              >
                전체 내용 보기
              </div>
            </Col>

            <Col md={6}>
              <LabeledFormGroup
                label="통화 관련 메모"
                icon={<FaStickyNote />}
                type="textarea"
                value={editData?.call_memo}
                onChange={(e) => handleChange('call_memo', e.target.value)}
                minHeight="200px"
                isScrollable={true}
                placeholder="메모를 입력하세요."
                rightElement={
                  <div>
                    <Button 
                      variant="danger" 
                      size="sm" 
                      onClick={handleCancelMemo}
                      style={{ marginRight: '5px' }}
                    >
                      삭제
                    </Button>
                    <Button 
                      variant="success" 
                      size="sm" 
                      onClick={handleSaveMemo}
                    >
                      저장
                    </Button>
                  </div>
                }
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <CallContentModal 
        show={showModal} 
        onHide={() => setShowModal(false)} 
        content={editData?.text}
      />
    </>
  );
};

export default CallInformation;