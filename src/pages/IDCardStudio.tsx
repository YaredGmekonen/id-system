import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import SiliconLabsLogo from '../components/shared/SiliconLabsLogo';
import { usePeople, useTemplates } from '../db/hooks';
import type { Person, CardTemplate } from '../db/database';
import PaperStudioModal from '../components/studio/PaperStudioModal';
import { renderStudioCard, type StudioCardOptions } from '../engine/renderStudioCard';
import { useTheme } from '../context/ThemeContext';

export interface CardTemplateStyle {
  id: string;
  name: string;
  category: string;
  headerColor: string;
  backgroundColor: string;
  accentColor: string;
  badgeColor: string;
  fontFamily: string;
  cornerRadius: number;
}

const PRESET_TEMPLATES: CardTemplateStyle[] = [
  {
    id: 'corporate-standard',
    name: 'Standard CR80 Corporate',
    category: 'Enterprise Preset',
    headerColor: '#0b131b',
    backgroundColor: '#FFFFFF',
    accentColor: '#10b981',
    badgeColor: '#1e3a8a',
    fontFamily: 'Inter',
    cornerRadius: 12,
  },
  {
    id: 'student-academic',
    name: 'Student Registry Academic Pass',
    category: 'Education Preset',
    headerColor: '#1e3a8a',
    backgroundColor: '#FFFFFF',
    accentColor: '#84a92c',
    badgeColor: '#0f766e',
    fontFamily: 'Outfit',
    cornerRadius: 16,
  },
  {
    id: 'hightech-enclave',
    name: 'High-Tech Security Enclave',
    category: 'Security Preset',
    headerColor: '#050b11',
    backgroundColor: '#f8fafc',
    accentColor: '#06b6d4',
    badgeColor: '#0f172a',
    fontFamily: 'JetBrains Mono',
    cornerRadius: 8,
  },
  {
    id: 'healthcare-medic',
    name: 'Healthcare & Clinical Staff',
    category: 'Medical Preset',
    headerColor: '#0284c7',
    backgroundColor: '#FFFFFF',
    accentColor: '#0284c7',
    badgeColor: '#0369a1',
    fontFamily: 'Plus Jakarta Sans',
    cornerRadius: 14,
  },
  {
    id: 'executive-gold',
    name: 'Executive VIP Pass',
    category: 'Executive Preset',
    headerColor: '#27272a',
    backgroundColor: '#fafafa',
    accentColor: '#d97706',
    badgeColor: '#b45309',
    fontFamily: 'Space Grotesk',
    cornerRadius: 10,
  },
];

