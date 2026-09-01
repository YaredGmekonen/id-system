import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SiliconLabsLogo from '../shared/SiliconLabsLogo';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FolderKanban,
  PenTool,
  IdCard,
  Printer,
  Archive,
  Settings,
  Activity,
  LogOut,
  ChevronDown,
  X,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface SidebarProps {
  onSimulateClick?: () => void;
  onCloseMobile?: () => void;
}

export default function Sidebar({ onCloseMobile }: SidebarProps = {}) {
  const { currentUser, currentRole, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Desktop Collapsed State (Mini Icon-only rail)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('siliconlabs_sidebar_collapsed') === 'true';
  });

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('siliconlabs_sidebar_collapsed', String(next));
      return next;
    });
  };

  const role = currentRole || 'admin';
  const isAdministrator = role === 'admin';
  const isCollector = role === 'collector';
  const isDesigner = role === 'designer';

  const handleNavClick = () => {
    setMobileOpen(false);
    onCloseMobile?.();
  };

  const renderNavContent = (collapsed: boolean) => (
    <div
      className="flex flex-col justify-between h-full select-none font-sans text-xs"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
    >
      {/* Top Header & Navigation Links */}
      <div className="flex flex-col overflow-y-auto no-scrollbar">
        {/* Brand Header */}
        <div
          className={`py-3.5 border-b flex items-center relative transition-all ${
            collapsed ? 'px-2 justify-center' : 'px-4 justify-between'
          }`}
          style={{ borderColor: 'var(--border-primary)' }}
        >
          {!collapsed ? (
            <>
              <SiliconLabsLogo size="md" showSubText={true} subText="ID PLATFORM" />
              <div className="flex items-center gap-1">
                {/* Desktop Collapse Toggle */}
                <button
                  onClick={toggleCollapsed}
                  className="hidden md:flex p-1.5 rounded-lg border hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                  title="Collapse sidebar to icon rail (10% width)"
                >
                  <PanelLeftClose className="w-4 h-4 text-[#84a92c]" />
                </button>
                {/* Mobile Close Button */}
                <button
                  onClick={() => setMobileOpen(false)}
                  className="md:hidden p-1.5 rounded-lg border hover:opacity-80 text-[var(--text-muted)] cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#84a92c] to-[#198754] flex items-center justify-center text-white font-black text-xs shadow-md">
                SL
              </div>
              <button
                onClick={toggleCollapsed}
                className="p-1.5 rounded-lg border hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                title="Expand sidebar"
              >
                <PanelLeftOpen className="w-4 h-4 text-[#84a92c]" />
              </button>
            </div>
          )}
        </div>

        {/* Top Overview Link */}
        <div className={`p-2 ${collapsed ? 'px-2' : 'px-3'}`}>
          <NavLink
            to="/overview"
            onClick={handleNavClick}
            title={collapsed ? 'Overview Dashboard' : undefined}
            className={({ isActive }) =>
              `relative flex items-center rounded-xl font-bold transition-colors ${
                collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2.5'
              } ${
                isActive
                  ? 'text-[#84a92c]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 rounded-xl bg-[#84a92c]/15 border border-[#84a92c]/40 shadow-xs"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <LayoutDashboard className="w-4 h-4 text-[#84a92c] relative z-10 flex-shrink-0" />
                {!collapsed && <span className="relative z-10">Overview</span>}
              </>
            )}
          </NavLink>
        </div>

        {/* Navigation Sections */}
        <div className={`space-y-4 pb-4 ${collapsed ? 'px-2' : 'px-3'}`}>
          {/* SECTION 1: MANAGEMENT (Admins Only) */}
          {isAdministrator && (
            <div className="space-y-1">
              {!collapsed ? (
                <p className="px-3 text-[10px] font-bold tracking-wider uppercase font-mono text-[var(--text-muted)]">
                  Management
                </p>
              ) : (
                <div className="border-t border-[var(--border-primary)] my-2 mx-1 opacity-60" />
              )}

              <NavLink
                to="/users"
                onClick={handleNavClick}
                title={collapsed ? 'Users & Roles' : undefined}
                className={({ isActive }) =>
                  `relative flex items-center rounded-lg transition-colors font-medium ${
                    collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-1.5'
                  } ${
                    isActive
                      ? 'text-[#84a92c] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute inset-0 rounded-lg bg-[#84a92c]/15 border border-[#84a92c]/40"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Users className="w-4 h-4 relative z-10 flex-shrink-0" />
                    {!collapsed && <span className="relative z-10">Users & Roles</span>}
                  </>
                )}
              </NavLink>

              <NavLink
                to="/staff"
                onClick={handleNavClick}
                title={collapsed ? 'Staff Tracking' : undefined}
                className={({ isActive }) =>
                  `relative flex items-center rounded-lg transition-colors font-medium ${
                    collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-1.5'
                  } ${
                    isActive
                      ? 'text-[#84a92c] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute inset-0 rounded-lg bg-[#84a92c]/15 border border-[#84a92c]/40"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <UserCheck className="w-4 h-4 relative z-10 flex-shrink-0" />
                    {!collapsed && <span className="relative z-10">Staff Tracking</span>}
                  </>
                )}
              </NavLink>
            </div>
          )}

          {/* SECTION 2: COLLECTION & INTAKE */}
          <div className="space-y-1">
            {!collapsed ? (
              <p className="px-3 text-[10px] font-bold tracking-wider uppercase font-mono text-[var(--text-muted)]">
                Collection & Intake
              </p>
            ) : (
              <div className="border-t border-[var(--border-primary)] my-2 mx-1 opacity-60" />
            )}

            {(isAdministrator || isCollector) && (
              <NavLink
                to="/collector"
                onClick={handleNavClick}
                title={collapsed ? 'Data Collection' : undefined}
                className={({ isActive }) =>
                  `relative flex items-center rounded-lg transition-colors font-medium ${
                    collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-1.5'
                  } ${
                    isActive
                      ? 'text-[#84a92c] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute inset-0 rounded-lg bg-[#84a92c]/15 border border-[#84a92c]/40"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <FolderKanban className="w-4 h-4 relative z-10 flex-shrink-0" />
                    {!collapsed && <span className="relative z-10">Data Collection</span>}
                  </>
                )}
              </NavLink>
            )}

            {(isAdministrator || isCollector || isDesigner) && (
              <NavLink
                to="/batches"
                onClick={handleNavClick}
                title={collapsed ? 'Batch Folders' : undefined}
                className={({ isActive }) =>
                  `relative flex items-center rounded-lg transition-colors font-medium ${
                    collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-1.5'
                  } ${
                    isActive
                      ? 'text-[#84a92c] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute inset-0 rounded-lg bg-[#84a92c]/15 border border-[#84a92c]/40"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <FolderKanban className="w-4 h-4 relative z-10 flex-shrink-0" />
                    {!collapsed && <span className="relative z-10">Batch Folders</span>}
                  </>
                )}
              </NavLink>
            )}

            {(isAdministrator || isCollector) && (
              <NavLink
                to="/digitizer"
                onClick={handleNavClick}
                title={collapsed ? 'Archive Digitizer' : undefined}
                className={({ isActive }) =>
                  `relative flex items-center rounded-lg transition-colors font-medium ${
                    collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-1.5'
                  } ${
                    isActive
                      ? 'text-[#84a92c] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute inset-0 rounded-lg bg-[#84a92c]/15 border border-[#84a92c]/40"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Archive className="w-4 h-4 relative z-10 flex-shrink-0" />
                    {!collapsed && <span className="relative z-10">Archive Digitizer</span>}
                  </>
                )}
              </NavLink>
            )}
          </div>

          {/* SECTION 3: DESIGN & PRODUCTION */}
          {(isAdministrator || isDesigner || isCollector) && (
            <div className="space-y-1">
              {!collapsed ? (
                <p className="px-3 text-[10px] font-bold tracking-wider uppercase font-mono text-[var(--text-muted)]">
                  Design & Production
                </p>
              ) : (
                <div className="border-t border-[var(--border-primary)] my-2 mx-1 opacity-60" />
              )}

              {(isAdministrator || isDesigner) && (
                <NavLink
                  to="/designer"
                  onClick={handleNavClick}
                  title={collapsed ? 'Design Studio' : undefined}
                  className={({ isActive }) =>
                    `relative flex items-center rounded-lg transition-colors font-medium ${
                      collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-1.5'
                    } ${
                      isActive
                        ? 'text-[#84a92c] font-bold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="activeNavIndicator"
                          className="absolute inset-0 rounded-lg bg-[#84a92c]/15 border border-[#84a92c]/40"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <PenTool className="w-4 h-4 relative z-10 flex-shrink-0 text-[#84a92c]" />
                      {!collapsed && <span className="relative z-10">Design Studio</span>}
                    </>
                  )}
                </NavLink>
              )}

              <NavLink
                to="/studio"
                onClick={handleNavClick}
                title={collapsed ? 'ID Generation (Studio)' : undefined}
                className={({ isActive }) =>
                  `relative flex items-center rounded-lg transition-colors font-medium ${
                    collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-1.5'
                  } ${
                    isActive
                      ? 'text-[#84a92c] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute inset-0 rounded-lg bg-[#84a92c]/15 border border-[#84a92c]/40"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <IdCard className="w-4 h-4 relative z-10 flex-shrink-0" />
                    {!collapsed && <span className="relative z-10">ID Generation (Studio)</span>}
                  </>
                )}
              </NavLink>

              {(isAdministrator || isDesigner) && (
                <NavLink
                  to="/print"
                  onClick={handleNavClick}
                  title={collapsed ? 'Print Studio' : undefined}
                  className={({ isActive }) =>
                    `relative flex items-center rounded-lg transition-colors font-medium ${
                      collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-1.5'
                    } ${
                      isActive
                        ? 'text-[#84a92c] font-bold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <motion.div
                          layoutId="activeNavIndicator"
                          className="absolute inset-0 rounded-lg bg-[#84a92c]/15 border border-[#84a92c]/40"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <Printer className="w-4 h-4 relative z-10 flex-shrink-0" />
                      {!collapsed && <span className="relative z-10">Print Studio</span>}
                    </>
                  )}
                </NavLink>
              )}
            </div>
          )}

          {/* SECTION 4: SYSTEM */}
          <div className="space-y-1">
            {!collapsed ? (
              <p className="px-3 text-[10px] font-bold tracking-wider uppercase font-mono text-[var(--text-muted)]">
                System
              </p>
            ) : (
              <div className="border-t border-[var(--border-primary)] my-2 mx-1 opacity-60" />
            )}

            <NavLink
              to="/settings"
              onClick={handleNavClick}
              title={collapsed ? 'System Settings' : undefined}
              className={({ isActive }) =>
                `relative flex items-center rounded-lg transition-colors font-medium ${
                  collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-1.5'
                } ${
                  isActive
                    ? 'text-[#84a92c] font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute inset-0 rounded-lg bg-[#84a92c]/15 border border-[#84a92c]/40"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Settings className="w-4 h-4 relative z-10 flex-shrink-0" />
                  {!collapsed && <span className="relative z-10">System Settings</span>}
                </>
              )}
            </NavLink>

            {isAdministrator && (
              <NavLink
                to="/audit"
                onClick={handleNavClick}
                title={collapsed ? 'Audit Logs' : undefined}
                className={({ isActive }) =>
                  `relative flex items-center rounded-lg transition-colors font-medium ${
                    collapsed ? 'justify-center p-2' : 'gap-2.5 px-3 py-1.5'
                  } ${
                    isActive
                      ? 'text-[#84a92c] font-bold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute inset-0 rounded-lg bg-[#84a92c]/15 border border-[#84a92c]/40"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <Activity className="w-4 h-4 relative z-10 flex-shrink-0" />
                    {!collapsed && <span className="relative z-10">Audit Logs</span>}
                  </>
                )}
              </NavLink>
            )}
          </div>
        </div>
      </div>

      {/* Bottom User Profile Section */}
      <div className={`border-t relative ${collapsed ? 'p-2' : 'p-3'}`} style={{ borderColor: 'var(--border-primary)' }}>
        {!collapsed ? (
          <motion.button
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="w-full flex items-center justify-between p-2 rounded-xl border hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer text-left"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#84a92c]/20 border border-[#84a92c]/40 text-[#84a92c] font-bold text-xs flex items-center justify-center flex-shrink-0">
                {currentUser?.avatar || 'AK'}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-[var(--text-primary)] truncate">
                  {currentUser?.name || 'Abenezer Kaleab'}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] truncate">
                  {currentUser?.roleTitle || 'Administrator'}
                </div>
              </div>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="w-10 h-10 mx-auto rounded-full bg-[#84a92c]/20 border border-[#84a92c]/40 text-[#84a92c] font-bold text-xs flex items-center justify-center cursor-pointer shadow-sm hover:border-[#84a92c]"
            title={currentUser?.name || 'User Profile'}
          >
            {currentUser?.avatar || 'AK'}
          </motion.button>
        )}

        {/* User Account & Logout Dropdown */}
        <AnimatePresence>
          {userDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className={`absolute rounded-2xl border shadow-2xl p-2.5 z-50 text-xs space-y-2 ${
                collapsed ? 'left-16 bottom-2 w-56' : 'bottom-16 left-3 right-3'
              }`}
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <div className="px-2 py-1.5 rounded-lg border space-y-0.5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                <div className="font-bold text-xs text-[var(--text-primary)] truncate">{currentUser?.name}</div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono truncate">{currentUser?.email}</div>
                <div className="text-[10px] text-[#84a92c] font-mono font-bold uppercase">{role}</div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02, x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-950/20 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed Left, Collapsible between w-64 and w-16) */}
      <aside
        className={`hidden md:flex flex-col h-screen border-r flex-shrink-0 z-30 transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
      >
        {renderNavContent(isCollapsed)}
      </aside>

      {/* Mobile Floating Menu Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 p-2 rounded-xl border shadow-lg cursor-pointer"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-primary)',
          color: 'var(--text-primary)',
        }}
        aria-label="Open Navigation Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="relative flex flex-col w-72 h-screen border-r z-10 shadow-2xl"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              {renderNavContent(false)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
