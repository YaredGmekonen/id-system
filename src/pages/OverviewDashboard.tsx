import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import Modal from '../components/shared/Modal';
import { generateSingleCardPdf, downloadPdf } from '../engine/exportPdf';
import { renderStudioCard, type StudioCardOptions } from '../engine/renderStudioCard';
import { usePeople, useWorkers, useTemplates, deletePeople, updatePerson, useBatchFolders, addBatchFolder, updateBatchFolder, deleteBatchFolder } from '../db/hooks';
import type { Person, BatchFolder } from '../db/database';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { FolderKanban, Trash2, CheckCircle2, AlertTriangle, AlertCircle, Palette, Printer, FileText, Layers, ArrowRight } from 'lucide-react';

type FilterStatus = 'All' | 'Unfulfilled' | 'Processing' | 'Fulfilled' | 'Refunded' | 'On Hold';
type ViewMode = 'roster' | 'folders';

export default function OverviewDashboard() {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const { currentRole, currentUser } = useAuth();

  const dbPeople = usePeople();
  const dbWorkers = useWorkers();
  const dbTemplates = useTemplates();
  const dbBatchFolders = useBatchFolders();

  const [viewMode, setViewMode] = useState<ViewMode>('roster');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('All');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectFace, setInspectFace] = useState<'front' | 'back'>('front');
  const [inspectCardUrl, setInspectCardUrl] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState(false);

  // Professional In-App Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Render live 300 DPI preview for inspect modal
  useEffect(() => {
    let isCancelled = false;
    if (inspectModalOpen && selectedPerson) {
      const render = async () => {
        try {
          const url = await renderStudioCard(selectedPerson, inspectFace, {
            orientation: 'horizontal',
            backgroundColor: '#FFFFFF',
            fontFamily: 'Inter',
            headerColor: '#0b131b',
            accentColor: '#10b981',
            badgeColor: '#1e3a8a',
          });
          if (!isCancelled) setInspectCardUrl(url);
        } catch {
          // Handled internally
        }
      };
      render();
    } else {
      setInspectCardUrl('');
    }
    return () => { isCancelled = true; };
  }, [inspectModalOpen, selectedPerson, inspectFace]);

  // Multi-Select Batch Actions State
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBatchOperating, setIsBatchOperating] = useState(false);

  // New Batch Folder Modal State (for Collector / Admin)
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderSource, setNewFolderSource] = useState<BatchFolder['sourceType']>('Excel Import');

  // Folder rename/status
  const [renamingFolderId, setRenamingFolderId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Role
  const role = currentRole || 'admin';

  // Grouped folders — merge person records with batchFolders table
  const folderBatches = useMemo(() => {
    const map = new Map<string, { total: number; fulfilled: number; processing: number; unfulfilled: number; records: Person[]; dbFolderId?: number; status?: string }>();

    // First populate from batchFolders Dexie table
    dbBatchFolders.forEach(bf => {
      map.set(bf.name, { total: 0, fulfilled: 0, processing: 0, unfulfilled: 0, records: [], dbFolderId: bf.id, status: bf.status });
    });

    // Then aggregate person records
    dbPeople.forEach(p => {
      const folder = p.folderName || p.sourceFileName || 'Unclassified';
      if (!map.has(folder)) {
        map.set(folder, { total: 0, fulfilled: 0, processing: 0, unfulfilled: 0, records: [] });
      }
      const entry = map.get(folder)!;
      entry.total += 1;
      entry.records.push(p);
      if (p.fulfillmentStatus === 'Fulfilled') entry.fulfilled += 1;
      else if (p.fulfillmentStatus === 'Processing') entry.processing += 1;
      else entry.unfulfilled += 1;
    });

    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      ...data,
    }));
  }, [dbPeople, dbBatchFolders]);

  // Filtered roster
  const filteredPeople = useMemo(() => {
    return dbPeople.filter(p => {
      const matchSearch =
        p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.idNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.role.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus = filterStatus === 'All' ? true : (p.fulfillmentStatus || 'Unfulfilled') === filterStatus;

      return matchSearch && matchStatus;
    });
  }, [dbPeople, searchQuery, filterStatus]);

  // Statistics
  const totalCount = dbPeople.length;
  const pendingCount = dbPeople.filter(p => (p.fulfillmentStatus || 'Unfulfilled') === 'Processing').length;
  const fulfilledCount = dbPeople.filter(p => p.fulfillmentStatus === 'Fulfilled').length;
  const unfulfilledCount = dbPeople.filter(p => (p.fulfillmentStatus || 'Unfulfilled') === 'Unfulfilled').length;

  // Multi-selection handlers
  const toggleSelectPerson = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPeople.length && filteredPeople.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPeople.map(p => p.id as number)));
    }
  };

  // Batch Delete with In-App Confirmation Modal
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Selected Personnel Records',
      message: `Are you sure you want to permanently delete all ${selectedIds.size} selected records from the database? This action cannot be undone.`,
      confirmText: `Delete ${selectedIds.size} Records`,
      onConfirm: async () => {
        setIsBatchOperating(true);
        try {
          await deletePeople(Array.from(selectedIds));
          setSelectedIds(new Set());
        } finally {
          setIsBatchOperating(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Batch Mark as Fulfilled
  const handleBatchMarkFulfilled = async () => {
    if (selectedIds.size === 0) return;
    setIsBatchOperating(true);
    try {
      for (const id of Array.from(selectedIds)) {
        await updatePerson(id, { fulfillmentStatus: 'Fulfilled', status: 'Printed' });
      }
      setSelectedIds(new Set());
    } finally {
      setIsBatchOperating(false);
    }
  };

  // Create New Batch Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    await addBatchFolder({
      name: newFolderName.trim(),
      sourceType: newFolderSource,
      status: 'Ready for Design',
      collectorName: currentUser?.name || 'Field Officer',
      totalRecords: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    setNewFolderName('');
    setCreateFolderModalOpen(false);
  };

  const handleInspect = (person: Person) => {
    setSelectedPerson(person);
    setInspectModalOpen(true);
  };

  const handlePrintSingle = async (person: Person) => {
    setIsPrinting(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1012;
      canvas.height = 638;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 1012, 638);
      ctx.fillStyle = '#0b131b';
      ctx.fillRect(0, 0, 1012, 120);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px sans-serif';
      ctx.fillText('SILICONLABS CREDENTIAL', 40, 70);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 36px sans-serif';
      ctx.fillText(person.fullName, 40, 240);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(person.role || 'Staff Member', 40, 280);
      ctx.fillStyle = '#475569';
      ctx.font = '20px sans-serif';
      ctx.fillText(`ID: ${person.idNumber} • Dept: ${person.department}`, 40, 340);

      const png = canvas.toDataURL('image/png');
      const pdf = await generateSingleCardPdf(png);
      downloadPdf(pdf, `${person.fullName.replace(/\s+/g, '_')}_Card.pdf`);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <div
      className="flex h-screen font-sans antialiased overflow-hidden transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-root)', color: 'var(--text-primary)' }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* ================= TOP HEADER ================= */}
        <header
          className="pl-14 pr-4 sm:px-8 py-3.5 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 z-20 flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase font-bold text-[#84a92c]">
                SILICONLABS TECH PLC / {role.toUpperCase()} COMMAND CONSOLE
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {role === 'designer'
                ? 'Card Designer Workflow & Production Queues'
                : role === 'collector'
                ? 'Field Registrar Intake & Batch Management'
                : 'Operations Overview & Batch Classifications'}
            </h1>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Launch Dedicated A4/A3 Print Studio Page */}
            <button
              onClick={() => navigate('/print')}
              className="btn-primary py-2 px-4 text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24-1.077-.47-2.18-.72-3.329m0 0L3.6 10.5M6 10.5l-2.4 2.4m14.4-2.4l2.4 2.4m-2.4-2.4l2.4-2.4M6.72 13.829L12 18l5.28-4.171M6.72 13.829c.14.628.32 1.256.54 1.871" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>A4/A3 Print Studio</span>
            </button>
          </div>
        </header>

        {/* ================= ROLE-TAILORED KPI STATS ================= */}
        <div className="px-4 sm:px-8 pt-4 pb-2">
          {/* 1. ADMIN / GUEST KPI METRICS */}
          {(role === 'admin' || role === 'guest') && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
              <div className="p-4 rounded-2xl border flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center justify-between text-xs">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#84a92c]/10 text-[#84a92c]">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                  </div>
                  <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>01</span>
                </div>
                <div className="mt-2.5">
                  <p className="text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Total Ingestions</p>
                  <p className="text-xl font-black mt-0.5" style={{ color: 'var(--text-primary)' }}>{totalCount}</p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>Encrypted DB</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center justify-between text-xs">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>02</span>
                </div>
                <div className="mt-2.5">
                  <p className="text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>In Pipeline</p>
                  <p className="text-xl font-black mt-0.5" style={{ color: 'var(--text-primary)' }}>{pendingCount}</p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>Ready for Layout</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center justify-between text-xs">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                  </div>
                  <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>03</span>
                </div>
                <div className="mt-2.5">
                  <p className="text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Fulfilled / Printed</p>
                  <p className="text-xl font-black mt-0.5" style={{ color: 'var(--text-primary)' }}>{fulfilledCount}</p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>Vector 300 DPI</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center justify-between text-xs">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
                  </div>
                  <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>04</span>
                </div>
                <div className="mt-2.5">
                  <p className="text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Unfulfilled Queue</p>
                  <p className="text-xl font-black mt-0.5" style={{ color: 'var(--text-primary)' }}>{unfulfilledCount}</p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>Awaiting Layout</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center justify-between text-xs">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-500/10 text-purple-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>
                  </div>
                  <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>05</span>
                </div>
                <div className="mt-2.5">
                  <p className="text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Source Batches</p>
                  <p className="text-xl font-black mt-0.5" style={{ color: 'var(--text-primary)' }}>{folderBatches.length}</p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>Excel & Page Runs</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl border flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center justify-between text-xs">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-cyan-500/10 text-cyan-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" /></svg>
                  </div>
                  <span className="font-mono text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>06</span>
                </div>
                <div className="mt-2.5">
                  <p className="text-[10px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Vector Templates</p>
                  <p className="text-xl font-black mt-0.5" style={{ color: 'var(--text-primary)' }}>{dbTemplates.length}</p>
                  <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>Designer Canvas</p>
                </div>
              </div>
            </div>
          )}

          {/* 2. CARD DESIGNER SPECIFIC STATS */}
          {role === 'designer' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                <p className="text-xs font-bold text-[#84a92c] flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-[#84a92c]" />
                  <span>Vector Templates in Library</span>
                </p>
                <p className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>{dbTemplates.length} Designs</p>
                <button
                  onClick={() => navigate('/designer')}
                  className="btn-secondary py-1.5 px-3 text-xs font-bold mt-2"
                >
                  + Create New Vector Template
                </button>
              </div>

              <div className="p-5 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                <p className="text-xs font-bold text-blue-500 flex items-center gap-1.5">
                  <FolderKanban className="w-4 h-4 text-blue-500" />
                  <span>Batches Awaiting Card Design</span>
                </p>
                <p className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>{folderBatches.length} Batches</p>
                <button
                  onClick={() => navigate('/studio')}
                  className="btn-primary py-1.5 px-3 text-xs font-bold mt-2"
                >
                  Open in ID Card Studio
                </button>
              </div>

              <div className="p-5 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                <p className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-emerald-500" />
                  <span>Ready to Imposition Print</span>
                </p>
                <p className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>{totalCount} Cards</p>
                <button
                  onClick={() => navigate('/print')}
                  className="btn-primary py-1.5 px-3 text-xs font-bold mt-2"
                >
                  Open A4/A3 Print Studio
                </button>
              </div>
            </div>
          )}

          {/* 3. FIELD REGISTRAR / COLLECTOR SPECIFIC STATS */}
          {role === 'collector' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                <p className="text-xs font-bold text-[#84a92c] flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#84a92c]" />
                  <span>Intake Form & Camera</span>
                </p>
                <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{totalCount} Enrolled</p>
                <button
                  onClick={() => navigate('/collector')}
                  className="btn-primary py-1.5 px-3 text-xs font-bold mt-2"
                >
                  + Enroll New Personnel
                </button>
              </div>

              <div className="p-5 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                <p className="text-xs font-bold text-purple-500 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-500" />
                  <span>Archive Book Digitizer</span>
                </p>
                <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>OCR Multi-Crop</p>
                <button
                  onClick={() => navigate('/digitizer')}
                  className="btn-secondary py-1.5 px-3 text-xs font-bold mt-2"
                >
                  Open Archive Digitizer
                </button>
              </div>

              <div className="p-5 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                <p className="text-xs font-bold text-blue-500 flex items-center gap-1.5">
                  <FolderKanban className="w-4 h-4 text-blue-500" />
                  <span>Create Intake Batch Folder</span>
                </p>
                <p className="text-xs text-slate-500">Create a named folder before importing rosters.</p>
                <button
                  onClick={() => setCreateFolderModalOpen(true)}
                  className="btn-secondary py-1.5 px-3 text-xs font-bold mt-2"
                >
                  + New Batch Folder
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ================= SUB-NAVIGATION TABS (Roster vs Folders) ================= */}
        <div className="px-8 py-2">
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('roster')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  viewMode === 'roster' ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: viewMode === 'roster' ? '#198754' : 'var(--bg-elevated)',
                  color: viewMode === 'roster' ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                Personnel Directory ({totalCount})
              </button>

              <button
                onClick={() => setViewMode('folders')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  viewMode === 'folders' ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: viewMode === 'folders' ? '#198754' : 'var(--bg-elevated)',
                  color: viewMode === 'folders' ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                <span>Source Folders & Batches ({folderBatches.length})</span>
              </button>
            </div>

            {/* Batch Actions Bar (when items are selected) */}
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#84a92c] bg-[#84a92c]/10 px-2.5 py-1 rounded-lg">
                  {selectedIds.size} Selected
                </span>

                <button
                  onClick={handleBatchMarkFulfilled}
                  disabled={isBatchOperating}
                  className="px-3 py-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg cursor-pointer"
                >
                  Mark Fulfilled
                </button>

                <button
                  onClick={() => navigate('/print')}
                  className="px-3 py-1 text-xs font-bold bg-[#198754] text-white rounded-lg cursor-pointer"
                >
                  Print Selected ({selectedIds.size})
                </button>

                <button
                  onClick={handleBatchDelete}
                  disabled={isBatchOperating}
                  className="px-3 py-1 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg cursor-pointer"
                >
                  Delete Selected
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ================= VIEW 1: ROSTER VIEW ================= */}
        {viewMode === 'roster' && (
          <div className="px-4 md:px-8 py-4 space-y-4">
            {/* Filter / Search Bar */}
            <div
              className="p-3 md:p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              <div className="relative w-full sm:w-80">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search personnel, ID, department..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c] transition-colors truncate"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {(['All', 'Unfulfilled', 'Processing', 'Fulfilled', 'Refunded', 'On Hold'] as FilterStatus[]).map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                      filterStatus === status ? 'bg-[#198754] text-white shadow-xs' : 'border hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: filterStatus === status ? '#198754' : 'var(--bg-elevated)',
                      borderColor: filterStatus === status ? '#198754' : 'var(--border-primary)',
                      color: filterStatus === status ? '#ffffff' : 'var(--text-secondary)',
                    }}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Card List (visible on screens < sm) */}
            <div className="block sm:hidden space-y-2.5">
              {filteredPeople.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-muted)' }}>
                  <p className="font-semibold text-xs">No records found</p>
                </div>
              ) : (
                filteredPeople.map(p => {
                  const isChecked = p.id ? selectedIds.has(p.id) : false;
                  return (
                    <div
                      key={p.id}
                      className="p-3 rounded-2xl border flex items-center justify-between gap-3 shadow-xs"
                      style={{
                        backgroundColor: isChecked ? 'rgba(132, 169, 44, 0.08)' : 'var(--bg-surface)',
                        borderColor: isChecked ? '#84a92c' : 'var(--border-primary)',
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => p.id && toggleSelectPerson(p.id)}
                          className="w-4 h-4 rounded accent-[#84a92c] cursor-pointer flex-shrink-0"
                        />
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-slate-900 border flex items-center justify-center font-bold text-xs" style={{ borderColor: 'var(--border-primary)', color: '#84a92c' }}>
                          {p.photoDataUrl ? (
                            <img src={p.photoDataUrl} alt={p.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <span>{p.fullName.substring(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs truncate" style={{ color: 'var(--text-primary)' }}>{p.fullName}</p>
                          <p className="text-[10px] font-mono text-slate-400 truncate">ID: {p.idNumber} • {p.role || 'Staff'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleInspect(p)}
                          className="btn-primary py-1.5 px-3 text-[11px] font-bold cursor-pointer"
                        >
                          Inspect
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop / Tablet Records Table (Scrollable Container with Sticky Header) */}
            <div
              className="hidden sm:block rounded-2xl border shadow-xs overflow-hidden"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-300px)]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 shadow-xs">
                    <tr
                      className="border-b text-[10px] font-mono font-bold uppercase tracking-wider"
                      style={{
                        borderColor: 'var(--border-primary)',
                        color: 'var(--text-muted)',
                        backgroundColor: 'var(--bg-elevated)',
                      }}
                    >
                      <th className="px-4 py-3.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === filteredPeople.length && filteredPeople.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded accent-[#84a92c] cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3.5">Personnel Name</th>
                      <th className="px-4 py-3.5">ID Number</th>
                      <th className="px-4 py-3.5">Source Folder</th>
                      <th className="px-4 py-3.5">Department</th>
                      <th className="px-4 py-3.5">Role</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border-primary)' }}>
                    {filteredPeople.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                          <p className="font-semibold text-sm">No records found matching your search</p>
                        </td>
                      </tr>
                    ) : (
                      filteredPeople.map(p => {
                        const isChecked = p.id ? selectedIds.has(p.id) : false;
                        return (
                          <tr
                            key={p.id}
                            className={`hover:opacity-90 transition-colors ${
                              isChecked ? 'bg-[#84a92c]/5' : ''
                            }`}
                          >
                            <td className="px-4 py-3.5 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => p.id && toggleSelectPerson(p.id)}
                                className="w-4 h-4 rounded accent-[#84a92c] cursor-pointer"
                              />
                            </td>

                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-3">
                                <div
                                  className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border flex items-center justify-center font-bold text-xs"
                                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                                >
                                  {p.photoDataUrl ? (
                                    <img src={p.photoDataUrl} alt={p.fullName} className="w-full h-full object-cover" />
                                  ) : (
                                    <span>{p.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</span>
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{p.fullName}</p>
                                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.email || `${p.idNumber}@internal`}</p>
                                </div>
                              </div>
                            </td>

                            <td className="px-4 py-3.5 font-mono font-bold text-[#84a92c]">{p.idNumber}</td>

                            <td className="px-4 py-3.5 font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              <span className="inline-flex items-center gap-1">
                                <FolderKanban className="w-3.5 h-3.5 text-[#84a92c] flex-shrink-0" />
                                <span>{p.folderName || p.sourceFileName || 'Default Roster'}</span>
                              </span>
                            </td>

                            <td className="px-4 py-3.5 font-medium" style={{ color: 'var(--text-secondary)' }}>{p.department || 'General'}</td>

                            <td className="px-4 py-3.5" style={{ color: 'var(--text-secondary)' }}>{p.role || 'Staff'}</td>

                            <td className="px-4 py-3.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  p.fulfillmentStatus === 'Fulfilled'
                                    ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                                    : p.fulfillmentStatus === 'Processing'
                                    ? 'bg-blue-500/15 text-blue-600 border border-blue-500/30'
                                    : 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                                }`}
                              >
                                {p.fulfillmentStatus || 'Unfulfilled'}
                              </span>
                            </td>

                            <td className="px-6 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleInspect(p)}
                                  className="px-3 py-1 text-xs font-bold rounded-lg border hover:border-[#84a92c] transition-colors cursor-pointer"
                                  style={{
                                    backgroundColor: 'var(--bg-elevated)',
                                    borderColor: 'var(--border-primary)',
                                    color: 'var(--text-primary)',
                                  }}
                                >
                                  Inspect
                                </button>
                                <button
                                  onClick={() => handlePrintSingle(p)}
                                  disabled={isPrinting}
                                  className="p-1.5 rounded-lg border hover:text-[#84a92c] transition-colors cursor-pointer"
                                  style={{
                                    backgroundColor: 'var(--bg-elevated)',
                                    borderColor: 'var(--border-primary)',
                                  }}
                                  title="Print 1x CR80 PDF"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24-1.077-.47-2.18-.72-3.329m0 0L3.6 10.5M6 10.5l-2.4 2.4m14.4-2.4l2.4 2.4m-2.4-2.4l2.4-2.4M6.72 13.829L12 18l5.28-4.171M6.72 13.829c.14.628.32 1.256.54 1.871" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= VIEW 2: FOLDERS / BATCHES VIEW ================= */}
        {viewMode === 'folders' && (
          <div className="px-8 py-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {folderBatches.map(batch => (
                <div
                  key={batch.name}
                  className="p-5 rounded-2xl border flex flex-col justify-between space-y-4 hover:border-[#84a92c] transition-all"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#84a92c]/10 text-[#84a92c]">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                        </svg>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {batch.status && (
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            batch.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-600' :
                            batch.status === 'In Design' ? 'bg-blue-500/15 text-blue-600' :
                            batch.status === 'Printed' ? 'bg-purple-500/15 text-purple-600' :
                            batch.status === 'Archived' ? 'bg-slate-500/15 text-slate-500' :
                            'bg-amber-500/15 text-amber-600'
                          }`}>
                            {batch.status}
                          </span>
                        )}
                        <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-slate-500/10 font-bold" style={{ color: 'var(--text-muted)' }}>
                          {batch.total} Cards
                        </span>
                      </div>
                    </div>

                    {/* Folder Name / Rename */}
                    {renamingFolderId === batch.dbFolderId ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && batch.dbFolderId && renameValue.trim()) {
                              updateBatchFolder(batch.dbFolderId, { name: renameValue.trim() });
                              setRenamingFolderId(null);
                            }
                            if (e.key === 'Escape') setRenamingFolderId(null);
                          }}
                          className="flex-1 text-sm px-2 py-1 rounded-lg border focus:outline-none focus:border-[#84a92c]"
                          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                        />
                        <button
                          onClick={() => {
                            if (batch.dbFolderId && renameValue.trim()) {
                              updateBatchFolder(batch.dbFolderId, { name: renameValue.trim() });
                            }
                            setRenamingFolderId(null);
                          }}
                          className="text-[10px] px-2 py-1 bg-[#84a92c] text-white rounded-lg font-bold cursor-pointer"
                        >Save</button>
                      </div>
                    ) : (
                      <div>
                        <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{batch.name}</h3>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {batch.fulfilled} Fulfilled · {batch.processing} Processing · {batch.unfulfilled} Pending
                        </p>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                      <div className="bg-emerald-500 h-full" style={{ width: `${(batch.fulfilled / (batch.total || 1)) * 100}%` }} title={`${batch.fulfilled} Fulfilled`} />
                      <div className="bg-blue-500 h-full" style={{ width: `${(batch.processing / (batch.total || 1)) * 100}%` }} title={`${batch.processing} Processing`} />
                      <div className="bg-amber-500 h-full" style={{ width: `${(batch.unfulfilled / (batch.total || 1)) * 100}%` }} title={`${batch.unfulfilled} Pending`} />
                    </div>
                  </div>

                  {/* Folder Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <button
                      onClick={() => navigate('/studio')}
                      className="btn-primary flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>Open in Studio</span>
                    </button>

                    {batch.dbFolderId && (
                      <>
                        {/* Status Change */}
                        <select
                          value={batch.status || 'Ready for Design'}
                          onChange={e => updateBatchFolder(batch.dbFolderId!, { status: e.target.value as BatchFolder['status'] })}
                          className="text-[10px] py-1.5 px-2 rounded-lg border font-bold focus:outline-none cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                          title="Change folder status"
                        >
                          <option value="Ready for Design">Ready for Design</option>
                          <option value="In Design">In Design</option>
                          <option value="Approved">Approved</option>
                          <option value="Printed">Printed</option>
                          <option value="Archived">Archived</option>
                        </select>

                        {/* Rename */}
                        <button
                          onClick={() => { setRenamingFolderId(batch.dbFolderId!); setRenameValue(batch.name); }}
                          className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg border hover:border-[#84a92c] cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                          title="Rename folder"
                        >Rename</button>

                        {/* Delete */}
                        <button
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              title: `Delete Folder "${batch.name}"`,
                              message: `Are you sure you want to delete folder "${batch.name}"? Contained personnel records will remain safely preserved in the directory.`,
                              confirmText: 'Delete Folder',
                              onConfirm: async () => {
                                if (batch.dbFolderId) {
                                  await deleteBatchFolder(batch.dbFolderId);
                                }
                                setConfirmModal(prev => ({ ...prev, isOpen: false }));
                              },
                            });
                          }}
                          className="px-2.5 py-1.5 text-[10px] font-bold rounded-lg border hover:border-red-500 text-red-500 cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                          title="Delete folder"
                        >Delete</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Inspect Modal */}
      {inspectModalOpen && selectedPerson && (
        <Modal
          isOpen={inspectModalOpen}
          onClose={() => setInspectModalOpen(false)}
          title={`Personnel Credential: ${selectedPerson.fullName}`}
          size="lg"
        >
          <div className="space-y-4 text-xs font-sans" style={{ color: 'var(--text-primary)' }}>
            
            {/* Front / Back Side Switcher */}
            <div className="flex items-center justify-between">
              <div className="flex rounded-xl overflow-hidden border p-1" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                <button
                  onClick={() => setInspectFace('front')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    inspectFace === 'front' ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
                  }`}
                  style={{ color: inspectFace === 'front' ? '#ffffff' : 'var(--text-secondary)' }}
                >
                  Front Face
                </button>
                <button
                  onClick={() => setInspectFace('back')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    inspectFace === 'back' ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
                  }`}
                  style={{ color: inspectFace === 'back' ? '#ffffff' : 'var(--text-secondary)' }}
                >
                  Back Face
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] bg-[#84a92c]/20 text-[#84a92c] px-2 py-1 rounded-lg font-bold">
                  300 DPI Vector Engine
                </span>
                <span className="font-mono text-[10px] px-2 py-1 rounded-lg border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                  ID: {selectedPerson.idNumber}
                </span>
              </div>
            </div>

            {/* Live Rendered Card Image */}
            <div className="flex items-center justify-center p-4 rounded-2xl bg-black/40 border border-white/10 shadow-inner">
              {inspectCardUrl ? (
                <div className="relative group max-w-md w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
                  <img src={inspectCardUrl} alt={`${selectedPerson.fullName} ${inspectFace}`} className="w-full h-auto object-contain rounded-2xl" />
                </div>
              ) : (
                <div className="w-full h-48 flex items-center justify-center text-slate-400">
                  <span>Rendering live 300 DPI credential…</span>
                </div>
              )}
            </div>

            {/* Person Detail Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-2xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
              <div>
                <span className="text-[10px] text-slate-500 font-mono block">Full Name</span>
                <span className="font-bold text-xs truncate block">{selectedPerson.fullName}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono block">Department</span>
                <span className="font-bold text-xs truncate block">{selectedPerson.department || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono block">Role / Title</span>
                <span className="font-bold text-xs truncate block">{selectedPerson.role || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 font-mono block">Batch Folder</span>
                <span className="font-bold text-xs truncate block">{selectedPerson.folderName || 'Default Batch'}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <button
                onClick={() => {
                  setInspectModalOpen(false);
                  handlePrintSingle(selectedPerson);
                }}
                className="btn-secondary py-2 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#84a92c]" />
                <span>Download 300 DPI PDF</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setInspectModalOpen(false);
                    navigate(`/print?personId=${selectedPerson.id}`);
                  }}
                  className="py-2 px-3 rounded-xl border text-xs font-bold hover:border-[#84a92c] transition-colors cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                >
                  Open in Paper Print Studio
                </button>

                <button
                  onClick={() => {
                    setInspectModalOpen(false);
                    navigate(`/studio?personId=${selectedPerson.id}`);
                  }}
                  className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>Open in ID Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Create New Batch Folder Modal */}
      {createFolderModalOpen && (
        <Modal
          isOpen={createFolderModalOpen}
          onClose={() => setCreateFolderModalOpen(false)}
          title="Create New Intake Batch Folder"
          size="md"
        >
          <form onSubmit={handleCreateFolder} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
                Batch Folder Name *
              </label>
              <input
                type="text"
                required
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="e.g. Grade 10 Students 2026 or Engineering Batch 01"
                className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c]"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label className="font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
                Source Intake Type
              </label>
              <select
                value={newFolderSource}
                onChange={e => setNewFolderSource(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c] cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="Excel Import">Excel Spreadsheet (.xlsx / .csv)</option>
                <option value="Manual Intake">Manual Biometric Entry & Camera</option>
                <option value="Archive Digitizer">Archive Book Digitizer (OCR Multi-Crop)</option>
                <option value="Paper Document OCR">Paper Document Auto-Scanner</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <button
                type="button"
                onClick={() => setCreateFolderModalOpen(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border hover:opacity-80 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-secondary)',
                }}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary py-2 px-5 text-xs font-bold shadow-xs cursor-pointer">
                Create Batch Folder
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Professional In-App Confirmation Modal */}
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
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
