import React from 'react';
import { Camera, User } from 'lucide-react';

// ==============================================================================
// Standard Photo Sizes & Frame Mask Definitions for ID Systems
// ==============================================================================

export interface StandardPhotoSizeDef {
  id: string;
  name: string;
  dimensionText: string;
  width: number;
  height: number;
  aspect: string;
  shape: 'rect' | 'rounded' | 'circle' | 'arch';
  cornerRadius?: number;
}

export const STANDARD_PHOTO_SIZES: StandardPhotoSizeDef[] = [
  {
    id: 'photo-passport-us',
    name: 'Passport Photo (2×2")',
    dimensionText: '51×51mm • 600×600px',
    width: 160,
    height: 160,
    aspect: '1:1',
    shape: 'rounded',
    cornerRadius: 6,
  },
  {
    id: 'photo-id-portrait',
    name: 'Standard ID Portrait',
    dimensionText: '35×45mm • 413×531px',
    width: 140,
    height: 180,
    aspect: '35×45mm',
    shape: 'rounded',
    cornerRadius: 8,
  },
  {
    id: 'photo-driver-license',
    name: 'Driver License / Access',
    dimensionText: '30×40mm • 354×472px',
    width: 135,
    height: 180,
    aspect: '30×40mm',
    shape: 'rounded',
    cornerRadius: 8,
  },
  {
    id: 'photo-full-body',
    name: 'Cardholder 3:4 Portrait',
    dimensionText: '450×600px • 3:4 Ratio',
    width: 150,
    height: 200,
    aspect: '3:4',
    shape: 'rounded',
    cornerRadius: 10,
  },
  {
    id: 'photo-circle-badge',
    name: 'Circle Badge Avatar',
    dimensionText: '1:1 Round Avatar',
    width: 150,
    height: 150,
    aspect: '1:1',
    shape: 'circle',
  },
  {
    id: 'photo-arch-executive',
    name: 'Executive Arch Portrait',
    dimensionText: '150×200px Arched Portal',
    width: 150,
    height: 200,
    aspect: 'Arch',
    shape: 'arch',
  },
];

export interface CanvaFrameDef {
  id: string;
  name: string;
  category: 'basic' | 'geometric' | 'decorative' | 'arrows';
  path: string; // SVG path data normalized to 100x100 box
  defaultWidth: number;
  defaultHeight: number;
  cornerRadius?: number;
}

export const CANVA_FRAMES: CanvaFrameDef[] = [
  {
    id: 'frame-circle',
    name: 'Circle Frame',
    category: 'basic',
    path: 'M 50,0 A 50,50 0 1,1 50,100 A 50,50 0 1,1 50,0 Z',
    defaultWidth: 160,
    defaultHeight: 160,
  },
  {
    id: 'frame-squircle',
    name: 'Rounded Squircle',
    category: 'basic',
    path: 'M 20,0 L 80,0 Q 100,0 100,20 L 100,80 Q 100,100 80,100 L 20,100 Q 0,100 0,80 L 0,20 Q 0,0 20,0 Z',
    defaultWidth: 160,
    defaultHeight: 160,
  },
  {
    id: 'frame-arch',
    name: 'Arch Portal Frame',
    category: 'decorative',
    path: 'M 0,100 L 0,45 Q 0,0 50,0 Q 100,0 100,45 L 100,100 Z',
    defaultWidth: 150,
    defaultHeight: 200,
  },
  {
    id: 'frame-shield',
    name: 'Security Shield Frame',
    category: 'geometric',
    path: 'M 50,5 L 90,15 L 90,55 Q 90,85 50,95 Q 10,85 10,55 L 10,15 Z',
    defaultWidth: 160,
    defaultHeight: 180,
  },
  {
    id: 'frame-heart',
    name: 'Heart Frame',
    category: 'decorative',
    path: 'M 50,88 A 24,24 0 0,1 10,48 Q 10,22 34,14 A 20,20 0 0,1 50,26 A 20,20 0 0,1 66,14 Q 90,22 90,48 A 24,24 0 0,1 50,88 Z',
    defaultWidth: 170,
    defaultHeight: 160,
  },
  {
    id: 'frame-cloud',
    name: 'Cloud Frame',
    category: 'decorative',
    path: 'M 25,65 Q 10,65 10,50 Q 10,35 25,35 Q 28,18 45,18 Q 62,18 68,32 Q 78,28 85,38 Q 92,48 85,60 Q 88,65 80,65 Z',
    defaultWidth: 180,
    defaultHeight: 130,
  },
  {
    id: 'frame-star',
    name: '5-Point Star Frame',
    category: 'geometric',
    path: 'M 50,0 L 63,35 L 100,35 L 70,57 L 82,92 L 50,70 L 18,92 L 30,57 L 0,35 L 37,35 Z',
    defaultWidth: 160,
    defaultHeight: 160,
  },
  {
    id: 'frame-diamond',
    name: 'Diamond Frame',
    category: 'geometric',
    path: 'M 50,0 L 100,50 L 50,100 L 0,50 Z',
    defaultWidth: 160,
    defaultHeight: 160,
  },
  {
    id: 'frame-hexagon',
    name: 'Hexagon Frame',
    category: 'geometric',
    path: 'M 25,5 L 75,5 L 100,50 L 75,95 L 25,95 L 0,50 Z',
    defaultWidth: 160,
    defaultHeight: 160,
  },
  {
    id: 'frame-speech-square',
    name: 'Speech Bubble Square',
    category: 'decorative',
    path: 'M 10,10 L 90,10 Q 95,10 95,15 L 95,65 Q 95,70 90,70 L 40,70 L 20,90 L 25,70 L 10,70 Q 5,70 5,65 L 5,15 Q 5,10 10,10 Z',
    defaultWidth: 170,
    defaultHeight: 150,
  },
];

