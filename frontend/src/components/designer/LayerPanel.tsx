import { useState, useRef, useEffect } from 'react';
import type { CanvasElement } from '../../db/database';

interface LayerPanelProps {
  elements: CanvasElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
}

export default function LayerPanel({
  elements,
  selectedId,
  onSelect,
  onReorder,
  onToggleVisibility,
  onToggleLock,
  onDuplicate,
  onDelete,
  onRename,
}: LayerPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const typeIcons: Record<string, string> = {
    text: 'T',
    dataField: '{}',
    rect: '▭',
    circle: '◯',
    ellipse: '⬮',
    star: '★',
    polygon: '⬡',
    diamond: '◆',
    triangle: '△',
    line: '—',
    pill: '▬',
    ring: '◎',
    image: '🖼',
    photo: '📷',
    qr: 'QR',
    barcode: '|||',
    group: '⊞',
  };

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const startRename = (el: CanvasElement) => {
    setEditingId(el.id);
    setEditValue(el.name || el.type);
  };

  const commitRename = () => {
    if (editingId && onRename && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>
        Layer Hierarchy
      </p>

      {elements.length === 0 ? (
        <p className="text-xs py-4 text-center" style={{ color: 'var(--text-muted)' }}>No layers added yet</p>
      ) : (
        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
          {[...elements].reverse().map((el, revIdx) => {
            const realIdx = elements.length - 1 - revIdx;
            const isSelected = selectedId === el.id;
            const isEditing = editingId === el.id;

            return (
              <div
                key={el.id}
                onClick={() => onSelect(el.id)}
                className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-xl cursor-pointer text-xs transition-all border ${
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
                  className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-mono font-bold shrink-0"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    color: '#84a92c',
                  }}
                >
                  {typeIcons[el.type] || '•'}
                </span>

                {/* Name — double-click to edit */}
                {isEditing ? (
                  <input
                    ref={editInputRef}
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 min-w-0 text-xs px-1 py-0.5 rounded border outline-none"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: '#84a92c',
                      color: 'var(--text-primary)',
                    }}
                  />
                ) : (
                  <span
                    className={`flex-1 truncate min-w-0 ${el.visible === false ? 'line-through opacity-40' : ''}`}
                    onDoubleClick={e => { e.stopPropagation(); startRename(el); }}
                    title="Double-click to rename"
                  >
                    {el.name || el.type}
                  </span>
                )}

                {/* Hover action buttons — duplicate + delete */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  {onDuplicate && (
                    <button
                      onClick={e => { e.stopPropagation(); onDuplicate(el.id); }}
                      className="p-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
                      title="Duplicate layer"
                    >
                      <svg className="w-3 h-3 opacity-60 hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m0 0a2.625 2.625 0 113.882 2.299" />
                      </svg>
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={e => { e.stopPropagation(); onDelete(el.id); }}
                      className="p-0.5 rounded hover:bg-red-500/20 transition-colors cursor-pointer"
                      title="Delete layer"
                    >
                      <svg className="w-3 h-3 text-red-400 opacity-60 hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Visibility toggle */}
                <button
                  onClick={e => { e.stopPropagation(); onToggleVisibility(el.id); }}
                  className="p-0.5 rounded opacity-70 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                  title={el.visible === false ? 'Show' : 'Hide'}
                >
                  {el.visible === false ? (
                    <svg className="w-3 h-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>

                {/* Lock toggle */}
                <button
                  onClick={e => { e.stopPropagation(); onToggleLock(el.id); }}
                  className="p-0.5 rounded opacity-70 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                  title={el.locked ? 'Unlock' : 'Lock'}
                >
                  {el.locked ? (
                    <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  )}
                </button>

                {/* Move up/down */}
                <div className="flex flex-col gap-0 shrink-0">
                  <button
                    onClick={e => { e.stopPropagation(); if (realIdx < elements.length - 1) onReorder(realIdx, realIdx + 1); }}
                    className="p-0 rounded opacity-50 hover:opacity-100 disabled:opacity-15 cursor-pointer"
                    disabled={realIdx >= elements.length - 1}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                    </svg>
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); if (realIdx > 0) onReorder(realIdx, realIdx - 1); }}
                    className="p-0 rounded opacity-50 hover:opacity-100 disabled:opacity-15 cursor-pointer"
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
