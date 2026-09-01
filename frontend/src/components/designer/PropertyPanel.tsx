import React, { useState } from 'react';
import { DATA_FIELDS } from '../../design-tokens';
import type { CanvasElement } from '../../db/database';
import CanvaColorPickerModal from './CanvaColorPickerModal';
import {
  FlipHorizontal,
  FlipVertical,
  RotateCw,
  Sparkles,
  Layers,
  Sliders,
  Type,
  Maximize2,
  Trash2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  SunMedium,
  Palette,
  Square,
  CornerDownRight,
  RefreshCw,
} from 'lucide-react';

interface PropertyPanelProps {
  element: CanvasElement | null;
  selectedElements?: CanvasElement[];
  allElements?: CanvasElement[];
  backgroundColor?: string;
  onUpdate: (id: string, changes: Partial<CanvasElement>) => void;
  onDelete: (id: string) => void;
  onBatchUpdate?: (changes: Partial<CanvasElement>) => void;
  onBatchDelete?: () => void;
  onGroup?: () => void;
  onAlign?: (type: any) => void;
}

export default function PropertyPanel({
  element,
  selectedElements = [],
  allElements = [],
  backgroundColor = '#ffffff',
  onUpdate,
  onDelete,
  onBatchUpdate,
  onBatchDelete,
  onGroup,
  onAlign,
}: PropertyPanelProps) {
  const [colorPickerTarget, setColorPickerTarget] = useState<'fill' | 'stroke' | 'shadow' | null>(null);
  const [isIndependentCorners, setIsIndependentCorners] = useState(false);
  // If multiple elements are selected, show Multi-Selection Batch Panel
  if (selectedElements.length > 1) {
    return (
      <div className="space-y-4 text-xs font-sans" style={{ color: 'var(--text-primary)' }}>
        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-[#84a92c]/20 text-[#84a92c] font-mono text-[10px] font-bold">
              {selectedElements.length} SELECTED
            </span>
            <h3 className="font-bold text-xs text-[var(--text-primary)]">Multiple Elements</h3>
          </div>
          {onBatchDelete && (
            <button
              onClick={onBatchDelete}
              className="p-1 rounded-lg text-rose-400 hover:bg-rose-950/20 transition-colors cursor-pointer"
              title="Delete All Selected Elements"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Selected Elements Summary */}
        <div className="p-2.5 rounded-xl border space-y-1" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
          <p className="text-[10px] font-mono font-bold uppercase text-[var(--text-muted)]">Selected Objects</p>
          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {selectedElements.map((el, i) => (
              <span key={el.id || i} className="px-1.5 py-0.5 rounded bg-[var(--bg-surface)] text-[10px] font-mono text-[var(--text-secondary)] border" style={{ borderColor: 'var(--border-primary)' }}>
                {el.name || el.type}
              </span>
            ))}
          </div>
        </div>

        {/* Quick Batch Actions */}
        {onGroup && (
          <button
            onClick={onGroup}
            className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <Layers className="w-4 h-4" />
            <span>Group ({selectedElements.length} Items)</span>
          </button>
        )}

        {/* Alignment Controls */}
        {onAlign && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] block">Align Objects</label>
            <div className="grid grid-cols-3 gap-1">
              <button onClick={() => onAlign('left')} className="py-1.5 px-2 rounded-lg border text-[11px] font-bold hover:border-[#84a92c]" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                Left
              </button>
              <button onClick={() => onAlign('center-h')} className="py-1.5 px-2 rounded-lg border text-[11px] font-bold hover:border-[#84a92c]" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                Center H
              </button>
              <button onClick={() => onAlign('right')} className="py-1.5 px-2 rounded-lg border text-[11px] font-bold hover:border-[#84a92c]" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                Right
              </button>
              <button onClick={() => onAlign('top')} className="py-1.5 px-2 rounded-lg border text-[11px] font-bold hover:border-[#84a92c]" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                Top
              </button>
              <button onClick={() => onAlign('middle-v')} className="py-1.5 px-2 rounded-lg border text-[11px] font-bold hover:border-[#84a92c]" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                Middle V
              </button>
              <button onClick={() => onAlign('bottom')} className="py-1.5 px-2 rounded-lg border text-[11px] font-bold hover:border-[#84a92c]" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                Bottom
              </button>
            </div>
          </div>
        )}

        {/* Spacing / Distribution */}
        {onAlign && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] block">Distribute Spacing</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => onAlign('dist-h')} className="py-1.5 px-2 rounded-lg border text-[11px] font-bold hover:border-[#84a92c]" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                Horizontal Gap
              </button>
              <button onClick={() => onAlign('dist-v')} className="py-1.5 px-2 rounded-lg border text-[11px] font-bold hover:border-[#84a92c]" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                Vertical Gap
              </button>
            </div>
          </div>
        )}

        {/* Batch Color / Fill */}
        {onBatchUpdate && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[var(--text-secondary)] block">Apply Color to All</label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {['#0f172a', '#1e3a8a', '#10b981', '#84a92c', '#f59e0b', '#dc2626', '#ffffff', '#64748b'].map(c => (
                <button
                  key={c}
                  onClick={() => onBatchUpdate({ fill: c })}
                  className="w-6 h-6 rounded-lg border border-white/20 shadow-xs cursor-pointer transition-transform hover:scale-110"
                  style={{ backgroundColor: c }}
                  title={`Apply ${c}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!element) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: 'var(--text-muted)' }}>
        <div className="p-3 rounded-2xl bg-white/5 border border-white/10 mb-3 text-[#84a92c]">
          <Sliders className="w-8 h-8 opacity-60" />
        </div>
        <p className="text-xs font-bold text-slate-200">Select an element on canvas</p>
        <p className="text-[10px] mt-1 text-slate-400 max-w-[200px]">
          Click any text, shape, badge, or image to modify properties, reflection, shadows, and gradients
        </p>
      </div>
    );
  }

  const update = (changes: Partial<CanvasElement>) => {
    onUpdate(element.id, changes);
  };

  const inputStyle = {
    backgroundColor: 'var(--bg-elevated)',
    borderColor: 'var(--border-primary)',
    color: 'var(--text-primary)',
  };

  // Quick scale helper
  const handleScalePercent = (percentMultiplier: number) => {
    const currentW = element.width || 100;
    const currentH = element.height || 60;
    update({
      width: Math.max(10, Math.round(currentW * percentMultiplier)),
      height: Math.max(10, Math.round(currentH * percentMultiplier)),
    });
  };

  return (
    <div className="space-y-4 text-xs font-sans" style={{ color: 'var(--text-primary)' }}>
      {/* Header with Title & Delete */}
      <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="p-1 rounded-lg bg-[#84a92c]/10 text-[#84a92c] font-mono text-[10px] font-bold">
            {element.type.toUpperCase()}
          </span>
          <h3 className="font-bold text-xs truncate max-w-[140px]" style={{ color: 'var(--text-primary)' }}>
            {element.name || element.type}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => update({ locked: !element.locked })}
            className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
              element.locked ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'hover:bg-white/10 text-slate-400'
            }`}
            title={element.locked ? 'Unlock layer' : 'Lock layer'}
          >
            {element.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => update({ visible: element.visible === false ? true : false })}
            className={`p-1.5 rounded-lg border cursor-pointer transition-colors ${
              element.visible === false ? 'bg-red-500/20 text-red-300 border-red-500/40' : 'hover:bg-white/10 text-slate-400'
            }`}
            title={element.visible === false ? 'Show layer' : 'Hide layer'}
          >
            {element.visible === false ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onDelete(element.id)}
            className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
            title="Delete element"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Layer Name */}
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider block mb-1 text-slate-400 font-mono">
          Layer Identifier
        </label>
        <input
          type="text"
          value={element.name || ''}
          onChange={e => update({ name: e.target.value })}
          className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c]"
          style={inputStyle}
        />
      </div>

      {/* ================= SECTION 1: TRANSFORM & REFLECT / MIRROR (Adobe Illustrator Style) ================= */}
      <div className="p-2.5 rounded-xl border space-y-2.5 bg-black/20" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase font-mono tracking-wider text-[#84a92c] flex items-center gap-1">
            <RefreshCw className="w-3 h-3" />
            <span>Transform & Reflect</span>
          </span>
          <button
            onClick={() => update({ rotation: 0, flipX: false, flipY: false })}
            className="text-[9px] text-slate-400 hover:text-white font-mono hover:underline cursor-pointer"
            title="Reset Angle & Reflection"
          >
            Reset
          </button>
        </div>

        {/* Reflection / Mirror Buttons (Flip H & Flip V) */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => update({ flipX: !element.flipX })}
            className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              element.flipX
                ? 'bg-[#84a92c] text-slate-950 border-[#84a92c] shadow-xs'
                : 'hover:border-[#84a92c] text-slate-200'
            }`}
            style={{
              backgroundColor: element.flipX ? '#84a92c' : 'var(--bg-elevated)',
              borderColor: element.flipX ? '#84a92c' : 'var(--border-primary)',
            }}
            title="Mirror Horizontally (Flip Horizontal)"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span>Reflect Horiz</span>
          </button>

          <button
            type="button"
            onClick={() => update({ flipY: !element.flipY })}
            className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              element.flipY
                ? 'bg-[#84a92c] text-slate-950 border-[#84a92c] shadow-xs'
                : 'hover:border-[#84a92c] text-slate-200'
            }`}
            style={{
              backgroundColor: element.flipY ? '#84a92c' : 'var(--bg-elevated)',
              borderColor: element.flipY ? '#84a92c' : 'var(--border-primary)',
            }}
            title="Mirror Vertically (Flip Vertical)"
          >
            <FlipVertical className="w-3.5 h-3.5" />
            <span>Reflect Vert</span>
          </button>
        </div>

        {/* Quick Rotation Buttons */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-slate-400 mr-1">Rotate:</span>
          {[0, 45, 90, 180, 270].map(deg => (
            <button
              key={deg}
              type="button"
              onClick={() => update({ rotation: deg })}
              className={`flex-1 py-1 rounded-lg border text-[10px] font-mono font-bold cursor-pointer transition-all ${
                (element.rotation || 0) === deg
                  ? 'bg-[#84a92c]/20 border-[#84a92c] text-[#84a92c]'
                  : 'hover:bg-white/5 border-transparent text-slate-400'
              }`}
            >
              {deg}°
            </button>
          ))}
        </div>

        {/* Position & Dimensions Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t" style={{ borderColor: 'var(--border-primary)' }}>
          <div>
            <label className="text-[10px] font-semibold block mb-0.5 text-slate-400 font-mono">X (px)</label>
            <input
              type="number"
              value={Math.round(element.x)}
              onChange={e => update({ x: Number(e.target.value) })}
              className="w-full text-xs py-1 px-2 rounded-lg border font-mono focus:outline-none focus:border-[#84a92c]"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold block mb-0.5 text-slate-400 font-mono">Y (px)</label>
            <input
              type="number"
              value={Math.round(element.y)}
              onChange={e => update({ y: Number(e.target.value) })}
              className="w-full text-xs py-1 px-2 rounded-lg border font-mono focus:outline-none focus:border-[#84a92c]"
              style={inputStyle}
            />
          </div>

          {(element.width !== undefined || element.radius !== undefined) && (
            <div>
              <label className="text-[10px] font-semibold block mb-0.5 text-slate-400 font-mono">
                {element.radius !== undefined ? 'Radius (px)' : 'Width (px)'}
              </label>
              <input
                type="number"
                value={Math.round(element.radius !== undefined ? element.radius : (element.width || 100))}
                onChange={e => {
                  const val = Number(e.target.value);
                  if (element.radius !== undefined) update({ radius: val });
                  else update({ width: val });
                }}
                className="w-full text-xs py-1 px-2 rounded-lg border font-mono focus:outline-none focus:border-[#84a92c]"
                style={inputStyle}
              />
            </div>
          )}

          {element.height !== undefined && element.radius === undefined && (
            <div>
              <label className="text-[10px] font-semibold block mb-0.5 text-slate-400 font-mono">Height (px)</label>
              <input
                type="number"
                value={Math.round(element.height)}
                onChange={e => update({ height: Number(e.target.value) })}
                className="w-full text-xs py-1 px-2 rounded-lg border font-mono focus:outline-none focus:border-[#84a92c]"
                style={inputStyle}
              />
            </div>
          )}
        </div>

        {/* Quick Proportional Scale */}
        <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-400">
          <span>Proportional Scale:</span>
          <div className="flex gap-1">
            <button
              onClick={() => handleScalePercent(0.9)}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer"
            >
              -10%
            </button>
            <button
              onClick={() => handleScalePercent(1.1)}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-bold cursor-pointer"
            >
              +10%
            </button>
          </div>
        </div>
      </div>

      {/* ================= SECTION 2: SHADOW & GLOW EFFECTS ================= */}
      <div className="p-2.5 rounded-xl border space-y-2.5 bg-black/20" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase font-mono tracking-wider text-[#84a92c] flex items-center gap-1">
            <SunMedium className="w-3 h-3" />
            <span>Shadow & Glow Effects</span>
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-mono">
            <input
              type="checkbox"
              checked={element.shadowEnabled === true}
              onChange={e => update({ shadowEnabled: e.target.checked })}
              className="accent-[#84a92c] rounded"
            />
            <span className={element.shadowEnabled ? 'text-[#84a92c] font-bold' : 'text-slate-400'}>Enable</span>
          </label>
        </div>

        {element.shadowEnabled && (
          <div className="space-y-2 pt-1 border-t" style={{ borderColor: 'var(--border-primary)' }}>
            {/* Quick Shadow Presets */}
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => update({
                  shadowEnabled: true,
                  shadowColor: 'rgba(0, 0, 0, 0.35)',
                  shadowBlur: 8,
                  shadowOffsetX: 3,
                  shadowOffsetY: 4,
                  shadowOpacity: 0.7,
                })}
                className="py-1 px-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-mono text-center cursor-pointer"
              >
                Soft Card
              </button>
              <button
                onClick={() => update({
                  shadowEnabled: true,
                  shadowColor: 'rgba(0, 0, 0, 0.65)',
                  shadowBlur: 16,
                  shadowOffsetX: 6,
                  shadowOffsetY: 8,
                  shadowOpacity: 0.9,
                })}
                className="py-1 px-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-mono text-center cursor-pointer"
              >
                Deep Cast
              </button>
              <button
                onClick={() => update({
                  shadowEnabled: true,
                  shadowColor: '#84a92c',
                  shadowBlur: 14,
                  shadowOffsetX: 0,
                  shadowOffsetY: 0,
                  shadowOpacity: 0.85,
                })}
                className="py-1 px-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[9px] font-mono text-center text-[#84a92c] cursor-pointer"
              >
                Neon Glow
              </button>
            </div>

            {/* Shadow Color */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-mono text-slate-400 w-16">Color:</label>
              <input
                type="color"
                value={element.shadowColor?.startsWith('#') ? element.shadowColor : '#000000'}
                onChange={e => update({ shadowColor: e.target.value })}
                className="w-7 h-7 rounded-lg border cursor-pointer p-0.5 bg-transparent"
                style={{ borderColor: 'var(--border-primary)' }}
              />
              <input
                type="text"
                value={element.shadowColor || 'rgba(0,0,0,0.45)'}
                onChange={e => update({ shadowColor: e.target.value })}
                className="flex-1 text-[11px] py-1 px-2 rounded-lg border font-mono"
                style={inputStyle}
              />
            </div>

            {/* Shadow Blur Slider */}
            <div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-0.5">
                <span>Blur Radius:</span>
                <span className="text-white font-bold">{element.shadowBlur ?? 10} px</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={element.shadowBlur ?? 10}
                onChange={e => update({ shadowBlur: Number(e.target.value) })}
                className="w-full accent-[#84a92c] cursor-pointer"
              />
            </div>

            {/* Shadow Offsets */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-0.5">
                  <span>Offset X:</span>
                  <span className="text-white font-bold">{element.shadowOffsetX ?? 4} px</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={element.shadowOffsetX ?? 4}
                  onChange={e => update({ shadowOffsetX: Number(e.target.value) })}
                  className="w-full accent-[#84a92c] cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-0.5">
                  <span>Offset Y:</span>
                  <span className="text-white font-bold">{element.shadowOffsetY ?? 4} px</span>
                </div>
                <input
                  type="range"
                  min="-30"
                  max="30"
                  value={element.shadowOffsetY ?? 4}
                  onChange={e => update({ shadowOffsetY: Number(e.target.value) })}
                  className="w-full accent-[#84a92c] cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= SECTION 3: FILL, GRADIENTS & STROKE ================= */}
      <div className="p-2.5 rounded-xl border space-y-2.5 bg-black/20" style={{ borderColor: 'var(--border-primary)' }}>
        <span className="text-[10px] font-bold uppercase font-mono tracking-wider text-[#84a92c] flex items-center gap-1">
          <Palette className="w-3 h-3" />
          <span>Fill, Gradients & Stroke</span>
        </span>

        {/* Fill Type: Solid vs Linear Gradient */}
        {element.fill !== undefined && (
          <div className="space-y-2">
            <div className="flex rounded-xl p-0.5 bg-black/40 border" style={{ borderColor: 'var(--border-primary)' }}>
              <button
                type="button"
                onClick={() => update({ fillType: 'solid' })}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                  (element.fillType || 'solid') === 'solid'
                    ? 'bg-[#84a92c] text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Solid Color
              </button>
              <button
                type="button"
                onClick={() => update({
                  fillType: 'linear-gradient',
                  gradientStart: element.gradientStart || element.fill || '#1e3a8a',
                  gradientEnd: element.gradientEnd || '#0f766e',
                  gradientAngle: element.gradientAngle ?? 135,
                })}
                className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                  element.fillType === 'linear-gradient'
                    ? 'bg-[#84a92c] text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Linear Gradient
              </button>
            </div>

            {element.fillType === 'linear-gradient' ? (
              <div className="space-y-2 p-2 rounded-xl bg-black/30 border border-white/5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">Start Color</label>
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="color"
                        value={element.gradientStart || '#1e3a8a'}
                        onChange={e => update({ gradientStart: e.target.value })}
                        className="w-6 h-6 rounded border cursor-pointer bg-transparent"
                      />
                      <span className="font-mono text-[10px] truncate">{element.gradientStart || '#1e3a8a'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-mono text-slate-400 block mb-1">End Color</label>
                    <div className="flex gap-1.5 items-center">
                      <input
                        type="color"
                        value={element.gradientEnd || '#0f766e'}
                        onChange={e => update({ gradientEnd: e.target.value })}
                        className="w-6 h-6 rounded border cursor-pointer bg-transparent"
                      />
                      <span className="font-mono text-[10px] truncate">{element.gradientEnd || '#0f766e'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-0.5">
                    <span>Angle (°):</span>
                    <span className="text-white font-bold">{element.gradientAngle ?? 135}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={element.gradientAngle ?? 135}
                    onChange={e => update({ gradientAngle: Number(e.target.value) })}
                    className="w-full accent-[#84a92c] cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setColorPickerTarget('fill')}
                  className="w-8 h-8 rounded-lg border cursor-pointer p-0.5 relative group overflow-hidden shadow-xs"
                  style={{ backgroundColor: element.fill || '#ffffff', borderColor: 'var(--border-primary)' }}
                  title="Open Canva Color & Gradient Studio"
                >
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Palette className="w-3.5 h-3.5 text-white" />
                  </div>
                </button>
                <input
                  type="text"
                  value={element.fill || '#ffffff'}
                  onChange={e => update({ fill: e.target.value })}
                  className="flex-1 text-xs py-1.5 px-2.5 rounded-xl border font-mono"
                  style={inputStyle}
                />
                <button
                  type="button"
                  onClick={() => setColorPickerTarget('fill')}
                  className="px-2 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-[#84a92c] border border-white/10"
                >
                  Canva Color
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stroke / Border controls */}
        <div className="space-y-2 pt-1 border-t" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold block mb-1 text-slate-400 font-mono">Stroke Color</label>
              <div className="flex gap-1.5 items-center">
                <button
                  type="button"
                  onClick={() => setColorPickerTarget('stroke')}
                  className="w-7 h-7 rounded-lg border cursor-pointer p-0.5 relative group overflow-hidden"
                  style={{ backgroundColor: element.stroke || '#000000', borderColor: 'var(--border-primary)' }}
                  title="Open Canva Color Studio for Stroke"
                >
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Palette className="w-3 h-3 text-white" />
                  </div>
                </button>
                <input
                  type="text"
                  value={element.stroke || ''}
                  placeholder="#000000"
                  onChange={e => update({ stroke: e.target.value })}
                  className="flex-1 text-xs py-1 px-2 rounded-lg border font-mono"
                  style={inputStyle}
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold block mb-1 text-slate-400 font-mono">Thickness (px)</label>
              <input
                type="number"
                min={0}
                max={20}
                value={element.strokeWidth ?? 0}
                onChange={e => update({ strokeWidth: Number(e.target.value) })}
                className="w-full text-xs py-1.5 px-2.5 rounded-xl border font-mono"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Stroke Dash Pattern */}
          <div>
            <label className="text-[10px] font-semibold block mb-1 text-slate-400 font-mono">Stroke Style</label>
            <div className="grid grid-cols-3 gap-1">
              <button
                type="button"
                onClick={() => update({ dashPattern: undefined })}
                className={`py-1 px-1.5 rounded-lg border text-[10px] font-mono cursor-pointer ${
                  !element.dashPattern ? 'bg-[#84a92c]/20 border-[#84a92c] text-white font-bold' : 'hover:bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                Solid
              </button>
              <button
                type="button"
                onClick={() => update({ dashPattern: [8, 4] })}
                className={`py-1 px-1.5 rounded-lg border text-[10px] font-mono cursor-pointer ${
                  element.dashPattern?.[0] === 8 ? 'bg-[#84a92c]/20 border-[#84a92c] text-white font-bold' : 'hover:bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                Dashed
              </button>
              <button
                type="button"
                onClick={() => update({ dashPattern: [2, 4] })}
                className={`py-1 px-1.5 rounded-lg border text-[10px] font-mono cursor-pointer ${
                  element.dashPattern?.[0] === 2 ? 'bg-[#84a92c]/20 border-[#84a92c] text-white font-bold' : 'hover:bg-white/5 border-white/10 text-slate-400'
                }`}
              >
                Dotted
              </button>
            </div>
          </div>

          {/* Corner radius for rect / photo / frame with 4-angle independent controls */}
          {(element.type === 'rect' || element.type === 'photo' || element.type === 'frame') && (
            <div className="space-y-2 pt-1">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                <span>Corner Rounding:</span>
                <button
                  type="button"
                  onClick={() => setIsIndependentCorners(!isIndependentCorners)}
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded border transition-all ${
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
                  value={typeof element.cornerRadius === 'number' ? element.cornerRadius : 8}
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
                <span className="text-white font-bold font-mono text-xs w-12 text-right">
                  {typeof element.cornerRadius === 'number' ? element.cornerRadius : 8}px
                </span>
              </div>

              {isIndependentCorners && (
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 space-y-2 animate-fade-in">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    Per-Angle Roundness (px):
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[8px] font-mono text-slate-400 block">Top-Left (TL):</label>
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={element.radiusTL ?? (typeof element.cornerRadius === 'number' ? element.cornerRadius : 8)}
                        onChange={e => update({ radiusTL: Number(e.target.value) })}
                        className="w-full h-6 px-1.5 text-xs font-bold rounded bg-slate-800 border border-slate-700 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-mono text-slate-400 block">Top-Right (TR):</label>
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={element.radiusTR ?? (typeof element.cornerRadius === 'number' ? element.cornerRadius : 8)}
                        onChange={e => update({ radiusTR: Number(e.target.value) })}
                        className="w-full h-6 px-1.5 text-xs font-bold rounded bg-slate-800 border border-slate-700 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-mono text-slate-400 block">Bottom-Right (BR):</label>
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={element.radiusBR ?? (typeof element.cornerRadius === 'number' ? element.cornerRadius : 8)}
                        onChange={e => update({ radiusBR: Number(e.target.value) })}
                        className="w-full h-6 px-1.5 text-xs font-bold rounded bg-slate-800 border border-slate-700 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-mono text-slate-400 block">Bottom-Left (BL):</label>
                      <input
                        type="number"
                        min="0"
                        max="500"
                        value={element.radiusBL ?? (typeof element.cornerRadius === 'number' ? element.cornerRadius : 8)}
                        onChange={e => update({ radiusBL: Number(e.target.value) })}
                        className="w-full h-6 px-1.5 text-xs font-bold rounded bg-slate-800 border border-slate-700 text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= SECTION 4: TEXT & TYPOGRAPHY ================= */}
      {(element.type === 'text' || element.type === 'dataField') && (
        <div className="p-2.5 rounded-xl border space-y-2.5 bg-black/20" style={{ borderColor: 'var(--border-primary)' }}>
          <span className="text-[10px] font-bold uppercase font-mono tracking-wider text-[#84a92c] flex items-center gap-1">
            <Type className="w-3 h-3" />
            <span>Typography & Formatting</span>
          </span>

          <div>
            <label className="text-[10px] font-semibold block mb-1 text-slate-400 font-mono">Text Content</label>
            <input
              type="text"
              value={element.text || ''}
              onChange={e => update({ text: e.target.value })}
              className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c]"
              style={inputStyle}
            />
          </div>

          {/* Text Case Transform (UPPERCASE, lowercase, Capitalize) */}
          <div>
            <label className="text-[10px] font-semibold block mb-1 text-slate-400 font-mono">Text Transform</label>
            <div className="grid grid-cols-4 gap-1">
              {(['none', 'uppercase', 'lowercase', 'capitalize'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => update({ textTransform: t })}
                  className={`py-1 px-1 rounded-lg border text-[10px] font-mono truncate cursor-pointer ${
                    (element.textTransform || 'none') === t
                      ? 'bg-[#84a92c]/20 border-[#84a92c] text-white font-bold'
                      : 'hover:bg-white/5 border-white/10 text-slate-400'
                  }`}
                >
                  {t === 'none' ? 'Normal' : t === 'uppercase' ? 'UPPER' : t === 'lowercase' ? 'lower' : 'Cap'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold block mb-1 text-slate-400 font-mono">Font Size</label>
              <input
                type="number"
                value={element.fontSize || 16}
                onChange={e => update({ fontSize: Number(e.target.value) })}
                className="w-full text-xs py-1.5 px-2.5 rounded-xl border font-mono"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold block mb-1 text-slate-400 font-mono">Font Family</label>
              <select
                value={element.fontFamily || 'Inter'}
                onChange={e => update({ fontFamily: e.target.value })}
                className="w-full text-xs py-1.5 px-2.5 rounded-xl border cursor-pointer font-bold"
                style={inputStyle}
              >
                <option value="Inter">Inter (Standard Modern)</option>
                <option value="Outfit">Outfit (Clean Geometric)</option>
                <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                <option value="JetBrains Mono">JetBrains Mono</option>
                <option value="Space Grotesk">Space Grotesk</option>
                <option value="Arial">Arial</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold block mb-1 text-slate-400 font-mono">Font Style</label>
              <select
                value={element.fontStyle || 'normal'}
                onChange={e => update({ fontStyle: e.target.value })}
                className="w-full text-xs py-1.5 px-2.5 rounded-xl border cursor-pointer"
                style={inputStyle}
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="italic">Italic</option>
                <option value="bold italic">Bold Italic</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold block mb-1 text-slate-400 font-mono">Alignment</label>
              <select
                value={element.align || 'left'}
                onChange={e => update({ align: e.target.value })}
                className="w-full text-xs py-1.5 px-2.5 rounded-xl border cursor-pointer"
                style={inputStyle}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>

          {/* Letter Spacing & Line Height */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold block mb-1 text-slate-400 font-mono">Letter Spacing</label>
              <input
                type="number"
                step="0.5"
                value={element.letterSpacing || 0}
                onChange={e => update({ letterSpacing: Number(e.target.value) })}
                className="w-full text-xs py-1.5 px-2.5 rounded-xl border font-mono"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold block mb-1 text-slate-400 font-mono">Line Height</label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                max="3"
                value={element.lineHeight || 1.2}
                onChange={e => update({ lineHeight: Number(e.target.value) })}
                className="w-full text-xs py-1.5 px-2.5 rounded-xl border font-mono"
                style={inputStyle}
              />
            </div>
          </div>
        </div>
      )}

      {/* ================= SECTION 5: DATA BINDING ================= */}
      {(element.type === 'text' || element.type === 'dataField') && (
        <div className="p-2.5 rounded-xl border space-y-2 bg-black/20" style={{ borderColor: 'var(--border-primary)' }}>
          <label className="text-[10px] font-bold uppercase font-mono tracking-wider text-[#84a92c] block">
            Bind to Dynamic Personnel Field
          </label>
          <select
            value={element.dataField || ''}
            onChange={e => {
              const val = e.target.value;
              update({
                dataField: val || undefined,
                type: val ? 'dataField' : 'text',
                text: val || element.text,
              });
            }}
            className="w-full text-xs py-2 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c] font-bold"
            style={inputStyle}
          >
            <option value="">None (Static Text)</option>
            {DATA_FIELDS.filter(f => f.key !== '{{photo}}').map(f => (
              <option key={f.key} value={f.key}>
                {f.label} — {f.key}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* QR Code Payload editing */}
      {(element.type === 'qr' || element.type === 'qrCode') && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase font-mono tracking-wider text-slate-400 block">
            QR Code Payload / Dynamic Link
          </label>
          <input
            type="text"
            value={element.qrPayload || ''}
            onChange={e => update({ qrPayload: e.target.value })}
            placeholder="e.g. {{id_number}} or https://..."
            className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c] font-mono"
            style={inputStyle}
          />
          <div className="flex gap-1 flex-wrap">
            {['{{id_number}}', '{{phone}}', '{{email}}', '{{verify_url}}'].map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => update({ qrPayload: tag })}
                className="px-1.5 py-0.5 rounded bg-[#84a92c]/10 text-[#84a92c] text-[10px] font-mono hover:bg-[#84a92c]/20 cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Barcode Payload editing */}
      {element.type === 'barcode' && (
        <div className="space-y-2 p-2.5 rounded-xl border bg-black/20" style={{ borderColor: 'var(--border-primary)' }}>
          <div>
            <label className="text-[10px] font-bold uppercase font-mono tracking-wider text-[#84a92c] block mb-1">
              Barcode Symbology & Standard
            </label>
            <select
              value={element.barcodeType || 'code128'}
              onChange={e => update({ barcodeType: e.target.value })}
              className="w-full text-xs py-1.5 px-2.5 rounded-xl border font-bold cursor-pointer"
              style={inputStyle}
            >
              <option value="code128">Code 128 (Alphanumeric Universal — Default)</option>
              <option value="code39">Code 39 (Standard Industrial)</option>
              <option value="ean13">EAN-13 (Commercial 13-Digit)</option>
              <option value="ean8">EAN-8 (Compact 8-Digit)</option>
              <option value="upca">UPC-A (Retail Universal)</option>
              <option value="itf14">ITF-14 (Interleaved 2 of 5)</option>
              <option value="pdf417">PDF417 (High Density 2D)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase font-mono tracking-wider text-slate-400 block mb-1">
              Barcode Value / Personnel Field
            </label>
            <input
              type="text"
              value={element.dataField || ''}
              onChange={e => update({ dataField: e.target.value })}
              placeholder="e.g. {{id_number}}"
              className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c] font-mono"
              style={inputStyle}
            />
          </div>

          <div className="flex gap-1 flex-wrap">
            {['{{id_number}}', '{{roll_number}}', '{{phone}}', '{{blood_group}}'].map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => update({ dataField: tag })}
                className="px-1.5 py-0.5 rounded bg-[#84a92c]/10 text-[#84a92c] text-[10px] font-mono hover:bg-[#84a92c]/20 cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Opacity Slider */}
      <div>
        <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-0.5">
          <span>Layer Opacity:</span>
          <span className="text-white font-bold">{Math.round((element.opacity ?? 1) * 100)}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={element.opacity ?? 1}
          onChange={e => update({ opacity: Number(e.target.value) })}
          className="w-full accent-[#84a92c] cursor-pointer"
        />
      </div>

      {/* Canva Color & Gradient Picker Modal */}
      {colorPickerTarget && (
        <CanvaColorPickerModal
          onClose={() => setColorPickerTarget(null)}
          currentColor={
            colorPickerTarget === 'fill'
              ? (element.fill || '#ffffff')
              : colorPickerTarget === 'stroke'
              ? (element.stroke || '#000000')
              : (element.shadowColor || '#000000')
          }
          currentFillType={colorPickerTarget === 'fill' ? element.fillType : undefined}
          currentGradientStops={colorPickerTarget === 'fill' ? element.gradientStops : undefined}
          currentGradientAngle={colorPickerTarget === 'fill' ? element.gradientAngle : undefined}
          elements={allElements}
          backgroundColor={backgroundColor}
          onChange={(sel) => {
            if (sel.type === 'solid' || sel.type === 'transparent') {
              const c = sel.type === 'transparent' ? 'transparent' : (sel.color || '#ffffff');
              if (colorPickerTarget === 'fill') {
                update({ fill: c, fillType: 'solid' });
              } else if (colorPickerTarget === 'stroke') {
                update({ stroke: c });
              } else if (colorPickerTarget === 'shadow') {
                update({ shadowColor: c });
              }
            } else if (sel.type === 'linear-gradient' || sel.type === 'radial-gradient') {
              if (colorPickerTarget === 'fill') {
                update({
                  fillType: sel.type,
                  gradientStops: sel.gradientStops,
                  gradientAngle: sel.gradientAngle ?? 135,
                  gradientStart: sel.gradientStart || sel.gradientStops?.[0]?.color || '#ffffff',
                  gradientEnd: sel.gradientEnd || sel.gradientStops?.[sel.gradientStops.length - 1]?.color || '#000000',
                });
              }
            }
          }}
        />
      )}
    </div>
  );
}
