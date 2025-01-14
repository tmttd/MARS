import React from 'react';
import { Button } from 'react-bootstrap';
import { FaPlay, FaPause } from 'react-icons/fa';

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const AudioPlayer = ({ isPlaying, progress, duration, currentTime, onPlayClick, onProgressClick }) => {
  return (
    <div>
      <div className="d-flex align-items-center">
        <Button 
          variant="primary"
          className="me-3 d-flex align-items-center" 
          onClick={onPlayClick}
          style={{ minWidth: '100px' }}
        >
          <span className="me-2" style={{ fontSize: '1.2em' }}>
            {isPlaying ? <FaPause /> : <FaPlay />}
          </span>
          <span>재생</span>
        </Button>
        
        <div className="w-100">
          <div 
            className="progress" 
            style={{ height: '20px', cursor: 'pointer' }}
            onClick={onProgressClick}
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
          <div className="d-flex justify-content-between mt-1">
            <div className="text-muted small">
              {formatTime(currentTime)}
            </div>
            <div className="text-muted small">
              {formatTime(duration)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;