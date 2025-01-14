import React from 'react';
import { Form } from 'react-bootstrap';

const LabeledFormGroup = ({ 
  label, 
  value, 
  onChange, 
  disabled = false, 
  placeholder = '', 
  type = 'text',
  icon,
  rightElement,
  customContent = false,
  minHeight = 'auto',
  isScrollable = false
}) => {
  return (
    <Form.Group>
      <div className="d-flex align-items-center justify-content-between" style={{height: '28px'}}>
        <Form.Label className="text-start" style={{marginRight: '8px', marginBottom: '0'}}>
          {icon && <span className="me-2">{icon}</span>}
          {label}
        </Form.Label>
        {rightElement && rightElement}
      </div>
      
      {customContent ? (
        <div 
          style={{ 
            minHeight, 
            overflowY: isScrollable ? 'auto' : 'hidden', 
            whiteSpace: 'normal',
            wordWrap: 'break-word'
          }}
        >
          {value}
        </div>
      ) : (
        <Form.Control 
          // type이 textarea일 경우 as="textarea"로 처리
          as={type === 'textarea' ? 'textarea' : 'input'}
          type={type !== 'textarea' ? type : undefined}
          value={value || ''}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          style={{ 
            minHeight,
            // textarea인 경우엔 자동 줄바꿈 지원
            whiteSpace: type === 'textarea' ? 'pre-wrap' : undefined
          }}
          // textarea에도 placeholder 지원
          onFocus={(e) => e.target.placeholder = ''} 
          onBlur={(e) => e.target.placeholder = placeholder} 
        />
      )}
    </Form.Group>
  );
};

export default LabeledFormGroup;
