import React, { useState, useRef } from 'react';
import { DATA_FIELDS, CARD } from '../../design-tokens';
import type { CanvasElement, CardTemplate } from '../../db/database';
import {
  Sparkles,
  ShieldCheck,
  Shapes,
  QrCode,
  FolderKanban,
  Image as ImageIcon,
  CreditCard,
  Radio,
  PenTool,
  Award,
  Layers,
  Star,
  Hexagon,
  Triangle,
  ArrowRight,
  Minus,
} from 'lucide-react';

interface ToolbarProps {
  onAddElement: (element: CanvasElement) => void;
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  onSave: () => void;
  saving: boolean;
  activeSide: 'front' | 'back';
  onSideChange: (side: 'front' | 'back') => void;
  onImportTemplate?: (template: CardTemplate) => void;
  onExportTemplate?: () => void;
  onLoadPresetTemplate?: (templateKey: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onDuplicate?: () => void;
  onGroup?: () => void;
  onUngroup?: () => void;
  onAlign?: (type: 'left' | 'center-h' | 'right' | 'top' | 'middle-v' | 'bottom' | 'dist-h' | 'dist-v') => void;
  selectedCount?: number;
  isGroupSelected?: boolean;
}

let elementCounter = 500;
function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${++elementCounter}`;
}

export default function Toolbar({
  onAddElement,
  templateName,
  onTemplateNameChange,
  onSave,
  saving,
  activeSide,
  onSideChange,
  onImportTemplate,
  onExportTemplate,
  onLoadPresetTemplate,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onDuplicate,
  onGroup,
  onUngroup,
  onAlign,
  selectedCount = 0,
  isGroupSelected = false,
}: ToolbarProps) {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const imageTemplateInputRef = useRef<HTMLInputElement>(null);

  // Sub-tab in toolbar (Elements, Shapes, Security Badges, QR & Barcode, Data Fields, Assets)
  const [activeTab, setActiveTab] = useState<'elements' | 'shapes' | 'security' | 'qr-barcode' | 'data' | 'graphics'>('elements');

  // Custom QR / Barcode inputs
  const [customQrPayload, setCustomQrPayload] = useState('{{id_number}}');
  const [customBarcodePayload, setCustomBarcodePayload] = useState('{{id_number}}');

  // ================= ELEMENT BUILDERS =================

  // 1. Text & Headings
  const addHeading = (text: string = 'Full Name Label', fontSize: number = 24, fontStyle: string = 'bold', fill: string = '#0f172a') => {
    onAddElement({
      id: nextId('text-heading'),
      type: 'text',
      x: 50,
      y: 50,
      text,
      fontSize,
      fontFamily: 'Inter',
      fontStyle,
      fill,
      align: 'left',
      width: 280,
      opacity: 1,
      visible: true,
      locked: false,
      name: text.substring(0, 16),
    });
  };

  const addSubtext = (text: string = 'Department / Role', fontSize: number = 16, fill: string = '#475569') => {
    onAddElement({
      id: nextId('text-sub'),
      type: 'text',
      x: 50,
      y: 90,
      text,
      fontSize,
      fontFamily: 'Inter',
      fontStyle: 'normal',
      fill,
      align: 'left',
      width: 260,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Subtext',
    });
  };

  const addMonoCode = (text: string = 'ID-2026-0819', fontSize: number = 14) => {
    onAddElement({
      id: nextId('text-mono'),
      type: 'text',
      x: 50,
      y: 120,
      text,
      fontSize,
      fontFamily: 'JetBrains Mono',
      fontStyle: 'bold',
      fill: '#84a92c',
      align: 'left',
      width: 200,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Mono Code',
    });
  };

  const addLegalText = () => {
    onAddElement({
      id: nextId('text-legal'),
      type: 'text',
      x: 40,
      y: 580,
      text: 'Property of SiliconLabs Corp. Return if found. Unauthorized duplication is prohibited.',
      fontSize: 9,
      fontFamily: 'Inter',
      fontStyle: 'normal',
      fill: '#94a3b8',
      align: 'center',
      width: CARD.WIDTH_PX - 80,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Legal Fine Print',
    });
  };

  // 2. Core Shapes & Frames
  const addBannerRect = (fill: string = '#0b131b', w: number = CARD.WIDTH_PX, h: number = 90, name: string = 'Header Banner') => {
    onAddElement({
      id: nextId('rect-banner'),
      type: 'rect',
      x: 0,
      y: 0,
      width: w,
      height: h,
      fill,
      cornerRadius: 0,
      opacity: 1,
      visible: true,
      locked: false,
      name,
    });
  };

  const addCardBox = (fill: string = '#ffffff', cornerRadius: number = 12, w: number = 280, h: number = 90) => {
    onAddElement({
      id: nextId('rect-box'),
      type: 'rect',
      x: 40,
      y: 150,
      width: w,
      height: h,
      fill,
      stroke: '#e2e8f0',
      strokeWidth: 1.5,
      cornerRadius,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Card Container Box',
    });
  };

  const addPillTag = (text: string = 'ACTIVE STATUS', fill: string = '#10b981') => {
    onAddElement({
      id: nextId('pill'),
      type: 'pill',
      x: 50,
      y: 40,
      width: 130,
      height: 30,
      fill,
      text,
      fontSize: 11,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Status Pill Tag',
    });
  };

  const addCircleBadge = (fill: string = '#10b981', radius: number = 35) => {
    onAddElement({
      id: nextId('circle'),
      type: 'circle',
      x: 100,
      y: 100,
      radius,
      fill,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Circular Badge',
    });
  };

  const addStarBadge = (points: number = 5, fill: string = '#F59E0B') => {
    onAddElement({
      id: nextId('star'),
      type: 'star',
      x: 120,
      y: 120,
      width: 70,
      height: 70,
      starPoints: points,
      fill,
      stroke: '#D97706',
      strokeWidth: 1.5,
      opacity: 1,
      visible: true,
      locked: false,
      name: `${points}-Point Star Badge`,
    });
  };

  const addSecurityShield = () => {
    onAddElement({
      id: nextId('shield'),
      type: 'badgeShield',
      x: 80,
      y: 80,
      width: 75,
      height: 90,
      fill: '#1E3A8A',
      stroke: '#3B82F6',
      strokeWidth: 2,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Security ID Shield',
    });
  };

  const addPolygon = (sides: number = 6, fill: string = '#3B82F6', name: string = 'Hexagon Badge') => {
    onAddElement({
      id: nextId('poly'),
      type: 'polygon',
      x: 100,
      y: 100,
      width: 80,
      height: 80,
      sides,
      fill,
      stroke: '#1D4ED8',
      strokeWidth: 1.5,
      opacity: 1,
      visible: true,
      locked: false,
      name,
    });
  };

  const addPhotoBox = () => {
    onAddElement({
      id: nextId('photo'),
      type: 'photo',
      x: 40,
      y: 130,
      width: 170,
      height: 210,
      dataField: '{{photo}}',
      fill: '#1e293b',
      cornerRadius: 12,
      stroke: '#84a92c',
      strokeWidth: 1.5,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Personnel Photo Frame',
    });
  };

  // 3. Lines, Dividers & Accents
  const addSolidLine = () => {
    onAddElement({
      id: nextId('line'),
      type: 'line',
      x: 40,
      y: 180,
      width: 240,
      height: 0,
      points: [0, 0, 240, 0],
      stroke: '#0f172a',
      strokeWidth: 2,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Solid Divider Line',
    });
  };

  const addDashedLine = () => {
    onAddElement({
      id: nextId('line-dash'),
      type: 'line',
      x: 40,
      y: 200,
      width: 240,
      height: 0,
      points: [0, 0, 240, 0],
      stroke: '#84a92c',
      strokeWidth: 1.5,
      dashPattern: [6, 4],
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Dashed Security Line',
    });
  };

  const addArrow = () => {
    onAddElement({
      id: nextId('arrow'),
      type: 'arrow',
      x: 40,
      y: 220,
      width: 180,
      height: 0,
      points: [0, 0, 180, 0],
      stroke: '#84a92c',
      strokeWidth: 2,
      arrowHead: true,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Directional Arrow',
    });
  };

  const addCornerBrackets = () => {
    onAddElement({
      id: nextId('brackets'),
      type: 'cornerBracket',
      x: 35,
      y: 125,
      width: 180,
      height: 220,
      stroke: '#84a92c',
      strokeWidth: 2.5,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Photo Corner L-Brackets',
    });
  };

  const addGuillochePattern = () => {
    onAddElement({
      id: nextId('guilloche'),
      type: 'guilloche',
      x: 40,
      y: 500,
      width: CARD.WIDTH_PX - 80,
      height: 30,
      stroke: '#10b981',
      strokeWidth: 1.5,
      opacity: 0.8,
      visible: true,
      locked: false,
      name: 'Guilloche Security Border',
    });
  };

  // 4. Security, Tech & Smart Elements
  const addSmartChip = () => {
    onAddElement({
      id: nextId('chip'),
      type: 'chip',
      x: 40,
      y: 220,
      width: 70,
      height: 55,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'EMV Gold Smart Chip',
    });
  };

  const addHologramStrip = () => {
    onAddElement({
      id: nextId('hologram'),
      type: 'hologram',
      x: CARD.WIDTH_PX - 60,
      y: 0,
      width: 45,
      height: CARD.HEIGHT_PX,
      opacity: 0.9,
      visible: true,
      locked: false,
      name: 'Holographic Security Foil',
    });
  };

  const addRfidWaves = () => {
    onAddElement({
      id: nextId('rfid'),
      type: 'rfid',
      x: CARD.WIDTH_PX - 120,
      y: 35,
      width: 50,
      height: 50,
      stroke: '#2563EB',
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Contactless RFID Waves',
    });
  };

  const addOfficialStamp = () => {
    onAddElement({
      id: nextId('stamp'),
      type: 'stamp',
      x: CARD.WIDTH_PX - 170,
      y: 280,
      width: 100,
      height: 100,
      stroke: '#DC2626',
      opacity: 0.85,
      visible: true,
      locked: false,
      name: 'Official Verified Stamp',
    });
  };

  const addSignatureLine = () => {
    onAddElement({
      id: nextId('sig'),
      type: 'signature',
      x: 280,
      y: 420,
      width: 220,
      height: 50,
      stroke: '#0f172a',
      strokeWidth: 1.5,
      subText: 'Authorized Officer Signature',
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Signature Authorization Line',
    });
  };

  // 5. QR & Barcode Generator
  const addCustomQr = () => {
    onAddElement({
      id: nextId('qr'),
      type: 'qr',
      x: 480,
      y: 140,
      width: 120,
      height: 120,
      qrPayload: customQrPayload,
      fill: '#FFFFFF',
      opacity: 1,
      visible: true,
      locked: false,
      name: `QR: ${customQrPayload.substring(0, 14)}`,
    });
  };

  const addCustomBarcode = () => {
    onAddElement({
      id: nextId('barcode'),
      type: 'barcode',
      x: 380,
      y: 340,
      width: 240,
      height: 60,
      dataField: customBarcodePayload,
      opacity: 1,
      visible: true,
      locked: false,
      name: `Barcode: ${customBarcodePayload.substring(0, 14)}`,
    });
  };

  // 6. Dynamic Data Bindings
  const addDataField = (fieldKey: string, label: string) => {
    if (fieldKey === '{{photo}}') {
      addPhotoBox();
      return;
    }
    if (fieldKey === '{{qr_code}}') {
      addCustomQr();
      return;
    }
    if (fieldKey === '{{barcode}}') {
      addCustomBarcode();
      return;
    }

    onAddElement({
      id: nextId('df'),
      type: 'dataField',
      x: 240,
      y: 140,
      text: fieldKey,
      dataField: fieldKey,
      fontSize: 20,
      fontFamily: 'Inter',
      fontStyle: 'bold',
      fill: '#0f172a',
      align: 'left',
      width: 320,
      opacity: 1,
      visible: true,
      locked: false,
      name: `Field: ${label}`,
    });
  };

  // 7. Assets & Logos (Official Brand Variants)
  const addSiliconLabsHorizontalLogo = (variant: 'color' | 'white' = 'color') => {
    onAddElement({
      id: nextId('logo-h'),
      type: 'image',
      x: 30,
      y: 20,
      width: 180,
      height: 42,
      src: variant === 'white' ? '/brand/silicon-labs-white-reverse-horizontal.png' : '/brand/silicon-labs-master-horizontal-web.png',
      opacity: 1,
      visible: true,
      locked: false,
      name: `Silicon Labs Horizontal (${variant})`,
    });
  };

  const addSiliconLabsStackedLogo = (variant: 'color' | 'white' = 'color') => {
    onAddElement({
      id: nextId('logo-s'),
      type: 'image',
      x: 30,
      y: 20,
      width: 110,
      height: 75,
      src: variant === 'white' ? '/brand/silicon-labs-stacked-white.png' : '/brand/silicon-labs-stacked-color.png',
      opacity: 1,
      visible: true,
      locked: false,
      name: `Silicon Labs Stacked (${variant})`,
    });
  };

  const addSiliconLabsSymbolLogo = (variant: 'color' | 'white' = 'color') => {
    onAddElement({
      id: nextId('logo-sym'),
      type: 'image',
      x: 30,
      y: 20,
      width: 55,
      height: 55,
      src: variant === 'white' ? '/brand/silicon-labs-symbol-white.png' : '/brand/silicon-labs-symbol-only.png',
      opacity: 1,
      visible: true,
      locked: false,
      name: `Silicon Labs Emblem (${variant})`,
    });
  };

  const handleImageTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onAddElement({
        id: nextId('custom-img'),
        type: 'image',
        x: 40,
        y: 40,
        width: 140,
        height: 140,
        src: dataUrl,
        opacity: 1,
        visible: true,
        locked: false,
        name: `Asset: ${file.name.substring(0, 16)}`,
      });
    };
    reader.readAsDataURL(file);

    if (imageTemplateInputRef.current) imageTemplateInputRef.current.value = '';
  };

  const handleJsonUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (parsed.frontElements || parsed.backElements) {
          onImportTemplate?.({
            name: parsed.name || file.name.replace(/\.json$/i, ''),
            category: parsed.category || 'Custom Imported',
            orientation: parsed.orientation || 'horizontal',
            backgroundColor: parsed.backgroundColor || '#FFFFFF',
            backBackgroundColor: parsed.backBackgroundColor || '#F2F3F1',
            frontElements: parsed.frontElements || [],
            backElements: parsed.backElements || [],
            isDefault: false,
          });
        }
      } catch (err) {
        console.error('Failed to parse template JSON file:', err);
      }
    };
    reader.readAsText(file);
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  };

  return (
    <div className="space-y-4 text-xs font-sans" style={{ color: 'var(--text-primary)' }}>
      {/* Template Name */}
      <div>
        <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
          Template Name
        </label>
        <input
          type="text"
          value={templateName}
          onChange={e => onTemplateNameChange(e.target.value)}
          className="w-full text-xs py-2 px-3 rounded-xl font-medium border focus:outline-none focus:border-[#84a92c] transition-colors"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-primary)',
            color: 'var(--text-primary)',
          }}
          placeholder="e.g. Standard CR80 Template"
        />
      </div>

      {/* Front / Back Side Switcher */}
      <div
        className="flex rounded-xl overflow-hidden border p-1"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <button
          onClick={() => onSideChange('front')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSide === 'front' ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
          }`}
          style={{
            color: activeSide === 'front' ? '#ffffff' : 'var(--text-secondary)',
          }}
        >
          Front Face
        </button>
        <button
          onClick={() => onSideChange('back')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSide === 'back' ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
          }`}
          style={{
            color: activeSide === 'back' ? '#ffffff' : 'var(--text-secondary)',
          }}
        >
          Back Face
        </button>
      </div>

      {/* Quick Actions Bar (Undo, Redo, Duplicate, Group/Ungroup) */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="flex-1 py-1 px-1.5 text-xs font-semibold rounded-lg hover:bg-slate-700/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
          <span className="text-[10px]">Undo</span>
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          className="flex-1 py-1 px-1.5 text-xs font-semibold rounded-lg hover:bg-slate-700/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3" />
          </svg>
          <span className="text-[10px]">Redo</span>
        </button>

        <button
          onClick={onDuplicate}
          title="Duplicate Element (Ctrl+D)"
          className="p-1 rounded-lg hover:bg-slate-700/20 transition-all cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
          </svg>
        </button>

        {selectedCount >= 2 && (
          <button
            onClick={onGroup}
            title="Group Selected (Ctrl+G)"
            className="px-1.5 py-0.5 text-[10px] font-bold rounded-lg bg-[#84a92c]/20 text-[#84a92c] border border-[#84a92c]/40 hover:bg-[#84a92c]/30 transition-all cursor-pointer"
          >
            Group
          </button>
        )}

        {isGroupSelected && (
          <button
            onClick={onUngroup}
            title="Ungroup (Ctrl+Shift+G)"
            className="px-1.5 py-0.5 text-[10px] font-bold rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 transition-all cursor-pointer"
          >
            Ungroup
          </button>
        )}
      </div>

      {/* Alignment Actions Bar */}
      {selectedCount >= 2 && onAlign && (
        <div className="p-2 rounded-xl border space-y-1.5" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#84a92c] font-mono">
            Align & Distribute ({selectedCount} Selected)
          </p>
          <div className="flex items-center justify-between gap-1">
            <button onClick={() => onAlign('left')} title="Align Left" className="p-1 rounded hover:bg-slate-700/20 cursor-pointer text-xs font-mono">⇤L</button>
            <button onClick={() => onAlign('center-h')} title="Align Center H" className="p-1 rounded hover:bg-slate-700/20 cursor-pointer text-xs font-mono">⇥C⇤</button>
            <button onClick={() => onAlign('right')} title="Align Right" className="p-1 rounded hover:bg-slate-700/20 cursor-pointer text-xs font-mono">R⇥</button>
            <span className="opacity-30">|</span>
            <button onClick={() => onAlign('top')} title="Align Top" className="p-1 rounded hover:bg-slate-700/20 cursor-pointer text-xs font-mono">⤒T</button>
            <button onClick={() => onAlign('middle-v')} title="Align Middle V" className="p-1 rounded hover:bg-slate-700/20 cursor-pointer text-xs font-mono">⇕M</button>
            <button onClick={() => onAlign('bottom')} title="Align Bottom" className="p-1 rounded hover:bg-slate-700/20 cursor-pointer text-xs font-mono">⤓B</button>
            <span className="opacity-30">|</span>
            <button onClick={() => onAlign('dist-h')} title="Distribute Horizontally" className="p-1 rounded hover:bg-slate-700/20 cursor-pointer text-xs font-mono">↔H</button>
            <button onClick={() => onAlign('dist-v')} title="Distribute Vertically" className="p-1 rounded hover:bg-slate-700/20 cursor-pointer text-xs font-mono">↕V</button>
          </div>
        </div>
      )}

      {/* Toolbar Sub-Navigation Tabs */}
      <div className="grid grid-cols-3 gap-1 rounded-xl border p-1" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
        <button
          onClick={() => setActiveTab('elements')}
          className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'elements' ? 'bg-[#198754] text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Elements</span>
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'security' ? 'bg-[#198754] text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3 h-3 text-blue-400" />
          <span>Security</span>
        </button>
        <button
          onClick={() => setActiveTab('shapes')}
          className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'shapes' ? 'bg-[#198754] text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shapes className="w-3 h-3 text-[#84a92c]" />
          <span>Shapes</span>
        </button>
        <button
          onClick={() => setActiveTab('qr-barcode')}
          className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'qr-barcode' ? 'bg-[#198754] text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <QrCode className="w-3 h-3 text-purple-400" />
          <span>Codes</span>
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'data' ? 'bg-[#198754] text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FolderKanban className="w-3 h-3 text-emerald-400" />
          <span>Data Tags</span>
        </button>
        <button
          onClick={() => setActiveTab('graphics')}
          className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'graphics' ? 'bg-[#198754] text-white shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ImageIcon className="w-3 h-3 text-cyan-400" />
          <span>Assets</span>
        </button>
      </div>

      {/* TAB 1: CORE VECTOR ELEMENTS */}
      {activeTab === 'elements' && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>
            Text & Core Layout Elements
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => addHeading('Full Name Label', 24, 'bold', '#0f172a')}
              className="py-2.5 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <span className="font-serif font-bold text-sm">T</span>
              <span>Heading</span>
            </button>

            <button
              onClick={() => addSubtext('Department / Role', 16, '#475569')}
              className="py-2.5 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <span className="font-serif text-xs">t</span>
              <span>Subtext</span>
            </button>

            <button
              onClick={() => addMonoCode('ID-2026-0819', 14)}
              className="py-2.5 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <span className="font-mono font-bold text-xs">#01</span>
              <span>Mono Badge</span>
            </button>

            <button
              onClick={addLegalText}
              className="py-2.5 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <span className="text-[10px] font-mono">§</span>
              <span>Fine Print</span>
            </button>

            <button
              onClick={addPhotoBox}
              className="py-2.5 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span>Photo Box</span>
            </button>

            <button
              onClick={() => addPillTag('OFFICIAL PASS', '#10b981')}
              className="py-2.5 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <span className="w-3.5 h-2 bg-[#10b981] rounded-full inline-block" />
              <span>Status Pill</span>
            </button>

            <button
              onClick={() => addBannerRect('#0b131b', CARD.WIDTH_PX, 90, 'Header Banner')}
              className="py-2.5 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <span className="w-4 h-2 bg-current rounded-2xs inline-block" />
              <span>Banner</span>
            </button>

            <button
              onClick={() => addCardBox('#ffffff', 12, 280, 90)}
              className="py-2.5 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <span className="w-3.5 h-3.5 border border-current rounded-xs inline-block" />
              <span>Card Box</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: SECURITY, TECH & SMART ELEMENTS */}
      {activeTab === 'security' && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>
            Security, Chips & Holograms
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={addSmartChip}
              className="py-2.5 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-amber-400"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>EMV Gold Chip</span>
            </button>

            <button
              onClick={addHologramStrip}
              className="py-2.5 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-emerald-400"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Hologram Foil</span>
            </button>

            <button
              onClick={addRfidWaves}
              className="py-2.5 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-blue-400"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <Radio className="w-4 h-4 text-blue-400" />
              <span>RFID / NFC</span>
            </button>

            <button
              onClick={addOfficialStamp}
              className="py-2.5 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-red-400"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <Award className="w-4 h-4 text-red-400" />
              <span>Official Stamp</span>
            </button>

            <button
              onClick={addSecurityShield}
              className="py-2.5 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-blue-400"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>Security Shield</span>
            </button>

            <button
              onClick={addSignatureLine}
              className="py-2.5 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <PenTool className="w-4 h-4 text-[#84a92c]" />
              <span>Signature Line</span>
            </button>

            <button
              onClick={addGuillochePattern}
              className="py-2.5 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-teal-400 col-span-2"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <Layers className="w-4 h-4 text-teal-400" />
              <span>Guilloche Security Border Pattern</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: SHAPES, LINES & ACCENTS */}
      {activeTab === 'shapes' && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>
            Vector Shapes, Badges & Lines
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => addStarBadge(5, '#F59E0B')}
              className="py-2 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-amber-400"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <Star className="w-3.5 h-3.5 fill-current" />
              <span>5-Point Star</span>
            </button>

            <button
              onClick={() => addPolygon(6, '#3B82F6', 'Hexagon Badge')}
              className="py-2 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-blue-400"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <Hexagon className="w-3.5 h-3.5" />
              <span>Hexagon</span>
            </button>

            <button
              onClick={() => addCircleBadge('#10b981', 35)}
              className="py-2 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-emerald-400"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <span className="w-3.5 h-3.5 border-2 border-current rounded-full inline-block" />
              <span>Circle Badge</span>
            </button>

            <button
              onClick={() => addPolygon(3, '#EF4444', 'Warning Triangle')}
              className="py-2 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-red-400"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <Triangle className="w-3.5 h-3.5 fill-current" />
              <span>Triangle</span>
            </button>

            <button
              onClick={addSolidLine}
              className="py-2 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <span className="w-4 h-0.5 bg-current inline-block" />
              <span>Solid Line</span>
            </button>

            <button
              onClick={addDashedLine}
              className="py-2 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <Minus className="w-4 h-4 stroke-dasharray-2" />
              <span>Dashed Line</span>
            </button>

            <button
              onClick={addArrow}
              className="py-2 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>Arrow</span>
            </button>

            <button
              onClick={addCornerBrackets}
              className="py-2 px-2 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <span className="text-xs font-mono font-bold">[ ]</span>
              <span>Crop Marks</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: QR & BARCODE GENERATOR */}
      {activeTab === 'qr-barcode' && (
        <div className="space-y-4">
          {/* Live QR Generator */}
          <div className="p-3 rounded-xl border space-y-2.5" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#84a92c]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm8-2h7v7h-7V3zm2 2v3h3V5h-3zM3 13h7v7H3v-7zm2 2v3h3v-3H5zm13-2h3v3h-3v-3zm-5 0h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v3h-2v-3zm4 0h3v3h-3v-3z" />
              </svg>
              <span className="font-bold text-xs">Live QR Code Generator</span>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Payload / Link / Data Tag:</label>
              <input
                type="text"
                value={customQrPayload}
                onChange={e => setCustomQrPayload(e.target.value)}
                placeholder="e.g. {{id_number}} or https://verify..."
                className="w-full text-xs py-1.5 px-2.5 rounded-lg border font-mono"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              />
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {['{{id_number}}', '{{phone}}', '{{email}}', 'https://siliconlabs.internal'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setCustomQrPayload(tag)}
                  className="px-1.5 py-0.5 rounded text-[9px] font-mono border hover:border-[#84a92c]"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                >
                  {tag}
                </button>
              ))}
            </div>

            <button
              onClick={addCustomQr}
              className="w-full py-2 bg-[#198754] hover:bg-[#157347] text-white font-bold rounded-lg text-xs shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>+ Insert QR Code onto Canvas</span>
            </button>
          </div>

          {/* Barcode Generator */}
          <div className="p-3 rounded-xl border space-y-2.5" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-0.5 h-3 text-[#84a92c]">
                <span className="w-0.5 h-full bg-current" />
                <span className="w-1 h-full bg-current" />
                <span className="w-1.5 h-full bg-current" />
              </div>
              <span className="font-bold text-xs">Code 128 Barcode Generator</span>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Barcode Value:</label>
              <input
                type="text"
                value={customBarcodePayload}
                onChange={e => setCustomBarcodePayload(e.target.value)}
                placeholder="e.g. {{id_number}}"
                className="w-full text-xs py-1.5 px-2.5 rounded-lg border font-mono"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              />
            </div>

            <button
              onClick={addCustomBarcode}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>+ Insert Barcode onto Canvas</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: DYNAMIC DATA BINDINGS */}
      {activeTab === 'data' && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>
            Dynamic Personnel Fields (14+)
          </p>
          <div className="grid grid-cols-1 gap-1 max-h-80 overflow-y-auto pr-1">
            {DATA_FIELDS.map(f => (
              <button
                key={f.key}
                onClick={() => addDataField(f.key, f.label)}
                className="px-2.5 py-2 rounded-xl border text-left flex items-center justify-between text-xs transition-colors cursor-pointer hover:border-[#84a92c]"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              >
                <span className="font-semibold">{f.label}</span>
                <span className="font-mono text-[10px] text-[#84a92c] font-bold">{f.key}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: ASSETS & BRAND GRAPHICS */}
      {activeTab === 'graphics' && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>
            Logos & Custom Image Importer
          </p>

          <input
            ref={imageTemplateInputRef}
            type="file"
            accept=".svg,.png,.jpg,.jpeg,image/*"
            onChange={handleImageTemplateUpload}
            className="hidden"
          />

          <button
            onClick={() => imageTemplateInputRef.current?.click()}
            className="w-full py-2.5 px-3 border font-bold rounded-xl flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer hover:border-[#84a92c]"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
          >
            <svg className="w-4 h-4 text-[#84a92c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span>Upload Custom Image / Logo from PC</span>
          </button>

          <div className="grid grid-cols-1 gap-2 pt-1">
            <button
              onClick={() => addSiliconLabsHorizontalLogo('color')}
              className="p-2.5 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer hover:border-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <img src="/brand/silicon-labs-master-horizontal-web.png" alt="Silicon Labs Horizontal" className="h-6 w-auto object-contain" />
              <div>
                <p className="font-bold text-xs">Horizontal Color Logo</p>
                <p className="text-[10px] text-slate-500 font-mono">Master Web Variant</p>
              </div>
            </button>

            <button
              onClick={() => addSiliconLabsHorizontalLogo('white')}
              className="p-2.5 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer hover:border-[#84a92c] bg-slate-950"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              <img src="/brand/silicon-labs-white-reverse-horizontal.png" alt="Silicon Labs White" className="h-6 w-auto object-contain" />
              <div>
                <p className="font-bold text-xs text-white">White Reverse Logo</p>
                <p className="text-[10px] text-slate-400 font-mono">Dark Backgrounds</p>
              </div>
            </button>

            <button
              onClick={() => addSiliconLabsStackedLogo('color')}
              className="p-2.5 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer hover:border-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <img src="/brand/silicon-labs-stacked-color.png" alt="Silicon Labs Stacked" className="h-8 w-auto object-contain" />
              <div>
                <p className="font-bold text-xs">Stacked Color Logo</p>
                <p className="text-[10px] text-slate-500 font-mono">Vertical / Narrow Lockup</p>
              </div>
            </button>

            <button
              onClick={() => addSiliconLabsSymbolLogo('color')}
              className="p-2.5 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer hover:border-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <img src="/brand/silicon-labs-symbol-only.png" alt="Silicon Labs Symbol" className="h-7 w-7 object-contain" />
              <div>
                <p className="font-bold text-xs">Emblem Symbol Only</p>
                <p className="text-[10px] text-slate-500 font-mono">App Icon / Badge</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Save & Template Actions */}
      <div className="pt-3 border-t space-y-2" style={{ borderColor: 'var(--border-primary)' }}>
        <button
          onClick={onSave}
          disabled={saving}
          className="btn-primary w-full py-2.5 text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving Template…</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              <span>Save Vector Template</span>
            </>
          )}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json"
            onChange={handleJsonUpload}
            className="hidden"
          />
          <button
            onClick={() => jsonInputRef.current?.click()}
            className="py-1.5 px-2 rounded-xl border text-[11px] font-bold hover:opacity-80 transition-opacity cursor-pointer text-center"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
          >
            Import JSON
          </button>
          <button
            onClick={onExportTemplate}
            className="py-1.5 px-2 rounded-xl border text-[11px] font-bold hover:opacity-80 transition-opacity cursor-pointer text-center"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
          >
            Export JSON
          </button>
        </div>
      </div>
    </div>
  );
}
