import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { FaPlay, FaPause, FaFileAudio } from 'react-icons/fa';

const AudioPlayer = ({ 
  isPlaying, 
  progress, 
  duration, 
  handlePlayAudio, 
  handleProgressClick,
  formatTime 
}) => {
  return (
    <Card className="mb-4">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="m-0 d-flex align-items-center">
            <FaFileAudio className="me-2 text-primary" />
            통화 재생
          </h4>
          <div className="text-muted">
            {formatTime(duration * (progress / 100))} / {formatTime(duration)}
          </div>
        </div>
        
        <div className="d-flex align-items-center">
          <Button 
            variant="outline-primary" 
            className="me-3" 
            onClick={handlePlayAudio}
          >
            {isPlaying ? <FaPause /> : <FaPlay />}
          </Button>
          
          <div 
            className="progress w-100" 
            style={{ height: '20px', cursor: 'pointer' }}
            onClick={handleProgressClick}
          >
            <div 
              className="progress-bar" 
              role="progressbar" 
              style={{ width: `${progress}%` }}
              aria-valuenow={progress} 
              aria-valuemin="0" 
              aria-valuemax="100"
            />
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default AudioPlayer;
