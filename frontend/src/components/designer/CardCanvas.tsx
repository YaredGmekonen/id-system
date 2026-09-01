import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
  Stage,
  Layer,
  Rect,
  Text,
  Image,
  Circle,
  Transformer,
  Group,
  Line,
  Star,
  RegularPolygon,
  Arrow,
  Path,
  Shape,
} from 'react-konva';
import type Konva from 'konva';
import useImage from 'use-image';
import {
  Copy,
  Trash2,
  Lock,
  Unlock,
  Crop,
  Check,
  X,
  Image as ImageIcon,
  RotateCw,
  MoreHorizontal,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Move,
} from 'lucide-react';
import { CARD } from '../../design-tokens';
import type { CanvasElement } from '../../db/database';

interface CardCanvasProps {
  elements: CanvasElement[];
  backgroundColor: string;
  selectedId: string | null;
  selectedIds?: string[];
  onSelect: (id: string | null, multi?: boolean) => void;
  onSelectMultiple?: (ids: string[]) => void;
  onElementUpdate: (id: string, changes: Partial<CanvasElement>) => void;
  onAddDroppedImage?: (element: CanvasElement) => void;
  onAddElement?: (element: CanvasElement) => void;
  onDeleteElement?: (id: string) => void;
  onDuplicateElement?: (id: string) => void;
  scale?: number;
  cardWidth?: number;
  cardHeight?: number;
  snapToGrid?: boolean;
  gridSize?: number;
  showGrid?: boolean;
  brushState?: any;
}

// Helper for shadow properties in Konva
function getKonvaShadow(el: CanvasElement) {
  if (!el.shadowEnabled) return {};
  return {
    shadowColor: el.shadowColor || 'rgba(0, 0, 0, 0.45)',
    shadowBlur: el.shadowBlur ?? 10,
    shadowOffsetX: el.shadowOffsetX ?? 4,
    shadowOffsetY: el.shadowOffsetY ?? 4,
    shadowOpacity: el.shadowOpacity ?? 0.75,
    shadowEnabled: true,
  };
}

// Helper for linear / radial multi-stop gradient / solid fill in Konva
function getKonvaFill(el: CanvasElement, width: number = 100, height: number = 60) {
  if (
    el.fillType === 'linear-gradient' ||
    el.fillType === 'radial-gradient' ||
    (el.gradientStart && el.gradientEnd)
  ) {
    const angleRad = ((el.gradientAngle || 0) * Math.PI) / 180;
    const cx = width / 2;
    const cy = height / 2;
    const len = Math.max(width, height) / 2;
    const x0 = cx - Math.cos(angleRad) * len;
    const y0 = cy - Math.sin(angleRad) * len;
    const x1 = cx + Math.cos(angleRad) * len;
    const y1 = cy + Math.sin(angleRad) * len;

    let stops: (number | string)[] = [];
    if (el.gradientStops && el.gradientStops.length >= 2) {
      el.gradientStops.forEach(s => {
        stops.push(s.offset, s.color);
      });
    } else {
      stops = [0, el.gradientStart || '#3b82f6', 1, el.gradientEnd || '#9333ea'];
    }

    if (el.fillType === 'radial-gradient') {
      return {
        fillRadialGradientStartPoint: { x: cx, y: cy },
        fillRadialGradientStartRadius: 0,
        fillRadialGradientEndPoint: { x: cx, y: cy },
        fillRadialGradientEndRadius: len,
        fillRadialGradientColorStops: stops,
      };
    }

    return {
      fillLinearGradientStartPoint: { x: x0, y: y0 },
      fillLinearGradientEndPoint: { x: x1, y: y1 },
      fillLinearGradientColorStops: stops,
    };
  }

  return { fill: el.fill || '#84a92c' };
}

