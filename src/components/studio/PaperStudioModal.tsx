import React, { useState, useEffect, useRef } from 'react';
import Modal from '../shared/Modal';
import type { Person } from '../../db/database';
import {
  generateCustomPaperPdf,
  generateSingleCardPdf,
  downloadPdf,
  type PlacedPaperCard,
  type PaperSheetConfig,
} from '../../engine/exportPdf';
import { createCardZip, downloadBlob } from '../../engine/exportZip';
import { renderStudioCard, type StudioCardOptions } from '../../engine/renderStudioCard';
import { CARD_SIZE_PRESETS, type CardSizePreset } from '../../design-tokens';

interface PaperStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  activePerson: Person;
  cardOptions: StudioCardOptions;
}

interface PaperPreset {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
}

const PAPER_PRESETS: PaperPreset[] = [
  { id: 'a4', name: 'A4 Standard (210 × 297 mm)', widthMm: 210, heightMm: 297 },
  { id: 'a3', name: 'A3 Production (297 × 420 mm)', widthMm: 297, heightMm: 420 },
  { id: 'letter', name: 'US Letter (8.5" × 11")', widthMm: 215.9, heightMm: 279.4 },
  { id: 'legal', name: 'US Legal (8.5" × 14")', widthMm: 215.9, heightMm: 355.6 },
  { id: 'custom', name: 'Custom Dimensions', widthMm: 210, heightMm: 297 },
];

