import { useState, useCallback } from 'react';
import Sidebar from '../components/layout/Sidebar';
import RegistrationForm from '../components/collector/RegistrationForm';
import PeopleList from '../components/collector/PeopleList';
import Modal from '../components/shared/Modal';
import { useBatchFolders, usePeople, addBatchFolder, updateBatchFolder, deleteBatchFolder } from '../db/hooks';
import type { BatchFolder } from '../db/database';
import { AlertTriangle, Download } from 'lucide-react';

export default function DataCollector() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Batch Folder Management
  const dbFolders = useBatchFolders();
  const allPeople = usePeople();
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

  // Export folder data as CSV file
  const handleExportCSV = useCallback(() => {
    if (!activeFolder) return;
    const folderRecords = allPeople.filter(p => {
      if (!activeFolderId) return true;
      const matchId = p.batchFolderId === activeFolderId;
      const matchName = p.folderName && p.folderName.toLowerCase() === activeFolder.name.toLowerCase();
      const matchDept = p.department && p.department.toLowerCase() === activeFolder.name.toLowerCase();
      return matchId || matchName || matchDept;
    });

    if (folderRecords.length === 0) {
      alert('No records in this folder to export.');
      return;
    }

    const headers = ['ID Number', 'Full Name', 'First Name', 'Last Name', 'Gender', 'Department', 'Role', 'School', 'Grade', 'Section', 'Phone', 'Blood Group', 'Date of Birth', 'Guardian', 'Status', 'Has Photo', 'Has QR'];
    const rows = folderRecords.map(p => [
      p.idNumber, p.fullName, p.firstName || '', p.lastName || '', p.gender || '',
      p.department || '', p.role || '', p.schoolName || '', p.grade || '', p.section || '',
      p.phone || '', p.bloodGroup || '', p.joinedDate || '', p.guardianName || '',
      p.status || '', p.photoDataUrl ? 'Yes' : 'No', p.qrCodeDataUrl ? 'Yes' : 'No',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeFolder.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [activeFolder, activeFolderId, allPeople]);

  return (
    <div
      className="flex h-screen font-sans antialiased overflow-hidden transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-root)', color: 'var(--text-primary)' }}
    >
      <Sidebar />

      <main id="main-content" className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* ====== BATCH FOLDER MANAGER BAR ====== */}
        <div
          className="pl-14 pr-4 sm:px-8 py-3.5 border-b flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center gap-3 flex-wrap">
            <label htmlFor="active-collector-batch-folder" className="text-xs font-bold uppercase font-mono tracking-wider flex-shrink-0 text-slate-300">
              Active Folder:
            </label>

            {/* Folder Selector */}
            <select
              id="active-collector-batch-folder"
              name="activeBatchFolder"
              value={activeFolderId ?? ''}
              onChange={e => setActiveFolderId(e.target.value ? Number(e.target.value) : undefined)}
              className="text-xs py-2 px-3 rounded-xl border border-slate-700 bg-[#18191b] text-white font-bold focus:outline-none focus:border-[#84a92c] cursor-pointer min-w-[220px]"
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
              onClick={() => setShowCreateFolder(true)}
              className="px-3.5 py-2 text-xs font-extrabold rounded-xl bg-[#84a92c] hover:bg-[#9fe870] text-slate-950 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <span>+ New Folder</span>
            </button>

            {/* Active Folder Actions */}
            {activeFolder && (
              <div className="flex items-center gap-1.5 ml-auto">
                {/* Export CSV */}
                <button
                  onClick={handleExportCSV}
                  className="px-2.5 py-1 text-[10px] font-bold rounded-lg border hover:border-[#84a92c] cursor-pointer flex items-center gap-1"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: '#84a92c' }}
                  title="Export this folder's data as CSV spreadsheet"
                >
                  <Download className="w-3 h-3" />
                  <span>Export CSV</span>
                </button>

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
                  id="collector-folder-status-select"
                  name="folderStatus"
                  aria-label="Batch folder status"
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
        </div>

        {/* Content Body — Single Intake Form + Roster */}
        <div className="flex-1 p-4 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Column */}
            <div className="lg:col-span-7 space-y-4">
              <div
                className="p-5 sm:p-6 rounded-2xl border shadow-xs"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              >
                <RegistrationForm
                  onSuccess={handleDataAdded}
                  activeFolderId={activeFolderId}
                  activeFolderName={activeFolder?.name}
                />
              </div>
            </div>

            {/* Roster Column */}
            <div className="lg:col-span-5 space-y-4">
              <div
                className="p-5 sm:p-6 rounded-2xl border shadow-xs"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              >
                <PeopleList
                  refreshTrigger={refreshTrigger}
                  activeFolderId={activeFolderId}
                  activeFolderName={activeFolder?.name}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <Modal
          isOpen={showCreateFolder}
          onClose={() => setShowCreateFolder(false)}
          title="Create New Batch Folder"
          size="md"
        >
          <form onSubmit={handleCreateFolder} className="space-y-4 text-xs font-sans">
            <div>
              <label htmlFor="collector-popup-folder-name" className="text-xs font-bold block mb-1 text-[var(--text-secondary)]">
                Folder / Batch Name *
              </label>
              <input
                id="collector-popup-folder-name"
                name="popupFolderName"
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="e.g., Grade 10 Section B, Engineering Department 2026"
                required
                className="w-full text-xs py-2 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c]"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="collector-popup-folder-source" className="text-xs font-bold block mb-1 text-[var(--text-secondary)]">
                Intake Source Type
              </label>
              <select
                id="collector-popup-folder-source"
                name="popupFolderSource"
                value={newFolderSource}
                onChange={e => setNewFolderSource(e.target.value as BatchFolder['sourceType'])}
                className="w-full text-xs py-2 px-3 rounded-xl border font-bold focus:outline-none cursor-pointer"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              >
                <option value="Manual Intake">Manual Intake & Biometric Camera</option>
                <option value="Excel Import">Excel / CSV Spreadsheet Import</option>
                <option value="Paper Document OCR">Paper Document OCR Extraction</option>
                <option value="Archive Digitizer">Archive Book Digitizer</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <button
                type="button"
                onClick={() => setShowCreateFolder(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newFolderName.trim()}
                className="btn-primary py-2 px-4 text-xs font-bold disabled:opacity-50"
              >
                Save Folder
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Rename Folder Modal */}
      {renamingFolderId !== null && (
        <Modal
          isOpen={renamingFolderId !== null}
          onClose={() => setRenamingFolderId(null)}
          title="Rename Batch Folder"
          size="sm"
        >
          <div className="space-y-4 text-xs font-sans">
            <div>
              <label htmlFor="collector-popup-rename-input" className="text-xs font-bold block mb-1 text-[var(--text-secondary)]">
                New Folder Name *
              </label>
              <input
                id="collector-popup-rename-input"
                name="popupRenameInput"
                type="text"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                required
                className="w-full text-xs py-2 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c]"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <button
                type="button"
                onClick={() => setRenamingFolderId(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRenameFolder(renamingFolderId)}
                disabled={!renameValue.trim()}
                className="btn-primary py-2 px-4 text-xs font-bold disabled:opacity-50"
              >
                Update Name
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal */}
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
                Confirm Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
