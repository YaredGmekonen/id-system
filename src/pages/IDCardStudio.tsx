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
    name: 'Standard (CR80) Corporate',
    category: 'Professional • Clean • Balanced',
    headerColor: '#0b131b',
    backgroundColor: '#FFFFFF',
    accentColor: '#10b981',
    badgeColor: '#1e3a8a',
    fontFamily: 'Inter',
    cornerRadius: 12,
  },
  {
    id: 'student-academic',
    name: 'Student / Registry Academic Pass',
    category: 'Academic • Modern • Student',
    headerColor: '#1e3a8a',
    backgroundColor: '#FFFFFF',
    accentColor: '#84a92c',
    badgeColor: '#0f766e',
    fontFamily: 'Outfit',
    cornerRadius: 16,
  },
  {
    id: 'hightech-enclave',
    name: 'High-Tech Security Employee',
    category: 'Secure • Tech • Dark Theme',
    headerColor: '#050b11',
    backgroundColor: '#f8fafc',
    accentColor: '#06b6d4',
    badgeColor: '#0f172a',
    fontFamily: 'JetBrains Mono',
    cornerRadius: 8,
  },
  {
    id: 'healthcare-medic',
    name: 'Healthcare / Clinical Staff',
    category: 'Medical • Clean • High-Contrast',
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
    category: 'Premium • Bold • Executive',
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
  const [photoZoom, setPhotoZoom] = useState(78);

  // Accordion open/close states (Matches reference Image 2)
  const [canvasAccordionOpen, setCanvasAccordionOpen] = useState(true);
  const [presetsAccordionOpen, setPresetsAccordionOpen] = useState(true);
  const [typographyAccordionOpen, setTypographyAccordionOpen] = useState(true);
  const [togglesAccordionOpen, setTogglesAccordionOpen] = useState(true);

  // Responsive sidebar & mobile tab states
  const [rosterOpen, setRosterOpen] = useState(true);
  const [templatePanelOpen, setTemplatePanelOpen] = useState(true);
  const [paperModalOpen, setPaperModalOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'roster' | 'preview' | 'presets' | 'settings'>('preview');

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
        const allIdx = dbPeople.findIndex(p => p.id === pId);
        if (allIdx !== -1) {
          setSelectedFolder('all');
          setSelectedPersonIndex(allIdx);
        }
      }
    }
  }, [searchParams, dbPeople, filteredRoster]);

  const activePerson: Person | null = filteredRoster[selectedPersonIndex] || dbPeople[0] || null;

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

  // People list to send to Paper Studio
  const peopleForPrint = useMemo(() => {
    if (selectedIds.size === 0) return filteredRoster.length > 0 ? filteredRoster : dbPeople;
    return dbPeople.filter(p => p.id && selectedIds.has(p.id));
  }, [dbPeople, filteredRoster, selectedIds]);

  return (
    <div
      className="flex h-screen font-sans antialiased overflow-hidden transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-root)', color: 'var(--text-primary)' }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        
        {/* ================= TOP COMMAND HEADER ================= */}
        <header
          className="h-14 md:h-16 px-4 md:px-6 border-b flex items-center justify-between z-20 flex-shrink-0 gap-2"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          {/* Breadcrumb & Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="p-1.5 md:p-2 rounded-xl border flex items-center justify-center text-[#84a92c] flex-shrink-0"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm-3.375 3.375h.008v.008H7.125v-.008z" />
              </svg>
            </div>
            <div className="truncate">
              <h1 className="text-xs md:text-sm font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
                ID Card Studio
              </h1>
              <p className="text-[10px] md:text-[11px] truncate hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                Design, preview, and print professional ID cards
              </p>
            </div>
          </div>

          {/* Action Bar (Flip, Poster, Templates, Print) */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            {/* Side Flip Button */}
            <button
              onClick={() => setActiveSide(activeSide === 'front' ? 'back' : 'front')}
              className="flex items-center gap-1 px-2.5 md:px-3 py-1.5 text-[11px] md:text-xs font-bold rounded-xl border transition-all cursor-pointer hover:border-[#84a92c]"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
              title="Flip Card Face"
            >
              <svg className="w-3.5 h-3.5 text-[#84a92c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>{activeSide === 'front' ? 'Show Back' : 'Show Front'}</span>
            </button>

            {/* Poster / Print Studio Quick Launch */}
            <button
              onClick={() => navigate('/print')}
              className="hidden sm:flex items-center gap-1 px-2.5 md:px-3 py-1.5 text-[11px] md:text-xs font-bold rounded-xl border transition-all cursor-pointer hover:border-[#84a92c]"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
              title="Open Paper Print Studio"
            >
              <span>📄 Poster</span>
            </button>

            {/* Desktop Templates Toggle */}
            <button
              onClick={() => setTemplatePanelOpen(o => !o)}
              className={`hidden lg:flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-xl border cursor-pointer transition-colors ${
                templatePanelOpen ? 'text-[#84a92c] border-[#84a92c]/60' : 'text-slate-400'
              }`}
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: templatePanelOpen ? undefined : 'var(--border-primary)' }}
            >
              <span>✨ Templates</span>
            </button>

            {/* Print A4 Multi-Card Action Button */}
            <button
              onClick={() => navigate('/print')}
              className="btn-primary py-1.5 md:py-2 px-3 md:px-4 text-[11px] md:text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer flex-shrink-0"
            >
              <svg className="w-3.5 md:w-4 h-3.5 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
              </svg>
              <span className="hidden sm:inline">Print A4 Multi-card</span>
              <span>({selectedIds.size > 0 ? selectedIds.size : filteredRoster.length})</span>
            </button>
          </div>
        </header>

        {/* ================= WORKSPACE (RESPONSIVE 3-COLUMN / TABLET / MOBILE) ================= */}
        <div className="flex-1 flex overflow-hidden pb-16 md:pb-0">

          {/* ================= COLUMN 1: BATCH / SOURCE / ROSTER ================= */}
          <aside
            className={`w-full lg:w-80 border-r flex flex-col p-3.5 space-y-3 flex-shrink-0 overflow-y-auto z-10 ${
              mobileActiveTab === 'roster' ? 'flex' : 'hidden lg:flex'
            }`}
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
          >
            {/* Folder / Batch classification selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase font-mono tracking-wider flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
                <span>BATCH / SOURCE / FOLDER</span>
                <span className="text-[#84a92c] font-bold">{filteredRoster.length} Total</span>
              </label>

              <select
                value={selectedFolder}
                onChange={e => {
                  setSelectedFolder(e.target.value);
                  setSelectedPersonIndex(0);
                  setSelectedIds(new Set());
                }}
                className="w-full text-xs py-2 px-3 rounded-xl border font-bold focus:outline-none focus:border-[#84a92c] cursor-pointer truncate"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="all">📁 All Business & Projects ({dbPeople.length})</option>
                {folders.map(f => (
                  <option key={f.name} value={f.name}>
                    📁 {f.name} ({f.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input & Select All in Folder */}
            <div className="space-y-1.5">
              <div className="relative">
                <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  value={searchRoster}
                  onChange={e => setSearchRoster(e.target.value)}
                  placeholder="Search by name, ID, department..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c] truncate"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] px-1">
                <span className="text-slate-500 font-mono">
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : `${filteredRoster.length} records`}
                </span>
                <button
                  onClick={toggleSelectAll}
                  className="font-bold text-[#84a92c] hover:underline cursor-pointer"
                >
                  {selectedIds.size === filteredRoster.length && filteredRoster.length > 0 ? 'Deselect All' : 'Select All in Folder'}
                </button>
              </div>
            </div>

            {/* Personnel List (Clean card rows with avatars and truncation) */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredRoster.map((p, idx) => {
                const isActive = activePerson?.id === p.id;
                const isChecked = p.id ? selectedIds.has(p.id) : false;

                return (
                  <div
                    key={p.id || idx}
                    onClick={() => {
                      setSelectedPersonIndex(idx);
                      // If on mobile roster tab, transition to preview
                      if (window.innerWidth < 1024) {
                        setMobileActiveTab('preview');
                      }
                    }}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all border ${
                      isActive
                        ? 'border-[#84a92c] shadow-sm'
                        : 'border-transparent hover:border-slate-700'
                    }`}
                    style={{
                      backgroundColor: isActive ? 'rgba(132, 169, 44, 0.12)' : 'var(--bg-elevated)',
                    }}
                  >
                    {/* Multi-Select Checkbox */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={e => {
                        e.stopPropagation();
                        if (p.id) toggleSelectPerson(p.id);
                      }}
                      className="w-4 h-4 rounded accent-[#84a92c] cursor-pointer flex-shrink-0"
                    />

                    {/* Personnel Avatar */}
                    <div
                      className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-slate-900 border flex items-center justify-center font-bold text-xs"
                      style={{ borderColor: 'var(--border-primary)', color: '#84a92c' }}
                    >
                      {p.photoDataUrl ? (
                        <img src={p.photoDataUrl} alt={p.fullName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{p.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</span>
                      )}
                    </div>

                    {/* Details with strict truncation */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-xs font-bold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {p.fullName}
                      </p>
                      <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                        ID: {p.idNumber} • {p.role || p.department || 'Staff'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* ================= COLUMN 2: CENTER CARD PREVIEW ================= */}
          <main
            className={`flex-1 flex-col items-center justify-between lg:justify-center overflow-auto p-4 sm:p-6 relative select-none ${
              mobileActiveTab === 'preview' ? 'flex' : 'hidden lg:flex'
            }`}
            style={{ backgroundColor: 'var(--bg-root)' }}
          >
            {/* Header info (Preview name, size, orientation) */}
            <div className="w-full max-w-2xl flex items-center justify-between text-[11px] font-mono mb-4 px-2 flex-wrap gap-1" style={{ color: 'var(--text-muted)' }}>
              <div className="truncate min-w-0">
                <span>Preview: </span>
                <strong className="text-[#84a92c] truncate">{activePerson?.fullName || 'No Record'}</strong>
                {activePerson?.idNumber && <span className="text-slate-500"> (ID: {activePerson.idNumber})</span>}
              </div>
              <span className="flex-shrink-0 text-slate-400">
                Orientation: {orientation === 'horizontal' ? 'Horizontal (CR80)' : 'Vertical'} • Size: 85.6 × 54 mm
              </span>
            </div>

            {/* Central Rendered Card Container with smooth scaling */}
            <div className="flex-1 flex items-center justify-center w-full max-w-full my-auto py-2">
              {!activePerson ? (
                <div className="text-center space-y-3 p-8" style={{ color: 'var(--text-muted)' }}>
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-500/10 flex items-center justify-center">
                    <svg className="w-8 h-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold">No Personnel Selected</p>
                  <p className="text-xs">Select a record from the roster or import via Data Collector.</p>
                </div>
              ) : activeCustomTemplate && customPreviewUrl ? (
                /* Custom Canvas Template Render */
                <div className="relative group max-w-full">
                  <img
                    src={customPreviewUrl}
                    alt={`${activeCustomTemplate.name} - ${activeSide}`}
                    className="shadow-2xl border border-slate-700 transition-all duration-300 max-w-full h-auto object-contain"
                    style={{
                      width: isVertical ? '320px' : '480px',
                      borderRadius: `${cornerRadius}px`,
                    }}
                  />
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-[#84a92c] text-slate-950 text-[9px] font-bold rounded-lg shadow-md">
                    Canvas Template: {activeCustomTemplate.name}
                  </div>
                </div>
              ) : (
                /* Standard Preset Render Card (Matches reference Image 2) */
                <div
                  className="relative transition-all duration-300 shadow-2xl overflow-hidden border border-slate-700 flex flex-col justify-between max-w-full"
                  style={{
                    width: isVertical ? '320px' : '460px',
                    height: isVertical ? '480px' : '300px',
                    backgroundColor: backgroundColor,
                    borderRadius: `${cornerRadius}px`,
                    fontFamily: fontFamily,
                  }}
                >
                  {activeSide === 'front' ? (
                    <div className="h-full w-full flex flex-col justify-between relative bg-white overflow-hidden text-slate-900" style={{ fontFamily }}>
                      {/* Card Header */}
                      <div className="px-4 py-2.5 flex items-center justify-between text-white border-b border-slate-800" style={{ backgroundColor: headerColor }}>
                        <SiliconLabsLogo size="sm" subText="ENTERPRISE PLATFORM" />
                        <div className="px-2 py-0.5 bg-white/10 rounded text-[9px] font-mono text-[#9fe870]">2025 - 2026</div>
                      </div>

                      {/* Card Body */}
                      <div className="flex-1 p-4 flex items-center gap-4">
                        {showPhoto && (
                          <div className="w-24 h-28 rounded-xl bg-slate-900 overflow-hidden flex-shrink-0 border-2 border-emerald-500 shadow-inner flex items-center justify-center relative group">
                            {activePerson.photoDataUrl ? (
                              <img src={activePerson.photoDataUrl} alt={activePerson.fullName} className="w-full h-full object-cover" style={{ transform: `scale(${photoZoom / 100})` }} />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-slate-900 to-black flex items-center justify-center text-[#9fe870] font-black text-2xl font-mono">
                                {activePerson.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <label className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[9px] font-bold cursor-pointer transition-opacity">
                              <span>Replace</span>
                              <input type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" />
                            </label>
                          </div>
                        )}

                        <div className="flex-1 min-w-0 space-y-1">
                          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">{activePerson.fullName}</h2>
                          <p className="text-xs font-bold tracking-wide truncate" style={{ color: accentColor }}>{activePerson.role || 'Principal Systems Lead'}</p>
                          <div className="pt-1.5 text-[11px] space-y-0.5 text-slate-600 font-medium font-sans">
                            <p className="truncate"><span className="font-bold text-slate-800">ID:</span> <span className="font-mono text-slate-900 font-bold">{activePerson.idNumber}</span></p>
                            <p className="truncate"><span className="font-bold text-slate-800">Dept:</span> {activePerson.department || 'Software Engineering'}</p>
                            {activePerson.phone && <p className="truncate"><span className="font-bold text-slate-800">Phone:</span> {activePerson.phone}</p>}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Bar */}
                      <div className="px-4 py-2 flex items-center justify-between text-white" style={{ backgroundColor: badgeColor }}>
                        <span className="font-black tracking-widest text-[10px] uppercase font-mono">OFFICIAL CREDENTIAL</span>
                        {showBarcode && (
                          <div className="bg-white px-1.5 py-0.5 rounded flex items-center gap-0.5 h-5">
                            {[2,1,3,1,2,4,1,3,2,1,4,1,2,3,1,2,4,1,3,2].map((w,i) => (
                              <span key={i} className="bg-slate-900 h-full inline-block" style={{ width: `${w}px` }} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Back Face */
                    <div className="h-full w-full flex flex-col justify-between p-4 bg-white text-slate-900" style={{ fontFamily }}>
                      <div className="p-2.5 rounded-xl text-white text-center" style={{ backgroundColor: headerColor }}>
                        <p className="text-[11px] font-black uppercase tracking-wider">SILICONLABS TECH PLC</p>
                        <p className="text-[8px] font-mono text-[#9fe870]">AUTHORIZED CREDENTIAL PASS</p>
                      </div>
                      <div className="text-[9px] text-slate-600 space-y-1 py-2">
                        <p className="font-bold text-slate-800">Operational Notice:</p>
                        <p>1. This credential remains property of SiliconLabs Tech PLC.</p>
                        <p>2. Must be presented upon request at all secured facilities.</p>
                        <p>3. If found, please return to Addis Ababa Headquarters.</p>
                      </div>
                      <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between text-[8px] font-mono text-slate-500">
                        <span>SERIAL: SL-{activePerson.idNumber || '2026-081'}</span>
                        <span className="font-bold" style={{ color: accentColor }}>✓ SECURELY ENCRYPTED</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tablet Carousel Indicator Dots */}
            {filteredRoster.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 py-2">
                {filteredRoster.slice(0, 5).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPersonIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      selectedPersonIndex === idx ? 'w-5 bg-[#84a92c]' : 'w-1.5 bg-slate-700 hover:bg-slate-500'
                    }`}
                    aria-label={`Select card ${idx + 1}`}
                  />
                ))}
              </div>
            )}

            {/* Mobile Bottom Action Bar (Flip & Print) */}
            <div className="w-full flex lg:hidden items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setActiveSide(activeSide === 'front' ? 'back' : 'front')}
                className="flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              >
                <span>🔄 {activeSide === 'front' ? 'Show Back' : 'Show Front'}</span>
              </button>
              <button
                onClick={() => navigate('/print')}
                className="flex-1 btn-primary py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <span>🖨️ Print</span>
              </button>
            </div>
          </main>

          {/* ================= COLUMN 3: ACCORDION CONTROLS & PRESETS ================= */}
          <aside
            className={`w-full lg:w-80 border-l p-4 space-y-3 overflow-y-auto flex-shrink-0 text-xs z-10 ${
              mobileActiveTab === 'presets' || mobileActiveTab === 'settings' ? 'block' : 'hidden lg:block'
            }`}
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
          >
            {/* ACCORDION 1: CANVAS DESIGNER TEMPLATES */}
            {(mobileActiveTab === 'presets' || mobileActiveTab === 'preview' || window.innerWidth >= 1024) && dbTemplates.length > 0 && (
              <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                <button
                  onClick={() => setCanvasAccordionOpen(o => !o)}
                  className="w-full p-3 flex items-center justify-between font-bold text-xs uppercase font-mono tracking-wider text-left cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#84a92c]">🎨</span>
                    <span>CANVAS DESIGNER TEMPLATES</span>
                  </div>
                  <span className="text-slate-400 font-bold">{canvasAccordionOpen ? '▾' : '▸'}</span>
                </button>

                {canvasAccordionOpen && (
                  <div className="p-3 pt-0 space-y-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    {dbTemplates.map(tmpl => {
                      const isSelected = activeTemplateId === `custom-${tmpl.id}`;
                      return (
                        <div
                          key={tmpl.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                            isSelected ? 'border-[#84a92c] bg-[#84a92c]/10' : 'hover:opacity-90'
                          }`}
                          style={{ borderColor: isSelected ? '#84a92c' : 'var(--border-primary)' }}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="font-bold text-xs truncate" style={{ color: 'var(--text-primary)' }}>{tmpl.name}</p>
                            <p className="text-[10px] font-mono text-slate-400 truncate">
                              ID: {tmpl.id} • {tmpl.orientation === 'vertical' ? '54×85.6mm' : '85.6×54mm'}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleApplyCustomTemplate(tmpl)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                                isSelected ? 'bg-[#84a92c] text-slate-950' : 'bg-white/10 hover:bg-white/20 text-white'
                              }`}
                            >
                              {isSelected ? 'Active' : 'Apply'}
                            </button>
                            <button
                              onClick={() => navigate('/designer')}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold text-[#84a92c] border border-[#84a92c]/40 hover:bg-[#84a92c]/10 cursor-pointer"
                              title="Open in Canvas Designer"
                            >
                              Edit &gt;
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ACCORDION 2: BUILT-IN DESIGN PRESETS */}
            {(mobileActiveTab === 'presets' || mobileActiveTab === 'preview' || window.innerWidth >= 1024) && (
              <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                <button
                  onClick={() => setPresetsAccordionOpen(o => !o)}
                  className="w-full p-3 flex items-center justify-between font-bold text-xs uppercase font-mono tracking-wider text-left cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#84a92c]">✨</span>
                    <span>BUILT-IN DESIGN PRESETS</span>
                  </div>
                  <span className="text-slate-400 font-bold">{presetsAccordionOpen ? '▾' : '▸'}</span>
                </button>

                {presetsAccordionOpen && (
                  <div className="p-3 pt-0 space-y-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    {PRESET_TEMPLATES.map(tmpl => {
                      const isSelected = activeTemplateId === tmpl.id;
                      return (
                        <div
                          key={tmpl.id}
                          onClick={() => handleApplyPreset(tmpl)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected ? 'border-[#84a92c] bg-[#84a92c]/10 font-bold' : 'hover:opacity-90'
                          }`}
                          style={{ borderColor: isSelected ? '#84a92c' : 'var(--border-primary)' }}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="font-bold text-xs truncate" style={{ color: 'var(--text-primary)' }}>{tmpl.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{tmpl.category}</p>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Color Swatch Dots */}
                            <div className="flex -space-x-1">
                              <span className="w-3.5 h-3.5 rounded-full border border-black/40" style={{ backgroundColor: tmpl.headerColor }} />
                              <span className="w-3.5 h-3.5 rounded-full border border-black/40" style={{ backgroundColor: tmpl.accentColor }} />
                              <span className="w-3.5 h-3.5 rounded-full border border-black/40" style={{ backgroundColor: tmpl.badgeColor }} />
                            </div>

                            {/* Active Radio Switch Indicator */}
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              isSelected ? 'border-[#84a92c] bg-[#84a92c]' : 'border-slate-600'
                            }`}>
                              {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ACCORDION 3: ORIENTATION & TYPOGRAPHY */}
            {(mobileActiveTab === 'settings' || mobileActiveTab === 'preview' || window.innerWidth >= 1024) && (
              <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                <button
                  onClick={() => setTypographyAccordionOpen(o => !o)}
                  className="w-full p-3 flex items-center justify-between font-bold text-xs uppercase font-mono tracking-wider text-left cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#84a92c]">📐</span>
                    <span>ORIENTATION & TYPOGRAPHY</span>
                  </div>
                  <span className="text-slate-400 font-bold">{typographyAccordionOpen ? '▾' : '▸'}</span>
                </button>

                {typographyAccordionOpen && (
                  <div className="p-3 pt-0 space-y-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    {/* Orientation Tabs */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => setOrientation('horizontal')}
                        className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                          orientation === 'horizontal' ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
                        }`}
                        style={{
                          backgroundColor: orientation === 'horizontal' ? '#198754' : 'var(--bg-surface)',
                          borderColor: orientation === 'horizontal' ? '#198754' : 'var(--border-primary)',
                          color: orientation === 'horizontal' ? '#ffffff' : 'var(--text-secondary)',
                        }}
                      >
                        Horizontal (CR80)
                      </button>
                      <button
                        onClick={() => setOrientation('vertical')}
                        className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
                          orientation === 'vertical' ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
                        }`}
                        style={{
                          backgroundColor: orientation === 'vertical' ? '#198754' : 'var(--bg-surface)',
                          borderColor: orientation === 'vertical' ? '#198754' : 'var(--border-primary)',
                          color: orientation === 'vertical' ? '#ffffff' : 'var(--text-secondary)',
                        }}
                      >
                        Vertical Badge
                      </button>
                    </div>

                    {/* Font Style Dropdown */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold font-mono uppercase text-slate-400">Font Style</label>
                      <select
                        value={fontFamily}
                        onChange={e => setFontFamily(e.target.value)}
                        className="w-full text-xs py-2 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c] cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-primary)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value="Inter">Inter (Standard Clean)</option>
                        <option value="Outfit">Outfit (Geometric Modern)</option>
                        <option value="Plus Jakarta Sans">Plus Jakarta Sans (Corporate)</option>
                        <option value="JetBrains Mono">JetBrains Mono (Tech Code)</option>
                        <option value="Space Grotesk">Space Grotesk (High-Tech VIP)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ACCORDION 4: PHOTO SCALE & TOGGLES */}
            {(mobileActiveTab === 'settings' || mobileActiveTab === 'preview' || window.innerWidth >= 1024) && (
              <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                <button
                  onClick={() => setTogglesAccordionOpen(o => !o)}
                  className="w-full p-3 flex items-center justify-between font-bold text-xs uppercase font-mono tracking-wider text-left cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[#84a92c]">⚙️</span>
                    <span>PHOTO SCALE & TOGGLES</span>
                  </div>
                  <span className="text-slate-400 font-bold">{togglesAccordionOpen ? '▾' : '▸'}</span>
                </button>

                {togglesAccordionOpen && (
                  <div className="p-3 pt-0 space-y-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    {/* Photo Scale Slider */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                        <span>Photo Fit / Scale:</span>
                        <span className="font-mono text-[#84a92c] font-bold">{photoZoom}%</span>
                      </div>
                      <input
                        type="range"
                        min={70}
                        max={140}
                        value={photoZoom}
                        onChange={e => setPhotoZoom(Number(e.target.value))}
                        className="w-full accent-[#84a92c] cursor-pointer"
                      />
                    </div>

                    {/* 2-Column Checkbox Toggles (Matches reference Image 2) */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer p-1.5 rounded-lg hover:bg-white/5">
                        <input
                          type="checkbox"
                          checked={showPhoto}
                          onChange={e => setShowPhoto(e.target.checked)}
                          className="w-4 h-4 rounded accent-[#84a92c]"
                        />
                        <span>Show Photo</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer p-1.5 rounded-lg hover:bg-white/5">
                        <input
                          type="checkbox"
                          checked={showQrCode}
                          onChange={e => setShowQrCode(e.target.checked)}
                          className="w-4 h-4 rounded accent-[#84a92c]"
                        />
                        <span>Show Qr Code</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer p-1.5 rounded-lg hover:bg-white/5">
                        <input
                          type="checkbox"
                          checked={showBarcode}
                          onChange={e => setShowBarcode(e.target.checked)}
                          className="w-4 h-4 rounded accent-[#84a92c]"
                        />
                        <span>Show Barcode</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer p-1.5 rounded-lg hover:bg-white/5">
                        <input
                          type="checkbox"
                          checked={showBorders}
                          onChange={e => setShowBorders(e.target.checked)}
                          className="w-4 h-4 rounded accent-[#84a92c]"
                        />
                        <span>Show Border</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>

        {/* ================= MOBILE BOTTOM NAVIGATION BAR (375px - 430px) ================= */}
        {/* Matches bottom navigation in reference Image 2 */}
        <div
          className="flex lg:hidden fixed bottom-0 left-0 right-0 h-14 border-t z-50 items-center justify-around px-2 backdrop-blur-md"
          style={{ backgroundColor: 'rgba(11, 19, 27, 0.95)', borderColor: 'var(--border-primary)' }}
        >
          <button
            onClick={() => setMobileActiveTab('roster')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              mobileActiveTab === 'roster' ? 'text-[#84a92c]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <span className="text-[9px] font-bold font-mono">Roster</span>
          </button>

          <button
            onClick={() => setMobileActiveTab('preview')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              mobileActiveTab === 'preview' ? 'text-[#84a92c]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm-3.375 3.375h.008v.008H7.125v-.008z" />
            </svg>
            <span className="text-[9px] font-bold font-mono">Preview</span>
          </button>

          <button
            onClick={() => setMobileActiveTab('presets')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              mobileActiveTab === 'presets' ? 'text-[#84a92c]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            <span className="text-[9px] font-bold font-mono">Presets</span>
          </button>

          <button
            onClick={() => setMobileActiveTab('settings')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              mobileActiveTab === 'settings' ? 'text-[#84a92c]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            <span className="text-[9px] font-bold font-mono">Settings</span>
          </button>

          <button
            onClick={() => navigate('/print')}
            className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl text-[#9fe870] font-bold cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
            </svg>
            <span className="text-[9px] font-bold font-mono">Print</span>
          </button>
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
