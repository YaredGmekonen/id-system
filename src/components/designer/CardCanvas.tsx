import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Stage, Layer, Rect, Text, Image, Circle, Transformer, Group, Line } from 'react-konva';
import type Konva from 'konva';
import useImage from 'use-image';
import { CARD } from '../../design-tokens';
import type { CanvasElement } from '../../db/database';

import { Arrow } from 'react-konva';

interface CardCanvasProps {
  elements: CanvasElement[];
  backgroundColor: string;
  selectedId: string | null;
  selectedIds?: string[];
  onSelect: (id: string | null, multi?: boolean) => void;
  onElementUpdate: (id: string, changes: Partial<CanvasElement>) => void;
  onAddDroppedImage?: (element: CanvasElement) => void;
  scale?: number;
  cardWidth?: number;
  cardHeight?: number;
  snapToGrid?: boolean;
  gridSize?: number;
}

// Helper component for rendering images on canvas
function CanvasImage({ element, isSelected, onSelect, onChange }: {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: (e?: any) => void;
  onChange: (changes: Partial<CanvasElement>) => void;
}) {
  const [image] = useImage(element.src || '', 'anonymous');

  return (
    <Image
      id={element.id}
      image={image}
      x={element.x}
      y={element.y}
      width={element.width || 100}
      height={element.height || 100}
      rotation={element.rotation || 0}
      opacity={element.opacity ?? 1}
      draggable={!element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({ x: e.target.x(), y: e.target.y() });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x(),
          y: node.y(),
          width: Math.max(20, (node.width() || 100) * scaleX),
          height: Math.max(20, (node.height() || 100) * scaleY),
          rotation: node.rotation(),
        });
      }}
    />
  );
}

// Photo placeholder component
function PhotoPlaceholder({ element, isSelected, onSelect, onChange }: {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: (e?: any) => void;
  onChange: (changes: Partial<CanvasElement>) => void;
}) {
  const rad = element.cornerRadius !== undefined ? element.cornerRadius : 8;
  const strokeColor = isSelected ? '#84a92c' : (element.stroke || '#10b981');
  const strokeW = isSelected ? 3 : (element.strokeWidth || 1.5);

  return (
    <Group
      id={element.id}
      x={element.x}
      y={element.y}
      draggable={!element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({ x: e.target.x(), y: e.target.y() });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x(),
          y: node.y(),
          width: Math.max(30, (element.width || 140) * scaleX),
          height: Math.max(30, (element.height || 170) * scaleY),
          rotation: node.rotation(),
        });
      }}
    >
      <Rect
        width={element.width || 140}
        height={element.height || 170}
        fill={element.fill || '#1e293b'}
        cornerRadius={rad}
        stroke={strokeColor}
        strokeWidth={strokeW}
      />
      <Circle
        x={(element.width || 140) / 2}
        y={(element.height || 170) * 0.38}
        radius={Math.min((element.width || 140), (element.height || 170)) * 0.18}
        fill="#334155"
      />
      <Rect
        x={(element.width || 140) * 0.25}
        y={(element.height || 170) * 0.6}
        width={(element.width || 140) * 0.5}
        height={(element.height || 170) * 0.3}
        cornerRadius={[(element.width || 140) * 0.25, (element.width || 140) * 0.25, 0, 0]}
        fill="#334155"
      />
      <Text
        text="PERSONNEL PHOTO"
        x={0}
        y={(element.height || 170) * 0.82}
        width={element.width || 140}
        align="center"
        fontSize={8}
        fontFamily="Inter"
        fontStyle="bold"
        fill="#94a3b8"
      />
    </Group>
  );
}

