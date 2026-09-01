/**
 * Transparent Abstract ID Card Vector Overlays & Modern Accents (Matching Image 1 & Image 5)
 * Pure SVG Data URLs with 100% transparent backgrounds for seamless card layering.
 */

export interface AbstractGraphicItem {
  id: string;
  name: string;
  category: 'mesh' | 'topo' | 'geometric' | 'badge' | 'corner' | 'security' | 'halftone';
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  svgDataUrl: string;
}

// 1. Hexagon Wireframe Honeycomb Grid (Image 1 top-left)
const SVG_HEX_WIREFRAME_GRID = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200" width="240" height="200" fill="none">
  <g stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.85">
    <!-- Row 1 -->
    <polygon points="120,10 150,27 150,62 120,79 90,62 90,27" />
    <polygon points="180,10 210,27 210,62 180,79 150,62 150,27" />
    <!-- Row 2 -->
    <polygon points="60,45 90,62 90,97 60,114 30,97 30,62" />
    <polygon points="120,45 150,62 150,97 120,114 90,97 90,62" />
    <polygon points="180,45 210,62 210,97 180,114 150,97 150,62" />
    <!-- Row 3 -->
    <polygon points="30,80 60,97 60,132 30,149 0,132 0,97" />
    <polygon points="90,80 120,97 120,132 90,149 60,132 60,97" />
    <polygon points="150,80 180,97 180,132 150,149 120,132 120,97" />
    <!-- Row 4 -->
    <polygon points="60,115 90,132 90,167 60,184 30,167 30,132" />
    <polygon points="120,115 150,132 150,167 120,184 90,167 90,132" />
  </g>
</svg>
`)}`;

// 2. Organic Orange Topo Contour Curves (Image 1 top-center)
const SVG_ORGANIC_TOPO_ORANGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 260" width="220" height="260" fill="none">
  <g fill="none" stroke="#f97316" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20,20 C40,90 10,140 30,190 C45,225 35,245 40,255" />
    <path d="M55,20 C85,85 50,125 70,165 C85,195 65,225 75,255" />
    <path d="M90,20 C125,75 80,135 110,185 C130,215 105,240 115,255" />
    <path d="M130,20 C175,65 125,120 160,165 C185,195 155,230 165,255" />
    <path d="M170,20 C210,60 175,100 200,135 C215,160 195,190 205,215" />
  </g>
</svg>
`)}`;

// 3. Dynamic Black Guilloche Wireframe Mesh Ribbon (Image 1 top-right)
const SVG_DYNAMIC_MESH_BLACK = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 140" width="400" height="140" fill="none">
  <defs>
    <linearGradient id="meshGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#334155" stop-opacity="0.8"/>
      <stop offset="50%" stop-color="#0f172a" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#475569" stop-opacity="0.75"/>
    </linearGradient>
  </defs>
  <g stroke="url(#meshGrad)" stroke-width="0.85" opacity="0.9">
    <path d="M 10,70 C 100,10 280,130 390,70" />
    <path d="M 10,65 C 105,15 275,125 390,75" />
    <path d="M 10,60 C 110,20 270,120 390,80" />
    <path d="M 10,55 C 115,25 265,115 390,85" />
    <path d="M 10,50 C 120,30 260,110 390,90" />
    <path d="M 10,75 C 95,5 285,135 390,65" />
    <path d="M 10,80 C 90,0 290,140 390,60" />
    <path d="M 10,85 C 85,-5 295,145 390,55" />
    <path d="M 10,90 C 80,-10 300,150 390,50" />
  </g>
</svg>
`)}`;

