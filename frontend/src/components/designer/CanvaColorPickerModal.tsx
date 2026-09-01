import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Pipette,
  X,
  Sliders,
  Check,
  Sparkles,
  Edit2,
  Trash2,
  RotateCw,
  Image as ImageIcon,
  Palette,
} from 'lucide-react';
import type { CanvasElement } from '../../db/database';

export interface GradientStop {
  offset: number; // 0.0 to 1.0
  color: string;
}

export interface ColorSelection {
  type: 'solid' | 'linear-gradient' | 'radial-gradient' | 'transparent';
  color?: string;
  gradientStart?: string;
  gradientEnd?: string;
  gradientAngle?: number;
  gradientStops?: GradientStop[];
}

interface CanvaColorPickerProps {
  currentColor?: string;
  currentFillType?: 'solid' | 'linear-gradient' | 'radial-gradient';
  currentGradientStart?: string;
  currentGradientEnd?: string;
  currentGradientAngle?: number;
  currentGradientStops?: GradientStop[];
  elements?: CanvasElement[];
  backgroundColor?: string;
  onChange: (selection: ColorSelection) => void;
  onClose?: () => void;
  title?: string;
  isFloating?: boolean;
}

// Canva Curated Default Solid Colors
const CANVA_SOLID_COLORS = [
  '#000000', '#2d3748', '#4a5568', '#718096', '#a0aec0', '#e2e8f0', '#ffffff',
  '#e53e3e', '#f56565', '#ed64a6', '#d53f8c', '#9f7aea', '#805ad5', '#6b46c1',
  '#3182ce', '#4299e1', '#63b3ed', '#00b4d8', '#0077b6', '#023e8a', '#1e3a8a',
  '#38a169', '#48bb78', '#68d391', '#84cc16', '#a3e635', '#facc15', '#eab308',
  '#f97316', '#fb923c', '#fdba74', '#c2410c', '#9a3412', '#78350f', '#451a03',
];

// Canva Curated Multi-Stop Default Gradients
const CANVA_GRADIENT_PRESETS: Array<{ name: string; angle: number; stops: GradientStop[] }> = [
  {
    name: 'Obsidian Black',
    angle: 135,
    stops: [
      { offset: 0, color: '#1e293b' },
      { offset: 1, color: '#020617' },
    ],
  },
  {
    name: 'Silver Steel',
    angle: 90,
    stops: [
      { offset: 0, color: '#f8fafc' },
      { offset: 0.5, color: '#cbd5e1' },
      { offset: 1, color: '#94a3b8' },
    ],
  },
  {
    name: 'Emerald Lime',
    angle: 135,
    stops: [
      { offset: 0, color: '#a3e635' },
      { offset: 0.5, color: '#4ade80' },
      { offset: 1, color: '#059669' },
    ],
  },
  {
    name: 'Golden Glow',
    angle: 45,
    stops: [
      { offset: 0, color: '#fef08a' },
      { offset: 0.5, color: '#f59e0b' },
      { offset: 1, color: '#b45309' },
    ],
  },
  {
    name: 'Sunset Magenta',
    angle: 135,
    stops: [
      { offset: 0, color: '#f43f5e' },
      { offset: 0.5, color: '#c026d3' },
      { offset: 1, color: '#4f46e5' },
    ],
  },
  {
    name: 'Deep Oceanic',
    angle: 180,
    stops: [
      { offset: 0, color: '#0284c7' },
      { offset: 0.5, color: '#1d4ed8' },
      { offset: 1, color: '#0f172a' },
    ],
  },
  {
    name: 'Cyber Neon',
    angle: 135,
    stops: [
      { offset: 0, color: '#06b6d4' },
      { offset: 0.5, color: '#8b5cf6' },
      { offset: 1, color: '#ec4899' },
    ],
  },
  {
    name: 'Warm Amber',
    angle: 90,
    stops: [
      { offset: 0, color: '#fed7aa' },
      { offset: 0.5, color: '#f97316' },
      { offset: 1, color: '#dc2626' },
    ],
  },
];

const BRAND_KIT_STORAGE_KEY = 'siliconlabs_brand_kit_palette';

