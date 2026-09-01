import React, { useState, useEffect, useRef } from 'react';
import { X, Download, RotateCw, Sparkles } from 'lucide-react';
import type { CardTemplate, Person } from '../../db/database';
import { renderCardLayout, getCachedImage } from '../../engine/cardRenderer';

interface CardMockupModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: CardTemplate | null;
  person?: Person | null;
}

type MockupScene = 'lanyard' | 'desk' | 'sleeve';

export default function CardMockupModal({
  isOpen,
  onClose,
  template,
  person,
}: CardMockupModalProps) {
  const [scene, setScene] = useState<MockupScene>('lanyard');
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [lanyardColor, setLanyardColor] = useState('#1E293B');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const renderMockup = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = 1000;
      const H = 800;
      canvas.width = W;
      canvas.height = H;

      // 1. Scene Background
      if (scene === 'lanyard') {
        const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 600);
        bgGrad.addColorStop(0, '#1e293b');
        bgGrad.addColorStop(1, '#090d16');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Subtle fabric mesh texture in background
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 30) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, H);
          ctx.stroke();
        }
      } else if (scene === 'desk') {
        const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(0.65, '#1e293b');
        bgGrad.addColorStop(0.66, '#334155');
        bgGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        // Desk wood/stone ambient grain line
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.fillRect(0, H * 0.65, W, 4);
      } else {
        // Sleeve
        const bgGrad = ctx.createRadialGradient(W / 2, H / 2, 80, W / 2, H / 2, 550);
        bgGrad.addColorStop(0, '#111827');
        bgGrad.addColorStop(1, '#030712');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);
      }

      // 2. Render Card to offscreen data URL
      const isVertical = template?.orientation === 'vertical';
      const cardW = isVertical ? 638 : 1012;
      const cardH = isVertical ? 1012 : 638;

      const rawElements = activeSide === 'front' ? (template?.frontElements || template?.elements || []) : (template?.backElements || []);
      const bgColor = activeSide === 'front' ? (template?.backgroundColor || '#ffffff') : (template?.backBackgroundColor || '#ffffff');

      // Fallback sample elements if template is empty
      const fallbackElements = [
        { id: 'b1', type: 'rect' as const, x: 0, y: 0, width: cardW, height: 75, fill: '#0f172a', name: 'Header' },
        { id: 't1', type: 'text' as const, x: 30, y: 25, text: 'SILICONLABS ENTERPRISE PASS', fontSize: 16, fontStyle: 'bold', fill: '#9fe870', name: 'Title' },
        { id: 'p1', type: 'photo' as const, x: 40, y: 110, width: 170, height: 210, dataField: '{{photo}}', fill: '#1e293b', name: 'Photo' },
        { id: 'n1', type: 'dataField' as const, x: 240, y: 120, text: '{{full_name}}', dataField: '{{full_name}}', fontSize: 24, fontStyle: 'bold', fill: '#0f172a', name: 'Name' },
        { id: 'r1', type: 'dataField' as const, x: 240, y: 160, text: 'ROLE: {{role}}', dataField: 'ROLE: {{role}}', fontSize: 14, fontStyle: 'bold', fill: '#059669', name: 'Role' },
        { id: 'd1', type: 'dataField' as const, x: 240, y: 195, text: 'DEPT: {{department}}', dataField: 'DEPT: {{department}}', fontSize: 13, fontStyle: 'semibold', fill: '#475569', name: 'Dept' },
        { id: 'id1', type: 'dataField' as const, x: 240, y: 230, text: 'ID: {{id_number}}', dataField: 'ID: {{id_number}}', fontSize: 13, fontStyle: 'bold', fill: '#0f172a', name: 'ID' },
        { id: 'qr1', type: 'qr' as const, x: 480, y: 120, width: 120, height: 120, qrPayload: '{{id_number}}', name: 'QR' },
        { id: 'bc1', type: 'barcode' as const, x: 240, y: 275, width: 220, height: 45, dataField: '{{id_number}}', name: 'Barcode' },
      ];

      const elements = rawElements.length > 0 ? rawElements : fallbackElements;

      const personData: Person = person || {
        fullName: 'Alex Vance',
        idNumber: 'SL-2026-0819',
        role: 'Senior System Engineer',
        department: 'Embedded Systems & AI Lab',
        category: 'Employees',
        phone: '+1 (555) 234-5678',
        email: 'alex.vance@siliconlabs.com',
        bloodGroup: 'O+',
        joinedDate: '2024-01-15',
        photoDataUrl: '',
        status: 'Active',
        createdAt: new Date(),
      };

      const cardDataUrl = await renderCardLayout(elements, personData, {
        backgroundColor: bgColor,
        widthPx: cardW,
        heightPx: cardH,
        dpiScale: 1,
      });

      const cardCanvas = await getCachedImage(cardDataUrl);

      // 3. Render In Scene Context
      ctx.save();

      if (scene === 'lanyard') {
        const targetW = isVertical ? 340 : 480;
        const targetH = isVertical ? 540 : 303;
        const cx = W / 2;
        const cy = H / 2 + 50;

        // Lanyard Fabric Strap (Top to Card Clip)
        const strapW = 32;
        ctx.fillStyle = lanyardColor;
        ctx.beginPath();
        ctx.moveTo(cx - strapW / 2 - 40, 0);
        ctx.lineTo(cx - strapW / 2, cy - targetH / 2 - 80);
        ctx.lineTo(cx + strapW / 2, cy - targetH / 2 - 80);
        ctx.lineTo(cx + strapW / 2 + 40, 0);
        ctx.closePath();
        ctx.fill();

        // Stitching on lanyard strap
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(cx - strapW / 2 + 4, 0);
        ctx.lineTo(cx - strapW / 2 + 4, cy - targetH / 2 - 80);
        ctx.moveTo(cx + strapW / 2 - 4, 0);
        ctx.lineTo(cx + strapW / 2 - 4, cy - targetH / 2 - 80);
        ctx.stroke();
        ctx.setLineDash([]);

        // Metal Swivel Clip (Silver Chrome)
        const clipY = cy - targetH / 2 - 60;
        const metalGrad = ctx.createLinearGradient(cx - 20, clipY, cx + 20, clipY + 40);
        metalGrad.addColorStop(0, '#e2e8f0');
        metalGrad.addColorStop(0.5, '#64748b');
        metalGrad.addColorStop(1, '#cbd5e1');

        ctx.fillStyle = metalGrad;
        ctx.beginPath();
        ctx.roundRect(cx - 14, clipY - 20, 28, 16, 4);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, clipY + 10, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.roundRect(cx - 10, clipY + 18, 20, 30, 4);
        ctx.fill();

        // Plastic Clear Pouch Frame
        const pouchPad = 18;
        const pouchX = cx - targetW / 2 - pouchPad;
        const pouchY = cy - targetH / 2 - pouchPad - 15;
        const pouchW = targetW + pouchPad * 2;
        const pouchH = targetH + pouchPad * 2 + 15;

        // Card Drop Shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        ctx.shadowBlur = 35;
        ctx.shadowOffsetY = 25;

        // Pouch Backing
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(pouchX, pouchY, pouchW, pouchH, 16);
        ctx.fill();
        ctx.stroke();

        ctx.shadowColor = 'transparent';

        // Pouch Hang Hole
        ctx.fillStyle = '#090d16';
        ctx.beginPath();
        ctx.roundRect(cx - 18, pouchY + 8, 36, 10, 5);
        ctx.fill();

        // The ID Card itself
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(cx - targetW / 2, cy - targetH / 2, targetW, targetH, 10);
        ctx.clip();
        ctx.drawImage(cardCanvas, cx - targetW / 2, cy - targetH / 2, targetW, targetH);
        ctx.restore();

        // Gloss Sheen across clear PVC pouch
        const glossGrad = ctx.createLinearGradient(pouchX, pouchY, pouchX + pouchW, pouchY + pouchH);
        glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        glossGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.08)');
        glossGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
        glossGrad.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
        glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = glossGrad;
        ctx.beginPath();
        ctx.roundRect(pouchX, pouchY, pouchW, pouchH, 16);
        ctx.fill();
      } else if (scene === 'desk') {
        const targetW = isVertical ? 320 : 460;
        const targetH = isVertical ? 508 : 290;
        const cx = W / 2;
        const cy = H * 0.58;

        // Acrylic Slanted Desk Stand
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 30;

        // Acrylic Base (Bottom Block)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(cx - targetW / 2 - 25, cy + targetH / 2 - 10, targetW + 50, 45, 8);
        ctx.fill();
        ctx.stroke();

        ctx.shadowColor = 'transparent';

        // Card tilted slightly
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(cx - targetW / 2, cy - targetH / 2, targetW, targetH, 12);
        ctx.clip();
        ctx.drawImage(cardCanvas, cx - targetW / 2, cy - targetH / 2, targetW, targetH);
        ctx.restore();

        // Front Acrylic Plate (Slanted reflection)
        const acrylicGloss = ctx.createLinearGradient(cx - targetW / 2, cy - targetH / 2, cx + targetW / 2, cy + targetH / 2);
        acrylicGloss.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        acrylicGloss.addColorStop(0.4, 'rgba(255, 255, 255, 0.05)');
        acrylicGloss.addColorStop(0.7, 'rgba(255, 255, 255, 0.2)');
        acrylicGloss.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = acrylicGloss;
        ctx.beginPath();
        ctx.roundRect(cx - targetW / 2 - 10, cy - targetH / 2 - 10, targetW + 20, targetH + 20, 14);
        ctx.fill();
      } else {
        // Rigid Security Sleeve
        const targetW = isVertical ? 330 : 470;
        const targetH = isVertical ? 524 : 296;
        const cx = W / 2;
        const cy = H / 2;

        // Rigid Plastic Case
        const casePad = 14;
        const caseX = cx - targetW / 2 - casePad;
        const caseY = cy - targetH / 2 - casePad;
        const caseW = targetW + casePad * 2;
        const caseH = targetH + casePad * 2;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
        ctx.shadowBlur = 45;
        ctx.shadowOffsetY = 25;

        // Frosted Heavy Shell
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(caseX, caseY, caseW, caseH, 18);
        ctx.fill();
        ctx.stroke();

        ctx.shadowColor = 'transparent';

        // Thumb extraction notch on back
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(cx, caseY + 12, 16, 0, Math.PI);
        ctx.fill();

        // Card inside
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(cx - targetW / 2, cy - targetH / 2, targetW, targetH, 8);
        ctx.clip();
        ctx.drawImage(cardCanvas, cx - targetW / 2, cy - targetH / 2, targetW, targetH);
        ctx.restore();

        // Security watermark overlay
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(caseX, caseY);
        ctx.lineTo(caseX + caseW, caseY + caseH);
        ctx.stroke();
      }

      ctx.restore();
    };

    renderMockup();
  }, [isOpen, scene, activeSide, lanyardColor, template, person]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsExporting(true);
    try {
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${template?.name || 'id-card'}-mockup-${scene}.png`;
      a.click();
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-sans select-none">
      {/* Modal Card */}
      <div
        className="relative w-full max-w-5xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-primary)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Header */}
        <div
          className="p-3 sm:p-4 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-6 sm:pr-0">
            <div className="w-8 h-8 rounded-xl bg-[#84a92c]/20 text-[#84a92c] flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-xs sm:text-sm text-[var(--text-primary)] truncate">
                Realistic ID Card Presentation Mockup
              </h2>
              <p className="text-[10px] sm:text-xs text-[var(--text-muted)] line-clamp-1">
                Preview active design in commercial lanyard pouches, desk stands, and rigid sleeves.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap sm:flex-nowrap">
            {/* Side Flip Toggle */}
            <button
              onClick={() => setActiveSide(prev => (prev === 'front' ? 'back' : 'front'))}
              className="px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 hover:border-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            >
              <RotateCw className="w-3.5 h-3.5 text-[#84a92c]" />
              <span>Flip ({activeSide === 'front' ? 'Back' : 'Front'})</span>
            </button>

            {/* Export PNG */}
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="btn-primary py-1.5 px-3 text-[11px] sm:text-xs font-bold flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Exporting...' : 'Export PNG'}</span>
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scene Selector Bar */}
        <div
          className="px-3 sm:px-4 py-2 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            <span className="text-[11px] font-semibold text-[var(--text-muted)] whitespace-nowrap mr-1">Scene:</span>
            {[
              { key: 'lanyard', label: 'Lanyard Clip' },
              { key: 'desk', label: 'Desk Stand' },
              { key: 'sleeve', label: 'Rigid Sleeve' },
            ].map(s => (
              <button
                key={s.key}
                onClick={() => setScene(s.key as MockupScene)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  scene === s.key
                    ? 'bg-[#84a92c] text-slate-950 shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-white border'
                }`}
                style={{
                  backgroundColor: scene === s.key ? undefined : 'var(--bg-elevated)',
                  borderColor: scene === s.key ? undefined : 'var(--border-primary)',
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {scene === 'lanyard' && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <span className="text-[11px] text-[var(--text-muted)]">Strap Color:</span>
              <div className="flex items-center gap-1.5">
                {[
                  { label: 'Navy', hex: '#1E293B' },
                  { label: 'Royal Blue', hex: '#1D4ED8' },
                  { label: 'Crimson', hex: '#BE123C' },
                  { label: 'Forest', hex: '#15803D' },
                  { label: 'Gold', hex: '#B45309' },
                ].map(c => (
                  <button
                    key={c.hex}
                    onClick={() => setLanyardColor(c.hex)}
                    title={c.label}
                    className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border transition-transform cursor-pointer ${
                      lanyardColor === c.hex ? 'scale-125 border-white ring-2 ring-[#84a92c]' : 'border-slate-700'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mockup Canvas Stage */}
        <div className="flex-1 p-2 sm:p-6 flex items-center justify-center bg-[#070b10] overflow-auto">
          <canvas
            ref={canvasRef}
            className="rounded-xl shadow-2xl w-full max-w-[850px] h-auto max-h-[58vh] object-contain border border-slate-800/80"
          />
        </div>
      </div>
    </div>
  );
}
