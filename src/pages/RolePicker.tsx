import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type UserRole } from '../context/AuthContext';

export default function RolePicker() {
  const navigate = useNavigate();
  const { loginAs } = useAuth();

  const [email, setEmail] = useState('admin@siliconlabs.internal');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [showForgotModal, setShowForgotModal] = useState(false);

  const ROLES: {
    role: UserRole;
    name: string;
    title: string;
    email: string;
    path: string;
    desc: string;
    renderIcon: () => React.ReactNode;
  }[] = [
    {
      role: 'admin',
      name: 'System Administrator',
      title: 'Administrator',
      email: 'admin@siliconlabs.internal',
      path: '/overview',
      desc: 'Operations dashboard, user management & reports',
      renderIcon: () => (
        <svg className="w-5 h-5 text-[#84a92c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.11v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      role: 'designer',
      name: 'Credential Designer',
      title: 'Card Designer',
      email: 'designer@siliconlabs.internal',
      path: '/designer',
      desc: 'Template editor, dynamic data bindings & canvas',
      renderIcon: () => (
        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
        </svg>
      ),
    },
    {
      role: 'collector',
      name: 'Field Registrar',
      title: 'Data Collector',
      email: 'registrar@siliconlabs.internal',
      path: '/collector',
      desc: 'Registration form, camera capture & offline sync',
      renderIcon: () => (
        <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        </svg>
      ),
    },
    {
      role: 'guest',
      name: 'Guest Evaluator',
      title: 'Evaluator',
      email: 'evaluator@siliconlabs.internal',
      path: '/studio',
      desc: 'ID Card Studio, live preview & batch output test',
      renderIcon: () => (
        <svg className="w-5 h-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm-3.375 3.375h.008v.008H7.125v-.008z" />
        </svg>
      ),
    },
  ];

  const handleRoleSelect = (roleItem: typeof ROLES[number]) => {
    setSelectedRole(roleItem.role);
    setEmail(roleItem.email);
  };

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetRole = ROLES.find(r => r.role === selectedRole) || ROLES[0];
    loginAs(targetRole.role);
    navigate(targetRole.path);
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row antialiased select-none font-sans">
      {/* ===== LEFT SIDE — LOGIN FORM ===== */}
      <div className="w-full lg:w-[45%] bg-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-y-auto">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src="/siliconlabs-logo.png" alt="SiliconLabs" className="h-10 w-auto" draggable={false} />
          <div className="leading-none">
            <span className="text-sm font-black text-slate-900 tracking-wider">
              SILICON<span className="text-[#84a92c]">LABS</span>
            </span>
            <span className="block text-[8px] text-slate-400 font-mono tracking-widest font-bold mt-0.5">
              CREDENTIAL PLATFORM
            </span>
          </div>
        </div>

        {/* Main Form */}
        <div className="my-8 max-w-sm w-full mx-auto space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-slate-500 mt-1.5">
              Sign in to the Enterprise ID Platform.
            </p>
          </div>

          {/* Role Selector */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
              Select Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(r => {
                const isSelected = selectedRole === r.role;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => handleRoleSelect(r)}
                    className={`p-3 rounded-xl text-left border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-[#84a92c] bg-[#84a92c]/5 shadow-sm'
                        : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {r.renderIcon()}
                      <span className="text-xs font-bold text-slate-800">{r.title}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 truncate pl-7">{r.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email + Password */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@siliconlabs.internal"
                required
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-[#84a92c] focus:ring-2 focus:ring-[#84a92c]/20 focus:outline-none transition-all placeholder:text-slate-300 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:border-[#84a92c] focus:ring-2 focus:ring-[#84a92c]/20 focus:outline-none transition-all placeholder:text-slate-300 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 accent-[#84a92c]"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="font-medium text-slate-400 hover:text-[#84a92c] transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Sign In */}
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-[#84a92c] hover:bg-[#6d8f22] text-white font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#84a92c]/20 cursor-pointer"
            >
              <span>Sign In</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
          <span>© 2026 SiliconLabs Technologies</span>
        </div>
      </div>

      {/* ===== RIGHT SIDE — BRAND PANEL ===== */}
      <div className="hidden lg:flex lg:w-[55%] bg-[#080c10] p-12 xl:p-16 text-white relative overflow-hidden flex-col justify-between">
        {/* Grid Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="login-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#84a92c" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#login-grid)" />
          </svg>
        </div>

        {/* Glow accent */}
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-[#84a92c]/8 rounded-full blur-[120px] pointer-events-none" />

        {/* Top Tag */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 border border-[#1a2430] bg-[#0e141b] px-3 py-1.5 rounded-lg text-[11px] font-mono text-[#9fe870]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9fe870] animate-pulse" />
            <span>Enterprise • ID • Platform</span>
          </div>
        </div>

        {/* Center */}
        <div className="relative z-10 my-auto max-w-lg space-y-5 py-8">
          <img src="/siliconlabs-logo.png" alt="SiliconLabs" className="h-20 w-auto mb-6 drop-shadow-2xl" draggable={false} />
          <h2 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Built for smarter credential solutions.
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            High-throughput personnel credential generation, real-time field data collection, and 300 DPI print-ready ID card production.
          </p>
          <div className="flex gap-6 pt-2">
            <div>
              <div className="text-xl font-bold text-[#9fe870]">300 DPI</div>
              <div className="text-[10px] text-slate-500 font-mono">PRINT OUTPUT</div>
            </div>
            <div>
              <div className="text-xl font-bold text-[#9fe870]">OFFLINE</div>
              <div className="text-[10px] text-slate-500 font-mono">FIRST ENGINE</div>
            </div>
            <div>
              <div className="text-xl font-bold text-[#9fe870]">CR80</div>
              <div className="text-[10px] text-slate-500 font-mono">STANDARD</div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10 pt-6 border-t border-[#1a2430] flex items-center justify-between text-xs text-slate-500">
          <div>
            <span className="font-semibold text-white block">SiliconLabs Enterprise</span>
            <span className="text-[11px] text-slate-500 font-mono">Offline-First Credential Engine</span>
          </div>
          <div className="font-mono text-[11px] text-[#9fe870]">
            v2.0
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Access Help</h3>
              <button
                onClick={() => setShowForgotModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Select your assigned role from the login page and click Sign In to access your workspace. Contact your administrator for access credentials.
            </p>
            <button
              onClick={() => {
                setShowForgotModal(false);
                handleLogin();
              }}
              className="w-full py-2.5 rounded-xl bg-[#84a92c] hover:bg-[#6d8f22] text-white font-bold text-sm transition-all"
            >
              Launch Workspace
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
