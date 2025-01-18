import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card } from 'react-bootstrap';

const Home = () => {
  const navigate = useNavigate();

  const cardStyle = {
    width: '300px',
    cursor: 'pointer',
    margin: '30px',
    transition: 'all 0.3s ease',
    border: 'none',
    borderRadius: '15px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
  };

  const containerStyle = {
    height: '90vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8f9fa'
  };

  const menuItems = [
    {
      title: '신규 매물 등록',
      icon: 'add_home',
      path: '/properties/create',
      color: '#4CAF50'
    },
    {
      title: '통화 기록',
      icon: 'phone_callback',
      path: '/calls',
      color: '#2196F3'
    },
    {
      title: '매물 관리',
      icon: 'apartment',
      path: '/properties',
      color: '#FF9800'
    }
  ];

  return (
    <Container style={containerStyle}>
      <Row className="justify-content-center">
        {menuItems.map((item, index) => (
          <Col key={index} xs={12} md={4} className="text-center">
            <Card 
              style={cardStyle} 
              onClick={() => navigate(item.path)}
              className="mx-auto hover-effect"
            >
              <Card.Body className="d-flex flex-column align-items-center">
                <span 
                  className="material-icons"
                  style={{
                    fontSize: '150px',
                    color: item.color,
                    marginBottom: '15px',
                    transition: 'transform 0.3s ease'
                  }}
                >
                  {item.icon}
                </span>
                <Card.Title 
                  style={{
                    color: '#333',
                    fontSize: '1.8rem',
                    fontWeight: '500'
                  }}
                >
                  {item.title}
                </Card.Title>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
};

// CSS를 추가하기 위한 스타일 태그
const styles = `
  .hover-effect:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 12px rgba(0,0,0,0.15);
  }
  
  .hover-effect:hover .material-icons {
    transform: scale(1.1);
  }
`;

// 스타일 태그를 head에 추가
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default Home;