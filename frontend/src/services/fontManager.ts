// ==============================================================================
// SiliconLabs Enterprise ID Card Platform — Advanced Font & Font Kit Engine
// Powered by Google Fonts Developer API, GeezArchive Ethiopic Fonts & Custom Font Kits
// ==============================================================================

export interface FontDefinition {
  id: string;
  name: string;
  family: string;
  category: 'ethiopian' | 'sans-serif' | 'serif' | 'display' | 'monospace' | 'handwriting' | 'custom';
  weights: string[];
  previewSample: string;
  isCustom?: boolean;
  isGeezArchive?: boolean;
  isGoogleFont?: boolean;
  fileData?: string; // base64 for custom uploaded font
  format?: 'truetype' | 'opentype' | 'woff' | 'woff2';
  slug?: string;
}

export interface FontCombination {
  id: string;
  title: string;
  subtitle: string;
  headingFamily: string;
  subheadingFamily: string;
  headingWeight: string;
  subheadingWeight: string;
  headingSize?: number;
  subheadingSize?: number;
  headingColor?: string;
  subheadingColor?: string;
  previewClass?: string;
  category: 'fashion' | 'tech' | 'corporate' | 'vintage' | 'bold' | 'ethiopian';
}

// Curated Stylish Font Combinations (Matching Image 5)
export const FONT_COMBINATIONS: FontCombination[] = [
  {
    id: 'fashion-icon',
    title: 'Fashion ICON',
    subtitle: 'HAUTE COUTURE PARIS',
    headingFamily: 'Cinzel',
    subheadingFamily: 'Montserrat',
    headingWeight: '700',
    subheadingWeight: '400',
    headingSize: 32,
    subheadingSize: 10,
    headingColor: '#1e293b',
    subheadingColor: '#64748b',
    category: 'fashion',
  },
  {
    id: 'cold-smooth-tasty',
    title: 'cold, smooth, & tasty.',
    subtitle: 'ANGELO BREWING CO.',
    headingFamily: 'Outfit',
    subheadingFamily: 'Inter',
    headingWeight: '900',
    subheadingWeight: '700',
    headingSize: 28,
    subheadingSize: 11,
    headingColor: '#0f172a',
    subheadingColor: '#334155',
    category: 'bold',
  },
  {
    id: 'corporate-executive',
    title: 'EXECUTIVE VIP',
    subtitle: 'Global Operations Director',
    headingFamily: 'Playfair Display',
    subheadingFamily: 'Plus Jakarta Sans',
    headingWeight: '700',
    subheadingWeight: '500',
    headingSize: 26,
    subheadingSize: 12,
    headingColor: '#1e3a8a',
    subheadingColor: '#475569',
    category: 'corporate',
  },
  {
    id: 'tech-cyber-matrix',
    title: 'CYBER SECURITY',
    subtitle: 'LEVEL-4 CLEARANCE PROTOCOL',
    headingFamily: 'Orbitron',
    subheadingFamily: 'JetBrains Mono',
    headingWeight: '800',
    subheadingWeight: '500',
    headingSize: 22,
    subheadingSize: 10,
    headingColor: '#059669',
    subheadingColor: '#64748b',
    category: 'tech',
  },
  {
    id: 'ethiopian-royal-heritage',
    title: 'ብሔራዊ መታወቂያ',
    subtitle: 'የኢትዮጵያ ፌዴራላዊ ዲሞክራሲያዊ ሪፐብሊክ',
    headingFamily: 'Mahtot',
    subheadingFamily: 'Noto Serif Ethiopic',
    headingWeight: '700',
    subheadingWeight: '600',
    headingSize: 26,
    subheadingSize: 12,
    headingColor: '#84a92c',
    subheadingColor: '#334155',
    category: 'ethiopian',
  },
  {
    id: 'official-credential',
    title: 'OFFICIAL ACCESS PASS',
    subtitle: 'AUTHORIZED PERSONNEL ONLY',
    headingFamily: 'Bebas Neue',
    subheadingFamily: 'IBM Plex Mono',
    headingWeight: '400',
    subheadingWeight: '600',
    headingSize: 30,
    subheadingSize: 11,
    headingColor: '#b91c1c',
    subheadingColor: '#475569',
    category: 'bold',
  },
];

