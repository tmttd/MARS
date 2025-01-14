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
  rightElement
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
      <Form.Control 
        type={type}
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        style={{ 
          '&::placeholder': {
            color: '#e0e0e0'
          }
        }}
        onFocus={(e) => e.target.placeholder = ''} 
        onBlur={(e) => e.target.placeholder = placeholder} 
      />
    </Form.Group>
  );
};

export default LabeledFormGroup;
