import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  type DetectedCropBox,
  cropRegionFromImage,
  detectPhotoBoxesOnDocument,
} from '../../engine/faceDetector';
import {
  Move,
  Plus,
  Trash2,
  Scan,
  RotateCcw,
  CheckCircle,
  Eye,
  Maximize2,
} from 'lucide-react';

interface VisualCropCanvasProps {
  pageImageUrl: string;
  cropBoxes: DetectedCropBox[];
  onCropBoxesChange: (boxes: DetectedCropBox[]) => void;
  onPreviewExtracted?: (thumbnails: { slotIndex: number; dataUrl: string }[]) => void;
}

export default function VisualCropCanvas({
  pageImageUrl,
  cropBoxes,
  onCropBoxesChange,
  onPreviewExtracted,
}: VisualCropCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(cropBoxes[0]?.id || null);
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; boxX: number; boxY: number; boxW: number; boxH: number } | null>(null);

  // Update thumbnails whenever crop boxes change
  const refreshThumbnails = useCallback(async () => {
    if (!pageImageUrl) return;
    const map = new Map<string, string>();
    const list: { slotIndex: number; dataUrl: string }[] = [];

    for (const box of cropBoxes) {
      try {
        const url = await cropRegionFromImage(pageImageUrl, box);
        map.set(box.id, url);
        list.push({ slotIndex: box.slotIndex, dataUrl: url });
      } catch {
        // ignore
      }
    }

    setThumbnails(map);
    if (onPreviewExtracted) onPreviewExtracted(list);
  }, [pageImageUrl, cropBoxes, onPreviewExtracted]);

  useEffect(() => {
    refreshThumbnails();
  }, [refreshThumbnails]);

  // Handle Box Drag Start
  const handleBoxMouseDown = (e: React.MouseEvent, box: DetectedCropBox) => {
    e.stopPropagation();
    setSelectedBoxId(box.id);
    setIsDragging(true);
    setIsResizing(false);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDragStart({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
        boxX: box.x,
        boxY: box.y,
        boxW: box.w,
        boxH: box.h,
      });
    }
  };

  // Handle Resize Corner Start
  const handleResizeMouseDown = (e: React.MouseEvent, box: DetectedCropBox) => {
    e.stopPropagation();
    setSelectedBoxId(box.id);
    setIsResizing(true);
    setIsDragging(false);

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDragStart({
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
        boxX: box.x,
        boxY: box.y,
        boxW: box.w,
        boxH: box.h,
      });
    }
  };

  // Mouse Move over Document Container
  const handleContainerMouseMove = (e: React.MouseEvent) => {
    if (!dragStart || !selectedBoxId || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / rect.width;
    const currentY = (e.clientY - rect.top) / rect.height;
    const dx = currentX - dragStart.x;
    const dy = currentY - dragStart.y;

    const nextBoxes = cropBoxes.map(b => {
      if (b.id !== selectedBoxId) return b;

      if (isDragging) {
        const newX = Math.max(0, Math.min(1 - b.w, dragStart.boxX + dx));
        const newY = Math.max(0, Math.min(1 - b.h, dragStart.boxY + dy));
        return { ...b, x: newX, y: newY };
      } else if (isResizing) {
        const newW = Math.max(0.05, Math.min(1 - b.x, dragStart.boxW + dx));
        const newH = Math.max(0.05, Math.min(1 - b.y, dragStart.boxH + dy));
        return { ...b, w: newW, h: newH };
      }

      return b;
    });

    onCropBoxesChange(nextBoxes);
  };

  const handleContainerMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
    setDragStart(null);
  };

  // Add a new crop box manually
  const handleAddBox = () => {
    const newIndex = cropBoxes.length;
    const newBox: DetectedCropBox = {
      id: `box-${Date.now()}`,
      slotIndex: newIndex,
      x: 0.145,
      y: Math.min(0.8, 0.08 + newIndex * 0.16),
      w: 0.165,
      h: 0.155,
      confidence: 1.0,
      label: `Student Photo ${newIndex + 1}`,
    };

    onCropBoxesChange([...cropBoxes, newBox]);
    setSelectedBoxId(newBox.id);
  };

  // Delete selected crop box
  const handleDeleteBox = (id: string) => {
    const filtered = cropBoxes.filter(b => b.id !== id).map((b, idx) => ({
      ...b,
      slotIndex: idx,
      label: `Student Photo ${idx + 1}`,
    }));
    onCropBoxesChange(filtered);
    if (selectedBoxId === id) {
      setSelectedBoxId(filtered[0]?.id || null);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Visual Document Artboard with Draggable Boxes */}
      <div className="flex-1 flex flex-col space-y-2">
        {/* Controls Toolbar */}
        <div
          className="p-2.5 rounded-xl border flex items-center justify-between gap-2 flex-wrap text-xs"
          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-[#84a92c] flex items-center gap-1.5">
              <Scan className="w-4 h-4" />
              <span>Interactive Photo Crop Canvas</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              ({cropBoxes.length} Photo Regions Active)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                if (pageImageUrl) {
                  const detected = await detectPhotoBoxesOnDocument(pageImageUrl);
                  onCropBoxesChange(detected);
                }
              }}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border hover:border-[#84a92c] flex items-center gap-1 cursor-pointer transition-colors text-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              title="Automatically detect faces and re-align crop frames"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Auto-Align</span>
            </button>

            <button
              type="button"
              onClick={handleAddBox}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border hover:border-[#84a92c] flex items-center gap-1 cursor-pointer transition-colors"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            >
              <Plus className="w-3.5 h-3.5 text-[#84a92c]" />
              <span>Add Crop Box</span>
            </button>

            {selectedBoxId && cropBoxes.length > 1 && (
              <button
                type="button"
                onClick={() => handleDeleteBox(selectedBoxId)}
                className="px-2.5 py-1 text-xs font-bold rounded-lg border hover:border-red-500 text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                title="Delete active box"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Box</span>
              </button>
            )}
          </div>
        </div>

        {/* Document Image Container with Overlaid Crop Boxes */}
        <div className="w-full rounded-2xl overflow-hidden border border-slate-700 bg-slate-950 flex items-center justify-center select-none shadow-xl min-h-[480px] p-2 md:p-4">
          <div
            ref={containerRef}
            onMouseMove={handleContainerMouseMove}
            onMouseUp={handleContainerMouseUp}
            onMouseLeave={handleContainerMouseUp}
            className="relative inline-block max-w-full max-h-[640px] cursor-crosshair"
          >
            <img
              src={pageImageUrl}
              alt="Scanned Document"
              className="max-w-full h-auto object-contain max-h-[640px] block pointer-events-none rounded-lg shadow-md"
            />

            {/* Draggable Overlays */}
            {cropBoxes.map(box => {
              const isSelected = box.id === selectedBoxId;

              return (
                <div
                  key={box.id}
                  onMouseDown={e => handleBoxMouseDown(e, box)}
                  className={`absolute transition-colors cursor-move flex flex-col justify-between p-1 border-2 rounded-lg ${
                    isSelected
                      ? 'border-[#84a92c] bg-[#84a92c]/25 shadow-lg shadow-[#84a92c]/40 z-20 ring-2 ring-[#84a92c]/50'
                      : 'border-cyan-400/90 bg-cyan-500/15 hover:border-cyan-300 z-10'
                  }`}
                  style={{
                    left: `${box.x * 100}%`,
                    top: `${box.y * 100}%`,
                    width: `${box.w * 100}%`,
                    height: `${box.h * 100}%`,
                  }}
                >
                  {/* Header Badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 ${
                        isSelected ? 'bg-[#84a92c] text-slate-950 font-black' : 'bg-slate-900/90 text-cyan-300'
                      }`}
                    >
                      <Move className="w-2.5 h-2.5" />
                      <span>{box.label}</span>
                    </span>
                  </div>

                  {/* Resize Handle (Bottom Right) */}
                  <div
                    onMouseDown={e => handleResizeMouseDown(e, box)}
                    className={`self-end w-4 h-4 rounded-tl-md flex items-center justify-center cursor-nwse-resize shadow-xs ${
                      isSelected ? 'bg-[#84a92c] text-slate-950' : 'bg-cyan-400 text-slate-950'
                    }`}
                    title="Drag to resize crop area"
                  >
                    <Maximize2 className="w-2.5 h-2.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Cropped Photos Preview Column */}
      <div
        className="w-full lg:w-72 p-4 rounded-2xl border flex flex-col space-y-3 flex-shrink-0"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
            <Eye className="w-3.5 h-3.5 text-[#84a92c]" />
            <span>Extracted Photos ({cropBoxes.length})</span>
          </h3>
          <span className="text-[10px] font-mono text-emerald-500 font-bold">Auto-Synced</span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[560px]">
          {cropBoxes.map(box => {
            const thumb = thumbnails.get(box.id);
            const isSelected = box.id === selectedBoxId;

            return (
              <div
                key={box.id}
                onClick={() => setSelectedBoxId(box.id)}
                className={`p-2 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                  isSelected ? 'border-[#84a92c] bg-[#84a92c]/10' : 'hover:opacity-90'
                }`}
                style={{
                  backgroundColor: isSelected ? undefined : 'var(--bg-elevated)',
                  borderColor: isSelected ? '#84a92c' : 'var(--border-primary)',
                }}
              >
                {/* Thumbnail */}
                <div className="w-16 h-20 rounded-lg overflow-hidden bg-slate-900 border border-slate-700 flex items-center justify-center flex-shrink-0 shadow-inner">
                  {thumb ? (
                    <img src={thumb} alt={box.label} className="w-full h-full object-cover" />
                  ) : (
                    <div className="animate-pulse text-[10px] text-slate-500 font-mono">Cropping…</div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {box.label}
                  </p>
                  <p className="text-[10px] font-mono text-slate-400">
                    Slot {box.slotIndex + 1}
                  </p>
                  <p className="inline-flex items-center gap-1 text-[9px] text-[#84a92c] font-mono mt-1">
                    <CheckCircle className="w-2.5 h-2.5" />
                    <span>High-Res Cropped</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