// Curated Popular GeezArchive & Google Ethiopian Fonts
export const ETHIOPIAN_PRESET_FONTS: FontDefinition[] = [
  {
    id: 'geez-mahtot',
    name: 'Mahtot (ማኅቶት)',
    family: 'Mahtot, "Noto Sans Ethiopic", sans-serif',
    category: 'ethiopian',
    weights: ['400', '700'],
    previewSample: 'ሰላም • ፊደል • ማኅቶት • Mahtot',
    isGeezArchive: true,
    slug: 'Mahtot',
  },
  {
    id: 'geez-loga',
    name: 'Loga (ሎጋ)',
    family: 'Loga, "Noto Sans Ethiopic", sans-serif',
    category: 'ethiopian',
    weights: ['400', '700'],
    previewSample: 'ውበት • ቅርስ • ሎጋ • Loga Font',
    isGeezArchive: true,
    slug: 'Loga',
  },
  {
    id: 'geez-yigezubisrat',
    name: 'Yigezu Bisrat (ይገዙ ብሥራት)',
    family: '"Yigezu Bisrat", "Noto Serif Ethiopic", serif',
    category: 'ethiopian',
    weights: ['400'],
    previewSample: 'ኢትዮጵያ • ባህል • ይገዙ ብሥራት',
    isGeezArchive: true,
    slug: 'YigezuBisrat',
  },
  {
    id: 'geez-washra',
    name: 'WashRa (ዋሽራ)',
    family: 'WashRa, "Noto Sans Ethiopic", sans-serif',
    category: 'ethiopian',
    weights: ['400', '700'],
    previewSample: 'አዲስ አበባ • ታሪክ • ዋሽራ ፊደል',
    isGeezArchive: true,
    slug: 'WashRa',
  },
  {
    id: 'geez-jiret',
    name: 'Jiret (ጅረት)',
    family: 'Jiret, "Noto Sans Ethiopic", sans-serif',
    category: 'ethiopian',
    weights: ['400'],
    previewSample: 'ብርሃን • ንባብ • ጅረት Ethiopic',
    isGeezArchive: true,
    slug: 'Jiret',
  },
  {
    id: 'geez-bate',
    name: 'Bate (ባቴ)',
    family: 'Bate, "Noto Serif Ethiopic", serif',
    category: 'ethiopian',
    weights: ['400', '700'],
    previewSample: 'ግዕዝ • ዜማ • ባቴ ዲዛይን',
    isGeezArchive: true,
    slug: 'Bate',
  },
  {
    id: 'geez-desta',
    name: 'Desta (ደስታ)',
    family: 'Desta, "Noto Sans Ethiopic", sans-serif',
    category: 'ethiopian',
    weights: ['400'],
    previewSample: 'ደስታ • ፈገግታ • Desta Ge\'ez',
    isGeezArchive: true,
    slug: 'Desta',
  },
  {
    id: 'noto-sans-ethiopic',
    name: 'Noto Sans Ethiopic (ኖቶ ሳንስ)',
    family: '"Noto Sans Ethiopic", sans-serif',
    category: 'ethiopian',
    weights: ['300', '400', '500', '600', '700', '800', '900'],
    previewSample: 'ሰላም • ፊደል • ኢትዮጵያ • Noto Sans',
  },
  {
    id: 'noto-serif-ethiopic',
    name: 'Noto Serif Ethiopic (ኖቶ ሰሪፍ)',
    family: '"Noto Serif Ethiopic", serif',
    category: 'ethiopian',
    weights: ['400', '500', '600', '700', '800'],
    previewSample: 'አዲስ አበባ • ታሪክ • Noto Serif',
  },
  {
    id: 'abyssinica-sil',
    name: 'Abyssinica SIL (አቢሲኒካ)',
    family: '"Abyssinica SIL", "Noto Serif Ethiopic", serif',
    category: 'ethiopian',
    weights: ['400'],
    previewSample: 'ግዕዝ • ኢትዮጵያ • Abyssinica SIL',
  },
  {
    id: 'nyala',
    name: 'Nyala (ኛላ)',
    family: 'Nyala, "Noto Sans Ethiopic", sans-serif',
    category: 'ethiopian',
    weights: ['400', '700'],
    previewSample: 'ባህል • ቅርስ • Nyala Ethiopic',
  },
  {
    id: 'kefa',
    name: 'Kefa (ከፋ)',
    family: 'Kefa, "Noto Serif Ethiopic", serif',
    category: 'ethiopian',
    weights: ['400', '700'],
    previewSample: 'ብርሃን • ንባብ • Kefa Ethiopic',
  },
];

