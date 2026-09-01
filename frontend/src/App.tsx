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
import UsersPage from './pages/UsersPage';
import StaffTrackingPage from './pages/StaffTrackingPage';
import BatchFoldersPage from './pages/BatchFoldersPage';
import AuditLogsPage from './pages/AuditLogsPage';
import ProtectedRoute from './components/layout/ProtectedRoute';
import LoadingSpinner from './components/shared/LoadingSpinner';
import { seedDatabase } from './db/seed';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { startSync, stopSync } from './services/syncEngine';

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedDatabase()
      .then(() => {
        setReady(true);
        // Start real-time sync engine — polls backend every 3s
        startSync();
      })
      .catch(err => {
        console.error('Failed to seed database:', err);
        setReady(true);
        startSync(); // Still start sync even if seed fails
      });

    return () => {
      stopSync();
    };
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
            <Route
              path="/overview"
              element={
                <ProtectedRoute>
                  <OverviewDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <UsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/staff"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <StaffTrackingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/batches"
              element={
                <ProtectedRoute allowedRoles={['admin', 'collector', 'designer']}>
                  <BatchFoldersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AuditLogsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/studio"
              element={
                <ProtectedRoute allowedRoles={['admin', 'collector', 'designer', 'guest']}>
                  <IDCardStudio />
                </ProtectedRoute>
              }
            />
            <Route path="/admin" element={<Navigate to="/overview" replace />} />
            <Route
              path="/designer"
              element={
                <ProtectedRoute allowedRoles={['admin', 'designer']}>
                  <Designer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/collector"
              element={
                <ProtectedRoute allowedRoles={['admin', 'collector']}>
                  <DataCollector />
                </ProtectedRoute>
              }
            />
            <Route
              path="/digitizer"
              element={
                <ProtectedRoute allowedRoles={['admin', 'collector', 'designer']}>
                  <ArchiveDigitizer />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={['admin', 'collector', 'designer', 'guest']}>
                  <SystemSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/print"
              element={
                <ProtectedRoute allowedRoles={['admin', 'designer', 'guest']}>
                  <PaperPrintStudio />
                </ProtectedRoute>
              }
            />
            <Route path="/verify/:id" element={<IDVerify />} />
            <Route path="/verify" element={<IDVerify />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
