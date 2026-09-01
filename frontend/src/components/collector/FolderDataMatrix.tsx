import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePeople, useBatchFolders, updatePerson, deletePerson, addPerson, updateBatchFolder } from '../../db/hooks';
import type { Person, BatchFolder } from '../../db/database';
import { generateQrDataUrl } from '../../engine/barcodeQr';
import {
  FolderKanban,
  Image as ImageIcon,
  QrCode,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Sparkles,
  Trash2,
  Edit3,
  ArrowRight,
  ExternalLink,
  CreditCard,
  Layers,
  RefreshCw,
  X,
  Save,
  Camera,
  Download,
  ChevronDown,
  Hash,
  UserPlus,
} from 'lucide-react';

interface FolderDataMatrixProps {
  activeFolderId?: number;
  onClose?: () => void;
}

export default function FolderDataMatrix({ activeFolderId, onClose }: FolderDataMatrixProps) {
  const navigate = useNavigate();
  const allPeople = usePeople();
  const allFolders = useBatchFolders();

  const [selectedFolderId, setSelectedFolderId] = useState<number | undefined>(activeFolderId);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPersonId, setEditingPersonId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<{ fullName: string; idNumber: string; department: string; role: string }>({
    fullName: '',
    idNumber: '',
    department: '',
    role: '',
  });
  const [hoveredRowIdx, setHoveredRowIdx] = useState<number | null>(null);
  const [autoIdProgress, setAutoIdProgress] = useState<string | null>(null);
  const [addingRecord, setAddingRecord] = useState(false);
  const [newRecordName, setNewRecordName] = useState('');
  const [newRecordId, setNewRecordId] = useState('');

  // File input refs
  const bulkPhotoInputRef = useRef<HTMLInputElement>(null);
  const bulkQrInputRef = useRef<HTMLInputElement>(null);
  const singlePhotoInputRef = useRef<HTMLInputElement>(null);
  const singleQrInputRef = useRef<HTMLInputElement>(null);
  const [targetPersonForUpload, setTargetPersonForUpload] = useState<Person | null>(null);

  // Synchronized scroll refs
  const col1Ref = useRef<HTMLDivElement>(null);
  const col2Ref = useRef<HTMLDivElement>(null);
  const col3Ref = useRef<HTMLDivElement>(null);
  const scrollingRef = useRef(false);

  const activeFolder = allFolders.find(f => f.id === selectedFolderId) || allFolders[0];

  // Synchronized scroll handler — scroll all 3 columns in lockstep
  const handleSyncScroll = useCallback((source: 'col1' | 'col2' | 'col3') => {
    if (scrollingRef.current) return;
    scrollingRef.current = true;

    const sourceEl =
      source === 'col1' ? col1Ref.current :
      source === 'col2' ? col2Ref.current :
      col3Ref.current;

    if (!sourceEl) { scrollingRef.current = false; return; }

    const scrollTop = sourceEl.scrollTop;
    if (source !== 'col1' && col1Ref.current) col1Ref.current.scrollTop = scrollTop;
    if (source !== 'col2' && col2Ref.current) col2Ref.current.scrollTop = scrollTop;
    if (source !== 'col3' && col3Ref.current) col3Ref.current.scrollTop = scrollTop;

    requestAnimationFrame(() => { scrollingRef.current = false; });
  }, []);

  // Filter records belonging to selected folder
  const folderPeople = useMemo(() => {
    return allPeople.filter(p => {
      if (selectedFolderId && activeFolder) {
        const matchesFolderId = p.batchFolderId === selectedFolderId;
        const matchesFolderName = p.folderName && p.folderName.toLowerCase() === activeFolder.name.toLowerCase();
        const matchesDept = p.department && p.department.toLowerCase() === activeFolder.name.toLowerCase();
        if (!matchesFolderId && !matchesFolderName && !matchesDept) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.fullName.toLowerCase().includes(q) ||
          p.idNumber.toLowerCase().includes(q) ||
          p.department.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allPeople, selectedFolderId, activeFolder, searchQuery]);

  // Statistics
  const totalCount = folderPeople.length;
  const photoCount = folderPeople.filter(p => p.photoDataUrl && p.photoDataUrl.trim()).length;
  const qrCount = folderPeople.filter(p => p.qrCodeDataUrl || p.barcodeValue).length;
  const fulfilledCount = folderPeople.filter(p => (p.photoDataUrl && p.photoDataUrl.trim()) && (p.qrCodeDataUrl)).length;
  const readyPercent = totalCount > 0 ? Math.round(((photoCount + qrCount) / (totalCount * 2)) * 100) : 0;

  // Auto-standardize IDs and generate QR codes
  const handleAutoStandardize = async () => {
    setAutoIdProgress('Starting...');
    for (let i = 0; i < folderPeople.length; i++) {
      const p = folderPeople[i];
      if (!p.id) continue;
      const stdId = `STU-${String(i + 1).padStart(3, '0')}`;
      setAutoIdProgress(`Processing ${stdId} (${i + 1}/${folderPeople.length})`);
      const qrData = await generateQrDataUrl(stdId, 160);
      await updatePerson(p.id, {
        idNumber: p.idNumber?.startsWith('STU-') ? p.idNumber : stdId,
        qrCodeDataUrl: p.qrCodeDataUrl || qrData,
      });
    }
    setAutoIdProgress(null);
  };

  // Add inline record
  const handleAddInlineRecord = async () => {
    if (!newRecordName.trim()) return;
    const autoId = newRecordId.trim() || `STU-${String(folderPeople.length + 1).padStart(3, '0')}`;
    await addPerson({
      fullName: newRecordName.trim(),
      firstName: newRecordName.trim().split(' ')[0] || '',
      lastName: newRecordName.trim().split(' ').slice(1).join(' ') || '',
      idNumber: autoId,
      category: 'Students',
      department: activeFolder?.name || 'General',
      role: 'Student',
      phone: '',
      email: '',
      bloodGroup: 'O+',
      joinedDate: new Date().toISOString().split('T')[0],
      gender: 'Male',
      schoolName: '',
      grade: activeFolder?.name || '',
      section: '',
      rollNumber: '',
      guardianName: '',
      photoDataUrl: '',
      qrCodeDataUrl: '',
      status: 'Active',
      fulfillmentStatus: 'Unfulfilled',
      paymentStatus: 'Paid',
      channel: 'Folder Matrix',
      totalAmount: 'Free',
      workerId: 1,
      collectedBy: 'Matrix Entry',
      location: '',
      batchFolderId: selectedFolderId,
      folderName: activeFolder?.name || '',
      sourceFileName: 'Inline Matrix Add',
      createdAt: new Date(),
    });
    setNewRecordName('');
    setNewRecordId('');
    setAddingRecord(false);
    // Update folder record count
    if (selectedFolderId && activeFolder?.id) {
      await updateBatchFolder(activeFolder.id, { totalRecords: (activeFolder.totalRecords || 0) + 1 });
    }
  };

  // Single photo upload for a target person row
  const handleSinglePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && targetPersonForUpload?.id) {
      const reader = new FileReader();
      reader.onload = async () => {
        await updatePerson(targetPersonForUpload.id!, { photoDataUrl: reader.result as string });
        setTargetPersonForUpload(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Single QR upload for a target person row
  const handleSingleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && targetPersonForUpload?.id) {
      const reader = new FileReader();
      reader.onload = async () => {
        await updatePerson(targetPersonForUpload.id!, { qrCodeDataUrl: reader.result as string });
        setTargetPersonForUpload(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Bulk photo matcher by filename
  const handleBulkPhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    files.forEach(file => {
      const baseName = file.name.replace(/\.[^/.]+$/, '').toLowerCase().trim();
      const match = folderPeople.find(
        p =>
          p.idNumber.toLowerCase().trim() === baseName ||
          p.fullName.toLowerCase().replace(/\s+/g, '') === baseName.replace(/\s+/g, '') ||
          p.idNumber.toLowerCase().includes(baseName) ||
          p.fullName.toLowerCase().replace(/\s+/g, '').includes(baseName.replace(/\s+/g, ''))
      );
      if (match && match.id) {
        const reader = new FileReader();
        reader.onload = async () => {
          await updatePerson(match.id!, { photoDataUrl: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    });
  };

  // Bulk QR matcher by filename
  const handleBulkQrs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    files.forEach(file => {
      const baseName = file.name.replace(/\.[^/.]+$/, '').toLowerCase().trim();
      const match = folderPeople.find(
        p =>
          p.idNumber.toLowerCase().trim() === baseName ||
          p.fullName.toLowerCase().replace(/\s+/g, '') === baseName.replace(/\s+/g, '') ||
          p.idNumber.toLowerCase().includes(baseName) ||
          p.fullName.toLowerCase().replace(/\s+/g, '').includes(baseName.replace(/\s+/g, ''))
      );
      if (match && match.id) {
        const reader = new FileReader();
        reader.onload = async () => {
          await updatePerson(match.id!, { qrCodeDataUrl: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    });
  };

  // Row height constant for alignment
  const ROW_HEIGHT = 'h-[72px]';

  return (
    <div
      className="flex flex-col h-full rounded-2xl border overflow-hidden"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
    >
      {/* Hidden File Inputs */}
      <input ref={singlePhotoInputRef} type="file" accept="image/*" className="hidden" onChange={handleSinglePhotoChange} />
      <input ref={singleQrInputRef} type="file" accept="image/*" className="hidden" onChange={handleSingleQrChange} />
      <input ref={bulkPhotoInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleBulkPhotos} />
      <input ref={bulkQrInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleBulkQrs} />

      {/* ══════════════════════════════════════════════════ */}
      {/* TOP: Folder Header Banner                        */}
      {/* ══════════════════════════════════════════════════ */}
      <div
        className="px-4 sm:px-5 py-3 border-b flex flex-col md:flex-row items-start md:items-center justify-between gap-3 flex-shrink-0"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#84a92c]/20 border border-[#84a92c]/40 flex items-center justify-center text-[#84a92c] flex-shrink-0">
            <FolderKanban className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm sm:text-base font-extrabold truncate" style={{ color: 'var(--text-primary)' }}>
                {activeFolder?.name || 'All Records'}
              </h2>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono tracking-wider border ${
                activeFolder?.status === 'Ready for Design' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                activeFolder?.status === 'In Design' ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' :
                activeFolder?.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                activeFolder?.status === 'Printed' ? 'bg-violet-500/15 text-violet-300 border-violet-500/30' :
                'bg-slate-500/15 text-slate-300 border-slate-500/30'
              }`}>
                {activeFolder?.status || 'Ready'}
              </span>
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Source: <span style={{ color: 'var(--text-secondary)' }}>{activeFolder?.sourceType || 'Mixed'}</span>
              {' '}• <strong style={{ color: 'var(--text-primary)' }}>{totalCount}</strong> records
              {' '}• <span className="text-[#84a92c]">{photoCount}</span> photos
              {' '}• <span className="text-pink-400">{qrCount}</span> QRs
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          <button
            onClick={handleAutoStandardize}
            disabled={!!autoIdProgress}
            className="px-3 py-1.5 rounded-xl border border-slate-700 hover:border-[#84a92c] text-[#84a92c] text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--bg-surface)' }}
            title="Auto-assign STU-001, STU-002... IDs and generate QR codes for records without them"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{autoIdProgress || 'Auto ID & QR (STU001)'}</span>
          </button>
          <button
            onClick={() => navigate('/studio')}
            className="px-3.5 py-1.5 rounded-xl bg-[#84a92c] hover:bg-[#9fe870] text-slate-950 text-[11px] font-extrabold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <span>Generate IDs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* PROGRESS BAR + SEARCH                            */}
      {/* ══════════════════════════════════════════════════ */}
      <div
        className="px-4 sm:px-5 py-2 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 flex-shrink-0"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Fulfillment: <strong className="text-[#9fe870]">{readyPercent}%</strong>
            <span className="text-slate-500 ml-1">({fulfilledCount}/{totalCount} complete)</span>
          </span>
          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)' }}>
            <div
              className="h-full bg-gradient-to-r from-[#84a92c] to-[#9fe870] rounded-full transition-all duration-700"
              style={{ width: `${readyPercent}%` }}
            />
          </div>
        </div>

        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search records..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl border text-[11px] focus:outline-none focus:border-[#84a92c] transition-colors"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* 3-COLUMN MATRIX — Synchronized scroll across IMG | RECORDS | QR     */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 grid grid-cols-12 min-h-0 overflow-hidden" style={{ borderTop: '1px solid var(--border-primary)' }}>

        {/* ─────────────────────────────────────── */}
        {/* COLUMN 1: IMG (+)  —  3/12 cols         */}
        {/* ─────────────────────────────────────── */}
        <div className="col-span-3 flex flex-col min-w-0 min-h-0 border-r" style={{ borderColor: 'var(--border-primary)' }}>
          {/* Column Header */}
          <div
            className="px-3 py-2.5 border-b flex items-center justify-between flex-shrink-0"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
          >
            <div className="flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-[#84a92c]" />
              <span className="font-extrabold text-[11px] uppercase tracking-wider font-mono" style={{ color: 'var(--text-primary)' }}>IMG</span>
            </div>
            <button
              onClick={() => bulkPhotoInputRef.current?.click()}
              className="px-2 py-1 rounded-lg bg-[#84a92c]/15 hover:bg-[#84a92c]/25 text-[#84a92c] text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Bulk upload photos — filenames matched to student ID or name"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              <span>Bulk</span>
            </button>
          </div>

          {/* Scrollable Photo Rows */}
          <div
            ref={col1Ref}
            onScroll={() => handleSyncScroll('col1')}
            className="flex-1 overflow-y-auto overflow-x-hidden p-1.5 space-y-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border-primary) transparent' }}
          >
            {folderPeople.map((person, idx) => {
              const hasPhoto = Boolean(person.photoDataUrl && person.photoDataUrl.trim());
              const isHovered = hoveredRowIdx === idx;
              return (
                <div
                  key={`photo-${person.id || idx}`}
                  className={`${ROW_HEIGHT} p-1.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                    isHovered ? 'border-[#84a92c]/60 bg-[#84a92c]/5' :
                    hasPhoto ? 'border-transparent bg-transparent hover:border-slate-700' :
                    'border-rose-900/30 bg-rose-950/5 hover:border-rose-500/50'
                  }`}
                  onMouseEnter={() => setHoveredRowIdx(idx)}
                  onMouseLeave={() => setHoveredRowIdx(null)}
                  onClick={() => {
                    setTargetPersonForUpload(person);
                    singlePhotoInputRef.current?.click();
                  }}
                  title={hasPhoto ? `Replace photo for ${person.fullName}` : `Upload photo for ${person.fullName}`}
                >
                  {/* Photo Thumbnail */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden border flex-shrink-0 flex items-center justify-center"
                    style={{ borderColor: hasPhoto ? 'var(--border-primary)' : 'var(--border-primary)', backgroundColor: hasPhoto ? 'var(--bg-elevated)' : 'var(--bg-elevated)' }}
                  >
                    {hasPhoto ? (
                      <img src={person.photoDataUrl} alt={person.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <Upload className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[7px] font-bold uppercase text-slate-500">Add</span>
                      </div>
                    )}
                  </div>

                  {/* Status Dots */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <span
                      className={`w-2 h-2 rounded-full ${hasPhoto ? 'bg-[#84a92c]' : 'bg-rose-500'}`}
                      title={hasPhoto ? 'Photo ✓' : 'No Photo'}
                    />
                    <span
                      className={`w-2 h-2 rounded-full ${person.qrCodeDataUrl ? 'bg-[#84a92c]' : 'bg-slate-600'}`}
                      title={person.qrCodeDataUrl ? 'QR ✓' : 'No QR'}
                    />
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {folderPeople.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ImageIcon className="w-8 h-8 mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>No photos yet</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Add records first</p>
              </div>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────── */}
        {/* COLUMN 2: RECORDS  —  6/12 cols         */}
        {/* ─────────────────────────────────────── */}
        <div className="col-span-6 flex flex-col min-w-0 min-h-0 border-r" style={{ borderColor: 'var(--border-primary)' }}>
          {/* Column Header */}
          <div
            className="px-3 py-2.5 border-b flex items-center justify-between flex-shrink-0"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
          >
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[11px] uppercase tracking-wider font-mono" style={{ color: 'var(--text-primary)' }}>
                {activeFolder?.name || 'Folder Records'}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                {folderPeople.length}
              </span>
            </div>

            <button
              onClick={() => setAddingRecord(true)}
              className="px-2 py-1 rounded-lg border hover:border-[#84a92c] text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
            >
              <Plus className="w-3 h-3" />
              <span>Add Record</span>
            </button>
          </div>

          {/* Scrollable Record Rows */}
          <div
            ref={col2Ref}
            onScroll={() => handleSyncScroll('col2')}
            className="flex-1 overflow-y-auto overflow-x-hidden p-1.5 space-y-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border-primary) transparent' }}
          >
            {/* Inline Add Record Form */}
            {addingRecord && (
              <div
                className={`${ROW_HEIGHT} p-2 rounded-xl border border-[#84a92c]/50 bg-[#84a92c]/5 flex items-center gap-2`}
              >
                <input
                  autoFocus
                  type="text"
                  value={newRecordName}
                  onChange={e => setNewRecordName(e.target.value)}
                  placeholder="Full Name *"
                  className="flex-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold focus:outline-none focus:border-[#84a92c]"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddInlineRecord(); if (e.key === 'Escape') setAddingRecord(false); }}
                />
                <input
                  type="text"
                  value={newRecordId}
                  onChange={e => setNewRecordId(e.target.value)}
                  placeholder="ID (auto)"
                  className="w-24 px-2 py-1.5 rounded-lg border text-[11px] font-mono focus:outline-none focus:border-[#84a92c]"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: '#9fe870' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddInlineRecord(); if (e.key === 'Escape') setAddingRecord(false); }}
                />
                <button
                  onClick={handleAddInlineRecord}
                  className="p-1.5 rounded-lg bg-[#84a92c] text-slate-950 hover:bg-[#9fe870] transition-colors cursor-pointer"
                  title="Save record"
                >
                  <Save className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { setAddingRecord(false); setNewRecordName(''); setNewRecordId(''); }}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {folderPeople.map((person, idx) => {
              const isEditing = editingPersonId === person.id;
              const isHovered = hoveredRowIdx === idx;
              const hasPhoto = Boolean(person.photoDataUrl && person.photoDataUrl.trim());
              const hasQr = Boolean(person.qrCodeDataUrl);
              const isComplete = hasPhoto && hasQr;

              return (
                <div
                  key={`record-${person.id || idx}`}
                  className={`${ROW_HEIGHT} px-3 py-2 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                    isHovered ? 'border-[#84a92c]/50 bg-[#84a92c]/5' :
                    isComplete ? 'border-transparent hover:border-slate-700/50 bg-transparent' :
                    'border-transparent hover:border-slate-700/50 bg-transparent'
                  }`}
                  onMouseEnter={() => setHoveredRowIdx(idx)}
                  onMouseLeave={() => setHoveredRowIdx(null)}
                >
                  {isEditing ? (
                    /* Inline Edit Mode */
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={editFields.fullName}
                        onChange={e => setEditFields(prev => ({ ...prev, fullName: e.target.value }))}
                        className="flex-1 px-2 py-1 rounded-lg border text-[11px] font-bold focus:outline-none focus:border-[#84a92c]"
                        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && person.id) { updatePerson(person.id, editFields); setEditingPersonId(null); }
                          if (e.key === 'Escape') setEditingPersonId(null);
                        }}
                      />
                      <input
                        type="text"
                        value={editFields.idNumber}
                        onChange={e => setEditFields(prev => ({ ...prev, idNumber: e.target.value }))}
                        className="w-28 px-2 py-1 rounded-lg border text-[11px] font-mono focus:outline-none focus:border-[#84a92c]"
                        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: '#9fe870' }}
                      />
                      <button
                        onClick={async () => {
                          if (person.id) await updatePerson(person.id, editFields);
                          setEditingPersonId(null);
                        }}
                        className="p-1 rounded-lg bg-[#84a92c] text-slate-950"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                      <button onClick={() => setEditingPersonId(null)} className="p-1 rounded-lg hover:bg-white/10" style={{ color: 'var(--text-muted)' }}>
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    /* Display Mode */
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[12px] truncate" style={{ color: 'var(--text-primary)' }}>{person.fullName}</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0"
                            style={{ backgroundColor: '#84a92c15', color: '#9fe870' }}
                          >
                            {person.idNumber}
                          </span>
                          {isComplete && (
                            <CheckCircle2 className="w-3 h-3 text-[#84a92c] flex-shrink-0" />
                          )}
                        </div>
                        <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {person.department || person.grade || 'General'} • {person.role || 'Student'} • {person.schoolName || person.location || '—'}
                        </div>
                      </div>

                      {/* Row Actions */}
                      <div className={`flex items-center gap-0.5 flex-shrink-0 transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                        <button
                          onClick={() => {
                            setEditingPersonId(person.id || null);
                            setEditFields({
                              fullName: person.fullName,
                              idNumber: person.idNumber,
                              department: person.department,
                              role: person.role,
                            });
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                          style={{ color: 'var(--text-muted)' }}
                          title="Edit record"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={async () => {
                            if (person.id && confirm(`Delete "${person.fullName}"?`)) {
                              await deletePerson(person.id);
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-500/15 text-rose-400/70 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete record"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}

            {/* Empty state */}
            {folderPeople.length === 0 && !addingRecord && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <UserPlus className="w-10 h-10 mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-xs font-bold" style={{ color: 'var(--text-secondary)' }}>No records in this folder</p>
                <p className="text-[11px] mt-1 max-w-xs" style={{ color: 'var(--text-muted)' }}>
                  Click "+ Add Record" above, switch to Single Intake, or use the Archive Digitizer to populate this folder.
                </p>
                <button
                  onClick={() => setAddingRecord(true)}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-[#84a92c] text-slate-950 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Record</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────── */}
        {/* COLUMN 3: QR / BARCODE (+)  —  3/12     */}
        {/* ─────────────────────────────────────── */}
        <div className="col-span-3 flex flex-col min-w-0 min-h-0">
          {/* Column Header */}
          <div
            className="px-3 py-2.5 border-b flex items-center justify-between flex-shrink-0"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
          >
            <div className="flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5 text-pink-400" />
              <span className="font-extrabold text-[11px] uppercase tracking-wider font-mono" style={{ color: 'var(--text-primary)' }}>QR / Barcode</span>
            </div>
            <button
              onClick={() => bulkQrInputRef.current?.click()}
              className="px-2 py-1 rounded-lg bg-pink-500/15 hover:bg-pink-500/25 text-pink-400 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
              title="Bulk upload QR code images — filenames matched to student ID or name"
            >
              <Plus className="w-3 h-3 stroke-[2.5]" />
              <span>Bulk</span>
            </button>
          </div>

          {/* Scrollable QR Rows */}
          <div
            ref={col3Ref}
            onScroll={() => handleSyncScroll('col3')}
            className="flex-1 overflow-y-auto overflow-x-hidden p-1.5 space-y-1"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border-primary) transparent' }}
          >
            {folderPeople.map((person, idx) => {
              const hasQr = Boolean(person.qrCodeDataUrl && person.qrCodeDataUrl.trim());
              const isHovered = hoveredRowIdx === idx;
              return (
                <div
                  key={`qr-${person.id || idx}`}
                  className={`${ROW_HEIGHT} p-1.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                    isHovered ? 'border-pink-500/40 bg-pink-500/5' :
                    hasQr ? 'border-transparent bg-transparent hover:border-slate-700' :
                    'border-rose-900/30 bg-rose-950/5 hover:border-rose-500/50'
                  }`}
                  onMouseEnter={() => setHoveredRowIdx(idx)}
                  onMouseLeave={() => setHoveredRowIdx(null)}
                  onClick={async () => {
                    if (!hasQr && person.id) {
                      // Auto-generate QR on 1-click if missing
                      const qrData = await generateQrDataUrl(person.idNumber || `ID-${idx + 1}`, 160);
                      await updatePerson(person.id, { qrCodeDataUrl: qrData });
                    } else {
                      setTargetPersonForUpload(person);
                      singleQrInputRef.current?.click();
                    }
                  }}
                  title={hasQr ? `Replace QR for ${person.fullName}` : `Click to auto-generate QR for ${person.fullName}`}
                >
                  {/* QR Thumbnail */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden border flex-shrink-0 flex items-center justify-center p-0.5"
                    style={{ borderColor: 'var(--border-primary)', backgroundColor: hasQr ? '#fff' : 'var(--bg-elevated)' }}
                  >
                    {hasQr ? (
                      <img src={person.qrCodeDataUrl} alt="QR" className="w-full h-full object-contain" />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-0.5 w-full h-full rounded-md" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                        <QrCode className="w-3.5 h-3.5 text-rose-400" />
                        <span className="text-[7px] font-bold uppercase text-rose-400">Make</span>
                      </div>
                    )}
                  </div>

                  {/* Status Dots */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <span
                      className={`w-2 h-2 rounded-full ${hasQr ? 'bg-[#84a92c]' : 'bg-rose-500'}`}
                      title={hasQr ? 'QR ✓' : 'No QR'}
                    />
                    <span
                      className={`w-2 h-2 rounded-full ${person.photoDataUrl ? 'bg-[#84a92c]' : 'bg-slate-600'}`}
                      title={person.photoDataUrl ? 'Photo ✓' : 'No Photo'}
                    />
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {folderPeople.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <QrCode className="w-8 h-8 mb-2" style={{ color: 'var(--text-muted)' }} />
                <p className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>No QR codes yet</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Add records first</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* BOTTOM STATUS BAR                                */}
      {/* ══════════════════════════════════════════════════ */}
      <div
        className="px-4 sm:px-5 py-2 border-t flex items-center justify-between text-[10px] font-mono flex-shrink-0"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-muted)' }}
      >
        <span>
          {totalCount} records • {photoCount} photos attached • {qrCount} QR codes bound • {fulfilledCount} fully complete
        </span>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#84a92c] inline-block" /> Ready</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Missing</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600 inline-block" /> Pending</span>
        </div>
      </div>
    </div>
  );
}
