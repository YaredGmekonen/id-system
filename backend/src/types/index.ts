// ==============================================================================
// SiliconLabs Enterprise ID Card Platform — Domain Type Definitions (Server)
// ==============================================================================

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  settings?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  organizationId: string;
  name: string;
  email: string;
  role: 'admin' | 'designer' | 'collector' | 'guest';
  status: 'Active' | 'Suspended' | 'Pending';
  avatar?: string | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Worker {
  id: number;
  organizationId?: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status: 'Online' | 'Offline' | 'In Field';
  location: string;
  shiftStartTime?: string | null;
  lastActive?: string | null;
  recordsCollected: number;
  batteryLevel: number;
  signalStrength: 'Strong' | 'Good' | 'Fair';
  assignedDistrict: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchFolder {
  id: number;
  organizationId?: string;
  name: string;
  sourceType: 'Excel Import' | 'Manual Intake' | 'Archive Digitizer' | 'Paper Document OCR';
  status: 'Ready for Design' | 'In Design' | 'Approved' | 'Printed' | 'Archived';
  collectorName: string;
  totalRecords: number;
  assignedDesigner?: string | null;
  notes?: string | null;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Person {
  id: number;
  organizationId?: string;
  batchFolderId?: number | null;
  workerId?: number | null;
  idNumber: string;
  fullName: string;
  firstName?: string | null;
  lastName?: string | null;
  category: string;
  department: string;
  role: string;
  phone: string;
  email: string;
  bloodGroup: string;
  joinedDate: string;
  gender?: string | null;
  schoolName?: string | null;
  grade?: string | null;
  section?: string | null;
  rollNumber?: string | null;
  guardianName?: string | null;
  emergencyPhone?: string | null;
  photoStoragePath?: string | null;
  photoUrl?: string | null;
  photoDataUrl?: string | null; // For backward compatibility / local preview
  status: 'Active' | 'Pending' | 'Printed' | 'Processing';
  fulfillmentStatus?: 'Fulfilled' | 'Unfulfilled' | 'Processing' | 'Refunded' | 'On Hold';
  paymentStatus?: 'Paid' | 'Pending' | 'Refunded';
  channel?: string | null;
  totalAmount?: string | null;
  location?: string | null;
  collectedBy?: string | null;
  folderName?: string | null;
  sourceFileName?: string | null;
  archiveMeta?: {
    bookName?: string;
    pageNumber?: number;
    slotIndex?: number;
    rawCropUrl?: string;
  } | null;
  customFields?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CanvasElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  flipX?: boolean;
  flipY?: boolean;
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
  fillType?: 'solid' | 'linear-gradient' | 'radial-gradient';
  gradientStart?: string;
  gradientEnd?: string;
  gradientAngle?: number;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
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
  strokeLineCap?: 'butt' | 'round' | 'square';
  subText?: string;
  iconName?: string;
  src?: string;
  qrPayload?: string;
  barcodeType?: string;
  barcodeValue?: string;
  dataField?: string;
  groupId?: string;
  children?: CanvasElement[];
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
  name?: string;
}

export interface CardTemplate {
  id: number;
  organizationId?: string;
  name: string;
  category?: string | null;
  orientation: 'horizontal' | 'vertical';
  themeId?: string | null;
  widthPx: number;
  heightPx: number;
  widthMm: number;
  heightMm: number;
  backgroundColor: string;
  backBackgroundColor: string;
  isDefault: boolean;
  currentVersionId?: string | null;
  frontElements: CanvasElement[];
  backElements: CanvasElement[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateVersion {
  id: string;
  templateId: number;
  versionNumber: number;
  frontElements: CanvasElement[];
  backElements: CanvasElement[];
  changeSummary?: string | null;
  createdBy?: string | null;
  createdAt: Date;
}

export interface TemplateAsset {
  id: string;
  organizationId?: string;
  templateId?: number | null;
  assetType: 'logo' | 'background' | 'signature' | 'badge' | 'watermark' | 'font';
  filename: string;
  storagePath: string;
  fileSize: number;
  mimeType: string;
  dimensions?: { width: number; height: number } | null;
  createdAt: Date;
}

export interface DesignerProject {
  id: string;
  organizationId?: string;
  name: string;
  description?: string | null;
  templateId?: number | null;
  canvasData: Record<string, any>;
  previewUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type JobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface GenerationJob {
  id: string;
  organizationId?: string;
  batchFolderId?: number | null;
  templateId: number;
  templateVersionId?: string | null;
  status: JobStatus;
  totalRecords: number;
  processedRecords: number;
  progressPercent: number;
  options: {
    includeBack?: boolean;
    batchSizeLimit?: number;
    chunkSize?: number;
    highResDpi?: number;
  };
  outputZipPath?: string | null;
  outputPdfPath?: string | null;
  errorDetails?: string | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeneratedCard {
  id: string;
  jobId: string;
  personId: number;
  templateVersionId?: string | null;
  frontImagePath?: string | null;
  backImagePath?: string | null;
  renderedAt: Date;
}

export interface PrintJob {
  id: string;
  organizationId?: string;
  batchFolderId?: number | null;
  layoutType: '8-up' | '10-up' | '1-up' | 'custom';
  paperSize: 'A4' | 'A3' | 'Letter' | 'Custom';
  totalSheets: number;
  status: 'PENDING' | 'GENERATING' | 'READY' | 'FAILED';
  pdfPath?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ArchivePageTemplate {
  id: number;
  organizationId?: string;
  name: string;
  description?: string | null;
  slotsCount: number;
  slots: {
    id: string;
    slotIndex: number;
    label: string;
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
  }[];
  sampleImageUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ===== API PAGINATION & QUERY TYPES =====

export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextCursor?: string | null;
  };
}

export interface PersonFilterParams extends PaginationParams {
  search?: string;
  category?: string;
  department?: string;
  status?: string;
  batchFolderId?: number;
  workerId?: number;
}
