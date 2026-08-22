import { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from '../components/layout/Sidebar';
import CardCanvas from '../components/designer/CardCanvas';
import Toolbar from '../components/designer/Toolbar';
import PropertyPanel from '../components/designer/PropertyPanel';
import LayerPanel from '../components/designer/LayerPanel';
import TemplateList from '../components/designer/TemplateList';
import { addTemplate, updateTemplate } from '../db/hooks';
import type { CanvasElement, CardTemplate } from '../db/database';
import { CARD } from '../design-tokens';

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

  // UI state
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [dimensionPreset, setDimensionPreset] = useState<string>('cr80-landscape');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [mobileActiveTab, setMobileActiveTab] = useState<'tools' | 'canvas' | 'properties'>('canvas');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

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

  // ===== UNDO/REDO SYSTEM =====
  const MAX_HISTORY = 50;
  const [undoStack, setUndoStack] = useState<CanvasElement[][]>([]);
  const [redoStack, setRedoStack] = useState<CanvasElement[][]>([]);
  const [clipboard, setClipboard] = useState<CanvasElement | null>(null);

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
    showToast('↩ Undo applied');
  }, [undoStack, currentElements, setCurrentElements, showToast]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack(u => [...u, [...currentElements]]);
    setRedoStack(r => r.slice(0, -1));
    setCurrentElements(next);
    setSelectedId(null);
    setSelectedIds([]);
    showToast('↪ Redo applied');
  }, [redoStack, currentElements, setCurrentElements, showToast]);

  // ===== COPY / PASTE / DUPLICATE =====
  const handleCopy = useCallback(() => {
    if (selectedElement) {
      setClipboard({ ...selectedElement });
      showToast('📋 Element copied to clipboard');
    }
  }, [selectedElement, showToast]);

  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    pushUndo();
    const pasted: CanvasElement = {
      ...clipboard,
      id: `paste-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      x: clipboard.x + 20,
      y: clipboard.y + 20,
      name: `${clipboard.name || clipboard.type} (copy)`,
    };
    setCurrentElements(prev => [...prev, pasted]);
    setSelectedId(pasted.id);
    setSelectedIds([pasted.id]);
    showToast('📋 Element pasted');
  }, [clipboard, setCurrentElements, pushUndo, showToast]);

  const handleDuplicate = useCallback(() => {
    if (!selectedElement) return;
    pushUndo();
    const dup: CanvasElement = {
      ...selectedElement,
      id: `dup-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      x: selectedElement.x + 15,
      y: selectedElement.y + 15,
      name: `${selectedElement.name || selectedElement.type} (dup)`,
    };
    setCurrentElements(prev => [...prev, dup]);
    setSelectedId(dup.id);
    setSelectedIds([dup.id]);
    showToast('✨ Element duplicated');
  }, [selectedElement, setCurrentElements, pushUndo, showToast]);

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
    } else if (preset === 'cr100') {
      setCardWidth(1163);
      setCardHeight(791);
    } else if (preset === 'square') {
      setCardWidth(638);
      setCardHeight(638);
    }
  };

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
      } else if (ctrl && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      } else if (ctrl && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      } else if (ctrl && e.key === 'd') {
        e.preventDefault();
        handleDuplicate();
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
  }, [handleUndo, handleRedo, handleCopy, handlePaste, handleDuplicate, handleGroup, handleUngroup, selectedId, selectedIds, currentElements, pushUndo, setCurrentElements]);

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
              showToast('📷 Image pasted directly from clipboard onto canvas!');
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

  // Add element (with undo snapshot)
  const handleAddElement = useCallback((element: CanvasElement) => {
    pushUndo();
    setCurrentElements(prev => [...prev, element]);
    setSelectedId(element.id);
    setSelectedIds([element.id]);
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
      alert(`Template "${templateName}" saved! (${cardWidth}×${cardHeight}px). It is now available in ID Card Studio & Print Studio.`);
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
          className="min-h-16 py-2 px-4 md:px-8 border-b flex items-center justify-between z-20 flex-shrink-0 flex-wrap gap-2"
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
            {/* Card Dimension Presets & Custom Dimensions */}
            <div className="flex items-center gap-1.5 border p-1 rounded-xl" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
              <span className="text-[10px] font-mono font-bold px-1.5 text-slate-500 uppercase">Card Size:</span>
              <select
                value={dimensionPreset}
                onChange={e => handleDimensionChange(e.target.value)}
                className="text-xs py-1 px-2 rounded-lg bg-transparent font-medium border-0 focus:outline-none cursor-pointer"
                style={{ color: 'var(--text-primary)' }}
              >
                <option value="cr80-landscape">CR80 Landscape (85.6×54mm)</option>
                <option value="cr80-portrait">CR80 Portrait (54×85.6mm)</option>
                <option value="cr79">CR79 (84×52mm)</option>
                <option value="cr100">CR100 Large (98.5×67mm)</option>
                <option value="square">Square Badge (54×54mm)</option>
                <option value="custom">Custom Size...</option>
              </select>

              {dimensionPreset === 'custom' && (
                <div className="flex items-center gap-1 pl-1 border-l" style={{ borderColor: 'var(--border-primary)' }}>
                  <input
                    type="number"
                    value={cardWidth}
                    onChange={e => setCardWidth(Math.max(200, Number(e.target.value)))}
                    className="w-14 text-[11px] py-0.5 px-1 rounded border text-center font-mono"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                    title="Width in pixels (at 300 DPI)"
                  />
                  <span className="text-[10px] text-slate-500">×</span>
                  <input
                    type="number"
                    value={cardHeight}
                    onChange={e => setCardHeight(Math.max(200, Number(e.target.value)))}
                    className="w-14 text-[11px] py-0.5 px-1 rounded border text-center font-mono"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                    title="Height in pixels (at 300 DPI)"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">px</span>
                </div>
              )}
            </div>

            {/* Snap to Grid Toggle */}
            <button
              onClick={() => setSnapToGrid(!snapToGrid)}
              className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                snapToGrid ? 'bg-[#84a92c]/20 border-[#84a92c] text-[#84a92c]' : 'hover:opacity-80'
              }`}
              style={{ backgroundColor: snapToGrid ? undefined : 'var(--bg-elevated)', borderColor: snapToGrid ? undefined : 'var(--border-primary)' }}
              title="Toggle Snap to Grid (10px)"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
              <span>Snap</span>
            </button>

            {/* Starter templates dropdown */}
            <div className="flex items-center gap-1.5 border p-0.5 rounded-xl" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
              <span className="text-[10px] font-mono font-bold px-2 text-slate-500 uppercase">Starters:</span>
              <button
                onClick={() => handleLoadStarter('corporate')}
                className="px-2 py-1 text-xs font-bold rounded-lg hover:bg-white/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Corporate
              </button>
              <button
                onClick={() => handleLoadStarter('student')}
                className="px-2 py-1 text-xs font-bold rounded-lg hover:bg-white/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Student
              </button>
              <button
                onClick={() => handleLoadStarter('security')}
                className="px-2 py-1 text-xs font-bold rounded-lg hover:bg-white/80 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Security
              </button>
            </div>

            {/* Responsive Sidebar Toggles */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setLeftSidebarOpen(o => !o)}
                className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${leftSidebarOpen ? 'text-[#84a92c]' : 'text-slate-400'}`}
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                title="Toggle Left Toolbar"
              >
                🛠️ Tools
              </button>
              <button
                onClick={() => setRightSidebarOpen(o => !o)}
                className={`p-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${rightSidebarOpen ? 'text-[#84a92c]' : 'text-slate-400'}`}
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                title="Toggle Properties & Layers"
              >
                ⚙️ Properties
              </button>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary py-2 px-4 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
              </svg>
              <span>{saving ? 'Saving...' : 'Save Template'}</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Tabs (visible only on mobile & tablets < lg) */}
        <div
          className="flex lg:hidden items-center justify-around border-b px-2 py-1.5 flex-shrink-0 gap-1.5 z-20 shadow-xs"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <button
            onClick={() => setMobileActiveTab('tools')}
            className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
              mobileActiveTab === 'tools' ? 'bg-[#84a92c] text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            🛠️ Tools & Templates
          </button>
          <button
            onClick={() => setMobileActiveTab('canvas')}
            className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
              mobileActiveTab === 'canvas' ? 'bg-[#84a92c] text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            🎨 Vector Canvas
          </button>
          <button
            onClick={() => setMobileActiveTab('properties')}
            className={`flex-1 py-2 px-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition-all cursor-pointer ${
              mobileActiveTab === 'properties' ? 'bg-[#84a92c] text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚙️ Properties
          </button>
        </div>

        {/* Studio Workspace */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Toolbar */}
          {(leftSidebarOpen || mobileActiveTab === 'tools') && (
            <aside
              className={`w-full lg:w-80 border-r overflow-y-auto p-4 space-y-5 flex-shrink-0 text-xs z-10 shadow-lg lg:shadow-none ${
                mobileActiveTab === 'tools' ? 'block' : 'hidden lg:block'
              }`}
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
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
            className={`flex-1 flex-col items-center justify-center overflow-auto p-4 sm:p-6 relative ${
              mobileActiveTab === 'canvas' ? 'flex' : 'hidden lg:flex'
            }`}
            style={{ backgroundColor: 'var(--bg-root)' }}
          >
            {/* Top Toolbar Info */}
            <div className="absolute top-3 left-6 right-6 flex items-center justify-between text-[11px] font-mono flex-wrap gap-1" style={{ color: 'var(--text-muted)' }}>
              <span>Canvas: {activeSide.toUpperCase()} FACE • {cardWidth}×{cardHeight}px ({Math.round((cardWidth / 300) * 25.4)}×{Math.round((cardHeight / 300) * 25.4)}mm)</span>
              <span className="hidden sm:inline">{selectedIds.length > 1 ? `${selectedIds.length} elements selected` : 'Drag elements or drop desktop images directly'}</span>
            </div>

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
              backgroundColor={currentBgColor}
              cardWidth={cardWidth}
              cardHeight={cardHeight}
              snapToGrid={snapToGrid}
            />

            {/* Floating Toast Notification */}
            {toastMessage && (
              <div className="absolute bottom-6 bg-slate-950/90 text-[#9fe870] font-mono text-xs px-4 py-2 rounded-xl shadow-2xl border border-[#84a92c]/50 backdrop-blur-xs animate-bounce z-30">
                {toastMessage}
              </div>
            )}
          </main>

          {/* Right Property & Layer Panel */}
          {(rightSidebarOpen || mobileActiveTab === 'properties') && (
            <aside
              className={`w-full lg:w-80 border-l overflow-y-auto p-4 space-y-5 flex-shrink-0 text-xs z-10 shadow-lg lg:shadow-none ${
                mobileActiveTab === 'properties' ? 'block' : 'hidden lg:block'
              }`}
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              <PropertyPanel
                element={selectedElement}
                onUpdate={handleElementUpdate}
                onDelete={handleDeleteElement}
              />

              <hr style={{ borderColor: 'var(--border-primary)' }} />

              <LayerPanel
                elements={currentElements}
                selectedId={selectedId}
                onSelect={id => handleSelect(id)}
                onReorder={handleReorder}
                onToggleVisibility={handleToggleVisibility}
                onToggleLock={handleToggleLock}
              />
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
