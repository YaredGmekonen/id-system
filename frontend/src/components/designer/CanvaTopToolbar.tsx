import React, { useState, useRef, useEffect } from 'react';
import type { CanvasElement } from '../../db/database';
import CanvaColorPickerModal, { type ColorSelection } from './CanvaColorPickerModal';
import { fontManager, type FontDefinition } from '../../services/fontManager';
import {
  Type,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  Sparkles,
  Sliders,
  Layers,
  ChevronDown,
  Plus,
  Minus,
  Copy,
  Scissors,
  Crop,
  Paintbrush,
  Pipette,
  Maximize2,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Move,
  CornerDownRight,
  Upload,
  Search,
  Check,
  Shapes,
} from 'lucide-react';

interface CanvaTopToolbarProps {
  selectedElement: CanvasElement | null;
  selectedIds: string[];
  elements: CanvasElement[];
  backgroundColor: string;
  onUpdateElement: (id: string, changes: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: () => void;
  onCutElement?: () => void;
  onCopyElement?: () => void;
  onPasteElement?: () => void;
  onCropElement?: () => void;
  onBringForward?: () => void;
  onSendBackward?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
  onAlign?: (type: 'left' | 'center-h' | 'right' | 'top' | 'middle-v' | 'bottom') => void;
}

export default function CanvaTopToolbar({
  selectedElement,
  selectedIds,
  elements,
  backgroundColor,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onCutElement,
  onCopyElement,
  onPasteElement,
  onCropElement,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
  onAlign,
}: CanvaTopToolbarProps) {
  // Popover States
  const [activePopover, setActivePopover] = useState<
    'color' | 'stroke' | 'fonts' | 'spacing' | 'opacity' | 'corner' | 'position' | 'effects' | 'curve' | null
  >(null);
  const [isIndependentCorners, setIsIndependentCorners] = useState(false);

  // Font Engine
  const [fonts, setFonts] = useState<FontDefinition[]>(() => fontManager.getAllFonts());
  const [fontSearch, setFontSearch] = useState('');
  const [fontCategoryFilter, setFontCategoryFilter] = useState<'all' | 'ethiopian' | 'custom' | 'sans-serif' | 'serif'>('all');
  const fontFileInputRef = useRef<HTMLInputElement>(null);

  // Format Painter (Copy / Paste Styles)
  const [copiedStyles, setCopiedStyles] = useState<Partial<CanvasElement> | null>(null);

  // Subscribe to font updates
  useEffect(() => {
    return fontManager.subscribe(() => {
      setFonts(fontManager.getAllFonts());
    });
  }, []);

  if (!selectedElement && selectedIds.length === 0) {
    return null;
  }

  const el = selectedElement || elements.find(e => selectedIds.includes(e.id)) || elements[0];
  if (!el) return null;

  const update = (changes: Partial<CanvasElement>) => {
    onUpdateElement(el.id, changes);
  };

  const isText = el.type === 'text' || el.type === 'dataField' || el.type === 'heading' || el.type === 'subtext' || el.type === 'mono';
  const isShape = !isText && el.type !== 'image' && el.type !== 'photo' && el.type !== 'qrCode' && el.type !== 'barcode';
  const isImageOrFrame = el.type === 'image' || el.type === 'photo' || el.isFrame;

  // Handle Format Painter
  const handleCopyStyle = () => {
    const styleToCopy: Partial<CanvasElement> = {
      fill: el.fill,
      fillType: el.fillType,
      gradientStart: el.gradientStart,
      gradientEnd: el.gradientEnd,
      gradientAngle: el.gradientAngle,
      gradientStops: el.gradientStops,
      stroke: el.stroke,
      strokeWidth: el.strokeWidth,
      dashPattern: el.dashPattern,
      opacity: el.opacity,
      fontFamily: el.fontFamily,
      fontSize: el.fontSize,
      fontStyle: el.fontStyle,
      fontWeight: el.fontWeight,
      letterSpacing: el.letterSpacing,
      lineHeight: el.lineHeight,
      cornerRadius: el.cornerRadius,
      shadowEnabled: el.shadowEnabled,
      shadowColor: el.shadowColor,
      shadowBlur: el.shadowBlur,
      shadowOffsetX: el.shadowOffsetX,
      shadowOffsetY: el.shadowOffsetY,
    };
    setCopiedStyles(styleToCopy);
  };

  const handlePasteStyle = () => {
    if (copiedStyles) {
      update(copiedStyles);
    }
  };

  // Font Kit Uploader Handler
  const handleUploadFont = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const newFont = await fontManager.uploadFontFile(files[0]);
      update({ fontFamily: newFont.family });
      setActivePopover(null);
    } catch (err) {
      console.error('Failed to load uploaded font:', err);
    }
  };

  // Color change dispatcher
  const handleColorChange = (selection: ColorSelection) => {
    if (selection.type === 'solid') {
      update({
        fill: selection.color,
        fillType: 'solid',
      });
    } else if (selection.type === 'transparent') {
      update({
        fill: 'transparent',
        fillType: 'solid',
      });
    } else if (selection.type === 'linear-gradient' || selection.type === 'radial-gradient') {
      update({
        fillType: selection.type,
        gradientStart: selection.gradientStart,
        gradientEnd: selection.gradientEnd,
        gradientAngle: selection.gradientAngle,
        gradientStops: selection.gradientStops,
      });
    }
  };

  // Filter fonts
  const filteredFonts = fonts.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(fontSearch.toLowerCase()) || f.family.toLowerCase().includes(fontSearch.toLowerCase());
    if (!matchesSearch) return false;
    if (fontCategoryFilter === 'all') return true;
    if (fontCategoryFilter === 'ethiopian') return f.category === 'ethiopian';
    if (fontCategoryFilter === 'custom') return f.isCustom === true;
    return f.category === fontCategoryFilter;
  });

  return (
    <div className="w-full flex items-center justify-between px-3 py-1.5 bg-[#ffffff]/95 dark:bg-[#18191b]/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl text-xs font-sans text-slate-800 dark:text-slate-100 z-50 select-none flex-wrap gap-1 transition-all overflow-visible relative">
      {/* LEFT SECTION: Element-Specific Context Controls */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* ========================================================================= */}
        {/* TEXT CONTROLS (Canva Image 2 Clone) */}
        {/* ========================================================================= */}
        {isText && (
          <>
            {/* Color Swatch / Indicator */}
            <div className="relative">
              <button
                onClick={() => setActivePopover(activePopover === 'color' ? null : 'color')}
                className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center hover:scale-105 transition-all shadow-2xs cursor-pointer relative overflow-hidden"
                style={{
                  backgroundColor: el.fill === 'transparent' ? 'transparent' : (el.fill || '#000000'),
                }}
                title="Text Color"
              >
                {el.fill === 'transparent' && (
                  <span className="absolute w-[140%] h-0.5 bg-red-500 rotate-45 transform origin-center" />
                )}
              </button>

              {/* Canva Color Popover Modal */}
              {activePopover === 'color' && (
                <div className="absolute top-10 left-0 z-50 animate-fade-in shadow-2xl">
                  <CanvaColorPickerModal
                    currentColor={el.fill || '#000000'}
                    currentFillType={el.fillType || 'solid'}
                    currentGradientStart={el.gradientStart}
                    currentGradientEnd={el.gradientEnd}
                    currentGradientAngle={el.gradientAngle}
                    currentGradientStops={el.gradientStops}
                    elements={elements}
                    backgroundColor={backgroundColor}
                    onChange={handleColorChange}
                    onClose={() => setActivePopover(null)}
                    isFloating={true}
                  />
                </div>
              )}
            </div>

            {/* Rainbow Picker Launcher */}
            <button
              onClick={() => setActivePopover(activePopover === 'color' ? null : 'color')}
              className="w-8 h-8 rounded-full border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center hover:scale-105 transition-all shadow-xs cursor-pointer"
              style={{
                background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
              }}
              title="Open Canva Palette & Gradients"
            >
              <div className="w-3.5 h-3.5 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center" />
            </button>

            {/* Font Family Dropdown */}
            <div className="relative">
              <button
                onClick={() => setActivePopover(activePopover === 'fonts' ? null : 'fonts')}
                className="h-8 px-3 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 border border-slate-300 dark:border-slate-700 flex items-center gap-2 font-medium max-w-[170px] truncate cursor-pointer"
                title="Font Family"
              >
                <span className="truncate">{el.fontFamily || 'Inter'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              </button>

              {/* Searchable Font Dropdown with Ethiopian Fonts & Font Kit Upload */}
              {activePopover === 'fonts' && (
                <div className="absolute top-10 left-0 w-80 max-h-96 rounded-2xl bg-[#18191b] border border-slate-700 shadow-2xl p-3 z-50 text-white space-y-2.5 animate-fade-in flex flex-col">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={fontSearch}
                      onChange={e => setFontSearch(e.target.value)}
                      placeholder="Search fonts (Amharic, Sans, Serif)..."
                      className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/15 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#84a92c]"
                    />
                  </div>

                  {/* Category Pills */}
                  <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'ethiopian', label: '🇪🇹 Ethiopian' },
                      { id: 'custom', label: '★ Custom Kit' },
                      { id: 'sans-serif', label: 'Sans' },
                      { id: 'serif', label: 'Serif' },
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setFontCategoryFilter(tab.id as any)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap cursor-pointer transition-colors ${
                          fontCategoryFilter === tab.id
                            ? 'bg-[#84a92c] text-slate-950'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Font Kit Upload Button */}
                  <button
                    onClick={() => fontFileInputRef.current?.click()}
                    className="w-full py-1.5 px-2.5 rounded-xl bg-[#84a92c]/15 hover:bg-[#84a92c]/25 border border-[#84a92c]/40 text-[#9fe870] font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Font Kit (.ttf, .otf, .woff)</span>
                  </button>
                  <input
                    ref={fontFileInputRef}
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    onChange={handleUploadFont}
                    className="hidden"
                  />

                  {/* Fonts List */}
                  <div className="flex-1 overflow-y-auto max-h-56 space-y-1 pr-1 no-scrollbar">
                    {filteredFonts.map(f => (
                      <button
                        key={f.id}
                        onClick={() => {
                          update({ fontFamily: f.family });
                          setActivePopover(null);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-xl border transition-all cursor-pointer flex flex-col gap-0.5 ${
                          el.fontFamily === f.family
                            ? 'bg-[#84a92c]/20 border-[#84a92c] text-white'
                            : 'bg-white/5 border-transparent hover:bg-white/10 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs">{f.name}</span>
                          {f.category === 'ethiopian' && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                              Ge'ez
                            </span>
                          )}
                          {f.isCustom && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300">
                              Custom
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 font-normal truncate" style={{ fontFamily: f.family }}>
                          {f.previewSample}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Font Size Stepper [- 16 +] */}
            <div className="flex items-center rounded-xl bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-slate-700 h-8 px-1">
              <button
                onClick={() => update({ fontSize: Math.max(6, (el.fontSize || 16) - 1) })}
                className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white rounded hover:bg-white/20 cursor-pointer"
                title="Decrease Font Size"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <input
                type="number"
                value={el.fontSize || 16}
                onChange={e => update({ fontSize: Math.max(6, Number(e.target.value)) })}
                className="w-10 text-center text-xs font-bold bg-transparent border-0 focus:outline-none text-slate-900 dark:text-white"
              />
              <button
                onClick={() => update({ fontSize: (el.fontSize || 16) + 1 })}
                className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white rounded hover:bg-white/20 cursor-pointer"
                title="Increase Font Size"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Text Color Button 'A' with color underline */}
            <button
              onClick={() => setActivePopover(activePopover === 'color' ? null : 'color')}
              className="h-8 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 flex flex-col items-center justify-center cursor-pointer relative"
              title="Text Color"
            >
              <span className="font-extrabold text-sm leading-none">A</span>
              <span
                className="w-4 h-1 rounded-full mt-0.5"
                style={{ backgroundColor: el.fill || '#000000' }}
              />
            </button>

            {/* B Bold */}
            <button
              onClick={() => {
                const isBold = el.fontStyle?.includes('bold') || el.fontWeight === 'bold';
                update({
                  fontStyle: isBold ? (el.fontStyle?.includes('italic') ? 'italic' : 'normal') : (el.fontStyle?.includes('italic') ? 'bold italic' : 'bold'),
                  fontWeight: isBold ? 'normal' : 'bold',
                });
              }}
              className={`w-8 h-8 rounded-xl border flex items-center justify-center font-bold transition-colors cursor-pointer ${
                el.fontStyle?.includes('bold') || el.fontWeight === 'bold'
                  ? 'bg-[#84a92c] text-slate-950 border-[#84a92c] shadow-xs'
                  : 'border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
              }`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>

            {/* I Italic */}
            <button
              onClick={() => {
                const isItalic = el.fontStyle?.includes('italic');
                update({
                  fontStyle: isItalic ? (el.fontStyle?.includes('bold') ? 'bold' : 'normal') : (el.fontStyle?.includes('bold') ? 'bold italic' : 'italic'),
                });
              }}
              className={`w-8 h-8 rounded-xl border flex items-center justify-center italic transition-colors cursor-pointer ${
                el.fontStyle?.includes('italic')
                  ? 'bg-[#84a92c] text-slate-950 border-[#84a92c] shadow-xs'
                  : 'border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
              }`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>

            {/* U Underline */}
            <button
              onClick={() => update({ underline: !el.underline, textDecoration: el.underline ? 'none' : 'underline' })}
              className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                el.underline || el.textDecoration === 'underline'
                  ? 'bg-[#84a92c] text-slate-950 border-[#84a92c] shadow-xs'
                  : 'border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
              }`}
              title="Underline (Ctrl+U)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>

            {/* S Strikethrough */}
            <button
              onClick={() => update({ strikethrough: !el.strikethrough })}
              className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                el.strikethrough
                  ? 'bg-[#84a92c] text-slate-950 border-[#84a92c] shadow-xs'
                  : 'border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
              }`}
              title="Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>

            {/* aA Case Toggle */}
            <button
              onClick={() => {
                const next = el.textTransform === 'uppercase' ? 'lowercase' : el.textTransform === 'lowercase' ? 'capitalize' : el.textTransform === 'capitalize' ? 'none' : 'uppercase';
                update({ textTransform: next });
              }}
              className="h-8 px-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-mono font-bold flex items-center justify-center cursor-pointer"
              title="Change Case (UPPERCASE / lowercase / Title Case)"
            >
              <span>aA</span>
            </button>

            {/* Alignment Button */}
            <button
              onClick={() => {
                const nextAlign = el.align === 'left' ? 'center' : el.align === 'center' ? 'right' : el.align === 'right' ? 'justify' : 'left';
                update({ align: nextAlign });
              }}
              className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 flex items-center justify-center cursor-pointer"
              title={`Alignment: ${el.align || 'left'}`}
            >
              {el.align === 'center' ? <AlignCenter className="w-3.5 h-3.5" /> : el.align === 'right' ? <AlignRight className="w-3.5 h-3.5" /> : el.align === 'justify' ? <AlignJustify className="w-3.5 h-3.5" /> : <AlignLeft className="w-3.5 h-3.5" />}
            </button>

            {/* List / Bullet Toggle */}
            <button
              onClick={() => {
                if (!el.text) return;
                const lines = el.text.split('\n');
                const hasBullets = lines.every(l => l.startsWith('• '));
                const newText = hasBullets
                  ? lines.map(l => l.replace(/^• /, '')).join('\n')
                  : lines.map(l => (l.trim() ? `• ${l}` : l)).join('\n');
                update({ text: newText });
              }}
              className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 flex items-center justify-center cursor-pointer"
              title="Toggle Bulleted List"
            >
              <List className="w-3.5 h-3.5" />
            </button>

            {/* Spacing & Line Height Modal */}
            <div className="relative">
              <button
                onClick={() => setActivePopover(activePopover === 'spacing' ? null : 'spacing')}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center cursor-pointer transition-colors ${
                  activePopover === 'spacing'
                    ? 'bg-[#84a92c] text-slate-950 border-[#84a92c]'
                    : 'border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                }`}
                title="Letter Spacing & Line Spacing"
              >
                <Move className="w-3.5 h-3.5" />
              </button>

              {activePopover === 'spacing' && (
                <div className="absolute top-10 left-0 w-64 p-3.5 rounded-2xl bg-[#18191b] border border-slate-700 shadow-2xl text-white space-y-3 z-50 animate-fade-in">
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                      <span>Letter Spacing:</span>
                      <span className="font-bold text-[#84a92c]">{el.letterSpacing || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="-5"
                      max="30"
                      step="0.5"
                      value={el.letterSpacing || 0}
                      onChange={e => update({ letterSpacing: Number(e.target.value) })}
                      className="w-full accent-[#84a92c] cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                      <span>Line Spacing:</span>
                      <span className="font-bold text-[#84a92c]">{el.lineHeight || 1.2}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={el.lineHeight || 1.2}
                      onChange={e => update({ lineHeight: Number(e.target.value) })}
                      className="w-full accent-[#84a92c] cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Text Curve / Arc Effect Button */}
            <div className="relative">
              <button
                onClick={() => setActivePopover(activePopover === 'curve' ? null : 'curve')}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center cursor-pointer transition-colors ${
                  el.curveAngle
                    ? 'bg-[#84a92c] text-slate-950 border-[#84a92c]'
                    : 'border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                }`}
                title="Curved Text / Arc"
              >
                <span className="text-xs font-bold">⌒</span>
              </button>

              {activePopover === 'curve' && (
                <div className="absolute top-10 left-0 w-60 p-3.5 rounded-2xl bg-[#18191b] border border-slate-700 shadow-2xl text-white space-y-3 z-50 animate-fade-in">
                  <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                    <span>Curve Arc:</span>
                    <span className="font-bold text-[#84a92c]">{el.curveAngle || 0}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="180"
                    step="5"
                    value={el.curveAngle || 0}
                    onChange={e => update({ curveAngle: Number(e.target.value) })}
                    className="w-full accent-[#84a92c] cursor-pointer"
                  />
                  <div className="flex justify-between">
                    <button
                      onClick={() => update({ curveAngle: 0 })}
                      className="text-[10px] text-slate-400 hover:text-white"
                    >
                      None
                    </button>
                    <button
                      onClick={() => update({ curveAngle: 90 })}
                      className="text-[10px] text-[#84a92c] hover:underline"
                    >
                      Semi-Circle (90°)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* SHAPE & VECTOR CONTROLS (Canva Image 3 Clone) */}
        {/* ========================================================================= */}
        {isShape && (
          <>
            {/* Color Bubble */}
            {/* 1. Fill Color Swatch Circle (Image 3) */}
            <div className="relative">
              <button
                onClick={() => setActivePopover(activePopover === 'color' ? null : 'color')}
                className="w-8 h-8 rounded-full border-2 border-white/20 hover:scale-105 transition-all shadow-md cursor-pointer relative overflow-hidden ring-2 ring-white/10"
                style={{
                  backgroundColor: el.fill === 'transparent' ? 'transparent' : (el.fill || '#84a92c'),
                }}
                title="Fill Color"
              >
                {el.fill === 'transparent' && (
                  <span className="absolute w-[140%] h-0.5 bg-red-500 rotate-45 transform origin-center" />
                )}
              </button>

              {/* Canva Color Popover Modal */}
              {activePopover === 'color' && (
                <div className="absolute top-10 left-0 z-50 animate-fade-in shadow-2xl">
                  <CanvaColorPickerModal
                    currentColor={el.fill || '#84a92c'}
                    currentFillType={el.fillType || 'solid'}
                    currentGradientStart={el.gradientStart}
                    currentGradientEnd={el.gradientEnd}
                    currentGradientAngle={el.gradientAngle}
                    currentGradientStops={el.gradientStops}
                    elements={elements}
                    backgroundColor={backgroundColor}
                    onChange={handleColorChange}
                    onClose={() => setActivePopover(null)}
                    isFloating={true}
                  />
                </div>
              )}
            </div>

            {/* 2. Border & Stroke Button [ ▢ 1px ] (Image 3) */}
            <div className="relative">
              <button
                onClick={() => setActivePopover(activePopover === 'stroke' ? null : 'stroke')}
                className={`h-8 px-2.5 rounded-xl border flex items-center gap-1.5 font-medium text-xs cursor-pointer transition-colors ${
                  activePopover === 'stroke'
                    ? 'bg-[#84a92c] text-slate-950 border-[#84a92c]'
                    : 'border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                }`}
                title="Border Style & Thickness"
              >
                <div className="w-3.5 h-3.5 border-2 border-current rounded-xs" />
                <span className="font-mono text-[11px] font-bold">{el.strokeWidth || 0}px</span>
              </button>

              {activePopover === 'stroke' && (
                <div className="absolute top-10 left-0 w-64 p-3.5 rounded-2xl bg-[#18191b] border border-slate-700 shadow-2xl text-white space-y-3 z-50 animate-fade-in">
                  <div>
                    <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                      <span>Border Thickness:</span>
                      <span className="font-bold text-[#84a92c]">{el.strokeWidth || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={el.strokeWidth || 0}
                      onChange={e => update({ strokeWidth: Number(e.target.value) })}
                      className="w-full accent-[#84a92c] cursor-pointer"
                    />
                  </div>

                  {/* Border Color */}
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-300">Border Color:</span>
                    <input
                      type="color"
                      value={el.stroke || '#000000'}
                      onChange={e => update({ stroke: e.target.value })}
                      className="w-7 h-7 rounded-lg border border-white/20 bg-transparent cursor-pointer"
                    />
                  </div>

                  {/* Border Style (Solid, Dashed, Dotted) */}
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => update({ dashPattern: undefined })}
                      className={`py-1 rounded text-[10px] font-mono border ${
                        !el.dashPattern ? 'bg-[#84a92c] text-slate-950 border-[#84a92c]' : 'bg-white/5 border-white/10 text-slate-300'
                      }`}
                    >
                      Solid
                    </button>
                    <button
                      onClick={() => update({ dashPattern: [8, 4] })}
                      className={`py-1 rounded text-[10px] font-mono border ${
                        el.dashPattern?.[0] === 8 ? 'bg-[#84a92c] text-slate-950 border-[#84a92c]' : 'bg-white/5 border-white/10 text-slate-300'
                      }`}
                    >
                      Dashed
                    </button>
                    <button
                      onClick={() => update({ dashPattern: [2, 4] })}
                      className={`py-1 rounded text-[10px] font-mono border ${
                        el.dashPattern?.[0] === 2 ? 'bg-[#84a92c] text-slate-950 border-[#84a92c]' : 'bg-white/5 border-white/10 text-slate-300'
                      }`}
                    >
                      Dotted
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ===================================================================== */}
            {/* CANVA SHAPE & CORNER MODIFIER TOOL (Image 3 exact clone!) */}
            {/* ===================================================================== */}
            <div className="relative">
              <button
                onClick={() => setActivePopover(activePopover === 'corner' ? null : 'corner')}
                className={`w-8 h-8 rounded-xl border flex items-center justify-center cursor-pointer transition-colors ${
                  activePopover === 'corner'
                    ? 'bg-[#84a92c] text-slate-950 border-[#84a92c]'
                    : 'border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                }`}
                title="Corner Rounding & Shape Sides Modifier"
              >
                {/* Canva Corner Rounding Icon */}
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M4 20V10a6 6 0 0 1 6-6h10" />
                  <circle cx="4" cy="20" r="1.5" fill="currentColor" />
                </svg>
              </button>

              {/* Popup with Corner rounding (0-100), Independent 4 Angles, and Sides (3-12) sliders */}
              {activePopover === 'corner' && (
                <div className="absolute top-10 left-0 w-72 p-4 rounded-2xl bg-white dark:bg-[#18191b] border border-slate-300 dark:border-slate-700 shadow-2xl text-slate-900 dark:text-white space-y-3.5 z-50 animate-fade-in font-sans">
                  {/* Corner Rounding Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Corner Rounding
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsIndependentCorners(!isIndependentCorners)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-all ${
                          isIndependentCorners
                            ? 'bg-[#84a92c] text-slate-950 border-[#84a92c]'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {isIndependentCorners ? '4 Angles' : 'Unified'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="300"
                        value={typeof el.cornerRadius === 'number' ? el.cornerRadius : 8}
                        onChange={e => {
                          const val = Number(e.target.value);
                          update({
                            cornerRadius: val,
                            radiusTL: val,
                            radiusTR: val,
                            radiusBR: val,
                            radiusBL: val,
                          });
                        }}
                        className="flex-1 accent-[#84a92c] cursor-pointer"
                      />
                      <div className="w-12 h-7 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-white/5 flex items-center justify-center font-mono text-xs font-bold">
                        {typeof el.cornerRadius === 'number' ? el.cornerRadius : 8}px
                      </div>
                    </div>
                  </div>

                  {/* Independent 4-Angle Corner Radius Inputs */}
                  {isIndependentCorners && (
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 space-y-2 animate-fade-in">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                        Per-Angle Roundness (px):
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] font-mono text-slate-400 block">Top-Left (TL):</label>
                          <input
                            type="number"
                            min="0"
                            max="500"
                            value={el.radiusTL ?? (typeof el.cornerRadius === 'number' ? el.cornerRadius : 8)}
                            onChange={e => update({ radiusTL: Number(e.target.value) })}
                            className="w-full h-7 px-2 text-xs font-bold rounded bg-slate-800 border border-slate-700 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-mono text-slate-400 block">Top-Right (TR):</label>
                          <input
                            type="number"
                            min="0"
                            max="500"
                            value={el.radiusTR ?? (typeof el.cornerRadius === 'number' ? el.cornerRadius : 8)}
                            onChange={e => update({ radiusTR: Number(e.target.value) })}
                            className="w-full h-7 px-2 text-xs font-bold rounded bg-slate-800 border border-slate-700 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-mono text-slate-400 block">Bottom-Right (BR):</label>
                          <input
                            type="number"
                            min="0"
                            max="500"
                            value={el.radiusBR ?? (typeof el.cornerRadius === 'number' ? el.cornerRadius : 8)}
                            onChange={e => update({ radiusBR: Number(e.target.value) })}
                            className="w-full h-7 px-2 text-xs font-bold rounded bg-slate-800 border border-slate-700 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-mono text-slate-400 block">Bottom-Left (BL):</label>
                          <input
                            type="number"
                            min="0"
                            max="500"
                            value={el.radiusBL ?? (typeof el.cornerRadius === 'number' ? el.cornerRadius : 8)}
                            onChange={e => update({ radiusBL: Number(e.target.value) })}
                            className="w-full h-7 px-2 text-xs font-bold rounded bg-slate-800 border border-slate-700 text-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sides Modifier Slider (3 to 12 polygon sides) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        Sides
                      </span>
                      <div className="w-10 h-7 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-white/5 flex items-center justify-center font-mono text-xs font-bold">
                        {el.sides ?? ((el.type as string) === 'triangle' ? 3 : el.type === 'hexagon' ? 6 : el.type === 'octagon' ? 8 : 4)}
                      </div>
                    </div>
                    <input
                      type="range"
                      min="3"
                      max="12"
                      value={el.sides ?? ((el.type as string) === 'triangle' ? 3 : el.type === 'hexagon' ? 6 : el.type === 'octagon' ? 8 : 4)}
                      onChange={e => {
                        const sides = Number(e.target.value);
                        update({
                          sides,
                          type: sides === 4 ? 'rect' : 'polygon',
                        });
                      }}
                      className="w-full accent-[#84a92c] cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* IMAGE & FRAME CONTROLS */}
        {/* ========================================================================= */}
        {isImageOrFrame && (
          <>
            {/* Crop Image Action */}
            {onCropElement && (
              <button
                onClick={onCropElement}
                className="h-8 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-white/10 hover:bg-[#84a92c] hover:text-slate-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all"
                title="Crop Image (Zoom & Frame)"
              >
                <Crop className="w-3.5 h-3.5" />
                <span>Crop</span>
              </button>
            )}

            {/* Detach Image (if frame) */}
            {el.isFrame && el.src && (
              <button
                onClick={() => update({ src: undefined })}
                className="h-8 px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                title="Detach image from frame"
              >
                <span>Detach Image</span>
              </button>
            )}

            {/* Corner rounding for images/frames */}
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-mono text-slate-400">Radius:</span>
              <input
                type="number"
                min="0"
                max="100"
                value={typeof el.cornerRadius === 'number' ? el.cornerRadius : 8}
                onChange={e => {
                  const val = Number(e.target.value);
                  update({
                    cornerRadius: val,
                    radiusTL: val,
                    radiusTR: val,
                    radiusBR: val,
                    radiusBL: val,
                  });
                }}
                className="w-12 h-8 text-center text-xs font-bold rounded-xl bg-slate-100 dark:bg-white/10 border border-slate-300 dark:border-slate-700"
              />
            </div>
          </>
        )}
      </div>

      {/* RIGHT SECTION: Common Canvas Actions (Opacity, Position, Cut, Copy, Duplicate, Delete) */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* Cut Button */}
        {onCutElement && (
          <button
            onClick={onCutElement}
            className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 flex items-center justify-center cursor-pointer"
            title="Cut (Ctrl+X)"
          >
            <Scissors className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Copy Button */}
        {onCopyElement && (
          <button
            onClick={onCopyElement}
            className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 flex items-center justify-center cursor-pointer"
            title="Copy (Ctrl+C)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
        {/* Transparency / Opacity Checkerboard Slider */}
        <div className="relative">
          <button
            onClick={() => setActivePopover(activePopover === 'opacity' ? null : 'opacity')}
            className={`w-8 h-8 rounded-xl border flex items-center justify-center cursor-pointer transition-colors ${
              activePopover === 'opacity'
                ? 'bg-[#84a92c] text-slate-950 border-[#84a92c]'
                : 'border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
            }`}
            title="Transparency"
          >
            <div className="w-4 h-4 rounded border border-current flex items-center justify-center overflow-hidden bg-[radial-gradient(#888_1px,transparent_1px)] [background-size:4px_4px]" />
          </button>

          {activePopover === 'opacity' && (
            <div className="absolute top-10 right-0 w-56 p-3.5 rounded-2xl bg-[#18191b] border border-slate-700 shadow-2xl text-white space-y-2 z-50 animate-fade-in">
              <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                <span>Transparency:</span>
                <span className="font-bold text-[#84a92c]">{Math.round((el.opacity ?? 1) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={el.opacity ?? 1}
                onChange={e => update({ opacity: Number(e.target.value) })}
                className="w-full accent-[#84a92c] cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Position Menu (Layers & Alignment) */}
        <div className="relative">
          <button
            onClick={() => setActivePopover(activePopover === 'position' ? null : 'position')}
            className={`h-8 px-2.5 rounded-xl border flex items-center gap-1 font-semibold text-xs cursor-pointer transition-colors ${
              activePopover === 'position'
                ? 'bg-[#84a92c] text-slate-950 border-[#84a92c]'
                : 'border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
            }`}
            title="Arrange Position & Layers"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Position</span>
          </button>

          {activePopover === 'position' && (
            <div className="absolute top-10 right-0 w-60 p-3 rounded-2xl bg-[#18191b] border border-slate-700 shadow-2xl text-white space-y-2.5 z-50 animate-fade-in">
              <p className="text-[10px] font-mono font-bold uppercase text-slate-400">Layer Order</p>
              <div className="grid grid-cols-2 gap-1.5">
                {onBringForward && (
                  <button
                    onClick={() => { onBringForward(); setActivePopover(null); }}
                    className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-left"
                  >
                    Forward
                  </button>
                )}
                {onSendBackward && (
                  <button
                    onClick={() => { onSendBackward(); setActivePopover(null); }}
                    className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-left"
                  >
                    Backward
                  </button>
                )}
                {onBringToFront && (
                  <button
                    onClick={() => { onBringToFront(); setActivePopover(null); }}
                    className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-left"
                  >
                    To Front
                  </button>
                )}
                {onSendToBack && (
                  <button
                    onClick={() => { onSendToBack(); setActivePopover(null); }}
                    className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-left"
                  >
                    To Back
                  </button>
                )}
              </div>

              {onAlign && (
                <>
                  <p className="text-[10px] font-mono font-bold uppercase text-slate-400 pt-1 border-t border-white/10">
                    Align to Card
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    <button onClick={() => { onAlign('left'); setActivePopover(null); }} className="py-1 px-1.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-center">Left</button>
                    <button onClick={() => { onAlign('center-h'); setActivePopover(null); }} className="py-1 px-1.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-center">Center</button>
                    <button onClick={() => { onAlign('right'); setActivePopover(null); }} className="py-1 px-1.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-center">Right</button>
                    <button onClick={() => { onAlign('top'); setActivePopover(null); }} className="py-1 px-1.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-center">Top</button>
                    <button onClick={() => { onAlign('middle-v'); setActivePopover(null); }} className="py-1 px-1.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-center">Middle</button>
                    <button onClick={() => { onAlign('bottom'); setActivePopover(null); }} className="py-1 px-1.5 rounded bg-white/5 hover:bg-white/10 text-[10px] text-center">Bottom</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Format Painter / Copy Style (Roller icon) */}
        <button
          onClick={copiedStyles ? handlePasteStyle : handleCopyStyle}
          className={`w-8 h-8 rounded-xl border flex items-center justify-center cursor-pointer transition-colors ${
            copiedStyles
              ? 'bg-[#84a92c] text-slate-950 border-[#84a92c] shadow-xs'
              : 'border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
          }`}
          title={copiedStyles ? 'Paste Copied Style onto Element' : 'Copy Style (Format Painter)'}
        >
          <Paintbrush className="w-3.5 h-3.5" />
        </button>

        {/* Duplicate Element */}
        <button
          onClick={onDuplicateElement}
          className="w-8 h-8 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 flex items-center justify-center cursor-pointer"
          title="Duplicate (Ctrl+D)"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        {/* Lock / Unlock Layer */}
        <button
          onClick={() => update({ locked: !el.locked })}
          className={`w-8 h-8 rounded-xl border flex items-center justify-center cursor-pointer transition-colors ${
            el.locked
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
          }`}
          title={el.locked ? 'Unlock element' : 'Lock element'}
        >
          {el.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
        </button>

        {/* Delete Element */}
        <button
          onClick={() => onDeleteElement(el.id)}
          className="w-8 h-8 rounded-xl border border-rose-300 dark:border-rose-900/40 text-rose-500 hover:bg-rose-500/10 flex items-center justify-center cursor-pointer"
          title="Delete (Delete / Backspace)"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
