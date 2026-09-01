# Pre-Production Product — Architecture & Technical Specification

**Platform Name:** SiliconLabs Enterprise ID & Credential Management Platform  
**System Classification:** Full-Stack Enterprise Credential Management & Production Imposition System (Hybrid Offline Enclave + Server Cloud/On-Premise Hub)  
**Target Environment:** Local Enterprise Enclave, On-Premise Workstation, Production Print Facilities, Field Tablets, & Edge Terminals  

---

## 1. System Overview & Executive Summary

The **SiliconLabs Enterprise ID Platform** is an enterprise-grade, dual-tier credential generation, biometric intake, template design, batch management, archive digitizer, and high-resolution (300 DPI) paper imposition printing system.

The platform employs a **hybrid local-first & central hub architecture**:
- **Offline-First Zero-Latency Client Enclave:** Persistent local IndexedDB storage via Dexie.js v6, enabling offline field enrollment, instant vector rendering, and localized design work without internet dependency.
- **Enterprise Central Backend & Persistence:** High-performance Node.js / Express REST API backed by PostgreSQL for centralized organizational data, immutable audit logs, user management, and remote asset storage.
- **Bidirectional Delta Synchronization:** Intelligent conflict-resilient sync engine (`/api/v1/sync`) connecting local field client enclaves with central enterprise databases.
- **High-Throughput Batch Generation Worker Queue:** Asynchronous job processing queue (`QUEUED` → `PROCESSING` → `COMPLETED` → `FAILED`) with `SELECT ... FOR UPDATE SKIP LOCKED` worker locking, supporting 100k+ daily card generation at true 300 DPI.
- **Multi-Format Smart Design Ingestion:** Automated layer deconstruction supporting Adobe Photoshop (`.psd` via `ag-psd`), Figma frames, optical OCR layer segmentation with background inpainting, and multi-lingual Gemini 3.6 Vision AI OCR.
- **Precision Paper Imposition & Print Engine:** High-density 300 DPI rasterization and vector PDF composition with global sheet reflection (horizontal/vertical/duplex), standard ID presets (CR80, CR79, CR90, CR100, custom mm), crop marks, fold lines, and bleed guides.
- **Enterprise Governance & Security:** Granular Role-Based Access Control (RBAC), immutable audit logging with IP tracking, and real-time QR/Barcode identity verification.

---

## 2. Core Architecture & Tech Stack

