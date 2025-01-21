import React from 'react';
import DatePicker from 'react-datepicker';
import { Form } from 'react-bootstrap';
import { registerLocale } from 'react-datepicker';
import ko from 'date-fns/locale/ko';
import 'react-datepicker/dist/react-datepicker.css';
import '../../../styles/common.css';

// 한국어 로케일 등록
registerLocale('ko', ko);

const LabeledFormGroup = ({ 
  label, 
  value, 
  onChange,
  disabled = false, 
  placeholder = '', 
  icon,
  rightElement,
  customContent = false,
  minHeight = 'auto',
  isScrollable = false,
  controlStyle = {},
  type = 'text', // 'text', 'select', 'date', 'textarea'
  options = [],
  unittext= '' // 필드 오른쪽에 표시할 텍스트
}) => {
  const renderInput = () => {
    if (customContent) {
      return (
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
      );
    }

    switch (type) {
      case 'select':
        return (
          <Form.Select
            value={value || ''}
            onChange={onChange}
            disabled={disabled}
            style={controlStyle}
          >
            <option value="">{placeholder || '선택하세요'}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        );

      case 'date':
        return (
          <DatePicker
            selected={value ? new Date(value) : null}
            onChange={(date) => {
              onChange({
                target: {
                  value: date ? date.toISOString().split('T')[0] : ''
                }
              });
            }}
            dateFormat="yyyy-MM-dd"
            locale="ko"
            className="form-control"
            disabled={disabled}
            placeholderText={placeholder || '날짜를 선택하세요'}
            style={controlStyle}
          />
        );

      case 'textarea':
        return (
          <Form.Control 
            as="textarea"
            value={value || ''}
            onChange={onChange}
            disabled={disabled}
            placeholder={placeholder}
            style={{ 
              minHeight,
              whiteSpace: 'pre-wrap',
              ...controlStyle
            }}
            onFocus={(e) => e.target.placeholder = ''} 
            onBlur={(e) => e.target.placeholder = placeholder} 
          />
        );

      default:
        return (
          <div className="d-flex align-items-center">
            <Form.Control 
              type={type}
              value={value || ''}
              onChange={onChange}
              disabled={disabled}
              placeholder={placeholder}
            style={{ 
              minHeight,
              ...controlStyle
            }}
            onFocus={(e) => e.target.placeholder = ''} 
            onBlur={(e) => e.target.placeholder = placeholder} 
            />
            {unittext && <span className="ms-2">{unittext}</span>}
          </div>
        );
    }
  };

  return (
    <Form.Group>
      <div className="d-flex align-items-center justify-content-between" style={{height: '28px', fontWeight: 'bold'}}>
        <Form.Label className="text-start" style={{marginRight: '8px', marginBottom: '0'}}>
          {icon && <span className="me-2">{icon}</span>}
          {label}
        </Form.Label>
        {rightElement && rightElement}
      </div>
      {renderInput()}
    </Form.Group>
  );
};

export default LabeledFormGroup;