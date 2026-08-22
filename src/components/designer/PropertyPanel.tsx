import { DATA_FIELDS } from '../../design-tokens';
import type { CanvasElement } from '../../db/database';

interface PropertyPanelProps {
  element: CanvasElement | null;
  onUpdate: (id: string, changes: Partial<CanvasElement>) => void;
  onDelete: (id: string) => void;
}

export default function PropertyPanel({ element, onUpdate, onDelete }: PropertyPanelProps) {
  if (!element) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" style={{ color: 'var(--text-muted)' }}>
        <svg className="w-10 h-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
        </svg>
        <p className="text-xs font-semibold">Select an element on canvas</p>
        <p className="text-[10px] mt-1 opacity-75">Click any text, shape or photo to modify properties</p>
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

  return (
    <div className="space-y-4 text-xs font-sans" style={{ color: 'var(--text-primary)' }}>
      <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-primary)' }}>
        <h3 className="font-bold text-xs truncate" style={{ color: 'var(--text-primary)' }}>
          {element.name || element.type}
        </h3>
        <button
          onClick={() => onDelete(element.id)}
          className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
          title="Delete element"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>

      {/* Element name */}
      <div>
        <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
          Layer Name
        </label>
        <input
          type="text"
          value={element.name || ''}
          onChange={e => update({ name: e.target.value })}
          className="w-full text-xs py-2 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c]"
          style={inputStyle}
        />
      </div>

      {/* Position */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>X Position</label>
          <input
            type="number"
            value={Math.round(element.x)}
            onChange={e => update({ x: Number(e.target.value) })}
            className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c]"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Y Position</label>
          <input
            type="number"
            value={Math.round(element.y)}
            onChange={e => update({ y: Number(e.target.value) })}
            className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c]"
            style={inputStyle}
          />
        </div>
      </div>

      {/* Size */}
      {(element.width !== undefined || element.height !== undefined) && (
        <div className="grid grid-cols-2 gap-2">
          {element.width !== undefined && (
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Width (px)</label>
              <input
                type="number"
                value={Math.round(element.width)}
                onChange={e => update({ width: Number(e.target.value) })}
                className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c]"
                style={inputStyle}
              />
            </div>
          )}
          {element.height !== undefined && (
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Height (px)</label>
              <input
                type="number"
                value={Math.round(element.height)}
                onChange={e => update({ height: Number(e.target.value) })}
                className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c]"
                style={inputStyle}
              />
            </div>
          )}
        </div>
      )}

      {/* Radius for circles */}
      {element.type === 'circle' && (
        <div>
          <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Radius</label>
          <input
            type="number"
            value={Math.round(element.radius || 40)}
            onChange={e => update({ radius: Number(e.target.value) })}
            className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c]"
            style={inputStyle}
          />
        </div>
      )}

      {/* Rotation */}
      <div>
        <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Rotation (°)</label>
        <input
          type="number"
          value={Math.round(element.rotation || 0)}
          onChange={e => update({ rotation: Number(e.target.value) })}
          className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c]"
          style={inputStyle}
        />
      </div>

      {/* Text properties */}
      {(element.type === 'text' || element.type === 'dataField') && (
        <>
          <div>
            <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Text Content</label>
            <input
              type="text"
              value={element.text || ''}
              onChange={e => update({ text: e.target.value })}
              className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c]"
              style={inputStyle}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Font Size</label>
              <input
                type="number"
                value={element.fontSize || 16}
                onChange={e => update({ fontSize: Number(e.target.value) })}
                className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c]"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Font Family</label>
              <select
                value={element.fontFamily || 'Inter'}
                onChange={e => update({ fontFamily: e.target.value })}
                className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c]"
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
              <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Font Style</label>
              <select
                value={element.fontStyle || 'normal'}
                onChange={e => update({ fontStyle: e.target.value })}
                className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c]"
                style={inputStyle}
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
                <option value="italic">Italic</option>
                <option value="bold italic">Bold Italic</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Align</label>
              <select
                value={element.align || 'left'}
                onChange={e => update({ align: e.target.value })}
                className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c]"
                style={inputStyle}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Letter Spacing</label>
              <input
                type="number"
                value={element.letterSpacing || 0}
                onChange={e => update({ letterSpacing: Number(e.target.value) })}
                className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c]"
                style={inputStyle}
                step={0.5}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Decoration</label>
              <select
                value={element.textDecoration || 'none'}
                onChange={e => update({ textDecoration: e.target.value })}
                className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c]"
                style={inputStyle}
              >
                <option value="none">None</option>
                <option value="underline">Underline</option>
              </select>
            </div>
          </div>
        </>
      )}

      {/* Color */}
      {element.fill !== undefined && (
        <div>
          <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Fill Color</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={element.fill || '#ffffff'}
              onChange={e => update({ fill: e.target.value })}
              className="w-8 h-8 rounded-lg border cursor-pointer p-0.5 bg-transparent"
              style={{ borderColor: 'var(--border-primary)' }}
            />
            <input
              type="text"
              value={element.fill || '#ffffff'}
              onChange={e => update({ fill: e.target.value })}
              className="flex-1 text-xs py-1.5 px-2.5 rounded-xl border font-mono"
              style={inputStyle}
            />
          </div>
        </div>
      )}

      {/* Stroke / Border for shapes, photo, image, lines */}
      {(element.type === 'rect' || element.type === 'circle' || element.type === 'photo' || element.type === 'line' || element.type === 'arrow') && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
              {element.type === 'line' || element.type === 'arrow' ? 'Line Color' : 'Stroke Color'}
            </label>
            <input
              type="color"
              value={element.stroke || '#000000'}
              onChange={e => update({ stroke: e.target.value })}
              className="w-full h-8 rounded-lg border cursor-pointer p-0.5 bg-transparent"
              style={{ borderColor: 'var(--border-primary)' }}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
              {element.type === 'line' || element.type === 'arrow' ? 'Thickness' : 'Border Width'}
            </label>
            <input
              type="number"
              value={element.strokeWidth || 0}
              onChange={e => update({ strokeWidth: Number(e.target.value) })}
              className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c]"
              style={inputStyle}
              min={0}
            />
          </div>
        </div>
      )}

      {/* Corner radius for rect and photo */}
      {(element.type === 'rect' || element.type === 'photo') && (
        <div>
          <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Corner Radius</label>
          <input
            type="number"
            value={element.cornerRadius !== undefined ? element.cornerRadius : 8}
            onChange={e => update({ cornerRadius: Number(e.target.value) })}
            className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c]"
            style={inputStyle}
            min={0}
          />
        </div>
      )}

      {/* QR Code Payload editing */}
      {(element.type === 'qr' || element.type === 'qrCode') && (
        <div>
          <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
            QR Code Payload / Link
          </label>
          <input
            type="text"
            value={element.qrPayload || ''}
            onChange={e => update({ qrPayload: e.target.value })}
            placeholder="e.g. {{id_number}} or https://..."
            className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c] font-mono"
            style={inputStyle}
          />
          <div className="flex gap-1 mt-1 flex-wrap">
            {['{{id_number}}', '{{phone}}', '{{email}}'].map(tag => (
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
        <div>
          <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
            Barcode Value / Binding
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
      )}

      {/* Opacity */}
      <div>
        <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
          Opacity: {Math.round((element.opacity ?? 1) * 100)}%
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={element.opacity ?? 1}
          onChange={e => update({ opacity: Number(e.target.value) })}
          className="w-full accent-[#84a92c] cursor-pointer"
        />
      </div>

      {/* Data binding */}
      {(element.type === 'text' || element.type === 'dataField') && (
        <div>
          <label className="text-[11px] font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
            Bind to Dynamic Data Field
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
            className="w-full text-xs py-1.5 px-2.5 rounded-xl border focus:outline-none focus:border-[#84a92c]"
            style={inputStyle}
          >
            <option value="">None (Static Text)</option>
            {DATA_FIELDS.filter(f => f.key !== '{{photo}}').map(f => (
              <option key={f.key} value={f.key}>{f.label} — {f.key}</option>
            ))}
          </select>
        </div>
      )}

      {/* Visibility / Lock */}
      <div className="flex gap-4 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
        <label className="flex items-center gap-2 cursor-pointer font-medium">
          <input
            type="checkbox"
            checked={element.visible !== false}
            onChange={e => update({ visible: e.target.checked })}
            className="w-4 h-4 rounded accent-[#84a92c]"
          />
          <span>Visible</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer font-medium">
          <input
            type="checkbox"
            checked={element.locked === true}
            onChange={e => update({ locked: e.target.checked })}
            className="w-4 h-4 rounded accent-[#84a92c]"
          />
          <span>Locked</span>
        </label>
      </div>
    </div>
  );
}