// Canvas Image Component with Cropping support
function CanvasImage({
  element,
  isSelected,
  onSelect,
  onChange,
}: {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: (e?: any) => void;
  onChange: (changes: Partial<CanvasElement>) => void;
}) {
  const [image] = useImage(element.src || '', 'anonymous');
  const w = element.width || 100;
  const h = element.height || 100;

  return (
    <Group
      id={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation || 0}
      opacity={element.opacity ?? 1}
      scaleX={element.flipX ? -1 : 1}
      scaleY={element.flipY ? -1 : 1}
      draggable={!element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
    >
      {image ? (
        <Image
          image={image}
          width={w}
          height={h}
          crop={
            element.cropWidth && element.cropHeight
              ? {
                  x: element.cropX || 0,
                  y: element.cropY || 0,
                  width: element.cropWidth,
                  height: element.cropHeight,
                }
              : undefined
          }
        />
      ) : (
        <Rect
          width={w}
          height={h}
          fill="rgba(148, 163, 184, 0.2)"
          stroke={isSelected ? '#84a92c' : '#94a3b8'}
          strokeWidth={1}
          dash={[4, 4]}
        />
      )}
    </Group>
  );
}

// Canva-Style Photo Frame Component with Mask Clipping & Classic Sky + Cloud + Green Hills Placeholder
function CanvasCanvaFrame({
  element,
  isSelected,
  isHoverTarget = false,
  onSelect,
  onChange,
}: {
  element: CanvasElement;
  isSelected: boolean;
  isHoverTarget?: boolean;
  onSelect: (e?: any) => void;
  onChange: (changes: Partial<CanvasElement>) => void;
}) {
  const w = element.width || 160;
  const h = element.height || 160;
  const frameShape =
    element.frameShape ||
    (element.isCircle || element.shapePreset === 'circle' ? 'frame-circle' : 'frame-squircle');
  const isCircle = frameShape === 'frame-circle' || element.isCircle || element.shapePreset === 'circle';
  const [image] = useImage(element.src || '', 'anonymous');
  const rad = typeof element.cornerRadius === 'number' ? element.cornerRadius : 10;
  const rTL = element.radiusTL ?? rad;
  const rTR = element.radiusTR ?? rad;
  const rBR = element.radiusBR ?? rad;
  const rBL = element.radiusBL ?? rad;

  // Mask clipping function based on frame geometry
  const getClipFunc = (ctx: any) => {
    if (isCircle) {
      ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
    } else if (frameShape === 'frame-heart') {
      ctx.beginPath();
      const topCurveH = h * 0.3;
      ctx.moveTo(w / 2, topCurveH);
      ctx.bezierCurveTo(w / 2, 0, 0, 0, 0, topCurveH);
      ctx.bezierCurveTo(0, (h + topCurveH) / 2, w / 2, (h + topCurveH) / 2, w / 2, h);
      ctx.bezierCurveTo(w / 2, (h + topCurveH) / 2, w, (h + topCurveH) / 2, w, topCurveH);
      ctx.bezierCurveTo(w, 0, w / 2, 0, w / 2, topCurveH);
      ctx.closePath();
    } else if (frameShape === 'frame-shield') {
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w, h * 0.18);
      ctx.lineTo(w * 0.85, h * 0.7);
      ctx.lineTo(w / 2, h);
      ctx.lineTo(w * 0.15, h * 0.7);
      ctx.lineTo(0, h * 0.18);
      ctx.closePath();
    } else if (frameShape === 'frame-hexagon') {
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w, h * 0.25);
      ctx.lineTo(w, h * 0.75);
      ctx.lineTo(w / 2, h);
      ctx.lineTo(0, h * 0.75);
      ctx.lineTo(0, h * 0.25);
      ctx.closePath();
    } else if (frameShape === 'frame-arch') {
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, w / 2);
      ctx.arc(w / 2, w / 2, w / 2, Math.PI, 0, false);
      ctx.lineTo(w, h);
      ctx.closePath();
    } else if (frameShape === 'frame-diamond') {
      ctx.beginPath();
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w, h / 2);
      ctx.lineTo(w / 2, h);
      ctx.lineTo(0, h / 2);
      ctx.closePath();
    } else if (frameShape === 'frame-cloud') {
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.45, w * 0.25, 0, Math.PI * 2);
      ctx.arc(w * 0.3, h * 0.55, w * 0.18, 0, Math.PI * 2);
      ctx.arc(w * 0.7, h * 0.55, w * 0.18, 0, Math.PI * 2);
      ctx.closePath();
    } else {
      // Rounded rect squircle clip with individual 4-corner radii
      ctx.beginPath();
      ctx.moveTo(rTL, 0);
      ctx.lineTo(w - rTR, 0);
      ctx.quadraticCurveTo(w, 0, w, rTR);
      ctx.lineTo(w, h - rBR);
      ctx.quadraticCurveTo(w, h, w - rBR, h);
      ctx.lineTo(rBL, h);
      ctx.quadraticCurveTo(0, h, 0, h - rBL);
      ctx.lineTo(0, rTL);
      ctx.quadraticCurveTo(0, 0, rTL, 0);
      ctx.closePath();
    }
  };

  return (
    <Group
      id={element.id}
      x={element.x}
      y={element.y}
      rotation={element.rotation || 0}
      opacity={element.opacity ?? 1}
      draggable={!element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
    >
      {/* Clipped Content inside Frame */}
      <Group clipFunc={getClipFunc}>
        {image ? (
          <Image
            image={image}
            width={w}
            height={h}
            crop={
              element.cropWidth && element.cropHeight
                ? {
                    x: element.cropX || 0,
                    y: element.cropY || 0,
                    width: element.cropWidth,
                    height: element.cropHeight,
                  }
                : undefined
            }
          />
        ) : (
          /* Authentic Canva Photo Frame Placeholder (Image 3: Sky + Fluffy Cloud + Rolling Green Hills) */
          <Group>
            {/* Sky Background Gradient */}
            <Rect
              width={w}
              height={h}
              fillLinearGradientStartPoint={{ x: 0, y: 0 }}
              fillLinearGradientEndPoint={{ x: 0, y: h }}
              fillLinearGradientColorStops={[
                0,
                '#7bb7fa',
                0.6,
                '#bce6fb',
                1,
                '#e3f4fc',
              ]}
            />
            {/* Soft Fluffy White Cloud */}
            <Shape
              sceneFunc={(ctx, shape) => {
                ctx.beginPath();
                const cx = w * 0.5;
                const cy = h * 0.32;
                const r = Math.min(w, h) * 0.15;
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.arc(cx - r * 0.75, cy + r * 0.3, r * 0.65, 0, Math.PI * 2);
                ctx.arc(cx + r * 0.75, cy + r * 0.3, r * 0.65, 0, Math.PI * 2);
                ctx.closePath();
                ctx.fillStrokeShape(shape);
              }}
              fill="#ffffff"
              opacity={0.95}
            />
            {/* Back Rolling Grassy Hill */}
            <Shape
              sceneFunc={(ctx, shape) => {
                ctx.beginPath();
                ctx.moveTo(-w * 0.1, h * 1.1);
                ctx.quadraticCurveTo(w * 0.3, h * 0.55, w * 0.7, h * 0.8);
                ctx.quadraticCurveTo(w * 0.9, h * 0.95, w * 1.1, h * 1.1);
                ctx.lineTo(-w * 0.1, h * 1.1);
                ctx.closePath();
                ctx.fillStrokeShape(shape);
              }}
              fill="#8dc63f"
            />
            {/* Front Rolling Green Hill */}
            <Shape
              sceneFunc={(ctx, shape) => {
                ctx.beginPath();
                ctx.moveTo(w * 1.1, h * 1.1);
                ctx.quadraticCurveTo(w * 0.7, h * 0.6, w * 0.2, h * 0.75);
                ctx.quadraticCurveTo(0, h * 0.8, -w * 0.1, h * 1.1);
                ctx.lineTo(w * 1.1, h * 1.1);
                ctx.closePath();
                ctx.fillStrokeShape(shape);
              }}
              fill="#689f1f"
            />
          </Group>
        )}
      </Group>

      {/* Frame Border Outline */}
      {element.stroke && element.strokeWidth ? (
        isCircle ? (
          <Circle
            x={w / 2}
            y={h / 2}
            radius={Math.min(w, h) / 2}
            stroke={isSelected ? '#84a92c' : element.stroke}
            strokeWidth={isSelected ? 3 : element.strokeWidth}
          />
        ) : (
          <Rect
            width={w}
            height={h}
            cornerRadius={[rTL, rTR, rBR, rBL]}
            stroke={isSelected ? '#84a92c' : element.stroke}
            strokeWidth={isSelected ? 3 : element.strokeWidth}
          />
        )
      ) : null}

      {/* Hover Ring when dragging image over this frame (Image 2 Fit Indicator) */}
      {isHoverTarget && (
        <Group>
          {isCircle ? (
            <Circle
              x={w / 2}
              y={h / 2}
              radius={Math.min(w, h) / 2 + 2}
              stroke="#84a92c"
              strokeWidth={4}
              dash={[8, 4]}
              fill="rgba(132, 169, 44, 0.28)"
            />
          ) : (
            <Rect
              x={-2}
              y={-2}
              width={w + 4}
              height={h + 4}
              cornerRadius={[rTL, rTR, rBR, rBL]}
              stroke="#84a92c"
              strokeWidth={4}
              dash={[8, 4]}
              fill="rgba(132, 169, 44, 0.28)"
            />
          )}
          <Rect
            x={w / 2 - 48}
            y={h / 2 - 12}
            width={96}
            height={24}
            cornerRadius={6}
            fill="#0f172a"
            opacity={0.92}
          />
          <Text
            x={w / 2 - 48}
            y={h / 2 - 5}
            width={96}
            text="Drop Photo In Frame"
            align="center"
            fill="#9fe870"
            fontSize={9}
            fontFamily="Inter"
            fontStyle="bold"
          />
        </Group>
      )}
    </Group>
  );
}