| Layer | Technologies / Libraries | Purpose & Implementation |
|---|---|---|
| **Frontend Framework** | React 18 + TypeScript + Vite | SPA with fast hot module replacement, client-side routing, and typed domain models |
| **Backend REST API** | Node.js + Express + TypeScript + TSX | Modular REST API with centralized error handling, Zod validation, and structured JSON logging |
| **Local Client Storage** | Dexie.js (IndexedDB v6 schema) | Persistent zero-latency local database for personnel, batch folders, card templates, and sync metadata |
| **Central Database** | PostgreSQL (`pg` connection pool) | Relational enterprise database with composite indexes, audit trail history, and template versioning |
| **Synchronization Engine** | Custom Delta Sync (`/api/v1/sync`) | Bidirectional delta push/pull protocol with timestamp tracking and entity resolution |
| **Async Generation Queue** | Custom Worker Pool (`generationWorker.ts`) | Transactional background job queue with skip-locked claiming and 250 records/chunk memory safety |
| **Canvas & Vector Engine** | HTML5 Canvas 2D + Konva / React-Konva | 300 DPI CR80 (85.6×54mm) dual-face rendering with dynamic element binding and physical matrix transforms |
| **Multi-Format Ingestion** | `ag-psd`, `figmaImporter.ts`, `smartFileDeconstructor.ts` | Discrete layer parsing from Photoshop PSDs, Figma JSON structures, and vector SVGs |
| **AI & Optical OCR Engine** | Gemini 3.6 Vision API + Tesseract.js | Multi-lingual document extraction (English, Amharic, Ge'ez, Oromo), adaptive schema ingestion, and facial auto-framing |
| **QR & Barcodes** | `qrcode` (ISO/IEC 18004) + `bwip-js` (Code 128, Code 39, EAN, PDF417) | Scannable vector & raster barcode/QR code generation with dynamic field hydration |
| **Print & PDF Imposition** | `pdf-lib` + `exportPdf.ts` | Multi-card imposition (8-up duplex, 8-up fronts, 10-up fronts, custom grid) with global H/V sheet reflection |
| **Data Interchange** | `xlsx` (SheetJS) + `jszip` | Bulk Excel/CSV roster import/export with duplicate checking and multi-zone ZIP asset extraction |
| **Styling & Design Tokens** | CSS Variables, Tailwind CSS 3.4, Inter & JetBrains Mono Fonts | Dark/Light mode theme system with enterprise fintech/industrial aesthetics |

---

## 3. Dual-Tier Database Schemas

### 3.1. Client-Side Dexie.js Schema (IndexedDB v6 Enclave)

```typescript
// 1. People (Personnel & Credential Records)
interface Person {
  id?: number;
  fullName: string;
  idNumber: string;
  category: 'Employees' | 'Staff' | 'Executives' | 'Contractors' | 'Students' | 'Archive Digitized' | string;
  department: string;
  role: string;
  phone: string;
  email: string;
  bloodGroup: string;
  joinedDate: string;
  emergencyPhone?: string;
  fatherName?: string;
  motherName?: string;
  parentName?: string;
  dob?: string;
  dateOfBirth?: string;
  address?: string;
  academicYear?: string;
  customFields?: Record<string, string>;
  extraData?: Record<string, any>;
  photoDataUrl: string; // Base64 data URL or Storage URI
  status: 'Active' | 'Pending' | 'Printed' | 'Processing';
  fulfillmentStatus?: 'Fulfilled' | 'Unfulfilled' | 'Processing' | 'Refunded' | 'On Hold';
  paymentStatus?: 'Paid' | 'Pending' | 'Refunded';
  channel?: string;
  totalAmount?: string;
  workerId?: number;
  collectedBy?: string;
  location?: string;
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
  updatedAt?: Date;
  syncedAt?: Date;
}

// 2. Batch Folders (Collector -> Designer -> Print Workflow)
interface BatchFolder {
  id?: number;
  name: string;
  sourceType: 'Excel Import' | 'Manual Intake' | 'Archive Digitizer' | 'Paper Document OCR' | 'Batch Asset Matcher';
  status: 'Ready for Design' | 'In Design' | 'Approved' | 'Printed' | 'Archived';
  collectorName: string;
  totalRecords: number;
  assignedDesigner?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  syncedAt?: Date;
}

// 3. Card Templates (Custom Canvas Vector Layouts)
interface CardTemplate {
  id?: number;
  name: string;
  category?: string;
  orientation?: 'horizontal' | 'vertical';
  themeId?: string;
  frontElements: CanvasElement[];
  backElements: CanvasElement[];
  backgroundColor: string;
  backBackgroundColor: string;
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  syncedAt?: Date;
}

// 4. Vector Canvas Element Schema (High-Precision 300 DPI Canvas Layer)
interface CanvasElement {
  id: string;
  type: 'text' | 'image' | 'rect' | 'circle' | 'line' | 'arrow' | 'qr' | 'barcode' | 'badge' | 'photo' | 'frame' | 'dataField' | 'heading' | 'subtext' | 'mono' | 'pill' | 'star' | 'polygon' | 'triangle' | 'hexagon' | 'badgeShield' | 'seal' | 'hologram' | 'guilloche' | 'securityGrid' | 'cornerBracket' | 'stamp' | 'ribbon' | 'chip' | 'rfid' | 'signature' | 'badge3d' | 'star3d' | 'diamond' | 'heart' | 'cloud' | 'shield' | 'parallelogram' | 'trapezoid' | 'chevron' | 'freehand';
  x: number;
  y: number;
  width?: number;
  height?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  rotation?: number;
  flipX?: boolean;
  flipY?: boolean;
  locked?: boolean;
  visible?: boolean;
  name?: string;
  zIndex?: number;
  // Typography
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  letterSpacing?: number;
  lineHeight?: number;
  textDecoration?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  dataField?: string;
  // Gradient & Fill Engine
  fillType?: 'solid' | 'linear-gradient' | 'radial-gradient' | 'pattern';
  gradientStart?: string;
  gradientEnd?: string;
  gradientAngle?: number;
  gradientStops?: Array<{ offset: number; color: string }>;
  // Shadows & Glow
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  // Geometry & 4-Corner Per-Angle Roundness
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
  // Photo Frame & Clipping Masks
  isFrame?: boolean;
  frameShape?: string;
  shapePreset?: string;
  isCircle?: boolean;
  // Image & Cropping
  src?: string;
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  // QR & Barcode Payloads
  qrPayload?: string;
  barcodeType?: string;
  barcodeValue?: string;
}

// 5. User Accounts & RBAC
interface UserAccount {
  id?: number;
  name: string;
  email: string;
  role: 'admin' | 'designer' | 'collector' | 'guest';
  status: 'Active' | 'Suspended' | 'Pending';
  lastLogin: string;
  createdAt: Date;
}
```

### 3.2. Central PostgreSQL Relational Schema

1. **`organizations`** — Multi-tenant organization profile and configuration.
2. **`users`** — Enterprise user credentials, password hashes, and assigned RBAC roles.
3. **`batches`** — Batch folder records with status, assigned designers, and record counters.
4. **`persons`** — Personnel records with JSONB `custom_fields` for adaptive schema ingestion.
5. **`templates` & `template_versions`** — Immutable card template versioning with front/back element trees.
6. **`generation_jobs`** — Asynchronous render jobs (`QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`).
7. **`audit_logs`** — Security audit records containing action, actor ID, target entity, client IP, and payload diffs.
8. **`workers`** — Field collector telemetry, status (`Online`, `Offline`, `In Field`), and collection metrics.

---

## 4. Complete Workspace & Module Matrix (13 Modules)

### 4.1. Overview & Operational Dashboard (`/` or `/overview`)
- **Clean Responsive Analytics:** Simplified executive view with high-contrast typography, focused metrics, print fulfillment rate, active field stations, and live database metrics.
- **Roster Management:** Fast roster table with multi-selection, search, filtering by fulfillment status (`Unfulfilled`, `Processing`, `Fulfilled`), direct inspection modal, and batch deletion.
- **Source Folders & Batches View:** Visual card grid of operational batch folders showing progress bars (% fulfilled), workflow statuses (`Ready for Design`, `In Design`, `Approved`, `Printed`, `Archived`), and navigation shortcuts.

### 4.2. Data Collector & Field Enrollment (`/collector`)
- **Kiosk Mode:** Streamlined single-personnel intake kiosk with live webcam portrait capture, auto-framing, department/category assignment, and instant card preview.
- **Active Folder Management:** Dedicated folder selector ensuring all newly enrolled records are strictly assigned to active operational folders.

### 4.3. Bulk Ingestion & Archive Digitizer Hub (`/digitizer`)
- **Ledger OCR & Digitizer Tab:** Multi-slot physical registration book slicing (1 to 8 cards per page) with Gemini 3.6 Vision AI OCR and automatic photo cropping.
- **Adaptive Category Schema Bar:** Automatically extracts dynamic form fields (Father Name, DOB, Blood Group, Address, Custom Categories) with 1-click batch expansion.
- **3-Zone Batch Asset Matcher Tab (`BatchAssetMatcherHub`):** Bulk ingestion dropping Master Excel/CSV + Photos ZIP + QR Codes ZIP with automatic filename-to-personnel matching and one-click database commit.

### 4.4. Canvas Designer (`/designer`)
- **Full Vector Artboard:** Free-form graphic design editor (Photoshop/Canva/Illustrator style) at 300 DPI CR80 dimensions.
- **In-Place Canvas Text Editing:** Double-click in-canvas text editing supporting continuous, uninterrupted multi-letter and paragraph entry with font styling and hotkey isolation.
- **Canva-Style Photo Frames & Standard Sizes:** Standard Photo Size slots (Passport 2x2", ID Portrait 35x45mm, Driver License, 3:4 Portrait, Circle Avatar, Arched Portal) and custom clipping masks (Squircle, Hexagon, Shield, Heart, Diamond, Cloud) with automatic binding to real person portraits (`person.photoDataUrl`).
- **4-Corner Per-Angle Roundness Controls:** Independent per-angle corner radii adjustment (`TL`, `TR`, `BR`, `BL`) via top contextual toolstrip and right property panel with instant Konva & Canvas 2D rendering.
- **Clipboard Actions & Cropping:** Full Cut (`Ctrl+X`), Copy (`Ctrl+C`), Paste (`Ctrl+V`), and Duplicate (`Ctrl+D`) operations with undo/redo stack persistence, plus interactive raster Image Cropping (`cropX, cropY, cropWidth, cropHeight`).
- **Graphics & Security Emblems Studio:** Comprehensive vector library of Official Security Shield Crests, Verified Seals, 3D Gold Medals, 3D Faceted Stars, Biometric Smart Chips, Contactless RFID Waves, Anti-Counterfeit Guilloche Waves, Security Microgrids, and Framing Brackets.
- **Amharic & Multi-Language Typography Engine:** Integrated Google Fonts API key (`AIzaSyAQAXtoO9CnmQA4LpOYv8kklegs6mEXdJY`) with 14+ Ethiopian / Ge'ez fonts (Noto Sans Ethiopic, Abyssinica SIL, Kefa, Nyala, Yigezu Bisrat Goha, WashRa, Tint, Power Geez, Addis, Jiret, Bate, Ethiopic Fantuwua, Ethiopian Hiwote, Ethiopic Washra Bold) and full font category filtering.
- **Multi-Format Import:** Imports `.psd` (Adobe Photoshop via `ag-psd`), `.fig` / Figma JSON via REST API, `.svg`, and raster images (`.png`, `.jpg`, `.pdf`).
- **AI Optical Deconstructor & Inpainter:** Automatically segments raster cards into moveable vector layers and inpaints background artwork to eliminate sample text/photo ghosting.

### 4.5. ID Card Studio (`/studio`)
- **Live Vector & Custom Template Preview:** Real-time dual-face preview rendering custom canvas templates with clean photo frame clipping directly through the high-resolution 300 DPI canvas engine.
- **Folder Filtering & Roster Navigation:** Browse personnel by batch folders, search records, cycle through individuals, replace photos on the fly, and toggle front/back faces.
- **Quick Action Links:** 1-click launch into Paper Print Studio with current selection pre-loaded.

### 4.6. Paper Print & Imposition Studio (`/print`)
- **Standard & Custom Dimensions:** CR80 (85.6×54mm), CR79, CR90, CR100, and persistent custom millimeter presets.
- **Global Sheet Mirror Controls:** Global Horizontal, Global Vertical, and Duplex Backs Auto-Mirror for reverse transfers and laminate sheets.
- **Multi-Card Imposition Engine:** A4, A3, Letter, and Legal sheets with 8-Up Duplex (4 Fronts + 4 Backs), 8-Up Fronts, 10-Up Fronts, and custom grid presets.
- **True 300 DPI Vector PDF Export:** High-density vector PDF generation via `pdf-lib` with crop marks, fold lines, and bleed guides.

### 4.7. Batch Folders Manager (`/batches`)
- **Lifecycle Tracking:** Comprehensive management of all operational batch folders across stages (`Ready for Design` → `In Design` → `Approved` → `Printed` → `Archived`).
- **Bulk Operations:** Designer assignment, batch status updates, and roster export.

### 4.8. ID Verification Scanner (`/verify`)
- **Field Credential Verification:** Live webcam/mobile camera QR code and barcode scanner.
- **Instant Cryptographic & Database Lookup:** Validates credential authenticity against local IndexedDB and central PostgreSQL database records.

### 4.9. User Management & Access Control (`/users`)
- **Enterprise User Administration:** Create, activate, suspend, and configure user accounts.
- **Role Assignment:** Configures user permissions across Administrator, Designer, Data Collector, and Guest roles.

### 4.10. Audit Logs & Compliance (`/audit`)
- **Security Audit Trail:** Immutable log of system events, logins, batch modifications, template edits, and print runs.
- **Telemetry & IP Tracking:** Captures client IP, actor identity, action type, and JSON payload diffs.

### 4.11. Staff Live Tracking (`/staff`)
- **Field Telemetry:** Real-time overview of active enrollment stations, field collectors, and assigned geographic zones.
- **Productivity Metrics:** Tracks records collected, uptime status (`Online`, `Offline`, `In Field`), and station throughput.

### 4.12. Role Picker & Session Switcher (`/role-picker`)
- **Fast Session Switcher:** Quick role-switching interface for demonstrating multi-persona workflows during presentations and QA testing.

### 4.13. System Settings & Configuration (`/settings`)
- **Organization Branding:** Configure organization name, licensing/enclave codes, hotline, and addresses.
- **Printer & Hardware Setup:** Target DPI selection (300/600 DPI), printer driver classification, and bleed margins.
- **Workspace State Management:** 1-click database reset ("Wipe All Data & Start Fresh"), sample starter pack loader, and full JSON backup export/import.

---

## 5. Backend REST API & Synchronization Protocol

### 5.1. REST API Route Surface

| Route Prefix | Controller / Service | Key Capabilities |
|---|---|---|
| `/api/v1/health` | `health.routes.ts` | System health check (Postgres status, storage engine, queue status, uptime) |
| `/api/v1/sync` | `sync.routes.ts` | Delta push (`/push`), delta pull (`/pull`), and sync status (`/status`) |
| `/api/v1/persons` | `persons.routes.ts` | CRUD personnel records with JSONB custom fields |
| `/api/v1/batches` | `batches.routes.ts` | Batch folder management, status progression, and designer assignment |
| `/api/v1/templates` | `templates.routes.ts` | Template management and immutable template version tree |
| `/api/v1/jobs` | `jobs.routes.ts` | Submit generation jobs, poll progress, and retrieve batch outputs |
| `/api/v1/users` | `users.routes.ts` | Enterprise user management and RBAC authentication |
| `/api/v1/audit` | `audit.routes.ts` | Security audit trail querying and filtering |
| `/api/v1/workers` | `workers.routes.ts` | Field collector worker telemetry and intake counts |
| `/api/v1/storage` | `storage.routes.ts` | Media uploads (photos, signatures, QR codes) with isolated pathing |

### 5.2. Delta Sync Protocol

```
Local Client (Dexie.js)                   Central Backend (PostgreSQL)
        |                                              |
        |--- 1. POST /api/v1/sync/push --------------->| (Upsert modified records)
        |    { persons, batches, templates, lastSync } |
        |                                              |
        |<-- 2. Push Acknowledged (syncedAt timestamp)-|
        |                                              |
        |--- 3. GET /api/v1/sync/pull?since={timestamp}->| (Fetch remote changes)
        |                                              |
        |<-- 4. Return server delta -------------------|
        |                                              |
        |--- 5. Apply Delta to Dexie Local DB -------->| (Zero conflict local merge)
```

---

## 6. Role-Based Access Control (RBAC) Matrix

| Workspace / Route | Admin | Designer | Data Collector | Guest (Viewer) |
|---|:---:|:---:|:---:|:---:|
| **Overview Dashboard** (`/overview`) | Full Access | Full Access | Full Access | Read-Only |
| **ID Card Studio** (`/studio`) | Full Access | Full Access | Hidden | View Only |
| **Canvas Designer** (`/designer`) | Full Access | Full Access | Hidden | Hidden |
| **Paper Print Studio** (`/print`) | Full Access | Full Access | Hidden | Hidden |
| **Data Collector** (`/collector`) | Full Access | Hidden | Full Access | Hidden |
| **Archive Digitizer** (`/digitizer`) | Full Access | Full Access | Full Access | Hidden |
| **Batch Folders** (`/batches`) | Full Access | Full Access | View Only | View Only |
| **ID Verification** (`/verify`) | Full Access | Full Access | Full Access | Full Access |
| **User Management** (`/users`) | Full Access | Hidden | Hidden | Hidden |
| **Audit Logs** (`/audit`) | Full Access | Hidden | Hidden | Hidden |
| **Staff Tracking** (`/staff`) | Full Access | Hidden | View Only | Hidden |
| **System Settings** (`/settings`) | Full Access | View Only | View Only | View Only |

---

## 7. Operational Commands & Build Integrity

### Development & Execution
- **Run Frontend Client:** `npm run dev:frontend` (starts Vite on `http://localhost:5173`)
- **Run Backend Server:** `npm run dev:backend` (starts Express/TSX on `http://localhost:3001`)
- **Run Full Stack:** `npm run dev` (starts frontend dev server)
- **Database Migrations:** `npm run migrate` (applies PostgreSQL schema migrations)

### Production Build & Verification
- **Frontend Build:** `npm run build:frontend` (`tsc -b && vite build`) ➡️ **0 Errors**
- **Backend Build:** `npm run build:backend` (`tsc`) ➡️ **0 Errors**
- **Full Production Build:** `npm run build` ➡️ **0 Errors**
