import type { CanvasElement } from '../../db/database';

interface LayerPanelProps {
  elements: CanvasElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
}

export default function LayerPanel({
  elements,
  selectedId,
  onSelect,
  onReorder,
  onToggleVisibility,
  onToggleLock,
}: LayerPanelProps) {
  const typeIcons: Record<string, string> = {
    text: 'T',
    dataField: '{}',
    rect: '▭',
    circle: '◯',
    image: 'IMG',
    photo: 'PH',
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>
        Layer Hierarchy
      </p>

      {elements.length === 0 ? (
        <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>No layers added yet</p>
      ) : (
        <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
          {[...elements].reverse().map((el, revIdx) => {
            const realIdx = elements.length - 1 - revIdx;
            const isSelected = selectedId === el.id;

            return (
              <div
                key={el.id}
                onClick={() => onSelect(el.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer text-xs transition-all border ${
                  isSelected
                    ? 'border-[#84a92c] font-bold shadow-xs'
                    : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: isSelected ? 'rgba(132, 169, 44, 0.12)' : 'var(--bg-elevated)',
                  borderColor: isSelected ? '#84a92c' : 'var(--border-primary)',
                  color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                {/* Type icon */}
                <span
                  className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    color: '#84a92c',
                  }}
                >
                  {typeIcons[el.type] || '•'}
                </span>

                {/* Name */}
                <span className={`flex-1 truncate ${el.visible === false ? 'line-through opacity-40' : ''}`}>
                  {el.name || el.type}
                </span>

                {/* Visibility toggle */}
                <button
                  onClick={e => { e.stopPropagation(); onToggleVisibility(el.id); }}
                  className="p-1 rounded opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                  title={el.visible === false ? 'Show' : 'Hide'}
                >
                  {el.visible === false ? (
                    <svg className="w-3.5 h-3.5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>

                {/* Lock toggle */}
                <button
                  onClick={e => { e.stopPropagation(); onToggleLock(el.id); }}
                  className="p-1 rounded opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                  title={el.locked ? 'Unlock' : 'Lock'}
                >
                  {el.locked ? (
                    <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  )}
                </button>

                {/* Move up/down */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={e => { e.stopPropagation(); if (realIdx < elements.length - 1) onReorder(realIdx, realIdx + 1); }}
                    className="p-0.5 rounded opacity-60 hover:opacity-100 disabled:opacity-20 cursor-pointer"
                    disabled={realIdx >= elements.length - 1}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                    </svg>
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); if (realIdx > 0) onReorder(realIdx, realIdx - 1); }}
                    className="p-0.5 rounded opacity-60 hover:opacity-100 disabled:opacity-20 cursor-pointer"
                    disabled={realIdx <= 0}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
