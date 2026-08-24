# Pre-Production Product — Architecture & Technical Specification

**Platform Name:** SiliconLabs Enterprise ID & Credential Management Platform  
**System Classification:** Pre-Production Enterprise Web Application (Client-Side Enclave / PWA Ready)  
**Target Environment:** Local Enterprise Enclave, On-Premise Workstation, Field Tablets, & Edge Terminals  

---

## 1. System Overview & Executive Summary

The SiliconLabs Enterprise ID Platform is a comprehensive, client-side credential generation, biometric intake, template design, batch management, archive digitizer, and high-resolution (300 DPI) paper imposition printing system.

Unlike basic mockup tools, this platform runs a complete client-side architecture with:
- Persistent local database (IndexedDB via Dexie.js v6)
- High-fidelity 300 DPI vector/canvas rasterizer
- Multi-card imposition engine for A4, A3, Letter, and Legal paper sheets
- Real-time OCR document intake engine
- Multi-slot book archive digitizer with smart auto-cropping and Excel pairing
- Full Canvas Designer (Canva/Photoshop-style vector layering, SVG/text/barcode/QR rendering)
- Role-Based Access Control (RBAC) across Administrator, Designer, Field Collector, and Guest profiles

---

## 2. Core Architecture & Tech Stack

| Layer | Technologies / Libraries | Purpose & Implementation |
|---|---|---|
| **Core Framework** | React 18 + TypeScript + Vite | Ultra-fast SPA application with typed domain models |
| **State & Local Storage** | Dexie.js (IndexedDB v6 schema) | Persistent zero-latency local database for people, folders, custom canvas templates, workers, and archive templates |
| **Styling & Design Tokens** | CSS Variables (`--bg-root`, `--bg-surface`, `--text-primary`), Tailwind CSS, Inter & JetBrains Mono Fonts | Dark/Light mode theme system with enterprise fintech/industrial aesthetics |
| **Canvas & Vector Engine** | HTML5 Canvas 2D + Custom Vector Layering (`renderStudioCard.ts`) | 300 DPI CR80 (85.6mm × 54mm) front & back dual-face rendering with dynamic element binding |
| **Document OCR & Scanner** | Tesseract.js + Canvas Grayscale/Binarization + Regex Field Parsers | Automatic text extraction and face/photo auto-cropping for physical registration forms |
| **QR & Barcodes** | `qrcode` (ISO/IEC 18004) + `bwip-js` (Code 128) | True scannable vector & raster barcode/QR code generation with dynamic ID binding |
| **Print & PDF Imposition** | `pdf-lib` + `downloadPdf` | Multi-card imposition (8-up duplex, 8-up fronts, 10-up fronts, custom) with crop marks, fold lines, and bleed guides |
| **Data Interchange** | `xlsx` (SheetJS) | Full Excel import/export with column mapping modal for bulk rosters |

---

## 3. Database Schema (Dexie v6 Enclave)

The application maintains 6 relational stores inside the local browser enclave:

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
  photoDataUrl: string; // Base64 data URL
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
}

// 2. Batch Folders (Collector -> Designer Workflow)
interface BatchFolder {
  id?: number;
  name: string; // e.g. "Grade 10 Students 2026"
  sourceType: 'Excel Import' | 'Manual Intake' | 'Archive Digitizer' | 'Paper Document OCR';
  status: 'Ready for Design' | 'In Design' | 'Approved' | 'Printed' | 'Archived';
  collectorName: string;
  totalRecords: number;
  assignedDesigner?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 3. Card Templates (Custom Canvas Designer Layouts)
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
}

