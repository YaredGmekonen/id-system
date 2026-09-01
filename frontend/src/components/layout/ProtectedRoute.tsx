import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { currentRole, currentUser } = useAuth();

  if (!currentUser || !currentRole) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentRole)) {
    // Redirect to default home page for their role
    if (currentRole === 'collector') return <Navigate to="/collector" replace />;
    if (currentRole === 'designer') return <Navigate to="/designer" replace />;
    return <Navigate to="/overview" replace />;
  }

  return <>{children}</>;
}
