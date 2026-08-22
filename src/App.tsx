import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import RolePicker from './pages/RolePicker';
import OverviewDashboard from './pages/OverviewDashboard';
import IDCardStudio from './pages/IDCardStudio';
import Designer from './pages/Designer';
import DataCollector from './pages/DataCollector';
import ArchiveDigitizer from './pages/ArchiveDigitizer';
import SystemSettings from './pages/SystemSettings';
import PaperPrintStudio from './pages/PaperPrintStudio';
import IDVerify from './pages/IDVerify';
import LoadingSpinner from './components/shared/LoadingSpinner';
import { seedDatabase } from './db/seed';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedDatabase()
      .then(() => setReady(true))
      .catch(err => {
        console.error('Failed to seed database:', err);
        setReady(true);
      });
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy font-body text-paper">
        <LoadingSpinner size="lg" label="Initializing Enterprise ID Platform Engine…" />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RolePicker />} />
            <Route path="/overview" element={<OverviewDashboard />} />
            <Route path="/studio" element={<IDCardStudio />} />
            <Route path="/admin" element={<Navigate to="/overview" replace />} />
            <Route path="/designer" element={<Designer />} />
            <Route path="/collector" element={<DataCollector />} />
            <Route path="/digitizer" element={<ArchiveDigitizer />} />
            <Route path="/settings" element={<SystemSettings />} />
            <Route path="/print" element={<PaperPrintStudio />} />
            <Route path="/verify/:id" element={<IDVerify />} />
            <Route path="/verify" element={<IDVerify />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
