import Dexie, { type EntityTable } from 'dexie';

// ===== TYPE DEFINITIONS =====

export interface Worker {
  id?: number;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status: 'Online' | 'Offline' | 'In Field';
  location: string;
  shiftStartTime: string;
  lastActive: string;
  recordsCollected: number;
  batteryLevel: number;
  signalStrength: 'Strong' | 'Good' | 'Fair';
  assignedDistrict: string;
  phone: string;
  createdAt: Date;
}

export interface UserAccount {
  id?: number;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'designer' | 'collector' | 'guest';
  status: 'Active' | 'Suspended' | 'Pending';
  lastLogin: string;
  avatar: string;
  createdAt: Date;
}

export interface BatchFolder {
  id?: number;
  name: string; // e.g. "Grade 10 Students 2026", "Engineering Staff Batch 01"
  sourceType: 'Excel Import' | 'Manual Intake' | 'Archive Digitizer' | 'Paper Document OCR';
  status: 'Ready for Design' | 'In Design' | 'Approved' | 'Printed' | 'Archived';
  collectorName: string;
  totalRecords: number;
  assignedDesigner?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Person {
  id?: number;
  fullName: string;
  firstName?: string;
  lastName?: string;
  idNumber: string;
  category: 'Employees' | 'Staff' | 'Executives' | 'Contractors' | 'Students' | 'Archive Digitized' | string;
  department: string;
  role: string;
  phone: string;
  email: string;
  bloodGroup: string;
  joinedDate: string;
  gender?: 'Male' | 'Female' | 'Other' | string;
  schoolName?: string;
  grade?: string;
  section?: string;
  rollNumber?: string;
  guardianName?: string;
  parentName?: string;
  fatherName?: string;
  motherName?: string;
  dateOfBirth?: string;
  dob?: string;
  address?: string;
  academicYear?: string;
  customFields?: Record<string, string>;
  extraData?: Record<string, string>;
  emergencyPhone?: string;
  photoDataUrl: string; // base64 data URL
  qrCodeDataUrl?: string; // base64 data URL or uploaded QR image
  barcodeValue?: string;
  status: 'Active' | 'Pending' | 'Printed' | 'Processing';
  fulfillmentStatus?: 'Fulfilled' | 'Unfulfilled' | 'Processing' | 'Refunded' | 'On Hold';
  paymentStatus?: 'Paid' | 'Pending' | 'Refunded';
  channel?: 'Mobile App' | 'Field Station' | 'Retail Store' | 'Online Store' | 'Archive Digitizer' | string;
  totalAmount?: string;
  workerId?: number;
  collectedBy?: string;
  location?: string;
  // Classification by Folder / Batch
  batchFolderId?: number;
  folderName?: string;
  sourceFileName?: string;
  archiveMeta?: {
    bookName?: string;
    pageNumber?: number;
    slotIndex?: number;
    rawCropUrl?: string;
  };
  createdAt: Date;
}

export interface CanvasElement {
  id: string;
  type:
    | 'text'
    | 'heading'
    | 'subtext'
    | 'mono'
    | 'image'
    | 'rect'
    | 'circle'
    | 'photo'
    | 'dataField'
    | 'qrCode'
    | 'barcode'
    | 'qr'
    | 'badge'
    | 'line'
    | 'arrow'
    | 'group'
    | 'frame'
    | 'star'
    | 'polygon'
    | 'hexagon'
    | 'triangle'
    | 'heart'
    | 'shield'
    | 'cloud'
    | 'parallelogram'
    | 'chip'
    | 'hologram'
    | 'stamp'
    | 'seal'
    | 'guilloche'
    | 'signature'
    | 'pill'
    | 'rfid'
    | 'icon'
    | 'badgeShield'
    | 'cornerBracket'
    | 'diamond'
    | 'ellipse'
    | 'ring'
    | 'trapezoid'
    | 'chevron'
    | 'ribbon'
    | 'callout'
    | 'cross'
    | 'octagon'
    | 'hexagon'
    | 'heart'
    | 'cloud'
    | 'lightning'
    | 'speechBubble'
    | 'parallelogram'
    | 'semiCircle'
    | 'crescent'
    | 'shield'
    | 'securityGrid'
    | 'shield3d'
    | 'star3d'
    | 'badge3d'
    | 'drawing';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  flipX?: boolean;
  flipY?: boolean;
  shapePreset?: 'circle' | 'hexagon' | 'shield' | 'rounded' | string;
  isCircle?: boolean;
  // Freehand Drawing properties
  tension?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  fontWeight?: string;
  fill?: string;
  align?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textDecoration?: string;
  textBackground?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  // Gradients (Canva Multi-Stop Gradient Engine)
  fillType?: 'solid' | 'linear-gradient' | 'radial-gradient';
  gradientStart?: string;
  gradientEnd?: string;
  gradientAngle?: number;
  gradientStops?: Array<{ offset: number; color: string }>;
  // Canva Photo Frames
  frameShape?: string;
  isFrame?: boolean;
  frameImageSrc?: string;
  // Typography & Effects
  underline?: boolean;
  strikethrough?: boolean;
  curveAngle?: number;
  textEffect?: 'none' | 'shadow' | 'lift' | 'hollow' | 'neon' | 'background';
  textEffectColor?: string;
  // Shadows & Effects
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  // Shape & Line specific
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  radiusTL?: number;
  radiusTR?: number;
  radiusBR?: number;
  radiusBL?: number;
  cornerRadii?: [number, number, number, number];
  radius?: number;
  points?: number[];
  arrowHead?: boolean;
  sides?: number;
  starPoints?: number;
  innerRadius?: number;
  dashPattern?: number[];
  strokeLineCap?: 'butt' | 'round' | 'square';
  subText?: string;
  iconName?: string;
  // Image-specific & Cropping
  src?: string;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  // QR & Barcode
  qrPayload?: string;
  barcodeType?: string;
  barcodeValue?: string;
  // Data binding
  dataField?: string;
  // Grouping
  groupId?: string;
  children?: CanvasElement[];
  // Visual
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
  name?: string;
}

export interface CardTemplate {
  id?: number;
  name: string;
  category?: string;
  orientation?: 'horizontal' | 'vertical';
  themeId?: string;
  widthPx?: number;
  heightPx?: number;
  widthMm?: number;
  heightMm?: number;
  frontElements: CanvasElement[];
  backElements: CanvasElement[];
  elements?: CanvasElement[]; // Alias for frontElements
  backgroundColor: string;
  backBackgroundColor: string;
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ArchiveCropSlot {
  id: string;
  slotIndex: number;
  label: string; // e.g. "Slot 1 (Top)"
  xPercent: number; // 0..100
  yPercent: number; // 0..100
  widthPercent: number; // 0..100
  heightPercent: number; // 0..100
}

export interface ArchivePageTemplate {
  id?: number;
  name: string; // e.g. "Registry Book A (5-Stacked)"
  description?: string;
  slotsCount: number; // e.g. 5
  slots: ArchiveCropSlot[];
  sampleImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrintJob {
  id?: number;
  jobName: string;
  batchName: string;
  paperSize: string;
  layoutType: string;
  totalCards: number;
  totalSheets: number;
  operatorName: string;
  status: 'Completed' | 'Printing' | 'Cancelled';
  createdAt: Date;
}

export interface AuditLog {
  id?: number;
  actor: string;
  action: string;
  details: string;
  ip?: string;
  createdAt: Date;
}

// ===== DATABASE =====

class IDCardDatabase extends Dexie {
  people!: EntityTable<Person, 'id'>;
  templates!: EntityTable<CardTemplate, 'id'>;
  workers!: EntityTable<Worker, 'id'>;
  users!: EntityTable<UserAccount, 'id'>;
  archiveTemplates!: EntityTable<ArchivePageTemplate, 'id'>;
  batchFolders!: EntityTable<BatchFolder, 'id'>;
  printJobs!: EntityTable<PrintJob, 'id'>;
  auditLogs!: EntityTable<AuditLog, 'id'>;

  constructor() {
    super('EnterpriseIDCardDB');
    this.version(9).stores({
      people: '++id, fullName, idNumber, category, department, role, status, fulfillmentStatus, paymentStatus, channel, folderName, sourceFileName, batchFolderId, workerId, createdAt',
      templates: '++id, name, category, orientation, createdAt',
      workers: '++id, name, email, role, status, location, assignedDistrict, createdAt',
      users: '++id, name, email, role, status, createdAt',
      archiveTemplates: '++id, name, slotsCount, createdAt',
      batchFolders: '++id, name, status, sourceType, collectorName, createdAt',
      printJobs: '++id, jobName, batchName, paperSize, status, operatorName, createdAt',
      auditLogs: '++id, actor, action, createdAt',
    });
  }
}

export const db = new IDCardDatabase();
