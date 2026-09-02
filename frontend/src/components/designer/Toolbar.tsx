import React, { useState, useRef, useEffect, useCallback, startTransition } from 'react';
import { DATA_FIELDS, CARD } from '../../design-tokens';
import type { CanvasElement, CardTemplate } from '../../db/database';
import {
  CANVA_FRAMES,
  CanvaFrameThumbnail,
  type CanvaFrameDef,
  STANDARD_PHOTO_SIZES,
  StandardPhotoSizeCard,
  type StandardPhotoSizeDef,
} from './CanvaFrameIcons';
import { ABSTRACT_CORNER_GRAPHICS, type AbstractGraphicItem } from './AbstractCornerGraphics';
import { FONT_COMBINATIONS, fontManager, type FontCombination } from '../../services/fontManager';
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
  Cpu,
  Layers,
  Star,
  Hexagon,
  Triangle,
  ArrowRight,
  Minus,
  Heart,
  Cloud,
  Zap,
  MessageSquare,
  Grid,
  Box,
  Shield,
  CheckCircle2,
  Frame,
  Grid3X3,
  Crown,
  Fingerprint,
  Library,
  Trash2,
  Plus,
  Clipboard,
  Type,
  Search,
  Wand2,
  Hash,
  Upload,
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
  onSmartImportFile?: (file: File) => void;
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
  onSmartImportFile,
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
  const designFileInputRef = useRef<HTMLInputElement>(null);

  // Sub-tab in toolbar (Text, Shapes, Graphics, Frames, Grids, QR & Barcode, Data Fields, Library)
  const [activeTab, setActiveTab] = useState<'text' | 'elements' | 'shapes' | 'graphics' | 'frames' | 'grid' | 'qr-barcode' | 'data' | 'library'>('text');
  const [textSearchQuery, setTextSearchQuery] = useState('');
  const [isMagicWriteOpen, setIsMagicWriteOpen] = useState(false);
  const [graphicsCategory, setGraphicsCategory] = useState<'all' | 'corner' | 'wave' | 'geometric' | 'security'>('all');
  const [graphicsSearchQuery, setGraphicsSearchQuery] = useState('');

  // Saved presets from localStorage
  interface SavedPreset {
    id: string;
    name: string;
    elements: CanvasElement[];
    date: string;
  }
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [clipboardElements, setClipboardElements] = useState<CanvasElement[]>([]);

  // Add a Canva-style Font Combination Pair (Image 5)
  const addFontCombination = (combo: FontCombination) => {
    fontManager.ensureGoogleFontLoaded(combo.headingFamily);
    fontManager.ensureGoogleFontLoaded(combo.subheadingFamily);

    onAddElement({
      id: nextId('combo-head'),
      type: 'text',
      x: 40,
      y: 80,
      text: combo.title,
      fontFamily: combo.headingFamily,
      fontSize: combo.headingSize || 26,
      fontWeight: combo.headingWeight || 'bold',
      fill: combo.headingColor || '#0f172a',
      width: 260,
      opacity: 1,
      visible: true,
      locked: false,
      name: `${combo.title} (Heading)`,
    });

    onAddElement({
      id: nextId('combo-sub'),
      type: 'text',
      x: 40,
      y: 80 + (combo.headingSize || 26) + 12,
      text: combo.subtitle,
      fontFamily: combo.subheadingFamily,
      fontSize: combo.subheadingSize || 12,
      fontWeight: combo.subheadingWeight || 'normal',
      fill: combo.subheadingColor || '#64748b',
      width: 260,
      opacity: 1,
      visible: true,
      locked: false,
      name: `${combo.subtitle} (Subtext)`,
    });
  };

  const addTextBox = () => {
    onAddElement({
      id: nextId('text-box'),
      type: 'text',
      x: 50,
      y: 100,
      text: 'Your paragraph text goes here. Click to edit.',
      fontSize: 14,
      fontFamily: 'Inter',
      fill: '#1e293b',
      width: 240,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Text Box',
    });
  };

  const addPageNumbering = () => {
    onAddElement({
      id: nextId('page-num'),
      type: 'text',
      x: 260,
      y: 200,
      text: 'Page 1 of 1',
      fontSize: 11,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: '#64748b',
      width: 80,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Page Number',
    });
  };

  // Load presets and clipboard when library tab is active
  useEffect(() => {
    if (activeTab === 'library') {
      try {
        const raw = localStorage.getItem('siliconlabs_saved_elements');
        if (raw) setSavedPresets(JSON.parse(raw));
        else setSavedPresets([]);
      } catch { setSavedPresets([]); }
      try {
        const cb = localStorage.getItem('siliconlabs_card_clipboard');
        if (cb) setClipboardElements(JSON.parse(cb));
        else setClipboardElements([]);
      } catch { setClipboardElements([]); }
    }
  }, [activeTab]);

  const insertPreset = (preset: SavedPreset) => {
    preset.elements.forEach((el, i) => {
      onAddElement({
        ...el,
        id: nextId('preset'),
        x: (el.x || 20) + i * 5,
        y: (el.y || 20) + i * 5,
      });
    });
  };

  const deletePreset = (presetId: string) => {
    const updated = savedPresets.filter(p => p.id !== presetId);
    setSavedPresets(updated);
    localStorage.setItem('siliconlabs_saved_elements', JSON.stringify(updated));
  };

  const insertClipboard = () => {
    clipboardElements.forEach((el, i) => {
      onAddElement({
        ...el,
        id: nextId('clip'),
        x: (el.x || 20) + i * 5,
        y: (el.y || 20) + i * 5,
      });
    });
  };

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

  const addDiamond = (fill: string = '#2563EB') => {
    onAddElement({
      id: nextId('diamond'),
      type: 'diamond',
      x: 120,
      y: 120,
      width: 70,
      height: 70,
      fill,
      stroke: '#1D4ED8',
      strokeWidth: 1.5,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Security Diamond Emblem',
    });
  };

  const addEllipse = (fill: string = '#84a92c') => {
    onAddElement({
      id: nextId('ellipse'),
      type: 'ellipse',
      x: 100,
      y: 100,
      width: 140,
      height: 80,
      fill,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Horizontal Ellipse Oval',
    });
  };

  const addRing = (fill: string = '#10B981') => {
    onAddElement({
      id: nextId('ring'),
      type: 'ring',
      x: 120,
      y: 120,
      width: 80,
      height: 80,
      innerRadius: 25,
      fill,
      stroke: '#059669',
      strokeWidth: 1.5,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Security Seal Ring',
    });
  };

  const addTrapezoid = (fill: string = '#1e293b') => {
    onAddElement({
      id: nextId('trapezoid'),
      type: 'trapezoid',
      x: 60,
      y: 60,
      width: 160,
      height: 50,
      fill,
      stroke: '#84a92c',
      strokeWidth: 1.5,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Trapezoid Header Bar',
    });
  };

  const addChevron = (fill: string = '#D97706') => {
    onAddElement({
      id: nextId('chevron'),
      type: 'chevron',
      x: 80,
      y: 80,
      width: 140,
      height: 50,
      fill,
      stroke: '#B45309',
      strokeWidth: 1.5,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Chevron Authority Badge',
    });
  };

  const addRibbon = (fill: string = '#B91C1C') => {
    onAddElement({
      id: nextId('ribbon'),
      type: 'ribbon',
      x: 60,
      y: 60,
      width: 180,
      height: 45,
      fill,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Official Ribbon Banner',
    });
  };

  const addCallout = (fill: string = '#0F766E') => {
    onAddElement({
      id: nextId('callout'),
      type: 'callout',
      x: 80,
      y: 80,
      width: 150,
      height: 65,
      fill,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Security Note Callout',
    });
  };

  const addCross = (fill: string = '#DC2626') => {
    onAddElement({
      id: nextId('cross'),
      type: 'cross',
      x: 100,
      y: 100,
      width: 60,
      height: 60,
      fill,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Medical / Safety Cross',
    });
  };

  const addRect = (fill: string = '#3B82F6') => {
    onAddElement({
      id: nextId('rect'),
      type: 'rect',
      x: 60,
      y: 60,
      width: 120,
      height: 80,
      fill,
      cornerRadius: 8,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Rectangle',
    });
  };

  const addCircle = (fill: string = '#10B981') => {
    onAddElement({
      id: nextId('circle'),
      type: 'circle',
      x: 80,
      y: 80,
      radius: 45,
      width: 90,
      height: 90,
      fill,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Circle',
    });
  };

  const addPill = (fill: string = '#84a92c') => {
    onAddElement({
      id: nextId('pill'),
      type: 'pill',
      x: 60,
      y: 80,
      width: 140,
      height: 40,
      fill,
      cornerRadius: 20,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Pill / Capsule',
    });
  };

  const addHeart = (fill: string = '#E11D48') => {
    onAddElement({
      id: nextId('heart'),
      type: 'heart',
      x: 100,
      y: 100,
      width: 70,
      height: 70,
      fill,
      stroke: '#BE123C',
      strokeWidth: 1.5,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Heart Motif',
    });
  };

  const addCloud = (fill: string = '#38BDF8') => {
    onAddElement({
      id: nextId('cloud'),
      type: 'cloud',
      x: 100,
      y: 100,
      width: 90,
      height: 60,
      fill,
      stroke: '#0284C7',
      strokeWidth: 1.5,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Cloud Icon',
    });
  };

  const addLightning = (fill: string = '#FBBF24') => {
    onAddElement({
      id: nextId('lightning'),
      type: 'lightning',
      x: 120,
      y: 100,
      width: 50,
      height: 80,
      fill,
      stroke: '#D97706',
      strokeWidth: 1.5,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Lightning Bolt',
    });
  };

  const addSpeechBubble = (fill: string = '#0EA5E9') => {
    onAddElement({
      id: nextId('speech'),
      type: 'speechBubble',
      x: 80,
      y: 80,
      width: 140,
      height: 60,
      fill,
      stroke: '#0284C7',
      strokeWidth: 1.5,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Speech Bubble',
    });
  };

  const addParallelogram = (fill: string = '#6366F1') => {
    onAddElement({
      id: nextId('para'),
      type: 'parallelogram',
      x: 80,
      y: 80,
      width: 120,
      height: 50,
      fill,
      stroke: '#4F46E5',
      strokeWidth: 1.5,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Parallelogram Tag',
    });
  };

  const addSemiCircle = (fill: string = '#84a92c') => {
    onAddElement({
      id: nextId('semi'),
      type: 'semiCircle',
      x: 100,
      y: 100,
      width: 80,
      height: 40,
      fill,
      stroke: '#65821e',
      strokeWidth: 1.5,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Semi-Circle Arch',
    });
  };

  const addCrescent = (fill: string = '#F59E0B') => {
    onAddElement({
      id: nextId('crescent'),
      type: 'crescent',
      x: 100,
      y: 100,
      width: 60,
      height: 60,
      fill,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Crescent Motif',
    });
  };

  const addShield3D = () => {
    onAddElement({
      id: nextId('shield3d'),
      type: 'shield3d',
      x: 80,
      y: 80,
      width: 90,
      height: 110,
      opacity: 1,
      visible: true,
      locked: false,
      name: '3D Security Shield',
    });
  };

  const addStar3D = () => {
    onAddElement({
      id: nextId('star3d'),
      type: 'star3d',
      x: 100,
      y: 100,
      width: 70,
      height: 70,
      opacity: 1,
      visible: true,
      locked: false,
      name: '3D Faceted Star',
    });
  };

  const addBadge3D = () => {
    onAddElement({
      id: nextId('badge3d'),
      type: 'badge3d',
      x: 100,
      y: 100,
      width: 80,
      height: 80,
      opacity: 1,
      visible: true,
      locked: false,
      name: '3D Metallic Medal',
    });
  };

  const addOfficialSeal = () => {
    onAddElement({
      id: nextId('seal'),
      type: 'stamp',
      x: CARD.WIDTH_PX - 160,
      y: 260,
      width: 100,
      height: 100,
      stroke: '#DC2626',
      opacity: 0.9,
      visible: true,
      locked: false,
      name: 'Official Seal Stamp',
    });
  };

  const addCheckBadge = () => {
    onAddElement({
      id: nextId('chk-badge'),
      type: 'badgeShield',
      x: 60,
      y: 60,
      width: 75,
      height: 90,
      fill: '#059669',
      stroke: '#10B981',
      strokeWidth: 2,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Verified Security Shield',
    });
  };

  const addPhotoFrame = (preset: 'circle' | 'hexagon' | 'shield' | 'rounded', name: string) => {
    onAddElement({
      id: nextId('photo-frame'),
      type: 'photo',
      shapePreset: preset,
      isCircle: preset === 'circle',
      x: 40,
      y: 130,
      width: preset === 'circle' ? 160 : 170,
      height: preset === 'circle' ? 160 : 210,
      dataField: '{{photo}}',
      fill: '#1e293b',
      cornerRadius: preset === 'rounded' ? 12 : 0,
      stroke: '#84a92c',
      strokeWidth: 2,
      opacity: 1,
      visible: true,
      locked: false,
      name,
    });
  };

  const addCanvaFrame = (frame: CanvaFrameDef) => {
    onAddElement({
      id: nextId('photo-frame'),
      type: 'photo',
      isFrame: true,
      frameShape: frame.id,
      shapePreset: frame.id === 'frame-circle' ? 'circle' : (frame.id === 'frame-arch' ? 'arch' : (frame.id === 'frame-shield' ? 'shield' : (frame.id === 'frame-hexagon' ? 'hexagon' : (frame.id === 'frame-heart' ? 'heart' : (frame.id === 'frame-diamond' ? 'diamond' : 'rounded'))))),
      isCircle: frame.id === 'frame-circle',
      x: 50,
      y: 60,
      width: frame.defaultWidth,
      height: frame.defaultHeight,
      cornerRadius: frame.cornerRadius || 12,
      stroke: '#84a92c',
      strokeWidth: 2,
      opacity: 1,
      visible: true,
      locked: false,
      name: frame.name,
      dataField: '{{photo}}',
    });
  };

  const addStandardPhotoFrame = (photoDef: StandardPhotoSizeDef) => {
    onAddElement({
      id: nextId('photo-frame'),
      type: 'photo',
      isFrame: true,
      frameShape: photoDef.shape === 'circle' ? 'frame-circle' : (photoDef.shape === 'arch' ? 'frame-arch' : 'frame-squircle'),
      shapePreset: photoDef.shape,
      isCircle: photoDef.shape === 'circle',
      x: 40,
      y: 40,
      width: photoDef.width,
      height: photoDef.height,
      radius: photoDef.shape === 'circle' ? photoDef.width / 2 : undefined,
      cornerRadius: photoDef.cornerRadius || 8,
      stroke: '#84a92c',
      strokeWidth: 2,
      opacity: 1,
      visible: true,
      locked: false,
      name: `${photoDef.name} Slot`,
      dataField: '{{photo}}',
    });
  };


  const addTextureGrid = (type: 'securityGrid' | 'guilloche', stroke: string, name: string) => {
    onAddElement({
      id: nextId('grid'),
      type,
      x: 40,
      y: 350,
      width: 280,
      height: 100,
      stroke,
      strokeWidth: 1,
      opacity: 0.7,
      visible: true,
      locked: false,
      name,
    });
  };

  const addCategoryBadge = (title: string, fill: string) => {
    onAddElement({
      id: nextId('badge-cat'),
      type: 'pill',
      x: 50,
      y: 50,
      width: 120,
      height: 28,
      fill,
      text: title,
      fontSize: 11,
      opacity: 1,
      visible: true,
      locked: false,
      name: `${title} Badge`,
    });
  };

  const addOctagon = (fill: string = '#7C3AED') => {
    onAddElement({
      id: nextId('octagon'),
      type: 'octagon',
      x: 100,
      y: 100,
      width: 80,
      height: 80,
      sides: 8,
      fill,
      stroke: '#6D28D9',
      strokeWidth: 1.5,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Octagon Security Frame',
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
  const addDataField = useCallback((fieldKey: string, label: string) => {
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

    startTransition(() => {
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
    });
  }, [onAddElement, addPhotoBox, addCustomQr, addCustomBarcode]);

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

      {/* Toolbar Sub-Navigation Tabs (Clean Modern Canva Style - Brand Colors) */}
      <div className="grid grid-cols-4 gap-1 rounded-xl border p-1" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
        <button
          onClick={() => setActiveTab('text')}
          className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'text' ? 'bg-[#84a92c] text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Type className="w-3 h-3 text-[#84a92c]" />
          <span>Text</span>
        </button>
        <button
          onClick={() => setActiveTab('shapes')}
          className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'shapes' ? 'bg-[#84a92c] text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shapes className="w-3 h-3 text-[#84a92c]" />
          <span>Shapes</span>
        </button>
        <button
          onClick={() => setActiveTab('frames')}
          className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'frames' ? 'bg-[#84a92c] text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Frame className="w-3 h-3 text-[#84a92c]" />
          <span>Frames</span>
        </button>
        <button
          onClick={() => setActiveTab('graphics')}
          className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'graphics' ? 'bg-[#84a92c] text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3 h-3 text-blue-400" />
          <span>Graphics</span>
        </button>
        <button
          onClick={() => setActiveTab('qr-barcode')}
          className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'qr-barcode' ? 'bg-[#84a92c] text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <QrCode className="w-3 h-3 text-pink-400" />
          <span>Codes</span>
        </button>
        <button
          onClick={() => setActiveTab('data')}
          className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
            activeTab === 'data' ? 'bg-[#84a92c] text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FolderKanban className="w-3 h-3 text-emerald-400" />
          <span>Tags</span>
        </button>
        <button
          onClick={() => setActiveTab('library')}
          className={`py-1.5 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 col-span-2 ${
            activeTab === 'library' ? 'bg-[#84a92c] text-slate-950 shadow-xs' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Library className="w-3 h-3 text-orange-400" />
          <span>Template Library</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXACT CANVA TEXT STUDIO TAB (Brand Colored) */}
      {/* ========================================================================= */}
      {(activeTab === 'text' || activeTab === 'elements') && (
        <div className="space-y-4 animate-fade-in">
          {/* 1. Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={textSearchQuery}
              onChange={e => setTextSearchQuery(e.target.value)}
              placeholder="Search fonts and combinations"
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#84a92c] transition-all"
            />
          </div>

          {/* 2. Big Green "Add a text box" Button */}
          <button
            onClick={addTextBox}
            className="w-full py-2.5 px-4 rounded-xl bg-[#84a92c] hover:bg-[#9fe870] text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg hover:shadow-lime-500/25 transition-all cursor-pointer"
          >
            <Type className="w-4 h-4" />
            <span>Add a text box</span>
          </button>

          {/* 3. Magic Write Button */}
          <div className="relative">
            <button
              onClick={() => setIsMagicWriteOpen(!isMagicWriteOpen)}
              className="w-full py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/20 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <Wand2 className="w-3.5 h-3.5 text-[#84a92c] animate-pulse" />
              <span>Magic Write</span>
            </button>

            {isMagicWriteOpen && (
              <div className="p-3 bg-[#18191b] border border-slate-700 shadow-2xl rounded-2xl text-white space-y-2 mt-2 z-30 animate-fade-in">
                <p className="text-[11px] font-bold text-slate-300">Quick AI Text Generator</p>
                <div className="space-y-1">
                  {[
                    { label: 'Executive Cardholder Name', val: 'DR. ALEXANDRA VANCE' },
                    { label: 'Department & Title', val: 'Director of Advanced Research & AI' },
                    { label: 'Security Clearance Disclaimer', val: 'AUTHORIZED ACCESS ONLY • NON-TRANSFERABLE • LEVEL-4 SECURITY' },
                    { label: 'Ethiopian Official Header', val: 'የኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ' },
                    { label: 'Emergency Hotline', val: '24/7 Security Dispatch: +1 (800) 555-0199' },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        addHeading(preset.val, 16, 'bold', '#0f172a');
                        setIsMagicWriteOpen(false);
                      }}
                      className="w-full text-left p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-slate-200 hover:text-[#9fe870] transition-colors truncate"
                    >
                      ✦ {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Default Text Styles */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase font-mono">
              Default text styles
            </p>

            {/* Heading Card */}
            <button
              onClick={() => addHeading('Add a heading', 28, 'bold', '#0f172a')}
              className="w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#84a92c] transition-all text-left group cursor-pointer shadow-sm"
            >
              <span className="text-lg font-black tracking-tight text-white block group-hover:text-[#9fe870] transition-colors">
                Add a heading
              </span>
            </button>

            {/* Subheading Card */}
            <button
              onClick={() => addSubtext('Add a subheading', 18, '#334155')}
              className="w-full p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#84a92c] transition-all text-left group cursor-pointer shadow-sm"
            >
              <span className="text-sm font-bold text-slate-200 block group-hover:text-[#9fe870] transition-colors">
                Add a subheading
              </span>
            </button>

            {/* Body Text Card */}
            <button
              onClick={() => addSubtext('Add a little bit of body text', 13, '#64748b')}
              className="w-full p-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#84a92c] transition-all text-left group cursor-pointer shadow-sm"
            >
              <span className="text-xs text-slate-300 block group-hover:text-[#9fe870] transition-colors">
                Add a little bit of body text
              </span>
            </button>
          </div>

          {/* 6. Dynamic Text (Image 5) */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-400 uppercase font-mono">
              Dynamic text
            </p>
            <button
              onClick={addPageNumbering}
              className="w-full p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/50 transition-all flex items-center gap-3 text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center font-bold font-mono text-white text-xs shadow-md">
                1 2
              </div>
              <div>
                <p className="font-bold text-xs text-white">Page numbers</p>
                <p className="text-[10px] text-slate-400">Auto-incrementing card side & serials</p>
              </div>
            </button>
          </div>

          {/* 7. Font Combinations & Typography Cards (Image 5 Exact Clone) */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-300 font-mono uppercase">
                Font combinations
              </p>
              <span className="text-[10px] text-slate-400">Popular</span>
            </div>

            <div className="space-y-2.5">
              {FONT_COMBINATIONS.filter(c =>
                !textSearchQuery ||
                c.title.toLowerCase().includes(textSearchQuery.toLowerCase()) ||
                c.subtitle.toLowerCase().includes(textSearchQuery.toLowerCase())
              ).map(combo => (
                <button
                  key={combo.id}
                  onClick={() => addFontCombination(combo)}
                  className="w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-[#84a92c] transition-all text-left group cursor-pointer space-y-1 shadow-md"
                >
                  <p
                    className="text-base font-extrabold text-white group-hover:text-[#9fe870] transition-colors leading-tight"
                    style={{ fontFamily: combo.headingFamily }}
                  >
                    {combo.title}
                  </p>
                  <p
                    className="text-[11px] text-slate-300 tracking-wider uppercase font-semibold"
                    style={{ fontFamily: combo.subheadingFamily }}
                  >
                    {combo.subtitle}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[9px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.5 rounded">
                      {combo.headingFamily} + {combo.subheadingFamily}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* TAB 2: MODERN CANVA-STYLE VECTOR SHAPES */}
      {activeTab === 'shapes' && (
        <div className="space-y-4">
          {/* Lines & Connectors */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">
              Lines & Connectors
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={addSolidLine}
                className="py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)]"
                title="Solid Line"
              >
                <span className="w-8 h-0.5 bg-current inline-block rounded-full" />
                <span className="text-[10px] font-semibold">Solid</span>
              </button>

              <button
                onClick={addDashedLine}
                className="py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] text-[#84a92c]"
                title="Dashed Line"
              >
                <span className="w-8 h-0.5 border-b-2 border-dashed border-current inline-block" />
                <span className="text-[10px] font-semibold">Dashed</span>
              </button>

              <button
                onClick={addArrow}
                className="py-2.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] text-sky-400"
                title="Arrow"
              >
                <ArrowRight className="w-4 h-4" />
                <span className="text-[10px] font-semibold">Arrow</span>
              </button>
            </div>
          </div>

          {/* Basic Geometries */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">
              Basic Shapes
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {/* Square / Rectangle */}
              <button
                onClick={() => addRect('#3B82F6')}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="Rectangle / Square"
              >
                <div className="w-6 h-6 rounded-md bg-blue-500/80 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold truncate">Square</span>
              </button>

              {/* Circle */}
              <button
                onClick={() => addCircle('#10B981')}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="Circle"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500/80 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold truncate">Circle</span>
              </button>

              {/* Pill / Capsule */}
              <button
                onClick={() => addPill('#84a92c')}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="Pill / Stadium"
              >
                <div className="w-7 h-4 rounded-full bg-[#84a92c] group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold truncate">Pill</span>
              </button>

              {/* Ellipse Oval */}
              <button
                onClick={() => addEllipse('#8B5CF6')}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="Ellipse Oval"
              >
                <div className="w-7 h-4 rounded-full bg-purple-500/80 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold truncate">Ellipse</span>
              </button>
            </div>
          </div>

          {/* Polygons (Sides & Corner Modifier Support) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">
                Polygons & Geometrics
              </p>
              <span className="text-[9px] font-mono text-[#84a92c]">Modifiable sides</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {/* Triangle (3 sides) */}
              <button
                onClick={() => addPolygon(3, '#EF4444', 'Triangle')}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="Triangle (3 sides)"
              >
                <Triangle className="w-6 h-6 text-red-500 fill-current group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold truncate">Triangle</span>
              </button>

              {/* Diamond (4 sides) */}
              <button
                onClick={() => addDiamond('#2563EB')}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="Diamond"
              >
                <div className="w-5 h-5 rounded-xs bg-indigo-500/80 rotate-45 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold truncate">Diamond</span>
              </button>

              {/* Hexagon (6 sides) */}
              <button
                onClick={() => addPolygon(6, '#3B82F6', 'Hexagon')}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="Hexagon (6 sides)"
              >
                <Hexagon className="w-6 h-6 text-blue-500 fill-current group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold truncate">Hexagon</span>
              </button>

              {/* Octagon (8 sides) */}
              <button
                onClick={() => addOctagon('#7C3AED')}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="Octagon (8 sides)"
              >
                <div className="w-5 h-5 rounded-xs bg-purple-600 border border-current rotate-45 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold truncate">Octagon</span>
              </button>

              {/* Trapezoid */}
              <button
                onClick={() => addTrapezoid('#0F766E')}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="Trapezoid"
              >
                <span className="w-6 h-3.5 bg-teal-600 inline-block [clip-path:polygon(20%_0%,80%_0%,100%_100%,0%_100%)] group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold truncate">Trapezoid</span>
              </button>

              {/* Parallelogram */}
              <button
                onClick={() => addParallelogram('#6366F1')}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="Parallelogram"
              >
                <span className="w-6 h-3.5 bg-indigo-500 inline-block skew-x-12 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold truncate">Skew Rect</span>
              </button>

              {/* Semi-Circle */}
              <button
                onClick={() => addSemiCircle('#84a92c')}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="Semi-Circle"
              >
                <span className="w-6 h-3 rounded-t-full bg-[#84a92c] inline-block group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold truncate">Arch</span>
              </button>

              {/* Seal Ring */}
              <button
                onClick={() => addRing('#10B981')}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="Ring"
              >
                <span className="w-5 h-5 rounded-full border-3 border-emerald-500 inline-block group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold truncate">Ring</span>
              </button>
            </div>
          </div>

          {/* Decorative & Symbols */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider font-mono text-slate-400">
              Symbols & Badges
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              <button
                onClick={() => addStarBadge(5, '#F59E0B')}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="5-Point Star"
              >
                <Star className="w-5 h-5 text-amber-400 fill-current group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold truncate">Star</span>
              </button>

              <button
                onClick={() => addHeart('#E11D48')}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="Heart"
              >
                <Heart className="w-5 h-5 text-rose-500 fill-current group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold truncate">Heart</span>
              </button>

              <button
                onClick={addSecurityShield}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="Shield"
              >
                <Shield className="w-5 h-5 text-blue-500 fill-current group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold truncate">Shield</span>
              </button>

              <button
                onClick={() => addCloud('#38BDF8')}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="Cloud"
              >
                <Cloud className="w-5 h-5 text-sky-400 fill-current group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold truncate">Cloud</span>
              </button>

              <button
                onClick={() => addLightning('#FBBF24')}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="Lightning"
              >
                <Zap className="w-5 h-5 text-amber-300 fill-current group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold truncate">Lightning</span>
              </button>

              <button
                onClick={() => addSpeechBubble('#0EA5E9')}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="Speech Bubble"
              >
                <MessageSquare className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold truncate">Bubble</span>
              </button>

              <button
                onClick={() => addRibbon('#B91C1C')}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="Ribbon"
              >
                <span className="w-6 h-3 bg-red-600 rounded-2xs inline-block group-hover:scale-110 transition-transform" />
                <span className="text-[9px] font-semibold truncate">Ribbon</span>
              </button>

              <button
                onClick={() => addCross('#DC2626')}
                className="p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:border-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] group"
                title="Safety Cross"
              >
                <span className="text-base font-bold text-red-500 leading-none group-hover:scale-110 transition-transform">+</span>
                <span className="text-[9px] font-semibold truncate">Cross</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MODERN CANVA-STYLE VECTOR GRAPHICS (No burned-in random text) */}
      {activeTab === 'graphics' && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider font-mono text-slate-400">
            Vector Security & Graphical Badges
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={addOfficialSeal}
              className="p-2.5 rounded-xl border flex items-center gap-2 font-semibold transition-all cursor-pointer text-red-400 bg-[var(--bg-elevated)] border-[var(--border-primary)] hover:border-red-400"
              title="Official Authority Seal"
            >
              <Award className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span className="text-xs">Authority Seal</span>
            </button>

            <button
              onClick={addCheckBadge}
              className="p-2.5 rounded-xl border flex items-center gap-2 font-semibold transition-all cursor-pointer text-emerald-400 bg-[var(--bg-elevated)] border-[var(--border-primary)] hover:border-emerald-400"
              title="Verified Shield Badge"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-xs">Verified Shield</span>
            </button>

            <button
              onClick={addSmartChip}
              className="p-2.5 rounded-xl border flex items-center gap-2 font-semibold transition-all cursor-pointer text-amber-400 bg-[var(--bg-elevated)] border-[var(--border-primary)] hover:border-amber-400"
              title="EMV Gold Contact Chip"
            >
              <CreditCard className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-xs">EMV Smart Chip</span>
            </button>

            <button
              onClick={addHologramStrip}
              className="p-2.5 rounded-xl border flex items-center gap-2 font-semibold transition-all cursor-pointer text-emerald-300 bg-[var(--bg-elevated)] border-[var(--border-primary)] hover:border-emerald-400"
              title="Iridescent Hologram Strip"
            >
              <Sparkles className="w-4 h-4 text-emerald-300 flex-shrink-0" />
              <span className="text-xs">Hologram Foil</span>
            </button>

            <button
              onClick={addRfidWaves}
              className="p-2.5 rounded-xl border flex items-center gap-2 font-semibold transition-all cursor-pointer text-blue-400 bg-[var(--bg-elevated)] border-[var(--border-primary)] hover:border-blue-400"
              title="RFID / Contactless Icon"
            >
              <Radio className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span className="text-xs">RFID Contactless</span>
            </button>

            <button
              onClick={addSignatureLine}
              className="p-2.5 rounded-xl border flex items-center gap-2 font-semibold transition-all cursor-pointer text-[#84a92c] bg-[var(--bg-elevated)] border-[var(--border-primary)] hover:border-[#84a92c]"
              title="Vector Signature Line"
            >
              <PenTool className="w-4 h-4 text-[#84a92c] flex-shrink-0" />
              <span className="text-xs">Signature Line</span>
            </button>

            <button
              onClick={addGuillochePattern}
              className="p-2.5 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-teal-400 col-span-2 bg-[var(--bg-elevated)] border-[var(--border-primary)] hover:border-teal-400"
              title="Guilloche Security Pattern"
            >
              <Layers className="w-4 h-4 text-teal-400" />
              <span className="text-xs">Guilloche Security Wave</span>
            </button>

            <button
              onClick={addCornerBrackets}
              className="p-2.5 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-[#84a92c] col-span-2 bg-[var(--bg-elevated)] border-[var(--border-primary)] hover:border-[#84a92c]"
              title="Corner L-Crop Registration Marks"
            >
              <span className="text-xs font-mono font-bold">[ ]</span>
              <span className="text-xs">Corner L-Crop Registration Marks</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: STANDARD PHOTO SIZES & PHOTO FRAMES */}
      {activeTab === 'frames' && (
        <div className="space-y-4">
          {/* 1. Standard Photo Sizes Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider font-mono text-[#84a92c]">
                Standard Photo Sizes
              </p>
              <span className="text-[10px] text-slate-400 font-mono">Biometric & ID</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Select standard passport and ID card photo slots to place on your template:
            </p>

            <div className="space-y-2 pt-1">
              {STANDARD_PHOTO_SIZES.map(item => (
                <StandardPhotoSizeCard
                  key={item.id}
                  item={item}
                  onClick={() => addStandardPhotoFrame(item)}
                />
              ))}
            </div>
          </div>

          <hr style={{ borderColor: 'var(--border-primary)' }} />

          {/* 2. Geometric & Creative Mask Shapes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider font-mono text-slate-400">
                Custom Shapes & Masks ({CANVA_FRAMES.length})
              </p>
            </div>
            <p className="text-[10px] text-slate-400">
              Creative masks for ID emblems, shields, and custom badges.
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1">
              {CANVA_FRAMES.map(frame => (
                <CanvaFrameThumbnail
                  key={frame.id}
                  frame={frame}
                  onClick={() => addCanvaFrame(frame)}
                />
              ))}
            </div>
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
              <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Payload / Cardholder ID:</label>
              <input
                type="text"
                value={customBarcodePayload}
                onChange={e => setCustomBarcodePayload(e.target.value)}
                placeholder="e.g. {{id_number}}"
                className="w-full text-xs py-1.5 px-2.5 rounded-lg border font-mono"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              />
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {['{{id_number}}', '{{phone}}', 'ETH-2026-001'].map(tag => (
                <button
                  key={tag}
                  onClick={() => setCustomBarcodePayload(tag)}
                  className="px-1.5 py-0.5 rounded text-[9px] font-mono border hover:border-[#84a92c]"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                >
                  {tag}
                </button>
              ))}
            </div>

            <button
              onClick={addCustomBarcode}
              className="w-full py-2 bg-[#198754] hover:bg-[#157347] text-white font-bold rounded-lg text-xs shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>+ Insert Barcode onto Canvas</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: DYNAMIC DATA BINDINGS (Pulls all database folder fields dynamically) */}
      {activeTab === 'data' && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider font-mono text-[#84a92c]">
              Dynamic Data Tags
            </p>
            <span className="text-[10px] font-mono text-slate-400">Database Bound</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Click any tag to place it on the card. Real student/personnel values from folders will replace them dynamically during batch generation & studio preview:
          </p>

          <div className="grid grid-cols-1 gap-1.5 max-h-96 overflow-y-auto pr-1">
            {DATA_FIELDS.map(f => (
              <button
                key={f.key}
                onClick={() => addDataField(f.key, f.label)}
                className="px-3 py-2 rounded-xl border text-left flex items-center justify-between text-xs transition-all cursor-pointer hover:border-[#84a92c] hover:bg-[#84a92c]/10 group"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              >
                <span className="font-semibold text-slate-200 group-hover:text-white">{f.label}</span>
                <span className="font-mono text-[10px] text-[#84a92c] bg-[#84a92c]/15 px-1.5 py-0.5 rounded-md font-bold">{`{{${f.key}}}`}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: GRAPHICS & TRANSPARENT ID CARD OVERLAYS STUDIO (Image 1 & 5) */}
      {activeTab === 'graphics' && (
        <div className="space-y-4 animate-fade-in">
          {/* Header & Description */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase font-mono tracking-wider text-[#84a92c] block">
                Transparent Card Overlays & Graphics
              </span>
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                {ABSTRACT_CORNER_GRAPHICS.length} Vectors
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Modern transparent SVG overlays: wireframe grids, topographic curves, dynamic waves, 3D badges, and guilloche security ribbons.
            </p>
          </div>

          {/* Search & Category Filter Pills */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={graphicsSearchQuery}
                onChange={e => setGraphicsSearchQuery(e.target.value)}
                placeholder="Search overlays (grid, topo, wave, badge...)"
                className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-xl text-xs text-[var(--text-primary)] placeholder-slate-400 focus:outline-none focus:border-[#84a92c]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'all', label: 'All Overlays' },
                { id: 'geometric', label: 'Grids & Geometric' },
                { id: 'topo', label: 'Topo Curves' },
                { id: 'mesh', label: 'Waves & Meshes' },
                { id: 'badge', label: '3D Badges' },
                { id: 'corner', label: 'Angles & Corners' },
                { id: 'security', label: 'Guilloche Security' },
                { id: 'halftone', label: 'Halftone Dots' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setGraphicsCategory(cat.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    graphicsCategory === cat.id
                      ? 'bg-[#84a92c] text-slate-950 shadow-xs'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white border border-[var(--border-primary)]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Transparent Graphics Visual Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {ABSTRACT_CORNER_GRAPHICS
              .filter(g => {
                if (graphicsCategory !== 'all' && g.category !== graphicsCategory) return false;
                if (graphicsSearchQuery.trim()) {
                  const q = graphicsSearchQuery.toLowerCase();
                  return g.name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q);
                }
                return true;
              })
              .map(g => (
                <button
                  key={g.id}
                  onClick={() => {
                    onAddElement({
                      id: nextId('overlay'),
                      type: 'image',
                      x: 30,
                      y: 30,
                      width: g.defaultWidth,
                      height: g.defaultHeight,
                      src: g.svgDataUrl,
                      opacity: 1,
                      visible: true,
                      locked: false,
                      name: g.name,
                    });
                  }}
                  className="p-2 rounded-xl border flex flex-col items-center gap-2 text-left transition-all cursor-pointer hover:border-[#84a92c] group overflow-hidden"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                  }}
                  title={`Add ${g.name} (Transparent Vector Overlay)`}
                >
                  {/* Visual Preview Box with Dark Checkerboard Background */}
                  <div
                    className="w-full h-24 rounded-lg flex items-center justify-center p-2 relative overflow-hidden transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: '#0c121e',
                      backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)',
                      backgroundSize: '10px 10px',
                    }}
                  >
                    <img
                      src={g.svgDataUrl}
                      alt={g.name}
                      className="max-h-full max-w-full object-contain filter drop-shadow-md"
                    />
                  </div>

                  {/* Title & Dimension Subtitle */}
                  <div className="w-full min-w-0">
                    <span className="font-bold text-[11px] text-[var(--text-primary)] block group-hover:text-[#84a92c] transition-colors truncate">
                      {g.name}
                    </span>
                    <span className="text-[9px] text-[var(--text-muted)] font-mono block truncate">
                      {g.description}
                    </span>
                  </div>
                </button>
              ))}
          </div>

          {/* Section 3: Smart Multi-Format Importer */}
          <div className="pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
            <p className="text-[11px] font-bold uppercase tracking-wider font-mono mb-2" style={{ color: 'var(--text-muted)' }}>
              Smart Design & Asset Importer
            </p>

            {/* Smart Design File Input (AI, EPS, SVG, INDD, FIG, PSD, PNG, JPG, TIFF, GIF, PDF) */}
            <input
              ref={designFileInputRef}
              id="smart-design-file-input"
              data-testid="smart-design-file-input"
              type="file"
              accept=".ai,.eps,.svg,.ind,.indd,.fig,.psd,.png,.jpg,.jpeg,.tiff,.tif,.gif,.pdf"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  onSmartImportFile?.(file);
                }
                if (designFileInputRef.current) designFileInputRef.current.value = '';
              }}
              className="hidden"
            />

            <button
              id="smart-design-importer-btn"
              data-testid="smart-design-importer-btn"
              onClick={() => designFileInputRef.current?.click()}
              className="w-full py-3 px-3.5 border-2 border-dashed font-bold rounded-2xl flex flex-col items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer hover:border-[#84a92c] bg-[#84a92c]/10 text-white hover:bg-[#84a92c]/20"
              style={{ borderColor: '#84a92c' }}
            >
              <div className="flex items-center gap-2 text-[#84a92c]">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-black">Smart Design Importer & Token Binder</span>
              </div>
              <span className="text-[10px] text-slate-300 font-mono text-center">
                Upload Canva, Figma, PSD, AI, EPS, SVG or PNG to extract layers
              </span>
            </button>
          </div>

          {/* Quick Demo Test Actions for Instant Verification */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              id="test-warka-btn"
              data-testid="test-warka-btn"
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch('/samples/warka_sample_card.png');
                  const blob = await res.blob();
                  const file = new File([blob], 'warka_sample_card.png', { type: 'image/png' });
                  onSmartImportFile?.(file);
                } catch (e) {
                  console.error('Failed to load sample warka card:', e);
                }
              }}
              className="py-2 px-2 rounded-xl border border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-[10px] font-bold text-slate-200 flex items-center justify-center gap-1 cursor-pointer shadow-xs transition-all hover:border-[#84a92c]"
            >
              <span>🧪 Warka Card</span>
            </button>
            <button
              id="test-single-card-btn"
              data-testid="test-single-card-btn"
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch('/samples/single_card_sample.jpg');
                  const blob = await res.blob();
                  const file = new File([blob], 'single_card_sample.jpg', { type: 'image/jpeg' });
                  onSmartImportFile?.(file);
                } catch (e) {
                  console.error('Failed to load sample card:', e);
                }
              }}
              className="py-2 px-2 rounded-xl border border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-[10px] font-bold text-slate-200 flex items-center justify-center gap-1 cursor-pointer shadow-xs transition-all hover:border-[#84a92c]"
            >
              <span>🧪 8-Card Sheet</span>
            </button>
          </div>

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
            <ImageIcon className="w-4 h-4 text-[#84a92c]" />
            <span>Upload Simple Image / Logo</span>
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

      {/* TAB: SAVED COMPONENTS LIBRARY */}
      {activeTab === 'library' && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>
            Saved Components
          </p>

          {/* Clipboard Section */}
          {clipboardElements.length > 0 && (
            <div className="p-3 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clipboard className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-bold">Clipboard</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                    {clipboardElements.length} item{clipboardElements.length > 1 ? 's' : ''}
                  </span>
                </div>
                <button
                  onClick={insertClipboard}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Paste All
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {clipboardElements.map((el, i) => (
                  <span key={i} className="text-[9px] px-2 py-0.5 rounded-full font-mono" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                    {el.name || el.type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Saved Presets */}
          {savedPresets.length === 0 ? (
            <div className="text-center py-8">
              <Library className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No saved components yet</p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Select elements on canvas → click "Save Preset" in the toolbar
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {savedPresets.map(preset => (
                <div
                  key={preset.id}
                  className="p-3 rounded-xl border transition-all hover:border-[#84a92c]"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <p className="text-xs font-bold truncate max-w-[160px]">{preset.name}</p>
                      <p className="text-[9px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        {preset.elements.length} element{preset.elements.length > 1 ? 's' : ''} · {new Date(preset.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => insertPreset(preset)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-[#198754] text-white hover:bg-[#157347] transition-colors cursor-pointer"
                        title="Insert onto canvas"
                      >
                        <Plus className="w-3 h-3" />
                        Use
                      </button>
                      <button
                        onClick={() => deletePreset(preset.id)}
                        className="p-1 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
                        title="Delete preset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {preset.elements.slice(0, 6).map((el, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full font-mono" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                        {el.name || el.type}
                      </span>
                    ))}
                    {preset.elements.length > 6 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}>
                        +{preset.elements.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
