import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { usePeople, useTemplates } from '../db/hooks';
import type { Person, CardTemplate } from '../db/database';
import { generateCustomPaperPdf, downloadPdf } from '../engine/exportPdf';
import { renderStudioCard, type StudioCardOptions } from '../engine/renderStudioCard';
import { useTheme } from '../context/ThemeContext';

export interface CardSlot {
  id: string;
  cardIndex: number;
  face: 'front' | 'back';
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  rotationDeg?: number;
  personId?: number;
}

export default function PaperPrintStudio() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const dbPeople = usePeople();
  const dbTemplates = useTemplates();

  // Paper & Imposition Config
  const [paperFormat, setPaperFormat] = useState<'A4' | 'A3' | 'Letter' | 'Legal' | 'Tabloid' | 'Custom'>('A4');
  const [paperWidthMm, setPaperWidthMm] = useState(210);
  const [paperHeightMm, setPaperHeightMm] = useState(297);
  const [paperOrientation, setPaperOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [impositionPreset, setImpositionPreset] = useState<'8-up-duplex' | '8-up-fronts' | '10-up-fronts' | 'custom'>('8-up-duplex');

  // Sheet zoom & artboard view
  const [zoomScale, setZoomScale] = useState(0.85);
  const [showCropMarks, setShowCropMarks] = useState(true);
  const [showFoldGuide, setShowFoldGuide] = useState(true);
  const [bleedMm, setBleedMm] = useState(2.0);
  const [snapGrid, setSnapGrid] = useState<number>(1); // 1mm snap

  // Selected people for this print run
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCardTemplateId, setActiveCardTemplateId] = useState<string>('default');

  // Card slots & Selection
  const [cardSlots, setCardSlots] = useState<CardSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [renderedCards, setRenderedCards] = useState<Map<string, string>>(new Map());
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Responsive workspace sidebar toggles & mobile tabs
  const [rosterSidebarOpen, setRosterSidebarOpen] = useState(true);
  const [controlsSidebarOpen, setControlsSidebarOpen] = useState(true);
  const [mobileActiveTab, setMobileActiveTab] = useState<'roster' | 'artboard' | 'inspector'>('artboard');

  // Custom Grid Generator state
  const [gridRows, setGridRows] = useState(4);
  const [gridCols, setGridCols] = useState(2);
  const [gridGapX, setGridGapX] = useState(8);
  const [gridGapY, setGridGapY] = useState(6);
  const [gridMarginX, setGridMarginX] = useState(14);
  const [gridMarginY, setGridMarginY] = useState(15);

  // Dragging cards on sheet
  const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Extract unique folders
  const folders = useMemo(() => {
    const map = new Map<string, number>();
    dbPeople.forEach(p => {
      const f = p.folderName || p.sourceFileName || 'Default Batch';
      map.set(f, (map.get(f) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [dbPeople]);

  // Filter people
  const filteredPeople = useMemo(() => {
    return dbPeople.filter(p => {
      const folder = p.folderName || p.sourceFileName || 'Default Batch';
      const matchFolder = selectedFolder === 'all' || folder === selectedFolder;
      const matchSearch =
        p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.idNumber.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFolder && matchSearch;
    });
  }, [dbPeople, selectedFolder, searchQuery]);

  const activeTemplate = useMemo(() => {
    if (activeCardTemplateId.startsWith('custom-')) {
      const id = Number(activeCardTemplateId.replace('custom-', ''));
      return dbTemplates.find(t => t.id === id);
    }
    return undefined;
  }, [dbTemplates, activeCardTemplateId]);

  // Update paper dimensions when format changes
  useEffect(() => {
    let w = 210;
    let h = 297;
    if (paperFormat === 'A4') { w = 210; h = 297; }
    else if (paperFormat === 'A3') { w = 297; h = 420; }
    else if (paperFormat === 'Letter') { w = 215.9; h = 279.4; }
    else if (paperFormat === 'Legal') { w = 215.9; h = 355.6; }
    else if (paperFormat === 'Tabloid') { w = 279.4; h = 431.8; }
    else if (paperFormat === 'Custom') { return; }

    if (paperOrientation === 'landscape') {
      setPaperWidthMm(Math.max(w, h));
      setPaperHeightMm(Math.min(w, h));
    } else {
      setPaperWidthMm(Math.min(w, h));
      setPaperHeightMm(Math.max(w, h));
    }
  }, [paperFormat, paperOrientation]);

  // Determine card dimensions from template or fallback to standard CR80
  const cardW = activeTemplate?.widthMm || (activeTemplate?.widthPx ? Math.round((activeTemplate.widthPx / 300) * 25.4 * 10) / 10 : 85.6);
  const cardH = activeTemplate?.heightMm || (activeTemplate?.heightPx ? Math.round((activeTemplate.heightPx / 300) * 25.4 * 10) / 10 : 54.0);

  // Generate Slots based on Imposition Preset
  const applyImpositionPreset = useCallback((preset: '8-up-duplex' | '8-up-fronts' | '10-up-fronts' | 'custom') => {
    setImpositionPreset(preset);
    const slots: CardSlot[] = [];

    const peopleList = selectedIds.size > 0
      ? dbPeople.filter(p => p.id && selectedIds.has(p.id))
      : (filteredPeople.length > 0 ? filteredPeople : dbPeople);

    if (preset === '8-up-duplex') {
      const startX = 14;
      const startY = 15;
      const gapX = 10;
      const gapY = 8;

      for (let r = 0; r < 4; r++) {
        const p = peopleList[r % Math.max(1, peopleList.length)];
        const pId = p?.id;
        const y = startY + r * (cardH + gapY);

        // Col 1 (Front)
        slots.push({
          id: `slot-${r}-front`,
          cardIndex: r,
          face: 'front',
          xMm: startX,
          yMm: y,
          widthMm: cardW,
          heightMm: cardH,
          rotationDeg: 0,
          personId: pId,
        });

        // Col 2 (Back)
        slots.push({
          id: `slot-${r}-back`,
          cardIndex: r,
          face: 'back',
          xMm: startX + cardW + gapX,
          yMm: y,
          widthMm: cardW,
          heightMm: cardH,
          rotationDeg: 0,
          personId: pId,
        });
      }
    } else if (preset === '8-up-fronts') {
      const startX = 14;
      const startY = 15;
      const gapX = 10;
      const gapY = 8;

      let idx = 0;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 2; c++) {
          const p = peopleList[idx % Math.max(1, peopleList.length)];
          slots.push({
            id: `slot-front-${idx}`,
            cardIndex: idx,
            face: 'front',
            xMm: startX + c * (cardW + gapX),
            yMm: startY + r * (cardH + gapY),
            widthMm: cardW,
            heightMm: cardH,
            rotationDeg: 0,
            personId: p?.id,
          });
          idx++;
        }
      }
    } else if (preset === '10-up-fronts') {
      const startX = 12;
      const startY = 10;
      const gapX = 6;
      const gapY = 3;

      let idx = 0;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 2; c++) {
          const p = peopleList[idx % Math.max(1, peopleList.length)];
          slots.push({
            id: `slot-10-${idx}`,
            cardIndex: idx,
            face: 'front',
            xMm: startX + c * (cardW + gapX),
            yMm: startY + r * (cardH + gapY),
            widthMm: cardW,
            heightMm: cardH,
            rotationDeg: 0,
            personId: p?.id,
          });
          idx++;
        }
      }
    } else {
      // Custom / Freeform starting with 1 card centered
      slots.push({
        id: `slot-custom-0`,
        cardIndex: 0,
        face: 'front',
        xMm: Math.max(10, Math.round((paperWidthMm - cardW) / 2)),
        yMm: Math.max(10, Math.round((paperHeightMm - cardH) / 2)),
        widthMm: cardW,
        heightMm: cardH,
        rotationDeg: 0,
        personId: peopleList[0]?.id,
      });
    }

    setCardSlots(slots);
    setSelectedSlotId(slots[0]?.id || null);
  }, [cardW, cardH, dbPeople, filteredPeople, paperHeightMm, paperWidthMm, selectedIds]);

  // Initialize slots
  useEffect(() => {
    applyImpositionPreset(impositionPreset);
  }, []);

  // Custom Grid Builder Generator
  const handleGenerateCustomGrid = () => {
    const peopleList = selectedIds.size > 0
      ? dbPeople.filter(p => p.id && selectedIds.has(p.id))
      : (filteredPeople.length > 0 ? filteredPeople : dbPeople);

    const slots: CardSlot[] = [];
    let idx = 0;
    for (let r = 0; r < gridRows; r++) {
      for (let c = 0; c < gridCols; c++) {
        const p = peopleList[idx % Math.max(1, peopleList.length)];
        slots.push({
          id: `slot-grid-${r}-${c}-${Date.now()}`,
          cardIndex: idx,
          face: 'front',
          xMm: gridMarginX + c * (cardW + gridGapX),
          yMm: gridMarginY + r * (cardH + gridGapY),
          widthMm: cardW,
          heightMm: cardH,
          rotationDeg: 0,
          personId: p?.id,
        });
        idx++;
      }
    }
    setCardSlots(slots);
    setImpositionPreset('custom');
    if (slots.length > 0) setSelectedSlotId(slots[0].id);
  };

  // Pre-render 300 DPI Cards for all slots
  useEffect(() => {
    let isCancelled = false;

    const renderAll = async () => {
      const map = new Map<string, string>();
      const cardOptions: StudioCardOptions = {
        orientation: activeTemplate?.orientation || (cardW >= cardH ? 'horizontal' : 'vertical'),
        backgroundColor: activeTemplate?.backgroundColor || '#FFFFFF',
        fontFamily: 'Inter',
        headerColor: '#0b131b',
        accentColor: '#10b981',
        badgeColor: '#1e3a8a',
        customTemplate: activeTemplate,
      };

      for (const slot of cardSlots) {
        if (isCancelled) break;
        const person = dbPeople.find(p => p.id === slot.personId) || dbPeople[0];
        if (person) {
          const key = `${person.id}-${slot.face}-${activeCardTemplateId}`;
          if (!map.has(key)) {
            try {
              const dataUrl = await renderStudioCard(person, slot.face, cardOptions);
              map.set(key, dataUrl);
            } catch {
              // Graceful fallback
            }
          }
        }
      }

      if (!isCancelled) {
        setRenderedCards(map);
      }
    };

    renderAll();
    return () => { isCancelled = true; };
  }, [cardSlots, dbPeople, activeTemplate, activeCardTemplateId, cardW, cardH]);

  // Selected Slot details
  const selectedSlot = useMemo(() => {
    return cardSlots.find(s => s.id === selectedSlotId) || null;
  }, [cardSlots, selectedSlotId]);

  // Update selected slot helper
  const updateSelectedSlot = (updates: Partial<CardSlot>) => {
    if (!selectedSlotId) return;
    setCardSlots(prev => prev.map(s => s.id === selectedSlotId ? { ...s, ...updates } : s));
  };

  // Interactive Dragging on Sheet
  const pxPerMm = 3.6 * zoomScale;
  const sheetWidthPx = paperWidthMm * pxPerMm;
  const sheetHeightPx = paperHeightMm * pxPerMm;

  const handleSlotMouseDown = (e: React.MouseEvent, slotId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedSlotId(slotId);
    setDraggedSlotId(slotId);
    const slot = cardSlots.find(s => s.id === slotId);
    if (!slot) return;
    setDragStart({ x: e.clientX - slot.xMm * pxPerMm, y: e.clientY - slot.yMm * pxPerMm });
  };

  const handleSheetMouseMove = (e: React.MouseEvent) => {
    if (!draggedSlotId || !dragStart) return;
    const currentSlot = cardSlots.find(s => s.id === draggedSlotId);
    const currW = currentSlot?.widthMm || cardW;
    const currH = currentSlot?.heightMm || cardH;

    let rawX = (e.clientX - dragStart.x) / pxPerMm;
    let rawY = (e.clientY - dragStart.y) / pxPerMm;

    // Apply snap to grid if active
    if (snapGrid > 0) {
      rawX = Math.round(rawX / snapGrid) * snapGrid;
      rawY = Math.round(rawY / snapGrid) * snapGrid;
    }

    const newXMm = Math.max(0, Math.min(paperWidthMm - currW, rawX));
    const newYMm = Math.max(0, Math.min(paperHeightMm - currH, rawY));

    setCardSlots(prev => prev.map(s => s.id === draggedSlotId ? { ...s, xMm: Math.round(newXMm * 10) / 10, yMm: Math.round(newYMm * 10) / 10 } : s));
  };

  const handleSheetMouseUp = () => {
    setDraggedSlotId(null);
    setDragStart(null);
  };

  // Slot Management actions
  const handleAddSlot = () => {
    const peopleList = selectedIds.size > 0
      ? dbPeople.filter(p => p.id && selectedIds.has(p.id))
      : (filteredPeople.length > 0 ? filteredPeople : dbPeople);

    const newSlot: CardSlot = {
      id: `slot-free-${Date.now()}`,
      cardIndex: cardSlots.length,
      face: 'front',
      xMm: 20,
      yMm: 20,
      widthMm: cardW,
      heightMm: cardH,
      rotationDeg: 0,
      personId: peopleList[cardSlots.length % Math.max(1, peopleList.length)]?.id,
    };
    setCardSlots(prev => [...prev, newSlot]);
    setSelectedSlotId(newSlot.id);
    setImpositionPreset('custom');
  };

  const handleDuplicateSlot = (slotId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const source = cardSlots.find(s => s.id === slotId);
    if (!source) return;
    const dup: CardSlot = {
      ...source,
      id: `slot-dup-${Date.now()}`,
      cardIndex: cardSlots.length,
      xMm: Math.min(paperWidthMm - source.widthMm, source.xMm + 10),
      yMm: Math.min(paperHeightMm - source.heightMm, source.yMm + 10),
    };
    setCardSlots(prev => [...prev, dup]);
    setSelectedSlotId(dup.id);
    setImpositionPreset('custom');
  };

  const handleDeleteSlot = (slotId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCardSlots(prev => prev.filter(s => s.id !== slotId));
    if (selectedSlotId === slotId) {
      setSelectedSlotId(null);
    }
  };

  const handleRotateSlot = (slotId: string, deltaDeg: number = 90, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCardSlots(prev => prev.map(s => {
      if (s.id === slotId) {
        const nextRot = ((s.rotationDeg || 0) + deltaDeg) % 360;
        return { ...s, rotationDeg: nextRot };
      }
      return s;
    }));
  };

  const handleToggleFace = (slotId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCardSlots(prev => prev.map(s => s.id === slotId ? { ...s, face: s.face === 'front' ? 'back' : 'front' } : s));
  };

  // Keyboard Shortcuts (Delete, Duplicate, Nudge)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      if (!selectedSlotId) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSlot(selectedSlotId);
      } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleDuplicateSlot(selectedSlotId);
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        setCardSlots(prev => prev.map(s => {
          if (s.id !== selectedSlotId) return s;
          let nx = s.xMm;
          let ny = s.yMm;
          if (e.key === 'ArrowUp') ny = Math.max(0, s.yMm - step);
          if (e.key === 'ArrowDown') ny = Math.min(paperHeightMm - s.heightMm, s.yMm + step);
          if (e.key === 'ArrowLeft') nx = Math.max(0, s.xMm - step);
          if (e.key === 'ArrowRight') nx = Math.min(paperWidthMm - s.widthMm, s.xMm + step);
          return { ...s, xMm: Math.round(nx * 10) / 10, yMm: Math.round(ny * 10) / 10 };
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSlotId, paperWidthMm, paperHeightMm]);

  // 1-Click 300 DPI Vector PDF Generator
  const handleExportPdf = async () => {
    setIsExporting(true);
    setExportProgress(15);

    try {
      const prog = setInterval(() => {
        setExportProgress(p => (p < 90 ? p + 20 : p));
      }, 200);

      const placedCards: import('../engine/exportPdf').PlacedPaperCard[] = [];

      for (const s of cardSlots) {
        const person = dbPeople.find(p => p.id === s.personId) || dbPeople[0];
        const key = `${person?.id}-${s.face}-${activeCardTemplateId}`;
        let imgDataUrl = renderedCards.get(key) || '';

        // If not pre-rendered yet, render on-the-fly
        if (!imgDataUrl && person) {
          const cardOptions: StudioCardOptions = {
            orientation: activeTemplate?.orientation || (s.widthMm >= s.heightMm ? 'horizontal' : 'vertical'),
            backgroundColor: activeTemplate?.backgroundColor || '#FFFFFF',
            fontFamily: 'Inter',
            headerColor: '#0b131b',
            accentColor: '#10b981',
            badgeColor: '#1e3a8a',
            customTemplate: activeTemplate,
          };
          try {
            imgDataUrl = await renderStudioCard(person, s.face, cardOptions);
          } catch {
            // Ignore
          }
        }

        if (imgDataUrl) {
          placedCards.push({
            id: s.id,
            name: `${person?.fullName || 'Card'} (${s.face})`,
            side: s.face,
            png: imgDataUrl,
            xMm: s.xMm,
            yMm: s.yMm,
            widthMm: s.widthMm,
            heightMm: s.heightMm,
            rotationDeg: s.rotationDeg || 0,
          });
        }
      }

      if (placedCards.length === 0) {
        clearInterval(prog);
        setIsExporting(false);
        setExportProgress(0);
        alert('No cards are currently placed on the paper sheet. Please add or select personnel.');
        return;
      }

      const pdfBlob = await generateCustomPaperPdf(
        placedCards,
        {
          paperName: `${paperFormat} Imposition Sheet`,
          widthMm: paperWidthMm,
          heightMm: paperHeightMm,
          orientation: paperOrientation,
          showCropMarks,
          showCenterGuide: showFoldGuide,
          showMetadata: true,
        }
      );

      clearInterval(prog);
      setExportProgress(100);

      downloadPdf(pdfBlob, `SiliconLabs_${paperFormat}_300DPI_Imposition.pdf`);
    } catch (err) {
      console.error('Export PDF error:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(`Failed to generate 300 DPI PDF.\n\nError: ${errorMsg}\n\nCheck browser console for full stack trace.`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // Toggle selection
  const toggleSelectPerson = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPeople.length && filteredPeople.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPeople.map(p => p.id as number)));
    }
  };

  return (
    <div
      className="flex h-screen font-sans antialiased overflow-hidden transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-root)', color: 'var(--text-primary)' }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* ================= TOP COMMAND HEADER ================= */}
        <header
          className="h-16 px-4 md:px-6 border-b flex items-center justify-between z-20 flex-shrink-0 flex-wrap gap-2"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/studio')}
              className="p-2 rounded-xl border hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              title="Return to ID Card Studio"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>

            <div className="truncate">
              <h1 className="text-sm font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
                Professional Paper Print Studio
              </h1>
              <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                Freeform Photoshop & Canva-grade layout • 300 DPI vector imposition engine.
              </p>
            </div>
          </div>

          {/* Quick Presets & Export Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
              {(['8-up-duplex', '8-up-fronts', '10-up-fronts', 'custom'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => applyImpositionPreset(p)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    impositionPreset === p ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
                  }`}
                  style={{
                    color: impositionPreset === p ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  {p === '8-up-duplex' ? '8-Up Duplex' : p === '8-up-fronts' ? '8 Fronts' : p === '10-up-fronts' ? '10-Up' : 'Freeform'}
                </button>
              ))}
            </div>

            {/* View toggles for responsive screens */}
            <button
              onClick={() => setRosterSidebarOpen(o => !o)}
              className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${rosterSidebarOpen ? 'text-[#84a92c]' : 'text-slate-400'}`}
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              title="Toggle Roster Panel"
            >
              📁 Roster
            </button>

            <button
              onClick={() => setControlsSidebarOpen(o => !o)}
              className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition-colors ${controlsSidebarOpen ? 'text-[#84a92c]' : 'text-slate-400'}`}
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              title="Toggle Layout Inspector"
            >
              ⚙️ Inspector
            </button>

            {/* Export PDF */}
            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="btn-primary py-2 px-4 text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer flex-shrink-0"
            >
              {isExporting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Compiling PDF ({exportProgress}%)…</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span>Export 300 DPI PDF</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Tabs (visible only on mobile & tablets < lg) */}
        <div
          className="flex lg:hidden items-center justify-around border-b px-2 py-1.5 flex-shrink-0 gap-1.5 z-20 shadow-xs"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <button
            onClick={() => setMobileActiveTab('roster')}
            className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
              mobileActiveTab === 'roster' ? 'bg-[#84a92c] text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            📁 Roster ({selectedIds.size > 0 ? selectedIds.size : filteredPeople.length})
          </button>
          <button
            onClick={() => setMobileActiveTab('artboard')}
            className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
              mobileActiveTab === 'artboard' ? 'bg-[#84a92c] text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            📄 Artboard ({cardSlots.length})
          </button>
          <button
            onClick={() => setMobileActiveTab('inspector')}
            className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
              mobileActiveTab === 'inspector' ? 'bg-[#84a92c] text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚙️ Inspector
          </button>
        </div>

        {/* ================= 3-COLUMN WORKSPACE ================= */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* COLUMN 1: BATCH ROSTER & PERSONNEL (COLLAPSIBLE / RESPONSIVE) */}
          {(rosterSidebarOpen || mobileActiveTab === 'roster') && (
            <aside
              className={`w-full lg:w-80 border-r flex flex-col p-3.5 space-y-3 flex-shrink-0 overflow-y-auto text-xs z-10 shadow-lg lg:shadow-none ${
                mobileActiveTab === 'roster' ? 'flex' : 'hidden lg:flex'
              }`}
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              <div>
                <label className="text-[10px] font-bold uppercase font-mono tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                  Source Folder Batch
                </label>
                <select
                  value={selectedFolder}
                  onChange={e => {
                    setSelectedFolder(e.target.value);
                    setSelectedIds(new Set());
                  }}
                  className="w-full text-xs py-1.5 px-2.5 rounded-xl border font-bold focus:outline-none focus:border-[#84a92c] cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="all">📁 All Records ({dbPeople.length})</option>
                  {folders.map(f => (
                    <option key={f.name} value={f.name}>
                      📁 {f.name} ({f.count})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : `${filteredPeople.length} in view`}
                </span>
                <button
                  onClick={toggleSelectAll}
                  className="text-[10px] font-bold text-[#84a92c] hover:underline cursor-pointer"
                >
                  {selectedIds.size === filteredPeople.length && filteredPeople.length > 0 ? 'Deselect' : 'Select All'}
                </button>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search personnel..."
                className="w-full px-2.5 py-1.5 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c]"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
              />

              {/* Roster List */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {filteredPeople.map(p => {
                  const isChecked = p.id ? selectedIds.has(p.id) : false;
                  return (
                    <div
                      key={p.id}
                      onClick={() => p.id && toggleSelectPerson(p.id)}
                      className="flex items-center gap-2 p-2 rounded-xl border cursor-pointer hover:border-[#84a92c] transition-all"
                      style={{ backgroundColor: isChecked ? 'rgba(132, 169, 44, 0.12)' : 'var(--bg-elevated)', borderColor: isChecked ? '#84a92c' : 'var(--border-primary)' }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-3.5 h-3.5 rounded accent-[#84a92c] cursor-pointer flex-shrink-0"
                      />
                      <div className="w-6 h-6 rounded-md bg-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center font-bold text-[9px] text-slate-800">
                        {p.photoDataUrl ? (
                          <img src={p.photoDataUrl} alt={p.fullName} className="w-full h-full object-cover" />
                        ) : (
                          p.fullName.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs truncate leading-tight" style={{ color: 'var(--text-primary)' }}>{p.fullName}</p>
                        <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>{p.idNumber}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          )}

          {/* COLUMN 2: CENTER PHYSICAL PAPER SHEET ARTBOARD */}
          <main
            className={`flex-1 flex-col items-center justify-center overflow-auto p-4 md:p-8 relative select-none ${
              mobileActiveTab === 'artboard' ? 'flex' : 'hidden lg:flex'
            }`}
            style={{ backgroundColor: 'var(--bg-root)' }}
            onMouseMove={handleSheetMouseMove}
            onMouseUp={handleSheetMouseUp}
            onClick={() => setSelectedSlotId(null)}
          >
            {/* Sheet Ruler Info & Floating Artboard Toolbar */}
            <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono flex-wrap gap-2 z-10" style={{ color: 'var(--text-muted)' }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-black/30 backdrop-blur-xs px-2 py-1 rounded-lg">
                  Sheet: {paperFormat} ({paperWidthMm} × {paperHeightMm} mm) • {cardSlots.length} Cards Placed
                </span>
                <button
                  onClick={handleAddSlot}
                  className="px-2.5 py-1 rounded-lg bg-[#84a92c] text-slate-900 font-bold text-xs hover:opacity-90 cursor-pointer shadow-sm"
                >
                  + Add Card Slot
                </button>
              </div>

              {/* Zoom & Snap controls */}
              <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xs px-3 py-1 rounded-xl border border-white/10">
                <span className="text-[10px]">Snap:</span>
                <select
                  value={snapGrid}
                  onChange={e => setSnapGrid(Number(e.target.value))}
                  className="bg-transparent text-[10px] font-mono border-b border-slate-500 focus:outline-none cursor-pointer"
                >
                  <option value={1} className="bg-slate-900">1 mm</option>
                  <option value={5} className="bg-slate-900">5 mm</option>
                  <option value={10} className="bg-slate-900">10 mm</option>
                  <option value={0} className="bg-slate-900">Off</option>
                </select>

                <div className="w-px h-3 bg-slate-600 mx-1" />

                <button
                  onClick={() => setZoomScale(z => Math.max(0.4, Math.round((z - 0.1) * 100) / 100))}
                  className="px-1.5 py-0.5 rounded hover:bg-white/10 cursor-pointer text-xs font-bold"
                  title="Zoom Out"
                >
                  −
                </button>
                <span className="font-mono text-xs">{Math.round(zoomScale * 100)}%</span>
                <button
                  onClick={() => setZoomScale(z => Math.min(1.8, Math.round((z + 0.1) * 100) / 100))}
                  className="px-1.5 py-0.5 rounded hover:bg-white/10 cursor-pointer text-xs font-bold"
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  onClick={() => setZoomScale(0.85)}
                  className="px-1.5 py-0.5 rounded hover:bg-white/10 cursor-pointer text-[10px]"
                  title="Reset Zoom"
                >
                  Fit
                </button>
              </div>
            </div>

            {/* Physical Paper Sheet Canvas Container */}
            <div
              className="relative bg-white shadow-2xl transition-all duration-150 border border-slate-400 my-auto"
              style={{
                width: `${sheetWidthPx}px`,
                height: `${sheetHeightPx}px`,
                boxShadow: '0 25px 60px -15px rgba(0,0,0,0.6)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Subtle mm Grid Paper Background */}
              <div
                className="absolute inset-0 pointer-events-none opacity-10"
                style={{
                  backgroundImage: `radial-gradient(circle, #000 1px, transparent 1px)`,
                  backgroundSize: `${10 * pxPerMm}px ${10 * pxPerMm}px`,
                }}
              />

              {/* Center Fold / Cut Guideline on Duplex Sheet */}
              {showFoldGuide && impositionPreset === '8-up-duplex' && (
                <div
                  className="absolute top-0 bottom-0 border-r-2 border-dashed border-red-400/80 pointer-events-none z-10"
                  style={{ left: `${sheetWidthPx / 2}px` }}
                >
                  <span className="absolute top-2 -left-12 px-1.5 py-0.5 bg-red-500 text-white rounded text-[8px] font-mono font-bold shadow-xs">
                    CENTER CUT / FOLD
                  </span>
                </div>
              )}

              {/* Rendered Imposition Slots */}
              {cardSlots.map(slot => {
                const isSelected = selectedSlotId === slot.id;
                const person = dbPeople.find(p => p.id === slot.personId) || dbPeople[0];
                const key = `${person?.id}-${slot.face}-${activeCardTemplateId}`;
                const cardImg = renderedCards.get(key);

                const slotXPx = slot.xMm * pxPerMm;
                const slotYPx = slot.yMm * pxPerMm;
                const slotWPx = slot.widthMm * pxPerMm;
                const slotHPx = slot.heightMm * pxPerMm;
                const rot = slot.rotationDeg || 0;

                return (
                  <div
                    key={slot.id}
                    onMouseDown={e => handleSlotMouseDown(e, slot.id)}
                    className={`absolute group rounded-lg overflow-visible shadow-sm cursor-grab active:cursor-grabbing transition-all ${
                      isSelected
                        ? 'ring-3 ring-[#84a92c] z-20 shadow-xl'
                        : 'border border-slate-400/80 hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/30'
                    }`}
                    style={{
                      left: `${slotXPx}px`,
                      top: `${slotYPx}px`,
                      width: `${slotWPx}px`,
                      height: `${slotHPx}px`,
                      transform: rot ? `rotate(${rot}deg)` : undefined,
                      transformOrigin: 'center center',
                    }}
                  >
                    {/* Inner Card Render Image */}
                    <div className="w-full h-full rounded-lg overflow-hidden bg-slate-100 relative">
                      {cardImg ? (
                        <img src={cardImg} alt="Card Face" className="w-full h-full object-cover pointer-events-none" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-slate-700 bg-slate-200">
                          <span className="font-bold text-[10px]">{person?.fullName}</span>
                          <span className="font-mono text-[9px] text-emerald-700 uppercase">{slot.face} FACE</span>
                        </div>
                      )}
                    </div>

                    {/* Slot Overlay Tag & Quick Action Buttons */}
                    <div className="absolute -top-7 left-0 right-0 flex items-center justify-between px-2 py-0.5 rounded bg-black/85 text-white text-[9px] font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity z-30 shadow-md">
                      <span className="truncate">{slot.face.toUpperCase()} • {person?.fullName.split(' ')[0]}</span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={e => handleRotateSlot(slot.id, 90, e)}
                          className="px-1 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[8px] cursor-pointer"
                          title="Rotate 90°"
                        >
                          🔄 90°
                        </button>
                        <button
                          type="button"
                          onClick={e => handleToggleFace(slot.id, e)}
                          className="px-1 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[8px] cursor-pointer"
                          title="Flip Face (Front/Back)"
                        >
                          Flip
                        </button>
                        <button
                          type="button"
                          onClick={e => handleDuplicateSlot(slot.id, e)}
                          className="px-1 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[8px] cursor-pointer"
                          title="Duplicate"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={e => handleDeleteSlot(slot.id, e)}
                          className="px-1 py-0.5 rounded bg-red-600 hover:bg-red-500 text-[8px] cursor-pointer"
                          title="Delete Card"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Dimension tooltip while dragging */}
                    {draggedSlotId === slot.id && (
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-[#84a92c] text-slate-950 font-mono font-bold text-[9px] whitespace-nowrap shadow-md pointer-events-none z-30">
                        X: {slot.xMm}mm • Y: {slot.yMm}mm
                      </div>
                    )}

                    {/* Corner Crop Lines Indicator */}
                    {showCropMarks && (
                      <div className="absolute -inset-1 pointer-events-none border border-slate-400/40" />
                    )}
                  </div>
                );
              })}
            </div>
          </main>

          {/* COLUMN 3: IMPOSITION & SHEET INSPECTOR (COLLAPSIBLE / RESPONSIVE) */}
          {(controlsSidebarOpen || mobileActiveTab === 'inspector') && (
            <aside
              className={`w-full lg:w-80 border-l p-4 space-y-4 overflow-y-auto flex-shrink-0 text-xs z-10 shadow-lg lg:shadow-none ${
                mobileActiveTab === 'inspector' ? 'block' : 'hidden lg:block'
              }`}
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              {/* Selected Slot Inspector (if active) */}
              {selectedSlot && (
                <div className="p-3 rounded-2xl bg-[#84a92c]/10 border border-[#84a92c]/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#84a92c]">Selected Card Slot</span>
                    <span className="text-[10px] font-mono bg-[#84a92c]/20 px-1.5 py-0.5 rounded font-bold">
                      {selectedSlot.face.toUpperCase()}
                    </span>
                  </div>

                  {/* Bound Personnel */}
                  <div>
                    <label className="text-[10px] font-semibold text-slate-400 block mb-0.5">Assigned Person</label>
                    <select
                      value={selectedSlot.personId || ''}
                      onChange={e => updateSelectedSlot({ personId: Number(e.target.value) })}
                      className="w-full text-xs py-1.5 px-2 rounded-xl border font-bold focus:outline-none focus:border-[#84a92c]"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                    >
                      {dbPeople.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({p.idNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Size & Position (mm) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block">X Position (mm)</label>
                      <input
                        type="number"
                        value={selectedSlot.xMm}
                        onChange={e => updateSelectedSlot({ xMm: Number(e.target.value) })}
                        className="w-full text-xs py-1 px-2 rounded-lg border font-mono"
                        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Y Position (mm)</label>
                      <input
                        type="number"
                        value={selectedSlot.yMm}
                        onChange={e => updateSelectedSlot({ yMm: Number(e.target.value) })}
                        className="w-full text-xs py-1 px-2 rounded-lg border font-mono"
                        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Width (mm)</label>
                      <input
                        type="number"
                        value={selectedSlot.widthMm}
                        onChange={e => updateSelectedSlot({ widthMm: Math.max(20, Number(e.target.value)) })}
                        className="w-full text-xs py-1 px-2 rounded-lg border font-mono"
                        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block">Height (mm)</label>
                      <input
                        type="number"
                        value={selectedSlot.heightMm}
                        onChange={e => updateSelectedSlot({ heightMm: Math.max(20, Number(e.target.value)) })}
                        className="w-full text-xs py-1 px-2 rounded-lg border font-mono"
                        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                      />
                    </div>
                  </div>

                  {/* Quick Card Controls */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={() => handleRotateSlot(selectedSlot.id, 90)}
                      className="flex-1 py-1 px-2 rounded-lg border text-[11px] font-bold hover:opacity-80 cursor-pointer text-center"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                    >
                      Rotate 90° ({selectedSlot.rotationDeg || 0}°)
                    </button>
                    <button
                      onClick={() => handleToggleFace(selectedSlot.id)}
                      className="flex-1 py-1 px-2 rounded-lg border text-[11px] font-bold hover:opacity-80 cursor-pointer text-center"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                    >
                      Flip ({selectedSlot.face})
                    </button>
                  </div>
                </div>
              )}

              {/* Active Template Switcher */}
              <div>
                <label className="text-[10px] font-bold uppercase font-mono tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>
                  Applied Vector Template
                </label>
                <select
                  value={activeCardTemplateId}
                  onChange={e => setActiveCardTemplateId(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border font-bold focus:outline-none focus:border-[#84a92c] cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="default">Standard CR80 Corporate</option>
                  {dbTemplates.map(t => (
                    <option key={t.id} value={`custom-${t.id}`}>
                      🎨 {t.name} ({t.widthPx && t.heightPx ? `${t.widthPx}×${t.heightPx}px` : 'CR80'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Paper Sheet Format & Dimensions */}
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase font-mono tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    Paper Sheet Format
                  </label>
                  <button
                    onClick={() => setPaperOrientation(o => o === 'portrait' ? 'landscape' : 'portrait')}
                    className="text-[10px] font-bold text-[#84a92c] hover:underline cursor-pointer"
                  >
                    {paperOrientation.toUpperCase()}
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {(['A4', 'A3', 'Letter', 'Legal', 'Tabloid', 'Custom'] as const).map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setPaperFormat(fmt)}
                      className={`py-1.5 rounded-xl border font-bold text-xs cursor-pointer ${
                        paperFormat === fmt ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
                      }`}
                      style={{
                        backgroundColor: paperFormat === fmt ? '#198754' : 'var(--bg-elevated)',
                        borderColor: paperFormat === fmt ? '#198754' : 'var(--border-primary)',
                        color: paperFormat === fmt ? '#ffffff' : 'var(--text-secondary)',
                      }}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>

                {paperFormat === 'Custom' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Width (mm)</label>
                      <input
                        type="number"
                        value={paperWidthMm}
                        onChange={e => setPaperWidthMm(Math.max(50, Number(e.target.value)))}
                        className="w-full text-xs py-1 px-2 rounded-lg border font-mono"
                        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Height (mm)</label>
                      <input
                        type="number"
                        value={paperHeightMm}
                        onChange={e => setPaperHeightMm(Math.max(50, Number(e.target.value)))}
                        className="w-full text-xs py-1 px-2 rounded-lg border font-mono"
                        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Grid Auto-Generator */}
              <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                <label className="text-[10px] font-bold uppercase font-mono tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                  Auto Grid Imposition Generator
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500">Rows</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={gridRows}
                      onChange={e => setGridRows(Number(e.target.value))}
                      className="w-full text-xs py-1 px-2 rounded-lg border font-mono"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Cols</label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={gridCols}
                      onChange={e => setGridCols(Number(e.target.value))}
                      className="w-full text-xs py-1 px-2 rounded-lg border font-mono"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Gap X (mm)</label>
                    <input
                      type="number"
                      value={gridGapX}
                      onChange={e => setGridGapX(Number(e.target.value))}
                      className="w-full text-xs py-1 px-2 rounded-lg border font-mono"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Gap Y (mm)</label>
                    <input
                      type="number"
                      value={gridGapY}
                      onChange={e => setGridGapY(Number(e.target.value))}
                      className="w-full text-xs py-1 px-2 rounded-lg border font-mono"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleGenerateCustomGrid}
                  className="w-full py-1.5 rounded-xl border text-xs font-bold hover:border-[#84a92c] transition-colors cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                >
                  Apply {gridRows}×{gridCols} Grid Layout ({gridRows * gridCols} Slots)
                </button>
              </div>

              {/* Bleed & Crop Marks */}
              <div className="space-y-2.5 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                <label className="text-[10px] font-bold uppercase font-mono tracking-wider block" style={{ color: 'var(--text-muted)' }}>
                  Production Cut & Fold Guides
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={showCropMarks}
                    onChange={e => setShowCropMarks(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-[#84a92c]"
                  />
                  <span>Draw Corner Crop Crosshairs</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={showFoldGuide}
                    onChange={e => setShowFoldGuide(e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-[#84a92c]"
                  />
                  <span>Draw Center Cut/Fold Guideline</span>
                </label>

                <div>
                  <div className="flex justify-between text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    <span>Bleed Margin:</span>
                    <span className="font-mono">{bleedMm} mm</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={5}
                    step={0.5}
                    value={bleedMm}
                    onChange={e => setBleedMm(Number(e.target.value))}
                    className="w-full accent-[#84a92c] cursor-pointer"
                  />
                </div>
              </div>

              {/* Action Card */}
              <div className="p-3.5 rounded-2xl bg-[#84a92c]/10 border border-[#84a92c]/30 space-y-2">
                <p className="font-bold text-xs text-[#84a92c]">300 DPI Vector PDF Engine</p>
                <p className="text-[10px] text-slate-500">
                  Ready for commercial digital presses and guillotine cutting.
                </p>
                <button
                  onClick={handleExportPdf}
                  disabled={isExporting}
                  className="btn-primary w-full py-2.5 text-xs font-bold cursor-pointer shadow-xs"
                >
                  {isExporting ? 'Generating…' : 'Download Print PDF'}
                </button>
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
