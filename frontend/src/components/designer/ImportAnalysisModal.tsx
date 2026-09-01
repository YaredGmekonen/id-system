import React, { useState, useEffect } from 'react';
import { DATA_FIELDS, CARD } from '../../design-tokens';
import type { CanvasElement } from '../../db/database';
import {
  deconstructDesignImage,
  buildCanvasElements,
  type DeconstructedField,
  type DeconstructionResult,
  type RawOcrLine,
} from '../../engine/designDeconstructor';
import { deconstructDesignFile, getFileCategory } from '../../engine/smartFileDeconstructor';
import {
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  X,
  Scan,
  Zap,
  Check,
  User,
  QrCode,
  Eye,
  Sliders,
  Terminal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ImportAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  previewUrl: string;
  side?: 'front' | 'back';
  onApplyLayers: (layers: CanvasElement[]) => void;
}

export default function ImportAnalysisModal({
  isOpen,
  onClose,
  file,
  previewUrl,
  side = 'front',
  onApplyLayers,
}: ImportAnalysisModalProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [deconstructResult, setDeconstructResult] = useState<DeconstructionResult | null>(null);
  const [fields, setFields] = useState<DeconstructedField[]>([]);
  const [includeBaseGraphic, setIncludeBaseGraphic] = useState(true);
  const [previewMode, setPreviewMode] = useState<'layers' | 'cleaned' | 'original'>('layers');
  const [showOcrDebug, setShowOcrDebug] = useState(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [diagnosticLine, setDiagnosticLine] = useState<string>('Routing file...');

  const fileCategory = file ? getFileCategory(file) : 'raster';

  useEffect(() => {
    if (!isOpen || !file) return;

    setIsAnalyzing(true);
    setAnalysisError(null);

    const category = getFileCategory(file);

    deconstructDesignFile(file, CARD.WIDTH_PX, CARD.HEIGHT_PX, side)
      .then(res => {
        setDeconstructResult(res);
        setFields(res.fields);

        if (category === 'psd') {
          if (res.fields.length === 0) {
            setDiagnosticLine('File routed to: PSD parser, ag-psd succeeded, but returned 0 usable layers');
          } else {
            setDiagnosticLine(`File routed to: PSD parser, ag-psd succeeded, extracted ${res.fields.length} usable layer(s)`);
          }
        } else if (category === 'raster') {
          setDiagnosticLine('File routed to: raster pipeline');
        } else if (category === 'ai') {
          setDiagnosticLine('File routed to: AI (Illustrator) pipeline');
        } else {
          setDiagnosticLine(`File routed to: ${category} pipeline`);
        }

        // Check if Gemini API failed (debugLog will contain FATAL entries)
        const fatalLog = res.debugLog.find(l => l.includes('[Step 2: FATAL]'));
        if (fatalLog && res.fields.length === 0) {
          setAnalysisError('AI Vision analysis failed. The image was imported as a plain background. You can retry.');
        }
        setIsAnalyzing(false);
      })
      .catch(err => {
        const errorMsg = err instanceof Error ? err.message : (typeof err === 'string' ? err : 'Unknown file processing error');
        console.error('Design file analysis error:', errorMsg);

        if (category === 'psd') {
          setDiagnosticLine(`File routed to: PSD parser, but ag-psd threw: ${errorMsg}`);
        } else if (category === 'raster') {
          setDiagnosticLine('File routed to: raster pipeline');
        } else {
          setDiagnosticLine(`File routed to: ${category} pipeline (Error: ${errorMsg})`);
        }

        setAnalysisError(errorMsg);
        setIsAnalyzing(false);
      });
  }, [isOpen, file, previewUrl, side]);

  if (!isOpen || !file) return null;

  const handleToggleField = (id: string) => {
    setFields(prev =>
      prev.map(f => (f.id === id ? { ...f, selected: !f.selected } : f))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setFields(prev => prev.map(f => ({ ...f, selected: select })));
  };

  const handleUpdateBinding = (id: string, binding: string) => {
    setFields(prev =>
      prev.map(f => {
        if (f.id !== id) return f;
        let replacement = f.replacementText;
        if (f.label && binding) {
          replacement = `${f.label} : ${binding}`;
        } else if (binding) {
          replacement = binding;
        } else {
          replacement = f.originalText;
        }
        return {
          ...f,
          suggestedBinding: binding,
          replacementText: replacement,
        };
      })
    );
  };

  const handleUpdateReplacementText = (id: string, text: string) => {
    setFields(prev =>
      prev.map(f => (f.id === id ? { ...f, replacementText: text } : f))
    );
  };

  const handleApply = () => {
    if (!deconstructResult) return;

    let layers = buildCanvasElements(
      deconstructResult.cleanedBackgroundUrl,
      fields,
      CARD.WIDTH_PX,
      CARD.HEIGHT_PX,
      side
    );

    // If user unchecked base graphic, filter out the base image element
    if (!includeBaseGraphic) {
      layers = layers.filter(l => !l.id.startsWith('base-card-bg-'));
    }

    onApplyLayers(layers);
    onClose();
  };

  const selectedCount = fields.filter(f => f.selected).length + (includeBaseGraphic ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div
        className="w-full max-w-5xl max-h-[94vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden text-xs"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-primary)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Header */}
        <div
          className="p-4 md:px-6 border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#84a92c]/20 text-[#84a92c] border border-[#84a92c]/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                <span>Adaptive Design Analyzer & Layer Segmenter</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#84a92c]/20 text-[#84a92c] font-mono font-bold uppercase">
                  {side} FACE
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Segmenting {file.name} into discrete movable vector elements — only fields found in this design are proposed.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {/* Visible Pipeline Diagnostic Line */}
          <div className="px-4 py-2.5 rounded-2xl border bg-slate-900/90 border-slate-700/80 flex items-center justify-between gap-3 text-xs font-mono shadow-inner">
            <div className="flex items-center gap-2.5 min-w-0">
              <Terminal className="w-4 h-4 text-[#84a92c] flex-shrink-0" />
              <span className="text-slate-400 font-semibold flex-shrink-0">Routing Diagnostic:</span>
              <span className={`truncate ${
                diagnosticLine.includes('threw:') || diagnosticLine.includes('0 usable layers') || diagnosticLine.includes('raster pipeline')
                  ? 'text-amber-400 font-bold'
                  : 'text-emerald-400 font-bold'
              }`}>
                {diagnosticLine}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono flex-shrink-0">
              Format: {file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN'}
            </span>
          </div>

          {isAnalyzing ? (
            <div className="py-16 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#84a92c]/10 border border-[#84a92c]/30 flex items-center justify-center animate-pulse">
                <Scan className="w-6 h-6 text-[#84a92c] animate-spin" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  {fileCategory === 'psd'
                    ? 'Extracting Native Photoshop Layers…'
                    : fileCategory === 'ai'
                    ? 'Inspecting Adobe Illustrator File…'
                    : 'AI Analyzing Template Layout…'}
                </h3>
                <p className="text-slate-400 text-[11px] max-w-sm mt-1">
                  {fileCategory === 'psd'
                    ? 'Reading actual text layers, fonts, pixel dimensions, and composite graphics directly from PSD.'
                    : fileCategory === 'ai'
                    ? 'Verifying PDF-compatible Illustrator stream and extracting vector layout.'
                    : 'Gemini Vision is identifying text labels, data fields, photo regions, codes, and layout structure.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* API / File Error Banner */}
              {analysisError && (
                <div className="p-4 rounded-2xl border border-amber-500/40 bg-amber-950/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-300">{analysisError}</p>
                      <p className="text-[10px] text-amber-400/70 mt-0.5">Check file format or network connection and retry.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setAnalysisError(null);
                      setIsAnalyzing(true);
                      const cat = getFileCategory(file);
                      deconstructDesignFile(file, CARD.WIDTH_PX, CARD.HEIGHT_PX, side)
                        .then(res => {
                          setDeconstructResult(res);
                          setFields(res.fields);

                          if (cat === 'psd') {
                            if (res.fields.length === 0) {
                              setDiagnosticLine('File routed to: PSD parser, ag-psd succeeded, but returned 0 usable layers');
                            } else {
                              setDiagnosticLine(`File routed to: PSD parser, ag-psd succeeded, extracted ${res.fields.length} usable layer(s)`);
                            }
                          } else if (cat === 'raster') {
                            setDiagnosticLine('File routed to: raster pipeline');
                          } else {
                            setDiagnosticLine(`File routed to: ${cat} pipeline`);
                          }

                          const fatalLog = res.debugLog.find(l => l.includes('[Step 2: FATAL]'));
                          if (fatalLog && res.fields.length === 0) {
                            setAnalysisError('AI Vision analysis failed again. Check your API key or network connection.');
                          }
                          setIsAnalyzing(false);
                        })
                        .catch(err => {
                          const errorMsg = err instanceof Error ? err.message : (typeof err === 'string' ? err : 'Retry failed');
                          if (cat === 'psd') {
                            setDiagnosticLine(`File routed to: PSD parser, but ag-psd threw: ${errorMsg}`);
                          } else {
                            setDiagnosticLine(`File routed to: ${cat} pipeline (Error: ${errorMsg})`);
                          }
                          setAnalysisError(`Retry failed: ${errorMsg}`);
                          setIsAnalyzing(false);
                        });
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold hover:bg-amber-500/30 transition-colors cursor-pointer flex-shrink-0"
                  >
                    Retry Analysis
                  </button>
                </div>
              )}

              {/* Preview & Controls Bar */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Visual Artboard Preview */}
                <div
                  className="md:col-span-5 rounded-2xl border p-3 flex flex-col items-center justify-center gap-2 relative overflow-hidden"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                  }}
                >
                  <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <span className="flex items-center gap-1 font-bold">
                      <Eye className="w-3.5 h-3.5 text-[#84a92c]" />
                      Preview:
                    </span>
                    <div className="flex gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
                      <button
                        onClick={() => setPreviewMode('layers')}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                          previewMode === 'layers' ? 'bg-[#84a92c] text-slate-900 font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Layers
                      </button>
                      <button
                        onClick={() => setPreviewMode('cleaned')}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                          previewMode === 'cleaned' ? 'bg-[#84a92c] text-slate-900 font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Clean Base
                      </button>
                      <button
                        onClick={() => setPreviewMode('original')}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                          previewMode === 'original' ? 'bg-[#84a92c] text-slate-900 font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Original
                      </button>
                    </div>
                  </div>

                  <div className="w-full aspect-[1.586/1] bg-slate-900 rounded-xl overflow-hidden relative shadow-lg border border-slate-700/50">
                    <img
                      src={
                        previewMode === 'original'
                          ? deconstructResult?.originalImageUrl || previewUrl
                          : previewMode === 'cleaned'
                          ? deconstructResult?.cleanedBackgroundUrl || previewUrl
                          : deconstructResult?.cleanedBackgroundUrl || previewUrl
                      }
                      alt="Design Preview"
                      className="w-full h-full object-cover"
                    />

                    {/* Bounding box overlays in layers mode */}
                    {previewMode === 'layers' &&
                      fields
                        .filter(f => f.selected)
                        .map(f => {
                          const overlayW = deconstructResult?.widthPx || CARD.WIDTH_PX;
                          const overlayH = deconstructResult?.heightPx || CARD.HEIGHT_PX;
                          const leftPct = (f.bbox.x / overlayW) * 100;
                          const topPct = (f.bbox.y / overlayH) * 100;
                          const widthPct = (f.bbox.w / overlayW) * 100;
                          const heightPct = (f.bbox.h / overlayH) * 100;

                          return (
                            <div
                              key={f.id}
                              style={{
                                left: `${leftPct}%`,
                                top: `${topPct}%`,
                                width: `${widthPct}%`,
                                height: `${heightPct}%`,
                              }}
                              className={`absolute border border-dashed rounded-xs flex items-center justify-center transition-all ${
                                f.type === 'photo'
                                  ? 'border-emerald-400 bg-emerald-500/20 rounded-full'
                                  : f.type === 'barcode' || f.type === 'qr'
                                  ? 'border-purple-400 bg-purple-500/20'
                                  : f.type === 'header'
                                  ? 'border-cyan-400 bg-cyan-500/20'
                                  : 'border-[#84a92c] bg-[#84a92c]/25'
                              }`}
                            >
                              <span className="text-[8px] font-mono font-bold text-white bg-black/80 px-1 py-0.5 rounded shadow-xs truncate max-w-full">
                                {f.label}
                              </span>
                            </div>
                          );
                        })}
                  </div>

                  <p className="text-[10px] text-slate-400 text-center mt-1">
                    Card format: CR80 ({CARD.WIDTH_PX}×{CARD.HEIGHT_PX}px @ 300 DPI)
                  </p>
                </div>

                {/* Status & Elements Count */}
                <div className="md:col-span-7 flex flex-col justify-between space-y-3">
                  <div
                    className="p-3.5 rounded-2xl border space-y-2.5"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-primary)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-[#84a92c]" />
                        <span>Layer Separation Controls</span>
                      </span>
                      <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                        {fields.length} Elements Found
                      </span>
                    </div>

                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeBaseGraphic}
                        onChange={e => setIncludeBaseGraphic(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded accent-[#84a92c] cursor-pointer"
                      />
                      <div>
                        <span className="font-semibold text-xs text-white block">
                          Include Cleaned Base Graphic as Background Layer
                        </span>
                        <span className="text-[11px] text-slate-400 block leading-tight">
                          Strictly masks the claimed text/photo/code bounding boxes so new editable layers sit cleanly in place without double-printing.
                        </span>
                      </div>
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl border bg-slate-900/50 border-slate-700/60 text-center">
                      <span className="text-lg font-black text-[#84a92c] block">{fields.length}</span>
                      <span className="text-[10px] text-slate-400 font-medium">Found in File</span>
                    </div>
                    <div className="p-2.5 rounded-xl border bg-slate-900/50 border-slate-700/60 text-center">
                      <span className="text-lg font-black text-white block">{fields.filter(f => f.selected).length}</span>
                      <span className="text-[10px] text-slate-400 font-medium">Selected</span>
                    </div>
                    <div className="p-2.5 rounded-xl border bg-slate-900/50 border-slate-700/60 text-center">
                      <span className="text-lg font-black text-emerald-400 block">
                        {fields.filter(f => f.suggestedBinding).length}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Auto-Bound</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSelectAll(true)}
                        className="text-[#84a92c] hover:underline font-bold cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-slate-600">•</span>
                      <button
                        onClick={() => handleSelectAll(false)}
                        className="text-slate-400 hover:underline font-medium cursor-pointer"
                      >
                        Deselect All
                      </button>
                    </div>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {fields.length === 0 ? 'No text/photo elements found' : 'Each element can be toggled individually'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ================= 🔬 LIVE OCR DIAGNOSTIC PANEL ================= */}
              <div
                className="rounded-2xl border overflow-hidden"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-primary)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowOcrDebug(!showOcrDebug)}
                  className="w-full p-3 flex items-center justify-between text-left cursor-pointer hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-[#84a92c]" />
                    <span className="font-bold text-xs text-white">
                      🔬 AI Vision Diagnostic Inspector
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[#84a92c]/20 text-[#84a92c] font-mono font-bold text-[10px]">
                       AI Found {deconstructResult?.rawOcrLines.length || 0} Elements
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-[10px] font-mono">
                    <span>{showOcrDebug ? 'Collapse' : 'Expand Debug Log'}</span>
                    {showOcrDebug ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {showOcrDebug && deconstructResult && (
                  <div className="border-t p-3 space-y-3 bg-black/40" style={{ borderColor: 'var(--border-primary)' }}>
                    {/* Execution Pipeline Steps */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-700/80">
                         <span className="text-slate-400 block">Step 1: Image Loaded</span>
                        <strong className="text-emerald-400">
                          ✅ OK ({deconstructResult.widthPx}×{deconstructResult.heightPx}px)
                        </strong>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-700/80">
                         <span className="text-slate-400 block">Step 2: AI Vision</span>
                        <strong className="text-[#84a92c]">
                          ✅ {deconstructResult.rawOcrLines.length} elements found ({deconstructResult.fields.filter(f => f.suggestedBinding).length} auto-bound)
                        </strong>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-700/80">
                        <span className="text-slate-400 block">Step 3: Canvas Layers</span>
                        <strong className="text-cyan-400">
                          ✅ OK ({deconstructResult.generatedLayers.length} layers ready)
                        </strong>
                      </div>
                    </div>

                    {/* Raw OCR Lines List */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-300 block uppercase tracking-wider font-mono">
                        AI Vision Detected Elements ({deconstructResult.rawOcrLines.length}):
                      </span>

                      {deconstructResult.rawOcrLines.length === 0 ? (
                        <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30 text-red-400 text-[11px] flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                          <span>No layout elements returned by AI Vision analysis.</span>
                        </div>
                      ) : (
                        <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-slate-800 p-2 bg-slate-950 font-mono text-[10px]">
                          {deconstructResult.rawOcrLines.map(line => (
                            <div key={line.index} className="p-1.5 rounded bg-slate-900/80 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 truncate">
                                <span className="text-slate-500 font-bold">#{line.index}</span>
                                <span className="text-white font-bold truncate">"{line.text}"</span>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-slate-400 text-[9px]">
                                  BBox: ({line.bbox.x0},{line.bbox.y0} to {line.bbox.x1},{line.bbox.y1})
                                </span>
                                <span className="text-slate-300 bg-slate-800 px-1.5 py-0.2 rounded text-[9px]">
                                  {Math.round(line.confidence)}% conf
                                </span>
                                {line.ruleMatched ? (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[9px]">
                                    {line.ruleMatched} ➔ {line.suggestedBinding}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 text-[9px]">
                                    {line.classification}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Detected Layers Table */}
              <div
                className="rounded-2xl border overflow-hidden"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-primary)',
                }}
              >
                <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#84a92c]" />
                    <span className="font-bold text-xs">Detected Design Elements (Confirm or Adjust Binding)</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Target: {side.toUpperCase()} Canvas
                  </span>
                </div>

                {fields.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <p className="font-bold text-sm text-slate-300">No discrete text or photo regions detected in this design.</p>
                    <p className="text-[11px] mt-1">The image will be imported as a clean background graphic on the {side} canvas.</p>
                  </div>
                ) : (
                  <div className="divide-y max-h-64 overflow-y-auto" style={{ borderColor: 'var(--border-primary)' }}>
                    {fields.map(f => (
                      <div
                        key={f.id}
                        className={`p-2.5 flex items-center gap-3 transition-colors ${
                          f.selected ? 'bg-slate-800/30' : 'opacity-40'
                        }`}
                      >
                        {/* Per-element On/Off Toggle */}
                        <input
                          type="checkbox"
                          checked={f.selected}
                          onChange={() => handleToggleField(f.id)}
                          className="h-4 w-4 rounded accent-[#84a92c] cursor-pointer flex-shrink-0"
                          title="Toggle element on/off"
                        />

                        {/* Element Type Icon */}
                        <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                          {f.type === 'photo' ? (
                            <User className="w-4 h-4 text-emerald-400" />
                          ) : f.type === 'barcode' ? (
                            <span className="font-mono font-black text-[9px] text-purple-400">|||</span>
                          ) : f.type === 'qr' ? (
                            <QrCode className="w-4 h-4 text-purple-400" />
                          ) : (
                            <span className="font-serif font-bold text-xs text-[#84a92c]">T</span>
                          )}
                        </div>

                        {/* Label & Original Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-white truncate">{f.label}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                              {Math.round(f.confidence * 100)}% match
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate font-mono">
                            Found: <span className="text-slate-300">"{f.originalText}"</span>
                          </div>
                        </div>

                        {/* Data Binding Dropdown */}
                        <div className="w-48 flex-shrink-0">
                          <select
                            value={f.suggestedBinding}
                            onChange={e => handleUpdateBinding(f.id, e.target.value)}
                            className="w-full py-1.5 px-2 text-[11px] rounded-lg border font-mono bg-slate-900 border-slate-700 text-[#84a92c] focus:outline-none focus:border-[#84a92c]"
                          >
                            <option value="">(Static Custom Text)</option>
                            {DATA_FIELDS.map(df => (
                              <option key={df.key} value={df.key}>
                                {df.label} ({df.key})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Replacement / Template text input */}
                        <div className="w-44 flex-shrink-0">
                          <input
                            type="text"
                            value={f.replacementText}
                            onChange={e => handleUpdateReplacementText(f.id, e.target.value)}
                            className="w-full py-1 px-2 text-[11px] rounded-lg border font-mono bg-slate-950 border-slate-700 text-slate-200"
                            placeholder="Layer text..."
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="p-4 md:px-6 border-t flex items-center justify-between flex-shrink-0"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
            style={{ borderColor: 'var(--border-primary)' }}
          >
            Cancel
          </button>

          <button
            onClick={handleApply}
            disabled={isAnalyzing || selectedCount === 0}
            className="btn-primary py-2.5 px-5 text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Apply {selectedCount} {selectedCount === 1 ? 'Element' : 'Elements'} to {side.toUpperCase()} Canvas</span>
          </button>
        </div>
      </div>
    </div>
  );
}