// 4. Archive Page Templates (Multi-Slot Book Extraction)
interface ArchivePageTemplate {
  id?: number;
  name: string;
  description?: string;
  slotsCount: number;
  slots: ArchiveCropSlot[];
  sampleImageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 5. Field Workers & Enclave Operators
interface Worker {
  id?: number;
  name: string;
  email: string;
  role: string;
  avatar: string;
  status: 'Online' | 'Offline' | 'In Field';
  location: string;
  recordsCollected: number;
  createdAt: Date;
}

// 6. User Accounts (RBAC System)
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

---

## 4. Workspaces & Functional Modules

### 4.1. Overview & Operational Dashboard (`/overview`)
- **Real-Time Analytics:** Total intake counter, print fulfillment rate, active field stations, and database metrics.
- **Roster Management:** Full table view with multi-selection, search, filtering by fulfillment status (`Unfulfilled`, `Processing`, `Fulfilled`), direct inline editing, inspection modal, and batch deletion.
- **Source Folders & Batches View:** Visual card grid of all batch folders showing progress bars (% fulfilled), workflow statuses (`Ready for Design`, `In Design`, `Approved`, `Printed`, `Archived`), inline folder renaming, status updating, and one-click navigation to ID Studio or Print Studio.

### 4.2. Data Collector & Biometric Onboarding (`/collector`)
- **Batch Folder Management Bar:** Allows field collectors to create named batch folders, switch active folders, set folder statuses, and rename/delete folders.
- **Direct Biometric Registration Form:** Photo capture via live webcam stream or file upload with auto-framing, department/category classification, contact information, and auto-generated ID numbers.
- **Excel Bulk Import:** SheetJS parser supporting `.xlsx`/`.csv` with drag-and-drop file ingestion, automatic column mapping modal, and batch insertion.
- **Paper Document OCR Scanner:** Live document camera stream or image dropzone. Real Tesseract OCR engine extracts Full Name, ID Number, Category, Role, and Phone via regex pattern matching, automatically extracts the cropped portrait photo, and verifies image variance to prevent blank crops.

### 4.3. Archive Book Digitizer (`/digitizer`)
- **Designed for:** Historical registry books, physical photo logs, and paper archives with multi-row photo grids.
- **Dynamic Slot Layouts:** Supports 1-slot, 2-slot, 3-slot, 4-slot, 5-slot (stacked), and 8-slot multi-column arrangements.
- **Custom Visual Crop Designer:** Interactive percentage-based bounding box adjusters for exact alignment with physical ledger pages.
- **Automatic Excel Pairing:** Upload scanned ledger pages and an Excel student roster file simultaneously; the digitizer auto-slices the photos into distinct portrait crops and matches each slot with the corresponding Excel row.
- **Direct Database Push:** One-click ingestion into the active batch folder for immediate card design in ID Studio. Accessible by both Data Collector and Designer roles.

### 4.4. Canvas Designer (`/designer`)
- **Full Vector Artboard:** Free-form graphic design editor (Photoshop/Canva style) for creating custom front & back ID card templates at 300 DPI CR80 dimensions.
- **Toolbox:** Add text, rectangle/shapes, circular avatar frames, dynamic photo containers, real QR codes (`{{id_number}}`, `{{phone}}`), and Code 128 barcodes.
- **Layer & Style Controls:** Z-index reordering, element locking, opacity, stroke width, fill color, font family, alignment, letter spacing, corner radius, and rotation.
- **Dynamic Data Binding:** Support for `{{full_name}}`, `{{id_number}}`, `{{department}}`, `{{role}}`, `{{phone}}`, `{{blood_group}}`, `{{joined_date}}`, and `{{status}}`.
- **Database Synchronization:** Direct save/update to the Dexie `templates` table with instant availability across ID Card Studio and Paper Print Studio.

### 4.5. ID Card Studio (`/studio`)
- **Live Vector & Custom Template Preview:** Real-time dual-face preview rendering custom canvas templates directly through the high-resolution 300 DPI canvas engine.
- **Built-in Presets:** Corporate Enclave, Modern Teal, Velvet Crimson, Dark Executive, Minimal Clean, etc.
- **Folder Filtering & Roster Navigation:** Browse personnel by batch folders, search records, cycle through individuals, replace photos on the fly, and toggle front/back faces.
- **Customization Controls:** Corner radius, photo zoom/scaling, accent colors, badge header backgrounds, font family switching, and QR/barcode toggle.
- **Quick Action Links:** 1-click launch into Paper Print Studio with current selection pre-loaded.

### 4.6. Paper Print & Imposition Studio (`/print`)
- **Card Size Standardization & Customization:**
  - **CR80 Standard ID (Default):** 85.6 × 54.0 mm (3.375" × 2.128", 1012 × 638 px @ 300 DPI)
  - **CR79 Proximity Overlay:** 84.0 × 52.0 mm (3.303" × 2.051", 992 × 614 px @ 300 DPI)
  - **CR90 Oversized ID:** 92.0 × 60.0 mm (3.622" × 2.362", 1087 × 709 px @ 300 DPI)
  - **CR100 Event Badge:** 98.5 × 67.0 mm (3.878" × 2.638", 1163 × 791 px @ 300 DPI)
  - **Custom Dimensions:** Precision millimeter width/height inputs with live inch and 300 DPI resolution calculations.
- **Multi-Card Imposition Engine:** Lays out multiple ID cards onto physical production print sheets.
- **Supported Paper Formats:** A4 Commercial (210×297mm), A3 Production (297×420mm), US Letter (8.5×11"), US Legal (8.5×14"), and Custom Dimensions.
- **Imposition Presets:**
  - `8-Up Duplex (4 Fronts + 4 Backs)`: Front cards in left column, corresponding back sides in right column for fold-and-laminate production.
  - `8-Up Fronts Only` & `10-Up Fronts Only`: Maximum density single-face sheets.
  - `Custom Grid`: User-defined row and column matrix.
- **Mobile Responsive Design & Auto-Fit:**
  - On phone/tablet viewports, the sheet canvas automatically scales to fit the screen width without horizontal overflow.
  - Interactive zoom controls (`−`, `+`, `Fit`) allow zooming up to 180% with full pan/scroll on the artboard while navigation headers and bottom bar stay anchored.
  - Contextual Mobile Bottom Toolbar provides one-touch access to `Roster`, `Artboard`, `Specs`, `Impose`, and `PDF Export`.
- **Vector PDF Export:** Generates true 300 DPI production-ready vector PDF sheets via `pdf-lib` with automatic browser download (`SiliconLabs_A4_300DPI_Batch.pdf`).

### 4.7. System Settings & Administration (`/settings`)
- **Organization Profile:** Company branding, official issuer name, licensing/enclave code, regional location, contact coordinates, and department taxonomies.
- **Mobile Navigation Sub-Tabs:** Role-aware horizontal navigation tabs (`Authority`, `Printer`, `Database`, `Profile`).
- **Printer & Hardware Configuration:** Target DPI calibration (300/600 DPI), printer driver selection (Direct-to-Card, Retransfer, Desktop Sheetfed), and bleed offsets.
- **Database & Storage Management:** Live record count tally (81 personnel across 5 batch folders), full JSON database backup export, backup restore importer, and factory reset actions.
- **Role-Based Access Control (RBAC):** Interactive user permission management, role assigner (`admin`, `designer`, `collector`, `guest`), and session switching.

---

## 5. PWA & Service Worker Offline Caching Strategy

- **Production Caching:** High-speed offline caching of core shell assets (`/`, `/index.html`, `/manifest.json`, `/favicon.ico`) with cache invalidation on new service worker activation (`siliconlabs-id-v3`).
- **Scheme Isolation:** Explicitly ignores non-HTTP/HTTPS schemes (`chrome-extension:`, `blob:`, `data:`) to prevent runtime Cache API exceptions.
- **Development Mode Bypass:** Vite development modules (`/@vite`, `/src/`, `/node_modules/`, `?v=`, `.ts`, `.tsx`, and port 5173) are excluded from service worker caching, with automatic unregistration on `localhost` to prevent duplicate React module collisions.

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
| **System Settings** (`/settings`) | Full Access | View Only | View Only | View Only |

---

## 7. End-to-End Production Workflow

```
[Field / Archive Stage]
  1. Field Collector creates a Batch Folder (e.g., "Software Engineering Unit")
  2. Data collected via Manual Form, Webcam Photo, Excel Roster, or Archive Digitizer
  3. Status set to -> "Ready for Design"

[Design & Verification Stage]
  4. Designer opens Canvas Designer to build/edit custom front & back templates
  5. Designer switches to ID Card Studio, selects the Batch Folder, applies custom template
  6. Live 300 DPI canvas preview verifies all data bindings (Name, Photo, QR, Barcode)
  7. Status set to -> "Approved"

[Production & Printing Stage]
  8. Operator opens Paper Print Studio with Approved Batch
  9. Selects card format (CR80 standard default / CR79 / CR90 / CR100 / Custom) and paper imposition layout (8-Up Duplex / 10-Up)
  10. System generates high-resolution 300 DPI print sheet PDF with crop marks & fold guides
  11. Cards printed, laminated, and status set to -> "Printed"
```

---

## 8. Verification & Build Integrity

The codebase is strictly validated with automated TypeScript builds:
- Command: `npm run build` (`tsc -b && vite build`)
- Target: ES2020 / Production Bundle
- Status: **Exit Code 0 (Zero Errors)**
- Bundle Chunk: Clean distribution in `/dist` directory
- Change Tracking: Maintained in `AI_TRACKER.md` on every feature update.