export default function CanvaColorPickerModal({
  currentColor = '#84a92c',
  currentFillType = 'solid',
  currentGradientStart,
  currentGradientEnd,
  currentGradientAngle = 135,
  currentGradientStops,
  elements = [],
  backgroundColor = '#FFFFFF',
  onChange,
  onClose,
  title = 'Color',
  isFloating = false,
}: CanvaColorPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomPickerOpen, setIsCustomPickerOpen] = useState(false);
  const [pickerTab, setPickerTab] = useState<'solid' | 'gradient'>('solid');

  // Custom Color State
  const [customHex, setCustomHex] = useState(currentColor || '#84a92c');
  const [gradientAngle, setGradientAngle] = useState(currentGradientAngle || 135);
  const [gradientType, setGradientType] = useState<'linear-gradient' | 'radial-gradient'>('linear-gradient');
  const [gradientStops, setGradientStops] = useState<GradientStop[]>(() => {
    if (currentGradientStops && currentGradientStops.length >= 2) {
      return currentGradientStops;
    }
    return [
      { offset: 0, color: currentGradientStart || currentColor || '#3b82f6' },
      { offset: 1, color: currentGradientEnd || '#9333ea' },
    ];
  });
  const [activeStopIndex, setActiveStopIndex] = useState(0);

  // Brand Kit Storage
  const [brandColors, setBrandColors] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(BRAND_KIT_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return ['#84a92c', '#0f172a', '#1e3a8a', '#10b981', '#f59e0b', '#dc2626'];
  });
  const [isEditingBrandKit, setIsEditingBrandKit] = useState(false);

  // Photo Colors Extraction state
  interface ExtractedPhoto {
    id: string;
    name: string;
    thumbnail: string;
    colors: string[];
  }
  const [photoColorsList, setPhotoColorsList] = useState<ExtractedPhoto[]>([]);

  // 1. Extract "Colors in this design"
  const designColors = useMemo(() => {
    const set = new Set<string>();
    if (backgroundColor && backgroundColor !== 'transparent') set.add(backgroundColor.toLowerCase());

    elements.forEach(el => {
      if (el.fill && el.fill !== 'transparent') set.add(el.fill.toLowerCase());
      if (el.stroke && el.stroke !== 'transparent') set.add(el.stroke.toLowerCase());
      if (el.gradientStart) set.add(el.gradientStart.toLowerCase());
      if (el.gradientEnd) set.add(el.gradientEnd.toLowerCase());
      if (el.gradientStops) {
        el.gradientStops.forEach(s => set.add(s.color.toLowerCase()));
      }
      if (el.textBackground) set.add(el.textBackground.toLowerCase());
    });
    return Array.from(set).slice(0, 14);
  }, [elements, backgroundColor]);

  // 2. Real Extraction of Photo Colors from canvas images
  useEffect(() => {
    const photoEls = elements.filter(el => (el.type === 'image' || el.type === 'photo' || el.isFrame) && el.src);
    if (photoEls.length === 0) {
      // Default sample photo color palettes if none
      setPhotoColorsList([
        {
          id: 'sample-portrait',
          name: 'Personnel Photo',
          thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60',
          colors: ['#e2d7cc', '#8b6f58', '#4a3b32', '#9c8c7c', '#1e293b'],
        },
      ]);
      return;
    }

    const results: ExtractedPhoto[] = [];
    photoEls.forEach((el, index) => {
      if (!el.src) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          canvas.width = 30;
          canvas.height = 30;
          ctx.drawImage(img, 0, 0, 30, 30);
          const data = ctx.getImageData(0, 0, 30, 30).data;
          const colorSamples: string[] = [];

          // Sample pixels across image
          const sampleCoords = [
            [5, 5], [15, 10], [15, 15], [20, 20], [25, 25]
          ];
          sampleCoords.forEach(([x, y]) => {
            const idx = (y * 30 + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            colorSamples.push(hex);
          });

          results.push({
            id: el.id || `photo-${index}`,
            name: el.name || 'Personnel Photo',
            thumbnail: el.src || '',
            colors: colorSamples,
          });
          setPhotoColorsList([...results]);
        } catch {
          // Fallback if canvas extraction hits CORS
          results.push({
            id: el.id,
            name: el.name || 'Personnel Photo',
            thumbnail: el.src || '',
            colors: ['#3b82f6', '#10b981', '#f59e0b', '#64748b', '#0f172a'],
          });
          setPhotoColorsList([...results]);
        }
      };
      img.src = el.src;
    });
  }, [elements]);

  // Eyedropper API handler
  const handleEyedropper = async () => {
    if ('EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          applySolid(result.sRGBHex);
        }
      } catch (err) {
        console.log('Eyedropper cancelled or failed', err);
      }
    } else {
      alert('Eyedropper tool is supported in modern Chrome, Edge, and Opera browsers.');
    }
  };

  // Selection dispatchers
  const applySolid = (hex: string) => {
    setCustomHex(hex);
    onChange({
      type: 'solid',
      color: hex,
    });
  };

  const applyTransparent = () => {
    onChange({
      type: 'transparent',
      color: 'transparent',
    });
  };

  const applyGradient = (angle: number, stops: GradientStop[], type: 'linear-gradient' | 'radial-gradient' = 'linear-gradient') => {
    const start = stops[0]?.color || '#3b82f6';
    const end = stops[stops.length - 1]?.color || '#9333ea';
    onChange({
      type,
      gradientStart: start,
      gradientEnd: end,
      gradientAngle: angle,
      gradientStops: stops,
    });
  };

  // Helper for gradient CSS preview string
  const getGradientCss = (angle: number, stops: GradientStop[], type: 'linear-gradient' | 'radial-gradient' = 'linear-gradient') => {
    const stopsStr = stops.map(s => `${s.color} ${Math.round(s.offset * 100)}%`).join(', ');
    if (type === 'radial-gradient') {
      return `radial-gradient(circle, ${stopsStr})`;
    }
    return `linear-gradient(${angle}deg, ${stopsStr})`;
  };

  // Active current preview string
  const currentPreviewStyle = useMemo(() => {
    if (currentFillType === 'linear-gradient' || currentFillType === 'radial-gradient') {
      const stops = currentGradientStops && currentGradientStops.length >= 2
        ? currentGradientStops
        : [
            { offset: 0, color: currentGradientStart || '#3b82f6' },
            { offset: 1, color: currentGradientEnd || '#9333ea' },
          ];
      return { background: getGradientCss(currentGradientAngle || 135, stops, currentFillType) };
    }
    if (currentColor === 'transparent') {
      return { background: 'transparent' };
    }
    return { backgroundColor: currentColor || '#84a92c' };
  }, [currentColor, currentFillType, currentGradientStart, currentGradientEnd, currentGradientAngle, currentGradientStops]);

  // Filtered solid colors based on search
  const filteredSolidColors = useMemo(() => {
    if (!searchQuery.trim()) return CANVA_SOLID_COLORS;
    const q = searchQuery.toLowerCase().trim();
    return CANVA_SOLID_COLORS.filter(c => c.toLowerCase().includes(q));
  }, [searchQuery]);

  return (
    <div
      className={`w-80 max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden font-sans text-slate-100 select-none animate-fade-in ${
        isFloating ? 'bg-[#18191b] border-slate-700' : 'bg-[#18191b] border-slate-800'
      }`}
      style={{ backgroundColor: '#18191b' }}
    >
      {/* 1. Header with Close Button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-[#84a92c]" />
          <h2 className="font-bold text-sm text-white tracking-wide">{title}</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 no-scrollbar">
        {/* 2. Canva Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder='Try "blue" or "#00c4cc"'
            className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/15 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#84a92c] transition-all"
          />
        </div>

        {/* 3. Shape colors / Active Swatch Bar */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-full border border-white/20 inline-block bg-[#84a92c]" />
            <span>Document colors</span>
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Rainbow + Button (Opens Custom Color & Gradient Generator) */}
            <button
              onClick={() => setIsCustomPickerOpen(!isCustomPickerOpen)}
              className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-white/40 hover:scale-105 transition-all shadow-md cursor-pointer relative group"
              style={{
                background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
              }}
              title="Add new color or custom multi-stop gradient"
            >
              <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-xs">
                <Plus className="w-3 h-3 text-slate-900 stroke-[3]" />
              </div>
            </button>

            {/* Eyedropper Tool */}
            <button
              onClick={handleEyedropper}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center text-slate-200 hover:text-white transition-all cursor-pointer"
              title="Pick color from canvas"
            >
              <Pipette className="w-4 h-4" />
            </button>

            {/* No Fill / Transparent */}
            <button
              onClick={applyTransparent}
              className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer relative overflow-hidden bg-white/5 ${
                currentColor === 'transparent' ? 'border-[#84a92c] ring-2 ring-[#84a92c]/30' : 'border-white/20 hover:border-white/40'
              }`}
              title="Transparent / No Fill"
            >
              <span className="absolute w-[140%] h-0.5 bg-red-500 rotate-45 transform origin-center" />
            </button>

            {/* Active Current Color Bubble */}
            <div
              className="w-9 h-9 rounded-full border-2 border-white shadow-md ring-2 ring-[#84a92c]/50 transition-all"
              style={currentPreviewStyle}
              title="Current Active Color"
            />
          </div>
        </div>

        {/* 4. Canva Custom Multi-Stop Gradient / Color Engine Modal/Popover (Image 2 Exact Clone) */}
        {isCustomPickerOpen && (
          <div className="p-3.5 bg-[#24262b] border border-slate-700/80 rounded-2xl space-y-4 animate-fade-in shadow-2xl">
            {/* Top Solid color vs Gradient Tabs (with Purple underline matching Image 2) */}
            <div className="flex border-b border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setPickerTab('solid');
                  applySolid(customHex);
                }}
                className={`flex-1 pb-2 text-xs font-semibold transition-all cursor-pointer text-center relative ${
                  pickerTab === 'solid'
                    ? 'text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Solid color
                {pickerTab === 'solid' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#84a92c] rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPickerTab('gradient');
                  applyGradient(gradientAngle, gradientStops, gradientType);
                }}
                className={`flex-1 pb-2 text-xs font-semibold transition-all cursor-pointer text-center relative ${
                  pickerTab === 'gradient'
                    ? 'text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Gradient
                {pickerTab === 'gradient' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#84a92c] rounded-full" />
                )}
              </button>
            </div>

            {pickerTab === 'solid' ? (
              /* SOLID COLOR PICKER */
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="color"
                      value={customHex.startsWith('#') ? customHex : '#84a92c'}
                      onChange={e => applySolid(e.target.value)}
                      className="w-10 h-10 rounded-full border-2 border-white/20 bg-transparent cursor-pointer p-0.5"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-400 font-mono block mb-1">HEX CODE</label>
                    <input
                      type="text"
                      value={customHex}
                      onChange={e => applySolid(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs font-mono bg-white/5 border border-white/15 rounded-xl text-white focus:outline-none focus:border-[#84a92c]"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* GRADIENT STUDIO (Exact clone of Image 2) */
              <div className="space-y-4">
                {/* 1. Gradient colors section */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-100">Gradient colors</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {gradientStops.map((stop, i) => (
                      <div key={i} className="relative group">
                        <label
                          className={`w-9 h-9 rounded-full border-2 cursor-pointer flex items-center justify-center transition-all shadow-md overflow-hidden ${
                            activeStopIndex === i
                              ? 'border-[#84a92c] ring-2 ring-[#84a92c]/40 scale-105'
                              : 'border-white/30 hover:border-white/60'
                          }`}
                          style={{ backgroundColor: stop.color }}
                          title={`Color ${i + 1}: ${stop.color}`}
                        >
                          <input
                            type="color"
                            value={stop.color}
                            onChange={e => {
                              const newStops = [...gradientStops];
                              newStops[i].color = e.target.value;
                              setGradientStops(newStops);
                              applyGradient(gradientAngle, newStops, gradientType);
                            }}
                            className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                          />
                        </label>
                        {gradientStops.length > 2 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newStops = gradientStops.filter((_, idx) => idx !== i);
                              setGradientStops(newStops);
                              applyGradient(gradientAngle, newStops, gradientType);
                            }}
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[9px] opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                            title="Remove color stop"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Rainbow + Button to add more gradient colors */}
                    <button
                      type="button"
                      onClick={() => {
                        if (gradientStops.length >= 8) return;
                        const newStops = [
                          ...gradientStops,
                          { offset: (gradientStops.length) / (gradientStops.length + 1), color: '#f59e0b' },
                        ].sort((a, b) => a.offset - b.offset);
                        setGradientStops(newStops);
                        applyGradient(gradientAngle, newStops, gradientType);
                      }}
                      className="w-9 h-9 rounded-full flex items-center justify-center border-2 border-white/40 hover:scale-105 transition-all shadow-md cursor-pointer relative"
                      style={{
                        background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
                      }}
                      title="Add color stop to gradient"
                    >
                      <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-xs">
                        <Plus className="w-3 h-3 text-slate-900 stroke-[3]" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Style section with 5 Directional Previews (Image 2 Clone) */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-100">Style</p>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { id: 'linear-h', type: 'linear-gradient' as const, angle: 90, name: 'Horizontal' },
                      { id: 'linear-v', type: 'linear-gradient' as const, angle: 180, name: 'Vertical' },
                      { id: 'linear-d45', type: 'linear-gradient' as const, angle: 45, name: 'Diagonal 45°' },
                      { id: 'radial', type: 'radial-gradient' as const, angle: 0, name: 'Radial' },
                      { id: 'linear-d135', type: 'linear-gradient' as const, angle: 135, name: 'Diagonal 135°' },
                    ].map(style => {
                      const isSelected =
                        style.type === 'radial-gradient'
                          ? gradientType === 'radial-gradient'
                          : gradientType === 'linear-gradient' && gradientAngle === style.angle;

                      const bgPreview = getGradientCss(style.angle, gradientStops, style.type);

                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => {
                            setGradientType(style.type);
                            setGradientAngle(style.angle);
                            applyGradient(style.angle, gradientStops, style.type);
                          }}
                          className={`h-11 rounded-xl transition-all cursor-pointer relative overflow-hidden shadow-sm ${
                            isSelected
                              ? 'border-2 border-[#8b5cf6] ring-2 ring-[#8b5cf6]/40 scale-105'
                              : 'border border-white/20 hover:border-white/40'
                          }`}
                          style={{ background: bgPreview }}
                          title={style.name}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. Colors in this design */}
        {designColors.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-slate-300">Colors in this design</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {designColors.map((color, i) => (
                <button
                  key={`${color}-${i}`}
                  onClick={() => applySolid(color)}
                  className="w-7 h-7 rounded-full border border-white/30 hover:scale-110 transition-transform shadow-xs cursor-pointer relative"
                  style={{ backgroundColor: color }}
                  title={`Apply ${color}`}
                >
                  {currentColor?.toLowerCase() === color.toLowerCase() && (
                    <Check className="w-3.5 h-3.5 text-white drop-shadow-md absolute inset-0 m-auto stroke-[3]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 7. Photo Colors Extraction */}
        {photoColorsList.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-sky-400" />
                <span>Photo colors</span>
              </p>
              <span className="text-[10px] text-slate-400 font-mono">Auto-extracted</span>
            </div>

            <div className="space-y-2">
              {photoColorsList.map(photo => (
                <div key={photo.id} className="flex items-center gap-2 p-1.5 rounded-xl bg-white/5 border border-white/10">
                  {/* Photo Thumbnail */}
                  <img
                    src={photo.thumbnail}
                    alt={photo.name}
                    className="w-8 h-8 rounded-lg object-cover border border-white/20 flex-shrink-0"
                  />

                  {/* 5 Extracted Swatches */}
                  <div className="flex items-center gap-1.5 flex-1">
                    {photo.colors.map((c, i) => (
                      <button
                        key={i}
                        onClick={() => applySolid(c)}
                        className="w-6 h-6 rounded-full border border-white/20 hover:scale-110 transition-transform shadow-2xs cursor-pointer relative"
                        style={{ backgroundColor: c }}
                        title={`Extracted: ${c}`}
                      >
                        {currentColor?.toLowerCase() === c.toLowerCase() && (
                          <Check className="w-3 h-3 text-white drop-shadow absolute inset-0 m-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. Default Solid Colors Grid */}
        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-300">Default solid colors</p>
          <div className="grid grid-cols-7 gap-1.5">
            {filteredSolidColors.map(color => (
              <button
                key={color}
                onClick={() => applySolid(color)}
                className="w-7 h-7 rounded-full border border-white/20 hover:scale-110 transition-transform shadow-xs cursor-pointer relative flex items-center justify-center"
                style={{ backgroundColor: color }}
                title={color}
              >
                {currentColor?.toLowerCase() === color.toLowerCase() && (
                  <Check className="w-3.5 h-3.5 text-white drop-shadow-md stroke-[3]" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 9. Default Gradient Colors Grid */}
        <div className="space-y-2 pt-1">
          <p className="text-[11px] font-bold text-slate-300">Default gradient colors</p>
          <div className="grid grid-cols-4 gap-2">
            {CANVA_GRADIENT_PRESETS.map((grad, i) => {
              const bgCss = getGradientCss(grad.angle, grad.stops);
              return (
                <button
                  key={i}
                  onClick={() => applyGradient(grad.angle, grad.stops)}
                  className="h-8 rounded-xl border border-white/30 hover:scale-105 transition-all shadow-md cursor-pointer relative overflow-hidden"
                  style={{ background: bgCss }}
                  title={grad.name}
                >
                  <span className="sr-only">{grad.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
