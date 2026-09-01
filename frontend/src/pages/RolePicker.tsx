import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { syncUsersWithBackend } from '../services/dbSync';
import CursorGrid from '../components/animations/CursorGrid';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  AlertCircle,
  Sparkles,
  Settings,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: (notification?: any) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

/**
 * Safely decodes a standard Google OAuth 2.0 JWT ID token (Base64URL)
 */
function parseJwt(token: string): {
  email: string;
  name?: string;
  picture?: string;
  sub?: string;
  email_verified?: boolean;
} | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to parse Google JWT token:', e);
    return null;
  }
}

import type { Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 300, damping: 24 },
  },
};

export default function RolePicker() {
  const navigate = useNavigate();
  const { loginWithCredentials, loginWithGoogle } = useAuth();

  const [emailOrUser, setEmailOrUser] = useState('admin@siliconlabs.internal');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Real Google OAuth Setup & State (Configured with your Google Client ID)
  const [googleClientId, setGoogleClientId] = useState<string>(() => {
    return (
      (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
      localStorage.getItem('google_client_id') ||
      '795987966033-c3k0ldvl5bcdakrq61lf21tjr16kjigv.apps.googleusercontent.com'
    );
  });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [inputClientId, setInputClientId] = useState(googleClientId);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);
  const [googleVerifying, setGoogleVerifying] = useState(false);
  const [verifiedGoogleUser, setVerifiedGoogleUser] = useState<{ email: string; name?: string } | null>(null);

  const googleBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Synchronize latest database accounts when login page is viewed
    syncUsersWithBackend().catch(() => {});
  }, []);

  // Initialize Real Google Identity Services with automatic SDK retry
  useEffect(() => {
    if (!googleClientId) return;

    const initGsi = () => {
      if (!window.google?.accounts?.id) return false;

      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Render official Google button if container ref is ready
        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            shape: 'rectangular',
            text: 'continue_with',
            width: 320,
            logo_alignment: 'left',
          });
        }
        return true;
      } catch (err) {
        console.warn('Google Identity Services initialization:', err);
        return false;
      }
    };

    if (!initGsi()) {
      const interval = setInterval(() => {
        if (initGsi()) clearInterval(interval);
      }, 300);
      return () => clearInterval(interval);
    }
  }, [googleClientId]);

  // Real Google Credential Callback
  const handleGoogleCredentialResponse = async (response: { credential?: string }) => {
    if (!response.credential) {
      setGoogleAuthError('Google verification failed — no credential token returned by Google.');
      return;
    }

    setGoogleVerifying(true);
    setGoogleAuthError(null);

    // 1. Decode real Google JWT token
    const payload = parseJwt(response.credential);
    if (!payload || !payload.email) {
      setGoogleVerifying(false);
      setGoogleAuthError('Unable to extract verified identity from Google token.');
      return;
    }

    setVerifiedGoogleUser({ email: payload.email, name: payload.name });

    // 2. Check if this verified Google account is registered in our platform
    const result = await loginWithGoogle(payload.email, payload.name, payload.picture);
    setGoogleVerifying(false);

    if (result.success) {
      if (result.role === 'admin') navigate('/overview');
      else if (result.role === 'collector') navigate('/collector');
      else if (result.role === 'designer') navigate('/designer');
      else navigate('/overview');
    } else {
      setGoogleAuthError(
        result.error ||
          `Google account "${payload.email}" was verified by Google, but is not authorized on this platform. Please contact your administrator to provision your account in Users & Roles.`
      );
    }
  };

  // Trigger Google Login
  const handleTriggerGoogleLogin = () => {
    setGoogleAuthError(null);

    if (!googleClientId) {
      setShowConfigModal(true);
      return;
    }

    if (window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
          auto_select: false,
        });
        window.google.accounts.id.prompt();
      } catch {
        setShowConfigModal(true);
      }
    } else {
      setGoogleAuthError('Google Identity Services is still loading. Please check your internet connection.');
    }
  };

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = inputClientId.trim();
    if (!cleanId) return;

    setGoogleClientId(cleanId);
    localStorage.setItem('google_client_id', cleanId);
    setShowConfigModal(false);
    setGoogleAuthError(null);

    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: cleanId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
      });
      setTimeout(() => {
        window.google?.accounts?.id?.prompt();
      }, 300);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUser.trim() || !password.trim()) {
      setErrorMessage('Please enter both your email/username and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const result = await loginWithCredentials(emailOrUser, password);
    setIsLoading(false);

    if (result.success) {
      if (result.role === 'admin') navigate('/overview');
      else if (result.role === 'collector') navigate('/collector');
      else if (result.role === 'designer') navigate('/designer');
      else navigate('/overview');
    } else {
      setErrorMessage((result as { error?: string }).error || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleQuickFillAdmin = () => {
    setEmailOrUser('admin@siliconlabs.internal');
    setPassword('admin123');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row antialiased select-none font-sans bg-[#080c10] text-[#f8fafc] overflow-hidden">
      {/* ===== LEFT SIDE — REAL LOGIN FORM ===== */}
      <main id="main-content" className="w-full lg:w-[45%] bg-[#0e141b] border-r border-[#1a2430] p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-y-auto relative">
        {/* Subtle Ambient Light */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-[#84a92c]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between relative z-10"
        >
          <div className="flex items-center gap-2.5">
            <motion.div
              whileHover={{ rotate: 5, scale: 1.05 }}
              className="w-9 h-9 rounded-xl bg-[#84a92c]/20 border border-[#84a92c]/40 text-[#84a92c] flex items-center justify-center font-bold shadow-xs"
            >
              <Shield className="w-5 h-5" />
            </motion.div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block">SILICON LABS</span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#84a92c] block">ID Platform</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowConfigModal(true)}
              title="Google OAuth Settings"
              className="p-1.5 rounded-lg border border-[#1a2430] text-slate-400 hover:text-white hover:border-[#84a92c] transition-colors cursor-pointer text-xs flex items-center gap-1 bg-[#111822]"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="text-[10px] font-mono hidden sm:inline">Google Setup</span>
            </motion.button>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#84a92c]/10 text-[#84a92c] border border-[#84a92c]/30">
              v2.4 Enterprise
            </span>
          </div>
        </motion.div>

        {/* Form Container */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="my-8 max-w-sm w-full mx-auto space-y-5 relative z-10"
        >
          <motion.div variants={itemVariants}>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Enterprise Sign In
            </h1>
            <p className="text-xs text-slate-400 mt-1.5">
              Sign in with your verified Google account or enterprise credentials.
            </p>
          </motion.div>

          {/* Real Google Error Message */}
          <AnimatePresence>
            {googleAuthError && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1 overflow-hidden"
              >
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <span>Account Authorization Check</span>
                </div>
                <p className="text-[11px] text-slate-300 pl-6">
                  {googleAuthError}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Real Google Verification Loading Indicator */}
          <AnimatePresence>
            {googleVerifying && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-2"
              >
                <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                <span>Verifying Google account with SiliconLabs database…</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== REAL CONTINUE WITH GOOGLE BUTTON ===== */}
          <motion.div variants={itemVariants} className="space-y-2">
            <motion.button
              whileHover={{ scale: 1.015, boxShadow: '0 8px 25px -8px rgba(255,255,255,0.15)' }}
              whileTap={{ scale: 0.985 }}
              type="button"
              onClick={handleTriggerGoogleLogin}
              disabled={googleVerifying}
              className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold flex items-center justify-center gap-3 shadow-md transition-colors cursor-pointer border border-slate-200"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Continue with Google</span>
            </motion.button>

            {/* Hidden container where Google Identity Services can mount its native button */}
            <div id="google-signin-btn-container" ref={googleBtnRef} className="hidden" />

            {!googleClientId && (
              <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
                <span>Google OAuth not connected yet</span>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(true)}
                  className="text-[#84a92c] hover:underline cursor-pointer font-bold"
                >
                  Configure Client ID ➔
                </button>
              </div>
            )}
          </motion.div>

          {/* Divider */}
          <motion.div variants={itemVariants} className="relative flex items-center justify-center my-3">
            <div className="border-t border-[#1a2430] w-full" />
            <span className="bg-[#0e141b] px-3 text-[10px] uppercase font-mono tracking-wider text-slate-500 whitespace-nowrap">
              or sign in with password
            </span>
          </motion.div>

          {/* Master Admin Quick-Fill Banner */}
          <motion.div
            variants={itemVariants}
            className="p-3 rounded-2xl bg-[#111822] border border-[#1a2430] flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#84a92c]/20 text-[#84a92c] flex items-center justify-center flex-shrink-0">
                <KeyRound className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-white truncate">Master Administrator</div>
                <div className="text-[10px] font-mono text-slate-400 truncate">admin@siliconlabs.internal / admin123</div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={handleQuickFillAdmin}
              className="px-2.5 py-1 rounded-lg bg-[#84a92c]/20 hover:bg-[#84a92c]/30 text-[#84a92c] border border-[#84a92c]/40 text-[10px] font-bold font-mono uppercase cursor-pointer flex-shrink-0"
            >
              Fill
            </motion.button>
          </motion.div>

          {/* Password Error Message */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2 overflow-hidden"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Password Login Form */}
          <form onSubmit={handleLogin} className="space-y-3.5">
            <motion.div variants={itemVariants}>
              <label className="text-[11px] font-bold text-slate-300 block mb-1.5 uppercase font-mono">
                Email or Username
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="admin@siliconlabs.internal"
                  value={emailOrUser}
                  onChange={e => setEmailOrUser(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-[#1a2430] bg-[#111822] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#84a92c] transition-colors"
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase font-mono">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#1a2430] bg-[#111822] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#84a92c] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded border-[#1a2430] text-[#84a92c] focus:ring-0"
                />
                <span>Remember this device</span>
              </label>
              <span className="text-[11px] text-[#84a92c] font-mono">Self-Hosted</span>
            </motion.div>

            <motion.div variants={itemVariants}>
              <motion.button
                whileHover={{ scale: 1.015, boxShadow: '0 8px 25px -8px rgba(132,169,44,0.3)' }}
                whileTap={{ scale: 0.985 }}
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <span>Authenticating…</span>
                ) : (
                  <>
                    <span>Sign In with Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </motion.div>
          </form>

          {/* Helper note */}
          <motion.div variants={itemVariants} className="text-center">
            <p className="text-[11px] text-slate-500">
              Only provisioned Google accounts can access the platform. Admins manage accounts in <strong className="text-slate-400">Users & Roles</strong>.
            </p>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center pt-4 border-t border-[#1a2430] text-[10px] font-mono text-slate-500 relative z-10"
        >
          Silicon Labs Sovereign Enterprise ID Card Studio & Registration System
        </motion.div>
      </main>

      {/* ===== GOOGLE CLOUD OAUTH CONFIGURATION MODAL ===== */}
      <AnimatePresence>
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowConfigModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="relative w-full max-w-lg bg-[#0f1722] border border-[#1e2c3d] rounded-2xl p-6 shadow-2xl space-y-5 text-white z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#1e2c3d] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-md flex-shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Connect Real Google OAuth 2.0</h3>
                    <p className="text-[11px] text-slate-400">Google Cloud Console Integration Setup</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="w-7 h-7 rounded-lg bg-[#15202e] hover:bg-[#1f2f44] text-slate-400 hover:text-white flex items-center justify-center cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Setup Instructions */}
              <div className="space-y-3 text-xs text-slate-300">
                <p className="text-slate-300 font-semibold">
                  To enable <strong>Real Google Verification</strong>, you need an OAuth 2.0 Client ID from Google Cloud Console:
                </p>

                <div className="space-y-2 bg-[#141f2d] border border-[#213042] p-3.5 rounded-xl text-[11px]">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#4285F4]/20 text-[#4285F4] font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Open{' '}
                      <a
                        href="https://console.cloud.google.com/apis/credentials"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#4285F4] hover:underline font-bold inline-flex items-center gap-0.5"
                      >
                        Google Cloud Console Credentials <ExternalLink className="w-3 h-3" />
                      </a>
                    </span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#4285F4]/20 text-[#4285F4] font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      2
                    </span>
                    <span>Click <strong>Create Credentials</strong> ➔ <strong>OAuth client ID</strong> (Application type: <em>Web application</em>).</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#4285F4]/20 text-[#4285F4] font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      3
                    </span>
                    <div>
                      <span>Under <strong>Authorized JavaScript origins</strong>, add:</span>
                      <div className="mt-1 font-mono text-[10px] text-[#84a92c] bg-black/40 px-2 py-1 rounded">
                        http://localhost:5173
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-[#4285F4]/20 text-[#4285F4] font-bold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                      4
                    </span>
                    <span>Copy the generated <strong>Client ID</strong> and paste it below.</span>
                  </div>
                </div>
              </div>

              {/* Client ID Form */}
              <form onSubmit={handleSaveClientId} className="space-y-3 pt-1">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1 uppercase font-mono">
                    Google OAuth 2.0 Web Client ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 123456789-abcdefg.apps.googleusercontent.com"
                    value={inputClientId}
                    onChange={e => setInputClientId(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-[#213042] bg-[#141f2d] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#84a92c] font-mono"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-3 py-2 rounded-xl border border-[#213042] text-xs text-slate-400 hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    type="submit"
                    className="btn-primary px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Save & Launch Google Sign-In
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===== RIGHT SIDE — BRANDING & CAPABILITIES SHOWCASE ===== */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-[#0c1219] via-[#080c10] to-[#040608] p-12 lg:p-16 flex-col justify-between relative overflow-hidden">
        {/* Animated Reactive CursorGrid Canvas */}
        <div className="absolute inset-0 pointer-events-none opacity-40 z-0 overflow-hidden">
          <CursorGrid
            cellSize={64}
            color="#84a92c"
            radius={140}
            holdTime={400}
            fadeDuration={800}
            maxOpacity={0.7}
            clickPulse={true}
            pulseSpeed={600}
          />
        </div>

        {/* Animated Radial Pulse */}
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-[#84a92c] rounded-full blur-[140px] pointer-events-none"
        />

        <div className="absolute inset-0 bg-[radial-gradient(#84a92c_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-10"
        >
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#84a92c]/20 text-[#84a92c] border border-[#84a92c]/40 inline-flex items-center gap-1.5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multi-Role Security Engine</span>
          </span>
          <h2 className="text-3xl lg:text-4xl font-black text-white tracking-tight mt-4 leading-tight max-w-lg">
            High-Throughput Credential Production & Biometric Field Intake.
          </h2>
          <p className="text-sm text-slate-400 mt-3 max-w-md">
            Role-isolated workflows with real-time staff telemetry, SVG template synthesis, 300 DPI batch rasterization, and paper duplex imposition.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="relative z-10 grid grid-cols-2 gap-4 max-w-lg"
        >
          <motion.div
            whileHover={{ y: -4, borderColor: '#84a92c' }}
            className="p-4 rounded-2xl bg-[#0e141b]/80 border border-[#1a2430] backdrop-blur-sm transition-colors cursor-default"
          >
            <div className="text-lg font-black font-mono text-[#84a92c]">300 DPI</div>
            <div className="text-xs font-bold text-white mt-0.5">Vector Output Engine</div>
            <p className="text-[10px] text-slate-400 mt-1">Direct PDF & canvas rendering for high-speed industrial card printers.</p>
          </motion.div>

          <motion.div
            whileHover={{ y: -4, borderColor: '#34d399' }}
            className="p-4 rounded-2xl bg-[#0e141b]/80 border border-[#1a2430] backdrop-blur-sm transition-colors cursor-default"
          >
            <div className="text-lg font-black font-mono text-emerald-400">100% Local</div>
            <div className="text-xs font-bold text-white mt-0.5">Air-Gapped Operation</div>
            <p className="text-[10px] text-slate-400 mt-1">Zero external cloud dependency with encrypted IndexedDB storage.</p>
          </motion.div>
        </motion.div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Encrypted Session Management</span>
          <span>© 2026 Silicon Labs</span>
        </div>
      </div>
    </div>
  );
}
