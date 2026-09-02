import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import SiliconLabsLogo from '../shared/SiliconLabsLogo';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  PenTool,
  IdCard,
  Printer,
  Archive,
  Settings,
  Users,
  UserCheck,
  ShieldCheck,
  Activity,
  ChevronDown,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Sun,
  Moon,
  LogOut,
  Layers,
  Search,
} from 'lucide-react';

interface SidebarProps {
  onCloseMobile?: () => void;
}

interface NavChild {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface NavSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultPath: string;
  children: NavChild[];
}

export default function Sidebar({ onCloseMobile }: SidebarProps = {}) {
  const { currentUser, logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('siliconlabs_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    const handleOpenMobile = () => setMobileOpen(true);
    window.addEventListener('open-mobile-sidebar', handleOpenMobile);
    return () => window.removeEventListener('open-mobile-sidebar', handleOpenMobile);
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('siliconlabs_sidebar_collapsed', String(next));
      return next;
    });
  };

  // 4 Main Dropdown Sections
  const navSections: NavSection[] = [
    {
      id: 'overview',
      title: 'Dashboard & Reports',
      icon: LayoutDashboard,
      defaultPath: '/overview',
      children: [
        { label: 'Overview Dashboard', path: '/overview', icon: LayoutDashboard },
        { label: 'Audit & Activity Logs', path: '/audit', icon: Activity },
      ],
    },
    {
      id: 'intake',
      title: 'Collection & Intake',
      icon: FolderKanban,
      defaultPath: '/collector',
      children: [
        { label: 'Single Intake Form', path: '/collector', icon: FileText },
        { label: 'Batch Folders Matrix', path: '/batches', icon: FolderKanban },
        { label: 'Archive Book Digitizer', path: '/digitizer', icon: Archive },
      ],
    },
    {
      id: 'production',
      title: 'Design & Production',
      icon: PenTool,
      defaultPath: '/designer',
      children: [
        { label: 'Card Design Studio', path: '/designer', icon: PenTool },
        { label: 'Studio ID Generation', path: '/studio', icon: IdCard },
        { label: 'Paper Print Studio', path: '/print', icon: Printer },
        { label: 'ID Scanner & Verify', path: '/verify', icon: ShieldCheck },
      ],
    },
    {
      id: 'system',
      title: 'System & Security',
      icon: Settings,
      defaultPath: '/settings',
      children: [
        { label: 'User & Role Management', path: '/users', icon: Users },
        { label: 'Staff Tracking & Field', path: '/staff-tracking', icon: UserCheck },
        { label: 'Platform Settings', path: '/settings', icon: Settings },
      ],
    },
  ];

  // Auto-expand the section matching the current URL
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {
      overview: true,
      intake: false,
      production: false,
      system: false,
    };
    navSections.forEach(section => {
      if (section.children.some(c => location.pathname === c.path)) {
        initial[section.id] = true;
      }
    });
    return initial;
  });

  useEffect(() => {
    navSections.forEach(section => {
      if (section.children.some(c => location.pathname === c.path)) {
        setOpenSections(prev => ({ ...prev, [section.id]: true }));
      }
    });
  }, [location.pathname]);

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleNavClick = () => {
    setMobileOpen(false);
    onCloseMobile?.();
  };

  const renderNavContent = (collapsed: boolean) => (
    <div
      className="flex flex-col justify-between h-full select-none font-sans text-xs transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
    >
      {/* Top Header & Brand */}
      <div className="flex flex-col overflow-y-auto no-scrollbar">
        {/* Brand Bar */}
        <div
          className={`py-4 border-b flex items-center transition-all ${
            collapsed ? 'px-2 justify-center' : 'px-5 justify-between'
          }`}
          style={{ borderColor: 'var(--border-primary)' }}
        >
          {!collapsed ? (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#062e1b] to-[#10b981] flex items-center justify-center text-white font-black text-sm shadow-md shadow-emerald-950/20">
                  SL
                </div>
                <div>
                  <h1 className="font-extrabold text-sm tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    SiliconLabs
                  </h1>
                  <p className="text-[10px] font-mono font-semibold" style={{ color: 'var(--text-muted)' }}>
                    CREDENTIAL OS
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Theme Switcher in header */}
                <button
                  onClick={toggleTheme}
                  className="p-1.5 rounded-xl border hover:opacity-80 transition-all cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                  title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
                >
                  {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                </button>

                {/* Collapse Button */}
                <button
                  onClick={toggleCollapsed}
                  className="hidden md:flex p-1.5 rounded-xl border hover:opacity-80 transition-all cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="w-3.5 h-3.5 text-[#84a92c]" />
                </button>

                {/* Mobile Close Button */}
                <button
                  onClick={() => setMobileOpen(false)}
                  className="md:hidden p-1.5 rounded-xl border hover:opacity-80 text-[var(--text-muted)] cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-1">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-[#062e1b] to-[#10b981] flex items-center justify-center text-white font-black text-sm shadow-md">
                SL
              </div>
              <button
                onClick={toggleCollapsed}
                className="p-1.5 rounded-xl border hover:opacity-80 transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                title="Expand sidebar"
              >
                <PanelLeftOpen className="w-4 h-4 text-[#84a92c]" />
              </button>
            </div>
          )}
        </div>

        {/* 4 MAIN DROPDOWN NAVIGATION ITEMS */}
        <div className={`py-4 space-y-2 ${collapsed ? 'px-2' : 'px-3.5'}`}>
          {!collapsed && (
            <p className="px-3 text-[10px] font-bold tracking-wider uppercase font-mono text-[var(--text-muted)] mb-1">
              MENU
            </p>
          )}

          {navSections.map(section => {
            const SectionIcon = section.icon;
            const isOpen = openSections[section.id];
            const isAnyChildActive = section.children.some(c => location.pathname === c.path);

            if (collapsed) {
              // Collapsed mini rail icon mode
              return (
                <div key={section.id} className="relative group flex justify-center py-1">
                  <NavLink
                    to={section.defaultPath}
                    onClick={handleNavClick}
                    title={section.title}
                    className={`p-2.5 rounded-2xl transition-all ${
                      isAnyChildActive
                        ? 'bg-[#062e1b] text-[#9fe870] shadow-md border border-[#10b981]/40'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                    }`}
                  >
                    <SectionIcon className="w-4.5 h-4.5" />
                  </NavLink>
                </div>
              );
            }

            return (
              <div key={section.id} className="space-y-1">
                {/* Main Section Header Accordion Trigger */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold transition-all cursor-pointer ${
                    isAnyChildActive && !isOpen
                      ? 'bg-[#062e1b] text-white shadow-md border border-[#10b981]/30'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                  }`}
                  style={{
                    backgroundColor: isAnyChildActive && !isOpen ? '#062e1b' : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                      isAnyChildActive ? 'text-[#9fe870]' : 'text-[var(--text-secondary)]'
                    }`}>
                      <SectionIcon className="w-4.5 h-4.5" />
                    </div>
                    <span className="text-xs tracking-tight">{section.title}</span>
                  </div>

                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-[var(--text-muted)]"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </motion.div>
                </button>

                {/* Dropdown Children */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="overflow-hidden pl-3.5 pr-1 space-y-0.5 border-l-2 ml-4 my-1"
                      style={{ borderColor: 'var(--border-primary)' }}
                    >
                      {section.children.map(child => {
                        const ChildIcon = child.icon;
                        return (
                          <NavLink
                            key={child.path}
                            to={child.path}
                            onClick={handleNavClick}
                            className={({ isActive }) =>
                              `relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-[11px] font-semibold transition-all ${
                                isActive
                                  ? 'bg-[#062e1b] text-white font-extrabold shadow-sm border border-[#10b981]/30'
                                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                              }`
                            }
                          >
                            {({ isActive }) => (
                              <>
                                <ChildIcon className={`w-3.5 h-3.5 ${isActive ? 'text-[#9fe870]' : 'text-[var(--text-muted)]'}`} />
                                <span className="truncate">{child.label}</span>
                                {child.badge && (
                                  <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-[#10b981]/20 text-[#10b981] font-mono font-bold">
                                    {child.badge}
                                  </span>
                                )}
                              </>
                            )}
                          </NavLink>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Card (PinenMFB Style "Upgrade Pro / System Ready" card) */}
      <div className={`p-3 border-t transition-all ${collapsed ? 'px-2' : 'px-3.5'}`} style={{ borderColor: 'var(--border-primary)' }}>
        {!collapsed ? (
          <div
            className="p-4 rounded-3xl bg-[#062e1b] border border-[#10b981]/30 text-white relative overflow-hidden shadow-lg"
          >
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#9fe870] mb-2.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-black tracking-tight text-white">SiliconLabs Enterprise</h4>
            <p className="text-[10px] text-emerald-200/80 mt-0.5 leading-relaxed">
              300 DPI engine active & offline local sync enabled.
            </p>
            <button
              onClick={() => logout()}
              className="mt-3 w-full py-2 rounded-xl bg-[#10b981] hover:bg-[#9fe870] text-slate-950 font-extrabold text-[11px] shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border hover:opacity-80 transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
              title="Toggle Theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>
            <button
              onClick={() => logout()}
              className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col h-screen border-r flex-shrink-0 z-30 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-[72px]' : 'w-64'
        }`}
        style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-surface)' }}
      >
        {renderNavContent(isCollapsed)}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden"
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 bottom-0 left-0 w-72 z-50 md:hidden border-r shadow-2xl"
              style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-surface)' }}
            >
              {renderNavContent(false)}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
