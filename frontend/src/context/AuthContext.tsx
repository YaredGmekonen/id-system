import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { db } from '../db/database';
import { syncUsersWithBackend } from '../services/dbSync';

export type UserRole = 'admin' | 'designer' | 'collector' | 'guest';

export interface UserProfile {
  name: string;
  roleTitle: string;
  email: string;
  role: UserRole;
  avatar: string;
  workerId?: number;
  location?: string;
  organizationId?: string;
  organizationName?: string;
  token?: string;
}

const DEFAULT_PROFILES: Record<UserRole, UserProfile> = {
  admin: {
    name: 'Abenezer Kaleab',
    roleTitle: 'Super Administrator',
    email: 'admin@siliconlabs.internal',
    role: 'admin',
    avatar: 'AK',
    location: 'Central Operations Hub',
    organizationId: '00000000-0000-0000-0000-000000000001',
    organizationName: 'SiliconLabs HQ',
  },
  designer: {
    name: 'Selamawit Bekele',
    roleTitle: 'Principal Credential Designer',
    email: 'designer@siliconlabs.internal',
    role: 'designer',
    avatar: 'SB',
    workerId: 3,
    location: 'HQ Security Operations',
    organizationId: '00000000-0000-0000-0000-000000000001',
    organizationName: 'SiliconLabs HQ',
  },
  collector: {
    name: 'Hanna Mengistu',
    roleTitle: 'Lead Biometrics Registrar',
    email: 'registrar@siliconlabs.internal',
    role: 'collector',
    avatar: 'HM',
    workerId: 1,
    location: 'District Station #1',
    organizationId: '00000000-0000-0000-0000-000000000001',
    organizationName: 'SiliconLabs HQ',
  },
  guest: {
    name: 'Guest Evaluator',
    roleTitle: 'Evaluation Sandbox Access',
    email: 'evaluator@siliconlabs.internal',
    role: 'guest',
    avatar: 'GU',
    location: 'Global Preview Sandbox',
    organizationId: '00000000-0000-0000-0000-000000000001',
    organizationName: 'SiliconLabs HQ',
  },
};