// 4. Purple 3D Hexagon Accent Badge with Halftone & Slashes (Image 1 middle-left)
const SVG_PURPLE_HEXAGON_BADGE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="220" height="220" fill="none">
  <defs>
    <linearGradient id="purpHex" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#a855f7"/>
      <stop offset="100%" stop-color="#7e22ce"/>
    </linearGradient>
  </defs>
  <!-- Left Halftone Dot Pattern -->
  <g fill="#475569" opacity="0.75">
    <circle cx="20" cy="70" r="2" /><circle cx="32" cy="70" r="2.5" /><circle cx="44" cy="70" r="3" />
    <circle cx="20" cy="85" r="2" /><circle cx="32" cy="85" r="2.5" /><circle cx="44" cy="85" r="3" />
    <circle cx="20" cy="100" r="2" /><circle cx="32" cy="100" r="2.5" /><circle cx="44" cy="100" r="3" />
    <circle cx="20" cy="115" r="2" /><circle cx="32" cy="115" r="2.5" /><circle cx="44" cy="115" r="3" />
    <circle cx="20" cy="130" r="2" /><circle cx="32" cy="130" r="2.5" /><circle cx="44" cy="130" r="3" />
    <circle cx="20" cy="145" r="2" /><circle cx="32" cy="145" r="2.5" /><circle cx="44" cy="145" r="3" />
  </g>
  <!-- 3D Purple Main Hexagon -->
  <polygon points="120,30 185,68 185,142 120,180 55,142 55,68" fill="url(#purpHex)"/>
  <!-- Top-Right Slash Bars -->
  <line x1="170" y1="40" x2="200" y2="20" stroke="#334155" stroke-width="4.5" stroke-linecap="round" />
  <line x1="180" y1="52" x2="210" y2="32" stroke="#334155" stroke-width="4.5" stroke-linecap="round" />
  <!-- Bottom-Right Slash Bars -->
  <line x1="175" y1="165" x2="175" y2="200" stroke="#334155" stroke-width="4.5" stroke-linecap="round" />
  <line x1="190" y1="155" x2="190" y2="190" stroke="#334155" stroke-width="4.5" stroke-linecap="round" />
</svg>
`)}`;

// 5. Rainbow Spiral Swirl Ribbon (Image 1 center)
const SVG_RAINBOW_SPIRAL_SWIRL = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="320" height="180" fill="none">
  <defs>
    <linearGradient id="swirlRainbow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#eab308"/>
      <stop offset="30%" stop-color="#06b6d4"/>
      <stop offset="65%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#f43f5e"/>
    </linearGradient>
  </defs>
  <g fill="none" stroke="url(#swirlRainbow)" stroke-width="1.8" opacity="0.9">
    <ellipse cx="160" cy="90" rx="35" ry="18" transform="rotate(0 160 90)" />
    <ellipse cx="160" cy="90" rx="42" ry="22" transform="rotate(15 160 90)" />
    <ellipse cx="160" cy="90" rx="50" ry="26" transform="rotate(30 160 90)" />
    <ellipse cx="160" cy="90" rx="60" ry="30" transform="rotate(45 160 90)" />
    <ellipse cx="160" cy="90" rx="70" ry="34" transform="rotate(60 160 90)" />
    <ellipse cx="160" cy="90" rx="80" ry="38" transform="rotate(75 160 90)" />
    <ellipse cx="160" cy="90" rx="90" ry="42" transform="rotate(90 160 90)" />
    <ellipse cx="160" cy="90" rx="100" ry="46" transform="rotate(105 160 90)" />
    <ellipse cx="160" cy="90" rx="110" ry="50" transform="rotate(120 160 90)" />
  </g>
</svg>
`)}`;

// 6. Halftone Matrix Dot Fade (Image 1 middle-right)
const SVG_HALFTONE_MATRIX_FADE = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 120" width="360" height="120" fill="none">
  <g fill="#18181b">
    <circle cx="20" cy="60" r="1"/><circle cx="45" cy="60" r="1.5"/><circle cx="70" cy="60" r="2"/><circle cx="95" cy="60" r="2.5"/><circle cx="120" cy="60" r="3.2"/><circle cx="150" cy="60" r="4"/><circle cx="180" cy="60" r="4.5"/><circle cx="210" cy="60" r="4.8"/><circle cx="240" cy="60" r="4.2"/><circle cx="270" cy="60" r="3.5"/><circle cx="295" cy="60" r="2.8"/><circle cx="320" cy="60" r="1.8"/><circle cx="340" cy="60" r="1"/>
    <circle cx="45" cy="45" r="1"/><circle cx="70" cy="45" r="1.5"/><circle cx="95" cy="45" r="2"/><circle cx="120" cy="45" r="2.8"/><circle cx="150" cy="45" r="3.5"/><circle cx="180" cy="45" r="4"/><circle cx="210" cy="45" r="4.2"/><circle cx="240" cy="45" r="3.6"/><circle cx="270" cy="45" r="3"/><circle cx="295" cy="45" r="2.2"/><circle cx="320" cy="45" r="1.2"/>
    <circle cx="45" cy="75" r="1"/><circle cx="70" cy="75" r="1.5"/><circle cx="95" cy="75" r="2"/><circle cx="120" cy="75" r="2.8"/><circle cx="150" cy="75" r="3.5"/><circle cx="180" cy="75" r="4"/><circle cx="210" cy="75" r="4.2"/><circle cx="240" cy="75" r="3.6"/><circle cx="270" cy="75" r="3"/><circle cx="295" cy="75" r="2.2"/><circle cx="320" cy="75" r="1.2"/>
    <circle cx="95" cy="30" r="1.2"/><circle cx="120" cy="30" r="1.8"/><circle cx="150" cy="30" r="2.5"/><circle cx="180" cy="30" r="3"/><circle cx="210" cy="30" r="3.2"/><circle cx="240" cy="30" r="2.6"/><circle cx="270" cy="30" r="2"/>
    <circle cx="95" cy="90" r="1.2"/><circle cx="120" cy="90" r="1.8"/><circle cx="150" cy="90" r="2.5"/><circle cx="180" cy="90" r="3"/><circle cx="210" cy="90" r="3.2"/><circle cx="240" cy="90" r="2.6"/><circle cx="270" cy="90" r="2"/>
  </g>
