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
  emergencyPhone?: string;
  photoDataUrl: string; // base64 data URL
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
  type: 'text' | 'image' | 'rect' | 'circle' | 'photo' | 'dataField' | 'qrCode' | 'barcode' | 'qr' | 'badge' | 'line' | 'arrow' | 'group' | 'frame' | 'star' | 'polygon' | 'chip' | 'hologram' | 'stamp' | 'guilloche' | 'signature' | 'pill' | 'rfid' | 'icon' | 'badgeShield' | 'cornerBracket';
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  fill?: string;
  align?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textDecoration?: string;
  textBackground?: string;
  // Shape & Line specific
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  radius?: number;
  points?: number[];
  arrowHead?: boolean;
  sides?: number;
  starPoints?: number;
  innerRadius?: number;
  dashPattern?: number[];
  subText?: string;
  iconName?: string;
  // Image-specific
  src?: string;
  // QR & Barcode
  qrPayload?: string;
  barcodeType?: string;
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

// ===== DATABASE =====

class IDCardDatabase extends Dexie {
  people!: EntityTable<Person, 'id'>;
  templates!: EntityTable<CardTemplate, 'id'>;
  workers!: EntityTable<Worker, 'id'>;
  users!: EntityTable<UserAccount, 'id'>;
  archiveTemplates!: EntityTable<ArchivePageTemplate, 'id'>;
  batchFolders!: EntityTable<BatchFolder, 'id'>;

  constructor() {
    super('EnterpriseIDCardDB');
    this.version(7).stores({
      people: '++id, fullName, idNumber, category, department, role, status, fulfillmentStatus, paymentStatus, channel, folderName, sourceFileName, batchFolderId, workerId, createdAt',
      templates: '++id, name, category, orientation, createdAt',
      workers: '++id, name, email, role, status, location, assignedDistrict, createdAt',
      users: '++id, name, email, role, status, createdAt',
      archiveTemplates: '++id, name, slotsCount, createdAt',
      batchFolders: '++id, name, status, sourceType, collectorName, createdAt',
    });
  }
}

export const db = new IDCardDatabase();
