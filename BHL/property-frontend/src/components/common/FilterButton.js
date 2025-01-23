import React from 'react';
import { Button } from 'react-bootstrap';

const FilterButton = ({ label, value, onClick, isActive, activeVariant, inactiveVariant }) => {
return (
        <Button
        variant={isActive ? activeVariant : inactiveVariant}
        size="sm"
        onClick={() => onClick(value)}
        className="me-2"
        style={{
            borderRadius: '20px',
            fontSize: '0.9rem',
            padding: '4px 12px',
            fontWeight: 'bold'
        }}
        >
        {label}
        </Button>
    );
};
  
  export default FilterButton;