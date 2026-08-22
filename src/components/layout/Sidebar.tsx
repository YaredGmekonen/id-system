import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import SiliconLabsLogo from '../shared/SiliconLabsLogo';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface SidebarProps {
  onSimulateClick?: () => void;
  onCloseMobile?: () => void;
}

export default function Sidebar({ onCloseMobile }: SidebarProps = {}) {
  const { currentUser, currentRole, logout } = useAuth();
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Role-Based Filtering
  // admin: all pages
  // designer: Studio, Designer, Settings
  // collector: Collector, Digitizer, Settings
  // guest: Overview, Studio, Settings
  const role = currentRole || 'admin';

  const canAccessOverview = role === 'admin' || role === 'guest';
  const canAccessStudio = role === 'admin' || role === 'designer' || role === 'guest';
  const canAccessDesigner = role === 'admin' || role === 'designer';
  const canAccessCollector = role === 'admin' || role === 'collector';
  const canAccessDigitizer = role === 'admin' || role === 'collector' || role === 'designer';

  const handleNavClick = () => {
    setMobileOpen(false);
    onCloseMobile?.();
  };

  const navContent = (
    <div className="flex flex-col justify-between h-full select-none font-sans">
      {/* Top Section */}
      <div className="flex flex-col overflow-y-auto">
        {/* Brand Header */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border-primary)' }}
        >
          <SiliconLabsLogo size="md" subText="CREDENTIAL PLATFORM" />
          {/* Close button on mobile */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1.5 rounded-lg border hover:opacity-80"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
          >
            ✕
          </button>
        </div>

        {/* User Role Banner */}
        <div className="px-4 pt-3 pb-1">
          <div
            className="flex items-center justify-between px-3 py-1.5 rounded-xl border text-[11px] font-mono"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <span className="text-slate-500 font-bold">SESSION:</span>
            <span className="text-[#84a92c] font-black uppercase tracking-wider">{role}</span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="px-3 py-3 space-y-4 text-xs">
          {/* SECTION 1: COMMAND & OVERVIEW */}
          {canAccessOverview && (
            <div className="space-y-1">
              <p
                className="px-3 text-[10px] font-bold tracking-wider uppercase font-mono"
                style={{ color: 'var(--text-muted)' }}
              >
                Command
              </p>

              <NavLink
                to="/overview"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all ${
                    isActive
                      ? 'bg-[#198754] text-white font-bold shadow-xs'
                      : 'hover:opacity-80'
                  }`
                }
                style={({ isActive }) => ({
                  backgroundColor: isActive ? '#198754' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                })}
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                  <span>Operations Overview</span>
                </div>
              </NavLink>
            </div>
          )}

          {/* SECTION 2: PRODUCTION & STUDIO */}
          <div className="space-y-1">
            <p
              className="px-3 text-[10px] font-bold tracking-wider uppercase font-mono"
              style={{ color: 'var(--text-muted)' }}
            >
              Credentials & Production
            </p>

            {canAccessStudio && (
              <NavLink
                to="/studio"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all ${
                    isActive
                      ? 'bg-[#198754] text-white font-bold shadow-xs'
                      : 'hover:opacity-80'
                  }`
                }
                style={({ isActive }) => ({
                  backgroundColor: isActive ? '#198754' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                })}
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm-3.375 3.375h.008v.008H7.125v-.008z" />
                  </svg>
                  <span>ID Card Studio</span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#84a92c]/20 text-[#84a92c] font-bold">
                  Print A4
                </span>
              </NavLink>
            )}

            {canAccessDesigner && (
              <NavLink
                to="/designer"
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all ${
                    isActive
                      ? 'bg-[#198754] text-white font-bold shadow-xs'
                      : 'hover:opacity-80'
                  }`
                }
                style={({ isActive }) => ({
                  backgroundColor: isActive ? '#198754' : 'transparent',
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                })}
              >
                <div className="flex items-center gap-2.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                  </svg>
                  <span>Canvas Vector Designer</span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--border-primary)' }}>
                  Canva
                </span>
              </NavLink>
            )}
          </div>

          {/* SECTION 3: INTAKE & DIGITIZATION */}
          {(canAccessCollector || canAccessDigitizer) && (
            <div className="space-y-1">
              <p
                className="px-3 text-[10px] font-bold tracking-wider uppercase font-mono"
                style={{ color: 'var(--text-muted)' }}
              >
                Intake & Digitization
              </p>

              {canAccessCollector && (
                <NavLink
                  to="/collector"
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all ${
                      isActive
                        ? 'bg-[#198754] text-white font-bold shadow-xs'
                        : 'hover:opacity-80'
                    }`
                  }
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? '#198754' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  })}
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    </svg>
                    <span>Data Collector Form</span>
                  </div>
                </NavLink>
              )}

              {canAccessDigitizer && (
                <NavLink
                  to="/digitizer"
                  onClick={handleNavClick}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all ${
                      isActive
                        ? 'bg-[#198754] text-white font-bold shadow-xs'
                        : 'hover:opacity-80'
                    }`
                  }
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? '#198754' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  })}
                >
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-[#84a92c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                    <span>Archive Digitizer</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#84a92c]/20 text-[#84a92c] font-bold">
                    Excel+Crop
                  </span>
                </NavLink>
              )}
            </div>
          )}

          {/* SECTION 4: PLATFORM CONFIGURATION */}
          <div className="space-y-1">
            <p
              className="px-3 text-[10px] font-bold tracking-wider uppercase font-mono"
              style={{ color: 'var(--text-muted)' }}
            >
              System
            </p>

            <NavLink
              to="/settings"
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all ${
                  isActive
                    ? 'bg-[#198754] text-white font-bold shadow-xs'
                    : 'hover:opacity-80'
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? '#198754' : 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
              })}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>System Settings</span>
            </NavLink>
          </div>
        </nav>
      </div>

      {/* Bottom Profile Area */}
      <div
        className="p-3 space-y-2"
        style={{
          borderTop: '1px solid var(--border-primary)',
          backgroundColor: 'var(--bg-root)',
        }}
      >
        {/* Theme Toggle + Sign Out */}
        <div className="flex items-center justify-between px-2">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-lg transition-colors cursor-pointer hover:opacity-80"
            style={{ color: 'var(--text-secondary)' }}
          >
            {isDark ? (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>

          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>

        {/* User Card */}
        <div
          className="flex items-center gap-2.5 p-2 rounded-xl border"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-primary)',
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
            style={{
              backgroundColor: 'rgba(132, 169, 44, 0.2)',
              color: '#84a92c',
              border: '1px solid rgba(132, 169, 44, 0.4)',
            }}
          >
            {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'AK'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {currentUser?.name || 'Abenezer Kaleab'}
            </p>
            <p className="text-[10px] font-semibold text-[#84a92c] truncate">
              {currentUser?.role ? `${currentUser.role.toUpperCase()} Role` : 'Chief Technology Officer'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className="hidden md:flex w-64 flex-col h-screen sticky top-0 select-none z-30 font-sans border-r transition-colors duration-200"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
      >
        {navContent}
      </aside>

      {/* Mobile Hamburger Floating Button */}
      <div className="md:hidden fixed top-3 left-3 z-50">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl shadow-lg border flex items-center justify-center text-[#84a92c] cursor-pointer"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
          aria-label="Open Navigation"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="relative w-72 h-full shadow-2xl flex flex-col z-10 transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)' }}
          >
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
