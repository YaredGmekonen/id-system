import { useState, useEffect } from 'react';
import type { CanvasElement } from '../../db/database';
import { importFigmaDesign, extractFigmaFileKey, type FigmaImportResult } from '../../engine/figmaImporter';
import {
  X,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Link,
  Key,
  Download,
  Loader2,
  Type,
  Image as ImageIcon,
  QrCode,
  Square,
  Circle,
  FileCheck
} from 'lucide-react';

interface FigmaImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate: (result: {
    templateName: string;
    cardWidth: number;
    cardHeight: number;
    backgroundColor: string;
    elements: CanvasElement[];
  }) => void;
}

const DEFAULT_TOKEN = (import.meta as any).env?.VITE_FIGMA_ACCESS_TOKEN || '';

export default function FigmaImportModal({
  isOpen,
  onClose,
  onApplyTemplate,
}: FigmaImportModalProps) {
  const [figmaUrl, setFigmaUrl] = useState('');
  const [token, setToken] = useState(() => {
    return localStorage.getItem('siliconlabs_figma_token') || DEFAULT_TOKEN;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<FigmaImportResult | null>(null);
  const [layerBindings, setLayerBindings] = useState<Record<string, string>>({});

  useEffect(() => {
    if (token) {
      localStorage.setItem('siliconlabs_figma_token', token);
    }
  }, [token]);

  if (!isOpen) return null;

  const handleFetchFigma = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setImportResult(null);

    const cleanUrl = figmaUrl.trim();
    if (!cleanUrl) {
      setError('Please paste your Figma file URL.');
      return;
    }

    const cleanToken = token.trim();
    if (!cleanToken) {
      setError('Please enter your Figma Personal Access Token.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await importFigmaDesign(cleanUrl, cleanToken);
      setImportResult(result);

      // Initialize layer bindings
      const initialBindings: Record<string, string> = {};
      result.elements.forEach(el => {
        if (el.dataField) {
          initialBindings[el.id] = el.dataField;
        }
      });
      setLayerBindings(initialBindings);
    } catch (err: any) {
      console.error('[FigmaImportModal] Error fetching design:', err);
      setError(err?.message || 'Failed to connect to Figma. Please verify the URL and token.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!importResult) return;

    // Apply any customized bindings back to elements
    const updatedElements = importResult.elements.map(el => {
      const customBinding = layerBindings[el.id];
      if (customBinding) {
        return {
          ...el,
          type: 'dataField' as const,
          dataField: customBinding,
          text: `{{${customBinding}}}`,
        };
      }
      return el;
    });

    onApplyTemplate({
      templateName: importResult.name,
      cardWidth: importResult.cardWidth,
      cardHeight: importResult.cardHeight,
      backgroundColor: importResult.backgroundColor,
      elements: updatedElements,
    });

    onClose();
  };

  const detectedFileKey = extractFigmaFileKey(figmaUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#0acf83]/15 text-[#0acf83] flex items-center justify-center font-bold">
              <svg className="w-5 h-5" viewBox="0 0 38 57" fill="none">
                <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
                <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
                <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
                <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
                <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Figma Direct Template Connector
              </h2>
              <p className="text-xs text-slate-400">
                Pull vector layers, text fields, logos, and QR frames directly from your Figma project.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {/* Input Form */}
          <form onSubmit={handleFetchFigma} className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 flex items-center justify-between" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-1.5">
                  <Link className="w-3.5 h-3.5 text-[#84a92c]" />
                  Figma File URL or Design Link
                </span>
                {detectedFileKey && (
                  <span className="font-mono text-[10px] text-emerald-400">
                    Key: {detectedFileKey}
                  </span>
                )}
              </label>
              <input
                type="text"
                value={figmaUrl}
                onChange={e => setFigmaUrl(e.target.value)}
                placeholder="https://www.figma.com/design/XXXXX/My-ID-Card-Design"
                className="w-full py-2.5 px-3 rounded-xl border text-xs font-mono focus:outline-none focus:border-[#84a92c] transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Tip: Copy the link from your browser address bar or click "Share &rarr; Copy link" in Figma.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 flex items-center justify-between" style={{ color: 'var(--text-secondary)' }}>
                <span className="flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#84a92c]" />
                  Figma Personal Access Token (API Key)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Saved locally
                </span>
              </label>
              <input
                type="password"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="figd_..."
                className="w-full py-2.5 px-3 rounded-xl border text-xs font-mono focus:outline-none focus:border-[#84a92c] transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !figmaUrl.trim()}
              className="w-full py-3 px-4 rounded-xl bg-[#84a92c] hover:bg-[#96be33] disabled:opacity-50 text-slate-950 font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to Figma & Deconstructing Layers…</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Fetch & Deconstruct Figma Layers</span>
                </>
              )}
            </button>
          </form>

          {/* Error notice */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-xs">Connection Failed</p>
                <p className="text-[11px] leading-relaxed">{error}</p>
              </div>
            </div>
          )}

          {/* Import Results & Layer Inspector */}
          {importResult && (
            <div className="p-4 rounded-xl border space-y-4 animate-fade-in" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                      {importResult.name}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {importResult.cardWidth} × {importResult.cardHeight} px • {importResult.elements.length} Vector Layers Extracted
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                  Ready to Load
                </span>
              </div>

              {/* Layer Mapping Table */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-slate-300">
                  Extracted Layers & Dynamic Data Binding:
                </p>
                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                  {importResult.elements.map((el, idx) => {
                    return (
                      <div
                        key={el.id || idx}
                        className="p-2 rounded-lg border flex items-center justify-between gap-3 text-[11px]"
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                      >
                        <div className="flex items-center gap-2 truncate min-w-0">
                          <span className="p-1 rounded bg-white/5 text-slate-400 font-mono text-[10px]">
                            {el.type === 'text' || el.type === 'dataField' ? <Type className="w-3 h-3" /> :
                             el.type === 'photo' ? <ImageIcon className="w-3 h-3 text-emerald-400" /> :
                             el.type === 'qr' ? <QrCode className="w-3 h-3 text-blue-400" /> :
                             el.type === 'circle' ? <Circle className="w-3 h-3" /> :
                             <Square className="w-3 h-3" />}
                          </span>
                          <div className="truncate">
                            <p className="font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                              {el.name || el.type}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate font-mono">
                              {el.type === 'text' || el.type === 'dataField' ? `"${el.text}"` : `${el.width}×${el.height}px`}
                            </p>
                          </div>
                        </div>

                        {/* Binding selector for text fields */}
                        {(el.type === 'text' || el.type === 'dataField') && (
                          <div className="shrink-0 flex items-center gap-1">
                            <span className="text-[10px] text-slate-500">Bind:</span>
                            <select
                              value={layerBindings[el.id] || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setLayerBindings(prev => ({
                                  ...prev,
                                  [el.id]: val,
                                }));
                              }}
                              className="py-1 px-2 rounded border text-[10px] font-mono focus:outline-none focus:border-[#84a92c]"
                              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                            >
                              <option value="">Static Text</option>
                              <option value="fullName">Full Name</option>
                              <option value="idNumber">ID Number</option>
                              <option value="department">Department / Grade</option>
                              <option value="role">Role / Position</option>
                              <option value="schoolName">School / Company</option>
                              <option value="phone">Phone</option>
                              <option value="email">Email</option>
                              <option value="bloodGroup">Blood Group</option>
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t flex items-center justify-between"
          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
        >
          <button
            onClick={onClose}
            className="py-2 px-4 rounded-xl border text-xs font-semibold hover:opacity-80 transition-opacity cursor-pointer"
            style={{ borderColor: 'var(--border-primary)' }}
          >
            Cancel
          </button>

          {importResult && (
            <button
              onClick={handleApply}
              className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all"
            >
              <FileCheck className="w-4 h-4" />
              <span>Apply & Open in Vector Designer</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
