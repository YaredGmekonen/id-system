import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import SiliconLabsLogo from '../components/shared/SiliconLabsLogo';
import { usePeople, useTemplates, updatePerson } from '../db/hooks';
import type { Person, CardTemplate } from '../db/database';
import PaperStudioModal from '../components/studio/PaperStudioModal';
import { renderStudioCard, type StudioCardOptions } from '../engine/renderStudioCard';
import { CARD_SIZE_PRESETS, type CardSizePreset } from '../design-tokens';
import { useTheme } from '../context/ThemeContext';
import {
  IdCard,
  RotateCw,
  Printer,
  Sparkles,
  Sliders,
  FolderKanban,
  Search,
  CheckSquare,
  Square,
  Edit3,
  Check,
  ChevronDown,
  ChevronRight,
  Maximize2,
  Upload,
  Layers,
  School,
  User,
  Phone,
  Hash,
  FileText,
  Eye,
  CheckCircle2,
  PenTool,
  Plus,
  Palette,
  Ruler,
} from 'lucide-react';

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
    id: 'student-academic',
    name: 'School / Academic Student Pass',
    category: 'Academic • Clean • Student ID',
    headerColor: '#1e3a8a',
    backgroundColor: '#FFFFFF',
    accentColor: '#84a92c',
    badgeColor: '#0f766e',
    fontFamily: 'Outfit',
    cornerRadius: 16,
  },
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
  const [activeTemplateId, setActiveTemplateId] = useState('student-academic');
  const [activeCustomTemplate, setActiveCustomTemplate] = useState<CardTemplate | null>(null);

  // Custom Studio Tweaks
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('horizontal');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [fontFamily, setFontFamily] = useState('Outfit');
  const [headerColor, setHeaderColor] = useState('#1e3a8a');
  const [accentColor, setAccentColor] = useState('#84a92c');
  const [badgeColor, setBadgeColor] = useState('#0f766e');
  const [cornerRadius, setCornerRadius] = useState(16);

  // Card Size Specifications & Preset (CR80 standard default: 85.6mm x 54.0mm)
  const [cardSizePreset, setCardSizePreset] = useState<'cr80' | 'cr79' | 'cr90' | 'cr100' | 'custom'>('cr80');
  const [cardWidthMm, setCardWidthMm] = useState<number>(85.6);
  const [cardHeightMm, setCardHeightMm] = useState<number>(54.0);
  const [cardSizeAccordionOpen, setCardSizeAccordionOpen] = useState(true);

  const handleCardSizeChange = (presetId: 'cr80' | 'cr79' | 'cr90' | 'cr100' | 'custom') => {
    setCardSizePreset(presetId);
    if (presetId !== 'custom') {
      const found = CARD_SIZE_PRESETS.find(p => p.id === presetId);
      if (found) {
        setCardWidthMm(found.widthMm);
        setCardHeightMm(found.heightMm);
      }
    }
  };

  // Features
  const [showBorders, setShowBorders] = useState(true);
  const [showQrCode, setShowQrCode] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showPhoto, setShowPhoto] = useState(true);
  const [photoZoom, setPhotoZoom] = useState(85);

  // Live Record Edit State
  const [isEditingData, setIsEditingData] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editIdNumber, setEditIdNumber] = useState('');
  const [editSchoolName, setEditSchoolName] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editGender, setEditGender] = useState('Male');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Accordion open/close states
  const [canvasAccordionOpen, setCanvasAccordionOpen] = useState(true);
  const [presetsAccordionOpen, setPresetsAccordionOpen] = useState(true);
  const [typographyAccordionOpen, setTypographyAccordionOpen] = useState(true);
  const [togglesAccordionOpen, setTogglesAccordionOpen] = useState(true);
  const [dataEditorOpen, setDataEditorOpen] = useState(true);

  // Responsive sidebar & mobile tab states
  const [templatePanelOpen, setTemplatePanelOpen] = useState(true);
  const [paperModalOpen, setPaperModalOpen] = useState(false);
  const [mobileActiveTab, setMobileActiveTab] = useState<'roster' | 'preview' | 'presets' | 'data' | 'settings'>('preview');

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
        p.department.toLowerCase().includes(searchRoster.toLowerCase()) ||
        (p.schoolName && p.schoolName.toLowerCase().includes(searchRoster.toLowerCase()));

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

  // Sync edit form whenever active person changes
  useEffect(() => {
    if (activePerson) {
      setEditFullName(activePerson.fullName || '');
      setEditIdNumber(activePerson.idNumber || '');
      setEditSchoolName(activePerson.schoolName || 'Maskelegna School');
      setEditGrade(activePerson.grade || activePerson.department || 'Grade 10');
      setEditRole(activePerson.role || 'Student');
      setEditPhone(activePerson.phone || '');
      setEditGender(activePerson.gender || 'Male');
    }
  }, [activePerson]);

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

  // Apply Custom Designer Template
  const handleApplyCustomTemplate = (tmpl: CardTemplate) => {
    setActiveTemplateId(`custom-${tmpl.id}`);
    setActiveCustomTemplate(tmpl);
    if (tmpl.orientation) setOrientation(tmpl.orientation);
    if (tmpl.backgroundColor) setBackgroundColor(tmpl.backgroundColor);
  };

  // Save live person changes to Dexie DB
  const handleSaveDataChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePerson || !activePerson.id) return;

    await updatePerson(activePerson.id, {
      fullName: editFullName.trim(),
      idNumber: editIdNumber.trim(),
      schoolName: editSchoolName.trim(),
      grade: editGrade.trim(),
      department: editGrade.trim(),
      role: editRole.trim(),
      phone: editPhone.trim(),
      gender: editGender,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 1500);
  };

  // Replace photo for active person
  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePerson || !activePerson.id) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      await updatePerson(activePerson.id!, { photoDataUrl: dataUrl });
      activePerson.photoDataUrl = dataUrl;
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

  // Render custom template preview
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
              <IdCard className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h1 className="text-xs md:text-sm font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
                ID Card Studio & Live Editor
              </h1>
              <p className="text-[10px] md:text-[11px] truncate hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                Design, edit data, and print professional student and personnel ID cards
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            {/* Side Flip Button */}
            <button
              onClick={() => setActiveSide(activeSide === 'front' ? 'back' : 'front')}
              className="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 text-[11px] md:text-xs font-bold rounded-xl border transition-all cursor-pointer hover:border-[#84a92c]"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
              title="Flip Card Face"
            >
              <RotateCw className="w-3.5 h-3.5 text-[#84a92c]" />
              <span>{activeSide === 'front' ? 'Show Back' : 'Show Front'}</span>
            </button>

            {/* Poster / Print Studio Quick Launch */}
            <button
              onClick={() => navigate('/print')}
              className="hidden sm:flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 text-[11px] md:text-xs font-bold rounded-xl border transition-all cursor-pointer hover:border-[#84a92c]"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
              title="Open Paper Print Studio"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Paper Studio</span>
            </button>

            {/* Print A4 Multi-Card Action Button */}
            <button
              onClick={() => navigate('/print')}
              className="btn-primary py-1.5 md:py-2 px-3 md:px-4 text-[11px] md:text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer flex-shrink-0"
            >
              <Printer className="w-3.5 md:w-4 h-3.5 md:h-4" />
              <span className="hidden sm:inline">Print A4 Multi-card</span>
              <span>({selectedIds.size > 0 ? selectedIds.size : filteredRoster.length})</span>
            </button>
          </div>
        </header>

        {/* ================= WORKSPACE (RESPONSIVE 3-COLUMN) ================= */}
        <div className="flex-1 flex overflow-hidden pb-16 md:pb-0">
          {/* ================= COLUMN 1: ROSTER ================= */}
          <aside
            className={`w-full lg:w-80 border-r flex flex-col p-3.5 space-y-3 flex-shrink-0 overflow-y-auto z-10 ${
              mobileActiveTab === 'roster' ? 'flex' : 'hidden lg:flex'
            }`}
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
          >
            {/* Folder / Batch selector */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase font-mono tracking-wider flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1">
                  <FolderKanban className="w-3 h-3 text-[#84a92c]" />
                  <span>BATCH / FOLDER</span>
                </span>
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
                <option value="all">All Folders & Records ({dbPeople.length})</option>
                {folders.map(f => (
                  <option key={f.name} value={f.name}>
                    {f.name} ({f.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input & Select All in Folder */}
            <div className="space-y-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                <input
                  type="text"
                  value={searchRoster}
                  onChange={e => setSearchRoster(e.target.value)}
                  placeholder="Search by name, ID, school..."
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
                  {selectedIds.size === filteredRoster.length && filteredRoster.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            </div>

            {/* Personnel List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredRoster.map((p, idx) => {
                const isActive = activePerson?.id === p.id;
                const isChecked = p.id ? selectedIds.has(p.id) : false;

                return (
                  <div
                    key={p.id || idx}
                    onClick={() => {
                      setSelectedPersonIndex(idx);
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
                    {/* Checkbox */}
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

                    {/* Details */}
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-xs font-bold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                        {p.fullName}
                      </p>
                      <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                        ID: {p.idNumber} • {p.schoolName || p.role || p.department || 'Student'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* ================= COLUMN 2: CENTER LIVE CARD PREVIEW ================= */}
          <main
            className={`flex-1 flex-col items-center justify-between lg:justify-center overflow-auto p-4 sm:p-6 relative select-none ${
              mobileActiveTab === 'preview' ? 'flex' : 'hidden lg:flex'
            }`}
            style={{ backgroundColor: 'var(--bg-root)' }}
          >
            {/* Header info */}
            <div className="w-full max-w-2xl flex items-center justify-between text-[11px] font-mono mb-3 px-2 flex-wrap gap-1" style={{ color: 'var(--text-muted)' }}>
              <div className="truncate min-w-0">
                <span>Preview: </span>
                <strong className="text-[#84a92c] truncate">{activePerson?.fullName || 'No Record'}</strong>
                {activePerson?.idNumber && <span className="text-slate-500"> (ID: {activePerson.idNumber})</span>}
              </div>
              <span className="flex-shrink-0 text-slate-400">
                {orientation === 'horizontal' ? 'Horizontal (CR80)' : 'Vertical'} • 85.6 × 54 mm
              </span>
            </div>

            {/* Central Rendered Card Container */}
            <div className="flex-1 flex items-center justify-center w-full max-w-full my-auto py-2">
              {!activePerson ? (
                <div className="text-center space-y-3 p-8" style={{ color: 'var(--text-muted)' }}>
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
                /* Standard Preset Render Card (School & Enterprise CR80) */
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
                        <div className="flex items-center gap-2">
                          <School className="w-4 h-4 text-[#9fe870]" />
                          <span className="font-extrabold text-xs tracking-wider uppercase truncate max-w-[200px]">
                            {activePerson.schoolName || 'MASKELEGNA ACADEMY'}
                          </span>
                        </div>
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
                              <Upload className="w-3.5 h-3.5 mb-0.5" />
                              <span>Replace</span>
                              <input type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" />
                            </label>
                          </div>
                        )}

                        <div className="flex-1 min-w-0 space-y-1">
                          <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">{activePerson.fullName}</h2>
                          <p className="text-xs font-bold tracking-wide truncate" style={{ color: accentColor }}>
                            {activePerson.role || 'Student Member'}
                          </p>
                          <div className="pt-1 text-[11px] space-y-0.5 text-slate-600 font-medium font-sans">
                            <p className="truncate"><span className="font-bold text-slate-800">ID:</span> <span className="font-mono text-slate-900 font-bold">{activePerson.idNumber}</span></p>
                            <p className="truncate"><span className="font-bold text-slate-800">Class:</span> {activePerson.grade || activePerson.department || 'Grade 10'}</p>
                            {activePerson.gender && <p className="truncate"><span className="font-bold text-slate-800">Gender:</span> {activePerson.gender}</p>}
                            {activePerson.phone && <p className="truncate"><span className="font-bold text-slate-800">Contact:</span> {activePerson.phone}</p>}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Bar */}
                      <div className="px-4 py-2 flex items-center justify-between text-white" style={{ backgroundColor: badgeColor }}>
                        <span className="font-black tracking-widest text-[10px] uppercase font-mono">OFFICIAL STUDENT CREDENTIAL</span>
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
                      <div className="p-2 rounded-xl text-white text-center" style={{ backgroundColor: headerColor }}>
                        <p className="text-[11px] font-black uppercase tracking-wider">{activePerson.schoolName || 'MASKELEGNA ACADEMY'}</p>
                        <p className="text-[8px] font-mono text-[#9fe870]">AUTHORIZED STUDENT PASS</p>
                      </div>
                      <div className="text-[9px] text-slate-600 space-y-1 py-2">
                        <p className="font-bold text-slate-800">Institutional Terms & Conditions:</p>
                        <p>1. This credential remains the property of the institution.</p>
                        <p>2. Must be presented at examinations, library, and campus gates.</p>
                        <p>3. If found, please return to the School Administration Office.</p>
                      </div>
                      <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between text-[8px] font-mono text-slate-500">
                        <span>SERIAL: {activePerson.idNumber || 'SL-2026-081'}</span>
                        <span className="font-bold" style={{ color: accentColor }}>VALIDATED 2026</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile Bottom Action Bar (Flip & Print) */}
            <div className="w-full flex lg:hidden items-center justify-between gap-3 pt-2">
              <button
                onClick={() => setActiveSide(activeSide === 'front' ? 'back' : 'front')}
                className="flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              >
                <RotateCw className="w-3.5 h-3.5 text-[#84a92c]" />
                <span>{activeSide === 'front' ? 'Show Back' : 'Show Front'}</span>
              </button>
              <button
                onClick={() => navigate('/print')}
                className="flex-1 btn-primary py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </main>

          {/* ================= COLUMN 3: ACCORDION CONTROLS & LIVE DATA EDITOR ================= */}
          <aside
            className={`w-full lg:w-80 border-l p-4 space-y-3 overflow-y-auto flex-shrink-0 text-xs z-10 ${
              mobileActiveTab === 'presets' || mobileActiveTab === 'settings' || mobileActiveTab === 'data' ? 'block' : 'hidden lg:block'
            }`}
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
          >
            {/* ACCORDION 1: LIVE RECORD DATA EDITOR */}
            {(mobileActiveTab === 'data' || mobileActiveTab === 'preview' || window.innerWidth >= 1024) && activePerson && (
              <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                <button
                  onClick={() => setDataEditorOpen(o => !o)}
                  className="w-full p-3 flex items-center justify-between font-bold text-xs uppercase font-mono tracking-wider text-left cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-3.5 h-3.5 text-[#84a92c]" />
                    <span>LIVE DATA MODIFICATION</span>
                  </div>
                  <span className="text-slate-400 font-bold">{dataEditorOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
                </button>

                {dataEditorOpen && (
                  <form onSubmit={handleSaveDataChanges} className="p-3 pt-0 space-y-2.5 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Full Name</label>
                      <input
                        type="text"
                        value={editFullName}
                        onChange={e => setEditFullName(e.target.value)}
                        className="w-full py-1.5 px-2.5 rounded-xl border text-xs font-bold focus:outline-none focus:border-[#84a92c]"
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">ID Number</label>
                        <input
                          type="text"
                          value={editIdNumber}
                          onChange={e => setEditIdNumber(e.target.value)}
                          className="w-full py-1.5 px-2.5 rounded-xl border font-mono text-xs focus:outline-none focus:border-[#84a92c]"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Gender</label>
                        <select
                          value={editGender}
                          onChange={e => setEditGender(e.target.value)}
                          className="w-full py-1.5 px-2 rounded-xl border text-xs focus:outline-none focus:border-[#84a92c] cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">School / Institution</label>
                      <input
                        type="text"
                        value={editSchoolName}
                        onChange={e => setEditSchoolName(e.target.value)}
                        className="w-full py-1.5 px-2.5 rounded-xl border text-xs focus:outline-none focus:border-[#84a92c]"
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Grade / Dept</label>
                        <input
                          type="text"
                          value={editGrade}
                          onChange={e => setEditGrade(e.target.value)}
                          className="w-full py-1.5 px-2.5 rounded-xl border text-xs focus:outline-none focus:border-[#84a92c]"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-0.5">Contact No</label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={e => setEditPhone(e.target.value)}
                          className="w-full py-1.5 px-2.5 rounded-xl border text-xs font-mono focus:outline-none focus:border-[#84a92c]"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="btn-primary w-full py-2 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {saveSuccess ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                          <span>Saved Changes!</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Data to Database</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* ACCORDION 2: TEMPLATES & DESIGN PRESETS (CUSTOM CANVAS + BUILT-IN) */}
            {(mobileActiveTab === 'presets' || mobileActiveTab === 'preview' || window.innerWidth >= 1024) && (
              <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                <button
                  onClick={() => setPresetsAccordionOpen(o => !o)}
                  className="w-full p-3 flex items-center justify-between font-bold text-xs uppercase font-mono tracking-wider text-left cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#84a92c]" />
                    <span>TEMPLATES & PRESETS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[#84a92c] font-bold">
                      {dbTemplates.length > 0 ? `${dbTemplates.length} Custom` : '5 Presets'}
                    </span>
                    <span className="text-slate-400 font-bold">{presetsAccordionOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
                  </div>
                </button>

                {presetsAccordionOpen && (
                  <div className="p-3 pt-0 space-y-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    
                    {/* SECTION 1: CUSTOM CANVAS TEMPLATES */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold font-mono uppercase text-[#84a92c] flex items-center gap-1">
                          <PenTool className="w-3 h-3" />
                          <span>Custom Canvas Templates ({dbTemplates.length})</span>
                        </span>
                        <button
                          onClick={() => navigate('/designer')}
                          className="text-[10px] font-bold text-[#84a92c] hover:underline flex items-center gap-0.5 cursor-pointer"
                          title="Open Canvas Vector Designer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>New in Designer</span>
                        </button>
                      </div>

                      {dbTemplates.length === 0 ? (
                        <div className="p-3 rounded-xl border border-dashed text-center space-y-1.5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                          <p className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>No Custom Templates Yet</p>
                          <p className="text-[10px] text-slate-400">Design custom vector templates with QR, custom logos, and dynamic bindings in the Canvas Designer.</p>
                          <button
                            onClick={() => navigate('/designer')}
                            className="btn-primary py-1 px-3 text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <PenTool className="w-3 h-3" />
                            <span>Open Canvas Designer</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                          {dbTemplates.map(tmpl => {
                            const isSelected = activeTemplateId === `custom-${tmpl.id}`;
                            const elemCount = (tmpl.frontElements?.length || 0) + (tmpl.backElements?.length || 0);

                            return (
                              <div
                                key={tmpl.id}
                                onClick={() => handleApplyCustomTemplate(tmpl)}
                                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                  isSelected ? 'border-[#84a92c] bg-[#84a92c]/15 font-bold shadow-xs' : 'hover:opacity-90'
                                }`}
                                style={{ backgroundColor: isSelected ? undefined : 'var(--bg-surface)', borderColor: isSelected ? '#84a92c' : 'var(--border-primary)' }}
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-bold text-xs truncate" style={{ color: 'var(--text-primary)' }}>{tmpl.name}</p>
                                    <span className="text-[9px] font-mono px-1 rounded bg-[#84a92c]/20 text-[#84a92c] font-bold">
                                      Custom
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                    {tmpl.orientation === 'vertical' ? 'Vertical Badge' : 'Horizontal (CR80)'} • {elemCount} Elements
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
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

                    {/* SECTION 2: BUILT-IN PRESETS */}
                    <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                      <span className="text-[10px] font-bold font-mono uppercase text-slate-400 block">
                        Built-in System Presets (5)
                      </span>

                      <div className="space-y-1.5">
                        {PRESET_TEMPLATES.map(tmpl => {
                          const isSelected = activeTemplateId === tmpl.id;
                          return (
                            <div
                              key={tmpl.id}
                              onClick={() => handleApplyPreset(tmpl)}
                              className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                isSelected ? 'border-[#84a92c] bg-[#84a92c]/10 font-bold' : 'hover:opacity-90'
                              }`}
                              style={{ backgroundColor: isSelected ? undefined : 'var(--bg-surface)', borderColor: isSelected ? '#84a92c' : 'var(--border-primary)' }}
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <p className="font-bold text-xs truncate" style={{ color: 'var(--text-primary)' }}>{tmpl.name}</p>
                                <p className="text-[10px] text-slate-400 truncate">{tmpl.category}</p>
                              </div>

                              <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="flex -space-x-1">
                                  <span className="w-3 h-3 rounded-full border border-black/40" style={{ backgroundColor: tmpl.headerColor }} />
                                  <span className="w-3 h-3 rounded-full border border-black/40" style={{ backgroundColor: tmpl.accentColor }} />
                                  <span className="w-3 h-3 rounded-full border border-black/40" style={{ backgroundColor: tmpl.badgeColor }} />
                                </div>

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
                    </div>

                  </div>
                )}
              </div>
            )}

            {/* ACCORDION 2.5: CARD SIZE & DIMENSIONS SPECIFICATIONS (CR80 Standard Default & Custom) */}
            {(mobileActiveTab === 'settings' || mobileActiveTab === 'preview' || window.innerWidth >= 1024) && (
              <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                <button
                  onClick={() => setCardSizeAccordionOpen(o => !o)}
                  className="w-full p-3 flex items-center justify-between font-bold text-xs uppercase font-mono tracking-wider text-left cursor-pointer"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <div className="flex items-center gap-2">
                    <Ruler className="w-3.5 h-3.5 text-[#84a92c]" />
                    <span>CARD SIZE & DIMENSIONS</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#84a92c]/20 text-[#84a92c] font-bold">
                      {cardSizePreset.toUpperCase()}
                    </span>
                    <span className="text-slate-400 font-bold">{cardSizeAccordionOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
                  </div>
                </button>

                {cardSizeAccordionOpen && (
                  <div className="p-3 pt-0 space-y-2.5 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                    <div>
                      <label className="text-[10px] font-bold font-mono uppercase text-slate-400 block mb-1">
                        Card Standard Format
                      </label>
                      <select
                        value={cardSizePreset}
                        onChange={e => handleCardSizeChange(e.target.value as any)}
                        className="w-full text-xs py-2 px-3 rounded-xl border font-bold focus:outline-none focus:border-[#84a92c] cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-primary)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {CARD_SIZE_PRESETS.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.isDefault ? '— (Default)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quick Preset Pills */}
                    <div className="grid grid-cols-2 gap-1">
                      {CARD_SIZE_PRESETS.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleCardSizeChange(p.id)}
                          className={`py-1.5 px-2 rounded-xl text-[10px] font-bold transition-all border cursor-pointer text-center truncate ${
                            cardSizePreset === p.id
                              ? 'bg-[#84a92c] text-slate-950 border-[#84a92c] shadow-xs'
                              : 'hover:border-[#84a92c]'
                          }`}
                          style={{
                            backgroundColor: cardSizePreset === p.id ? '#84a92c' : 'var(--bg-surface)',
                            borderColor: cardSizePreset === p.id ? '#84a92c' : 'var(--border-primary)',
                            color: cardSizePreset === p.id ? '#020617' : 'var(--text-primary)',
                          }}
                        >
                          {p.code} {p.id !== 'custom' ? `(${p.widthMm}×${p.heightMm})` : ''}
                        </button>
                      ))}
                    </div>

                    {/* Precision Inputs */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                      <div>
                        <label className="text-[10px] font-bold uppercase font-mono tracking-wider block mb-1 text-slate-400">
                          Width (mm)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="30"
                            max="200"
                            value={cardWidthMm}
                            onChange={e => {
                              setCardWidthMm(parseFloat(e.target.value) || 0);
                              setCardSizePreset('custom');
                            }}
                            className="w-full pl-2.5 pr-7 py-1 text-xs font-mono font-bold rounded-xl border focus:outline-none focus:border-[#84a92c]"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-primary)',
                              color: 'var(--text-primary)',
                            }}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-400 pointer-events-none">
                            mm
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase font-mono tracking-wider block mb-1 text-slate-400">
                          Height (mm)
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.1"
                            min="30"
                            max="200"
                            value={cardHeightMm}
                            onChange={e => {
                              setCardHeightMm(parseFloat(e.target.value) || 0);
                              setCardSizePreset('custom');
                            }}
                            className="w-full pl-2.5 pr-7 py-1 text-xs font-mono font-bold rounded-xl border focus:outline-none focus:border-[#84a92c]"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-primary)',
                              color: 'var(--text-primary)',
                            }}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono text-slate-400 pointer-events-none">
                            mm
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dimensions calculation badge */}
                    <div className="p-2 rounded-xl bg-black/40 border border-white/5 space-y-0.5 text-[9px] font-mono text-slate-300">
                      <div className="flex justify-between">
                        <span>Inches:</span>
                        <span className="font-bold text-white">{(cardWidthMm / 25.4).toFixed(3)}" × {(cardHeightMm / 25.4).toFixed(3)}"</span>
                      </div>
                      <div className="flex justify-between">
                        <span>300 DPI Quality:</span>
                        <span className="font-bold text-[#84a92c]">{Math.round((cardWidthMm / 25.4) * 300)} × {Math.round((cardHeightMm / 25.4) * 300)} px</span>
                      </div>
                    </div>
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
                    <Sliders className="w-3.5 h-3.5 text-[#84a92c]" />
                    <span>ORIENTATION & TYPOGRAPHY</span>
                  </div>
                  <span className="text-slate-400 font-bold">{typographyAccordionOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
                </button>

                {typographyAccordionOpen && (
                  <div className="p-3 pt-0 space-y-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
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
                        <option value="Outfit">Outfit (Clean Geometric Academic)</option>
                        <option value="Inter">Inter (Standard Modern)</option>
                        <option value="Plus Jakarta Sans">Plus Jakarta Sans (Corporate)</option>
                        <option value="JetBrains Mono">JetBrains Mono (Technical Mono)</option>
                        <option value="Space Grotesk">Space Grotesk (High-Tech)</option>
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
                    <Eye className="w-3.5 h-3.5 text-[#84a92c]" />
                    <span>PHOTO SCALE & TOGGLES</span>
                  </div>
                  <span className="text-slate-400 font-bold">{togglesAccordionOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
                </button>

                {togglesAccordionOpen && (
                  <div className="p-3 pt-0 space-y-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
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
                        <span>Show QR Code</span>
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

        {/* ================= MOBILE BOTTOM NAVIGATION BAR ================= */}
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
            <FolderKanban className="w-4 h-4" />
            <span className="text-[9px] font-bold font-mono">Roster</span>
          </button>

          <button
            onClick={() => setMobileActiveTab('preview')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              mobileActiveTab === 'preview' ? 'text-[#84a92c]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <IdCard className="w-4 h-4" />
            <span className="text-[9px] font-bold font-mono">Preview</span>
          </button>

          <button
            onClick={() => setMobileActiveTab('data')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              mobileActiveTab === 'data' ? 'text-[#84a92c]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span className="text-[9px] font-bold font-mono">Edit Data</span>
          </button>

          <button
            onClick={() => setMobileActiveTab('presets')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              mobileActiveTab === 'presets' ? 'text-[#84a92c]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-[9px] font-bold font-mono">Presets</span>
          </button>

          <button
            onClick={() => navigate('/print')}
            className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl text-[#9fe870] font-bold cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span className="text-[9px] font-bold font-mono">Print</span>
          </button>
        </div>
      </div>

      {/* Modal */}
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
