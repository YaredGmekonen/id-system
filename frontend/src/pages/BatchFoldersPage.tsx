import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import Sidebar from '../components/layout/Sidebar';
import { useBatchFolders, usePeople, addBatchFolder, deleteBatchFolder } from '../db/hooks';
import type { BatchFolder } from '../db/database';
import FolderDataMatrix from '../components/collector/FolderDataMatrix';
import {
  FolderKanban,
  Search,
  Plus,
  Trash2,
  Check,
  FileSpreadsheet,
  ArrowRight,
  PenTool,
  X,
  AlertTriangle,
  FolderOpen,
} from 'lucide-react';

import type { Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 15, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 320, damping: 24 },
  },
};

export default function BatchFoldersPage() {
  const navigate = useNavigate();
  const dbBatchFolders = useBatchFolders();
  const dbPeople = usePeople();

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteConfirmFolder, setDeleteConfirmFolder] = useState<{ id: number; name: string } | null>(null);

  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderSource, setNewFolderSource] = useState<BatchFolder['sourceType']>('Excel Import');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [selectedOpenFolder, setSelectedOpenFolder] = useState<BatchFolder | null>(null);

  // Group persons by batch folder name to calculate real live counts
  const folderStats = useMemo(() => {
    const map = new Map<string, { total: number; fulfilled: number; processing: number; pending: number }>();
    dbPeople.forEach(p => {
      const folderName = p.department || 'General Operations';
      const existing = map.get(folderName) || { total: 0, fulfilled: 0, processing: 0, pending: 0 };
      existing.total += 1;
      if (p.status === 'Active' || p.status === 'Printed') existing.fulfilled += 1;
      else if (p.status === 'Processing') existing.processing += 1;
      else existing.pending += 1;
      map.set(folderName, existing);
    });
    return map;
  }, [dbPeople]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    await addBatchFolder({
      name: newFolderName.trim(),
      sourceType: newFolderSource,
      status: 'Ready for Design',
      collectorName: 'System Registrar',
      totalRecords: 0,
      notes: `Batch created on ${new Date().toLocaleDateString()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    setToastMsg(`Batch folder "${newFolderName}" created.`);
    setNewFolderName('');
    setCreateModalOpen(false);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmFolder) return;
    await deleteBatchFolder(deleteConfirmFolder.id);
    setToastMsg(`Folder "${deleteConfirmFolder.name}" deleted.`);
    setDeleteConfirmFolder(null);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const filteredFolders = dbBatchFolders.filter(f => {
    const matchSearch = f.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div
      className="flex h-screen font-sans antialiased overflow-hidden select-none"
      style={{ backgroundColor: 'var(--bg-root)', color: 'var(--text-primary)' }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative">
        {/* Scroll Progress Bar */}
        <motion.div
          className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#84a92c] via-emerald-400 to-[#84a92c] origin-left z-50 shadow-xs"
          style={{ scaleX }}
        />

        {/* Header */}
        <header
          className="min-h-16 py-2 pl-14 pr-4 md:px-8 border-b flex items-center justify-between z-20 flex-shrink-0 flex-wrap gap-2"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#84a92c]/20 text-[#84a92c] flex items-center justify-center">
              <FolderKanban className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-[var(--text-primary)]">Roster & Intake Batch Folders</h1>
              <p className="text-xs text-[var(--text-muted)]">Organize, track, and process cardholder roster batches.</p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setCreateModalOpen(true)}
            className="btn-primary py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Batch Folder</span>
          </motion.button>
        </header>

        {/* Toast */}
        <AnimatePresence>
          {toastMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mx-6 md:mx-8 mt-3 p-3 rounded-xl bg-[#84a92c]/20 border border-[#84a92c]/30 text-[#84a92c] text-xs font-bold flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{toastMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="px-6 md:px-8 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search batch folders…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            {['all', 'Ready for Design', 'In Design', 'Approved', 'Printed'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-[#84a92c] text-slate-950 shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                }`}
              >
                {st === 'all' ? 'All Batches' : st}
              </button>
            ))}
          </div>
        </div>

        {/* Batch Folders Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="px-6 md:px-8 pb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredFolders.map(folder => {
            const stats = folderStats.get(folder.name) || {
              total: folder.totalRecords || 0,
              fulfilled: 0,
              processing: 0,
              pending: folder.totalRecords || 0,
            };
            const realTotal = Math.max(folder.totalRecords, stats.total);
            const progress = realTotal > 0 ? Math.round((stats.fulfilled / realTotal) * 100) : 0;

            return (
              <motion.div
                key={folder.id}
                variants={cardVariants}
                whileHover={{ y: -4, scale: 1.015 }}
                className="rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all shadow-xs"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              >
                <div>
                  {/* Folder Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#84a92c]/20 border border-[#84a92c]/40 text-[#84a92c] flex items-center justify-center flex-shrink-0">
                        <FolderKanban className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-[var(--text-primary)] truncate">{folder.name}</h3>
                        <p className="text-[10px] text-[var(--text-muted)] font-mono flex items-center gap-1">
                          <FileSpreadsheet className="w-3 h-3 text-[var(--text-muted)]" />
                          <span>{folder.sourceType}</span>
                        </p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase ${
                      folder.status === 'Printed'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : folder.status === 'Approved'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {folder.status}
                    </span>
                  </div>

                  {/* Progress & Counts */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[var(--text-muted)]">Fulfillment Progress</span>
                      <span className="font-bold text-[#84a92c]">{progress}% ({stats.fulfilled}/{realTotal})</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${progress}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-[#84a92c] to-emerald-400 rounded-full"
                      />
                    </div>
                  </div>

                  {/* Assigned Info */}
                  <div className="mt-4 pt-3 border-t text-[11px] space-y-1 text-[var(--text-secondary)]" style={{ borderColor: 'var(--border-primary)' }}>
                    <div>Collector: <strong className="text-[var(--text-primary)]">{folder.collectorName || 'Unassigned'}</strong></div>
                    <div>Designer: <strong className="text-[var(--text-primary)]">{folder.assignedDesigner || 'Unassigned'}</strong></div>
                  </div>
                </div>

                {/* Action Buttons (Matching Image 3 Wireframe: Generate + Open Folder) */}
                <div className="pt-2 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center gap-1.5">
                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => navigate('/studio')}
                      className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Generate</span>
                      <ArrowRight className="w-3 h-3" />
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedOpenFolder(folder)}
                      className="py-1.5 px-3 rounded-xl border border-slate-700 bg-slate-900/90 hover:border-[#84a92c] hover:bg-[#84a92c]/10 text-slate-200 hover:text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Open 3-Column Folder Matrix"
                    >
                      <FolderOpen className="w-3.5 h-3.5 text-[#84a92c]" />
                      <span>Open Folder</span>
                    </motion.button>
                  </div>

                  <div className="flex items-center gap-1">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => navigate('/designer')}
                      className="p-1.5 rounded-lg border text-[var(--text-muted)] hover:text-blue-400 transition-colors cursor-pointer"
                      title="Open in Designer"
                      style={{ borderColor: 'var(--border-primary)' }}
                    >
                      <PenTool className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setDeleteConfirmFolder({ id: folder.id!, name: folder.name })}
                      className="p-1.5 rounded-lg border text-[var(--text-muted)] hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete Folder"
                      style={{ borderColor: 'var(--border-primary)' }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* POPUP 0: 3-COLUMN FOLDER MATRIX STUDIO MODAL (Image 3 exact clone) */}
        <AnimatePresence>
          {selectedOpenFolder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                onClick={() => setSelectedOpenFolder(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="relative w-full max-w-6xl h-[88vh] z-10 flex flex-col overflow-hidden"
              >
                {/* Close Button Header */}
                <div className="absolute top-3 right-3 z-30">
                  <button
                    onClick={() => setSelectedOpenFolder(null)}
                    className="p-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shadow-xl"
                    title="Close Folder Matrix"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <FolderDataMatrix
                  activeFolderId={selectedOpenFolder.id}
                  onClose={() => setSelectedOpenFolder(null)}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* POPUP 1: Create Batch Folder Modal */}
        <AnimatePresence>
          {createModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                onClick={() => setCreateModalOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="relative w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4 z-10"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Create New Roster Batch Folder</h3>
                  <button
                    onClick={() => setCreateModalOpen(false)}
                    className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateFolder} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">Batch Folder Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Grade 12 Students 2026"
                      value={newFolderName}
                      onChange={e => setNewFolderName(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border text-xs text-[var(--text-primary)]"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">Intake Source Type</label>
                    <select
                      value={newFolderSource}
                      onChange={e => setNewFolderSource(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border text-xs text-[var(--text-primary)]"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                    >
                      <option value="Excel Import">Excel / CSV Roster File</option>
                      <option value="Manual Intake">Manual Intake & Camera</option>
                      <option value="Paper Document OCR">Paper Document OCR Extraction</option>
                      <option value="Archive Digitizer">Archive Book Digitizer</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setCreateModalOpen(false)}
                      className="px-3 py-1.5 rounded-lg border text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      style={{ borderColor: 'var(--border-primary)' }}
                    >
                      Cancel
                    </button>
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      className="btn-primary py-1.5 px-4 text-xs font-bold cursor-pointer"
                    >
                      Save Folder
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* POPUP 2: Delete Folder Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirmFolder && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
                onClick={() => setDeleteConfirmFolder(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 15 }}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="relative w-full max-w-sm rounded-2xl border p-5 shadow-2xl space-y-4 text-center z-10"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              >
                <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">Delete Batch Folder?</h3>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Are you sure you want to delete <strong>{deleteConfirmFolder.name}</strong>?
                  </p>
                </div>
                <div className="flex justify-center gap-2 pt-2">
                  <button
                    onClick={() => setDeleteConfirmFolder(null)}
                    className="px-3 py-1.5 rounded-lg border text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                    style={{ borderColor: 'var(--border-primary)' }}
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    onClick={handleConfirmDelete}
                    className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
                  >
                    Confirm Delete
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
