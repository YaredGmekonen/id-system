import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import SiliconLabsLogo from '../shared/SiliconLabsLogo';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  IdCard,
  PenTool,
  UserPlus,
  Archive,
  Settings,
  LogOut,
  Sun,
  Moon,
  X,
  Menu,
  Printer,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  onSimulateClick?: () => void;
  onCloseMobile?: () => void;
}

export default function Sidebar({ onCloseMobile }: SidebarProps = {}) {
  const { currentUser, currentRole, logout } = useAuth();
  const navigate = useNavigate();
  const { toggleTheme, isDark } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

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
            <X className="w-4 h-4" />
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
                  <LayoutDashboard className="w-4 h-4" />
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
                  <IdCard className="w-4 h-4" />
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
                  <PenTool className="w-4 h-4" />
                  <span>Canvas Vector Designer</span>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border" style={{ borderColor: 'var(--border-primary)' }}>
                  Canva
                </span>
              </NavLink>
            )}

            <NavLink
              to="/print"
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
                <Printer className="w-4 h-4" />
                <span>Paper Print Studio</span>
              </div>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                Imposition
              </span>
            </NavLink>
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
                    <UserPlus className="w-4 h-4" />
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
                    <Archive className="w-4 h-4 text-[#84a92c]" />
                    <span>Archive Digitizer</span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#84a92c]/20 text-[#84a92c] font-bold">
                    Face+Crop
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
              <Settings className="w-4 h-4" />
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
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{isDark ? 'Light' : 'Dark'}</span>
          </button>

          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="flex items-center gap-1.5 text-[11px] font-bold text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
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
          <Menu className="w-5 h-5" />
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
