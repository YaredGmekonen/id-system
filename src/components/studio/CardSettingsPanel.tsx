import {
  CARD_THEMES,
  CARD_LAYOUTS,
  AVAILABLE_FIELDS,
  CARD_SIZE_PRESETS,
  type CardSizePreset,
} from '../../design-tokens';

interface CardSettingsPanelProps {
  theme: typeof CARD_THEMES[number];
  onThemeChange: (theme: typeof CARD_THEMES[number]) => void;
  layout: string;
  onLayoutChange: (layout: string) => void;
  orientation: 'horizontal' | 'vertical';
  onOrientationChange: (orientation: 'horizontal' | 'vertical') => void;
  showQr: boolean;
  onToggleQr: () => void;
  showBarcode: boolean;
  onToggleBarcode: () => void;
  showChip: boolean;
  onToggleChip: () => void;
  showSeal: boolean;
  onToggleSeal: () => void;
  visibleFields: Set<string>;
  onToggleField: (fieldId: string) => void;
  cardSizePreset?: 'cr80' | 'cr79' | 'cr90' | 'cr100' | 'custom';
  onCardSizePresetChange?: (preset: 'cr80' | 'cr79' | 'cr90' | 'cr100' | 'custom') => void;
  cardWidthMm?: number;
  onCardWidthChange?: (w: number) => void;
  cardHeightMm?: number;
  onCardHeightChange?: (h: number) => void;
}

export default function CardSettingsPanel({
  theme,
  onThemeChange,
  layout,
  onLayoutChange,
  orientation,
  onOrientationChange,
  showQr,
  onToggleQr,
  showBarcode,
  onToggleBarcode,
  showChip,
  onToggleChip,
  showSeal,
  onToggleSeal,
  visibleFields,
  onToggleField,
  cardSizePreset = 'cr80',
  onCardSizePresetChange,
  cardWidthMm = 85.6,
  onCardWidthChange,
  cardHeightMm = 54.0,
  onCardHeightChange,
}: CardSettingsPanelProps) {
  return (
    <div className="flex flex-col h-full bg-paper-50 rounded-lg border border-paper-300 shadow-xs p-4 overflow-y-auto space-y-4 text-xs font-body text-ink">
      
      <div className="flex items-center justify-between border-b border-paper-300 pb-2.5">
        <h3 className="text-sm font-extrabold text-ink font-display tracking-tight">ID Specifications</h3>
        <span className="text-[10px] text-teal bg-teal-50 font-bold px-2 py-0.5 rounded border border-teal/30 font-mono">
          {cardSizePreset.toUpperCase()} Engine
        </span>
      </div>

      {/* 0. Card Format / Preset */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-ink block">Standard Card Dimensions</label>
        <select
          value={cardSizePreset}
          onChange={e => onCardSizePresetChange?.(e.target.value as any)}
          className="w-full text-xs bg-paper-100 border border-paper-300 rounded py-2 px-3 text-ink focus:outline-none focus:border-teal font-medium"
        >
          {CARD_SIZE_PRESETS.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} {p.isDefault ? '— Default' : ''}
            </option>
          ))}
        </select>
        <div className="flex items-center justify-between text-[10px] font-mono text-ink-muted px-1">
          <span>Dimensions: {cardWidthMm} × {cardHeightMm} mm</span>
          <span>({(cardWidthMm / 25.4).toFixed(2)}" × {(cardHeightMm / 25.4).toFixed(2)}")</span>
        </div>
      </div>

      {/* 1. Theme Selection */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-ink block">Official Color Theme</label>
        <select
          value={theme.id}
          onChange={e => {
            const found = CARD_THEMES.find(t => t.id === e.target.value);
            if (found) onThemeChange(found);
          }}
          className="w-full text-xs bg-paper-100 border border-paper-300 rounded py-2 px-3 text-ink focus:outline-none focus:border-teal font-medium"
        >
          {CARD_THEMES.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Layout Preset */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-ink block">Layout Template Preset</label>
        <select
          value={layout}
          onChange={e => onLayoutChange(e.target.value)}
          className="w-full text-xs bg-paper-100 border border-paper-300 rounded py-2 px-3 text-ink focus:outline-none focus:border-teal font-medium"
        >
          {CARD_LAYOUTS.map(l => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Orientation Toggle */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-ink block">Orientation</label>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-paper-100 rounded border border-paper-300">
          <button
            onClick={() => onOrientationChange('horizontal')}
            className={`py-1.5 px-3 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 font-display ${
              orientation === 'horizontal'
                ? 'bg-navy text-paper shadow-2xs'
                : 'text-ink-muted hover:text-ink hover:bg-paper-200'
            }`}
          >
            Horizontal
          </button>
          <button
            onClick={() => onOrientationChange('vertical')}
            className={`py-1.5 px-3 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 font-display ${
              orientation === 'vertical'
                ? 'bg-navy text-paper shadow-2xs'
                : 'text-ink-muted hover:text-ink hover:bg-paper-200'
            }`}
          >
            Vertical
          </button>
        </div>
      </div>

      {/* 4. Security & Barcode Switches */}
      <div className="space-y-2 pt-2 border-t border-paper-300">
        <label className="text-xs font-bold text-ink-muted uppercase tracking-wider block font-display">
          Security Elements
        </label>
        
        {/* Show QR Code */}
        <div className="flex items-center justify-between p-2 rounded bg-paper-100 border border-paper-300">
          <span className="text-xs font-medium text-ink">Dynamic Scannable QR</span>
          <button
            onClick={onToggleQr}
            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
              showQr ? 'bg-teal' : 'bg-paper-300'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full bg-paper-50 block transition-transform ${
                showQr ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Show Barcode */}
        <div className="flex items-center justify-between p-2 rounded bg-paper-100 border border-paper-300">
          <span className="text-xs font-medium text-ink">Code 128 Linear Barcode</span>
          <button
            onClick={onToggleBarcode}
            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
              showBarcode ? 'bg-teal' : 'bg-paper-300'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full bg-paper-50 block transition-transform ${
                showBarcode ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Show Smart Chip */}
        <div className="flex items-center justify-between p-2 rounded bg-paper-100 border border-paper-300">
          <span className="text-xs font-medium text-ink">Smart Contact Chip</span>
          <button
            onClick={onToggleChip}
            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
              showChip ? 'bg-teal' : 'bg-paper-300'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full bg-paper-50 block transition-transform ${
                showChip ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Show Security Seal */}
        <div className="flex items-center justify-between p-2 rounded bg-paper-100 border border-paper-300">
          <span className="text-xs font-medium text-ink">Hologram Authority Seal</span>
          <button
            onClick={onToggleSeal}
            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
              showSeal ? 'bg-teal' : 'bg-paper-300'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full bg-paper-50 block transition-transform ${
                showSeal ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 5. Visible Data Fields */}
      <div className="space-y-2 pt-2 border-t border-paper-300">
        <label className="text-xs font-bold text-ink-muted uppercase tracking-wider block font-display">
          Printed Data Fields
        </label>
        <div className="space-y-1.5">
          {AVAILABLE_FIELDS.map(f => (
            <label
              key={f.id}
              className="flex items-center justify-between p-1.5 rounded hover:bg-paper-100 cursor-pointer text-xs mb-0 font-body"
            >
              <span className="text-ink font-medium">{f.label}</span>
              <input
                type="checkbox"
                checked={visibleFields.has(f.id)}
                onChange={() => onToggleField(f.id)}
                className="w-4 h-4 rounded accent-teal border-paper-300 cursor-pointer"
              />
            </label>
          ))}
        </div>
      </div>

    </div>
  );
}