export default function PaperStudioModal({
  isOpen,
  onClose,
  people,
  activePerson,
  cardOptions,
}: PaperStudioModalProps) {
  // Card Size Preset (CR80 standard default: 85.6mm x 54.0mm)
  const [cardSizePreset, setCardSizePreset] = useState<'cr80' | 'cr79' | 'cr90' | 'cr100' | 'custom'>('cr80');
  const [cardWidthMm, setCardWidthMm] = useState<number>(85.6);
  const [cardHeightMm, setCardHeightMm] = useState<number>(54.0);

  const handleCardSizeChange = (presetId: 'cr80' | 'cr79' | 'cr90' | 'cr100' | 'custom') => {
    setCardSizePreset(presetId);
    if (presetId !== 'custom') {
      const found = CARD_SIZE_PRESETS.find(p => p.id === presetId);
      if (found) {
        setCardWidthMm(found.widthMm);
        setCardHeightMm(found.heightMm);
      }
    }
  };

  // Paper setup
  const [selectedPreset, setSelectedPreset] = useState<string>('a4');
  const [paperWidthMm, setPaperWidthMm] = useState(210);
  const [paperHeightMm, setPaperHeightMm] = useState(297);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [showCropMarks, setShowCropMarks] = useState(true);
  const [showCenterGuide, setShowCenterGuide] = useState(true);
  const [showMetadata, setShowMetadata] = useState(true);

  // Cards placed on paper
  const [cards, setCards] = useState<PlacedPaperCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  // Dragging state
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ xMm: number; yMm: number }>({ xMm: 0, yMm: 0 });
  const paperRef = useRef<HTMLDivElement>(null);

  const effectiveWidthMm = orientation === 'landscape' ? Math.max(paperWidthMm, paperHeightMm) : Math.min(paperWidthMm, paperHeightMm);
  const effectiveHeightMm = orientation === 'landscape' ? Math.min(paperWidthMm, paperHeightMm) : Math.max(paperWidthMm, paperHeightMm);

  // Auto-arrange 8-Up Duplex
  const autoArrangeDuplex = async () => {
    const list: PlacedPaperCard[] = [];
    const marginX = 14;
    const marginY = 18;
    const gapX = 10;
    const gapY = 12;

    const availablePeople = people.length > 0 ? people : [activePerson];

    for (let row = 0; row < 4; row++) {
      const p = availablePeople[row % availablePeople.length] || activePerson;

      // Col 1 (Front)
      const frontPng = await renderStudioCard(p, 'front', cardOptions);
      list.push({
        id: `card-front-${row}-${Date.now()}`,
        name: `${p.fullName} (FRONT)`,
        side: 'front',
        png: frontPng,
        xMm: marginX,
        yMm: marginY + row * (cardHeightMm + gapY),
        widthMm: cardWidthMm,
        heightMm: cardHeightMm,
      });

      // Col 2 (Back)
      const backPng = await renderStudioCard(p, 'back', cardOptions);
      list.push({
        id: `card-back-${row}-${Date.now()}`,
        name: `${p.fullName} (BACK)`,
        side: 'back',
        png: backPng,
        xMm: marginX + cardWidthMm + gapX,
        yMm: marginY + row * (cardHeightMm + gapY),
        widthMm: cardWidthMm,
        heightMm: cardHeightMm,
      });
    }

    setCards(list);
    if (list[0]) setSelectedCardId(list[0].id);
  };

  // Auto-arrange 8 Fronts
  const autoArrangeFronts = async () => {
    const list: PlacedPaperCard[] = [];
    const marginX = 14;
    const marginY = 18;
    const gapX = 10;
    const gapY = 12;

    const availablePeople = people.length > 0 ? people : [activePerson];

    for (let i = 0; i < 8; i++) {
      const row = Math.floor(i / 2);
      const col = i % 2;
      const p = availablePeople[i % availablePeople.length] || activePerson;
      const png = await renderStudioCard(p, 'front', cardOptions);

      list.push({
        id: `card-${i}-${Date.now()}`,
        name: `${p.fullName} (FRONT)`,
        side: 'front',
        png,
        xMm: marginX + col * (cardWidthMm + gapX),
        yMm: marginY + row * (cardHeightMm + gapY),
        widthMm: cardWidthMm,
        heightMm: cardHeightMm,
      });
    }

    setCards(list);
    if (list[0]) setSelectedCardId(list[0].id);
  };

  // Initialize on open
  useEffect(() => {
    if (isOpen && cards.length === 0) {
      autoArrangeDuplex();
    }
  }, [isOpen]);

  // Handle Preset change
  const handlePresetSelect = (presetId: string) => {
    setSelectedPreset(presetId);
    const p = PAPER_PRESETS.find(item => item.id === presetId);
    if (p) {
      setPaperWidthMm(p.widthMm);
      setPaperHeightMm(p.heightMm);
    }
  };

  // Add a new card
  const handleAddCard = async (side: 'front' | 'back' = 'front') => {
    const png = await renderStudioCard(activePerson, side, cardOptions);
    const newCard: PlacedPaperCard = {
      id: `card-${Date.now()}`,
      name: `${activePerson.fullName} (${side.toUpperCase()})`,
      side,
      png,
      xMm: 20 + Math.random() * 20,
      yMm: 30 + Math.random() * 30,
      widthMm: cardWidthMm,
      heightMm: cardHeightMm,
    };
    setCards(prev => [...prev, newCard]);
    setSelectedCardId(newCard.id);
  };

  // Flip selected card side
  const handleFlipCard = async (cardId: string) => {
    const target = cards.find(c => c.id === cardId);
    if (!target) return;
    const nextSide = target.side === 'front' ? 'back' : 'front';
    const newPng = await renderStudioCard(activePerson, nextSide, cardOptions);
    setCards(prev =>
      prev.map(c =>
        c.id === cardId
          ? { ...c, side: nextSide, name: `${activePerson.fullName} (${nextSide.toUpperCase()})`, png: newPng }
          : c
      )
    );
  };

  // Duplicate selected card
  const handleDuplicateCard = (cardId: string) => {
    const target = cards.find(c => c.id === cardId);
    if (!target) return;

    const copy: PlacedPaperCard = {
      ...target,
      id: `card-copy-${Date.now()}`,
      xMm: Math.min(target.xMm + 10, effectiveWidthMm - target.widthMm),
      yMm: Math.min(target.yMm + 10, effectiveHeightMm - target.heightMm),
    };
    setCards(prev => [...prev, copy]);
    setSelectedCardId(copy.id);
  };

  // Delete card
  const handleDeleteCard = (cardId: string) => {
    setCards(prev => prev.filter(c => c.id !== cardId));
    if (selectedCardId === cardId) setSelectedCardId(null);
  };

  // Center selected card
  const handleCenterCard = (cardId: string) => {
    setCards(prev =>
      prev.map(c => {
        if (c.id !== cardId) return c;
        return {
          ...c,
          xMm: (effectiveWidthMm - c.widthMm) / 2,
          yMm: (effectiveHeightMm - c.heightMm) / 2,
        };
      })
    );
  };

  // Update card coordinates
  const updateCardPosition = (cardId: string, xMm: number, yMm: number) => {
    setCards(prev =>
      prev.map(c => (c.id === cardId ? { ...c, xMm: Math.max(0, xMm), yMm: Math.max(0, yMm) } : c))
    );
  };

  // Mouse Drag handlers
  const handleMouseDown = (e: React.MouseEvent, card: PlacedPaperCard) => {
    e.stopPropagation();
    setSelectedCardId(card.id);
    setDraggingCardId(card.id);

    if (paperRef.current) {
      const rect = paperRef.current.getBoundingClientRect();
      const scaleFactor = rect.width / effectiveWidthMm;
      const mouseXMm = (e.clientX - rect.left) / scaleFactor;
      const mouseYMm = (e.clientY - rect.top) / scaleFactor;
      setDragOffset({
        xMm: mouseXMm - card.xMm,
        yMm: mouseYMm - card.yMm,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingCardId || !paperRef.current) return;

    const rect = paperRef.current.getBoundingClientRect();
    const scaleFactor = rect.width / effectiveWidthMm;
    const mouseXMm = (e.clientX - rect.left) / scaleFactor;
    const mouseYMm = (e.clientY - rect.top) / scaleFactor;

    const newX = Math.max(0, Math.min(effectiveWidthMm - cardWidthMm, mouseXMm - dragOffset.xMm));
    const newY = Math.max(0, Math.min(effectiveHeightMm - cardHeightMm, mouseYMm - dragOffset.yMm));

    // Optional subtle 2mm grid snapping
    const snapGrid = 2;
    const snappedX = Math.round(newX / snapGrid) * snapGrid;
    const snappedY = Math.round(newY / snapGrid) * snapGrid;

    updateCardPosition(draggingCardId, snappedX, snappedY);
  };

  const handleMouseUp = () => {
    setDraggingCardId(null);
  };

  // Download Paper Sheet PDF
  const handleDownloadPaperPdf = async () => {
    setIsGenerating(true);
    try {
      const config: PaperSheetConfig = {
        paperName: PAPER_PRESETS.find(p => p.id === selectedPreset)?.name || 'Custom Paper',
        widthMm: paperWidthMm,
        heightMm: paperHeightMm,
        orientation,
        showCropMarks,
        showCenterGuide,
        showMetadata,
      };

      const pdfBytes = await generateCustomPaperPdf(cards, config);
      downloadPdf(pdfBytes, `SiliconLabs_${selectedPreset.toUpperCase()}_Print_Sheet.pdf`);
    } catch (err) {
      console.error('Failed to export paper PDF:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Download Single CR80 PDF
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

  const selectedCard = cards.find(c => c.id === selectedCardId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Paper Artboard & Imposition Studio (Canva / Photoshop Mode)"
      size="xl"
    >
      <div className="space-y-4 text-slate-800 text-xs">
        {/* Top Control Bar: Paper Settings + Preset Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
          {/* Paper Size Selector */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 uppercase tracking-wider font-mono text-[10px]">Paper:</span>
            <select
              value={selectedPreset}
              onChange={e => handlePresetSelect(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#198754]"
            >
              {PAPER_PRESETS.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>

            {/* Custom dimensions if custom is selected */}
            {selectedPreset === 'custom' && (
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <input
                  type="number"
                  value={paperWidthMm}
                  onChange={e => setPaperWidthMm(Number(e.target.value))}
                  className="w-14 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-center"
                />
                <span>×</span>
                <input
                  type="number"
                  value={paperHeightMm}
                  onChange={e => setPaperHeightMm(Number(e.target.value))}
                  className="w-14 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-center"
                />
                <span>mm</span>
              </div>
            )}

            {/* Orientation */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 p-0.5 rounded-lg">
              <button
                onClick={() => setOrientation('portrait')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  orientation === 'portrait' ? 'bg-[#198754] text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Portrait
              </button>
              <button
                onClick={() => setOrientation('landscape')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  orientation === 'landscape' ? 'bg-[#198754] text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Landscape
              </button>
            </div>
          </div>

          {/* Card Size Selector (CR80 Standard Default & Custom) */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-500 uppercase tracking-wider font-mono text-[10px]">Card Size:</span>
            <select
              value={cardSizePreset}
              onChange={e => handleCardSizeChange(e.target.value as any)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#198754] font-mono"
            >
              {CARD_SIZE_PRESETS.map(p => (
                <option key={p.id} value={p.id}>
                  {p.code} ({p.widthMm}×{p.heightMm}mm) {p.isDefault ? '— Default' : ''}
                </option>
              ))}
            </select>

            {/* Custom card dimensions if custom or to fine-tune */}
            <div className="flex items-center gap-1 font-mono text-[11px]">
              <input
                type="number"
                step="0.1"
                min="30"
                max="200"
                value={cardWidthMm}
                onChange={e => {
                  setCardWidthMm(Number(e.target.value));
                  setCardSizePreset('custom');
                }}
                className="w-13 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-center text-xs font-bold"
                title="Card Width in mm"
              />
              <span>×</span>
              <input
                type="number"
                step="0.1"
                min="30"
                max="200"
                value={cardHeightMm}
                onChange={e => {
                  setCardHeightMm(Number(e.target.value));
                  setCardSizePreset('custom');
                }}
                className="w-13 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-center text-xs font-bold"
                title="Card Height in mm"
              />
              <span>mm</span>
            </div>
          </div>

          {/* Quick Imposition Presets */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-500 uppercase tracking-wider font-mono text-[10px]">Presets:</span>
            <button
              onClick={autoArrangeDuplex}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              8-Up Duplex
            </button>
            <button
              onClick={autoArrangeFronts}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer"
            >
              8 Fronts
            </button>
            <button
              onClick={() => handleAddCard('front')}
              className="px-2.5 py-1 bg-[#198754] hover:bg-[#157347] text-white font-bold rounded-lg transition-colors cursor-pointer shadow-2xs flex items-center gap-1"
            >
              <span>+ Add Card</span>
            </button>
          </div>
        </div>

        {/* Paper Artboard & Selected Card Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main Paper Visual Canvas (Cols 1..3) */}
          <div
            className="lg:col-span-3 p-6 bg-slate-200 border border-slate-300 rounded-2xl flex flex-col items-center justify-center overflow-auto min-h-[480px] max-h-[580px] relative select-none"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {/* Paper Size Tag */}
            <div className="absolute top-2 left-4 text-[10px] font-mono text-slate-500 flex items-center gap-3">
              <span>Paper: {Math.round(effectiveWidthMm)} × {Math.round(effectiveHeightMm)} mm</span>
              <span>Cards Placed: {cards.length}</span>
              <span>Drag cards freely to position</span>
            </div>

            {/* Simulated Physical Sheet of Paper */}
            <div
              ref={paperRef}
              onClick={() => setSelectedCardId(null)}
              className="relative bg-white shadow-2xl rounded-sm border border-slate-300 transition-all cursor-crosshair overflow-hidden"
              style={{
                width: `${effectiveWidthMm * 2.2}px`,
                height: `${effectiveHeightMm * 2.2}px`,
                maxWidth: '100%',
              }}
            >
              {/* Paper Rulers / Bleed Guides (2mm dashed border) */}
              <div
                className="absolute inset-[4px] border border-dashed border-slate-200 pointer-events-none"
                title="2mm Safe Print Margin"
              />

              {/* Center Fold Line */}
              {showCenterGuide && (
                <div
                  className="absolute top-0 bottom-0 left-1/2 w-0 border-r border-dashed border-emerald-400/60 pointer-events-none"
                  title="Center Fold & Cut Line"
                />
              )}

              {/* Placed Cards on Paper */}
              {cards.map(card => {
                const isSelected = selectedCardId === card.id;
                const cardLeftPx = card.xMm * 2.2;
                const cardTopPx = card.yMm * 2.2;
                const cardWidthPx = card.widthMm * 2.2;
                const cardHeightPx = card.heightMm * 2.2;

                return (
                  <div
                    key={card.id}
                    onMouseDown={e => handleMouseDown(e, card)}
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedCardId(card.id);
                    }}
                    className={`absolute rounded-sm overflow-hidden transition-shadow cursor-move ${
                      isSelected
                        ? 'ring-2 ring-[#198754] ring-offset-2 shadow-xl z-20'
                        : 'shadow-md hover:ring-1 hover:ring-slate-400 z-10'
                    }`}
                    style={{
                      left: `${cardLeftPx}px`,
                      top: `${cardTopPx}px`,
                      width: `${cardWidthPx}px`,
                      height: `${cardHeightPx}px`,
                    }}
                  >
                    {/* Rendered Card Image Preview */}
                    <img
                      src={card.png}
                      alt={card.name}
                      className="w-full h-full object-cover pointer-events-none"
                      draggable={false}
                    />

                    {/* Side Tag Overlay */}
                    <div
                      className={`absolute top-1 left-1 px-1.5 py-0.2 rounded text-[8px] font-mono font-black text-white shadow-xs ${
                        card.side === 'front' ? 'bg-emerald-600' : 'bg-blue-600'
                      }`}
                    >
                      {card.side.toUpperCase()}
                    </div>

                    {/* Coordinates tag when selected */}
                    {isSelected && (
                      <div className="absolute bottom-1 right-1 px-1 py-0.2 bg-slate-900/80 text-white rounded text-[8px] font-mono">
                        {Math.round(card.xMm)},{Math.round(card.yMm)} mm
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Inspector & Card Property Panel (Col 4) */}
          <div className="lg:col-span-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-slate-900 border-b border-slate-200 pb-2">
                Card Inspector & Placement
              </h4>

              {selectedCard ? (
                <div className="space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">Selected Card</span>
                    <p className="font-bold text-slate-900 truncate">{selectedCard.name}</p>
                    <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-white ${
                      selectedCard.side === 'front' ? 'bg-emerald-600' : 'bg-blue-600'
                    }`}>
                      {selectedCard.side.toUpperCase()} SIDE
                    </span>
                  </div>

                  {/* Position controls */}
                  <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">X Position</label>
                      <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-2 py-1">
                        <input
                          type="number"
                          value={Math.round(selectedCard.xMm)}
                          onChange={e => updateCardPosition(selectedCard.id, Number(e.target.value), selectedCard.yMm)}
                          className="w-full text-xs font-bold text-slate-900 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400">mm</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-0.5">Y Position</label>
                      <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-2 py-1">
                        <input
                          type="number"
                          value={Math.round(selectedCard.yMm)}
                          onChange={e => updateCardPosition(selectedCard.id, selectedCard.xMm, Number(e.target.value))}
                          className="w-full text-xs font-bold text-slate-900 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400">mm</span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-1.5 pt-2">
                    <button
                      onClick={() => handleFlipCard(selectedCard.id)}
                      className="w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold rounded-lg text-xs shadow-2xs transition-colors"
                    >
                      Flip Side (Front ↔ Back)
                    </button>
                    <button
                      onClick={() => handleCenterCard(selectedCard.id)}
                      className="w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium rounded-lg text-xs transition-colors"
                    >
                      Center on Paper
                    </button>
                    <button
                      onClick={() => handleDuplicateCard(selectedCard.id)}
                      className="w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-medium rounded-lg text-xs transition-colors"
                    >
                      Duplicate Card
                    </button>
                    <button
                      onClick={() => handleDeleteCard(selectedCard.id)}
                      className="w-full py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold rounded-lg text-xs transition-colors"
                    >
                      Delete from Paper
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 space-y-1">
                  <p className="font-semibold">No card selected</p>
                  <p className="text-[10px]">Click any card on the paper sheet to edit its position, flip side, or duplicate.</p>
                </div>
              )}

              {/* Print Guides Toggles */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase font-mono block">Print Guides</span>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={showCropMarks}
                    onChange={e => setShowCropMarks(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-[#198754]"
                  />
                  <span>2mm Corner Crop Marks</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={showCenterGuide}
                    onChange={e => setShowCenterGuide(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-[#198754]"
                  />
                  <span>Center Fold Guide</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-700">
                  <input
                    type="checkbox"
                    checked={showMetadata}
                    onChange={e => setShowMetadata(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-[#198754]"
                  />
                  <span>Sheet Metadata Header</span>
                </label>
              </div>
            </div>

            {/* Quick stats */}
            <div className="text-[10px] text-slate-400 font-mono border-t border-slate-200 pt-2">
              CR80 Standard: 85.6 × 54 mm (300 DPI Vector PDF)
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="text-[11px] text-slate-500 font-mono">
            <span>SiliconLabs Production 300 DPI Imposition Engine</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadSingleCard}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-bold text-xs text-slate-700 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              1x CR80 Card PDF
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={isGenerating}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 font-bold text-xs text-slate-700 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              PNG ZIP Package
            </button>

            <button
              onClick={handleDownloadPaperPdf}
              disabled={isGenerating}
              className="px-6 py-2.5 rounded-xl bg-[#198754] hover:bg-[#157347] font-bold text-xs text-white shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating 300 DPI Paper PDF...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span>Download {selectedPreset.toUpperCase()} Print PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
