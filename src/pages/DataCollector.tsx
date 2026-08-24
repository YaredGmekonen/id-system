import { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import DocumentScanner from '../components/collector/DocumentScanner';
import RegistrationForm from '../components/collector/RegistrationForm';
import PeopleList from '../components/collector/PeopleList';
import Modal from '../components/shared/Modal';
import { useBatchFolders, addBatchFolder, updateBatchFolder, deleteBatchFolder } from '../db/hooks';
import type { BatchFolder } from '../db/database';
import { FolderKanban, AlertTriangle } from 'lucide-react';

export default function DataCollector() {
  const [collectorMode, setCollectorMode] = useState<'scanner' | 'manual'>('manual');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Batch Folder Management
  const dbFolders = useBatchFolders();
  const [activeFolderId, setActiveFolderId] = useState<number | undefined>(undefined);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderSource, setNewFolderSource] = useState<BatchFolder['sourceType']>('Manual Intake');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Rename & Status
  const [renamingFolderId, setRenamingFolderId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const activeFolder = dbFolders.find(f => f.id === activeFolderId);

  const handleDataAdded = () => {
    setRefreshTrigger(p => p + 1);
    // Update folder record count
    if (activeFolderId && activeFolder) {
      updateBatchFolder(activeFolderId, { totalRecords: (activeFolder.totalRecords || 0) + 1 });
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const id = await addBatchFolder({
      name: newFolderName.trim(),
      sourceType: newFolderSource,
      status: 'Ready for Design',
      collectorName: 'Field Officer',
      totalRecords: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    setActiveFolderId(id);
    setNewFolderName('');
    setShowCreateFolder(false);
  };

  const handleRenameFolder = async (id: number) => {
    if (!renameValue.trim()) return;
    await updateBatchFolder(id, { name: renameValue.trim() });
    setRenamingFolderId(null);
    setRenameValue('');
  };

  const handleSetFolderStatus = async (id: number, status: BatchFolder['status']) => {
    await updateBatchFolder(id, { status });
  };

  const handleDeleteFolder = (id: number, name: string) => {
    setConfirmModal({
      isOpen: true,
      title: `Delete Folder "${name}"`,
      message: `Are you sure you want to delete folder "${name}"? Contained personnel records will remain safely preserved in the database.`,
      onConfirm: async () => {
        await deleteBatchFolder(id);
        if (activeFolderId === id) setActiveFolderId(undefined);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  return (
    <div
      className="flex h-screen font-sans antialiased overflow-hidden transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-root)', color: 'var(--text-primary)' }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Header */}
        <header
          className="pl-14 pr-4 sm:px-8 pt-4 pb-3 border-b flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono tracking-widest uppercase font-bold text-[#84a92c]">
                ID PLATFORM / DATA COLLECTOR & ENROLLMENT
              </p>
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight mt-0.5" style={{ color: 'var(--text-primary)' }}>
                Data Collector & Biometric Onboarding
              </h1>
            </div>

            {/* Mode Switcher */}
            <div
              className="flex items-center p-1 rounded-xl border w-full sm:w-auto justify-center"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <button
                onClick={() => setCollectorMode('manual')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
                  collectorMode === 'manual' ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
                }`}
                style={{ color: collectorMode === 'manual' ? '#ffffff' : 'var(--text-secondary)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                <span>Manual Form & Camera</span>
              </button>

              <button
                onClick={() => setCollectorMode('scanner')}
                className={`flex-1 sm:flex-none px-3 sm:px-4 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
                  collectorMode === 'scanner' ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
                }`}
                style={{ color: collectorMode === 'scanner' ? '#ffffff' : 'var(--text-secondary)' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5z" />
                </svg>
                <span>Paper Document OCR</span>
              </button>
            </div>
          </div>
        </header>

        {/* ====== BATCH FOLDER MANAGER BAR ====== */}
        <div
          className="px-4 sm:px-8 py-3 border-b flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-[10px] font-bold uppercase font-mono tracking-wider flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
              Active Batch Folder:
            </label>

            {/* Folder Selector */}
            <select
              value={activeFolderId ?? ''}
              onChange={e => setActiveFolderId(e.target.value ? Number(e.target.value) : undefined)}
              className="text-xs py-1.5 px-3 rounded-xl border font-bold focus:outline-none focus:border-[#84a92c] cursor-pointer min-w-[200px]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            >
              <option value="">No Folder (Unclassified)</option>
              {dbFolders.map(f => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.totalRecords || 0} records) — {f.status}
                </option>
              ))}
            </select>

            {/* Create New Folder */}
            <button
              onClick={() => setShowCreateFolder(!showCreateFolder)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border hover:border-[#84a92c] transition-colors cursor-pointer flex items-center gap-1.5"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            >
              <span className="text-[#84a92c]">+</span>
              <span>New Folder</span>
            </button>

            {/* Active Folder Actions */}
            {activeFolder && (
              <div className="flex items-center gap-1.5 ml-auto">
                {/* Rename */}
                <button
                  onClick={() => { setRenamingFolderId(activeFolder.id!); setRenameValue(activeFolder.name); }}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg border hover:border-[#84a92c] cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                  title="Rename folder"
                >
                  Rename
                </button>

                {/* Status Dropdown */}
                <select
                  value={activeFolder.status}
                  onChange={e => handleSetFolderStatus(activeFolder.id!, e.target.value as BatchFolder['status'])}
                  className="text-[10px] py-1 px-2 rounded-lg border font-bold focus:outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="Ready for Design">Ready for Design</option>
                  <option value="In Design">In Design</option>
                  <option value="Approved">Approved</option>
                  <option value="Printed">Printed</option>
                  <option value="Archived">Archived</option>
                </select>

                {/* Delete */}
                <button
                  onClick={() => handleDeleteFolder(activeFolder.id!, activeFolder.name)}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg border hover:border-red-500 text-red-500 cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                  title="Delete folder"
                >
                  Delete
                </button>
              </div>
            )}
          </div>

          {/* Create Folder Inline Form */}
          {showCreateFolder && (
            <form onSubmit={handleCreateFolder} className="mt-3 flex items-end gap-3 p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
              <div className="flex-1">
                <label className="text-[10px] font-bold block mb-1" style={{ color: 'var(--text-muted)' }}>Folder Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="e.g. Grade 10 Students 2026"
                  className="w-full text-xs py-1.5 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c]"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold block mb-1" style={{ color: 'var(--text-muted)' }}>Source Type</label>
                <select
                  value={newFolderSource}
                  onChange={e => setNewFolderSource(e.target.value as any)}
                  className="text-xs py-1.5 px-3 rounded-xl border focus:outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                >
                  <option value="Manual Intake">Manual Entry</option>
                  <option value="Excel Import">Excel Import</option>
                  <option value="Archive Digitizer">Archive Digitizer</option>
                  <option value="Paper Document OCR">Paper OCR</option>
                </select>
              </div>
              <button type="submit" className="btn-primary py-1.5 px-4 text-xs font-bold cursor-pointer">
                Create
              </button>
              <button type="button" onClick={() => setShowCreateFolder(false)} className="px-3 py-1.5 text-xs font-bold border rounded-xl cursor-pointer"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </form>
          )}

          {/* Rename Inline Form */}
          {renamingFolderId !== null && (
            <div className="mt-3 flex items-end gap-3 p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
              <div className="flex-1">
                <label className="text-[10px] font-bold block mb-1" style={{ color: 'var(--text-muted)' }}>Rename Folder</label>
                <input
                  type="text"
                  autoFocus
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  className="w-full text-xs py-1.5 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c]"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleRenameFolder(renamingFolderId); }}
                />
              </div>
              <button onClick={() => handleRenameFolder(renamingFolderId)} className="btn-primary py-1.5 px-4 text-xs font-bold cursor-pointer">
                Save
              </button>
              <button onClick={() => setRenamingFolderId(null)} className="px-3 py-1.5 text-xs font-bold border rounded-xl cursor-pointer"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="px-4 sm:px-8 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Main Action Area (7 cols) */}
          <div
            className="lg:col-span-7 p-6 rounded-2xl border shadow-xs"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
          >
            {collectorMode === 'scanner' ? (
              <DocumentScanner
                onScanSuccess={handleDataAdded}
                activeFolderId={activeFolderId}
                activeFolderName={activeFolder?.name}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Direct Biometric Registration</h2>
                  {activeFolder && (
                    <span className="text-[10px] font-mono font-bold text-[#84a92c] bg-[#84a92c]/10 px-2 py-0.5 rounded border border-[#84a92c]/20 inline-flex items-center gap-1">
                      <FolderKanban className="w-3 h-3 text-[#84a92c]" />
                      <span>{activeFolder.name}</span>
                    </span>
                  )}
                </div>
                <RegistrationForm
                  onSuccess={handleDataAdded}
                  activeFolderId={activeFolderId}
                  activeFolderName={activeFolder?.name}
                />
              </div>
            )}
          </div>

          {/* Real-time Directory (5 cols) */}
          <div
            className="lg:col-span-5 p-6 rounded-2xl border shadow-xs flex flex-col"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
          >
            <PeopleList key={refreshTrigger} />
          </div>
        </div>
      </div>

      {/* In-App Confirmation Modal */}
      {confirmModal.isOpen && (
        <Modal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          title={confirmModal.title}
          size="sm"
        >
          <div className="space-y-4 text-xs font-sans" style={{ color: 'var(--text-primary)' }}>
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
              <p className="leading-relaxed">{confirmModal.message}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold rounded-xl border hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmModal.onConfirm()}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm cursor-pointer"
              >
                Delete Folder
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
