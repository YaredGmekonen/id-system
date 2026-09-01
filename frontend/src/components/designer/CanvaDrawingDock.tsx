import React, { useState } from 'react';
import {
  MousePointer,
  PenTool,
  Highlighter,
  Eraser,
  X,
  Sliders,
  Palette,
  StickyNote,
  Table,
  Check,
} from 'lucide-react';

export type DrawingToolType = 'select' | 'pen' | 'marker' | 'highlighter' | 'eraser';

export interface DrawingBrushState {
  tool: DrawingToolType;
  color: string;
  weight: number;
  opacity: number;
  isActive: boolean;
}

interface CanvaDrawingDockProps {
  brushState: DrawingBrushState;
  onBrushChange: (updates: Partial<DrawingBrushState>) => void;
  onClose?: () => void;
}

const INK_PRESET_COLORS = [
  '#000000',
  '#ef4444',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#ffffff',
];

export default function CanvaDrawingDock({
  brushState,
  onBrushChange,
  onClose,
}: CanvaDrawingDockProps) {
  const [activePopover, setActivePopover] = useState<'weight' | 'color' | null>(null);

  const selectTool = (tool: DrawingToolType) => {
    let opacity = 1;
    let weight = brushState.weight;

    if (tool === 'pen') {
      opacity = 1;
      weight = Math.min(weight, 12);
    } else if (tool === 'marker') {
      opacity = 0.9;
      weight = Math.max(weight, 16);
    } else if (tool === 'highlighter') {
      opacity = 0.4;
      weight = Math.max(weight, 24);
    }

    onBrushChange({
      tool,
      opacity,
      weight,
      isActive: tool !== 'select',
    });
  };

  return (
    <div className="flex items-start gap-2 select-none font-sans z-40 animate-fade-in">
      {/* 1. Main Vertical Drawing Dock (Image 4 Exact Clone) */}
      <div className="bg-white/95 dark:bg-[#18191b]/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-1.5 flex flex-col items-center gap-1.5 w-12 text-slate-800 dark:text-slate-100">
        {/* Close Button [ × ] */}
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
            title="Exit Drawing Mode"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="w-7 h-px bg-slate-200 dark:bg-white/10 my-0.5" />

        {/* 1. Select / Pointer (↖) */}
        <button
          onClick={() => selectTool('select')}
          className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
            brushState.tool === 'select'
              ? 'bg-[#84a92c] text-slate-950 shadow-md font-bold'
              : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
          }`}
          title="Select & Move Tool (V)"
        >
          <MousePointer className="w-4 h-4" />
        </button>

        {/* 2. Fine Pen Tool */}
        <button
          onClick={() => selectTool('pen')}
          className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
            brushState.tool === 'pen'
              ? 'bg-[#8b5cf6] text-white shadow-md'
              : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
          }`}
          title="Vector Pen"
        >
          <PenTool className="w-4 h-4" />
          <span
            className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white"
            style={{ backgroundColor: brushState.color }}
          />
        </button>

        {/* 3. Marker / Felt Tip Tool */}
        <button
          onClick={() => selectTool('marker')}
          className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
            brushState.tool === 'marker'
              ? 'bg-[#8b5cf6] text-white shadow-md'
              : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
          }`}
          title="Marker"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 2l4 4-8 8H4v-4l8-8z" />
            <path d="M14 14l6 6" />
          </svg>
          <span
            className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white"
            style={{ backgroundColor: brushState.color }}
          />
        </button>

        {/* 4. Highlighter Tool */}
        <button
          onClick={() => selectTool('highlighter')}
          className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer relative ${
            brushState.tool === 'highlighter'
              ? 'bg-[#facc15] text-slate-950 shadow-md font-bold'
              : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
          }`}
          title="Highlighter"
        >
          <Highlighter className="w-4 h-4" />
          <span
            className="absolute bottom-1 right-1 w-2 h-2 rounded-full border border-white"
            style={{ backgroundColor: brushState.color }}
          />
        </button>

        {/* 5. Eraser Tool (Pink rubber brick matching Image 4) */}
        <button
          onClick={() => selectTool('eraser')}
          className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
            brushState.tool === 'eraser'
              ? 'bg-rose-500 text-white shadow-md'
              : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
          }`}
          title="Eraser (Erase Drawn Strokes)"
        >
          <Eraser className="w-4 h-4" />
        </button>

        <div className="w-7 h-px bg-slate-200 dark:bg-white/10 my-0.5" />

        {/* 6. Active Ink Color Circle */}
        <button
          onClick={() => setActivePopover(activePopover === 'color' ? null : 'color')}
          className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-700 shadow-md hover:scale-110 transition-transform cursor-pointer relative"
          style={{ backgroundColor: brushState.color }}
          title="Choose Ink Color"
        />

        {/* 7. Weight / Thickness Popover Button (Image 4 exact icon) */}
        <button
          onClick={() => setActivePopover(activePopover === 'weight' ? null : 'weight')}
          className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
            activePopover === 'weight'
              ? 'bg-slate-200 dark:bg-white/20 text-slate-900 dark:text-white'
              : 'hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'
          }`}
          title="Stroke Weight & Thickness"
        >
          <div className="flex flex-col gap-0.5 items-center justify-center w-4">
            <span className="w-4 h-0.5 bg-current rounded-full" />
            <span className="w-4 h-1 bg-current rounded-full" />
            <span className="w-4 h-1.5 bg-current rounded-full" />
          </div>
        </button>
      </div>

      {/* 2. Weight Popover (Image 4 Exact Clone: Weight Slider with Numeric Bubble) */}
      {activePopover === 'weight' && (
        <div className="p-3.5 bg-white dark:bg-[#18191b] border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl text-slate-900 dark:text-white w-64 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold tracking-wide">Weight</span>
            <div className="w-10 h-7 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-white/5 flex items-center justify-center font-mono text-xs font-bold">
              {brushState.weight}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="100"
              value={brushState.weight}
              onChange={e => onBrushChange({ weight: Number(e.target.value) })}
              className="flex-1 accent-[#8b5cf6] cursor-pointer"
            />
          </div>

          {/* Live Brush Size Dot Preview */}
          <div className="flex items-center justify-center h-12 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div
              className="rounded-full transition-all"
              style={{
                width: Math.min(brushState.weight, 40),
                height: Math.min(brushState.weight, 40),
                backgroundColor: brushState.color,
                opacity: brushState.opacity,
              }}
            />
          </div>
        </div>
      )}

      {/* 3. Quick Ink Color Picker Popover */}
      {activePopover === 'color' && (
        <div className="p-3 bg-white dark:bg-[#18191b] border border-slate-200 dark:border-slate-700 shadow-2xl rounded-2xl text-slate-900 dark:text-white w-48 space-y-2 animate-fade-in">
          <p className="text-[11px] font-bold text-slate-400 font-mono uppercase">Ink Palette</p>
          <div className="grid grid-cols-4 gap-1.5">
            {INK_PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => {
                  onBrushChange({ color: c });
                  setActivePopover(null);
                }}
                className="w-7 h-7 rounded-full border border-slate-300 dark:border-slate-700 hover:scale-110 transition-transform cursor-pointer relative shadow-xs"
                style={{ backgroundColor: c }}
              >
                {brushState.color.toLowerCase() === c.toLowerCase() && (
                  <Check className="w-3.5 h-3.5 text-white drop-shadow absolute inset-0 m-auto" />
                )}
              </button>
            ))}
          </div>

          {/* Custom Native Color Input */}
          <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400">Custom Color</span>
            <input
              type="color"
              value={brushState.color.startsWith('#') ? brushState.color : '#84a92c'}
              onChange={e => onBrushChange({ color: e.target.value })}
              className="w-6 h-6 rounded-md border border-slate-300 dark:border-slate-700 cursor-pointer p-0 bg-transparent"
            />
          </div>
        </div>
      )}
    </div>
  );
}