// Scannable QR Code Konva Layer
function CanvasQRCode({
  element,
  isSelected,
  onSelect,
  onChange,
}: {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (changes: Partial<CanvasElement>) => void;
}) {
  const size = element.width || 100;
  const payload = element.qrPayload || 'PREVIEW-QR';
  const [qrImage, setQrImage] = React.useState<HTMLImageElement | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { generateQrDataUrl } = await import('../../engine/barcodeQr');
        const dataUrl = await generateQrDataUrl(payload, Math.round(size));
        if (cancelled) return;
        const img = new window.Image();
        img.onload = () => {
          if (!cancelled) setQrImage(img);
        };
        img.src = dataUrl;
      } catch (err) {
        console.warn('[CanvasQRCode] QR generate error:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [payload, size]);

  return (
    <Group
      id={element.id}
      x={element.x}
      y={element.y}
      draggable={!element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
    >
      <Rect
        width={size}
        height={size}
        fill={element.fill || '#FFFFFF'}
        cornerRadius={4}
        stroke={isSelected ? '#84a92c' : '#cbd5e1'}
        strokeWidth={isSelected ? 2 : 1}
      />
      {qrImage && (
        <Image image={qrImage} x={2} y={2} width={size - 4} height={size - 4} />
      )}
    </Group>
  );
}

// Scannable 1D Barcode Konva Layer
function CanvasRealBarcode({
  element,
  isSelected,
  onSelect,
  onChange,
}: {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (changes: Partial<CanvasElement>) => void;
}) {
  const w = element.width || 200;
  const h = element.height || 60;
  const val = element.barcodeValue || '1234567890';
  const bType = element.barcodeType || 'code128';
  const [barImage, setBarImage] = React.useState<HTMLImageElement | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { generateBarcodeDataUrl } = await import('../../engine/barcodeQr');
        const dataUrl = await generateBarcodeDataUrl(val, Math.round(w), Math.round(h), false, bType);
        if (cancelled) return;
        const img = new window.Image();
        img.onload = () => {
          if (!cancelled) setBarImage(img);
        };
        img.src = dataUrl;
      } catch (err) {
        console.warn('[CanvasRealBarcode] Barcode generate error:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [val, bType, w, h]);

  return (
    <Group
      id={element.id}
      x={element.x}
      y={element.y}
      draggable={!element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
    >
      <Rect
        width={w}
        height={h}
        fill={element.fill || '#FFFFFF'}
        cornerRadius={4}
        stroke={isSelected ? '#84a92c' : '#cbd5e1'}
        strokeWidth={isSelected ? 2 : 1}
      />
      {barImage && <Image image={barImage} x={2} y={2} width={w - 4} height={h - 4} />}
    </Group>
  );
}

// Line / Arrow Component
function CanvasLineOrArrow({
  element,
  isSelected,
  onSelect,
  onChange,
}: {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: (e?: any) => void;
  onChange: (changes: Partial<CanvasElement>) => void;
}) {
  const pts =
    element.points && element.points.length >= 4
      ? element.points
      : [0, 0, element.width || 150, element.height || 0];
  const strokeColor = isSelected ? '#84a92c' : element.stroke || element.fill || '#0f172a';
  const strokeW = isSelected ? Math.max(3, (element.strokeWidth || 2) + 1) : element.strokeWidth || 2;
  const isArrow = element.type === 'arrow' || element.arrowHead;

  return isArrow ? (
    <Arrow
      id={element.id}
      x={element.x}
      y={element.y}
      points={pts}
      pointerLength={10}
      pointerWidth={10}
      fill={strokeColor}
      stroke={strokeColor}
      strokeWidth={strokeW}
      opacity={element.opacity ?? 1}
      rotation={element.rotation || 0}
      draggable={!element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
    />
  ) : (
    <Line
      id={element.id}
      x={element.x}
      y={element.y}
      points={pts}
      stroke={strokeColor}
      strokeWidth={strokeW}
      dash={element.dashPattern}
      opacity={element.opacity ?? 1}
      rotation={element.rotation || 0}
      draggable={!element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
    />
  );
}

// Main CardCanvas Export Component
export default function CardCanvas({
  elements,
  backgroundColor,
  selectedId,
  selectedIds = [],
  onSelect,
  onSelectMultiple,
  onElementUpdate,
  onAddDroppedImage,
  onAddElement,
  onDeleteElement,
  onDuplicateElement,
  scale = 1,
  cardWidth = CARD.WIDTH_PX,
  cardHeight = CARD.HEIGHT_PX,
  snapToGrid = false,
  gridSize = 10,
  showGrid = false,
  brushState,
}: CardCanvasProps) {
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [hoveredFrameId, setHoveredFrameId] = useState<string | null>(null);

  // Zoom & Pan state
  const [currentZoom, setCurrentZoom] = useState<number>(1);
  const effectiveScale = scale * currentZoom;

  // In-place Text Editor State
  const [editingText, setEditingText] = useState<{ id: string; text: string; x: number; y: number; width?: number; fontSize?: number; fontFamily?: string; fontStyle?: string; fill?: string; align?: string; lineHeight?: number; letterSpacing?: number; rotation?: number } | null>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Canva Delete Dropdown State (Image 2)
  const [showFrameDeleteMenu, setShowFrameDeleteMenu] = useState(false);

  // Photoshop / Canva Style Interactive Cropping Mode State
  const [croppingId, setCroppingId] = useState<string | null>(null);
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Freehand drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<number[]>([]);
  const isDrawingMode = brushState?.isActive && brushState?.tool !== 'select';

  // Helper coordinate snap
  const snapCoord = useCallback((val: number) => {
    if (!snapToGrid) return val;
    return Math.round(val / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  // Selected element lookup
  const selectedElement = elements.find(
    el => el.id === selectedId || (selectedIds.length === 1 && el.id === selectedIds[0])
  );

  // Synchronize Konva Transformer with selection
  useEffect(() => {
    if (isDrawingMode || croppingId) {
      transformerRef.current?.nodes([]);
      transformerRef.current?.getLayer()?.batchDraw();
      return;
    }

    const transformer = transformerRef.current;
    if (!transformer) return;
    const stage = transformer.getStage();
    if (!stage) return;

    const idsToSelect = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    const nodes = idsToSelect
      .map(id => stage.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[];

    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, selectedIds, elements, isDrawingMode, croppingId]);

  // In-place text editor selection isolation
  useEffect(() => {
    if (editingText?.id && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.select();
    }
  }, [editingText?.id]);

  // Start Interactive Crop on Element
  const startCropping = (el: CanvasElement) => {
    setCroppingId(el.id);
    const initialW = el.width || 120;
    const initialH = el.height || 120;
    setCropBox({
      x: el.cropX || 0,
      y: el.cropY || 0,
      width: el.cropWidth || initialW,
      height: elementToCropHeight(el, initialW, initialH),
    });
  };

  const elementToCropHeight = (el: CanvasElement, defW: number, defH: number) => {
    return el.cropHeight || defH;
  };

  const applyCrop = () => {
    if (croppingId && cropBox) {
      onElementUpdate(croppingId, {
        cropX: Math.max(0, Math.round(cropBox.x)),
        cropY: Math.max(0, Math.round(cropBox.y)),
        cropWidth: Math.max(10, Math.round(cropBox.width)),
        cropHeight: Math.max(10, Math.round(cropBox.height)),
      });
    }
    setCroppingId(null);
    setCropBox(null);
  };

  const cancelCrop = () => {
    setCroppingId(null);
    setCropBox(null);
  };

  // Drag over canvas: detect if cursor is hovering over an existing photo frame
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
    const stage = stageRef.current;
    const rect = stage?.container().getBoundingClientRect();
    if (rect) {
      const mouseX = (e.clientX - rect.left) / effectiveScale;
      const mouseY = (e.clientY - rect.top) / effectiveScale;

      const hitFrame = elements.slice().reverse().find(el => {
        if (el.visible === false) return false;
        const isFrame = el.type === 'photo' || el.type === 'frame' || el.isFrame;
        if (!isFrame) return false;
        const fx = el.x;
        const fy = el.y;
        const fw = el.width || 160;
        const fh = el.height || 160;
        return mouseX >= fx && mouseX <= fx + fw && mouseY >= fy && mouseY <= fy + fh;
      });

      setHoveredFrameId(hitFrame ? hitFrame.id : null);
    }
  };

  // Drag & drop desktop images directly onto canvas or into hovered frame
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const targetFrameId = hoveredFrameId;
    setHoveredFrameId(null);

    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;

        // If dropped directly into a photo frame, attach image into that frame!
        if (targetFrameId) {
          onElementUpdate(targetFrameId, {
            src: result,
            cropX: undefined,
            cropY: undefined,
            cropWidth: undefined,
            cropHeight: undefined,
          });
          return;
        }

        // Otherwise insert as standalone canvas image
        const stage = stageRef.current;
        const rect = stage?.container().getBoundingClientRect();
        const dropX = rect ? (e.clientX - rect.left) / effectiveScale : 50;
        const dropY = rect ? (e.clientY - rect.top) / effectiveScale : 50;

        const img = new window.Image();
        img.onload = () => {
          const maxDim = 200;
          let w = img.naturalWidth || 150;
          let h = img.naturalHeight || 150;
          if (w > maxDim || h > maxDim) {
            const aspect = w / h;
            if (w > h) {
              w = maxDim;
              h = maxDim / aspect;
            } else {
              h = maxDim;
              w = maxDim * aspect;
            }
          }

          if (onAddDroppedImage) {
            onAddDroppedImage({
              id: `img-drop-${Date.now()}`,
              type: 'image',
              x: Math.round(dropX - w / 2),
              y: Math.round(dropY - h / 2),
              width: Math.round(w),
              height: Math.round(h),
              src: result,
              opacity: 1,
              visible: true,
              locked: false,
              name: file.name.replace(/\.[^/.]+$/, ''),
            });
          }
        };
        img.src = result;
      };
      reader.readAsDataURL(file);
    }
  };

  // Wheel zoom with cursor anchoring
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    if (e.evt.ctrlKey || e.evt.metaKey) {
      e.evt.preventDefault();
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const factor = 1.1;
      setCurrentZoom(prev => {
        const next = direction > 0 ? prev * factor : prev / factor;
        return Math.max(0.4, Math.min(3.5, Number(next.toFixed(2))));
      });
    }
  };

  // Node transform sync back to state
  const handleNodeTransform = (node: Konva.Node, el: CanvasElement) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);

    const changes: Partial<CanvasElement> = {
      x: snapCoord(node.x()),
      y: snapCoord(node.y()),
      rotation: Math.round(node.rotation()),
    };

    if (el.type === 'circle') {
      const curRadius = el.radius || (el.width ? el.width / 2 : 40);
      changes.radius = Math.max(5, Math.round(curRadius * Math.max(scaleX, scaleY)));
      changes.width = changes.radius * 2;
      changes.height = changes.radius * 2;
    } else {
      changes.width = Math.max(10, Math.round((el.width || 100) * scaleX));
      changes.height = Math.max(10, Math.round((el.height || 60) * scaleY));
    }

    onElementUpdate(el.id, changes);
  };

  // Render individual canvas element
  const renderElement = (el: CanvasElement) => {
    if (el.visible === false) return null;
    const isSelected = selectedId === el.id || (selectedIds && selectedIds.includes(el.id));
    const isHoverTarget = hoveredFrameId === el.id;
    const selectThis = (e?: any) => {
      if (e) e.cancelBubble = true;
      if (isDrawingMode) return;
      onSelect(el.id, e?.evt?.shiftKey || e?.evt?.ctrlKey);
    };
    const updateThis = (changes: Partial<CanvasElement>) => onElementUpdate(el.id, changes);

    switch (el.type) {
      case 'text':
      case 'dataField':
      case 'heading':
      case 'subtext':
      case 'mono': {
        const textVal = el.dataField || el.text || 'Sample Text';
        return (
          <Text
            key={el.id}
            id={el.id}
            x={el.x}
            y={el.y}
            text={textVal}
            fontSize={el.fontSize || 16}
            fontFamily={el.fontFamily || 'Inter'}
            fontStyle={el.fontStyle || 'normal'}
            fill={el.fill || '#0f172a'}
            align={el.align || 'left'}
            width={el.width}
            lineHeight={el.lineHeight || 1.2}
            letterSpacing={el.letterSpacing || 0}
            opacity={el.opacity ?? 1}
            rotation={el.rotation || 0}
            draggable={!el.locked}
            onClick={selectThis}
            onTap={selectThis}
            onDblClick={() => {
              if (!el.locked) {
                setEditingText({
                  id: el.id,
                  text: el.text || el.dataField || '',
                  x: el.x,
                  y: el.y,
                  width: el.width,
                  fontSize: el.fontSize,
                  fontFamily: el.fontFamily,
                  fontStyle: el.fontStyle,
                  fill: el.fill,
                  align: el.align,
                  lineHeight: el.lineHeight,
                  letterSpacing: el.letterSpacing,
                  rotation: el.rotation,
                });
              }
            }}
            onDragEnd={(e) => updateThis({ x: snapCoord(e.target.x()), y: snapCoord(e.target.y()) })}
            {...getKonvaShadow(el)}
          />
        );
      }

      case 'rect':
      case 'pill': {
        const w = el.width || 120;
        const h = el.height || 60;
        const rad = el.type === 'pill' ? h / 2 : (typeof el.cornerRadius === 'number' ? el.cornerRadius : 8);
        const rTL = el.radiusTL ?? rad;
        const rTR = el.radiusTR ?? rad;
        const rBR = el.radiusBR ?? rad;
        const rBL = el.radiusBL ?? rad;
        const fillProps = getKonvaFill(el, w, h);
        const shadowProps = getKonvaShadow(el);

        return (
          <Rect
            key={el.id}
            id={el.id}
            x={el.x}
            y={el.y}
            width={w}
            height={h}
            cornerRadius={[rTL, rTR, rBR, rBL]}
            stroke={isSelected ? '#84a92c' : el.stroke}
            strokeWidth={isSelected ? 2.5 : el.strokeWidth || 0}
            dash={el.dashPattern}
            opacity={el.opacity ?? 1}
            rotation={el.rotation || 0}
            draggable={!el.locked}
            onClick={selectThis}
            onTap={selectThis}
            onDragEnd={(e) => updateThis({ x: snapCoord(e.target.x()), y: snapCoord(e.target.y()) })}
            {...fillProps}
            {...shadowProps}
          />
        );
      }

      case 'circle': {
        const r = el.radius || (el.width ? el.width / 2 : 40);
        const fillProps = getKonvaFill(el, r * 2, r * 2);
        const shadowProps = getKonvaShadow(el);

        return (
          <Circle
            key={el.id}
            id={el.id}
            x={el.x + r}
            y={el.y + r}
            radius={r}
            stroke={isSelected ? '#84a92c' : el.stroke}
            strokeWidth={isSelected ? 2.5 : el.strokeWidth || 0}
            opacity={el.opacity ?? 1}
            draggable={!el.locked}
            onClick={selectThis}
            onTap={selectThis}
            onDragEnd={(e) => updateThis({ x: snapCoord(e.target.x() - r), y: snapCoord(e.target.y() - r) })}
            {...fillProps}
            {...shadowProps}
          />
        );
      }

      case 'star': {
        const rOuter = (el.width || 80) / 2;
        const rInner = el.innerRadius || rOuter * 0.45;
        const numPoints = el.starPoints || 5;
        const fillProps = getKonvaFill(el, rOuter * 2, rOuter * 2);
        const shadowProps = getKonvaShadow(el);

        return (
          <Star
            key={el.id}
            id={el.id}
            x={el.x + rOuter}
            y={el.y + rOuter}
            numPoints={numPoints}
            innerRadius={rInner}
            outerRadius={rOuter}
            stroke={isSelected ? '#84a92c' : el.stroke}
            strokeWidth={isSelected ? 2.5 : el.strokeWidth || 0}
            opacity={el.opacity ?? 1}
            rotation={el.rotation || 0}
            draggable={!el.locked}
            onClick={selectThis}
            onTap={selectThis}
            onDragEnd={(e) => updateThis({ x: snapCoord(e.target.x() - rOuter), y: snapCoord(e.target.y() - rOuter) })}
            {...fillProps}
            {...shadowProps}
          />
        );
      }

      case 'polygon':
      case 'hexagon':
      case 'triangle': {
        const sides = el.type === 'triangle' ? 3 : el.type === 'hexagon' ? 6 : el.sides || 5;
        const r = (el.width || 80) / 2;
        const fillProps = getKonvaFill(el, r * 2, r * 2);
        const shadowProps = getKonvaShadow(el);

        return (
          <RegularPolygon
            key={el.id}
            id={el.id}
            x={el.x + r}
            y={el.y + r}
            sides={sides}
            radius={r}
            stroke={isSelected ? '#84a92c' : el.stroke}
            strokeWidth={isSelected ? 2.5 : el.strokeWidth || 0}
            opacity={el.opacity ?? 1}
            rotation={el.rotation || 0}
            draggable={!el.locked}
            onClick={selectThis}
            onTap={selectThis}
            onDragEnd={(e) => updateThis({ x: snapCoord(e.target.x() - r), y: snapCoord(e.target.y() - r) })}
            {...fillProps}
            {...shadowProps}
          />
        );
      }

      case 'image':
        return (
          <CanvasImage
            key={el.id}
            element={el}
            isSelected={isSelected}
            onSelect={selectThis}
            onChange={(changes) => updateThis({
              ...changes,
              x: changes.x !== undefined ? snapCoord(changes.x) : el.x,
              y: changes.y !== undefined ? snapCoord(changes.y) : el.y,
            })}
          />
        );

      case 'photo':
      case 'frame':
        return (
          <CanvasCanvaFrame
            key={el.id}
            element={el}
            isSelected={isSelected}
            isHoverTarget={isHoverTarget}
            onSelect={selectThis}
            onChange={(changes) => updateThis({
              ...changes,
              x: changes.x !== undefined ? snapCoord(changes.x) : el.x,
              y: changes.y !== undefined ? snapCoord(changes.y) : el.y,
            })}
          />
        );

      case 'qr':
      case 'qrCode':
        return (
          <CanvasQRCode
            key={el.id}
            element={el}
            isSelected={isSelected}
            onSelect={selectThis}
            onChange={(changes) => updateThis({
              ...changes,
              x: changes.x !== undefined ? snapCoord(changes.x) : el.x,
              y: changes.y !== undefined ? snapCoord(changes.y) : el.y,
            })}
          />
        );

      case 'barcode':
        return (
          <CanvasRealBarcode
            key={el.id}
            element={el}
            isSelected={isSelected}
            onSelect={selectThis}
            onChange={(changes) => updateThis({
              ...changes,
              x: changes.x !== undefined ? snapCoord(changes.x) : el.x,
              y: changes.y !== undefined ? snapCoord(changes.y) : el.y,
            })}
          />
        );

      case 'line':
      case 'arrow':
        return (
          <CanvasLineOrArrow
            key={el.id}
            element={el}
            isSelected={isSelected}
            onSelect={selectThis}
            onChange={(changes) => updateThis({
              ...changes,
              x: changes.x !== undefined ? snapCoord(changes.x) : el.x,
              y: changes.y !== undefined ? snapCoord(changes.y) : el.y,
            })}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center relative select-none w-full h-full"
      onDragOver={handleDragOver}
      onDragLeave={() => {
        setIsDragOver(false);
        setHoveredFrameId(null);
      }}
      onDrop={handleFileDrop}
    >
      <div
        className={`relative rounded-2xl overflow-hidden shadow-2xl transition-all border ${
          isDragOver ? 'ring-4 ring-[#84a92c] scale-[1.01]' : 'border-slate-300 dark:border-slate-800'
        }`}
        style={{
          width: cardWidth * effectiveScale,
          height: cardHeight * effectiveScale,
          cursor: isDrawingMode ? 'crosshair' : 'default',
        }}
      >
        {/* Card Stage */}
        <Stage
          ref={stageRef}
          width={cardWidth * effectiveScale}
          height={cardHeight * effectiveScale}
          scaleX={effectiveScale}
          scaleY={effectiveScale}
          onWheel={handleWheel}
          onMouseDown={(e) => {
            if (e.target === e.target.getStage() || e.target.id() === 'card-bg') {
              onSelect(null);
              setShowFrameDeleteMenu(false);
            }
          }}
        >
          <Layer>
            {/* Card Background */}
            <Rect
              id="card-bg"
              x={0}
              y={0}
              width={cardWidth}
              height={cardHeight}
              fill={backgroundColor}
              cornerRadius={12}
            />

            {/* Canvas Elements */}
            {elements.map(renderElement)}

            {/* Grid Overlay */}
            {showGrid && (
              <Group listening={false}>
                {Array.from({ length: Math.ceil(cardWidth / gridSize) }).map((_, i) => (
                  <Line
                    key={`gx-${i}`}
                    points={[i * gridSize, 0, i * gridSize, cardHeight]}
                    stroke="rgba(100, 116, 139, 0.18)"
                    strokeWidth={0.75}
                  />
                ))}
                {Array.from({ length: Math.ceil(cardHeight / gridSize) }).map((_, i) => (
                  <Line
                    key={`gy-${i}`}
                    points={[0, i * gridSize, cardWidth, i * gridSize]}
                    stroke="rgba(100, 116, 139, 0.18)"
                    strokeWidth={0.75}
                  />
                ))}
              </Group>
            )}

            {/* Selection Transformer */}
            {!isDrawingMode && !croppingId && (
              <Transformer
                ref={transformerRef}
                boundBoxFunc={(oldBox, newBox) => {
                  if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) return oldBox;
                  return newBox;
                }}
                onTransformEnd={() => {
                  const transformer = transformerRef.current;
                  if (!transformer) return;
                  const nodes = transformer.nodes();
                  nodes.forEach(node => {
                    const id = node.id();
                    const el = elements.find(e => e.id === id);
                    if (el) handleNodeTransform(node, el);
                  });
                }}
                borderStroke="#84a92c"
                borderStrokeWidth={2}
                anchorStroke="#84a92c"
                anchorFill="#ffffff"
                anchorSize={8}
                anchorCornerRadius={2}
              />
            )}
          </Layer>
        </Stage>

        {/* ========================================================================= */}
        {/* CANVA FLOATING QUICK CONTEXT TOOLBAR (Image 2 exact clone) */}
        {/* ========================================================================= */}
        {selectedElement && !editingText && !croppingId && !isDrawingMode && (
          <div
            className="absolute z-40 flex items-center gap-1 bg-[#1e293b]/95 border border-slate-700 backdrop-blur-md rounded-xl p-1 shadow-2xl animate-fade-in text-white"
            style={{
              left: `${Math.max(
                8,
                Math.min(
                  cardWidth * effectiveScale - 140,
                  (selectedElement.x + (selectedElement.width || 100) / 2) * effectiveScale - 70
                )
              )}px`,
              top: `${Math.max(8, selectedElement.y * effectiveScale - 42)}px`,
            }}
          >
            {/* Duplicate Button [+] */}
            <button
              onClick={() => {
                if (onDuplicateElement) {
                  onDuplicateElement(selectedElement.id);
                } else if (onAddElement) {
                  onAddElement({
                    ...selectedElement,
                    id: `${selectedElement.id}-copy-${Date.now()}`,
                    x: selectedElement.x + 20,
                    y: selectedElement.y + 20,
                  });
                }
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Duplicate (Ctrl+D)"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            {/* Lock / Unlock Toggle */}
            <button
              onClick={() =>
                onElementUpdate(selectedElement.id, { locked: !selectedElement.locked })
              }
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                selectedElement.locked
                  ? 'bg-[#84a92c] text-slate-950'
                  : 'hover:bg-white/10 text-slate-300 hover:text-white'
              }`}
              title={selectedElement.locked ? 'Unlock element' : 'Lock element'}
            >
              {selectedElement.locked ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <Unlock className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Crop Button (for Images and Photo Frames) */}
            {(selectedElement.type === 'image' ||
              selectedElement.type === 'photo' ||
              selectedElement.isFrame) && (
              <button
                onClick={() => startCropping(selectedElement)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Crop Image / Adjust Crop Box"
              >
                <Crop className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Delete Button with Frame Menu Support (Image 2) */}
            <div className="relative">
              <button
                onClick={() => {
                  if (
                    (selectedElement.type === 'photo' || selectedElement.isFrame) &&
                    selectedElement.src
                  ) {
                    setShowFrameDeleteMenu(!showFrameDeleteMenu);
                  } else if (onDeleteElement) {
                    onDeleteElement(selectedElement.id);
                  }
                }}
                className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Canva Delete Dropdown Menu (Image 2 clone) */}
              {showFrameDeleteMenu && (
                <div className="absolute top-8 left-0 w-36 py-1 bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl z-50 text-xs font-sans animate-fade-in">
                  <button
                    onClick={() => {
                      onElementUpdate(selectedElement.id, {
                        src: undefined,
                        cropX: undefined,
                        cropY: undefined,
                        cropWidth: undefined,
                        cropHeight: undefined,
                      });
                      setShowFrameDeleteMenu(false);
                    }}
                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-white/10 text-left text-slate-200 hover:text-white transition-colors"
                  >
                    <ImageIcon className="w-3.5 h-3.5 text-[#84a92c]" />
                    <span>Delete image</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onDeleteElement) onDeleteElement(selectedElement.id);
                      setShowFrameDeleteMenu(false);
                    }}
                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-rose-500/20 text-left text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Delete frame</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHOTOSHOP / CANVA STYLE INTERACTIVE RECTANGULAR CROP OVERLAY */}
        {/* ========================================================================= */}
        {croppingId && selectedElement && cropBox && (
          <div
            className="absolute inset-0 z-50 bg-black/60 flex items-center justify-center pointer-events-auto"
            onClick={cancelCrop}
          >
            <div
              className="relative border-2 border-white shadow-2xl cursor-move"
              style={{
                width: Math.min(cardWidth * effectiveScale * 0.8, (cropBox.width || 120) * effectiveScale),
                height: Math.min(cardHeight * effectiveScale * 0.8, (cropBox.height || 120) * effectiveScale),
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)',
                backgroundSize: '33.333% 33.333%',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 8 Drag Handles */}
              <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-xs" />
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-xs" />
              <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-xs" />
              <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-xs" />
              <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-xs" />
              <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-xs" />
              <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-xs" />
              <div className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-slate-900 rounded-xs" />

              {/* Floating Done / Cancel Bar */}
              <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#18191b] border border-slate-700 px-3 py-1.5 rounded-xl shadow-2xl text-xs whitespace-nowrap">
                <button
                  onClick={applyCrop}
                  className="px-2.5 py-1 rounded-lg bg-[#84a92c] hover:bg-[#9fe870] text-slate-950 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Apply Crop</span>
                </button>
                <button
                  onClick={cancelCrop}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Direct In-place Canvas Text Editor Overlay on Double-Click */}
        {editingText && (
          <textarea
            ref={editTextareaRef}
            value={editingText.text}
            onChange={(e) => {
              const newText = e.target.value;
              setEditingText(prev => (prev ? { ...prev, text: newText } : null));
              onElementUpdate(editingText.id, { text: newText });
            }}
            onBlur={() => {
              if (editingText) {
                onElementUpdate(editingText.id, { text: editingText.text });
                setEditingText(null);
              }
            }}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Escape') {
                if (editingText) {
                  onElementUpdate(editingText.id, { text: editingText.text });
                  setEditingText(null);
                }
              }
            }}
            onKeyUp={(e) => e.stopPropagation()}
            onKeyPress={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: `${editingText.x * effectiveScale}px`,
              top: `${editingText.y * effectiveScale}px`,
              width: `${Math.max(100, (editingText.width || 240) * effectiveScale)}px`,
              fontSize: `${(editingText.fontSize || 16) * effectiveScale}px`,
              fontFamily: editingText.fontFamily,
              fontWeight: editingText.fontStyle?.includes('bold') ? 'bold' : 'normal',
              fontStyle: editingText.fontStyle?.includes('italic') ? 'italic' : 'normal',
              color: editingText.fill || '#ffffff',
              textAlign: (editingText.align as any) || 'left',
              lineHeight: editingText.lineHeight || 1.2,
              letterSpacing: editingText.letterSpacing
                ? `${editingText.letterSpacing * effectiveScale}px`
                : undefined,
              transform: editingText.rotation ? `rotate(${editingText.rotation}deg)` : undefined,
              transformOrigin: 'top left',
              background: 'rgba(15, 23, 42, 0.85)',
              backdropFilter: 'blur(6px)',
              border: '2px solid #84a92c',
              borderRadius: '8px',
              outline: 'none',
              resize: 'both',
              padding: '4px 6px',
              zIndex: 100,
              boxShadow: '0 0 20px rgba(132, 169, 44, 0.4)',
            }}
            autoFocus
          />
        )}
      </div>

      {/* Floating Canvas Zoom & View Controls Toolbar (Bottom Right) */}
      <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5 bg-[#18191b]/90 backdrop-blur-md border border-slate-700/80 p-1.5 px-2.5 rounded-xl shadow-xl text-xs">
        <button
          onClick={() => setCurrentZoom(prev => Math.max(0.4, Number((prev / 1.15).toFixed(2))))}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Zoom Out (Ctrl+Minus)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setCurrentZoom(1)}
          className="px-2 py-0.5 rounded-md hover:bg-white/10 text-slate-200 hover:text-[#9fe870] font-mono font-bold transition-colors cursor-pointer text-[11px]"
          title="Reset Zoom to 100%"
        >
          {Math.round(currentZoom * 100)}%
        </button>
        <button
          onClick={() => setCurrentZoom(prev => Math.min(3.5, Number((prev * 1.15).toFixed(2))))}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Zoom In (Ctrl+Plus)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-3.5 bg-slate-700 mx-0.5" />
        <button
          onClick={() => setCurrentZoom(1)}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Fit to Screen"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Drag overlay notice */}
      {isDragOver && !hoveredFrameId && (
        <div className="absolute inset-0 bg-[#84a92c]/20 backdrop-blur-xs rounded-2xl flex items-center justify-center pointer-events-none">
          <div className="bg-slate-950/90 text-[#9fe870] font-bold px-4 py-2 rounded-xl text-xs shadow-xl border border-[#84a92c]">
            Drop image to place directly on Card Canvas!
          </div>
        </div>
      )}
    </div>
  );
}
