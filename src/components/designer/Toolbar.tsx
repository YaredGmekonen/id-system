import React, { useState, useRef } from 'react';
import { DATA_FIELDS, CARD } from '../../design-tokens';
import type { CanvasElement, CardTemplate } from '../../db/database';

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

let elementCounter = 200;
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

  // Sub-tab in toolbar (Elements, QR & Barcodes, Assets & Graphics, Starter Presets)
  const [activeTab, setActiveTab] = useState<'elements' | 'qr-barcode' | 'graphics' | 'starters'>('elements');

  // Custom QR / Barcode inputs
  const [customQrPayload, setCustomQrPayload] = useState('{{id_number}}');
  const [customBarcodePayload, setCustomBarcodePayload] = useState('{{id_number}}');

  // ================= ELEMENT BUILDERS =================

  const addText = (text: string = 'Heading Text', fontSize: number = 22, fontStyle: string = 'bold', fill: string = '#0f172a') => {
    onAddElement({
      id: nextId('text'),
      type: 'text',
      x: 50,
      y: 50,
      text,
      fontSize,
      fontFamily: 'Inter',
      fontStyle,
      fill,
      align: 'left',
      width: 260,
      opacity: 1,
      visible: true,
      locked: false,
      name: text.substring(0, 16),
    });
  };

  const addRect = (fill: string = '#0b131b', cornerRadius: number = 8, w: number = 240, h: number = 80, name: string = 'Banner Box') => {
    onAddElement({
      id: nextId('rect'),
      type: 'rect',
      x: 40,
      y: 30,
      width: w,
      height: h,
      fill,
      cornerRadius,
      opacity: 1,
      visible: true,
      locked: false,
      name,
    });
  };

  const addCircle = (fill: string = '#10b981', radius: number = 35) => {
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

  const addLine = () => {
    onAddElement({
      id: nextId('line'),
      type: 'line',
      x: 40,
      y: 180,
      width: 200,
      height: 0,
      points: [0, 0, 200, 0],
      stroke: '#0f172a',
      strokeWidth: 2,
      opacity: 1,
      visible: true,
      locked: false,
      name: 'Divider Line',
    });
  };

  const addArrow = () => {
    onAddElement({
      id: nextId('arrow'),
      type: 'arrow',
      x: 40,
      y: 210,
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

  const addPhoto = () => {
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

  const addDataField = (fieldKey: string, label: string) => {
    if (fieldKey === '{{photo}}') {
      addPhoto();
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

  // Asset Graphics
  const addSiliconLabsLogo = () => {
    onAddElement({
      id: nextId('logo'),
      type: 'image',
      x: 30,
      y: 20,
      width: 65,
      height: 65,
      src: '/siliconlabs-logo.png',
      opacity: 1,
      visible: true,
      locked: false,
      name: 'SiliconLabs Monogram Logo',
    });
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
        } else {
          alert('Invalid template JSON format.');
        }
      } catch {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
    if (jsonInputRef.current) jsonInputRef.current.value = '';
  };

  const handleImageTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isSvg = file.type === 'image/svg+xml' || file.name.endsWith('.svg');

    if (isSvg) {
      // SVG: attempt to parse top-level elements into CanvasElements
      const textReader = new FileReader();
      textReader.onload = () => {
        const svgText = textReader.result as string;
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgEl = svgDoc.documentElement;
        const extractedElements: CanvasElement[] = [];

        // Parse top-level children into CanvasElements
        Array.from(svgEl.children).forEach((child, idx) => {
          const tag = child.tagName.toLowerCase();
          const x = parseFloat(child.getAttribute('x') || '0');
          const y = parseFloat(child.getAttribute('y') || '0');
          const fill = child.getAttribute('fill') || '#0f172a';

          if (tag === 'rect') {
            extractedElements.push({
              id: nextId('svg-rect'),
              type: 'rect',
              x,
              y,
              width: parseFloat(child.getAttribute('width') || '100'),
              height: parseFloat(child.getAttribute('height') || '100'),
              fill,
              stroke: child.getAttribute('stroke') || '',
              strokeWidth: parseFloat(child.getAttribute('stroke-width') || '0'),
              cornerRadius: parseFloat(child.getAttribute('rx') || '0'),
              opacity: parseFloat(child.getAttribute('opacity') || '1'),
              visible: true,
              locked: false,
              name: `SVG Rect ${idx + 1}`,
            });
          } else if (tag === 'circle') {
            const cx = parseFloat(child.getAttribute('cx') || '0');
            const cy = parseFloat(child.getAttribute('cy') || '0');
            const r = parseFloat(child.getAttribute('r') || '40');
            extractedElements.push({
              id: nextId('svg-circle'),
              type: 'circle',
              x: cx - r,
              y: cy - r,
              radius: r,
              fill,
              stroke: child.getAttribute('stroke') || '',
              strokeWidth: parseFloat(child.getAttribute('stroke-width') || '0'),
              opacity: parseFloat(child.getAttribute('opacity') || '1'),
              visible: true,
              locked: false,
              name: `SVG Circle ${idx + 1}`,
            });
          } else if (tag === 'text') {
            extractedElements.push({
              id: nextId('svg-text'),
              type: 'text',
              x,
              y,
              text: child.textContent || 'Text',
              fontSize: parseFloat(child.getAttribute('font-size') || '16'),
              fontFamily: child.getAttribute('font-family') || 'Inter',
              fill,
              opacity: parseFloat(child.getAttribute('opacity') || '1'),
              visible: true,
              locked: false,
              name: `SVG Text ${idx + 1}`,
            });
          }
        });

        if (extractedElements.length > 0) {
          // Add extracted vector elements
          extractedElements.forEach(el => onAddElement(el));
        } else {
          // Complex SVG: fall back to rasterizing as a background image
          const dataUrlReader = new FileReader();
          dataUrlReader.onload = () => {
            const dataUrl = dataUrlReader.result as string;
            onAddElement({
              id: nextId('svg-bg'),
              type: 'image',
              x: 0,
              y: 0,
              width: CARD.WIDTH_PX,
              height: CARD.HEIGHT_PX,
              src: dataUrl,
              opacity: 1,
              visible: true,
              locked: true,
              name: `BG: ${file.name.substring(0, 16)}`,
            });
          };
          dataUrlReader.readAsDataURL(file);
        }
      };
      textReader.readAsText(file);
    } else {
      // PNG/JPG: place as locked background image at full card size
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        onAddElement({
          id: nextId('img-bg'),
          type: 'image',
          x: 0,
          y: 0,
          width: CARD.WIDTH_PX,
          height: CARD.HEIGHT_PX,
          src: dataUrl,
          opacity: 1,
          visible: true,
          locked: true,
          name: `BG: ${file.name.substring(0, 16)}`,
        });
      };
      reader.readAsDataURL(file);
    }

    if (imageTemplateInputRef.current) imageTemplateInputRef.current.value = '';
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

      {/* Alignment Actions Bar (shown when 2+ items selected) */}
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
      <div className="flex rounded-lg border p-0.5" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
            activeTab === 'elements' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Layers
        </button>
        <button
          onClick={() => setActiveTab('qr-barcode')}
          className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
            activeTab === 'qr-barcode' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          QR & Barcode
        </button>
        <button
          onClick={() => setActiveTab('graphics')}
          className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
            activeTab === 'graphics' ? 'bg-white shadow-2xs text-slate-900' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          Assets
        </button>
      </div>

      {/* TAB 1: VECTOR GRAPHIC LAYERS */}
      {activeTab === 'elements' && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>
            Vector Graphic Elements
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => addText('Full Name Label', 24, 'bold', '#0f172a')}
              className="py-2 px-2.5 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <span className="font-serif font-bold text-sm">T</span>
              <span>Heading</span>
            </button>

            <button
              onClick={() => addText('Department / Role', 16, 'normal', '#475569')}
              className="py-2 px-2.5 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <span className="font-serif text-xs">t</span>
              <span>Subtext</span>
            </button>

            <button
              onClick={() => addRect('#0b131b', 0, CARD.WIDTH_PX, 90, 'Header Banner')}
              className="py-2 px-2.5 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <span className="w-4 h-2.5 bg-current rounded-2xs inline-block" />
              <span>Banner</span>
            </button>

            <button
              onClick={() => addRect('#ffffff', 12, 260, 80, 'Card Card Box')}
              className="py-2 px-2.5 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <span className="w-3.5 h-3.5 border-2 border-current rounded-xs inline-block" />
              <span>Card Box</span>
            </button>

            <button
              onClick={() => addCircle('#10b981', 35)}
              className="py-2 px-2.5 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <span className="w-3.5 h-3.5 border-2 border-current rounded-full inline-block" />
              <span>Badge Seal</span>
            </button>

            <button
              onClick={addPhoto}
              className="py-2 px-2.5 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              <span>Photo Box</span>
            </button>

            <button
              onClick={addLine}
              className="py-2 px-2.5 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <span className="w-4 h-0.5 bg-current inline-block" />
              <span>Line</span>
            </button>

            <button
              onClick={addArrow}
              className="py-2 px-2.5 rounded-xl border flex items-center gap-2 justify-center font-semibold transition-all cursor-pointer text-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <span className="text-xs font-mono font-bold">➔</span>
              <span>Arrow</span>
            </button>
          </div>

          {/* Dynamic Data Bindings */}
          <div className="pt-2">
            <p className="text-[11px] font-bold uppercase tracking-wider mb-1.5 font-mono" style={{ color: 'var(--text-muted)' }}>
              Dynamic Person Data Bindings
            </p>
            <div className="grid grid-cols-1 gap-1 max-h-40 overflow-y-auto pr-1">
              {DATA_FIELDS.map(f => (
                <button
                  key={f.key}
                  onClick={() => addDataField(f.key, f.label)}
                  className="px-2.5 py-1.5 rounded-lg border text-left flex items-center justify-between text-xs transition-colors cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                >
                  <span className="font-semibold">{f.label}</span>
                  <span className="font-mono text-[10px] text-[#84a92c] font-bold">{f.key}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: QR & BARCODE GENERATOR */}
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

      {/* TAB 3: ASSETS & BRAND GRAPHICS */}
      {activeTab === 'graphics' && (
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>
            Logos & Graphic Assets
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
            className="w-full py-2.5 px-3 border font-bold rounded-xl flex items-center justify-center gap-2 shadow-2xs transition-all cursor-pointer"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
          >
            <svg className="w-4 h-4 text-[#84a92c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span>Upload Image / Logo from PC</span>
          </button>

          <div className="grid grid-cols-1 gap-2 pt-1">
            <button
              onClick={addSiliconLabsLogo}
              className="p-2.5 rounded-xl border flex items-center gap-3 text-left transition-all cursor-pointer hover:border-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <img src="/siliconlabs-logo.png" alt="SiliconLabs" className="w-8 h-8 object-contain" />
              <div>
                <p className="font-bold text-xs">SiliconLabs Monogram Logo</p>
                <p className="text-[10px] text-slate-500 font-mono">Official Brand Asset</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Template Import / Export & Save */}
      <div className="pt-2 border-t space-y-2" style={{ borderColor: 'var(--border-primary)' }}>
        <input ref={jsonInputRef} type="file" accept=".json,application/json" onChange={handleJsonUpload} className="hidden" />

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => jsonInputRef.current?.click()}
            className="py-1.5 px-2 border font-medium rounded-lg flex items-center justify-center gap-1 cursor-pointer"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
          >
            <span>Import JSON</span>
          </button>
          <button
            onClick={onExportTemplate}
            className="py-1.5 px-2 border font-semibold rounded-lg flex items-center justify-center gap-1 cursor-pointer text-[#84a92c]"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
          >
            <span>Export JSON</span>
          </button>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 cursor-pointer shadow-md font-bold text-xs"
        >
          {saving ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Saving Template…</span>
            </>
          ) : (
            <span>Save Template to Library</span>
          )}
        </button>
      </div>
    </div>
  );
}