export const BUILTIN_FONTS: FontDefinition[] = [
  ...ETHIOPIAN_PRESET_FONTS,

  // --- MODERN SANS-SERIF ---
  {
    id: 'inter',
    name: 'Inter',
    family: 'Inter, sans-serif',
    category: 'sans-serif',
    weights: ['300', '400', '500', '600', '700', '800', '900'],
    previewSample: 'Modern UI & Enterprise Precision',
  },
  {
    id: 'outfit',
    name: 'Outfit',
    family: 'Outfit, sans-serif',
    category: 'sans-serif',
    weights: ['300', '400', '500', '600', '700', '800'],
    previewSample: 'Clean Geometric Headings',
  },
  {
    id: 'plus-jakarta-sans',
    name: 'Plus Jakarta Sans',
    family: '"Plus Jakarta Sans", sans-serif',
    category: 'sans-serif',
    weights: ['300', '400', '500', '600', '700', '800'],
    previewSample: 'Executive Silicon Accent',
  },
  {
    id: 'poppins',
    name: 'Poppins',
    family: 'Poppins, sans-serif',
    category: 'sans-serif',
    weights: ['300', '400', '500', '600', '700', '800', '900'],
    previewSample: 'Geometric Rounded Aesthetics',
  },
  {
    id: 'montserrat',
    name: 'Montserrat',
    family: 'Montserrat, sans-serif',
    category: 'sans-serif',
    weights: ['300', '400', '500', '600', '700', '800', '900'],
    previewSample: 'Urban Editorial Typography',
  },
  {
    id: 'space-grotesk',
    name: 'Space Grotesk',
    family: '"Space Grotesk", sans-serif',
    category: 'sans-serif',
    weights: ['400', '500', '600', '700'],
    previewSample: 'Tech Future Credential Font',
  },
  {
    id: 'roboto',
    name: 'Roboto',
    family: 'Roboto, sans-serif',
    category: 'sans-serif',
    weights: ['300', '400', '500', '700', '900'],
    previewSample: 'Clean Versatile Standard',
  },
  {
    id: 'lato',
    name: 'Lato',
    family: 'Lato, sans-serif',
    category: 'sans-serif',
    weights: ['300', '400', '700', '900'],
    previewSample: 'Warm Corporate Harmony',
  },

  // --- ELEGANT SERIF ---
  {
    id: 'playfair-display',
    name: 'Playfair Display',
    family: '"Playfair Display", serif',
    category: 'serif',
    weights: ['400', '600', '700', '900'],
    previewSample: 'Prestigious Diploma & VIP',
  },
  {
    id: 'cinzel',
    name: 'Cinzel',
    family: 'Cinzel, serif',
    category: 'serif',
    weights: ['500', '700', '900'],
    previewSample: 'Classical Authority Seal',
  },
  {
    id: 'merriweather',
    name: 'Merriweather',
    family: 'Merriweather, serif',
    category: 'serif',
    weights: ['300', '400', '700', '900'],
    previewSample: 'Editorial Certificate Serif',
  },

  // --- IMPACT & DISPLAY ---
  {
    id: 'bebas-neue',
    name: 'Bebas Neue',
    family: '"Bebas Neue", sans-serif',
    category: 'display',
    weights: ['400'],
    previewSample: 'BOLD ALL-CAPS BADGES',
  },
  {
    id: 'oswald',
    name: 'Oswald',
    family: 'Oswald, sans-serif',
    category: 'display',
    weights: ['400', '600', '700'],
    previewSample: 'CONDENSED SECURITY HEADER',
  },
  {
    id: 'orbitron',
    name: 'Orbitron',
    family: 'Orbitron, sans-serif',
    category: 'display',
    weights: ['500', '700', '900'],
    previewSample: 'CYBER SECURITY ACCENT',
  },
  {
    id: 'anton',
    name: 'Anton',
    family: 'Anton, sans-serif',
    category: 'display',
    weights: ['400'],
    previewSample: 'POWERFUL BADGE DISPLAY',
  },

  // --- MONOSPACE ---
  {
    id: 'jetbrains-mono',
    name: 'JetBrains Mono',
    family: '"JetBrains Mono", monospace',
    category: 'monospace',
    weights: ['400', '500', '600', '700'],
    previewSample: 'ETH-2026-99042 // SEC-ID',
  },
  {
    id: 'ibm-plex-mono',
    name: 'IBM Plex Mono',
    family: '"IBM Plex Mono", monospace',
    category: 'monospace',
    weights: ['400', '500', '600', '700'],
    previewSample: 'PIN: 8840-A9 // SERIAL',
  },

  // --- HANDWRITING & SIGNATURE ---
  {
    id: 'dancing-script',
    name: 'Dancing Script',
    family: '"Dancing Script", cursive',
    category: 'handwriting',
    weights: ['400', '700'],
    previewSample: 'Authorized Signature Officer',
  },
  {
    id: 'caveat',
    name: 'Caveat',
    family: 'Caveat, cursive',
    category: 'handwriting',
    weights: ['400', '700'],
    previewSample: 'Official Digital Sign-off',
  },
  {
    id: 'pacifico',
    name: 'Pacifico',
    family: 'Pacifico, cursive',
    category: 'handwriting',
    weights: ['400'],
    previewSample: 'Personalized Script Badge',
  },
];

