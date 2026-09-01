import React, { useState, useRef } from 'react';
import type { CanvasElement, CardTemplate } from '../../db/database';
import { CARD, DATA_FIELDS } from '../../design-tokens';
import {
  LayoutTemplate,
  Shapes,
  Type,
  Sliders,
  Upload,
  Layers,
  Sparkles,
  QrCode,
  Image as ImageIcon,
  Shield,
  CreditCard,
  Radio,
  PenTool,
  Award,
  Star,
  Hexagon,
  Triangle,
  Heart,
  Cloud,
  Zap,
  Lock,
  Unlock,
  Trash2,
  Copy,
  FlipHorizontal,
  FlipVertical,
  X,
  Search,
  Check,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Fingerprint,
} from 'lucide-react';

interface CanvaMobileBarProps {
  onAddElement: (element: CanvasElement) => void;
  selectedElement: CanvasElement | null;
  selectedIds: string[];
  elements: CanvasElement[];
  onUpdateElement: (id: string, changes: Partial<CanvasElement>) => void;
  onDeleteElement: (id: string) => void;
  onDuplicateElement: () => void;
  onSmartImportFile?: (file: File) => void;
  onLoadStarter?: (type: 'corporate' | 'student' | 'security') => void;
  activeSide: 'front' | 'back';
  onSideChange: (side: 'front' | 'back') => void;
  cardWidth: number;
  cardHeight: number;
}