// Line / Arrow Component
function CanvasLineOrArrow({ element, isSelected, onSelect, onChange }: {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: (e?: any) => void;
  onChange: (changes: Partial<CanvasElement>) => void;
}) {
  const pts = element.points && element.points.length >= 4 ? element.points : [0, 0, element.width || 150, element.height || 0];
  const strokeColor = isSelected ? '#84a92c' : (element.stroke || element.fill || '#0f172a');
  const strokeW = isSelected ? Math.max(3, (element.strokeWidth || 2) + 1) : (element.strokeWidth || 2);
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
      opacity={element.opacity ?? 1}
      rotation={element.rotation || 0}
      draggable={!element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
    />
  );
}

// Real Scannable QR Code Component (generates actual QR, cached)
function CanvasQRCode({ element, isSelected, onSelect, onChange }: {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (changes: Partial<CanvasElement>) => void;
}) {
  const size = element.width || 100;
  const payload = element.qrPayload || 'PREVIEW-QR';
  const [qrImage, setQrImage] = React.useState<HTMLImageElement | null>(null);

  // Only regenerate when payload or size changes — NOT on position/rotation
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { generateQrDataUrl } = await import('../../engine/barcodeQr');
        const dataUrl = await generateQrDataUrl(payload, Math.round(size));
        if (cancelled) return;
        const img = new window.Image();
        img.onload = () => { if (!cancelled) setQrImage(img); };
        img.src = dataUrl;
      } catch (err) {
        console.warn('[CanvasQRCode] Failed to generate QR preview:', err);
      }
    })();
    return () => { cancelled = true; };
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
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x(),
          y: node.y(),
          width: Math.max(40, size * scaleX),
          height: Math.max(40, size * scaleX),
          rotation: node.rotation(),
        });
      }}
    >
      <Rect width={size} height={size} fill={element.fill || '#FFFFFF'} cornerRadius={4} stroke={isSelected ? '#84a92c' : '#cbd5e1'} strokeWidth={isSelected ? 2 : 1} />
      {qrImage ? (
        <Image
          image={qrImage}
          x={2}
          y={2}
          width={size - 4}
          height={size - 4}
        />
      ) : (
        <Text
          text="QR..."
          x={0}
          y={size / 2 - 8}
          width={size}
          align="center"
          fontSize={12}
          fontFamily="Inter"
          fill="#94a3b8"
        />
      )}
    </Group>
  );
}

// Real Code 128 Barcode Component (generates actual barcode, cached)
function CanvasRealBarcode({ element, isSelected, onSelect, onChange }: {
  element: CanvasElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (changes: Partial<CanvasElement>) => void;
}) {
  const w = element.width || 220;
  const h = element.height || 50;
  const payload = element.dataField || 'PREVIEW-BC';
  const [barcodeImage, setBarcodeImage] = React.useState<HTMLImageElement | null>(null);

  // Only regenerate when payload or dimensions change — NOT on position/rotation
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { generateBarcodeDataUrl } = await import('../../engine/barcodeQr');
        const dataUrl = await generateBarcodeDataUrl(payload, Math.round(w), Math.round(h), false);
        if (cancelled) return;
        const img = new window.Image();
        img.onload = () => { if (!cancelled) setBarcodeImage(img); };
        img.src = dataUrl;
      } catch (err) {
        console.warn('[CanvasRealBarcode] Failed to generate barcode preview:', err);
      }
    })();
    return () => { cancelled = true; };
  }, [payload, w, h]);

  return (
    <Group
      id={element.id}
      x={element.x}
      y={element.y}
      draggable={!element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => onChange({ x: e.target.x(), y: e.target.y() })}
      onTransformEnd={(e) => {
        const node = e.target;
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          x: node.x(),
          y: node.y(),
          width: Math.max(60, w * scaleX),
          height: Math.max(20, h * scaleY),
          rotation: node.rotation(),
        });
      }}
    >
      <Rect width={w} height={h} fill="#FFFFFF" cornerRadius={3} stroke={isSelected ? '#84a92c' : '#cbd5e1'} strokeWidth={isSelected ? 2 : 1} />
      {barcodeImage ? (
        <Image
          image={barcodeImage}
          x={2}
          y={2}
          width={w - 4}
          height={h - 4}
        />
      ) : (
        <Text
          text="Barcode..."
          x={0}
          y={h / 2 - 8}
          width={w}
          align="center"
          fontSize={10}
          fontFamily="Inter"
          fill="#94a3b8"
        />
      )}
    </Group>
  );
}

