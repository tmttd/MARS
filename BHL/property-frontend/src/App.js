import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PropertyList from './pages/PropertyList';
import CallList from './pages/CallList';
import CallDetail from './pages/CallDetail';
import PropertyCreate from './pages/PropertyCreate';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Navigation from './components/Navigation';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/App.css';

function App() {
  return (
    <Router>
      <Navigation />
      <Routes>
        <Route path="/properties" element={<PropertyList />} />
        <Route path="/properties/create" element={<PropertyCreate />} />
        <Route path="/calls" element={<CallList />} />
        <Route path="/calls/:id" element={<CallDetail />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Home />} />
      </Routes>
    </Router>
  );
}

export default App; 