export default function CanvaMobileBar({
  onAddElement,
  selectedElement,
  selectedIds,
  elements,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onSmartImportFile,
  onLoadStarter,
  activeSide,
  onSideChange,
  cardWidth,
  cardHeight,
}: CanvaMobileBarProps) {
  const [activeDrawer, setActiveDrawer] = useState<'templates' | 'elements' | 'text' | 'edit' | 'uploads' | 'layers' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [elementCategory, setElementCategory] = useState<'all' | 'shapes' | 'security' | 'photos' | 'tokens'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nextId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const closeDrawer = () => setActiveDrawer(null);

  // Helper to add element and close drawer
  const addAndClose = (el: CanvasElement) => {
    onAddElement(el);
    closeDrawer();
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 select-none">
      {/* 1. Contextual Quick Actions (Shows when an element is selected and drawer is closed) */}
      {selectedElement && !activeDrawer && (
        <div
          className="px-3 py-2 border-t flex items-center gap-2 overflow-x-auto no-scrollbar shadow-xl animate-fade-in"
          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
        >
          <span className="text-[10px] font-mono font-bold uppercase text-[#84a92c] px-2 py-0.5 rounded bg-[#84a92c]/10 flex-shrink-0">
            {selectedElement.name || selectedElement.type}
          </span>

          {/* Color Picker Pill */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {['#0f172a', '#1e3a8a', '#10b981', '#84a92c', '#f59e0b', '#dc2626', '#ffffff'].map(c => (
              <button
                key={c}
                onClick={() => onUpdateElement(selectedElement.id, { fill: c })}
                className="w-5 h-5 rounded-full border border-white/30 shadow-xs flex-shrink-0"
                style={{ backgroundColor: c }}
                title={`Color ${c}`}
              />
            ))}
          </div>

          <div className="h-4 w-px bg-slate-700 flex-shrink-0 mx-1" />

          {/* Duplicate */}
          <button
            onClick={onDuplicateElement}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-200 hover:bg-white/10 flex items-center gap-1 flex-shrink-0 border"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
          >
            <Copy className="w-3 h-3 text-blue-400" />
            <span>Copy</span>
          </button>

          {/* Flip Horizontal */}
          <button
            onClick={() => onUpdateElement(selectedElement.id, { flipX: !selectedElement.flipX })}
            className="p-1.5 rounded-lg text-slate-300 hover:bg-white/10 flex-shrink-0 border"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            title="Flip Horizontal"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Lock / Unlock */}
          <button
            onClick={() => onUpdateElement(selectedElement.id, { locked: !selectedElement.locked })}
            className={`p-1.5 rounded-lg flex-shrink-0 border ${selectedElement.locked ? 'text-amber-400 border-amber-500/40' : 'text-slate-400'}`}
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: selectedElement.locked ? undefined : 'var(--border-primary)' }}
            title={selectedElement.locked ? 'Unlock' : 'Lock'}
          >
            {selectedElement.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>

          {/* Full Properties Button */}
          <button
            onClick={() => setActiveDrawer('edit')}
            className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-[#84a92c] bg-[#84a92c]/10 border border-[#84a92c]/30 flex items-center gap-1 flex-shrink-0"
          >
            <Sliders className="w-3 h-3" />
            <span>Edit</span>
          </button>

          {/* Delete */}
          <button
            onClick={() => onDeleteElement(selectedElement.id)}
            className="p-1.5 rounded-lg text-rose-400 bg-rose-500/10 border border-rose-500/30 flex-shrink-0"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Canva-Style Sliding Bottom Drawer */}
      {activeDrawer && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs animate-fade-in" onClick={closeDrawer} />

          {/* Drawer Content */}
          <div
            className="relative w-full max-h-[75vh] min-h-[50vh] rounded-t-3xl border-t p-4 shadow-2xl flex flex-col z-10 overflow-hidden animate-slide-up"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
          >
            {/* Drag Handle Bar */}
            <div className="w-12 h-1.5 rounded-full bg-slate-600/60 mx-auto mb-3 cursor-pointer" onClick={closeDrawer} />

            {/* Header with Search and Close */}
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-primary)' }}>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[var(--text-primary)] capitalize">
                  {activeDrawer === 'templates' ? 'Card Templates' : activeDrawer === 'elements' ? 'Design Elements' : activeDrawer === 'text' ? 'Text & Data Tokens' : activeDrawer === 'edit' ? 'Element Properties' : activeDrawer === 'uploads' ? 'Uploads & Graphics' : 'Layer Manager'}
                </span>
              </div>
              <button
                onClick={closeDrawer}
                className="p-1 rounded-full text-slate-400 hover:text-white bg-slate-800/80 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* DRAWER BODY: CONTENT BY TAB */}
            <div className="flex-1 overflow-y-auto py-3 space-y-4 text-xs">
              {/* ===== TAB 1: TEMPLATES ===== */}
              {activeDrawer === 'templates' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-[var(--text-muted)] font-mono uppercase">Pre-Engineered Starters</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      onClick={() => {
                        onLoadStarter?.('corporate');
                        closeDrawer();
                      }}
                      className="p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all hover:border-[#84a92c] cursor-pointer"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                    >
                      <div>
                        <div className="font-bold text-xs text-white">Corporate Executive Pass</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">CR80 • Photo + QR + Title Banner</div>
                      </div>
                      <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">CR80</span>
                    </button>

                    <button
                      onClick={() => {
                        onLoadStarter?.('student');
                        closeDrawer();
                      }}
                      className="p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all hover:border-[#84a92c] cursor-pointer"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                    >
                      <div>
                        <div className="font-bold text-xs text-white">University Student Pass</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Academic • Photo + Barcode + QR</div>
                      </div>
                      <span className="px-2 py-1 rounded bg-[#84a92c]/20 text-[#84a92c] text-[10px] font-bold">Academic</span>
                    </button>

                    <button
                      onClick={() => {
                        onLoadStarter?.('security');
                        closeDrawer();
                      }}
                      className="p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all hover:border-[#84a92c] cursor-pointer"
                      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                    >
                      <div>
                        <div className="font-bold text-xs text-white">High-Tech Security Badge</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Dark Holographic Enclave Key</div>
                      </div>
                      <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-400 text-[10px] font-bold">Security</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ===== TAB 2: ELEMENTS (Canva Style Grid) ===== */}
              {activeDrawer === 'elements' && (
                <div className="space-y-3">
                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                    {(['all', 'shapes', 'security', 'photos', 'tokens'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setElementCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all cursor-pointer flex-shrink-0 ${
                          elementCategory === cat ? 'bg-[#84a92c] text-slate-950 shadow-xs' : 'bg-slate-800/80 text-slate-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Elements Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {/* Shapes */}
                    {(elementCategory === 'all' || elementCategory === 'shapes') && (
                      <>
                        <button
                          onClick={() => addAndClose({ id: nextId('rect'), type: 'rect', x: 50, y: 50, width: 220, height: 80, fill: '#1e3a8a', cornerRadius: 8, name: 'Banner Box' })}
                          className="p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 hover:border-[#84a92c] transition-all cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                        >
                          <div className="w-8 h-6 rounded bg-blue-600 border border-blue-400/50" />
                          <span className="text-[10px] font-semibold text-slate-200">Rectangle</span>
                        </button>

                        <button
                          onClick={() => addAndClose({ id: nextId('circle'), type: 'circle', x: 100, y: 100, radius: 45, fill: '#84a92c', name: 'Circle' })}
                          className="p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 hover:border-[#84a92c] transition-all cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                        >
                          <div className="w-7 h-7 rounded-full bg-[#84a92c]" />
                          <span className="text-[10px] font-semibold text-slate-200">Circle</span>
                        </button>

                        <button
                          onClick={() => addAndClose({ id: nextId('line'), type: 'line', x: 40, y: 120, width: 280, height: 2, stroke: '#84a92c', strokeWidth: 3, name: 'Divider Line' })}
                          className="p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 hover:border-[#84a92c] transition-all cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                        >
                          <div className="w-8 h-1 rounded bg-[#84a92c]" />
                          <span className="text-[10px] font-semibold text-slate-200">Line</span>
                        </button>

                        <button
                          onClick={() => addAndClose({ id: nextId('badge'), type: 'badge', x: 80, y: 80, width: 140, height: 35, fill: '#84a92c', text: 'VERIFIED', fontSize: 11, fontStyle: 'bold', name: 'Pill Badge' })}
                          className="p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 hover:border-[#84a92c] transition-all cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                        >
                          <div className="px-2 py-0.5 rounded-full bg-[#84a92c] text-[8px] font-bold text-black">PILL</div>
                          <span className="text-[10px] font-semibold text-slate-200">Pill Badge</span>
                        </button>
                      </>
                    )}

                    {/* Security & Barcodes */}
                    {(elementCategory === 'all' || elementCategory === 'security') && (
                      <>
                        <button
                          onClick={() => addAndClose({ id: nextId('qr'), type: 'qr', x: 400, y: 100, width: 120, height: 120, qrPayload: '{{id_number}}', name: 'Dynamic QR' })}
                          className="p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 hover:border-[#84a92c] transition-all cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                        >
                          <QrCode className="w-6 h-6 text-[#84a92c]" />
                          <span className="text-[10px] font-semibold text-slate-200">QR Matrix</span>
                        </button>

                        <button
                          onClick={() => addAndClose({ id: nextId('barcode'), type: 'barcode', x: 200, y: 220, width: 220, height: 50, dataField: '{{id_number}}', name: 'Barcode' })}
                          className="p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 hover:border-[#84a92c] transition-all cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                        >
                          <div className="font-mono text-[9px] font-bold text-white tracking-widest">||||||||||||</div>
                          <span className="text-[10px] font-semibold text-slate-200">Barcode</span>
                        </button>

                        <button
                          onClick={() => addAndClose({ id: nextId('rfid'), type: 'rfid', x: 40, y: 40, width: 45, height: 45, stroke: '#2563EB', name: 'RFID Icon' })}
                          className="p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 hover:border-[#84a92c] transition-all cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                        >
                          <Radio className="w-6 h-6 text-blue-400" />
                          <span className="text-[10px] font-semibold text-slate-200">RFID Wave</span>
                        </button>

                        <button
                          onClick={() => addAndClose({ id: nextId('stamp'), type: 'stamp', x: 300, y: 150, width: 85, height: 85, stroke: '#DC2626', name: 'Official Stamp' })}
                          className="p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 hover:border-[#84a92c] transition-all cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                        >
                          <Award className="w-6 h-6 text-rose-400" />
                          <span className="text-[10px] font-semibold text-slate-200">Stamp</span>
                        </button>
                      </>
                    )}

                    {/* Photos */}
                    {(elementCategory === 'all' || elementCategory === 'photos') && (
                      <>
                        <button
                          onClick={() => addAndClose({ id: nextId('photo'), type: 'photo', x: 40, y: 80, width: 160, height: 200, dataField: '{{photo}}', name: 'Photo Box' })}
                          className="p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 hover:border-[#84a92c] transition-all cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                        >
                          <ImageIcon className="w-6 h-6 text-emerald-400" />
                          <span className="text-[10px] font-semibold text-slate-200">Photo Box</span>
                        </button>

                        <button
                          onClick={() => addAndClose({ id: nextId('sig'), type: 'signature', x: 180, y: 220, width: 180, height: 45, subText: 'Authorized Signature', name: 'Signature Line' })}
                          className="p-3 rounded-2xl border flex flex-col items-center justify-center gap-1.5 hover:border-[#84a92c] transition-all cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                        >
                          <PenTool className="w-6 h-6 text-amber-400" />
                          <span className="text-[10px] font-semibold text-slate-200">Signature</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ===== TAB 3: TEXT & TOKENS ===== */}
              {activeDrawer === 'text' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono uppercase mb-2">Standard Text Headings</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        onClick={() => addAndClose({ id: nextId('text'), type: 'text', x: 50, y: 40, text: 'ORGANIZATION NAME', fontSize: 20, fontStyle: 'bold', fill: '#0f172a', name: 'Main Heading' })}
                        className="p-3 rounded-2xl border text-left hover:border-[#84a92c] transition-all cursor-pointer font-bold text-sm"
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                      >
                        Add Main Heading
                      </button>
                      <button
                        onClick={() => addAndClose({ id: nextId('text'), type: 'text', x: 50, y: 70, text: 'Department / Division', fontSize: 14, fontStyle: 'semibold', fill: '#475569', name: 'Subheading' })}
                        className="p-3 rounded-2xl border text-left hover:border-[#84a92c] transition-all cursor-pointer font-semibold text-xs"
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                      >
                        Add Subheading
                      </button>
                      <button
                        onClick={() => addAndClose({ id: nextId('text'), type: 'text', x: 50, y: 100, text: 'Valid Until: Dec 2026', fontSize: 11, fill: '#64748b', name: 'Body Text' })}
                        className="p-3 rounded-2xl border text-left hover:border-[#84a92c] transition-all cursor-pointer text-xs"
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                      >
                        Add Small Body Text
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] text-[var(--text-muted)] font-mono uppercase mb-2">Instant Dynamic Cardholder Tokens</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { label: 'Full Name', field: '{{full_name}}', size: 22, bold: true },
                        { label: 'ID Number', field: 'ID: {{id_number}}', size: 14, bold: true },
                        { label: 'Job Role', field: '{{role}}', size: 15, bold: true },
                        { label: 'Department', field: '{{department}}', size: 13, bold: false },
                        { label: 'Phone', field: 'Tel: {{phone}}', size: 11, bold: false },
                        { label: 'Blood Group', field: 'Blood: {{bloodGroup}}', size: 12, bold: true },
                      ].map(item => (
                        <button
                          key={item.label}
                          onClick={() => addAndClose({
                            id: nextId('data'),
                            type: 'dataField',
                            x: 60,
                            y: 80,
                            text: item.field,
                            dataField: item.field,
                            fontSize: item.size,
                            fontStyle: item.bold ? 'bold' : 'normal',
                            fill: '#0f172a',
                            name: item.label,
                          })}
                          className="p-2.5 rounded-xl border text-left hover:border-[#84a92c] transition-all cursor-pointer"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                        >
                          <div className="font-bold text-xs text-[#84a92c]">{item.label}</div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">{item.field}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ===== TAB 4: EDIT PROPERTIES (When active) ===== */}
              {activeDrawer === 'edit' && selectedElement && (
                <div className="space-y-4">
                  <div className="p-3 rounded-2xl border space-y-2" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">Element: {selectedElement.name || selectedElement.type}</span>
                      <span className="text-[10px] font-mono text-[#84a92c] uppercase">{selectedElement.type}</span>
                    </div>

                    {/* Text editor for text elements */}
                    {(selectedElement.type === 'text' || selectedElement.type === 'dataField') && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Text Content</label>
                        <input
                          type="text"
                          value={selectedElement.text || ''}
                          onChange={e => onUpdateElement(selectedElement.id, { text: e.target.value })}
                          className="w-full px-3 py-1.5 rounded-xl border text-xs text-white"
                          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                        />
                      </div>
                    )}

                    {/* Font Size slider */}
                    {(selectedElement.type === 'text' || selectedElement.type === 'dataField') && (
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                          <span>Font Size</span>
                          <span className="font-mono text-white">{selectedElement.fontSize || 14}px</span>
                        </div>
                        <input
                          type="range"
                          min="8"
                          max="48"
                          value={selectedElement.fontSize || 14}
                          onChange={e => onUpdateElement(selectedElement.id, { fontSize: Number(e.target.value) })}
                          className="w-full accent-[#84a92c]"
                        />
                      </div>
                    )}

                    {/* Color Fill Options */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-1">Fill Color</label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {['#0f172a', '#1e3a8a', '#065f46', '#84a92c', '#b45309', '#b91c1c', '#ffffff', '#475569'].map(c => (
                          <button
                            key={c}
                            onClick={() => onUpdateElement(selectedElement.id, { fill: c })}
                            className="w-7 h-7 rounded-xl border border-white/20 shadow-xs cursor-pointer"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== TAB 5: UPLOADS & SMART IMPORTER ===== */}
              {activeDrawer === 'uploads' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-[var(--text-muted)] font-mono uppercase">Upload Custom Badge Art / PSD / AI</p>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-2xl p-6 text-center hover:border-[#84a92c] transition-colors cursor-pointer"
                    style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-surface)' }}
                  >
                    <Upload className="w-8 h-8 text-[#84a92c] mx-auto mb-2" />
                    <p className="font-bold text-xs text-white">Tap to Upload Image or Template</p>
                    <p className="text-[10px] text-slate-400 mt-1">Supports PNG, JPG, SVG, PSD, AI</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.svg,.psd,.ai"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file && onSmartImportFile) {
                          onSmartImportFile(file);
                          closeDrawer();
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {/* ===== TAB 6: LAYERS ===== */}
              {activeDrawer === 'layers' && (
                <div className="space-y-2">
                  <p className="text-[11px] text-[var(--text-muted)] font-mono uppercase">Card Canvas Layer Stack</p>
                  {elements.map((el, i) => (
                    <div
                      key={el.id}
                      className="p-2.5 rounded-xl border flex items-center justify-between"
                      style={{ backgroundColor: selectedElement?.id === el.id ? 'var(--bg-elevated)' : 'var(--bg-surface)', borderColor: selectedElement?.id === el.id ? '#84a92c' : 'var(--border-primary)' }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">#{i + 1}</span>
                        <span className="font-bold text-xs text-white">{el.name || el.type}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onUpdateElement(el.id, { locked: !el.locked })}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          {el.locked ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => onDeleteElement(el.id)}
                          className="p-1 text-slate-400 hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. CANVA-STYLE FIXED BOTTOM NAVIGATION BAR */}
      <nav
        className="h-16 px-2 border-t flex items-center justify-around z-40"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
      >
        {/* Tab 1: Templates */}
        <button
          onClick={() => setActiveDrawer(activeDrawer === 'templates' ? null : 'templates')}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer transition-colors ${
            activeDrawer === 'templates' ? 'text-[#84a92c]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl ${activeDrawer === 'templates' ? 'bg-[#84a92c]/20' : ''}`}>
            <LayoutTemplate className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium tracking-tight">Templates</span>
        </button>

        {/* Tab 2: Elements */}
        <button
          onClick={() => setActiveDrawer(activeDrawer === 'elements' ? null : 'elements')}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer transition-colors ${
            activeDrawer === 'elements' ? 'text-[#84a92c]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl ${activeDrawer === 'elements' ? 'bg-[#84a92c]/20' : ''}`}>
            <Shapes className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium tracking-tight">Elements</span>
        </button>

        {/* Tab 3: Text */}
        <button
          onClick={() => setActiveDrawer(activeDrawer === 'text' ? null : 'text')}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer transition-colors ${
            activeDrawer === 'text' ? 'text-[#84a92c]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl ${activeDrawer === 'text' ? 'bg-[#84a92c]/20' : ''}`}>
            <Type className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium tracking-tight">Text</span>
        </button>

        {/* Tab 4: Edit (Active element properties) */}
        <button
          onClick={() => setActiveDrawer(activeDrawer === 'edit' ? null : 'edit')}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer transition-colors ${
            activeDrawer === 'edit' ? 'text-[#84a92c]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl ${activeDrawer === 'edit' ? 'bg-[#84a92c]/20' : ''}`}>
            <Sliders className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium tracking-tight">Properties</span>
        </button>

        {/* Tab 5: Uploads */}
        <button
          onClick={() => setActiveDrawer(activeDrawer === 'uploads' ? null : 'uploads')}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer transition-colors ${
            activeDrawer === 'uploads' ? 'text-[#84a92c]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl ${activeDrawer === 'uploads' ? 'bg-[#84a92c]/20' : ''}`}>
            <Upload className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium tracking-tight">Uploads</span>
        </button>

        {/* Tab 6: Layers */}
        <button
          onClick={() => setActiveDrawer(activeDrawer === 'layers' ? null : 'layers')}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1 cursor-pointer transition-colors ${
            activeDrawer === 'layers' ? 'text-[#84a92c]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`p-1 rounded-xl ${activeDrawer === 'layers' ? 'bg-[#84a92c]/20' : ''}`}>
            <Layers className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-medium tracking-tight">Layers</span>
        </button>
      </nav>
    </div>
  );
}
