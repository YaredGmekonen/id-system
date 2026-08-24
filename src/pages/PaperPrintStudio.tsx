import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { usePeople, useTemplates } from '../db/hooks';
import type { Person, CardTemplate } from '../db/database';
import { generateCustomPaperPdf, downloadPdf, type PlacedPaperCard } from '../engine/exportPdf';
import { renderStudioCard, type StudioCardOptions } from '../engine/renderStudioCard';
import { CARD_SIZE_PRESETS, type CardSizePreset } from '../design-tokens';
import { useTheme } from '../context/ThemeContext';
import {
  Printer,
  RotateCw,
  Copy,
  Trash2,
  Maximize2,
  FolderKanban,
  Sparkles,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckSquare,
  Square,
  FileText,
  CheckCircle2,
  Move,
  Eye,
  Grid,
  Plus,
  ArrowRight,
  ArrowLeft,
  Check,
  Settings,
  ShieldCheck,
  Zap,
  Menu,
  Ruler,
  Layers,
} from 'lucide-react';

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
  customImageSrc?: string;
}

export default function PaperPrintStudio() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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

  // Multi-Page Sheet State: Array of Sheets (pages)
  const [pages, setPages] = useState<CardSlot[][]>([[]]);
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  // Active slots for the current sheet
  const cardSlots = pages[currentPageIndex] || [];
  const setCardSlots = useCallback((updater: CardSlot[] | ((prev: CardSlot[]) => CardSlot[])) => {
    setPages(prevPages => {
      const nextPages = [...prevPages];
      const current = nextPages[currentPageIndex] || [];
      const updated = typeof updater === 'function' ? updater(current) : updater;
      nextPages[currentPageIndex] = updated;
      return nextPages;
    });
  }, [currentPageIndex]);

  // Multi-Selection State
  const [selectedSlotIds, setSelectedSlotIds] = useState<Set<string>>(new Set());
  const selectedSlotId = selectedSlotIds.size === 1 ? Array.from(selectedSlotIds)[0] : null;

  // Marquee / Box Selection State
  const [isMarqueeActive, setIsMarqueeActive] = useState(false);
  const [marqueeStartPx, setMarqueeStartPx] = useState<{ x: number; y: number } | null>(null);
  const [marqueeCurrentPx, setMarqueeCurrentPx] = useState<{ x: number; y: number } | null>(null);
  const paperSheetRef = useRef<HTMLDivElement>(null);

  // Rendered preview cache & PDF Export State
  const [renderedCards, setRenderedCards] = useState<Map<string, string>>(new Map());
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportMessage, setExportMessage] = useState('');

  // Toast / Action notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Internal clipboard for slots
  const [clipboardSlots, setClipboardSlots] = useState<CardSlot[]>([]);

  // Rendered high-resolution card cache for real visual display on paper sheet
  const [renderedCardMap, setRenderedCardMap] = useState<Map<string, string>>(new Map());

  // Responsive workspace sidebar toggles & mobile tabs
  const [rosterSidebarOpen, setRosterSidebarOpen] = useState(true);
  const [controlsSidebarOpen, setControlsSidebarOpen] = useState(true);
  const [mobileActiveTab, setMobileActiveTab] = useState<'roster' | 'artboard' | 'inspector'>('artboard');

  // Custom Grid Generator state
  const [gridRows, setGridRows] = useState(4);
  const [gridCols, setGridCols] = useState(2);

  // Card dimensions & size preset state (CR80 standard default: 85.6mm x 54.0mm)
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

  // Compute pxPerMm for canvas rendering (3.6px per mm at 100% zoom)
  const pxPerMm = 3.6 * zoomScale;
  const sheetWidthPx = paperWidthMm * pxPerMm;
  const sheetHeightPx = paperHeightMm * pxPerMm;

  // Extract unique folders
  const folders = useMemo(() => {
    const map = new Map<string, number>();
    dbPeople.forEach(p => {
      const folder = p.folderName || p.sourceFileName || (p.category === 'Students' ? 'Student Roster' : 'Corporate Enclave');
      map.set(folder, (map.get(folder) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [dbPeople]);

  // Filtered people
  const filteredPeople = useMemo(() => {
    return dbPeople.filter(p => {
      const folder = p.folderName || p.sourceFileName || (p.category === 'Students' ? 'Student Roster' : 'Corporate Enclave');
      const matchFolder = selectedFolder === 'all' || folder === selectedFolder;
      const matchSearch =
        p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.idNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.department.toLowerCase().includes(searchQuery.toLowerCase());
      return matchFolder && matchSearch;
    });
  }, [dbPeople, searchQuery, selectedFolder]);

  // Handle URL param ?personId=X
  useEffect(() => {
    const paramId = searchParams.get('personId');
    if (paramId && dbPeople.length > 0) {
      const pId = Number(paramId);
      setSelectedIds(new Set([pId]));
    }
  }, [searchParams, dbPeople]);

  // Smart Multi-Page Imposition Generator
  const generateImpositionPages = useCallback((preset: '8-up-duplex' | '8-up-fronts' | '10-up-fronts' | 'custom', customTargetPeople?: Person[]) => {
    setImpositionPreset(preset);

    const peopleList: Person[] = customTargetPeople || (
      selectedIds.size > 0
        ? dbPeople.filter(p => p.id && selectedIds.has(p.id))
        : (filteredPeople.length > 0 ? filteredPeople : dbPeople)
    );

    if (peopleList.length === 0) {
      showToast('No personnel records found to impose.');
      return;
    }

    let capacityPerSheet = 4; // 8-up-duplex has 4 duplex pairs per sheet
    if (preset === '8-up-fronts') capacityPerSheet = 8;
    else if (preset === '10-up-fronts') capacityPerSheet = 10;
    else if (preset === 'custom') capacityPerSheet = gridRows * gridCols;

    const totalSheetsRequired = Math.max(1, Math.ceil(peopleList.length / capacityPerSheet));
    const generatedPages: CardSlot[][] = [];

    const gapX = 8;
    const gapY = 6;
    const startX = Math.max(6, Math.round((paperWidthMm - (2 * cardWidthMm + gapX)) / 2));
    const startY = Math.max(8, Math.round((paperHeightMm - (4 * cardHeightMm + 3 * gapY)) / 2));

    for (let pageIdx = 0; pageIdx < totalSheetsRequired; pageIdx++) {
      const pagePeople = peopleList.slice(pageIdx * capacityPerSheet, (pageIdx + 1) * capacityPerSheet);
      const slots: CardSlot[] = [];

      if (preset === '8-up-duplex') {
        // 4 rows, 2 columns per sheet (Col 1 = Front, Col 2 = Back)
        for (let r = 0; r < 4; r++) {
          const person = pagePeople[r];
          if (!person && pageIdx > 0 && r >= pagePeople.length) break;

          const pId = person ? person.id : peopleList[r % peopleList.length]?.id;
          const y = startY + r * (cardHeightMm + gapY);

          // Col 1 (Front Face)
          slots.push({
            id: `p${pageIdx}-slot-${r}-front`,
            cardIndex: pageIdx * 8 + r * 2,
            face: 'front',
            xMm: startX,
            yMm: y,
            widthMm: cardWidthMm,
            heightMm: cardHeightMm,
            rotationDeg: 0,
            personId: pId,
          });

          // Col 2 (Back Face)
          slots.push({
            id: `p${pageIdx}-slot-${r}-back`,
            cardIndex: pageIdx * 8 + r * 2 + 1,
            face: 'back',
            xMm: startX + cardWidthMm + gapX,
            yMm: y,
            widthMm: cardWidthMm,
            heightMm: cardHeightMm,
            rotationDeg: 0,
            personId: pId,
          });
        }
      } else if (preset === '8-up-fronts') {
        let idx = 0;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 2; c++) {
            if (idx >= pagePeople.length && pageIdx > 0) break;
            const p = pagePeople[idx] || peopleList[idx % peopleList.length];
            slots.push({
              id: `p${pageIdx}-slot-front-${idx}`,
              cardIndex: pageIdx * 8 + idx,
              face: 'front',
              xMm: startX + c * (cardWidthMm + gapX),
              yMm: startY + r * (cardHeightMm + gapY),
              widthMm: cardWidthMm,
              heightMm: cardHeightMm,
              rotationDeg: 0,
              personId: p?.id,
            });
            idx++;
          }
        }
      } else if (preset === '10-up-fronts') {
        let idx = 0;
        const gY = 4;
        const sY = Math.max(6, Math.round((paperHeightMm - (5 * cardHeightMm + 4 * gY)) / 2));
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 2; c++) {
            if (idx >= pagePeople.length && pageIdx > 0) break;
            const p = pagePeople[idx] || peopleList[idx % peopleList.length];
            slots.push({
              id: `p${pageIdx}-slot-10up-${idx}`,
              cardIndex: pageIdx * 10 + idx,
              face: 'front',
              xMm: startX + c * (cardWidthMm + gapX),
              yMm: sY + r * (cardHeightMm + gY),
              widthMm: cardWidthMm,
              heightMm: cardHeightMm,
              rotationDeg: 0,
              personId: p?.id,
            });
            idx++;
          }
        }
      } else if (preset === 'custom') {
        let idx = 0;
        const sX = Math.max(6, Math.round((paperWidthMm - (gridCols * cardWidthMm + (gridCols - 1) * gapX)) / 2));
        const sY = Math.max(8, Math.round((paperHeightMm - (gridRows * cardHeightMm + (gridRows - 1) * gapY)) / 2));
        for (let r = 0; r < gridRows; r++) {
          for (let c = 0; c < gridCols; c++) {
            if (idx >= pagePeople.length && pageIdx > 0) break;
            const p = pagePeople[idx] || peopleList[idx % peopleList.length];
            slots.push({
              id: `p${pageIdx}-slot-custom-${idx}`,
              cardIndex: pageIdx * (gridRows * gridCols) + idx,
              face: 'front',
              xMm: sX + c * (cardWidthMm + gapX),
              yMm: sY + r * (cardHeightMm + gapY),
              widthMm: cardWidthMm,
              heightMm: cardHeightMm,
              rotationDeg: 0,
              personId: p?.id,
            });
            idx++;
          }
        }
      }

      generatedPages.push(slots);
    }

    setPages(generatedPages);
    setCurrentPageIndex(0);
    setSelectedSlotIds(new Set());
    showToast(`Imposed ${peopleList.length} cards (${cardWidthMm}×${cardHeightMm} mm) across ${totalSheetsRequired} sheet${totalSheetsRequired > 1 ? 's' : ''}!`);
  }, [selectedIds, dbPeople, filteredPeople, paperWidthMm, paperHeightMm, cardWidthMm, cardHeightMm, gridRows, gridCols, showToast]);

  // Initial imposition setup on load
  useEffect(() => {
    if (pages.length === 1 && pages[0].length === 0 && dbPeople.length > 0) {
      generateImpositionPages('8-up-duplex');
    }
  }, [dbPeople, pages, generateImpositionPages]);

  // Render cards cache
  useEffect(() => {
    let isMounted = true;
    const renderAll = async () => {
      const cache = new Map<string, string>();
      const customTmpl = dbTemplates.find(t => String(t.id) === activeCardTemplateId || `custom-${t.id}` === activeCardTemplateId);

      const options: StudioCardOptions = {
        orientation: 'horizontal',
        backgroundColor: '#FFFFFF',
        fontFamily: 'Outfit',
        headerColor: '#1e3a8a',
        accentColor: '#84a92c',
        badgeColor: '#0f766e',
        cornerRadius: 12,
        showBorders: true,
        showPhoto: true,
        showQrCode: true,
        showBarcode: true,
        customTemplate: customTmpl,
      };

      for (let i = 0; i < dbPeople.length; i++) {
        const p = dbPeople[i];
        const pid = p.id ?? i;
        try {
          const frontUrl = await renderStudioCard(p, 'front', options);
          const backUrl = await renderStudioCard(p, 'back', options);
          cache.set(`${pid}-front-${activeCardTemplateId}`, frontUrl);
          cache.set(`${pid}-back-${activeCardTemplateId}`, backUrl);
        } catch (err) {
          console.error('Error rendering card:', err);
        }
      }

      if (isMounted) setRenderedCardMap(new Map(cache));
    };

    if (dbPeople.length > 0) renderAll();
    return () => { isMounted = false; };
  }, [dbPeople, dbTemplates, activeCardTemplateId]);

  // Sheet Management Handlers
  const handleAddBlankSheet = () => {
    setPages(prev => [...prev, []]);
    setCurrentPageIndex(pages.length);
    showToast(`Created Sheet ${pages.length + 1}`);
  };

  const handleDuplicateSheet = () => {
    const current = pages[currentPageIndex] || [];
    const cloned = current.map(s => ({
      ...s,
      id: `clone-${Date.now()}-${s.id}`,
    }));
    setPages(prev => [...prev, cloned]);
    setCurrentPageIndex(pages.length);
    showToast(`Duplicated Sheet to Sheet ${pages.length + 1}`);
  };

  const handleDeleteSheet = (index: number) => {
    if (pages.length <= 1) return;
    setPages(prev => prev.filter((_, i) => i !== index));
    setCurrentPageIndex(i => Math.max(0, i - 1));
    showToast(`Deleted Sheet ${index + 1}`);
  };

  // Toggle selection for a single person in roster
  const toggleSelectPerson = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle select all in roster
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPeople.length && filteredPeople.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPeople.map(p => p.id as number)));
    }
  };

  // Dragging & Slot Selection
  const [dragSlotId, setDragSlotId] = useState<string | null>(null);
  const [dragStartMm, setDragStartMm] = useState<{ xMm: number; yMm: number; startSlotX: number; startSlotY: number } | null>(null);

  const handleSlotMouseDown = (e: React.MouseEvent, slotId: string) => {
    e.stopPropagation();
    if (e.shiftKey) {
      setSelectedSlotIds(prev => {
        const next = new Set(prev);
        if (next.has(slotId)) next.delete(slotId);
        else next.add(slotId);
        return next;
      });
    } else {
      if (!selectedSlotIds.has(slotId)) {
        setSelectedSlotIds(new Set([slotId]));
      }
    }

    const slot = cardSlots.find(s => s.id === slotId);
    if (!slot) return;

    setDragSlotId(slotId);
    setDragStartMm({
      xMm: e.clientX / pxPerMm,
      yMm: e.clientY / pxPerMm,
      startSlotX: slot.xMm,
      startSlotY: slot.yMm,
    });
  };

  const handleSheetMouseDown = (e: React.MouseEvent) => {
    if (!paperSheetRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-card-slot="true"]')) return;

    if (!e.shiftKey) {
      setSelectedSlotIds(new Set());
    }

    const rect = paperSheetRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsMarqueeActive(true);
    setMarqueeStartPx({ x, y });
    setMarqueeCurrentPx({ x, y });
  };

  const handleSheetMouseMove = (e: React.MouseEvent) => {
    if (dragSlotId && dragStartMm) {
      const curX = e.clientX / pxPerMm;
      const curY = e.clientY / pxPerMm;
      const dx = curX - dragStartMm.xMm;
      const dy = curY - dragStartMm.yMm;

      let newX = dragStartMm.startSlotX + dx;
      let newY = dragStartMm.startSlotY + dy;

      if (snapGrid > 0) {
        newX = Math.round(newX / snapGrid) * snapGrid;
        newY = Math.round(newY / snapGrid) * snapGrid;
      }

      setCardSlots(prev =>
        prev.map(s => (s.id === dragSlotId ? { ...s, xMm: Math.max(0, newX), yMm: Math.max(0, newY) } : s))
      );
    } else if (isMarqueeActive && marqueeStartPx && paperSheetRef.current) {
      const rect = paperSheetRef.current.getBoundingClientRect();
      const curX = e.clientX - rect.left;
      const curY = e.clientY - rect.top;
      setMarqueeCurrentPx({ x: curX, y: curY });

      const x1 = Math.min(marqueeStartPx.x, curX);
      const x2 = Math.max(marqueeStartPx.x, curX);
      const y1 = Math.min(marqueeStartPx.y, curY);
      const y2 = Math.max(marqueeStartPx.y, curY);

      const matched = new Set<string>();
      cardSlots.forEach(slot => {
        const sx = slot.xMm * pxPerMm;
        const sy = slot.yMm * pxPerMm;
        const sw = slot.widthMm * pxPerMm;
        const sh = slot.heightMm * pxPerMm;

        if (sx + sw >= x1 && sx <= x2 && sy + sh >= y1 && sy <= y2) {
          matched.add(slot.id);
        }
      });
      setSelectedSlotIds(matched);
    }
  };

  const handleSheetMouseUp = () => {
    setDragSlotId(null);
    setDragStartMm(null);
    setIsMarqueeActive(false);
    setMarqueeStartPx(null);
    setMarqueeCurrentPx(null);
  };

  // Multi-select actions
  const handleRotateSelected = (deg: number = 90, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCardSlots(prev =>
      prev.map(s => (selectedSlotIds.has(s.id) ? { ...s, rotationDeg: ((s.rotationDeg || 0) + deg) % 360 } : s))
    );
    showToast(`Rotated ${selectedSlotIds.size} cards by ${deg}°`);
  };

  const handleToggleFaceSelected = () => {
    setCardSlots(prev =>
      prev.map(s => (selectedSlotIds.has(s.id) ? { ...s, face: s.face === 'front' ? 'back' : 'front' } : s))
    );
    showToast(`Flipped ${selectedSlotIds.size} cards`);
  };

  const handleDuplicateSelected = () => {
    const toClone = cardSlots.filter(s => selectedSlotIds.has(s.id));
    const newSlots = toClone.map(s => ({
      ...s,
      id: `slot-copy-${Date.now()}-${s.id}`,
      xMm: Math.min(paperWidthMm - s.widthMm, s.xMm + 5),
      yMm: Math.min(paperHeightMm - s.heightMm, s.yMm + 5),
    }));
    setCardSlots(prev => [...prev, ...newSlots]);
    setSelectedSlotIds(new Set(newSlots.map(s => s.id)));
    showToast(`Duplicated ${toClone.length} card slots`);
  };

  const handleDeleteSelected = () => {
    const count = selectedSlotIds.size;
    setCardSlots(prev => prev.filter(s => !selectedSlotIds.has(s.id)));
    setSelectedSlotIds(new Set());
    showToast(`Removed ${count} card slot${count > 1 ? 's' : ''}`);
  };

  // PDF Multi-Page Imposition Generator Export
  const handleExportPdf = async () => {
    if (pages.every(p => p.length === 0)) {
      showToast('No cards to export.');
      return;
    }

    setIsExporting(true);
    setExportProgress(10);
    setExportMessage('Preparing 300 DPI vector pages…');

    try {
      const allPlacedSheets: PlacedPaperCard[][] = [];

      for (let pIdx = 0; pIdx < pages.length; pIdx++) {
        setExportProgress(20 + Math.round((pIdx / pages.length) * 60));
        setExportMessage(`Rendering Sheet ${pIdx + 1} of ${pages.length}…`);

        const sheetSlots = pages[pIdx];
        const placed: PlacedPaperCard[] = [];

        for (const slot of sheetSlots) {
          const person = dbPeople.find(p => p.id === slot.personId) || dbPeople[0];
          if (!person) continue;

          const key = `${person.id}-${slot.face}-${activeCardTemplateId}`;
          const dataUrl = slot.customImageSrc || renderedCardMap.get(key) || await renderStudioCard(person, slot.face, {
            orientation: 'horizontal',
            backgroundColor: '#FFFFFF',
            fontFamily: 'Outfit',
            headerColor: '#1e3a8a',
            accentColor: '#84a92c',
            badgeColor: '#0f766e',
            cornerRadius: 12,
            showBorders: true,
            showPhoto: true,
            showQrCode: true,
            showBarcode: true,
          });

          placed.push({
            id: slot.id,
            name: `${person.fullName} (${slot.face})`,
            side: slot.face,
            png: dataUrl,
            xMm: slot.xMm,
            yMm: slot.yMm,
            widthMm: slot.widthMm,
            heightMm: slot.heightMm,
            rotationDeg: slot.rotationDeg || 0,
          });
        }
        allPlacedSheets.push(placed);
      }

      setExportProgress(90);
      setExportMessage('Compiling commercial 300 DPI PDF…');

      const pdfBytes = await generateCustomPaperPdf(
        allPlacedSheets,
        {
          paperName: paperFormat,
          widthMm: paperWidthMm,
          heightMm: paperHeightMm,
          orientation: paperOrientation,
          showCropMarks,
          showCenterGuide: showFoldGuide,
          showMetadata: true,
        }
      );

      downloadPdf(pdfBytes, `Batch_Imposition_${pages.length}_Sheets_300DPI.pdf`);
      showToast(`Exported ${pages.length}-Sheet 300 DPI PDF!`);
    } catch (err) {
      console.error(err);
      showToast('Error exporting PDF.');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setExportMessage('');
    }
  };

  return (
    <div
      className="flex h-screen font-sans antialiased overflow-hidden transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-root)', color: 'var(--text-primary)' }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        {/* ================= TOP HEADER (Desktop & Tablet Matching Image 3) ================= */}
        <header
          className="h-14 md:h-16 pl-14 pr-3 md:px-6 border-b flex items-center justify-between z-20 flex-shrink-0 gap-2"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          {/* Breadcrumb & Brand */}
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="p-1.5 md:p-2 rounded-xl border flex items-center justify-center text-[#84a92c] flex-shrink-0"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <Printer className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h1 className="text-xs md:text-sm font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
                Professional Paper Print Studio
              </h1>
              <p className="text-[10px] md:text-[11px] truncate hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                Multi-Page 300 DPI Imposition & Sheet Production
              </p>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Card Template Selector */}
            <div className="hidden md:flex items-center gap-1.5">
              <select
                value={activeCardTemplateId}
                onChange={e => setActiveCardTemplateId(e.target.value)}
                className="text-xs py-1.5 px-2.5 rounded-xl border font-bold focus:outline-none focus:border-[#84a92c] cursor-pointer"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              >
                <option value="student-academic">Template: School / Academic Pass</option>
                <option value="corporate-standard">Template: Corporate Standard</option>
                <option value="hightech-enclave">Template: High-Tech Security</option>
                <option value="healthcare-medic">Template: Healthcare & Medic</option>
                <option value="executive-gold">Template: Executive Gold</option>
                {dbTemplates.map(t => (
                  <option key={t.id} value={`custom-${t.id}`}>Custom: {t.name}</option>
                ))}
              </select>
            </div>

            {/* Standard Card Size Selector */}
            <div className="hidden lg:flex items-center gap-1.5">
              <select
                value={cardSizePreset}
                onChange={e => handleCardSizeChange(e.target.value as any)}
                className="text-xs py-1.5 px-2.5 rounded-xl border font-bold focus:outline-none focus:border-[#84a92c] cursor-pointer font-mono"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              >
                {CARD_SIZE_PRESETS.map(p => (
                  <option key={p.id} value={p.id}>
                    Size: {p.code} ({p.widthMm}×{p.heightMm}mm) {p.isDefault ? '— Standard Default' : ''}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => generateImpositionPages(impositionPreset)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer hover:border-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            >
              <Zap className="w-3.5 h-3.5 text-[#84a92c]" />
              <span>Impose to Paper</span>
            </button>

            <button
              onClick={() => setControlsSidebarOpen(o => !o)}
              className={`hidden lg:flex p-2 rounded-xl border transition-all cursor-pointer ${
                controlsSidebarOpen ? 'border-[#84a92c] text-[#84a92c]' : 'text-slate-400'
              }`}
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: controlsSidebarOpen ? '#84a92c' : 'var(--border-primary)' }}
              title="Toggle Card Dimensions & Imposition Inspector"
            >
              <Sliders className="w-4 h-4" />
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting}
              className="btn-primary py-1.5 md:py-2 px-2.5 md:px-4 text-[11px] md:text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export {pages.length > 1 ? `${pages.length} Pages ` : ''}300 DPI PDF</span>
              <span className="sm:hidden">PDF {pages.length > 1 ? `(${pages.length}P)` : ''}</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Tabs (Matching Image 2) */}
        <div
          className="flex lg:hidden items-center justify-between border-b px-3 py-2 flex-shrink-0 z-20 shadow-xs"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-400">
            <span>SIZE:</span>
            <span className="text-[#84a92c] uppercase">{cardSizePreset}</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setMobileActiveTab('roster')}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                mobileActiveTab === 'roster' ? 'bg-[#84a92c] text-slate-950 border-[#84a92c]' : 'text-slate-400 border-slate-700'
              }`}
            >
              Roster ({selectedIds.size > 0 ? selectedIds.size : filteredPeople.length})
            </button>
            <button
              onClick={() => setMobileActiveTab('artboard')}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                mobileActiveTab === 'artboard' ? 'bg-[#84a92c] text-slate-950 border-[#84a92c]' : 'text-slate-400 border-slate-700'
              }`}
            >
              Artboard ({cardSlots.length})
            </button>
            <button
              onClick={() => setMobileActiveTab('inspector')}
              className={`px-2.5 py-1 text-xs font-bold rounded-xl border cursor-pointer transition-all ${
                mobileActiveTab === 'inspector' ? 'bg-[#84a92c] text-slate-950 border-[#84a92c]' : 'text-slate-400 border-slate-700'
              }`}
            >
              Size & Specs
            </button>
          </div>
        </div>

        {/* ================= WORKSPACE (RESPONSIVE 3-COLUMN / TABLET / MOBILE) ================= */}
        <div className="flex-1 flex overflow-hidden relative pb-16 md:pb-0">
          {/* ================= COLUMN 1: BATCH ROSTER ================= */}
          {(rosterSidebarOpen || mobileActiveTab === 'roster') && (
            <aside
              className={`w-full lg:w-80 border-r flex flex-col p-3.5 space-y-3 flex-shrink-0 overflow-y-auto text-xs z-10 ${
                mobileActiveTab === 'roster' ? 'flex' : 'hidden lg:flex'
              }`}
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              <div>
                <label className="text-[10px] font-bold uppercase font-mono tracking-wider block mb-1 text-slate-400">
                  SOURCE FOLDER BATCH
                </label>
                <select
                  value={selectedFolder}
                  onChange={e => {
                    setSelectedFolder(e.target.value);
                    setSelectedIds(new Set());
                  }}
                  className="w-full text-xs py-2 px-3 rounded-xl border font-bold focus:outline-none focus:border-[#84a92c] cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="all">All Records ({dbPeople.length})</option>
                  {folders.map(f => (
                    <option key={f.name} value={f.name}>
                      {f.name} ({f.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Batch Imposition Engine Card (Matching Image 2) */}
              <div className="p-3 rounded-2xl bg-[#84a92c]/10 border border-[#84a92c]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#84a92c]">Batch Imposition Engine</span>
                  <span className="text-[10px] font-mono font-bold bg-[#84a92c]/20 px-1.5 py-0.5 rounded text-[#84a92c]">
                    {selectedIds.size > 0 ? `${selectedIds.size} in View` : `${filteredPeople.length} in View`}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Automatically spreads selected personnel across multiple sheets (4 duplex pairs/sheet).
                </p>
                <button
                  onClick={() => {
                    generateImpositionPages(impositionPreset);
                    if (window.innerWidth < 1024) setMobileActiveTab('artboard');
                  }}
                  className="w-full py-2 bg-[#198754] hover:bg-[#157347] text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Impose All ({selectedIds.size > 0 ? selectedIds.size : filteredPeople.length}) to Sheets</span>
                </button>
              </div>

              {/* Header with count & Select All */}
              <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                <span className="text-[11px] text-slate-400">
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : `${filteredPeople.length} personnel`}
                </span>
                <button
                  onClick={toggleSelectAll}
                  className="text-[11px] font-bold text-[#84a92c] hover:underline cursor-pointer"
                >
                  {selectedIds.size === filteredPeople.length && filteredPeople.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search personnel by name or ID..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c]"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Roster List with Circular Badges (Matching Image 2) */}
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {filteredPeople.map(p => {
                  const isChecked = p.id ? selectedIds.has(p.id) : false;
                  const initials = p.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

                  return (
                    <div
                      key={p.id}
                      onClick={() => p.id && toggleSelectPerson(p.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border cursor-pointer transition-all ${
                        isChecked ? 'border-[#84a92c] bg-[#84a92c]/10 font-bold' : 'border-transparent hover:border-slate-700 bg-slate-900/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 rounded accent-[#84a92c] cursor-pointer flex-shrink-0"
                      />

                      {/* Circular Avatar Badge (Matching Image 2) */}
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center font-bold text-xs text-white flex-shrink-0">
                        {p.photoDataUrl ? (
                          <img src={p.photoDataUrl} alt={p.fullName} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs truncate leading-tight text-white">{p.fullName}</p>
                        <p className="text-[10px] font-mono text-slate-400 truncate">ID: {p.idNumber}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Review & Imposition Button (Matching Image 2) */}
              <div className="block lg:hidden pt-2">
                <button
                  onClick={() => setMobileActiveTab('artboard')}
                  className="btn-primary w-full py-3 text-xs font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <span>Review & Imposition ({selectedIds.size > 0 ? selectedIds.size : filteredPeople.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </aside>
          )}

          {/* ================= COLUMN 2: PHYSICAL PAPER ARTBOARD ================= */}
          <main
            className={`flex-1 flex-col items-center justify-start overflow-auto p-3 md:p-6 pb-40 relative select-none ${
              mobileActiveTab === 'artboard' ? 'flex' : 'hidden lg:flex'
            }`}
            style={{ backgroundColor: 'var(--bg-root)' }}
            onMouseMove={handleSheetMouseMove}
            onMouseUp={handleSheetMouseUp}
          >
            {/* Sheet Pagination & Artboard Controls (Matching Image 2 & 3) */}
            <div className="w-full max-w-5xl flex items-center justify-between text-xs font-mono flex-wrap gap-2 mb-3 z-10">
              {/* Pagination */}
              <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-white/10 max-w-full overflow-x-auto">
                <span className="font-bold text-white text-[11px] whitespace-nowrap">
                  Sheet {currentPageIndex + 1} of {pages.length}
                </span>

                <button
                  onClick={() => setCurrentPageIndex(i => Math.max(0, i - 1))}
                  disabled={currentPageIndex === 0}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 cursor-pointer flex-shrink-0"
                  title="Previous Sheet"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <div className="flex items-center gap-1 max-w-[150px] sm:max-w-[280px] overflow-x-auto py-0.5">
                  {pages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPageIndex(idx)}
                      className={`w-6 h-6 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex-shrink-0 ${
                        currentPageIndex === idx ? 'bg-[#84a92c] text-slate-950 font-black' : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPageIndex(i => Math.min(pages.length - 1, i + 1))}
                  disabled={currentPageIndex === pages.length - 1}
                  className="p-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 cursor-pointer flex-shrink-0"
                  title="Next Sheet"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <div className="w-px h-3.5 bg-white/20 mx-0.5 flex-shrink-0" />

                <button
                  onClick={handleAddBlankSheet}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold cursor-pointer whitespace-nowrap flex-shrink-0"
                >
                  + Sheet
                </button>

                <button
                  onClick={handleDuplicateSheet}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] cursor-pointer whitespace-nowrap flex-shrink-0"
                >
                  Clone
                </button>

                {pages.length > 1 && (
                  <button
                    onClick={() => handleDeleteSheet(currentPageIndex)}
                    className="px-2 py-0.5 rounded-lg bg-red-500/20 text-red-400 text-[10px] cursor-pointer whitespace-nowrap flex-shrink-0"
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Multi-Select Action Bar */}
              {selectedSlotIds.size > 0 && (
                <div className="flex items-center gap-1 bg-[#84a92c]/20 border border-[#84a92c]/50 px-2.5 py-1 rounded-xl text-white">
                  <span className="font-bold text-xs text-[#84a92c] mr-1">
                    {selectedSlotIds.size} Selected
                  </span>
                  <button
                    onClick={() => handleRotateSelected(90)}
                    className="px-2 py-0.5 rounded bg-black/50 hover:bg-black/80 text-[10px] font-mono cursor-pointer flex items-center gap-1"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>Rotate</span>
                  </button>
                  <button
                    onClick={handleToggleFaceSelected}
                    className="px-2 py-0.5 rounded bg-black/50 hover:bg-black/80 text-[10px] font-mono cursor-pointer"
                  >
                    + Flip
                  </button>
                  <button
                    onClick={handleDuplicateSelected}
                    className="px-2 py-0.5 rounded bg-black/50 hover:bg-black/80 text-[10px] font-mono cursor-pointer flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Clone</span>
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-mono cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                </div>
              )}

              {/* Zoom & Snap */}
              <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 text-[11px]">
                <span>Snap:</span>
                <select
                  value={snapGrid}
                  onChange={e => setSnapGrid(Number(e.target.value))}
                  className="bg-transparent font-mono focus:outline-none cursor-pointer"
                >
                  <option value={1} className="bg-slate-900">1 mm</option>
                  <option value={5} className="bg-slate-900">5 mm</option>
                  <option value={0} className="bg-slate-900">Off</option>
                </select>

                <div className="w-px h-3 bg-slate-600 mx-1" />

                <button
                  onClick={() => setZoomScale(z => Math.max(0.35, Math.round((z - 0.1) * 100) / 100))}
                  className="px-1.5 py-0.5 rounded hover:bg-white/10 cursor-pointer font-bold"
                >
                  −
                </button>
                <span className="font-mono">{Math.round(zoomScale * 100)}%</span>
                <button
                  onClick={() => setZoomScale(z => Math.min(1.8, Math.round((z + 0.1) * 100) / 100))}
                  className="px-1.5 py-0.5 rounded hover:bg-white/10 cursor-pointer font-bold"
                >
                  +
                </button>
                <button
                  onClick={() => {
                    const availW = typeof window !== 'undefined' ? Math.min(window.innerWidth - 80, 800) : 700;
                    const fit = availW / (paperWidthMm * 3.6);
                    setZoomScale(Math.max(0.35, Math.min(1.1, Math.round(fit * 100) / 100)));
                  }}
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 cursor-pointer text-[10px] font-bold text-[#9fe870]"
                >
                  Fit
                </button>
              </div>
            </div>

            {/* Physical Paper Sheet Canvas Container (Matching Image 2 & 3) */}
            <div className="w-full flex items-center justify-center pb-24">
              <div
                ref={paperSheetRef}
                className="relative bg-white shadow-2xl transition-all duration-150 border border-slate-400 my-2 cursor-crosshair flex-shrink-0"
                style={{
                  width: `${sheetWidthPx}px`,
                  height: `${sheetHeightPx}px`,
                  boxShadow: '0 25px 60px -15px rgba(0,0,0,0.6)',
                }}
                onMouseDown={handleSheetMouseDown}
              >
                {/* Millimeter Grid Texture */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-10"
                  style={{
                    backgroundImage: `radial-gradient(circle, #000 1px, transparent 1px)`,
                    backgroundSize: `${10 * pxPerMm}px ${10 * pxPerMm}px`,
                  }}
                />

                {/* Center Fold / Cut Guideline on Duplex Sheet (Matching Image 2 Red Line) */}
                {showFoldGuide && impositionPreset === '8-up-duplex' && (
                  <div
                    className="absolute top-0 bottom-0 border-r-2 border-dashed border-red-500 pointer-events-none z-10"
                    style={{ left: `${sheetWidthPx / 2}px` }}
                  >
                    <span className="absolute top-2 -left-12 px-1.5 py-0.5 bg-red-600 text-white rounded text-[7px] font-mono font-bold shadow-xs">
                      CENTER CUT / FOLD
                    </span>
                  </div>
                )}

                {/* Marquee Selection Overlay */}
                {isMarqueeActive && marqueeStartPx && marqueeCurrentPx && (
                  <div
                    className="absolute border-2 border-[#84a92c] bg-[#84a92c]/20 pointer-events-none z-40 rounded-sm"
                    style={{
                      left: `${Math.min(marqueeStartPx.x, marqueeCurrentPx.x)}px`,
                      top: `${Math.min(marqueeStartPx.y, marqueeCurrentPx.y)}px`,
                      width: `${Math.abs(marqueeCurrentPx.x - marqueeStartPx.x)}px`,
                      height: `${Math.abs(marqueeCurrentPx.y - marqueeStartPx.y)}px`,
                    }}
                  />
                )}

                {/* Rendered Imposition Slots */}
                {cardSlots.map(slot => {
                  const isSelected = selectedSlotIds.has(slot.id);
                  const person = dbPeople.find(p => p.id === slot.personId) || dbPeople[slot.cardIndex % Math.max(1, dbPeople.length)] || dbPeople[0];
                  const pid = person?.id ?? (slot.cardIndex % Math.max(1, dbPeople.length));
                  const key = `${pid}-${slot.face}-${activeCardTemplateId}`;
                  const cardImg = slot.customImageSrc || renderedCardMap.get(key);

                  const slotXPx = slot.xMm * pxPerMm;
                  const slotYPx = slot.yMm * pxPerMm;
                  const slotWPx = slot.widthMm * pxPerMm;
                  const slotHPx = slot.heightMm * pxPerMm;
                  const rot = slot.rotationDeg || 0;

                  return (
                    <div
                      key={slot.id}
                      data-card-slot="true"
                      onMouseDown={e => handleSlotMouseDown(e, slot.id)}
                      className={`absolute group rounded-lg overflow-visible shadow-sm cursor-grab active:cursor-grabbing transition-all ${
                        isSelected
                          ? 'ring-3 ring-[#84a92c] z-20 shadow-xl'
                          : 'border border-slate-400 hover:border-[#84a92c]'
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
                      <div className="w-full h-full rounded-lg overflow-hidden bg-slate-100 relative">
                        {cardImg ? (
                          <img src={cardImg} alt="Card Face" className="w-full h-full object-cover pointer-events-none" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-slate-700 bg-slate-200">
                            <span className="font-bold text-[10px]">{person?.fullName}</span>
                            <span className="font-mono text-[9px] text-[#84a92c] uppercase">{slot.face} FACE</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Toast */}
            {toastMessage && (
              <div className="fixed bottom-16 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-950/90 text-white font-medium text-xs shadow-2xl border border-[#84a92c] flex items-center gap-2 animate-fade-in backdrop-blur-md">
                <CheckCircle2 className="w-4 h-4 text-[#84a92c]" />
                <span>{toastMessage}</span>
              </div>
            )}
          </main>

          {/* ================= COLUMN 3: CARD SIZE SPECIFICATIONS & IMPOSITION INSPECTOR ================= */}
          {(controlsSidebarOpen || mobileActiveTab === 'inspector') && (
            <aside
              className={`w-full lg:w-80 xl:w-88 border-l flex flex-col p-4 space-y-4 flex-shrink-0 overflow-y-auto text-xs z-10 ${
                mobileActiveTab === 'inspector' ? 'flex' : 'hidden lg:flex'
              }`}
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              {/* 1. CARD SIZE SPECIFICATIONS (CR80 Standard Default & Custom Dimensions) */}
              <div className="p-3.5 rounded-2xl border space-y-3" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                    <Ruler className="w-4 h-4 text-[#84a92c]" />
                    <span>Card Size Specifications</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-[#84a92c]/20 text-[#84a92c] px-2 py-0.5 rounded-md border border-[#84a92c]/30">
                    {cardSizePreset.toUpperCase()}
                  </span>
                </div>

                {/* Preset Selector Dropdown */}
                <div>
                  <label className="text-[10px] font-bold uppercase font-mono tracking-wider block mb-1 text-slate-400">
                    Standard Card Format / Preset
                  </label>
                  <select
                    value={cardSizePreset}
                    onChange={e => handleCardSizeChange(e.target.value as any)}
                    className="w-full text-xs py-2 px-3 rounded-xl border font-bold focus:outline-none focus:border-[#84a92c] cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-primary)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {CARD_SIZE_PRESETS.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.isDefault ? '— (Standard Default)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Preset Quick Buttons */}
                <div className="grid grid-cols-2 gap-1.5">
                  {CARD_SIZE_PRESETS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => handleCardSizeChange(p.id)}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all border cursor-pointer text-center truncate ${
                        cardSizePreset === p.id
                          ? 'bg-[#84a92c] text-slate-950 border-[#84a92c] shadow-xs'
                          : 'hover:border-[#84a92c]'
                      }`}
                      style={{
                        backgroundColor: cardSizePreset === p.id ? '#84a92c' : 'var(--bg-surface)',
                        borderColor: cardSizePreset === p.id ? '#84a92c' : 'var(--border-primary)',
                        color: cardSizePreset === p.id ? '#020617' : 'var(--text-primary)',
                      }}
                    >
                      {p.code} {p.id !== 'custom' ? `(${p.widthMm}×${p.heightMm})` : ''}
                    </button>
                  ))}
                </div>

                {/* Precision Width & Height Inputs */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <div>
                    <label className="text-[10px] font-bold uppercase font-mono tracking-wider block mb-1 text-slate-400">
                      Card Width (mm)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="30"
                        max="200"
                        value={cardWidthMm}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setCardWidthMm(val);
                          setCardSizePreset('custom');
                        }}
                        className="w-full pl-3 pr-8 py-1.5 text-xs font-mono font-bold rounded-xl border focus:outline-none focus:border-[#84a92c]"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-primary)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 pointer-events-none">
                        mm
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase font-mono tracking-wider block mb-1 text-slate-400">
                      Card Height (mm)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="30"
                        max="200"
                        value={cardHeightMm}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setCardHeightMm(val);
                          setCardSizePreset('custom');
                        }}
                        className="w-full pl-3 pr-8 py-1.5 text-xs font-mono font-bold rounded-xl border focus:outline-none focus:border-[#84a92c]"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-primary)',
                          color: 'var(--text-primary)',
                        }}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 pointer-events-none">
                        mm
                      </span>
                    </div>
                  </div>
                </div>

                {/* Real-time Dimensions Calculation Banner */}
                <div className="p-2 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                    <span>Dimensions (Inches):</span>
                    <span className="font-bold text-white">
                      {(cardWidthMm / 25.4).toFixed(3)}" × {(cardHeightMm / 25.4).toFixed(3)}"
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                    <span>300 DPI Resolution:</span>
                    <span className="font-bold text-[#84a92c]">
                      {Math.round((cardWidthMm / 25.4) * 300)} × {Math.round((cardHeightMm / 25.4) * 300)} px
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => generateImpositionPages(impositionPreset)}
                  className="w-full py-2 bg-[#84a92c] hover:bg-[#9fe870] text-slate-950 font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Apply Size & Re-Impose ({cardWidthMm}×{cardHeightMm} mm)</span>
                </button>
              </div>

              {/* 2. PAPER SHEET & IMPOSITION FORMAT */}
              <div className="p-3.5 rounded-2xl border space-y-3" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center gap-1.5 font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                  <Sliders className="w-4 h-4 text-[#84a92c]" />
                  <span>Paper & Imposition Layout</span>
                </div>

                {/* Paper Preset */}
                <div>
                  <label className="text-[10px] font-bold uppercase font-mono tracking-wider block mb-1 text-slate-400">
                    Physical Sheet Format
                  </label>
                  <select
                    value={paperFormat}
                    onChange={e => {
                      const fmt = e.target.value as 'Custom' | 'A4' | 'A3' | 'Letter' | 'Legal' | 'Tabloid';
                      setPaperFormat(fmt);
                      if (fmt === 'A4') { setPaperWidthMm(210); setPaperHeightMm(297); }
                      else if (fmt === 'A3') { setPaperWidthMm(297); setPaperHeightMm(420); }
                      else if (fmt === 'Letter') { setPaperWidthMm(215.9); setPaperHeightMm(279.4); }
                      else if (fmt === 'Legal') { setPaperWidthMm(215.9); setPaperHeightMm(355.6); }
                    }}
                    className="w-full text-xs py-2 px-3 rounded-xl border font-bold focus:outline-none focus:border-[#84a92c] cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-primary)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="A4">A4 Commercial (210 × 297 mm)</option>
                    <option value="A3">A3 Production (297 × 420 mm)</option>
                    <option value="Letter">US Letter (8.5" × 11")</option>
                    <option value="Legal">US Legal (8.5" × 14")</option>
                  </select>
                </div>

                {/* Imposition Layout Mode */}
                <div>
                  <label className="text-[10px] font-bold uppercase font-mono tracking-wider block mb-1 text-slate-400">
                    Imposition Mode
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => generateImpositionPages('8-up-duplex')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                        impositionPreset === '8-up-duplex'
                          ? 'bg-[#84a92c] text-slate-950 border-[#84a92c]'
                          : 'hover:border-[#84a92c]'
                      }`}
                      style={{
                        backgroundColor: impositionPreset === '8-up-duplex' ? '#84a92c' : 'var(--bg-surface)',
                        borderColor: impositionPreset === '8-up-duplex' ? '#84a92c' : 'var(--border-primary)',
                        color: impositionPreset === '8-up-duplex' ? '#020617' : 'var(--text-primary)',
                      }}
                    >
                      8-Up Duplex
                    </button>
                    <button
                      onClick={() => generateImpositionPages('8-up-fronts')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                        impositionPreset === '8-up-fronts'
                          ? 'bg-[#84a92c] text-slate-950 border-[#84a92c]'
                          : 'hover:border-[#84a92c]'
                      }`}
                      style={{
                        backgroundColor: impositionPreset === '8-up-fronts' ? '#84a92c' : 'var(--bg-surface)',
                        borderColor: impositionPreset === '8-up-fronts' ? '#84a92c' : 'var(--border-primary)',
                        color: impositionPreset === '8-up-fronts' ? '#020617' : 'var(--text-primary)',
                      }}
                    >
                      8-Up Fronts
                    </button>
                    <button
                      onClick={() => generateImpositionPages('10-up-fronts')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                        impositionPreset === '10-up-fronts'
                          ? 'bg-[#84a92c] text-slate-950 border-[#84a92c]'
                          : 'hover:border-[#84a92c]'
                      }`}
                      style={{
                        backgroundColor: impositionPreset === '10-up-fronts' ? '#84a92c' : 'var(--bg-surface)',
                        borderColor: impositionPreset === '10-up-fronts' ? '#84a92c' : 'var(--border-primary)',
                        color: impositionPreset === '10-up-fronts' ? '#020617' : 'var(--text-primary)',
                      }}
                    >
                      10-Up Fronts
                    </button>
                    <button
                      onClick={() => generateImpositionPages('custom')}
                      className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border cursor-pointer text-center ${
                        impositionPreset === 'custom'
                          ? 'bg-[#84a92c] text-slate-950 border-[#84a92c]'
                          : 'hover:border-[#84a92c]'
                      }`}
                      style={{
                        backgroundColor: impositionPreset === 'custom' ? '#84a92c' : 'var(--bg-surface)',
                        borderColor: impositionPreset === 'custom' ? '#84a92c' : 'var(--border-primary)',
                        color: impositionPreset === 'custom' ? '#020617' : 'var(--text-primary)',
                      }}
                    >
                      Custom Grid
                    </button>
                  </div>
                </div>

                {/* Guide Toggles */}
                <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-300">Show Crop / Trim Marks</span>
                    <input
                      type="checkbox"
                      checked={showCropMarks}
                      onChange={e => setShowCropMarks(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#84a92c]"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-300">Center Fold / Cut Axis</span>
                    <input
                      type="checkbox"
                      checked={showFoldGuide}
                      onChange={e => setShowFoldGuide(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#84a92c]"
                    />
                  </label>
                </div>
              </div>
            </aside>
          )}
        </div>

        {/* ================= MOBILE CONTEXTUAL BOTTOM TOOLBAR ================= */}
        <div
          className="flex lg:hidden fixed bottom-0 left-0 right-0 h-14 border-t z-50 items-center justify-around px-2 backdrop-blur-md"
          style={{ backgroundColor: 'rgba(11, 19, 27, 0.96)', borderColor: 'var(--border-primary)' }}
        >
          {/* 1. Roster Tool */}
          <button
            onClick={() => setMobileActiveTab('roster')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer relative ${
              mobileActiveTab === 'roster' ? 'text-[#84a92c]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span className="text-[9px] font-bold font-mono">Roster</span>
            <span className="absolute -top-1 right-0.5 px-1 py-0.2 bg-[#84a92c] text-slate-950 text-[8px] font-mono font-bold rounded-full">
              {selectedIds.size > 0 ? selectedIds.size : filteredPeople.length}
            </span>
          </button>

          {/* 2. Artboard Tool */}
          <button
            onClick={() => setMobileActiveTab('artboard')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              mobileActiveTab === 'artboard' ? 'text-[#84a92c]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="text-[9px] font-bold font-mono">Artboard</span>
          </button>

          {/* 3. Card Specs & Layout Tool */}
          <button
            onClick={() => setMobileActiveTab('inspector')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              mobileActiveTab === 'inspector' ? 'text-[#84a92c]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span className="text-[9px] font-bold font-mono">Specs</span>
          </button>

          {/* 4. Quick Impose Action */}
          <button
            onClick={() => {
              generateImpositionPages(impositionPreset);
              setMobileActiveTab('artboard');
              showToast('Imposed cards onto sheet layout!');
            }}
            className="flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span className="text-[9px] font-bold font-mono">Impose</span>
          </button>

          {/* 5. PDF Export Tool */}
          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex flex-col items-center justify-center gap-0.5 py-1 px-2.5 text-[#9fe870] font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-4 h-4" />
            <span className="text-[9px] font-bold font-mono">{isExporting ? 'Exporting…' : 'PDF'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
