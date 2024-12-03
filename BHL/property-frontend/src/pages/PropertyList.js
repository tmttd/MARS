import React, { useState, useEffect } from 'react';
import { Container, Spinner } from 'react-bootstrap';
import PropertyTable from '../components/PropertyTable';
import { propertyService } from '../services/api';

const PropertyList = () => {
  const [extractions, setExtractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchExtractions();
  }, []);

  const fetchExtractions = async () => {
    try {
      const data = await propertyService.getAllExtractions();
      setExtractions(data);
      setLoading(false);
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <Spinner animation="border" />
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <div className="alert alert-danger">{error}</div>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4">
      <h1 className="mb-4">부동산 매물 추출 데이터</h1>
      <PropertyTable extractions={extractions} />
    </Container>
  );
};

export default PropertyList; 