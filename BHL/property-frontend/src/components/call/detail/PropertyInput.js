import React from 'react';
import PropertyForm from '../../property/PropertyForm';
import { Button } from 'react-bootstrap';
import { formFields } from '../../common/FormControls/FormField';

function PropertyInput({
  propertyData,
  jobId
}) {

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PropertyForm
        propertyData={propertyData}
        formFields={formFields}
        isDisabled={false}
        rightButton={
          <Button variant="dark" size="md">
            기존 매물 불러오기
          </Button>
        }
        rightButtonType="load"
        title="매물 입력창"
        bottomButton={
          <Button 
                variant="primary" 
                size="lg" 
                type="submit" 
                className="w-100"
              >
                저장하기
              </Button>
        }
        onSubmitSuccess={null}
        jobId={jobId}
      />
    </div>
  );
}

export default PropertyInput;