/**
 * Standard Photo Size Card Button for Toolbar (Canva-style Sky + Cloud + Green Hills)
 */
export function StandardPhotoSizeCard({
  item,
  onClick,
}: {
  item: StandardPhotoSizeDef;
  onClick: () => void;
  selected?: boolean;
}) {
  const clipId = `std-photo-clip-${item.id}`;

  return (
    <button
      onClick={onClick}
      className="w-full p-2.5 rounded-2xl bg-[var(--bg-elevated)] hover:bg-[#84a92c]/10 border border-[var(--border-primary)] hover:border-[#84a92c] transition-all text-left flex items-center justify-between gap-2.5 cursor-pointer shadow-xs group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-12 rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:border-[#84a92c] transition-all overflow-hidden p-0.5">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id={`sky-${item.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#7bb7fa" />
                <stop offset="60%" stopColor="#bce6fb" />
                <stop offset="100%" stopColor="#e3f4fc" />
              </linearGradient>
              <clipPath id={clipId}>
                {item.shape === 'circle' ? (
                  <circle cx="50" cy="50" r="45" />
                ) : item.shape === 'arch' ? (
                  <path d="M 10 90 L 10 45 Q 10 10 50 10 Q 90 10 90 45 L 90 90 Z" />
                ) : (
                  <rect x="5" y="5" width="90" height="90" rx={item.cornerRadius ? item.cornerRadius * 1.5 : 8} />
                )}
              </clipPath>
            </defs>
            <g clipPath={`url(#${clipId})`}>
              <rect width="100" height="100" fill={`url(#sky-${item.id})`} />
              {/* White Cloud */}
              <path d="M 45 22 Q 35 22 35 30 Q 30 30 30 36 Q 30 42 37 42 L 67 42 Q 74 42 74 36 Q 74 31 68 30 Q 68 22 58 22 Q 52 22 45 22 Z" fill="#ffffff" opacity="0.95" />
              {/* Rolling Hills */}
              <path d="M -10 110 Q 30 55 70 80 Q 90 95 110 110 Z" fill="#8dc63f" />
              <path d="M 110 110 Q 70 60 20 75 Q 0 80 -10 110 Z" fill="#689f1f" />
            </g>
          </svg>
        </div>
        <div className="min-w-0">
          <span className="font-bold text-xs text-[var(--text-primary)] block group-hover:text-[#84a92c] transition-colors truncate">
            {item.name}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono block truncate">
            {item.dimensionText}
          </span>
        </div>
      </div>
      <span className="text-[10px] font-bold text-[#84a92c] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        + Add
      </span>
    </button>
  );
}

/**
 * Geometric / Decorative Frame Thumbnail for Toolbar (Classic Canva Sky + Cloud + Rolling Hills)
 */
export function CanvaFrameThumbnail({
  frame,
  onClick,
}: {
  frame: CanvaFrameDef;
  onClick: () => void;
}) {
  const clipId = `clip-${frame.id}`;
  const gradId = `sky-grad-${frame.id}`;

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center justify-center p-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[#84a92c]/10 border border-[var(--border-primary)] hover:border-[#84a92c] transition-all cursor-pointer shadow-xs aspect-square overflow-hidden"
      title={frame.name}
    >
      <div className="w-full h-full max-w-[64px] max-h-[64px] flex items-center justify-center relative">
        <svg viewBox="0 0 100 100" className="w-full h-full filter drop-shadow-sm transition-transform group-hover:scale-105">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#7bb7fa" />
              <stop offset="60%" stopColor="#bce6fb" />
              <stop offset="100%" stopColor="#e3f4fc" />
            </linearGradient>
            <clipPath id={clipId}>
              <path d={frame.path} />
            </clipPath>
          </defs>

          {/* Authentic Canva-Style Frame Illustration: Sky + Fluffy Cloud + Rolling Green Hills */}
          <g clipPath={`url(#${clipId})`}>
            {/* Sky Background */}
            <rect width="100" height="100" fill={`url(#${gradId})`} />
            {/* Soft White Cloud */}
            <path
              d="M 45 22 Q 35 22 35 30 Q 30 30 30 36 Q 30 42 37 42 L 67 42 Q 74 42 74 36 Q 74 31 68 30 Q 68 22 58 22 Q 52 22 45 22 Z"
              fill="#ffffff"
              opacity="0.95"
            />
            {/* Back Rolling Grassy Hill */}
            <path
              d="M -10 110 Q 30 55 70 80 Q 90 95 110 110 Z"
              fill="#8dc63f"
            />
            {/* Front Rolling Green Hill */}
            <path
              d="M 110 110 Q 70 60 20 75 Q 0 80 -10 110 Z"
              fill="#689f1f"
            />
          </g>
        </svg>
      </div>
      <span className="text-[9px] font-bold text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors truncate w-full text-center mt-1">
        {frame.name.replace(' Frame', '')}
      </span>
    </button>
  );
}
