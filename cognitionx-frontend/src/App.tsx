import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Consultation from './pages/Consultation';
import Prescription from './pages/Prescription';
import OutbreakDashboard from './pages/OutbreakDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/consultation" element={<Consultation />} />
        <Route path="/prescription" element={<Prescription />} />
        <Route path="/outbreak" element={<OutbreakDashboard />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
