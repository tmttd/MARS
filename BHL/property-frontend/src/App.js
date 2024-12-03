import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PropertyList from './pages/PropertyList';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<PropertyList />} />
      </Routes>
    </Router>
  );
}

export default App; 