export default function IDCardStudio() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dbPeople = usePeople();
  const dbTemplates = useTemplates();

  // Active Person & Batch Selection
  const [selectedPersonIndex, setSelectedPersonIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [searchRoster, setSearchRoster] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');

  // Active Template (Preset ID or custom designer template ID)
  const [activeTemplateId, setActiveTemplateId] = useState('corporate-standard');
  const [activeCustomTemplate, setActiveCustomTemplate] = useState<CardTemplate | null>(null);

  // Custom Studio Tweaks
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('horizontal');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [fontFamily, setFontFamily] = useState('Inter');
  const [headerColor, setHeaderColor] = useState('#0b131b');
  const [accentColor, setAccentColor] = useState('#10b981');
  const [badgeColor, setBadgeColor] = useState('#1e3a8a');
  const [cornerRadius, setCornerRadius] = useState(12);

  // Features
  const [showBorders, setShowBorders] = useState(true);
  const [showQrCode, setShowQrCode] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showPhoto, setShowPhoto] = useState(true);
  const [photoZoom, setPhotoZoom] = useState(100);

  // Responsive sidebar toggles
  const [rosterOpen, setRosterOpen] = useState(true);
  const [templatePanelOpen, setTemplatePanelOpen] = useState(true);
  const [paperModalOpen, setPaperModalOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'roster' | 'preview' | 'templates'>('preview');

  // Live canvas render for custom templates
  const [customPreviewUrl, setCustomPreviewUrl] = useState<string>('');

  // Extract unique folders from people database
  const folders = useMemo(() => {
    const map = new Map<string, number>();
    dbPeople.forEach(p => {
      const folder = p.folderName || p.sourceFileName || (p.category === 'Students' ? 'Student Roster' : 'Corporate Enclave');
      map.set(folder, (map.get(folder) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [dbPeople]);

  // Filtered Roster by Search AND Folder
  const filteredRoster = useMemo(() => {
    return dbPeople.filter(p => {
      const folder = p.folderName || p.sourceFileName || (p.category === 'Students' ? 'Student Roster' : 'Corporate Enclave');
      const matchFolder = selectedFolder === 'all' || folder === selectedFolder;

      const matchSearch =
        p.fullName.toLowerCase().includes(searchRoster.toLowerCase()) ||
        p.idNumber.toLowerCase().includes(searchRoster.toLowerCase()) ||
        p.department.toLowerCase().includes(searchRoster.toLowerCase());

      return matchFolder && matchSearch;
    });
  }, [dbPeople, searchRoster, selectedFolder]);

  // Handle URL param ?personId=X for direct inspection
  useEffect(() => {
    const paramId = searchParams.get('personId');
    if (paramId && dbPeople.length > 0) {
      const pId = Number(paramId);
      const targetIdx = filteredRoster.findIndex(p => p.id === pId);
      if (targetIdx !== -1) {
        setSelectedPersonIndex(targetIdx);
      } else {
        // Person might be in a different folder - switch to 'all'
        const allIdx = dbPeople.findIndex(p => p.id === pId);
        if (allIdx !== -1) {
          setSelectedFolder('all');
          setSelectedPersonIndex(allIdx);
        }
      }
    }
  }, [searchParams, dbPeople, filteredRoster]);

  const activePerson: Person | null = filteredRoster[selectedPersonIndex] || dbPeople[0] || null;

  // Custom template preview rendering is done after cardOptions is defined below

  // Toggle selection for a single person
  const toggleSelectPerson = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all in current filtered folder
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRoster.length && filteredRoster.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRoster.map(p => p.id as number)));
    }
  };

  // Apply Built-in Preset
  const handleApplyPreset = (tmpl: CardTemplateStyle) => {
    setActiveTemplateId(tmpl.id);
    setActiveCustomTemplate(null);
    setHeaderColor(tmpl.headerColor);
    setBackgroundColor(tmpl.backgroundColor);
    setAccentColor(tmpl.accentColor);
    setBadgeColor(tmpl.badgeColor);
    setFontFamily(tmpl.fontFamily);
    setCornerRadius(tmpl.cornerRadius);
  };

  // Apply Custom Designer Template (Created in Canvas Designer)
  const handleApplyCustomTemplate = (tmpl: CardTemplate) => {
    setActiveTemplateId(`custom-${tmpl.id}`);
    setActiveCustomTemplate(tmpl);
    if (tmpl.orientation) setOrientation(tmpl.orientation);
    if (tmpl.backgroundColor) setBackgroundColor(tmpl.backgroundColor);
  };

  // Replace photo for active person
  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePerson) return;
    const reader = new FileReader();
    reader.onload = () => {
      activePerson.photoDataUrl = reader.result as string;
      setSelectedPersonIndex(prev => prev);
    };
    reader.readAsDataURL(file);
  };

  // People list to send to Paper Studio
  const peopleForPrint = useMemo(() => {
    if (selectedIds.size === 0) return filteredRoster.length > 0 ? filteredRoster : dbPeople;
    return dbPeople.filter(p => p.id && selectedIds.has(p.id));
  }, [dbPeople, filteredRoster, selectedIds]);

  const isVertical = orientation === 'vertical';

  const cardOptions: StudioCardOptions = {
    orientation,
    backgroundColor,
    fontFamily,
    headerColor,
    accentColor,
    badgeColor,
    cornerRadius,
    showBorders,
    showPhoto,
    showQrCode,
    showBarcode,
    customTemplate: activeCustomTemplate || undefined,
  };

  // Render custom template preview whenever activeCustomTemplate, activePerson, or activeSide changes
  useEffect(() => {
    if (!activeCustomTemplate || !activePerson) {
      setCustomPreviewUrl('');
      return;
    }
    let cancelled = false;
    const render = async () => {
      try {
        const url = await renderStudioCard(activePerson, activeSide, cardOptions);
        if (!cancelled) setCustomPreviewUrl(url);
      } catch {
        if (!cancelled) setCustomPreviewUrl('');
      }
    };
    render();
    return () => { cancelled = true; };
  }, [activeCustomTemplate, activePerson, activeSide, orientation, backgroundColor, fontFamily, headerColor, accentColor, badgeColor, showPhoto, showQrCode, showBarcode]);

  return (
    <div
      className="flex h-screen font-sans antialiased overflow-hidden transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-root)', color: 'var(--text-primary)' }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* ================= TOP HEADER ================= */}
        <header
          className="h-16 px-6 border-b flex items-center justify-between z-20 flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          {/* Breadcrumb & Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl border flex items-center justify-center text-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm-3.375 3.375h.008v.008H7.125v-.008z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                ID Card Studio
              </h1>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Folder batches, Canvas templates, live credential rendering & A4 print imposition.
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Side Flip */}
            <button
              onClick={() => setActiveSide(activeSide === 'front' ? 'back' : 'front')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            >
              <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>{activeSide === 'front' ? 'Show Back' : 'Show Front'}</span>
            </button>

            {/* Responsive Panel Toggles */}
            <button
              onClick={() => setRosterOpen(o => !o)}
              className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${rosterOpen ? 'text-[#84a92c]' : 'text-slate-400'}`}
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              title="Toggle Personnel Roster"
            >
              📁 Roster
            </button>

            <button
              onClick={() => setTemplatePanelOpen(o => !o)}
              className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${templatePanelOpen ? 'text-[#84a92c]' : 'text-slate-400'}`}
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              title="Toggle Templates Panel"
            >
              🎨 Templates
            </button>

            {/* Launch Dedicated Full-Page Paper Artboard Studio */}
            <button
              onClick={() => navigate('/print')}
              className="btn-primary py-2 px-4 text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              <span>Print A4 Artboard ({selectedIds.size > 0 ? selectedIds.size : filteredRoster.length})</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Tabs (visible only on mobile & tablets < lg) */}
        <div
          className="flex lg:hidden items-center justify-around border-b px-2 py-1.5 flex-shrink-0 gap-1.5 z-20 shadow-xs"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <button
            onClick={() => setMobileActiveTab('roster')}
            className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
              mobileActiveTab === 'roster' ? 'bg-[#84a92c] text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            📁 Roster ({selectedIds.size > 0 ? selectedIds.size : filteredRoster.length})
          </button>
          <button
            onClick={() => setMobileActiveTab('preview')}
            className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
              mobileActiveTab === 'preview' ? 'bg-[#84a92c] text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            🪪 Live Card
          </button>
          <button
            onClick={() => setMobileActiveTab('templates')}
            className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
              mobileActiveTab === 'templates' ? 'bg-[#84a92c] text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            🎨 Templates & Styles
          </button>
        </div>

        {/* ================= 3-COLUMN WORKSPACE ================= */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* COLUMN 1: FOLDER BATCHES & PERSONNEL ROSTER */}
          {(rosterOpen || mobileActiveTab === 'roster') && (
            <aside
              className={`w-full lg:w-80 border-r flex flex-col p-3.5 space-y-3 flex-shrink-0 overflow-y-auto z-10 shadow-lg lg:shadow-none ${
                mobileActiveTab === 'roster' ? 'flex' : 'hidden lg:flex'
              }`}
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
            {/* Folder / Excel Source Classification Selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase font-mono tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <svg className="w-3.5 h-3.5 text-[#84a92c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                <span>Batch / Source Folder</span>
              </label>

              <select
                value={selectedFolder}
                onChange={e => {
                  setSelectedFolder(e.target.value);
                  setSelectedPersonIndex(0);
                  setSelectedIds(new Set());
                }}
                className="w-full text-xs py-1.5 px-2.5 rounded-xl border font-bold focus:outline-none focus:border-[#84a92c] cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="all">📁 All Batches & Records ({dbPeople.length})</option>
                {folders.map(f => (
                  <option key={f.name} value={f.name}>
                    📁 {f.name} ({f.count} records)
                  </option>
                ))}
              </select>
            </div>

            {/* Header with Select All */}
            <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <div>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {selectedIds.size > 0 ? `${selectedIds.size} of ${filteredRoster.length} selected` : `${filteredRoster.length} records in view`}
                </p>
              </div>

              <button
                onClick={toggleSelectAll}
                className="text-[10px] font-bold text-[#84a92c] hover:underline cursor-pointer"
              >
                {selectedIds.size === filteredRoster.length && filteredRoster.length > 0 ? 'Deselect All' : 'Select All in Folder'}
              </button>
            </div>

            {/* Search Box */}
            <div className="relative">
              <svg className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={searchRoster}
                onChange={e => setSearchRoster(e.target.value)}
                placeholder="Search students/staff in folder..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c]"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Roster List */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {filteredRoster.map((p, idx) => {
                const isActive = activePerson.id === p.id;
                const isChecked = p.id ? selectedIds.has(p.id) : false;

                return (
                  <div
                    key={p.id || idx}
                    onClick={() => setSelectedPersonIndex(idx)}
                    className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all border ${
                      isActive
                        ? 'border-[#84a92c] font-bold shadow-xs'
                        : 'border-transparent hover:opacity-90'
                    }`}
                    style={{
                      backgroundColor: isActive ? 'rgba(132, 169, 44, 0.12)' : 'var(--bg-elevated)',
                    }}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={e => {
                        e.stopPropagation();
                        if (p.id) toggleSelectPerson(p.id);
                      }}
                      className="w-3.5 h-3.5 rounded accent-[#84a92c] cursor-pointer flex-shrink-0"
                    />

                    {/* Avatar / Photo */}
                    <div className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200 border flex items-center justify-center font-bold text-[10px]"
                      style={{ borderColor: 'var(--border-primary)' }}
                    >
                      {p.photoDataUrl ? (
                        <img src={p.photoDataUrl} alt={p.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-slate-700">
                          {p.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {p.fullName}
                      </p>
                      <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                        {p.idNumber} • {p.department}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
          )}

          {/* COLUMN 2: CENTER LIVE CANVAS MOCKUP */}
          <main
            className={`flex-1 flex-col items-center justify-center overflow-auto p-4 sm:p-6 relative select-none ${
              mobileActiveTab === 'preview' ? 'flex' : 'hidden lg:flex'
            }`}
            style={{ backgroundColor: 'var(--bg-root)' }}
          >
            {/* Top Toolbar Info */}
            <div className="absolute top-3 left-6 right-6 flex items-center justify-between text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
              <span>
                {activePerson ? (
                  <>Preview: <strong className="text-[#84a92c]">{activePerson.fullName}</strong> ({activePerson.idNumber})</>
                ) : 'No person selected'}
                {activeCustomTemplate && <span className="ml-2 px-1.5 py-0.2 bg-[#84a92c]/20 text-[#84a92c] rounded">Canvas Template: {activeCustomTemplate.name}</span>}
              </span>
              <span>Orientation: {orientation.toUpperCase()} • Size: 85.6 × 54 mm</span>
            </div>

            {/* Central Card Preview */}
            {!activePerson ? (
              <div className="text-center space-y-3 p-8" style={{ color: 'var(--text-muted)' }}>
                <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-500/10 flex items-center justify-center">
                  <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                  </svg>
                </div>
                <p className="text-sm font-bold">No Records in Database</p>
                <p className="text-xs">Import personnel via the Data Collector or Archive Digitizer first.</p>
              </div>
            ) : activeCustomTemplate && customPreviewUrl ? (
              /* ===== CUSTOM CANVAS TEMPLATE LIVE RENDER ===== */
              <div className="relative">
                <img
                  src={customPreviewUrl}
                  alt={`${activeCustomTemplate.name} - ${activeSide}`}
                  className="shadow-2xl border border-slate-300 transition-all duration-300"
                  style={{
                    width: isVertical ? '340px' : '520px',
                    height: isVertical ? '520px' : '340px',
                    borderRadius: `${cornerRadius}px`,
                    objectFit: 'contain',
                  }}
                />
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-[#84a92c] text-white text-[9px] font-bold rounded-lg shadow-sm">
                  Canvas Template: {activeCustomTemplate.name}
                </div>
              </div>
            ) : activePerson ? (
              /* ===== BUILT-IN PRESET HTML CARD ===== */
              <div
                className="relative transition-all duration-300 shadow-2xl overflow-hidden border border-slate-300 flex flex-col justify-between"
                style={{
                  width: isVertical ? '340px' : '520px',
                  height: isVertical ? '520px' : '340px',
                  backgroundColor: backgroundColor,
                  borderRadius: `${cornerRadius}px`,
                  fontFamily: fontFamily,
                }}
              >
                {activeSide === 'front' ? (
                  <div className="h-full w-full flex flex-col justify-between relative bg-white overflow-hidden text-slate-900" style={{ fontFamily }}>
                    <div className="px-5 py-3 flex items-center justify-between text-white border-b border-slate-800 transition-colors" style={{ backgroundColor: headerColor }}>
                      <SiliconLabsLogo size="sm" subText="CREDENTIAL PLATFORM" />
                      <div className="px-2 py-0.5 bg-white/10 rounded text-[9px] font-mono text-[#9fe870]">CR80 300DPI</div>
                    </div>
                    <div className="flex-1 p-5 flex items-center gap-5">
                      {showPhoto && (
                        <div className="w-28 h-32 rounded-xl bg-slate-200 overflow-hidden flex-shrink-0 border-2 border-emerald-500 shadow-inner flex items-center justify-center relative group">
                          {activePerson.photoDataUrl ? (
                            <img src={activePerson.photoDataUrl} alt={activePerson.fullName} className="w-full h-full object-cover" style={{ transform: `scale(${photoZoom / 100})` }} />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center text-[#9fe870] font-black text-2xl font-mono">
                              {activePerson.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[9px] font-bold cursor-pointer transition-opacity">
                            <span>Upload Photo</span>
                            <input type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" />
                          </label>
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight truncate">{activePerson.fullName}</h2>
                        <p className="text-xs font-bold tracking-wide" style={{ color: accentColor }}>{activePerson.role || 'Staff'}</p>
                        <div className="pt-2 text-xs space-y-1 text-slate-600 font-medium">
                          <p><span className="font-bold text-slate-800">ID:</span> <span className="font-mono text-slate-900 font-bold">{activePerson.idNumber}</span></p>
                          <p><span className="font-bold text-slate-800">Dept:</span> {activePerson.department || 'General'}</p>
                          {activePerson.phone && <p><span className="font-bold text-slate-800">Phone:</span> {activePerson.phone}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="px-5 py-2.5 flex items-center justify-between text-white transition-colors" style={{ backgroundColor: badgeColor }}>
                      <span className="font-extrabold tracking-widest text-xs uppercase font-mono">OFFICIAL CREDENTIAL</span>
                      {showBarcode && (
                        <div className="bg-white px-2 py-0.5 rounded flex items-center gap-0.5 h-6">
                          {[2,1,3,1,2,4,1,3,2,1,4,1,2,3,1,2,4,1,3,2].map((w,i) => (
                            <span key={i} className="bg-slate-900 h-full inline-block" style={{ width: `${w}px` }} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full w-full flex flex-col justify-between p-5 bg-white text-slate-900" style={{ fontFamily }}>
                    <div className="p-3 rounded-xl text-white text-center transition-colors" style={{ backgroundColor: headerColor }}>
                      <p className="text-xs font-black uppercase tracking-wider">SILICONLABS TECH PLC</p>
                      <p className="text-[9px] font-mono text-[#9fe870]">AUTHORIZED CREDENTIAL CARD</p>
                    </div>
                    <div className="text-[10px] text-slate-600 space-y-1 py-3">
                      <p className="font-bold text-slate-800">Security & Operational Notice:</p>
                      <p>1. This credential remains the property of SiliconLabs Tech PLC.</p>
                      <p>2. Must be presented upon request at all hardware and enclave facilities.</p>
                      <p>3. If found, please return to Addis Ababa Headquarters, Around Ayat.</p>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[9px] font-mono text-slate-500">
                      <span>SERIAL: SL-ETH-2026-{activePerson.id || 101}</span>
                      <span className="font-bold" style={{ color: accentColor }}>✓ ENCRYPTED & SIGNED</span>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </main>

          {/* COLUMN 3: TEMPLATES & DESIGNER SYNC */}
          {(templatePanelOpen || mobileActiveTab === 'templates') && (
            <aside
              className={`w-full lg:w-80 border-l p-4 space-y-4 overflow-y-auto flex-shrink-0 text-xs z-10 shadow-lg lg:shadow-none ${
                mobileActiveTab === 'templates' ? 'block' : 'hidden lg:block'
              }`}
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
            {/* 1. Custom Designer Templates */}
            {dbTemplates.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase font-mono tracking-wider text-[#84a92c]">
                    Canvas Designer Templates
                  </label>
                  <span className="text-[10px] font-mono bg-[#84a92c]/10 text-[#84a92c] px-1.5 py-0.2 rounded font-bold">
                    {dbTemplates.length} Custom
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-1.5">
                  {dbTemplates.map(tmpl => {
                    const isSelected = activeTemplateId === `custom-${tmpl.id}`;
                    return (
                      <button
                        key={tmpl.id}
                        onClick={() => handleApplyCustomTemplate(tmpl)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#84a92c] font-bold shadow-xs'
                            : 'hover:opacity-80'
                        }`}
                        style={{
                          backgroundColor: isSelected ? 'rgba(132, 169, 44, 0.15)' : 'var(--bg-elevated)',
                          borderColor: isSelected ? '#84a92c' : 'var(--border-primary)',
                        }}
                      >
                        <div>
                          <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{tmpl.name}</p>
                          <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                            {tmpl.widthPx && tmpl.heightPx ? `${tmpl.widthPx}×${tmpl.heightPx}px · ` : ''}{tmpl.frontElements.length} front · {tmpl.backElements.length} back layers
                          </p>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#84a92c] text-slate-900 font-bold">
                          APPLY
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 2. Built-in Preset Styles */}
            <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <label className="text-xs font-bold uppercase font-mono tracking-wider block" style={{ color: 'var(--text-primary)' }}>
                Built-in Design Presets
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {PRESET_TEMPLATES.map(tmpl => {
                  const isSelected = activeTemplateId === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      onClick={() => handleApplyPreset(tmpl)}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#84a92c] font-bold shadow-xs'
                          : 'hover:opacity-80'
                      }`}
                      style={{
                        backgroundColor: isSelected ? 'rgba(132, 169, 44, 0.12)' : 'var(--bg-elevated)',
                        borderColor: isSelected ? '#84a92c' : 'var(--border-primary)',
                      }}
                    >
                      <div>
                        <p className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>{tmpl.name}</p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{tmpl.category} • {tmpl.fontFamily}</p>
                      </div>
                      <div className="flex gap-1">
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: tmpl.headerColor }} />
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: tmpl.accentColor }} />
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: tmpl.badgeColor }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Orientation & Typography */}
            <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <label className="text-xs font-bold uppercase font-mono tracking-wider block" style={{ color: 'var(--text-primary)' }}>
                Orientation & Typography
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOrientation('horizontal')}
                  className={`py-2 rounded-xl border font-bold text-xs cursor-pointer ${
                    orientation === 'horizontal' ? 'bg-[#198754] text-white' : 'hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: orientation === 'horizontal' ? '#198754' : 'var(--bg-elevated)',
                    borderColor: orientation === 'horizontal' ? '#198754' : 'var(--border-primary)',
                    color: orientation === 'horizontal' ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  Horizontal (CR80)
                </button>
                <button
                  onClick={() => setOrientation('vertical')}
                  className={`py-2 rounded-xl border font-bold text-xs cursor-pointer ${
                    orientation === 'vertical' ? 'bg-[#198754] text-white' : 'hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: orientation === 'vertical' ? '#198754' : 'var(--bg-elevated)',
                    borderColor: orientation === 'vertical' ? '#198754' : 'var(--border-primary)',
                    color: orientation === 'vertical' ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  Vertical Badge
                </button>
              </div>

              {/* Font Family */}
              <div>
                <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Font Style</label>
                <select
                  value={fontFamily}
                  onChange={e => setFontFamily(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c] cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="Inter">Inter (Standard Modern)</option>
                  <option value="Outfit">Outfit (Clean Geometric)</option>
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans (Corporate)</option>
                  <option value="JetBrains Mono">JetBrains Mono (Technical Mono)</option>
                  <option value="Space Grotesk">Space Grotesk (High-Tech)</option>
                </select>
              </div>
            </div>

            {/* 4. Photo & Features */}
            <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <label className="text-xs font-bold uppercase font-mono tracking-wider block" style={{ color: 'var(--text-primary)' }}>
                Photo Scale & Toggles
              </label>

              <div>
                <div className="flex justify-between text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                  <span>Photo Fit / Scale</span>
                  <span className="font-mono">{photoZoom}%</span>
                </div>
                <input
                  type="range"
                  min={70}
                  max={150}
                  value={photoZoom}
                  onChange={e => setPhotoZoom(Number(e.target.value))}
                  className="w-full accent-[#84a92c] cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-medium">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPhoto}
                    onChange={e => setShowPhoto(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-[#84a92c]"
                  />
                  <span>Photo Box</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showQrCode}
                    onChange={e => setShowQrCode(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-[#84a92c]"
                  />
                  <span>QR Code</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBarcode}
                    onChange={e => setShowBarcode(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-[#84a92c]"
                  />
                  <span>Barcode</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBorders}
                    onChange={e => setShowBorders(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-[#84a92c]"
                  />
                  <span>Borders</span>
                </label>
              </div>
            </div>
          </aside>
          )}
        </div>
      </div>

      {/* Canva/Photoshop-Style Paper Artboard & Imposition Modal */}
      <PaperStudioModal
        isOpen={paperModalOpen}
        onClose={() => setPaperModalOpen(false)}
        people={peopleForPrint}
        activePerson={activePerson}
        cardOptions={cardOptions}
      />
    </div>
  );
}