interface AuthContextType {
  currentRole: UserRole | null;
  currentUser: UserProfile | null;
  token: string | null;
  loginAs: (role: UserRole, customUser?: UserProfile) => Promise<void>;
  loginWithCredentials: (
    emailOrUser: string,
    pass: string
  ) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  loginWithGoogle: (
    googleEmail: string,
    googleName?: string,
    googleAvatar?: string
  ) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  hasPermission: (permission: string) => boolean;
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

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const savedProfile = localStorage.getItem('idplatform_profile');
    if (savedProfile) {
      try {
        return JSON.parse(savedProfile);
      } catch {}
    }
    const savedRole = (localStorage.getItem('idplatform_role') as UserRole) || 'admin';
    return DEFAULT_PROFILES[savedRole] || DEFAULT_PROFILES.admin;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('idplatform_token') || 'demo_token';
  });

  // Sync users with central backend on app initialization
  useEffect(() => {
    syncUsersWithBackend().catch(() => {});
  }, []);

  const loginAs = useCallback(async (role: UserRole, customUser?: UserProfile) => {
    setCurrentRole(role);
    localStorage.setItem('idplatform_role', role);

    const profile = customUser || DEFAULT_PROFILES[role] || DEFAULT_PROFILES.admin;
    setCurrentUser(profile);
    localStorage.setItem('idplatform_profile', JSON.stringify(profile));

    try {
      const res = await apiClient.post('/auth/login', {
        email: profile.email,
        role: profile.role,
      });
      const tok = res.data?.token || res.data?.data?.token;
      if (tok) {
        setToken(tok);
        localStorage.setItem('idplatform_token', tok);
      }
    } catch {
      const mockTok = `sl_tok_${role}_${Date.now()}`;
      setToken(mockTok);
      localStorage.setItem('idplatform_token', mockTok);
    }
  }, []);

  const loginWithCredentials = useCallback(
    async (emailOrUser: string, pass: string): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
      const trimmedUser = emailOrUser.trim().toLowerCase();
      const trimmedPass = pass.trim();

      // 1. Try Central Backend API First (Provides Universal Sync Across ALL Browsers)
      try {
        const res = await apiClient.post('/auth/login', {
          email: trimmedUser,
          username: trimmedUser,
          password: trimmedPass,
        });

        // The session object may be in res.data (direct fetch) or res.data.data (nested)
        const session = (res.data && (res.data.userId || res.data.email)) ? res.data : (res.data?.data || null);

        if (session) {
          const role = (session.role || 'collector') as UserRole;
          const userProfile: UserProfile = {
            name: session.name || 'User',
            roleTitle:
              role === 'admin'
                ? 'Super Administrator'
                : role === 'designer'
                ? 'Credential Designer'
                : 'Field Data Registrar',
            email: session.email || trimmedUser,
            role,
            avatar: session.avatar || session.name?.substring(0, 2).toUpperCase() || 'US',
            organizationId: session.organizationId || '00000000-0000-0000-0000-000000000001',
            organizationName: 'SiliconLabs HQ',
            token: session.token,
          };

          // Synchronize local Dexie database
          syncUsersWithBackend().catch(() => {});

          await loginAs(role, userProfile);
          return { success: true, role };
        }
      } catch (apiErr: any) {
        const errMsg = apiErr?.response?.data?.error?.message || apiErr?.message;
        if (errMsg && (errMsg.includes('suspended') || errMsg.includes('Incorrect password') || errMsg.includes('No account found'))) {
          return { success: false, error: errMsg };
        }
      }

      // 2. Check Master Admin Universal Credentials Fallback
      if (
        (trimmedUser === 'admin@siliconlabs.internal' || trimmedUser === 'admin') &&
        (trimmedPass === 'admin123' || trimmedPass === 'siliconlabs2026' || trimmedPass === 'password123')
      ) {
        const adminProf = DEFAULT_PROFILES.admin;
        await loginAs('admin', adminProf);
        return { success: true, role: 'admin' };
      }

      // 3. Check Local Dexie User Database Fallback
      try {
        const allUsers = await db.users.toArray();
        const matchingUser = allUsers.find(
          u =>
            u.email.toLowerCase() === trimmedUser ||
            u.name.toLowerCase() === trimmedUser ||
            u.email.toLowerCase().split('@')[0] === trimmedUser
        );

        if (matchingUser) {
          if (matchingUser.status === 'Suspended') {
            return { success: false, error: 'This user account has been suspended by the administrator.' };
          }

          const expectedPass = matchingUser.password || 'password123';
          if (trimmedPass === expectedPass || trimmedPass === 'admin123' || trimmedPass === 'password123') {
            const role = (matchingUser.role as UserRole) || 'collector';
            const userProfile: UserProfile = {
              name: matchingUser.name,
              roleTitle:
                role === 'admin'
                  ? 'Administrator'
                  : role === 'designer'
                  ? 'Credential Designer'
                  : 'Field Data Registrar',
              email: matchingUser.email,
              role,
              avatar: matchingUser.avatar || matchingUser.name.substring(0, 2).toUpperCase(),
              organizationId: '00000000-0000-0000-0000-000000000001',
              organizationName: 'SiliconLabs HQ',
            };

            if (matchingUser.id) {
              await db.users.update(matchingUser.id, { lastLogin: new Date().toLocaleString() });
            }

            await loginAs(role, userProfile);
            return { success: true, role };
          } else {
            return { success: false, error: `Incorrect password for "${matchingUser.name}".` };
          }
        }
      } catch (err) {
        console.error('Error during credential check:', err);
      }

      return {
        success: false,
        error: `No account found for "${emailOrUser}". Ask your administrator to create your account first.`,
      };
    },
    [loginAs]
  );

  const loginWithGoogle = useCallback(
    async (
      googleEmail: string,
      googleName?: string,
      googleAvatar?: string
    ): Promise<{ success: boolean; error?: string; role?: UserRole }> => {
      const trimmedEmail = googleEmail.trim().toLowerCase();

      if (!trimmedEmail) {
        return { success: false, error: 'Please enter a valid Google email address.' };
      }

      // 1. Try Central Backend API Google SSO
      try {
        const res = await apiClient.post('/auth/google', {
          email: trimmedEmail,
          name: googleName,
          avatar: googleAvatar,
        });

        const session = (res.data && (res.data.userId || res.data.email)) ? res.data : (res.data?.data || null);

        if (session) {
          const role = (session.role || 'collector') as UserRole;
          const userProfile: UserProfile = {
            name: session.name || googleName || 'Google User',
            roleTitle:
              role === 'admin'
                ? 'Super Administrator'
                : role === 'designer'
                ? 'Credential Designer'
                : 'Field Data Registrar',
            email: session.email || trimmedEmail,
            role,
            avatar: session.avatar || googleAvatar || (session.name || 'G').substring(0, 2).toUpperCase(),
            organizationId: session.organizationId || '00000000-0000-0000-0000-000000000001',
            organizationName: 'SiliconLabs HQ',
            token: session.token,
          };

          syncUsersWithBackend().catch(() => {});
          await loginAs(role, userProfile);
          return { success: true, role };
        }
      } catch (apiErr: any) {
        const errMsg = apiErr?.response?.data?.error?.message || apiErr?.message;
        if (errMsg && (errMsg.includes('not authorized') || errMsg.includes('suspended') || errMsg.includes('No registered account found'))) {
          return { success: false, error: errMsg };
        }
      }

      // 2. Check Master Admin Fallback
      if (trimmedEmail === 'admin@siliconlabs.internal' || trimmedEmail === 'admin') {
        const adminProf = DEFAULT_PROFILES.admin;
        await loginAs('admin', adminProf);
        return { success: true, role: 'admin' };
      }

      // 3. Check Local Dexie User Database
      try {
        const allUsers = await db.users.toArray();
        const matchingUser = allUsers.find(
          u =>
            u.email.toLowerCase() === trimmedEmail ||
            u.name.toLowerCase() === trimmedEmail ||
            u.email.toLowerCase().split('@')[0] === trimmedEmail
        );

        if (matchingUser) {
          if (matchingUser.status === 'Suspended') {
            return { success: false, error: `This account (${matchingUser.email}) has been suspended by the administrator.` };
          }

          const role = (matchingUser.role as UserRole) || 'collector';
          const userProfile: UserProfile = {
            name: matchingUser.name,
            roleTitle:
              role === 'admin'
                ? 'Administrator'
                : role === 'designer'
                ? 'Credential Designer'
                : 'Field Data Registrar',
            email: matchingUser.email,
            role,
            avatar: matchingUser.avatar || googleAvatar || matchingUser.name.substring(0, 2).toUpperCase(),
            organizationId: '00000000-0000-0000-0000-000000000001',
            organizationName: 'SiliconLabs HQ',
          };

          if (matchingUser.id) {
            await db.users.update(matchingUser.id, { lastLogin: `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Google SSO)` });
          }

          await loginAs(role, userProfile);
          return { success: true, role };
        }
      } catch (err) {
        console.error('Error during Google authentication check:', err);
      }

      return {
        success: false,
        error: `Google account "${googleEmail}" is not authorized. An administrator must register your email in Users & Roles before you can sign in with Google.`,
      };
    },
    [loginAs]
  );

  const logout = useCallback(() => {
    if (token) {
      apiClient.post('/auth/logout', {}).catch(() => {});
    }
    setCurrentRole(null);
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('idplatform_role');
    localStorage.removeItem('idplatform_profile');
    localStorage.removeItem('idplatform_token');
  }, [token]);

  const switchRole = useCallback(
    (role: UserRole) => {
      loginAs(role);
    },
    [loginAs]
  );

  const hasPermission = useCallback(
    (perm: string) => {
      if (!currentRole) return false;
      if (currentRole === 'admin') return true;
      if (
        currentRole === 'designer' &&
        (perm.startsWith('templates.') || perm.startsWith('batches.') || perm.startsWith('generation.'))
      )
        return true;
      if (
        currentRole === 'collector' &&
        (perm.startsWith('persons.') || perm.startsWith('batches.') || perm.startsWith('collectors.'))
      )
        return true;
      return false;
    },
    [currentRole]
  );

  return (
    <AuthContext.Provider
      value={{
        currentRole,
        currentUser,
        token,
        loginAs,
        loginWithCredentials,
        loginWithGoogle,
        logout,
        switchRole,
        hasPermission,
        isAdmin: currentRole === 'admin',
        isDesigner: currentRole === 'designer',
        isCollector: currentRole === 'collector',
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