export default function CardCanvas({
  elements,
  backgroundColor,
  selectedId,
  selectedIds = [],
  onSelect,
  onElementUpdate,
  onAddDroppedImage,
  scale = CARD.DISPLAY_SCALE,
  cardWidth = CARD.WIDTH_PX,
  cardHeight = CARD.HEIGHT_PX,
  snapToGrid = false,
  gridSize = 10,
}: CardCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const stageSize = {
    width: cardWidth * scale,
    height: cardHeight * scale,
  };

  // Update transformer when selection changes (supports single or multi-selection)
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;

    const activeSelection = selectedIds.length > 0 ? selectedIds : (selectedId ? [selectedId] : []);
    if (activeSelection.length > 0) {
      const nodes = activeSelection
        .map(id => stage.findOne('#' + id))
        .filter(Boolean) as Konva.Node[];

      if (nodes.length > 0) {
        transformer.nodes(nodes);
        transformer.getLayer()?.batchDraw();
        return;
      }
    }
    transformer.nodes([]);
    transformer.getLayer()?.batchDraw();
  }, [selectedId, selectedIds, elements]);

  // Click on empty area to deselect
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage() || e.target.attrs?.id === 'card-bg') {
      onSelect(null);
    }
  }, [onSelect]);

  // Handle Drag & Drop file onto Canvas
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const newImgElement: CanvasElement = {
        id: `img-drop-${Date.now()}`,
        type: 'image',
        x: 60,
        y: 60,
        width: 160,
        height: 160,
        src: dataUrl,
        opacity: 1,
        visible: true,
        locked: false,
        name: `Dropped Asset (${file.name})`,
      };
      onAddDroppedImage?.(newImgElement);
    };
    reader.readAsDataURL(file);
  };

  const snapCoord = (val: number) => {
    if (!snapToGrid) return val;
    return Math.round(val / gridSize) * gridSize;
  };

  const renderElement = (el: CanvasElement) => {
    const isSelected = selectedId === el.id || selectedIds.includes(el.id);
    const selectThis = (e?: any) => {
      const isMulti = e?.evt?.shiftKey || false;
      onSelect(el.id, isMulti);
    };
    const updateThis = (changes: Partial<CanvasElement>) => onElementUpdate(el.id, changes);

    if (el.visible === false) return null;

    switch (el.type) {
      case 'text':
      case 'dataField':
        return (
          <Text
            key={el.id}
            id={el.id}
            x={el.x}
            y={el.y}
            text={el.text || ''}
            fontSize={el.fontSize || 16}
            fontFamily={el.fontFamily || 'Inter'}
            fontStyle={el.fontStyle || 'normal'}
            fill={el.fill || '#ffffff'}
            align={el.align || 'left'}
            width={el.width}
            opacity={el.opacity ?? 1}
            rotation={el.rotation || 0}
            textDecoration={el.textDecoration}
            draggable={!el.locked}
            onClick={selectThis}
            onTap={selectThis}
            onDragEnd={(e) => updateThis({ x: snapCoord(e.target.x()), y: snapCoord(e.target.y()) })}
            onTransformEnd={(e) => {
              const node = e.target;
              const scaleX = node.scaleX();
              node.scaleX(1);
              node.scaleY(1);
              updateThis({
                x: node.x(),
                y: node.y(),
                width: Math.max(20, (node.width() || 100) * scaleX),
                rotation: node.rotation(),
              });
            }}
          />
        );

      case 'rect':
        return (
          <Rect
            key={el.id}
            id={el.id}
            x={el.x}
            y={el.y}
            width={el.width || 100}
            height={el.height || 60}
            fill={el.fill || '#4f46e5'}
            stroke={el.stroke}
            strokeWidth={el.strokeWidth}
            cornerRadius={el.cornerRadius || 0}
            opacity={el.opacity ?? 1}
            rotation={el.rotation || 0}
            draggable={!el.locked}
            onClick={selectThis}
            onTap={selectThis}
            onDragEnd={(e) => updateThis({ x: snapCoord(e.target.x()), y: snapCoord(e.target.y()) })}
            onTransformEnd={(e) => {
              const node = e.target;
              const scaleX = node.scaleX();
              const scaleY = node.scaleY();
              node.scaleX(1);
              node.scaleY(1);
              updateThis({
                x: node.x(),
                y: node.y(),
                width: Math.max(10, (node.width() || 100) * scaleX),
                height: Math.max(10, (node.height() || 60) * scaleY),
                rotation: node.rotation(),
              });
            }}
          />
        );

      case 'circle':
        return (
          <Circle
            key={el.id}
            id={el.id}
            x={el.x + (el.radius || 40)}
            y={el.y + (el.radius || 40)}
            radius={el.radius || 40}
            fill={el.fill || '#4f46e5'}
            stroke={el.stroke}
            strokeWidth={el.strokeWidth}
            opacity={el.opacity ?? 1}
            draggable={!el.locked}
            onClick={selectThis}
            onTap={selectThis}
            onDragEnd={(e) => updateThis({ x: snapCoord(e.target.x() - (el.radius || 40)), y: snapCoord(e.target.y() - (el.radius || 40)) })}
            onTransformEnd={(e) => {
              const node = e.target;
              const scaleX = node.scaleX();
              node.scaleX(1);
              node.scaleY(1);
              updateThis({
                x: node.x() - (el.radius || 40),
                y: node.y() - (el.radius || 40),
                radius: Math.max(10, (el.radius || 40) * scaleX),
              });
            }}
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
        return (
          <PhotoPlaceholder
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

      case 'qr':
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

      default:
        return null;
    }
  };

  return (
    <div
      className="flex items-center justify-center relative"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleFileDrop}
    >
      <div
        className={`relative rounded-xl overflow-hidden shadow-2xl transition-all border ${
          isDragOver ? 'ring-4 ring-[#84a92c] scale-[1.02]' : 'border-slate-300'
        }`}
        style={{ width: stageSize.width, height: stageSize.height }}
      >
        {/* Subtle grid background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, #94a3b830 1px, transparent 1px)',
            backgroundSize: `${snapToGrid ? gridSize : 16}px ${snapToGrid ? gridSize : 16}px`,
          }}
        />

        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          scaleX={scale}
          scaleY={scale}
          onClick={handleStageClick}
          onTap={handleStageClick}
        >
          <Layer>
            {/* Card background */}
            <Rect
              id="card-bg"
              x={0}
              y={0}
              width={cardWidth}
              height={cardHeight}
              fill={backgroundColor}
              cornerRadius={14}
            />

            {/* Elements */}
            {elements.map(renderElement)}

            {/* Selection transformer */}
            <Transformer
              ref={transformerRef}
              boundBoxFunc={(_, newBox) => ({
                ...newBox,
                width: Math.max(20, newBox.width),
                height: Math.max(20, newBox.height),
              })}
              borderStroke="#84a92c"
              borderStrokeWidth={2}
              anchorStroke="#84a92c"
              anchorFill="#ffffff"
              anchorSize={8}
              anchorCornerRadius={2}
            />
          </Layer>
        </Stage>
      </div>

      {/* Drag overlay notice */}
      {isDragOver && (
        <div className="absolute inset-0 bg-[#84a92c]/20 backdrop-blur-xs rounded-xl flex items-center justify-center pointer-events-none">
          <div className="bg-slate-950/90 text-[#9fe870] font-bold px-4 py-2 rounded-xl text-xs shadow-xl border border-[#84a92c]">
            Drop image to place directly on Card Canvas!
          </div>
        </div>
      )}
    </div>
  );
}