</svg>
`)}`;

// 7. Tech Square Pixel Corner Bracket (Image 1 bottom-left)
const SVG_TECH_SQUARE_BRACKET = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160" fill="none">
  <g stroke="#18181b" stroke-width="1.8">
    <polyline points="5,155 5,5 155,5" fill="none" stroke="#18181b" stroke-width="2.5"/>
    <rect x="15" y="15" width="20" height="20" />
    <rect x="45" y="15" width="20" height="20" />
    <rect x="75" y="15" width="20" height="20" />
    <rect x="15" y="45" width="20" height="20" />
    <rect x="45" y="45" width="20" height="20" />
    <rect x="15" y="75" width="20" height="20" />
    <line x1="25" y1="18" x2="25" y2="32" stroke-width="1"/>
    <line x1="18" y1="25" x2="32" y2="25" stroke-width="1"/>
    <line x1="55" y1="18" x2="55" y2="32" stroke-width="1"/>
    <line x1="48" y1="25" x2="62" y2="25" stroke-width="1"/>
    <line x1="25" y1="48" x2="25" y2="62" stroke-width="1"/>
    <line x1="18" y1="55" x2="32" y2="55" stroke-width="1"/>
  </g>
  <g fill="#18181b">
    <circle cx="110" cy="25" r="2.5"/>
    <circle cx="125" cy="25" r="2.5"/>
    <circle cx="140" cy="25" r="2.5"/>
    <circle cx="25" cy="110" r="2.5"/>
    <circle cx="25" cy="125" r="2.5"/>
    <circle cx="25" cy="140" r="2.5"/>
  </g>
</svg>
`)}`;

// 8. Blue 3D Curved Arc Ribbon Banner (Image 1 bottom-center)
const SVG_BLUE_CURVED_ARC_BANNER = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 220" width="260" height="220" fill="none">
  <defs>
    <linearGradient id="blueArcGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.95"/>
      <stop offset="50%" stop-color="#2563eb" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#60a5fa" stop-opacity="0.4"/>
    </linearGradient>
    <linearGradient id="blueArcGlow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#93c5fd" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#1d4ed8" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <path d="M 40,20 C 120,60 190,120 220,190 L 175,210 C 145,145 80,95 15,55 Z" fill="url(#blueArcGrad1)" />
  <path d="M 40,20 C 120,60 190,120 220,190" stroke="url(#blueArcGlow)" stroke-width="4.5" stroke-linecap="round"/>
</svg>
`)}`;

// 9. Gold Luxury Flowing Guilloche Waves (Image 1 bottom-right)
const SVG_GOLD_GUILLOCHE_WAVES = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 160" width="340" height="160" fill="none">
  <defs>
    <linearGradient id="goldWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ca8a04"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#fef08a"/>
    </linearGradient>
  </defs>
  <g stroke="url(#goldWaveGrad)" stroke-width="1.2" opacity="0.85">
    <path d="M 10,10 C 110,20 220,140 330,15" />
    <path d="M 10,20 C 110,30 220,130 330,25" />
    <path d="M 10,30 C 110,40 220,120 330,35" />
    <path d="M 10,40 C 110,50 220,110 330,45" />
    <path d="M 10,50 C 110,60 220,100 330,55" />
    <path d="M 10,60 C 110,70 220,90 330,65" />
    <path d="M 10,70 C 110,80 220,80 330,75" />
    <path d="M 10,80 C 110,90 220,70 330,85" />
    <path d="M 10,90 C 110,100 220,60 330,95" />
  </g>