const CUSTOM_FONTS_STORAGE_KEY = 'siliconlabs_custom_fonts_kit';
const GOOGLE_FONTS_STORAGE_KEY = 'siliconlabs_google_fonts_cache';
export const GOOGLE_FONTS_API_KEY = 'AIzaSyAQAXtoO9CnmQA4LpOYv8kklegs6mEXdJY';

class FontManager {
  private customFonts: FontDefinition[] = [];
  private remoteGeezFonts: FontDefinition[] = [];
  private googleFonts: FontDefinition[] = [];
  private loadedStylesheets: Set<string> = new Set();
  private listeners: Array<() => void> = [];
  public isLoadingGoogleFonts = false;

  constructor() {
    this.loadCustomFontsFromStorage();
    this.loadCachedGoogleFonts();
    this.preloadGeezArchivePresets();
    this.fetchGeezArchiveCatalog();
    this.fetchGoogleFonts();
  }

  /**
   * Preload common GeezArchive CSS2 endpoints
   */
  private preloadGeezArchivePresets() {
    ['Mahtot', 'Loga', 'YigezuBisrat', 'WashRa', 'Jiret', 'Bate', 'Desta'].forEach(slug => {
      this.ensureGeezFontLoaded(slug);
    });
  }

  /**
   * Dynamically loads a font from GeezArchive CSS2 endpoint:
   * https://www.geezarchive.com/css2?family=...&display=swap
   */
  public ensureGeezFontLoaded(slugOrName: string) {
    const cleanSlug = slugOrName.replace(/[^a-zA-Z0-9]/g, '');
    const url = `https://www.geezarchive.com/css2?family=${encodeURIComponent(cleanSlug)}&display=swap`;
    if (this.loadedStylesheets.has(url)) return;

    try {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      document.head.appendChild(link);
      this.loadedStylesheets.add(url);
      console.info(`[FontManager] Loaded GeezArchive CSS2 font: ${cleanSlug}`);
    } catch (err) {
      console.warn(`[FontManager] Failed to inject GeezArchive stylesheet:`, err);
    }
  }

