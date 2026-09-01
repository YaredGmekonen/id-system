import { useState, useEffect } from 'react';
import { Scissors } from 'lucide-react';
import Modal from '../shared/Modal';
import type { Person } from '../../db/database';
import { generatePrintSheet, generateSingleCardPdf, downloadPdf, type CardSlotItem } from '../../engine/exportPdf';
import { createCardZip, downloadBlob } from '../../engine/exportZip';
import { renderStudioCard, type StudioCardOptions } from '../../engine/renderStudioCard';

interface ImpositionSlot {
  id: number;
  person: Person;
  side: 'front' | 'back';
  dataUrl?: string;
}

interface ImpositionBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  activePerson: Person;
  cardOptions: StudioCardOptions;
}

export default function ImpositionBoardModal({
  isOpen,
  onClose,
  people,
  activePerson,
  cardOptions,
}: ImpositionBoardModalProps) {
  // 8 slots for 2 cols x 4 rows
  const [slots, setSlots] = useState<ImpositionSlot[]>([]);
  const [preset, setPreset] = useState<'duplex' | 'fronts' | 'backs' | 'singleDuplex'>('duplex');
  const [showCropMarks, setShowCropMarks] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSlotEdit, setActiveSlotEdit] = useState<number | null>(null);

  // Initialize slots whenever preset or activePerson or people change
  useEffect(() => {
    if (!isOpen) return;

    const availablePeople = people.length > 0 ? people : [activePerson];
    const newSlots: ImpositionSlot[] = [];

    if (preset === 'duplex') {
      // Row 0: Person 0 Front (Slot 0), Person 0 Back (Slot 1)
      // Row 1: Person 1 Front (Slot 2), Person 1 Back (Slot 3)
      // Row 2: Person 2 Front (Slot 4), Person 2 Back (Slot 5)
      // Row 3: Person 3 Front (Slot 6), Person 3 Back (Slot 7)
      for (let row = 0; row < 4; row++) {
        const p = availablePeople[row % availablePeople.length] || activePerson;
        newSlots.push({ id: row * 2, person: p, side: 'front' });
        newSlots.push({ id: row * 2 + 1, person: p, side: 'back' });
      }
    } else if (preset === 'singleDuplex') {
      // 4 copies of activePerson: Left col = Front, Right col = Back
      for (let row = 0; row < 4; row++) {
        newSlots.push({ id: row * 2, person: activePerson, side: 'front' });
        newSlots.push({ id: row * 2 + 1, person: activePerson, side: 'back' });
      }
    } else if (preset === 'fronts') {
      // All 8 slots are distinct fronts
      for (let i = 0; i < 8; i++) {
        const p = availablePeople[i % availablePeople.length] || activePerson;
        newSlots.push({ id: i, person: p, side: 'front' });
      }
    } else if (preset === 'backs') {
      // All 8 slots are distinct backs
      for (let i = 0; i < 8; i++) {
        const p = availablePeople[i % availablePeople.length] || activePerson;
        newSlots.push({ id: i, person: p, side: 'back' });
      }
    }

    setSlots(newSlots);
  }, [preset, isOpen, activePerson, people]);

  // Update a single slot
  const updateSlot = (slotIdx: number, updates: Partial<ImpositionSlot>) => {
    setSlots(prev => prev.map((s, idx) => (idx === slotIdx ? { ...s, ...updates } : s)));
  };

  // Swap two slots
  const swapSlots = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= slots.length) return;
    setSlots(prev => {
      const next = [...prev];
      const temp = next[fromIdx];
      next[fromIdx] = next[toIdx];
      next[toIdx] = temp;
      return next;
    });
  };

  // Download 8-Up A4 Print Sheet
  const handleDownloadSheet = async () => {
    setIsGenerating(true);
    try {
      // Render PNG for each slot
      const cardItems: CardSlotItem[] = [];
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        const png = await renderStudioCard(slot.person, slot.side, cardOptions);
        cardItems.push({
          name: `${slot.person.fullName} (${slot.side.toUpperCase()})`,
          side: slot.side,
          png,
          slotIndex: i,
        });
      }

      const pdfBytes = await generatePrintSheet(cardItems, {
        showCropMarks,
        pageTitle: `SiliconLabs Production Batch • ${new Date().toLocaleDateString()}`,
      });

      downloadPdf(pdfBytes, 'SiliconLabs_A4_8Up_Imposition_Sheet.pdf');
    } catch (err) {
      console.error('Failed to generate A4 sheet:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Download Single 1x Card PDF
  const handleDownloadSingleCard = async () => {
    setIsGenerating(true);
    try {
      const frontPng = await renderStudioCard(activePerson, 'front', cardOptions);
      const backPng = await renderStudioCard(activePerson, 'back', cardOptions);
      const pdfBytes = await generateSingleCardPdf(frontPng, backPng);
      downloadPdf(pdfBytes, `${activePerson.fullName.replace(/\s+/g, '_')}_CR80.pdf`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Download ZIP
  const handleDownloadZip = async () => {
    setIsGenerating(true);
    try {
      const frontPng = await renderStudioCard(activePerson, 'front', cardOptions);
      const backPng = await renderStudioCard(activePerson, 'back', cardOptions);
      const zipBlob = await createCardZip([
        { filename: `${activePerson.fullName.replace(/\s+/g, '_')}_FRONT.png`, pngDataUrl: frontPng },
        { filename: `${activePerson.fullName.replace(/\s+/g, '_')}_BACK.png`, pngDataUrl: backPng },
      ]);
      downloadBlob(zipBlob, `${activePerson.fullName.replace(/\s+/g, '_')}_Package.zip`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="A4 Print Imposition Board & Production Exporter"
      size="xl"
    >
      <div className="space-y-6 text-slate-800 text-xs">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
          {/* Preset buttons */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1 rounded-xl shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 font-mono">
              Layout:
            </span>
            <button
              onClick={() => setPreset('duplex')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                preset === 'duplex'
                  ? 'bg-[#198754] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Duplex (Left=Front, Right=Back)
            </button>
            <button
              onClick={() => setPreset('singleDuplex')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                preset === 'singleDuplex'
                  ? 'bg-[#198754] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Current Person (4 Copies Duplex)
            </button>
            <button
              onClick={() => setPreset('fronts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                preset === 'fronts'
                  ? 'bg-[#198754] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All 8 Fronts
            </button>
            <button
              onClick={() => setPreset('backs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                preset === 'backs'
                  ? 'bg-[#198754] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All 8 Backs
            </button>
          </div>

          {/* Options: Crop marks toggle */}
          <label htmlFor="crop-marks-modal-toggle" className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
            <input
              id="crop-marks-modal-toggle"
              name="showCropMarks"
              type="checkbox"
              checked={showCropMarks}
              onChange={e => setShowCropMarks(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 accent-[#198754]"
            />
            <span>Print 2mm Crop / Cut Marks</span>
          </label>
        </div>

        {/* Interactive A4 Sheet Visual Board */}
        <div className="p-6 bg-slate-100 border border-slate-300 rounded-2xl flex flex-col items-center">
          <div className="text-center mb-3">
            <p className="text-[11px] font-mono font-bold text-slate-700 uppercase tracking-wider">
              A4 Sheet Preview (2 Columns × 4 Rows = 8 Cards)
            </p>
            <p className="text-[10px] text-slate-600">
              Click any slot to switch Front/Back or assign a different employee/student.
            </p>
          </div>

          {/* Simulated A4 Paper (Aspect Ratio ~1:1.414) */}
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-300 p-6 space-y-4">
            {/* Header guide */}
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 border-b border-dashed border-slate-200 pb-2">
              <span className="font-bold text-emerald-700">COLUMN 1 (LEFT ROW)</span>
              <span className="inline-flex items-center gap-1 text-slate-500 font-sans">
                <Scissors className="w-3 h-3 text-slate-400" />
                <span>Center Fold & Cut Axis</span>
              </span>
              <span className="font-bold text-blue-700">COLUMN 2 (RIGHT ROW)</span>
            </div>

            {/* 8-Grid (4 Rows x 2 Cols) */}
            <div className="grid grid-cols-2 gap-3.5">
              {slots.map((slot, idx) => {
                const isLeftCol = idx % 2 === 0;
                const isEditing = activeSlotEdit === idx;

                return (
                  <div
                    key={idx}
                    className={`relative rounded-xl border-2 p-3 transition-all ${
                      slot.side === 'front'
                        ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400'
                        : 'border-blue-200 bg-blue-50/40 hover:border-blue-400'
                    } ${isEditing ? 'ring-2 ring-[#198754] shadow-md' : 'shadow-xs'}`}
                  >
                    {/* Top Row: Slot # + Badge + Side Toggle */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-800 text-white font-mono text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-extrabold ${
                            slot.side === 'front'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {slot.side.toUpperCase()}
                        </span>
                      </div>

                      {/* Quick Toggle Side */}
                      <button
                        onClick={() =>
                          updateSlot(idx, { side: slot.side === 'front' ? 'back' : 'front' })
                        }
                        className="px-2 py-0.5 rounded text-[10px] font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors"
                        title="Toggle Front / Back"
                      >
                        Flip ⇄
                      </button>
                    </div>

                    {/* Person Selector */}
                    <div className="space-y-1">
                      <label htmlFor={`slot-person-select-${idx}`} className="sr-only">
                        Select person for slot {idx + 1}
                      </label>
                      <select
                        id={`slot-person-select-${idx}`}
                        name={`slotPerson_${idx}`}
                        value={slot.person.idNumber}
                        onChange={e => {
                          const p = people.find(item => item.idNumber === e.target.value);
                          if (p) updateSlot(idx, { person: p });
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#198754]"
                      >
                        <option value={slot.person.idNumber}>
                          {slot.person.fullName} ({slot.person.idNumber})
                        </option>
                        {people.map(p => (
                          <option key={p.id} value={p.idNumber}>
                            {p.fullName} ({p.role || p.category})
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                        <span>{slot.person.department || 'Staff'}</span>
                        <span>{isLeftCol ? 'Left Fold Side' : 'Right Fold Side'}</span>
                      </div>
                    </div>

                    {/* Move up / down buttons */}
                    <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-slate-200/60">
                      <button
                        onClick={() => swapSlots(idx, idx - 2)}
                        disabled={idx < 2}
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-500 hover:text-slate-800 disabled:opacity-30 bg-white border border-slate-200"
                        title="Move Up"
                      >
                        ▲ Up
                      </button>
                      <button
                        onClick={() => swapSlots(idx, idx + 2)}
                        disabled={idx >= 6}
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-500 hover:text-slate-800 disabled:opacity-30 bg-white border border-slate-200"
                        title="Move Down"
                      >
                        ▼ Down
                      </button>
                      <button
                        onClick={() => swapSlots(idx, isLeftCol ? idx + 1 : idx - 1)}
                        className="px-1.5 py-0.5 rounded text-[9px] font-mono text-slate-500 hover:text-slate-800 bg-white border border-slate-200"
                        title="Swap with adjacent column"
                      >
                        ⇄ Swap Col
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-slate-500">
            <span>Standard CR80 (85.6 × 54 mm) • 300 DPI Vector PDF Engine</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSingleCard}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-bold text-xs text-slate-700 shadow-xs transition-all disabled:opacity-50"
            >
              1x CR80 Card PDF
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-bold text-xs text-slate-700 shadow-xs transition-all disabled:opacity-50"
            >
              PNG ZIP Package
            </button>

            <button
              onClick={handleDownloadSheet}
              disabled={isGenerating}
              className="px-6 py-2.5 rounded-xl bg-[#198754] hover:bg-[#157347] font-bold text-xs text-white shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating 300 DPI PDF...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span>Download 8-Up A4 Print Sheet</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