</svg>
`)}`;

// Top-Left Blue & Gold Origami Fold (Image 5)
const SVG_ORIGAMI_BLUE_GOLD = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 180" width="200" height="180" fill="none">
  <defs>
    <linearGradient id="goldGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff0a6"/>
      <stop offset="30%" stop-color="#eab308"/>
      <stop offset="70%" stop-color="#ca8a04"/>
      <stop offset="100%" stop-color="#fef08a"/>
    </linearGradient>
    <linearGradient id="blueGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0047ff"/>
      <stop offset="100%" stop-color="#002288"/>
    </linearGradient>
  </defs>
  <polygon points="0,0 80,0 0,170" fill="url(#goldGrad1)"/>
  <polygon points="0,0 190,0 110,120 30,175 0,140" fill="url(#blueGrad1)"/>
  <polygon points="45,90 90,140 30,175" fill="url(#goldGrad1)"/>
</svg>
`)}`;

// Master Catalog of Transparent Graphic Overlays
export const ABSTRACT_CORNER_GRAPHICS: AbstractGraphicItem[] = [
  {
    id: 'hex-wireframe-grid',
    name: 'Hexagon Wireframe Grid',
    category: 'geometric',
    description: 'Technical wireframe honeycomb hexagonal matrix',
    defaultWidth: 160,
    defaultHeight: 130,
    svgDataUrl: SVG_HEX_WIREFRAME_GRID,
  },
  {
    id: 'organic-topo-orange',
    name: 'Orange Topo Contours',
    category: 'topo',
    description: 'Curving fluid topographic elevation lines',
    defaultWidth: 140,
    defaultHeight: 160,
    svgDataUrl: SVG_ORGANIC_TOPO_ORANGE,
  },
  {
    id: 'dynamic-mesh-black',
    name: 'Dynamic Wave Mesh',
    category: 'mesh',
    description: 'Flowing twisted dark wireframe pinstripe mesh',
    defaultWidth: 220,
    defaultHeight: 80,
    svgDataUrl: SVG_DYNAMIC_MESH_BLACK,
  },
  {
    id: 'purple-hexagon-badge',
    name: 'Purple 3D Hex Badge',
    category: 'badge',
    description: '3D purple hexagon with halftone dots and slash accents',
    defaultWidth: 140,
    defaultHeight: 140,
    svgDataUrl: SVG_PURPLE_HEXAGON_BADGE,
  },
  {
    id: 'rainbow-spiral-swirl',
    name: 'Rainbow Spiral Swirl',
    category: 'mesh',
    description: 'Concentric gradient ribbon loop and optical vortex',
    defaultWidth: 180,
    defaultHeight: 100,
    svgDataUrl: SVG_RAINBOW_SPIRAL_SWIRL,
  },
  {
    id: 'halftone-matrix-fade',
    name: 'Halftone Dot Matrix',
    category: 'halftone',
    description: 'Graduated particle dot matrix fade',
    defaultWidth: 200,
    defaultHeight: 70,
    svgDataUrl: SVG_HALFTONE_MATRIX_FADE,
  },
  {
    id: 'tech-square-bracket',
    name: 'Square Pixel Bracket',
    category: 'corner',
    description: 'Cyber security watermark registration corner',
    defaultWidth: 110,
    defaultHeight: 110,
    svgDataUrl: SVG_TECH_SQUARE_BRACKET,
  },
  {
    id: 'blue-curved-arc-banner',
    name: 'Blue 3D Curved Arc',
    category: 'geometric',
    description: 'Translucent 3D royal blue glass curved banner',
    defaultWidth: 150,
    defaultHeight: 130,
    svgDataUrl: SVG_BLUE_CURVED_ARC_BANNER,
  },
  {
    id: 'gold-guilloche-waves',
    name: 'Gold Guilloche Waves',
    category: 'security',
    description: 'Flowing gold pinstripe security waves',
    defaultWidth: 200,
    defaultHeight: 90,
    svgDataUrl: SVG_GOLD_GUILLOCHE_WAVES,
  },
  {
    id: 'origami-blue-gold',
    name: 'Origami Blue & Gold Fold',
    category: 'corner',
    description: 'Sharp 3D folded geometric corner angle',
    defaultWidth: 150,
    defaultHeight: 140,
    svgDataUrl: SVG_ORIGAMI_BLUE_GOLD,
  },
];