  /**
   * Dynamically loads a font from Google Fonts CSS2 endpoint
   */
  public ensureGoogleFontLoaded(family: string) {
    const cleanFamily = family.replace(/["']/g, '').trim();
    if (!cleanFamily || cleanFamily === 'sans-serif' || cleanFamily === 'serif' || cleanFamily === 'monospace' || cleanFamily === 'cursive') return;
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(cleanFamily)}:wght@300;400;500;600;700;800;900&display=swap`;
    if (this.loadedStylesheets.has(url)) return;

    try {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      document.head.appendChild(link);
      this.loadedStylesheets.add(url);
      console.info(`[FontManager] Injected Google Font stylesheet: ${cleanFamily}`);
    } catch (err) {
      console.warn(`[FontManager] Failed to inject Google Font stylesheet:`, err);
    }
  }

  /**
   * Fetch live catalog from GeezArchive API
   * GET https://www.geezarchive.com/api/catalog/fonts?limit=50
   */
  private async fetchGeezArchiveCatalog() {
    try {
      const res = await fetch('https://www.geezarchive.com/api/catalog/fonts?limit=50');
      if (!res.ok) return;
      const json = await res.json();
      if (json && Array.isArray(json.data)) {
        const fetched: FontDefinition[] = json.data.map((item: any) => ({
          id: `geez-remote-${item.slug || item.name}`,
          name: `${item.name} (${item.nameAmharic || 'ግዕዝ'})`,
          family: `"${item.name}", "Noto Sans Ethiopic", sans-serif`,
          category: 'ethiopian' as const,
          weights: ['400', '700'],
          previewSample: `ሰላም • ${item.name} • GeezArchive`,
          isGeezArchive: true,
          slug: item.slug || item.name,
        }));

        this.remoteGeezFonts = fetched;
        this.notify();
      }
    } catch (err) {
      console.info('[FontManager] GeezArchive live catalog offline, using presets.');
    }
  }

  /**
   * Fetch live font catalog from Google Fonts Developer API
   * GET https://www.googleapis.com/webfonts/v1/webfonts?key=...&sort=popularity
   */
  public async fetchGoogleFonts(sort: string = 'popularity') {
    this.isLoadingGoogleFonts = true;
    try {
      const res = await fetch(`https://www.googleapis.com/webfonts/v1/webfonts?key=${GOOGLE_FONTS_API_KEY}&sort=${sort}`);
      if (!res.ok) throw new Error(`Google Fonts API returned ${res.status}`);
      const json = await res.json();
      if (json && Array.isArray(json.items)) {
        const items = json.items.slice(0, 300); // take top 300 popular fonts
        const mapped: FontDefinition[] = items.map((item: any) => {
          let cat: FontDefinition['category'] = 'sans-serif';
          if (item.category === 'serif') cat = 'serif';
          else if (item.category === 'display') cat = 'display';
          else if (item.category === 'handwriting') cat = 'handwriting';
          else if (item.category === 'monospace') cat = 'monospace';

          return {
            id: `gf-${item.family.toLowerCase().replace(/\s+/g, '-')}`,
            name: item.family,
            family: `"${item.family}", ${cat}`,
            category: cat,
            weights: item.variants || ['400', '700'],
            previewSample: `${item.family} Typography`,
            isGoogleFont: true,
          };
        });

        this.googleFonts = mapped;
        try {
          localStorage.setItem(GOOGLE_FONTS_STORAGE_KEY, JSON.stringify(mapped));
        } catch (e) {
          // ignore storage quota
        }
        this.notify();
      }
    } catch (err) {
      console.warn('[FontManager] Could not fetch Google Fonts API (using cached or builtin fallback):', err);
    } finally {
      this.isLoadingGoogleFonts = false;
      this.notify();
    }
  }

