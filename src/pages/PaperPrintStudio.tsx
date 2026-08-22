import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { usePeople, useTemplates } from '../db/hooks';
import type { Person, CardTemplate } from '../db/database';
import { generateCustomPaperPdf, downloadPdf, type PlacedPaperCard } from '../engine/exportPdf';
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

  // Dragging card slots on sheet
  const [draggedSlotId, setDraggedSlotId] = useState<string | null>(null);
  const [dragStartMouse, setDragStartMouse] = useState<{ x: number; y: number } | null>(null);
  const [initialSlotPositions, setInitialSlotPositions] = useState<Map<string, { x: number; y: number }>>(new Map());

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

  // Handle URL param ?personId=X
  useEffect(() => {
    const paramId = searchParams.get('personId');
    if (paramId && dbPeople.length > 0) {
      const pId = Number(paramId);
      const target = dbPeople.find(p => p.id === pId);
      if (target && target.id) {
        setSelectedIds(new Set([target.id]));
        showToast(`Selected ${target.fullName} from directory`);
      }
    }
  }, [searchParams, dbPeople, showToast]);

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

  // ================= SMART MULTI-PAGE IMPOSITION GENERATOR =================
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

    let capacityPerSheet = 4; // 8-up-duplex has 4 duplex pairs (4 people) per sheet
    if (preset === '8-up-fronts') capacityPerSheet = 8;
    else if (preset === '10-up-fronts') capacityPerSheet = 10;
    else if (preset === 'custom') capacityPerSheet = gridRows * gridCols;

    const totalSheetsRequired = Math.max(1, Math.ceil(peopleList.length / capacityPerSheet));
    const generatedPages: CardSlot[][] = [];

    const gapX = 8;
    const gapY = 6;
    const startX = Math.max(6, Math.round((paperWidthMm - (2 * cardW + gapX)) / 2));
    const startY = Math.max(8, Math.round((paperHeightMm - (4 * cardH + 3 * gapY)) / 2));

    for (let pageIdx = 0; pageIdx < totalSheetsRequired; pageIdx++) {
      const pagePeople = peopleList.slice(pageIdx * capacityPerSheet, (pageIdx + 1) * capacityPerSheet);
      const slots: CardSlot[] = [];

      if (preset === '8-up-duplex') {
        // 4 rows, 2 columns per sheet (Col 1 = Front, Col 2 = Back)
        for (let r = 0; r < 4; r++) {
          const person = pagePeople[r];
          if (!person && pageIdx > 0 && r >= pagePeople.length) break; // Don't add blank rows on trailing pages

          const pId = person ? person.id : peopleList[r % peopleList.length]?.id;
          const y = startY + r * (cardH + gapY);

          // Col 1 (Front Face)
          slots.push({
            id: `p${pageIdx}-slot-${r}-front`,
            cardIndex: pageIdx * 8 + r * 2,
            face: 'front',
            xMm: startX,
            yMm: y,
            widthMm: cardW,
            heightMm: cardH,
            rotationDeg: 0,
            personId: pId,
          });

          // Col 2 (Back Face)
          slots.push({
            id: `p${pageIdx}-slot-${r}-back`,
            cardIndex: pageIdx * 8 + r * 2 + 1,
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
        let idx = 0;
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 2; c++) {
            if (idx >= pagePeople.length && pageIdx > 0) break;
            const p = pagePeople[idx] || peopleList[idx % peopleList.length];
            slots.push({
              id: `p${pageIdx}-slot-front-${idx}`,
              cardIndex: pageIdx * 8 + idx,
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
        const sX = 12;
        const sY = 10;
        const gX = 6;
        const gY = 3;
        let idx = 0;
        for (let r = 0; r < 5; r++) {
          for (let c = 0; c < 2; c++) {
            if (idx >= pagePeople.length && pageIdx > 0) break;
            const p = pagePeople[idx] || peopleList[idx % peopleList.length];
            slots.push({
              id: `p${pageIdx}-slot-10-${idx}`,
              cardIndex: pageIdx * 10 + idx,
              face: 'front',
              xMm: sX + c * (cardW + gX),
              yMm: sY + r * (cardH + gY),
              widthMm: cardW,
              heightMm: cardH,
              rotationDeg: 0,
              personId: p?.id,
            });
            idx++;
          }
        }
      } else {
        // Custom Grid Layout
        let idx = 0;
        for (let r = 0; r < gridRows; r++) {
          for (let c = 0; c < gridCols; c++) {
            if (idx >= pagePeople.length && pageIdx > 0) break;
            const p = pagePeople[idx] || peopleList[idx % peopleList.length];
            slots.push({
              id: `p${pageIdx}-slot-grid-${r}-${c}-${Date.now()}`,
              cardIndex: pageIdx * (gridRows * gridCols) + idx,
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
      }

      generatedPages.push(slots.length > 0 ? slots : [
        {
          id: `p${pageIdx}-slot-custom-0`,
          cardIndex: 0,
          face: 'front',
          xMm: Math.max(10, Math.round((paperWidthMm - cardW) / 2)),
          yMm: Math.max(10, Math.round((paperHeightMm - cardH) / 2)),
          widthMm: cardW,
          heightMm: cardH,
          rotationDeg: 0,
          personId: peopleList[0]?.id,
        }
      ]);
    }

    setPages(generatedPages);
    setCurrentPageIndex(0);
    setSelectedSlotIds(new Set(generatedPages[0]?.[0]?.id ? [generatedPages[0][0].id] : []));
    showToast(`✨ Generated ${totalSheetsRequired} Sheet(s) for ${peopleList.length} Personnel (${preset})`);
  }, [cardW, cardH, dbPeople, filteredPeople, gridCols, gridGapX, gridGapY, gridMarginX, gridMarginY, gridRows, paperHeightMm, paperWidthMm, selectedIds, showToast]);

  // Initial imposition on load
  useEffect(() => {
    if (dbPeople.length > 0 && pages[0]?.length === 0) {
      generateImpositionPages('8-up-duplex');
    }
  }, [dbPeople.length, generateImpositionPages, pages]);

  // Pre-render 300 DPI Cards for all slots across all sheets
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

      // Gather all slots from all pages
      const allSlots: CardSlot[] = [];
      pages.forEach(pSlots => allSlots.push(...pSlots));

      for (const slot of allSlots) {
        if (isCancelled) break;
        const person = dbPeople.find(p => p.id === slot.personId) || dbPeople[0];
        if (person) {
          const key = `${person.id}-${slot.face}-${activeCardTemplateId}`;
          if (!map.has(key)) {
            try {
              const dataUrl = await renderStudioCard(person, slot.face, cardOptions);
              map.set(key, dataUrl);
            } catch {
              // Fallback handled inside renderStudioCard
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
  }, [pages, dbPeople, activeTemplate, activeCardTemplateId, cardW, cardH]);

  // Selected Slot details (first selected)
  const selectedSlot = useMemo(() => {
    return cardSlots.find(s => s.id === selectedSlotId) || null;
  }, [cardSlots, selectedSlotId]);

  // Update selected slot helper
  const updateSelectedSlot = (updates: Partial<CardSlot>) => {
    if (selectedSlotIds.size === 0) return;
    setCardSlots(prev => prev.map(s => selectedSlotIds.has(s.id) ? { ...s, ...updates } : s));
  };

  // Dimensions in pixel space on screen
  const pxPerMm = 3.6 * zoomScale;
  const sheetWidthPx = paperWidthMm * pxPerMm;
  const sheetHeightPx = paperHeightMm * pxPerMm;

  // ================= MARQUEE & DRAG HANDLERS =================
  const handleSheetMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left click
    const target = e.target as HTMLElement;
    // If clicking directly on a slot or its buttons, slot handler will handle it
    if (target.closest('[data-card-slot="true"]')) return;

    if (!paperSheetRef.current) return;
    const rect = paperSheetRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsMarqueeActive(true);
    setMarqueeStartPx({ x, y });
    setMarqueeCurrentPx({ x, y });

    if (!e.shiftKey) {
      setSelectedSlotIds(new Set());
    }
  };

  const handleSlotMouseDown = (e: React.MouseEvent, slotId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const isAlreadySelected = selectedSlotIds.has(slotId);
    let newSelected = new Set(selectedSlotIds);

    if (e.shiftKey) {
      if (newSelected.has(slotId)) newSelected.delete(slotId);
      else newSelected.add(slotId);
    } else {
      if (!isAlreadySelected) {
        newSelected = new Set([slotId]);
      }
    }
    setSelectedSlotIds(newSelected);

    // Initialize multi-drag for all selected slots
    setDraggedSlotId(slotId);
    setDragStartMouse({ x: e.clientX, y: e.clientY });

    const posMap = new Map<string, { x: number; y: number }>();
    cardSlots.forEach(s => {
      if (newSelected.has(s.id)) {
        posMap.set(s.id, { x: s.xMm, y: s.yMm });
      }
    });
    setInitialSlotPositions(posMap);
  };

  const handleSheetMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // 1. If Dragging Slot(s)
    if (draggedSlotId && dragStartMouse) {
      const deltaX = (e.clientX - dragStartMouse.x) / pxPerMm;
      const deltaY = (e.clientY - dragStartMouse.y) / pxPerMm;

      setCardSlots(prev => prev.map(s => {
        const init = initialSlotPositions.get(s.id);
        if (!init) return s;

        let rawX = init.x + deltaX;
        let rawY = init.y + deltaY;

        if (snapGrid > 0) {
          rawX = Math.round(rawX / snapGrid) * snapGrid;
          rawY = Math.round(rawY / snapGrid) * snapGrid;
        }

        const boundedX = Math.max(0, Math.min(paperWidthMm - s.widthMm, rawX));
        const boundedY = Math.max(0, Math.min(paperHeightMm - s.heightMm, rawY));

        return {
          ...s,
          xMm: Math.round(boundedX * 10) / 10,
          yMm: Math.round(boundedY * 10) / 10,
        };
      }));
      return;
    }

    // 2. If Marquee Selecting
    if (isMarqueeActive && marqueeStartPx && paperSheetRef.current) {
      const rect = paperSheetRef.current.getBoundingClientRect();
      const currX = e.clientX - rect.left;
      const currY = e.clientY - rect.top;
      setMarqueeCurrentPx({ x: currX, y: currY });

      const minX = Math.min(marqueeStartPx.x, currX);
      const maxX = Math.max(marqueeStartPx.x, currX);
      const minY = Math.min(marqueeStartPx.y, currY);
      const maxY = Math.max(marqueeStartPx.y, currY);

      // Find intersecting slots
      const intersecting = new Set<string>(e.shiftKey ? selectedSlotIds : []);
      cardSlots.forEach(slot => {
        const slotLeft = slot.xMm * pxPerMm;
        const slotTop = slot.yMm * pxPerMm;
        const slotRight = slotLeft + slot.widthMm * pxPerMm;
        const slotBottom = slotTop + slot.heightMm * pxPerMm;

        // Bounding box collision test
        const overlaps = !(slotRight < minX || slotLeft > maxX || slotBottom < minY || slotTop > maxY);
        if (overlaps) {
          intersecting.add(slot.id);
        }
      });
      setSelectedSlotIds(intersecting);
    }
  };

  const handleSheetMouseUp = () => {
    setIsMarqueeActive(false);
    setMarqueeStartPx(null);
    setMarqueeCurrentPx(null);
    setDraggedSlotId(null);
    setDragStartMouse(null);
    setInitialSlotPositions(new Map());
  };

  // ================= SLOT MANAGEMENT ACTIONS =================
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
    setSelectedSlotIds(new Set([newSlot.id]));
    setImpositionPreset('custom');
    showToast('Added new card slot to current sheet');
  };

  const handleDuplicateSelected = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedSlotIds.size === 0) return;

    const duplicates: CardSlot[] = [];
    const newSelectedIds = new Set<string>();

    cardSlots.forEach(s => {
      if (selectedSlotIds.has(s.id)) {
        const dup: CardSlot = {
          ...s,
          id: `slot-dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          xMm: Math.min(paperWidthMm - s.widthMm, s.xMm + 10),
          yMm: Math.min(paperHeightMm - s.heightMm, s.yMm + 10),
        };
        duplicates.push(dup);
        newSelectedIds.add(dup.id);
      }
    });

    setCardSlots(prev => [...prev, ...duplicates]);
    setSelectedSlotIds(newSelectedIds);
    setImpositionPreset('custom');
    showToast(`Duplicated ${duplicates.length} card slot(s)`);
  };

  const handleDeleteSelected = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedSlotIds.size === 0) return;

    const count = selectedSlotIds.size;
    setCardSlots(prev => prev.filter(s => !selectedSlotIds.has(s.id)));
    setSelectedSlotIds(new Set());
    showToast(`Deleted ${count} card slot(s)`);
  };

  const handleRotateSelected = (deltaDeg: number = 90, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedSlotIds.size === 0) return;

    setCardSlots(prev => prev.map(s => {
      if (selectedSlotIds.has(s.id)) {
        const nextRot = ((s.rotationDeg || 0) + deltaDeg) % 360;
        return { ...s, rotationDeg: nextRot };
      }
      return s;
    }));
    showToast(`Rotated selected cards by ${deltaDeg}°`);
  };

  const handleToggleFaceSelected = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (selectedSlotIds.size === 0) return;

    setCardSlots(prev => prev.map(s => {
      if (selectedSlotIds.has(s.id)) {
        return { ...s, face: s.face === 'front' ? 'back' : 'front' };
      }
      return s;
    }));
    showToast(`Flipped card faces (Front ↔ Back)`);
  };

  // ================= SHEET (PAGE) MANAGEMENT =================
  const handleAddBlankSheet = () => {
    setPages(prev => {
      const next = [...prev, []];
      setCurrentPageIndex(next.length - 1);
      return next;
    });
    setSelectedSlotIds(new Set());
    showToast(`Added Sheet ${pages.length + 1}`);
  };

  const handleDuplicateSheet = () => {
    const current = pages[currentPageIndex] || [];
    const cloned = current.map(s => ({
      ...s,
      id: `p${pages.length}-${s.id}-${Date.now()}`,
    }));
    setPages(prev => {
      const next = [...prev, cloned];
      setCurrentPageIndex(next.length - 1);
      return next;
    });
    showToast(`Duplicated current sheet as Sheet ${pages.length + 1}`);
  };

  const handleDeleteSheet = (pageIdx: number) => {
    if (pages.length <= 1) {
      setPages([[]]);
      setCurrentPageIndex(0);
      setSelectedSlotIds(new Set());
      showToast('Cleared sheet contents');
      return;
    }
    setPages(prev => prev.filter((_, idx) => idx !== pageIdx));
    setCurrentPageIndex(prev => Math.min(prev, pages.length - 2));
    setSelectedSlotIds(new Set());
    showToast(`Deleted Sheet ${pageIdx + 1}`);
  };

  // ================= CLIPBOARD & KEYBOARD SHORTCUTS =================
  const handleCopy = useCallback(() => {
    if (selectedSlotIds.size === 0) return;
    const toCopy = cardSlots.filter(s => selectedSlotIds.has(s.id));
    setClipboardSlots(toCopy);
    showToast(`📋 Copied ${toCopy.length} card(s) to clipboard`);
  }, [cardSlots, selectedSlotIds, showToast]);

  const handlePaste = useCallback(() => {
    if (clipboardSlots.length === 0) return;
    const newSlots = clipboardSlots.map(s => ({
      ...s,
      id: `slot-paste-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      xMm: Math.min(paperWidthMm - s.widthMm, s.xMm + 10),
      yMm: Math.min(paperHeightMm - s.heightMm, s.yMm + 10),
    }));
    setCardSlots(prev => [...prev, ...newSlots]);
    setSelectedSlotIds(new Set(newSlots.map(s => s.id)));
    showToast(`📋 Pasted ${newSlots.length} card(s)`);
  }, [clipboardSlots, paperWidthMm, paperHeightMm, setCardSlots, showToast]);

  // Keyboard Shortcuts (Delete, Duplicate, Copy, Paste, Nudge)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedSlotIds.size > 0) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleCopy();
      } else if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handlePaste();
      } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleDuplicateSelected();
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedSlotIds.size === 0) return;
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        setCardSlots(prev => prev.map(s => {
          if (!selectedSlotIds.has(s.id)) return s;
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
  }, [selectedSlotIds, paperWidthMm, paperHeightMm, handleCopy, handlePaste]);

  // System Clipboard Paste Event (Images)
  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              const newSlot: CardSlot = {
                id: `slot-img-${Date.now()}`,
                cardIndex: cardSlots.length,
                face: 'front',
                xMm: 20,
                yMm: 20,
                widthMm: cardW,
                heightMm: cardH,
                customImageSrc: dataUrl,
              };
              setCardSlots(prev => [...prev, newSlot]);
              setSelectedSlotIds(new Set([newSlot.id]));
              showToast('📷 Image pasted directly from clipboard onto sheet!');
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [cardSlots.length, cardW, cardH, setCardSlots, showToast]);

  // Direct Image Drag and Drop onto Sheet
  const handleDropFile = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const newSlot: CardSlot = {
            id: `slot-img-drop-${Date.now()}`,
            cardIndex: cardSlots.length,
            face: 'front',
            xMm: 20,
            yMm: 20,
            widthMm: cardW,
            heightMm: cardH,
            customImageSrc: dataUrl,
          };
          setCardSlots(prev => [...prev, newSlot]);
          setSelectedSlotIds(new Set([newSlot.id]));
          showToast(`📥 Placed ${file.name} onto sheet`);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // ================= MULTI-PAGE 300 DPI PDF GENERATOR =================
  const handleExportPdf = async () => {
    setIsExporting(true);
    setExportProgress(10);
    setExportMessage('Preparing multi-page vector imposition engine…');

    try {
      const allPagesPlaced: PlacedPaperCard[][] = [];
      const totalPages = pages.length;

      for (let pIdx = 0; pIdx < totalPages; pIdx++) {
        setExportProgress(Math.round(10 + (pIdx / totalPages) * 75));
        setExportMessage(`Rendering 300 DPI cards for Sheet ${pIdx + 1} of ${totalPages}…`);

        const pSlots = pages[pIdx] || [];
        const placedCardsOnThisPage: PlacedPaperCard[] = [];

        for (const s of pSlots) {
          const person = dbPeople.find(p => p.id === s.personId) || dbPeople[0];
          const key = `${person?.id}-${s.face}-${activeCardTemplateId}`;
          let imgDataUrl = s.customImageSrc || renderedCards.get(key) || '';

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
            placedCardsOnThisPage.push({
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

        allPagesPlaced.push(placedCardsOnThisPage);
      }

      const totalCardsPlaced = allPagesPlaced.reduce((acc, p) => acc + p.length, 0);
      if (totalCardsPlaced === 0) {
        setIsExporting(false);
        setExportProgress(0);
        alert('No cards are currently placed on any paper sheet. Please add personnel or card slots.');
        return;
      }

      setExportProgress(90);
      setExportMessage('Assembling 300 DPI vector PDF document…');

      const pdfBlob = await generateCustomPaperPdf(
        allPagesPlaced,
        {
          paperName: `${paperFormat} Multi-Sheet Imposition`,
          widthMm: paperWidthMm,
          heightMm: paperHeightMm,
          orientation: paperOrientation,
          showCropMarks,
          showCenterGuide: showFoldGuide,
          showMetadata: true,
        }
      );

      setExportProgress(100);
      setExportMessage('Downloading print PDF…');
      downloadPdf(pdfBlob, `SiliconLabs_${paperFormat}_${totalPages}Pages_300DPI_Imposition.pdf`);
      showToast(`🎉 Exported ${totalPages}-page 300 DPI PDF (${totalCardsPlaced} cards)!`);
    } catch (err) {
      console.error('Export PDF error:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      alert(`Failed to generate 300 DPI PDF.\n\nError: ${errorMsg}`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
      setExportMessage('');
    }
  };

  // Toggle Selection in Roster
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
                Multi-Page 300 DPI Imposition • Box Selection & Freeform Layout Engine
              </p>
            </div>
          </div>

          {/* Quick Presets, Pagination & Export Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Imposition Presets */}
            <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
              {(['8-up-duplex', '8-up-fronts', '10-up-fronts', 'custom'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => generateImpositionPages(p)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    impositionPreset === p ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
                  }`}
                  style={{
                    color: impositionPreset === p ? '#ffffff' : 'var(--text-secondary)',
                  }}
                >
                  {p === '8-up-duplex' ? '8-Up Duplex (4 Pairs)' : p === '8-up-fronts' ? '8 Fronts' : p === '10-up-fronts' ? '10-Up' : 'Freeform'}
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
              📁 Roster ({selectedIds.size > 0 ? selectedIds.size : filteredPeople.length})
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
                  <span>{exportProgress}% • {exportMessage || 'Generating…'}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  <span>Export {pages.length > 1 ? `${pages.length} Pages ` : ''}300 DPI PDF</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Mobile Navigation Tabs */}
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
            📄 Sheet {currentPageIndex + 1}/{pages.length} ({cardSlots.length})
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

          {/* COLUMN 1: BATCH ROSTER & IMPOSITION ACTION (COLLAPSIBLE / RESPONSIVE) */}
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

              {/* Roster Multi-Page Imposition Action Button */}
              <div className="p-2.5 rounded-2xl bg-[#84a92c]/10 border border-[#84a92c]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#84a92c]">Batch Imposition Engine</span>
                  <span className="text-[10px] font-mono font-bold bg-[#84a92c]/20 px-1.5 py-0.5 rounded">
                    {selectedIds.size > 0 ? `${selectedIds.size} Selected` : `${filteredPeople.length} in View`}
                  </span>
                </div>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Automatically spreads selected personnel across multiple sheets (e.g. 4 duplex pairs/sheet $\rightarrow$ 8 items = 2 sheets, 10 items = 3 sheets).
                </p>
                <button
                  onClick={() => generateImpositionPages(impositionPreset)}
                  className="w-full py-2 bg-[#198754] hover:bg-[#157347] text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>⚡ Impose {selectedIds.size > 0 ? `${selectedIds.size} Selected` : `All (${filteredPeople.length})`} to Sheets</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {selectedIds.size > 0 ? `${selectedIds.size} of ${filteredPeople.length} checked` : `${filteredPeople.length} personnel`}
                </span>
                <button
                  onClick={toggleSelectAll}
                  className="text-[10px] font-bold text-[#84a92c] hover:underline cursor-pointer"
                >
                  {selectedIds.size === filteredPeople.length && filteredPeople.length > 0 ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search personnel by name or ID..."
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

          {/* COLUMN 2: CENTER PHYSICAL PAPER SHEET ARTBOARD & PAGINATION */}
          <main
            className={`flex-1 flex-col items-center justify-start overflow-auto p-4 md:p-8 relative select-none ${
              mobileActiveTab === 'artboard' ? 'flex' : 'hidden lg:flex'
            }`}
            style={{ backgroundColor: 'var(--bg-root)' }}
            onMouseMove={handleSheetMouseMove}
            onMouseUp={handleSheetMouseUp}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDropFile}
          >
            {/* Sheet Ruler Info & Floating Artboard Toolbar */}
            <div className="w-full max-w-5xl flex items-center justify-between text-[11px] font-mono flex-wrap gap-2 mb-4 z-10" style={{ color: 'var(--text-muted)' }}>
              
              {/* Pagination & Sheet Switcher */}
              <div className="flex items-center gap-2 flex-wrap bg-black/40 backdrop-blur-xs px-3 py-1.5 rounded-2xl border border-white/10">
                <span className="font-bold text-white text-xs">
                  Sheet {currentPageIndex + 1} of {pages.length}
                </span>

                <button
                  onClick={() => setCurrentPageIndex(i => Math.max(0, i - 1))}
                  disabled={currentPageIndex === 0}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold cursor-pointer"
                  title="Previous Sheet"
                >
                  ◀ Prev
                </button>

                <div className="flex items-center gap-1">
                  {pages.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentPageIndex(idx)}
                      className={`w-6 h-6 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        currentPageIndex === idx ? 'bg-[#84a92c] text-slate-900 shadow-xs' : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPageIndex(i => Math.min(pages.length - 1, i + 1))}
                  disabled={currentPageIndex === pages.length - 1}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold cursor-pointer"
                  title="Next Sheet"
                >
                  Next ▶
                </button>

                <div className="w-px h-3.5 bg-white/20 mx-0.5" />

                <button
                  onClick={handleAddBlankSheet}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold cursor-pointer"
                  title="Add Blank Sheet"
                >
                  + Sheet
                </button>

                <button
                  onClick={handleDuplicateSheet}
                  className="px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] cursor-pointer"
                  title="Duplicate Active Sheet"
                >
                  Clone
                </button>

                {pages.length > 1 && (
                  <button
                    onClick={() => handleDeleteSheet(currentPageIndex)}
                    className="px-2 py-0.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-[10px] cursor-pointer"
                    title="Delete Active Sheet"
                  >
                    ✕ Del
                  </button>
                )}
              </div>

              {/* Multi-Select Quick Actions Bar */}
              {selectedSlotIds.size > 0 && (
                <div className="flex items-center gap-1 bg-[#84a92c]/20 border border-[#84a92c]/50 px-2.5 py-1 rounded-xl text-slate-100 font-sans">
                  <span className="font-bold text-xs text-[#84a92c] mr-1">
                    {selectedSlotIds.size} Selected
                  </span>
                  <button
                    onClick={() => handleRotateSelected(90)}
                    className="px-1.5 py-0.5 rounded bg-black/40 hover:bg-black/60 text-[10px] font-mono cursor-pointer"
                    title="Rotate Selected 90°"
                  >
                    🔄 Rotate
                  </button>
                  <button
                    onClick={handleToggleFaceSelected}
                    className="px-1.5 py-0.5 rounded bg-black/40 hover:bg-black/60 text-[10px] font-mono cursor-pointer"
                    title="Flip Front/Back"
                  >
                    Flip
                  </button>
                  <button
                    onClick={handleDuplicateSelected}
                    className="px-1.5 py-0.5 rounded bg-black/40 hover:bg-black/60 text-[10px] font-mono cursor-pointer"
                    title="Duplicate Selected"
                  >
                    + Clone
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-mono cursor-pointer"
                    title="Delete Selected"
                  >
                    ✕ Del
                  </button>
                </div>
              )}

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
                  onClick={() => setZoomScale(z => Math.max(0.35, Math.round((z - 0.1) * 100) / 100))}
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
                  onClick={() => {
                    const availW = typeof window !== 'undefined' ? Math.min(window.innerWidth - 80, 800) : 700;
                    const fit = availW / (paperWidthMm * 3.6);
                    setZoomScale(Math.max(0.35, Math.min(1.1, Math.round(fit * 100) / 100)));
                  }}
                  className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 cursor-pointer text-[10px] font-bold text-[#9fe870]"
                  title="Auto-Fit Sheet to Viewport"
                >
                  Fit
                </button>
              </div>
            </div>

            {/* Physical Paper Sheet Canvas Container with ample bottom clearance */}
            <div className="w-full flex items-center justify-center pb-32">
              <div
                ref={paperSheetRef}
                className="relative bg-white shadow-2xl transition-all duration-150 border border-slate-400 my-4 cursor-crosshair flex-shrink-0"
                style={{
                  width: `${sheetWidthPx}px`,
                  height: `${sheetHeightPx}px`,
                  boxShadow: '0 25px 60px -15px rgba(0,0,0,0.6)',
                }}
                onMouseDown={handleSheetMouseDown}
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

              {/* Visual Marquee / Box Selection Overlay */}
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

              {/* Rendered Imposition Slots for the Active Sheet */}
              {cardSlots.map(slot => {
                const isSelected = selectedSlotIds.has(slot.id);
                const person = dbPeople.find(p => p.id === slot.personId) || dbPeople[0];
                const key = `${person?.id}-${slot.face}-${activeCardTemplateId}`;
                const cardImg = slot.customImageSrc || renderedCards.get(key);

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
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedSlotIds(new Set([slot.id]));
                            handleRotateSelected(90, e);
                          }}
                          className="px-1 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[8px] cursor-pointer"
                          title="Rotate 90°"
                        >
                          🔄 90°
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedSlotIds(new Set([slot.id]));
                            handleToggleFaceSelected(e);
                          }}
                          className="px-1 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[8px] cursor-pointer"
                          title="Flip Face (Front/Back)"
                        >
                          Flip
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedSlotIds(new Set([slot.id]));
                            handleDuplicateSelected(e);
                          }}
                          className="px-1 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-[8px] cursor-pointer"
                          title="Duplicate"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedSlotIds(new Set([slot.id]));
                            handleDeleteSelected(e);
                          }}
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
            </div>

            {/* Floating Toast Notification */}
            {toastMessage && (
              <div className="fixed bottom-16 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-950/90 text-white font-medium text-xs shadow-2xl border border-[#84a92c] flex items-center gap-2 animate-fade-in backdrop-blur-md">
                <span>{toastMessage}</span>
              </div>
            )}
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
                    <span className="font-bold text-xs text-[#84a92c]">
                      {selectedSlotIds.size > 1 ? `${selectedSlotIds.size} Cards Selected` : 'Selected Card Slot'}
                    </span>
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
                      onClick={() => handleRotateSelected(90)}
                      className="flex-1 py-1 px-2 rounded-lg border text-[11px] font-bold hover:opacity-80 cursor-pointer text-center"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                    >
                      Rotate 90° ({selectedSlot.rotationDeg || 0}°)
                    </button>
                    <button
                      onClick={handleToggleFaceSelected}
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
                  onClick={() => generateImpositionPages('custom')}
                  className="w-full py-1.5 rounded-xl border text-xs font-bold hover:border-[#84a92c] transition-colors cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                >
                  Apply {gridRows}×{gridCols} Grid Layout ({gridRows * gridCols} Slots/Sheet)
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
                  Ready for commercial digital presses and guillotine cutting ({pages.length} Sheet{pages.length > 1 ? 's' : ''}).
                </p>
                <button
                  onClick={handleExportPdf}
                  disabled={isExporting}
                  className="btn-primary w-full py-2.5 text-xs font-bold cursor-pointer shadow-xs"
                >
                  {isExporting ? 'Generating Multi-Page PDF…' : `Download ${pages.length > 1 ? `${pages.length}-Page ` : ''}Print PDF`}
                </button>
              </div>
            </aside>
          )}
        </div>

        {/* Mobile Bottom Navigation Bar (<1024px) */}
        <div
          className="flex lg:hidden fixed bottom-0 left-0 right-0 h-14 border-t z-50 items-center justify-around px-2 backdrop-blur-md"
          style={{ backgroundColor: 'rgba(11, 19, 27, 0.95)', borderColor: 'var(--border-primary)' }}
        >
          <button
            onClick={() => setMobileActiveTab('roster')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              mobileActiveTab === 'roster' ? 'text-[#84a92c]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            <span className="text-[9px] font-bold font-mono">Roster</span>
          </button>

          <button
            onClick={() => setMobileActiveTab('artboard')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              mobileActiveTab === 'artboard' ? 'text-[#84a92c]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span className="text-[9px] font-bold font-mono">Sheet ({cardSlots.length})</span>
          </button>

          <button
            onClick={() => setMobileActiveTab('inspector')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl transition-all cursor-pointer ${
              mobileActiveTab === 'inspector' ? 'text-[#84a92c]' : 'text-slate-400 hover:text-white'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
            </svg>
            <span className="text-[9px] font-bold font-mono">Settings</span>
          </button>

          <button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 rounded-xl text-[#9fe870] font-bold cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span className="text-[9px] font-bold font-mono">Export PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
