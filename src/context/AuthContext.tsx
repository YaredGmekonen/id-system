import React, { createContext, useContext, useState } from 'react';

export type UserRole = 'admin' | 'designer' | 'collector' | 'guest';

export interface UserProfile {
  name: string;
  roleTitle: string;
  email: string;
  role: UserRole;
  avatar: string;
  workerId?: number;
  location?: string;
}

const DEFAULT_PROFILES: Record<UserRole, UserProfile> = {
  admin: {
    name: 'System Administrator',
    roleTitle: 'Systems Director',
    email: 'admin@idplatform.internal',
    role: 'admin',
    avatar: 'AK',
    location: 'Central Operations Hub',
  },
  designer: {
    name: 'Selamawit Bekele',
    roleTitle: 'Principal Credential Designer',
    email: 'designer@idplatform.internal',
    role: 'designer',
    avatar: 'SB',
    workerId: 3,
    location: 'HQ Security Operations',
  },
  collector: {
    name: 'Hanna Mengistu',
    roleTitle: 'Lead Biometrics Registrar & Field Officer',
    email: 'registrar@idplatform.internal',
    role: 'collector',
    avatar: 'HM',
    workerId: 1,
    location: 'District Station #1',
  },
  guest: {
    name: 'Guest Evaluator',
    roleTitle: 'Evaluation Sandbox Access',
    email: 'evaluator@idplatform.internal',
    role: 'guest',
    avatar: 'GU',
    location: 'Global Preview Sandbox',
  },
};

interface AuthContextType {
  currentRole: UserRole | null;
  currentUser: UserProfile | null;
  loginAs: (role: UserRole) => void;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  isAdmin: boolean;
  isDesigner: boolean;
  isCollector: boolean;
  isGuest: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(() => {
    const saved = localStorage.getItem('idplatform_role');
    return (saved as UserRole) || 'admin';
  });

  const currentUser = currentRole ? DEFAULT_PROFILES[currentRole] : null;

  const loginAs = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem('idplatform_role', role);
  };

  const logout = () => {
    setCurrentRole(null);
    localStorage.removeItem('idplatform_role');
  };

  const switchRole = (role: UserRole) => {
    setCurrentRole(role);
    localStorage.setItem('idplatform_role', role);
  };

  return (
    <AuthContext.Provider
      value={{
        currentRole,
        currentUser,
        loginAs,
        logout,
        switchRole,
        isAdmin: currentRole === 'admin',
        isDesigner: currentRole === 'designer' || currentRole === 'admin' || currentRole === 'guest',
        isCollector: currentRole === 'collector' || currentRole === 'admin' || currentRole === 'guest',
        isGuest: currentRole === 'guest',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
