import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  Users,
  Plus,
  Layers,
  MoreHorizontal,
  Camera,
  FolderKanban,
  PenTool,
  Printer,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenQuickIntake?: () => void;
}

export default function MobileBottomNav({ onOpenQuickIntake }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);

  const handlePlusClick = () => {
    if (onOpenQuickIntake) {
      onOpenQuickIntake();
    } else {
      setQuickMenuOpen(true);
    }
  };

  return (
    <>
      {/* Quick Action Center Popup Modal */}
      <AnimatePresence>
        {quickMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex items-end justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs"
              onClick={() => setQuickMenuOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="relative w-full max-w-sm rounded-3xl border p-5 shadow-2xl space-y-4 z-10 mb-16"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-[var(--text-primary)]">Quick Actions</span>
                <button
                  onClick={() => setQuickMenuOpen(false)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setQuickMenuOpen(false);
                    navigate('/collector');
                  }}
                  className="p-3.5 rounded-2xl bg-[#84a92c]/15 border border-[#84a92c]/30 text-left flex flex-col gap-1.5 cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-[#84a92c]" />
                  <span className="font-bold text-xs text-[var(--text-primary)]">New ID Registration</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Camera photo & bio intake</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setQuickMenuOpen(false);
                    navigate('/batches');
                  }}
                  className="p-3.5 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-left flex flex-col gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                  <span className="font-bold text-xs text-[var(--text-primary)]">Import Roster File</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Upload Excel / CSV</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setQuickMenuOpen(false);
                    navigate('/designer');
                  }}
                  className="p-3.5 rounded-2xl bg-purple-500/15 border border-purple-500/30 text-left flex flex-col gap-1.5 cursor-pointer"
                >
                  <PenTool className="w-5 h-5 text-purple-400" />
                  <span className="font-bold text-xs text-[var(--text-primary)]">New Template</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Vector CR80 card studio</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setQuickMenuOpen(false);
                    navigate('/print');
                  }}
                  className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-left flex flex-col gap-1.5 cursor-pointer"
                >
                  <Printer className="w-5 h-5 text-amber-400" />
                  <span className="font-bold text-xs text-[var(--text-primary)]">Print Run Studio</span>
                  <span className="text-[10px] text-[var(--text-muted)]">Duplex paper layout</span>
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fixed Sticky Mobile Bottom Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t z-40 flex items-center justify-around px-2 backdrop-blur-md"
        style={{
          backgroundColor: 'rgba(14, 20, 27, 0.94)',
          borderColor: 'var(--border-primary)',
        }}
      >
        {/* 1. Overview */}
        <NavLink
          to="/overview"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-full gap-1 text-[10px] font-bold transition-colors ${
              isActive ? 'text-[#84a92c]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`
          }
        >
          <Home className="w-4 h-4" />
          <span>Overview</span>
        </NavLink>

        {/* 2. Collections / Batches */}
        <NavLink
          to="/batches"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-full gap-1 text-[10px] font-bold transition-colors ${
              isActive || location.pathname === '/collector'
                ? 'text-[#84a92c]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`
          }
        >
          <Users className="w-4 h-4" />
          <span>Collections</span>
        </NavLink>

        {/* 3. Floating Center Action (+) Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handlePlusClick}
          className="w-12 h-12 rounded-full bg-[#84a92c] text-slate-950 flex items-center justify-center shadow-lg shadow-[#84a92c]/30 font-bold -mt-5 cursor-pointer border-2 border-[#0e141b]"
          aria-label="Quick Actions"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </motion.button>

        {/* 4. Studio */}
        <NavLink
          to="/studio"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-full gap-1 text-[10px] font-bold transition-colors ${
              isActive ? 'text-[#84a92c]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`
          }
        >
          <Layers className="w-4 h-4" />
          <span>Studio</span>
        </NavLink>

        {/* 5. More */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-full gap-1 text-[10px] font-bold transition-colors ${
              isActive ? 'text-[#84a92c]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`
          }
        >
          <MoreHorizontal className="w-4 h-4" />
          <span>More</span>
        </NavLink>
      </nav>
    </>
  );
}
