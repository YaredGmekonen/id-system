import { useState, useCallback, useEffect, useRef, useMemo, startTransition } from 'react';
import Sidebar from '../components/layout/Sidebar';
import CardCanvas from '../components/designer/CardCanvas';
import Toolbar from '../components/designer/Toolbar';
import PropertyPanel from '../components/designer/PropertyPanel';
import LayerPanel from '../components/designer/LayerPanel';
import TemplateList from '../components/designer/TemplateList';
import CanvaMobileBar from '../components/designer/CanvaMobileBar';
import CanvaTopToolbar from '../components/designer/CanvaTopToolbar';
import CanvaDrawingDock, { type DrawingBrushState } from '../components/designer/CanvaDrawingDock';
import ImportAnalysisModal from '../components/designer/ImportAnalysisModal';
import FigmaImportModal from '../components/designer/FigmaImportModal';
import CardMockupModal from '../components/studio/CardMockupModal';
import { addTemplate, updateTemplate } from '../db/hooks';
import type { CanvasElement, CardTemplate } from '../db/database';
import { CARD } from '../design-tokens';
import { validateDesignFile, getFileCategory } from '../engine/smartFileDeconstructor';
import {
  Sparkles,
  Copy,
  Layers,
  AlignLeft,
  AlignCenter,
  AlignRight,
  FlipHorizontal,
  FlipVertical,
  Trash2,
  X,
  RotateCw,
  Sliders,
  BookmarkPlus,
  ClipboardCopy,
  ClipboardPaste,
  PenTool,
  Grid3X3,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';

export default function Designer() {
  // Template state
  const [templateName, setTemplateName] = useState('Standard CR80 Template');
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [frontElements, setFrontElements] = useState<CanvasElement[]>([]);
  const [backElements, setBackElements] = useState<CanvasElement[]>([]);
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [backBgColor, setBackBgColor] = useState('#F8FAFC');
  const [cardWidth, setCardWidth] = useState<number>(CARD.WIDTH_PX);
  const [cardHeight, setCardHeight] = useState<number>(CARD.HEIGHT_PX);

  // Smart Design Importer state (multi-format .ai, .eps, .svg, .indd, .fig, .psd, .png, etc.)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isFigmaModalOpen, setIsFigmaModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreviewUrl, setImportPreviewUrl] = useState<string>('');
  const [isMockupModalOpen, setIsMockupModalOpen] = useState(false);

  // UI state
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [dimensionPreset, setDimensionPreset] = useState<string>('cr80-landscape');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const [containerWidth, setContainerWidth] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));
  useEffect(() => {
    const handleResize = () => setContainerWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const responsiveScale = useMemo(() => {
    if (containerWidth < 640) {
      return Math.max(0.28, Math.min(0.65, (containerWidth - 32) / cardWidth));
    } else if (containerWidth < 1024) {
      return Math.max(0.38, Math.min(0.65, (containerWidth - 64) / cardWidth));
    }
    return 0.65;
  }, [containerWidth, cardWidth]);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => setToastMessage(null), 2000);
  }, []);

  const currentElements = activeSide === 'front' ? frontElements : backElements;
  const setCurrentElements = activeSide === 'front' ? setFrontElements : setBackElements;
  const currentBgColor = activeSide === 'front' ? bgColor : backBgColor;

  const selectedElement = currentElements.find(el => el.id === selectedId) || null;

  // Selection handler (single or multi)
  const handleSelect = useCallback((id: string | null, multi: boolean = false) => {
    if (!id) {
      setSelectedId(null);
      setSelectedIds([]);
      return;
    }
    if (multi) {
      setSelectedIds(prev => {
        const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
        setSelectedId(next.length > 0 ? next[next.length - 1] : null);
        return next;
      });
    } else {
      setSelectedId(id);
      setSelectedIds([id]);
    }
  }, []);

  // ===== FREEHAND DRAWING & GRID STATES =====
  const [brushState, setBrushState] = useState<DrawingBrushState>({
    tool: 'select',
    color: '#000000',
    weight: 12,
    opacity: 1,
    isActive: false,
  });
  const [isDrawingDockOpen, setIsDrawingDockOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  // ===== UNDO/REDO SYSTEM =====
  const MAX_HISTORY = 50;
  const [undoStack, setUndoStack] = useState<CanvasElement[][]>([]);
  const [redoStack, setRedoStack] = useState<CanvasElement[][]>([]);
  // ===== UNIVERSAL CROSS-CARD CLIPBOARD & DUPLICATE =====
  const [clipboard, setClipboard] = useState<CanvasElement[]>(() => {
    try {
      const saved = localStorage.getItem('siliconlabs_card_clipboard');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const pushUndo = useCallback(() => {
    setUndoStack(prev => [...prev.slice(-(MAX_HISTORY - 1)), [...currentElements]]);
    setRedoStack([]);
  }, [currentElements]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack(r => [...r, [...currentElements]]);
    setUndoStack(u => u.slice(0, -1));
    setCurrentElements(prev);
    setSelectedId(null);
    setSelectedIds([]);
    showToast('Undo applied');
  }, [undoStack, currentElements, setCurrentElements, showToast]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, [...currentElements]]);
    setRedoStack(r => r.slice(0, -1));
    setCurrentElements(next);
    setSelectedId(null);
    setSelectedIds([]);
    showToast('Redo applied');
  }, [redoStack, currentElements, setCurrentElements, showToast]);

  const handleCopy = useCallback(() => {
    const toCopy = selectedIds.length > 0
      ? currentElements.filter(el => selectedIds.includes(el.id))
      : (selectedElement ? [selectedElement] : []);

    if (toCopy.length === 0) return;

    setClipboard(toCopy);
    try {
      localStorage.setItem('siliconlabs_card_clipboard', JSON.stringify(toCopy));
    } catch (e) {
      console.warn('Failed to save to localStorage clipboard:', e);
    }
    showToast(`Copied ${toCopy.length} element(s) to clipboard`);
  }, [selectedIds, selectedElement, currentElements, showToast]);

  const handleCut = useCallback(() => {
    const toCut = selectedIds.length > 0
      ? currentElements.filter(el => selectedIds.includes(el.id))
      : (selectedElement ? [selectedElement] : []);

    if (toCut.length === 0) return;

    pushUndo();
    setClipboard(toCut);
    try {
      localStorage.setItem('siliconlabs_card_clipboard', JSON.stringify(toCut));
    } catch (e) {
      console.warn('Failed to save to localStorage clipboard:', e);
    }
    const cutIds = toCut.map(el => el.id);
    setCurrentElements(prev => prev.filter(el => !cutIds.includes(el.id)));
    setSelectedId(null);
    setSelectedIds([]);
    showToast(`Cut ${toCut.length} element(s)`);
  }, [selectedIds, selectedElement, currentElements, pushUndo, setCurrentElements, showToast]);

  const handlePaste = useCallback(() => {
    let itemsToPaste = clipboard;
    if (itemsToPaste.length === 0) {
      try {
        const saved = localStorage.getItem('siliconlabs_card_clipboard');
        if (saved) itemsToPaste = JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to read from localStorage clipboard:', e);
      }
    }

    if (itemsToPaste.length === 0) {
      showToast('Clipboard is empty');
      return;
    }

    pushUndo();

    const newElements: CanvasElement[] = itemsToPaste.map((item, idx) => ({
      ...item,
      id: `paste-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      x: item.x + 20,
      y: item.y + 20,
      name: `${item.name || item.type} (copy)`,
    }));

    setCurrentElements(prev => [...prev, ...newElements]);
    setSelectedId(newElements[newElements.length - 1].id);
    setSelectedIds(newElements.map(e => e.id));
    showToast(`Pasted ${newElements.length} element(s)`);
  }, [clipboard, setCurrentElements, pushUndo, showToast]);

  const handleDuplicate = useCallback(() => {
    const toDuplicate = selectedIds.length > 0
      ? currentElements.filter(el => selectedIds.includes(el.id))
      : (selectedElement ? [selectedElement] : []);

    if (toDuplicate.length === 0) return;

    pushUndo();

    const newElements: CanvasElement[] = toDuplicate.map((item, idx) => ({
      ...item,
      id: `dup-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      x: item.x + 15,
      y: item.y + 15,
      name: `${item.name || item.type} (dup)`,
    }));

    setCurrentElements(prev => [...prev, ...newElements]);
    setSelectedId(newElements[newElements.length - 1].id);
    setSelectedIds(newElements.map(e => e.id));
    showToast(`Duplicated ${newElements.length} element(s)`);
  }, [selectedIds, selectedElement, currentElements, setCurrentElements, pushUndo, showToast]);

  // Save selected element(s) to Saved Library
  const handleSaveToLibrary = useCallback(() => {
    const toSave = selectedIds.length > 0
      ? currentElements.filter(el => selectedIds.includes(el.id))
      : (selectedElement ? [selectedElement] : []);

    if (toSave.length === 0) return;

    try {
      const existingRaw = localStorage.getItem('siliconlabs_saved_elements');
      const existing: Array<{ id: string; name: string; elements: CanvasElement[]; date: string }> = existingRaw ? JSON.parse(existingRaw) : [];
      
      const presetName = prompt('Enter a name for this saved component:', toSave[0].name || 'Custom Component');
      if (!presetName) return;

      existing.unshift({
        id: `lib-${Date.now()}`,
        name: presetName,
        elements: toSave,
        date: new Date().toLocaleDateString(),
      });

      localStorage.setItem('siliconlabs_saved_elements', JSON.stringify(existing.slice(0, 50)));
      showToast(`Saved "${presetName}" to Component Library!`);
    } catch (e) {
      console.warn('Failed to save to component library:', e);
    }
  }, [selectedIds, selectedElement, currentElements, showToast]);

  // Apply Figma Template
  const handleApplyFigmaTemplate = useCallback((result: {
    templateName: string;
    cardWidth: number;
    cardHeight: number;
    backgroundColor: string;
    elements: CanvasElement[];
  }) => {
    pushUndo();
    setTemplateName(result.templateName || 'Figma Imported Template');
    setCardWidth(result.cardWidth);
    setCardHeight(result.cardHeight);
    setBgColor(result.backgroundColor || '#FFFFFF');
    setFrontElements(result.elements);
    setActiveSide('front');
    setSelectedId(null);
    setSelectedIds([]);
    showToast(`Successfully loaded ${result.elements.length} vector layer(s) from Figma!`);
  }, [pushUndo, showToast]);

  // ===== GROUP / UNGROUP =====
  const handleGroup = useCallback(() => {
    if (selectedIds.length < 2) return;
    pushUndo();
    const toGroup = currentElements.filter(el => selectedIds.includes(el.id));
    const minX = Math.min(...toGroup.map(el => el.x));
    const minY = Math.min(...toGroup.map(el => el.y));
    const maxX = Math.max(...toGroup.map(el => el.x + (el.width || 50)));
    const maxY = Math.max(...toGroup.map(el => el.y + (el.height || 50)));

    const groupElement: CanvasElement = {
      id: `group-${Date.now()}`,
      type: 'group',
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      children: toGroup,
      name: `Group (${toGroup.length} items)`,
      visible: true,
      locked: false,
    };

    const remaining = currentElements.filter(el => !selectedIds.includes(el.id));
    setCurrentElements([...remaining, groupElement]);
    setSelectedId(groupElement.id);
    setSelectedIds([groupElement.id]);
  }, [selectedIds, currentElements, setCurrentElements, pushUndo]);

  const handleUngroup = useCallback(() => {
    if (!selectedElement || selectedElement.type !== 'group' || !selectedElement.children) return;
    pushUndo();
    const remaining = currentElements.filter(el => el.id !== selectedElement.id);
    setCurrentElements([...remaining, ...selectedElement.children]);
    setSelectedId(null);
    setSelectedIds([]);
  }, [selectedElement, currentElements, setCurrentElements, pushUndo]);

  // ===== ALIGN / DISTRIBUTE =====
  const handleAlign = useCallback((type: 'left' | 'center-h' | 'right' | 'top' | 'middle-v' | 'bottom' | 'dist-h' | 'dist-v') => {
    if (selectedIds.length < 2) return;
    pushUndo();
    const selected = currentElements.filter(el => selectedIds.includes(el.id));
    const minX = Math.min(...selected.map(el => el.x));
    const maxX = Math.max(...selected.map(el => el.x + (el.width || 50)));
    const minY = Math.min(...selected.map(el => el.y));
    const maxY = Math.max(...selected.map(el => el.y + (el.height || 50)));

    const updated = currentElements.map(el => {
      if (!selectedIds.includes(el.id)) return el;
      const w = el.width || 50;
      const h = el.height || 50;

      switch (type) {
        case 'left': return { ...el, x: minX };
        case 'center-h': return { ...el, x: minX + (maxX - minX) / 2 - w / 2 };
        case 'right': return { ...el, x: maxX - w };
        case 'top': return { ...el, y: minY };
        case 'middle-v': return { ...el, y: minY + (maxY - minY) / 2 - h / 2 };
        case 'bottom': return { ...el, y: maxY - h };
        default: return el;
      }
    });

    if (type === 'dist-h') {
      const sorted = [...selected].sort((a, b) => a.x - b.x);
      const totalWidths = sorted.reduce((sum, item) => sum + (item.width || 50), 0);
      const gap = (maxX - minX - totalWidths) / (sorted.length - 1);
      let curX = minX;
      sorted.forEach((item, idx) => {
        const target = updated.find(x => x.id === item.id);
        if (target) target.x = curX;
        curX += (item.width || 50) + gap;
      });
    } else if (type === 'dist-v') {
      const sorted = [...selected].sort((a, b) => a.y - b.y);
      const totalHeights = sorted.reduce((sum, item) => sum + (item.height || 50), 0);
      const gap = (maxY - minY - totalHeights) / (sorted.length - 1);
      let curY = minY;
      sorted.forEach((item, idx) => {
        const target = updated.find(x => x.id === item.id);
        if (target) target.y = curY;
        curY += (item.height || 50) + gap;
      });
    }

    setCurrentElements(updated);
  }, [selectedIds, currentElements, setCurrentElements, pushUndo]);

  // ===== LAYER REORDERING (BRING FORWARD / SEND BACKWARD / TO FRONT / TO BACK) =====
  const handleBringForward = useCallback(() => {
    if (!selectedId) return;
    pushUndo();
    setCurrentElements(prev => {
      const idx = prev.findIndex(el => el.id === selectedId);
      if (idx < 0 || idx === prev.length - 1) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(idx + 1, 0, item);
      return next;
    });
  }, [selectedId, setCurrentElements, pushUndo]);

  const handleSendBackward = useCallback(() => {
    if (!selectedId) return;
    pushUndo();
    setCurrentElements(prev => {
      const idx = prev.findIndex(el => el.id === selectedId);
      if (idx <= 0) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.splice(idx - 1, 0, item);
      return next;
    });
  }, [selectedId, setCurrentElements, pushUndo]);

  const handleBringToFront = useCallback(() => {
    if (!selectedId) return;
    pushUndo();
    setCurrentElements(prev => {
      const idx = prev.findIndex(el => el.id === selectedId);
      if (idx < 0 || idx === prev.length - 1) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.push(item);
      return next;
    });
  }, [selectedId, setCurrentElements, pushUndo]);

  const handleSendToBack = useCallback(() => {
    if (!selectedId) return;
    pushUndo();
    setCurrentElements(prev => {
      const idx = prev.findIndex(el => el.id === selectedId);
      if (idx <= 0) return prev;
      const next = [...prev];
      const [item] = next.splice(idx, 1);
      next.unshift(item);
      return next;
    });
  }, [selectedId, setCurrentElements, pushUndo]);


  // Global Keyboard Shortcuts (Delete, Backspace, Ctrl+Z, Ctrl+Y, Ctrl+D, Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Delete / Backspace: Delete selected elements
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const idsToDelete = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
        if (idsToDelete.length > 0) {
          e.preventDefault();
          pushUndo();
          setCurrentElements(prev => prev.filter(el => !idsToDelete.includes(el.id)));
          setSelectedId(null);
          setSelectedIds([]);
          showToast(`Deleted ${idsToDelete.length} item${idsToDelete.length > 1 ? 's' : ''}`);
        }
        return;
      }

      // Ctrl+Z: Undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }

      // Ctrl+Y or Ctrl+Shift+Z: Redo
      if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Ctrl+D: Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleDuplicate();
        return;
      }

      // Escape: Deselect
      if (e.key === 'Escape') {
        setSelectedId(null);
        setSelectedIds([]);
        return;
      }

      // Arrow Keys: Nudge selected elements
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const activeSelection = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
        if (activeSelection.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
          setCurrentElements(prev => prev.map(el => {
            if (activeSelection.includes(el.id)) {
              return { ...el, x: el.x + dx, y: el.y + dy };
            }
            return el;
          }));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId, selectedIds, currentElements, setCurrentElements, pushUndo, handleUndo, handleRedo, handleDuplicate, showToast]);

  // ===== DIMENSION PRESET CHANGER =====
  const handleDimensionChange = (preset: string) => {
    setDimensionPreset(preset);
    if (preset === 'cr80-landscape') {
      setCardWidth(CARD.WIDTH_PX);
      setCardHeight(CARD.HEIGHT_PX);
    } else if (preset === 'cr80-portrait') {
      setCardWidth(CARD.HEIGHT_PX);
      setCardHeight(CARD.WIDTH_PX);
    } else if (preset === 'cr79') {
      setCardWidth(992);
      setCardHeight(614);
    } else if (preset === 'cr90') {
      setCardWidth(1087);
      setCardHeight(709);
    } else if (preset === 'cr100') {
      setCardWidth(1163);
      setCardHeight(791);
    } else if (preset === 'square') {
      setCardWidth(638);
      setCardHeight(638);
    }
  };

  // ===== SMART DESIGN IMPORT (Canva, AI, SVG, Figma, PSD, PDF, PNG, JPG) =====
  const handleSmartImportFile = (file: File) => {
    try {
      validateDesignFile(file);
    } catch (err: any) {
      showToast(err?.message || "This file type isn't supported yet. Try PNG, JPG, SVG, or PSD.");
      return;
    }

    setImportFile(file);
    const category = getFileCategory(file);

    if (category === 'raster' || category === 'svg') {
      const reader = new FileReader();
      reader.onload = () => {
        setImportPreviewUrl(reader.result as string);
        setIsImportModalOpen(true);
      };
      reader.onerror = () => {
        showToast(`Failed to read file "${file.name}"`);
      };
      reader.readAsDataURL(file);
    } else {
      // For PSD and AI, the modal deconstructor extracts layers/composite directly
      setImportPreviewUrl('');
      setIsImportModalOpen(true);
    }
  };

  const handleApplyImportedLayers = (layers: CanvasElement[]) => {
    if (layers.length === 0) return;
    pushUndo();
    setCurrentElements(prev => [...prev, ...layers]);
    setSelectedIds(layers.map(l => l.id));
    setSelectedId(layers[layers.length - 1].id);
    showToast(`Imported ${layers.length} design layers with dynamic data binding!`);
  };

  // ===== MIRROR / REFLECT ACTIONS =====
  const handleMirrorH = useCallback(() => {
    if (!selectedId && selectedIds.length === 0) return;
    pushUndo();
    const targetIds = selectedIds.length > 0 ? selectedIds : [selectedId!];
    setCurrentElements(prev =>
      prev.map(el => (targetIds.includes(el.id) ? { ...el, flipX: !el.flipX } : el))
    );
    showToast('Mirrored element(s) horizontally');
  }, [selectedId, selectedIds, pushUndo, setCurrentElements, showToast]);

  const handleMirrorV = useCallback(() => {
    if (!selectedId && selectedIds.length === 0) return;
    pushUndo();
    const targetIds = selectedIds.length > 0 ? selectedIds : [selectedId!];
    setCurrentElements(prev =>
      prev.map(el => (targetIds.includes(el.id) ? { ...el, flipY: !el.flipY } : el))
    );
    showToast('Mirrored element(s) vertically');
  }, [selectedId, selectedIds, pushUndo, setCurrentElements, showToast]);

  // ===== KEYBOARD SHORTCUTS =====
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (ctrl && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        handleRedo();
      } else if (ctrl && e.key === 'x') {
        e.preventDefault();
        handleCut();
      } else if (ctrl && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      } else if (ctrl && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      } else if (ctrl && e.key === 'd') {
        e.preventDefault();
        handleDuplicate();
      } else if (ctrl && (e.key === 'h' || e.key === 'H') && !e.shiftKey) {
        e.preventDefault();
        handleMirrorH();
      } else if (ctrl && e.shiftKey && (e.key === 'V' || e.key === 'v')) {
        e.preventDefault();
        handleMirrorV();
      } else if (ctrl && e.key === '[') {
        e.preventDefault();
        pushUndo();
        const targetIds = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
        setCurrentElements(prev =>
          prev.map(el => (targetIds.includes(el.id) ? { ...el, rotation: ((el.rotation || 0) - 15 + 360) % 360 } : el))
        );
        showToast('Rotated -15°');
      } else if (ctrl && e.key === ']') {
        e.preventDefault();
        pushUndo();
        const targetIds = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
        setCurrentElements(prev =>
          prev.map(el => (targetIds.includes(el.id) ? { ...el, rotation: ((el.rotation || 0) + 15) % 360 } : el))
        );
        showToast('Rotated +15°');
      } else if (ctrl && e.key === 'g' && !e.shiftKey) {
        e.preventDefault();
        handleGroup();
      } else if (ctrl && e.shiftKey && (e.key === 'G' || e.key === 'g')) {
        e.preventDefault();
        handleUngroup();
      } else if (ctrl && e.key === 'a') {
        e.preventDefault();
        setSelectedIds(currentElements.map(el => el.id));
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && (selectedId || selectedIds.length > 0)) {
        e.preventDefault();
        pushUndo();
        const toDelete = selectedIds.length > 0 ? selectedIds : [selectedId!];
        setCurrentElements(prev => prev.filter(el => !toDelete.includes(el.id)));
        setSelectedId(null);
        setSelectedIds([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleCut, handleCopy, handlePaste, handleDuplicate, handleGroup, handleUngroup, handleMirrorH, handleMirrorV, selectedId, selectedIds, currentElements, pushUndo, setCurrentElements, showToast]);

  // System Clipboard Paste Event (Images directly from OS clipboard / screenshot)
  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              const newImgElement: CanvasElement = {
                id: `img-clipboard-${Date.now()}`,
                type: 'image',
                x: 60,
                y: 60,
                width: 160,
                height: 160,
                src: dataUrl,
                opacity: 1,
                visible: true,
                locked: false,
                name: `Pasted Image (${new Date().toLocaleTimeString()})`,
              };
              pushUndo();
              setCurrentElements(prev => [...prev, newImgElement]);
              setSelectedId(newImgElement.id);
              setSelectedIds([newImgElement.id]);
              showToast('Image pasted directly from clipboard onto canvas!');
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [pushUndo, setCurrentElements, showToast]);

  // Add element (with undo snapshot and non-blocking concurrent transition)
  const handleAddElement = useCallback((element: CanvasElement) => {
    pushUndo();
    startTransition(() => {
      setCurrentElements(prev => [...prev, element]);
      setSelectedId(element.id);
      setSelectedIds([element.id]);
    });
  }, [setCurrentElements, pushUndo]);

  // Update element
  const handleElementUpdate = useCallback((id: string, changes: Partial<CanvasElement>) => {
    setCurrentElements(prev =>
      prev.map(el => (el.id === id ? { ...el, ...changes } : el))
    );
  }, [setCurrentElements]);

  // Delete element
  const handleDeleteElement = useCallback((id: string) => {
    setCurrentElements(prev => prev.filter(el => el.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedIds([]);
    }
  }, [setCurrentElements, selectedId]);

  // Reorder layers
  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setCurrentElements(prev => {
      const arr = [...prev];
      const [item] = arr.splice(fromIndex, 1);
      arr.splice(toIndex, 0, item);
      return arr;
    });
  }, [setCurrentElements]);

  // Toggle visibility
  const handleToggleVisibility = useCallback((id: string) => {
    setCurrentElements(prev =>
      prev.map(el => (el.id === id ? { ...el, visible: el.visible === false ? true : false } : el))
    );
  }, [setCurrentElements]);

  // Toggle lock
  const handleToggleLock = useCallback((id: string) => {
    setCurrentElements(prev =>
      prev.map(el => (el.id === id ? { ...el, locked: !el.locked } : el))
    );
  }, [setCurrentElements]);

  // Duplicate a single layer by ID
  const handleDuplicateLayer = useCallback((id: string) => {
    const el = currentElements.find(e => e.id === id);
    if (!el) return;
    pushUndo();
    const newEl: CanvasElement = {
      ...el,
      id: `dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      x: el.x + 15,
      y: el.y + 15,
      name: `${el.name || el.type} (dup)`,
    };
    setCurrentElements(prev => [...prev, newEl]);
    setSelectedId(newEl.id);
    setSelectedIds([newEl.id]);
    showToast(`Duplicated "${el.name || el.type}"`);
  }, [currentElements, setCurrentElements, pushUndo, showToast]);

  // Rename a layer by ID
  const handleRenameLayer = useCallback((id: string, newName: string) => {
    setCurrentElements(prev =>
      prev.map(el => (el.id === id ? { ...el, name: newName } : el))
    );
  }, [setCurrentElements]);

  // Save template
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const templateData = {
        name: templateName || 'Untitled Template',
        frontElements,
        backElements,
        backgroundColor: bgColor,
        backBackgroundColor: backBgColor,
        orientation: cardWidth < cardHeight ? ('vertical' as const) : ('horizontal' as const),
        widthPx: cardWidth,
        heightPx: cardHeight,
        widthMm: Math.round((cardWidth / 300) * 25.4 * 10) / 10,
        heightMm: Math.round((cardHeight / 300) * 25.4 * 10) / 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (editingTemplateId) {
        await updateTemplate(editingTemplateId, templateData);
      } else {
        const id = await addTemplate(templateData);
        setEditingTemplateId(id);
      }
      showToast(`Template "${templateName}" saved successfully!`);
    } finally {
      setSaving(false);
    }
  }, [templateName, frontElements, backElements, bgColor, backBgColor, cardWidth, cardHeight, editingTemplateId]);

  // Load template
  const handleSelectTemplate = useCallback((template: CardTemplate) => {
    setEditingTemplateId(template.id ?? null);
    setTemplateName(template.name);
    setFrontElements(template.frontElements);
    setBackElements(template.backElements);
    setBgColor(template.backgroundColor);
    setBackBgColor(template.backBackgroundColor);
    if (template.widthPx && template.heightPx) {
      setCardWidth(template.widthPx);
      setCardHeight(template.heightPx);
      setDimensionPreset('custom');
    } else {
      const isVert = template.orientation === 'vertical';
      setCardWidth(isVert ? CARD.HEIGHT_PX : CARD.WIDTH_PX);
      setCardHeight(isVert ? CARD.WIDTH_PX : CARD.HEIGHT_PX);
      setDimensionPreset(isVert ? 'cr80-portrait' : 'cr80-landscape');
    }
    setActiveSide('front');
    setSelectedId(null);
    setSelectedIds([]);
  }, []);

  // New template
  const handleNewTemplate = useCallback(() => {
    setEditingTemplateId(null);
    setTemplateName('New Card Template');
    setFrontElements([]);
    setBackElements([]);
    setBgColor('#FFFFFF');
    setBackBgColor('#F8FAFC');
    setCardWidth(CARD.WIDTH_PX);
    setCardHeight(CARD.HEIGHT_PX);
    setDimensionPreset('cr80-landscape');
    setActiveSide('front');
    setSelectedId(null);
    setSelectedIds([]);
  }, []);

  // Load Built-in Starter Template
  const handleLoadStarter = (type: 'corporate' | 'student' | 'security') => {
    if (type === 'corporate') {
      setTemplateName('Corporate CR80 Executive');
      setBgColor('#FFFFFF');
      setBackBgColor('#F8FAFC');
      setFrontElements([
        { id: 'b1', type: 'rect', x: 0, y: 0, width: CARD.WIDTH_PX, height: 80, fill: '#0b131b', name: 'Header' },
        { id: 't1', type: 'text', x: 20, y: 24, text: 'SILICONLABS TECH PLC', fontSize: 18, fontStyle: 'bold', fill: '#FFFFFF', name: 'Company Title' },
        { id: 'p1', type: 'photo', x: 30, y: 110, width: 160, height: 200, dataField: '{{photo}}', name: 'Photo Frame' },
        { id: 'n1', type: 'dataField', x: 220, y: 120, text: '{{full_name}}', dataField: '{{full_name}}', fontSize: 24, fontStyle: 'bold', fill: '#0f172a', name: 'Name Tag' },
        { id: 'r1', type: 'dataField', x: 220, y: 160, text: '{{role}}', dataField: '{{role}}', fontSize: 16, fontStyle: 'bold', fill: '#10b981', name: 'Role Tag' },
        { id: 'id1', type: 'dataField', x: 220, y: 200, text: 'ID: {{id_number}}', dataField: 'ID: {{id_number}}', fontSize: 14, fontStyle: 'bold', fill: '#334155', name: 'ID Field' },
        { id: 'dept1', type: 'dataField', x: 220, y: 230, text: 'Dept: {{department}}', dataField: 'Dept: {{department}}', fontSize: 14, fill: '#475569', name: 'Dept Field' },
        { id: 'qr1', type: 'qr', x: 500, y: 120, width: 110, height: 110, qrPayload: '{{id_number}}', name: 'ID QR Matrix' },
        { id: 'f1', type: 'rect', x: 0, y: CARD.HEIGHT_PX - 60, width: CARD.WIDTH_PX, height: 60, fill: '#1e3a8a', name: 'Footer' },
        { id: 'ft1', type: 'text', x: 20, y: CARD.HEIGHT_PX - 42, text: 'AUTHORIZED ACCESS PASS', fontSize: 14, fontStyle: 'bold', fill: '#FFFFFF', name: 'Footer Label' },
      ]);
    } else if (type === 'student') {
      setTemplateName('University Student Pass');
      setBgColor('#FFFFFF');
      setBackBgColor('#F8FAFC');
      setFrontElements([
        { id: 'b1', type: 'rect', x: 0, y: 0, width: CARD.WIDTH_PX, height: 90, fill: '#1e3a8a', name: 'Top Banner' },
        { id: 't1', type: 'text', x: 30, y: 28, text: 'ACADEMIC STUDENT CREDENTIAL', fontSize: 18, fontStyle: 'bold', fill: '#FFFFFF', name: 'Title' },
        { id: 'p1', type: 'photo', x: 40, y: 120, width: 170, height: 210, dataField: '{{photo}}', name: 'Student Photo' },
        { id: 'n1', type: 'dataField', x: 240, y: 130, text: '{{full_name}}', dataField: '{{full_name}}', fontSize: 24, fontStyle: 'bold', fill: '#0f172a', name: 'Student Name' },
        { id: 'id1', type: 'dataField', x: 240, y: 175, text: 'STUDENT ID: {{id_number}}', dataField: 'STUDENT ID: {{id_number}}', fontSize: 15, fontStyle: 'bold', fill: '#84a92c', name: 'ID Field' },
        { id: 'dept1', type: 'dataField', x: 240, y: 210, text: 'GRADE / CLASS: {{department}}', dataField: 'GRADE / CLASS: {{department}}', fontSize: 14, fontStyle: 'bold', fill: '#334155', name: 'Grade Field' },
        { id: 'bc1', type: 'barcode', x: 240, y: 270, width: 220, height: 50, dataField: '{{id_number}}', name: 'Student Barcode' },
        { id: 'qr1', type: 'qr', x: 500, y: 140, width: 110, height: 110, qrPayload: '{{id_number}}', name: 'Validation QR' },
      ]);
    } else {
      setTemplateName('High-Tech Security Badge');
      setBgColor('#0a1016');
      setBackBgColor('#070b0f');
      setFrontElements([
        { id: 'b1', type: 'rect', x: 0, y: 0, width: CARD.WIDTH_PX, height: 70, fill: '#000000', name: 'Top Bar' },
        { id: 't1', type: 'text', x: 25, y: 24, text: 'SILICONLABS SECURE ENCLAVE', fontSize: 16, fontStyle: 'bold', fill: '#00f0ff', name: 'Header' },
        { id: 'p1', type: 'photo', x: 40, y: 100, width: 170, height: 210, dataField: '{{photo}}', fill: '#111822', name: 'Officer Photo' },
        { id: 'n1', type: 'dataField', x: 240, y: 110, text: '{{full_name}}', dataField: '{{full_name}}', fontSize: 24, fontStyle: 'bold', fill: '#ffffff', name: 'Name' },
        { id: 'r1', type: 'dataField', x: 240, y: 150, text: 'CLEARANCE: LEVEL 4 ({{role}})', dataField: 'CLEARANCE: LEVEL 4 ({{role}})', fontSize: 14, fontStyle: 'bold', fill: '#00f0ff', name: 'Clearance' },
        { id: 'id1', type: 'dataField', x: 240, y: 185, text: 'TAG: {{id_number}}', dataField: 'TAG: {{id_number}}', fontSize: 14, fontStyle: 'bold', fill: '#94a3b8', name: 'ID' },
        { id: 'qr1', type: 'qr', x: 490, y: 110, width: 120, height: 120, qrPayload: '{{id_number}}', name: 'Enclave Key QR' },
      ]);
    }
  };

  return (
    <div
      className="flex h-screen overflow-hidden font-sans antialiased"
      style={{ backgroundColor: 'var(--bg-root)', color: 'var(--text-primary)' }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header
          className="min-h-16 py-2 pl-14 pr-4 md:px-8 border-b flex items-center justify-between z-20 flex-shrink-0 flex-wrap gap-2"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <div className="truncate min-w-0">
            <h1 className="text-sm font-bold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
              Canvas Vector Designer (Canva / Photoshop Pro)
            </h1>
            <p className="text-[11px] truncate hidden sm:block" style={{ color: 'var(--text-muted)' }}>
              Create rich vector templates with dynamic data bindings, real QR matrices, and custom branding.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Card Dimension Presets & Custom Dimensions (High-Contrast Dark Theme) */}
            <div className="flex items-center gap-1.5 border p-1 rounded-xl shadow-xs" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
              <label htmlFor="designer-card-size-select" className="text-[10px] font-mono font-bold px-1.5 text-[#9fe870] uppercase">Card Size:</label>
              <select
                id="designer-card-size-select"
                name="cardDimensionPreset"
                value={dimensionPreset}
                onChange={e => handleDimensionChange(e.target.value)}
                className="text-xs py-1 px-2 rounded-lg bg-[#18191b] text-white font-medium border border-slate-700 focus:outline-none focus:border-[#84a92c] cursor-pointer"
              >
                <option value="cr80-landscape" className="bg-[#18191b] text-white py-1">CR80 Standard (85.6×54mm) — Default</option>
                <option value="cr80-portrait" className="bg-[#18191b] text-white py-1">CR80 Portrait (54×85.6mm)</option>
                <option value="cr79" className="bg-[#18191b] text-white py-1">CR79 Proximity (84×52mm)</option>
                <option value="cr90" className="bg-[#18191b] text-white py-1">CR90 Oversized (92×60mm)</option>
                <option value="cr100" className="bg-[#18191b] text-white py-1">CR100 Large Badge (98.5×67mm)</option>
                <option value="square" className="bg-[#18191b] text-white py-1">Square Badge (54×54mm)</option>
                <option value="custom" className="bg-[#18191b] text-white py-1">Custom Size (px / mm)...</option>
              </select>

              {dimensionPreset === 'custom' && (
                <div className="flex items-center gap-1 pl-1 border-l" style={{ borderColor: 'var(--border-primary)' }}>
                  <input
                    id="designer-custom-width-px"
                    name="cardWidthPx"
                    aria-label="Card width in pixels"
                    type="number"
                    value={cardWidth}
                    onChange={e => setCardWidth(Math.max(200, Number(e.target.value)))}
                    className="w-14 text-[11px] py-0.5 px-1 rounded border text-center font-mono bg-[#18191b] text-white"
                    style={{ borderColor: 'var(--border-primary)' }}
                    title="Width in pixels (at 300 DPI)"
                  />
                  <span className="text-[10px] text-slate-400">×</span>
                  <input
                    id="designer-custom-height-px"
                    name="cardHeightPx"
                    aria-label="Card height in pixels"
                    type="number"
                    value={cardHeight}
                    onChange={e => setCardHeight(Math.max(200, Number(e.target.value)))}
                    className="w-14 text-[11px] py-0.5 px-1 rounded border text-center font-mono bg-[#18191b] text-white"
                    style={{ borderColor: 'var(--border-primary)' }}
                    title="Height in pixels (at 300 DPI)"
                  />
                  <span className="text-[10px] text-slate-400 font-mono">px</span>
                </div>
              )}
            </div>

            {/* Snap to Grid Toggle */}
            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`p-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                snapToGrid ? 'bg-[#84a92c]/20 border-[#84a92c] text-[#84a92c] shadow-xs' : 'hover:opacity-80'
              }`}
              style={{ backgroundColor: snapToGrid ? undefined : 'var(--bg-elevated)', borderColor: snapToGrid ? undefined : 'var(--border-primary)' }}
              title="Snap to 10px Grid (Helps align and snap elements automatically)"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              <span>Snap</span>
            </button>

            {/* Freehand Vector Drawing Toggle */}
            <button
              onClick={() => {
                const nextState = !isDrawingDockOpen;
                setIsDrawingDockOpen(nextState);
                setBrushState(prev => ({
                  ...prev,
                  isActive: nextState,
                  tool: nextState ? (prev.tool === 'select' ? 'pen' : prev.tool) : 'select',
                }));
              }}
              className={`p-1.5 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                isDrawingDockOpen || brushState.isActive
                  ? 'bg-[#84a92c]/20 border-[#84a92c] text-[#9fe870] shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: isDrawingDockOpen || brushState.isActive ? '#84a92c' : 'var(--border-primary)' }}
              title="Freehand Vector Drawing Tools (Pen, Marker, Highlighter, Eraser)"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Draw</span>
            </button>

            {/* Figma Direct Import */}
            <button
              onClick={() => setIsFigmaModalOpen(true)}
              className="p-1.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all bg-[#0acf83]/10 hover:bg-[#0acf83]/20 text-[#0acf83] border-[#0acf83]/40 hover:border-[#0acf83]"
              title="Connect & Import Vector Layers directly from Figma via REST API"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 38 57" fill="none">
                <path d="M19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5Z" fill="#1ABCFE"/>
                <path d="M0 47.5C0 42.2533 4.25329 38 9.5 38H19V47.5C19 52.7467 14.7467 57 9.5 57C4.25329 57 0 52.7467 0 47.5Z" fill="#0ACF83"/>
                <path d="M19 0V19H28.5C33.7467 19 38 14.7467 38 9.5C38 4.25329 33.7467 0 28.5 0H19Z" fill="#FF7262"/>
                <path d="M0 9.5C0 14.7467 4.25329 19 9.5 19H19V0H9.5C4.25329 0 0 4.25329 0 9.5Z" fill="#F24E1E"/>
                <path d="M0 28.5C0 33.7467 4.25329 38 9.5 38H19V19H9.5C4.25329 19 0 23.2533 0 28.5Z" fill="#A259FF"/>
              </svg>
              <span>Figma</span>
            </button>

            {/* Save Template Button (Brand Colored) */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="py-2 px-4 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md transition-all bg-[#84a92c] hover:bg-[#9fe870] text-slate-950 active:scale-95 ml-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
              <span>{saving ? 'Saving...' : 'Save Template'}</span>
            </button>
          </div>
        </header>

        {/* Studio Workspace */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left Toolbar (Desktop) with Corner Collapse Button */}
          {leftSidebarOpen && (
            <aside
              className="hidden lg:flex flex-col w-80 border-r overflow-y-auto p-4 space-y-4 flex-shrink-0 text-xs z-10 relative"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                <span className="font-extrabold text-[11px] uppercase tracking-wider text-[#84a92c] font-mono">
                  Elements & Tools
                </span>
                <button
                  onClick={() => setLeftSidebarOpen(false)}
                  title="Hide Elements Toolbar"
                  className="p-1.5 rounded-lg border hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                >
                  <PanelLeftClose className="w-4 h-4 text-[#84a92c]" />
                </button>
              </div>
              <Toolbar
                onAddElement={handleAddElement}
                templateName={templateName}
                onTemplateNameChange={setTemplateName}
                onSave={handleSave}
                saving={saving}
                activeSide={activeSide}
                onSideChange={setActiveSide}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
                onDuplicate={handleDuplicate}
                onGroup={handleGroup}
                onUngroup={handleUngroup}
                onAlign={handleAlign}
                selectedCount={selectedIds.length}
                isGroupSelected={selectedElement?.type === 'group'}
                onSmartImportFile={handleSmartImportFile}
                onImportTemplate={(template) => {
                  setEditingTemplateId(template.id ?? null);
                  setTemplateName(template.name || 'Imported Template');
                  setFrontElements(template.frontElements || []);
                  setBackElements(template.backElements || []);
                  setBgColor(template.backgroundColor || '#FFFFFF');
                  setBackBgColor(template.backBackgroundColor || '#F8FAFC');
                  if (template.widthPx && template.heightPx) {
                    setCardWidth(template.widthPx);
                    setCardHeight(template.heightPx);
                    setDimensionPreset('custom');
                  }
                  setActiveSide('front');
                  setSelectedId(null);
                  setSelectedIds([]);
                }}
                onExportTemplate={() => {
                  const templateData = {
                    name: templateName,
                    frontElements,
                    backElements,
                    backgroundColor: bgColor,
                    backBackgroundColor: backBgColor,
                    orientation: cardWidth < cardHeight ? 'vertical' : 'horizontal',
                    widthPx: cardWidth,
                    heightPx: cardHeight,
                    widthMm: Math.round((cardWidth / 300) * 25.4 * 10) / 10,
                    heightMm: Math.round((cardHeight / 300) * 25.4 * 10) / 10,
                    exportedAt: new Date().toISOString(),
                  };
                  const json = JSON.stringify(templateData, null, 2);
                  const blob = new Blob([json], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${(templateName || 'template').replace(/[^a-zA-Z0-9]/g, '_')}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              />

              <hr style={{ borderColor: 'var(--border-primary)' }} />

              <TemplateList
                onSelectTemplate={handleSelectTemplate}
                selectedTemplateId={editingTemplateId}
                onNewTemplate={handleNewTemplate}
              />
            </aside>
          )}

          {/* Canvas Center */}
          <main
            id="main-content"
            className="flex-1 flex flex-col items-center justify-center overflow-auto p-4 sm:p-6 pb-28 relative"
            style={{ backgroundColor: 'var(--bg-root)' }}
          >
            {/* Canva Top Contextual Floating Toolbar */}
            {(selectedIds.length > 0 || selectedId) && (
              <div className="w-full max-w-5xl mb-3 mt-4 z-50 animate-fade-in relative overflow-visible">
                <CanvaTopToolbar
                  selectedElement={selectedElement}
                  selectedIds={selectedIds}
                  elements={currentElements}
                  backgroundColor={currentBgColor}
                  onUpdateElement={handleElementUpdate}
                  onDeleteElement={(id) => {
                    pushUndo();
                    setCurrentElements(prev => prev.filter(el => el.id !== id));
                    setSelectedId(null);
                    setSelectedIds([]);
                    showToast('Deleted element');
                  }}
                  onDuplicateElement={handleDuplicate}
                  onCutElement={handleCut}
                  onCopyElement={handleCopy}
                  onPasteElement={handlePaste}
                  onBringForward={handleBringForward}
                  onSendBackward={handleSendBackward}
                  onBringToFront={handleBringToFront}
                  onSendToBack={handleSendToBack}
                  onAlign={handleAlign}
                />
              </div>
            )}

            {/* Top Toolbar Info */}
            <div className="absolute top-2 left-6 right-6 flex items-center justify-between text-[11px] font-mono flex-wrap gap-1" style={{ color: 'var(--text-muted)' }}>
              <span>Canvas: {activeSide.toUpperCase()} FACE • {cardWidth}×{cardHeight}px ({Math.round((cardWidth / 300) * 25.4)}×{Math.round((cardHeight / 300) * 25.4)}mm)</span>
              <span className="hidden sm:inline">{selectedIds.length > 1 ? `${selectedIds.length} elements selected` : 'Drag elements or drop desktop images directly'}</span>
            </div>

            {/* Floating Canva Freehand Drawing Dock (Image 4 Clone) */}
            {(isDrawingDockOpen || brushState.isActive) && (
              <div className="absolute left-6 top-20 z-40 animate-fade-in shadow-2xl">
                <CanvaDrawingDock
                  brushState={brushState}
                  onBrushChange={(updates) => setBrushState(prev => ({ ...prev, ...updates }))}
                  onClose={() => {
                    setBrushState(prev => ({ ...prev, isActive: false, tool: 'select' }));
                    setIsDrawingDockOpen(false);
                  }}
                />
              </div>
            )}

            <CardCanvas
              elements={currentElements}
              selectedId={selectedId}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectMultiple={(ids) => {
                setSelectedIds(ids);
                setSelectedId(ids.length > 0 ? ids[ids.length - 1] : null);
              }}
              onElementUpdate={handleElementUpdate}
              onAddDroppedImage={handleAddElement}
              onAddElement={handleAddElement}
              onDeleteElement={handleDeleteElement}
              brushState={brushState}
              showGrid={showGrid}
              backgroundColor={currentBgColor}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              scale={responsiveScale}
              snapToGrid={snapToGrid}
            />

            {/* Floating Left Toolbar Reveal Button (When Left Toolbar is Hidden) */}
            {!leftSidebarOpen && (
              <button
                onClick={() => setLeftSidebarOpen(true)}
                className="hidden lg:flex absolute left-3 top-3 z-30 p-2 px-2.5 rounded-xl bg-[#18191b]/95 border border-slate-700 shadow-xl text-[#84a92c] hover:bg-[#84a92c]/10 hover:border-[#84a92c] transition-all cursor-pointer items-center gap-1.5 backdrop-blur-md"
                title="Open Elements & Tools Panel"
              >
                <PanelLeftOpen className="w-4 h-4" />
                <span className="text-[11px] font-bold text-slate-200">Tools</span>
              </button>
            )}

            {/* Floating Right Properties Reveal Button (When Right Panel is Hidden) */}
            {!rightSidebarOpen && (
              <button
                onClick={() => setRightSidebarOpen(true)}
                className="hidden lg:flex absolute right-3 top-3 z-30 p-2 px-2.5 rounded-xl bg-[#18191b]/95 border border-slate-700 shadow-xl text-[#84a92c] hover:bg-[#84a92c]/10 hover:border-[#84a92c] transition-all cursor-pointer items-center gap-1.5 backdrop-blur-md"
                title="Open Properties & Layers Panel"
              >
                <span className="text-[11px] font-bold text-slate-200">Properties</span>
                <PanelRightOpen className="w-4 h-4" />
              </button>
            )}

            {/* Floating Toast Notification */}
            {toastMessage && (
              <div className="absolute bottom-6 bg-slate-950/90 text-[#9fe870] font-mono text-xs px-4 py-2 rounded-xl shadow-2xl border border-[#84a92c]/50 backdrop-blur-xs animate-bounce z-30">
                {toastMessage}
              </div>
            )}
          </main>

          {/* Right Property & Layer Panel (Desktop) with Corner Collapse Button */}
          {rightSidebarOpen && (
            <aside
              className="hidden lg:flex flex-col w-80 border-l overflow-y-auto p-4 space-y-4 flex-shrink-0 text-xs z-10 relative"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-primary)' }}>
                <span className="font-extrabold text-[11px] uppercase tracking-wider text-[#84a92c] font-mono">
                  Properties & Layers
                </span>
                <button
                  onClick={() => setRightSidebarOpen(false)}
                  title="Hide Properties Panel"
                  className="p-1.5 rounded-lg border hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                >
                  <PanelRightClose className="w-4 h-4 text-[#84a92c]" />
                </button>
              </div>
              <PropertyPanel
                element={selectedElement}
                selectedElements={currentElements.filter(el => selectedIds.includes(el.id))}
                allElements={currentElements}
                backgroundColor={currentBgColor}
                onUpdate={handleElementUpdate}
                onDelete={handleDeleteElement}
                onBatchUpdate={(changes) => {
                  pushUndo();
                  setCurrentElements(prev =>
                    prev.map(el => (selectedIds.includes(el.id) ? { ...el, ...changes } : el))
                  );
                  showToast('Updated selected elements');
                }}
                onBatchDelete={() => {
                  pushUndo();
                  setCurrentElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
                  setSelectedId(null);
                  setSelectedIds([]);
                  showToast(`Deleted ${selectedIds.length} elements`);
                }}
                onGroup={handleGroup}
                onAlign={handleAlign}
              />

              <hr style={{ borderColor: 'var(--border-primary)' }} />

              <LayerPanel
                elements={currentElements}
                selectedId={selectedId}
                onSelect={id => handleSelect(id)}
                onReorder={handleReorder}
                onToggleVisibility={handleToggleVisibility}
                onToggleLock={handleToggleLock}
                onDuplicate={handleDuplicateLayer}
                onDelete={handleDeleteElement}
                onRename={handleRenameLayer}
              />
            </aside>
          )}
        </div>

        {/* Canva-Style Mobile Responsive Bottom Navigation Bar & Sliding Drawers */}
        <CanvaMobileBar
          onAddElement={handleAddElement}
          selectedElement={selectedElement}
          selectedIds={selectedIds}
          elements={currentElements}
          onUpdateElement={handleElementUpdate}
          onDeleteElement={handleDeleteElement}
          onDuplicateElement={handleDuplicate}
          onSmartImportFile={handleSmartImportFile}
          onLoadStarter={handleLoadStarter}
          activeSide={activeSide}
          onSideChange={setActiveSide}
          cardWidth={cardWidth}
          cardHeight={cardHeight}
        />
      </div>

      {/* Smart Design Importer & Token Binder Modal */}
      <ImportAnalysisModal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false);
          setImportFile(null);
          setImportPreviewUrl('');
        }}
        file={importFile}
        previewUrl={importPreviewUrl}
        side={activeSide}
        onApplyLayers={handleApplyImportedLayers}
      />

      {/* Figma Direct Import Modal */}
      <FigmaImportModal
        isOpen={isFigmaModalOpen}
        onClose={() => setIsFigmaModalOpen(false)}
        onApplyTemplate={handleApplyFigmaTemplate}
      />

      {/* Realistic ID Presentation Mockup Modal */}
      <CardMockupModal
        isOpen={isMockupModalOpen}
        onClose={() => setIsMockupModalOpen(false)}
        template={{
          id: editingTemplateId || undefined,
          name: templateName,
          widthPx: cardWidth,
          heightPx: cardHeight,
          orientation: cardWidth < cardHeight ? 'vertical' : 'horizontal',
          backgroundColor: bgColor,
          backBackgroundColor: backBgColor,
          frontElements,
          backElements,
          createdAt: new Date(),
          updatedAt: new Date(),
        }}
      />
    </div>
  );
}