  private loadCachedGoogleFonts() {
    try {
      const cached = localStorage.getItem(GOOGLE_FONTS_STORAGE_KEY);
      if (cached) {
        this.googleFonts = JSON.parse(cached);
      }
    } catch (e) {
      // ignore
    }
  }

  public getBuiltinFonts(): FontDefinition[] {
    return BUILTIN_FONTS;
  }

  public getCustomFonts(): FontDefinition[] {
    return this.customFonts;
  }

  public getGoogleFonts(): FontDefinition[] {
    return this.googleFonts;
  }

  public getAllFonts(): FontDefinition[] {
    // Merge Custom + GeezArchive + Google Fonts + Builtin
    const all = [...this.customFonts, ...this.remoteGeezFonts, ...this.googleFonts, ...BUILTIN_FONTS];
    const seen = new Set<string>();
    return all.filter(f => {
      const key = f.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  private async loadCustomFontsFromStorage() {
    try {
      const raw = localStorage.getItem(CUSTOM_FONTS_STORAGE_KEY);
      if (!raw) return;
      const parsed: FontDefinition[] = JSON.parse(raw);
      this.customFonts = parsed;

      // Register font faces into browser
      for (const f of parsed) {
        if (f.fileData) {
          await this.registerFontFace(f.name, f.family, f.fileData, f.format || 'truetype');
        }
      }
      this.notify();
    } catch (err) {
      console.warn('[FontManager] Error loading custom fonts:', err);
    }
  }

  private async registerFontFace(
    name: string,
    family: string,
    base64Data: string,
    format: 'truetype' | 'opentype' | 'woff' | 'woff2'
  ) {
    try {
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const fontFace = new FontFace(family, byteArray.buffer);
      const loadedFace = await fontFace.load();
      (document.fonts as any).add(loadedFace);
      console.info(`[FontManager] Successfully registered font: "${family}" (${name})`);
    } catch (err) {
      console.error(`[FontManager] Failed to register font face "${family}":`, err);
    }
  }

  /**
   * Upload and register a custom font file (.ttf, .otf, .woff, .woff2)
   */
  public async uploadFontFile(file: File, customName?: string): Promise<FontDefinition> {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    let format: 'truetype' | 'opentype' | 'woff' | 'woff2' = 'truetype';
    if (ext === 'otf') format = 'opentype';
    else if (ext === 'woff') format = 'woff';
    else if (ext === 'woff2') format = 'woff2';

    const baseName = customName?.trim() || file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const safeFamily = `CustomFont_${Date.now()}_${baseName.replace(/[^a-zA-Z0-9]/g, '')}`;

    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64Data = btoa(binary);

    // Register font in document
    await this.registerFontFace(baseName, safeFamily, base64Data, format);

    const newFont: FontDefinition = {
      id: `custom-font-${Date.now()}`,
      name: `${baseName} (Custom Kit)`,
      family: safeFamily,
      category: 'custom',
      weights: ['400', '700'],
      previewSample: 'የተጠቃሚ ፊደል • Custom Uploaded Font Kit',
      isCustom: true,
      fileData: base64Data,
      format,
    };

    this.customFonts = [newFont, ...this.customFonts.filter(f => f.family !== safeFamily)];
    try {
      localStorage.setItem(CUSTOM_FONTS_STORAGE_KEY, JSON.stringify(this.customFonts));
    } catch (err) {
      console.warn('[FontManager] LocalStorage quota exceeded for font storage:', err);
    }
    this.notify();
    return newFont;
  }

  public deleteCustomFont(id: string) {
    this.customFonts = this.customFonts.filter(f => f.id !== id);
    try {
      localStorage.setItem(CUSTOM_FONTS_STORAGE_KEY, JSON.stringify(this.customFonts));
    } catch (err) {
      console.warn('[FontManager] Error updating localStorage on delete:', err);
    }
    this.notify();
  }
}

export const fontManager = new FontManager();
