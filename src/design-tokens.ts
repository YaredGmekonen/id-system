// Enterprise ID Card Design Tokens & Palette (Strict Design System)

export const BRAND = {
  COMPANY_NAME: 'ENTERPRISE ID SYSTEM',
  SHORT_NAME: 'ID PLATFORM',
  TAGLINE: 'Secure High-Throughput Credential Issuance Engine',
  LOCATION: 'Global Operations',
  EMAIL: 'operations@idplatform.internal',
  PHONE: '+1 (800) 555-0199',
  WEBSITE: 'idplatform.internal',
};

export const TOKENS = {
  colors: {
    paper: '#F2F3F1',
    ink: '#14171A',
    navy: '#14213D',
    teal: '#0F8B8D',
    stamp: '#B23A2E',
    ochre: '#C98A2C',
  },
  fonts: {
    display: 'Space Grotesk',
    body: 'IBM Plex Sans',
    mono: 'IBM Plex Mono',
  },
} as const;

// Card dimensions — CR80 standard ratio 1.586:1 (85.6mm x 53.98mm)
export const CARD = {
  WIDTH_INCHES: 3.375,
  HEIGHT_INCHES: 2.128,
  // 300 DPI high-res print quality
  WIDTH_PX: 1012,
  HEIGHT_PX: 638,
  VERTICAL_WIDTH_PX: 638,
  VERTICAL_HEIGHT_PX: 1012,
  DISPLAY_SCALE: 0.55,
  ASPECT_RATIO: 1.586,
} as const;

// Print sheet layout — 8-up on A4 (595.28 x 841.89 pt)
export const PRINT_SHEET = {
  PAGE_WIDTH: 595.28,
  PAGE_HEIGHT: 841.89,
  CARDS_PER_ROW: 2,
  CARDS_PER_COL: 4,
  MARGIN: 36,
  GAP: 12,
} as const;

// Available Color Themes for ID Cards using the official palette
export const CARD_THEMES = [
  {
    id: 'navy-teal',
    name: 'Executive Navy & Teal',
    primary: '#14213D',
    secondary: '#0F8B8D',
    headerBg: 'linear-gradient(135deg, #14213D 0%, #0F8B8D 100%)',
    cardBg: '#FFFFFF',
    textColor: '#14171A',
    subTextColor: '#657786',
    accentColor: '#0F8B8D',
    badgeBg: '#E6F4F4',
    border: '#14213D',
  },
  {
    id: 'deep-ink',
    name: 'Monochrome Ink',
    primary: '#14171A',
    secondary: '#657786',
    headerBg: 'linear-gradient(135deg, #14171A 0%, #2A2F35 100%)',
    cardBg: '#F2F3F1',
    textColor: '#14171A',
    subTextColor: '#657786',
    accentColor: '#14171A',
    badgeBg: '#E1E3DF',
    border: '#14171A',
  },
  {
    id: 'stamp-ochre',
    name: 'Security Stamp & Ochre',
    primary: '#B23A2E',
    secondary: '#C98A2C',
    headerBg: 'linear-gradient(135deg, #B23A2E 0%, #C98A2C 100%)',
    cardBg: '#FFFFFF',
    textColor: '#14171A',
    subTextColor: '#657786',
    accentColor: '#B23A2E',
    badgeBg: '#F9ECEB',
    border: '#B23A2E',
  },
  {
    id: 'teal-paper',
    name: 'Teal Precision',
    primary: '#0F8B8D',
    secondary: '#14213D',
    headerBg: 'linear-gradient(135deg, #0F8B8D 0%, #14213D 100%)',
    cardBg: '#FFFFFF',
    textColor: '#14171A',
    subTextColor: '#657786',
    accentColor: '#0F8B8D',
    badgeBg: '#E6F4F4',
    border: '#0F8B8D',
  },
  {
    id: 'ochre-navy',
    name: 'Ochre Official',
    primary: '#C98A2C',
    secondary: '#14213D',
    headerBg: 'linear-gradient(135deg, #C98A2C 0%, #14213D 100%)',
    cardBg: '#FFFFFF',
    textColor: '#14171A',
    subTextColor: '#657786',
    accentColor: '#C98A2C',
    badgeBg: '#FAF3E8',
    border: '#C98A2C',
  },
];

// Card Layouts
export const CARD_LAYOUTS = [
  { id: 'classic-centered', name: 'Classic Header Banner', desc: 'Prominent header banner with photo and credential fields' },
  { id: 'modern-corporate', name: 'Asymmetric Split', desc: 'Photo block left, departmental verification right' },
  { id: 'tech-hexagonal', name: 'Security Matrix', desc: 'Chip, QR matrix and high-density security micro-lines' },
  { id: 'executive-badge', name: 'Executive Badge', desc: 'Bold typography with high-contrast badge styling' },
  { id: 'minimal-clean', name: 'Clean Data Sheet', desc: 'Lightweight barcode and barcode footer' },
];

// Fields toggles
export const AVAILABLE_FIELDS = [
  { id: 'idNumber', label: 'ID Number', default: true },
  { id: 'department', label: 'Department', default: true },
  { id: 'role', label: 'Role / Title', default: true },
  { id: 'phone', label: 'Phone Number', default: true },
  { id: 'email', label: 'Email Address', default: false },
  { id: 'bloodGroup', label: 'Blood Group', default: true },
  { id: 'joinedDate', label: 'Date Joined', default: true },
  { id: 'emergencyPhone', label: 'Emergency Contact', default: false },
];

// Data field placeholders for Canvas Editor
export const DATA_FIELDS = [
  { key: '{{full_name}}', label: 'Full Name' },
  { key: '{{first_name}}', label: 'First Name' },
  { key: '{{last_name}}', label: 'Last Name' },
  { key: '{{id_number}}', label: 'ID Number' },
  { key: '{{department}}', label: 'Department' },
  { key: '{{role}}', label: 'Role / Title' },
  { key: '{{phone}}', label: 'Phone Number' },
  { key: '{{email}}', label: 'Email' },
  { key: '{{blood_group}}', label: 'Blood Group' },
  { key: '{{joined_date}}', label: 'Joined Date' },
  { key: '{{status}}', label: 'Status' },
  { key: '{{photo}}', label: 'Photo Frame' },
  { key: '{{qr_code}}', label: 'Dynamic QR Code' },
  { key: '{{verify_url}}', label: 'Online Verification URL' },
  { key: '{{barcode}}', label: 'Code 128 Barcode' },
] as const;

export const DEPARTMENTS = [
  'Software Engineering',
  'Operations & Security',
  'Hardware & IoT',
  'Executive Leadership',
  'Field Operations',
  'Quality Assurance',
  'Product Design',
  'Legal & Administration',
] as const;
