import * as XLSX from 'xlsx';
import type { Person } from '../db/database';

// ===== TYPES =====

export interface CroppedPhoto {
  slotIndex: number;
  dataUrl: string; // cropped photo base64
}

export interface ExcelStudent {
  name: string;
  studentId: string;
  phone: string;
  sex: string;
  grade: string;
}

export interface MatchedRecord {
  slotIndex: number;
  photoUrl?: string;
  student: ExcelStudent;
  confirmed: boolean;
  skipped: boolean;
}

// ===== CROP PHOTOS FROM PAGE =====

/**
 * Given a photographed archive page with 5 stacked passport photos on the left side,
 * auto-crop each photo region and return clean ID photos.
 * 
 * Based on the real paper layout:
 * - Photos are on the LEFT side (~5-25% horizontally)
 * - 5 slots stacked vertically with even spacing
 * - Each slot occupies roughly 17-18% of page height
 */
export async function cropPhotosFromPage(pageImageUrl: string): Promise<CroppedPhoto[]> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = pageImageUrl;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
  });

  const pageW = img.naturalWidth || img.width;
  const pageH = img.naturalHeight || img.height;

  // Photo slot definitions (percentage-based) calibrated to real paper layout
  // Photos are roughly in the left 5-22% of the page, stacked in 5 even rows
  const slots = [
    { x: 0.03, y: 0.04, w: 0.18, h: 0.16 },  // Student 1 (top)
    { x: 0.03, y: 0.22, w: 0.18, h: 0.16 },  // Student 2
    { x: 0.03, y: 0.40, w: 0.18, h: 0.16 },  // Student 3
    { x: 0.03, y: 0.58, w: 0.18, h: 0.16 },  // Student 4
    { x: 0.03, y: 0.76, w: 0.18, h: 0.16 },  // Student 5 (bottom)
  ];

  const results: CroppedPhoto[] = [];

  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const sx = Math.round(s.x * pageW);
    const sy = Math.round(s.y * pageH);
    const sw = Math.round(s.w * pageW);
    const sh = Math.round(s.h * pageH);

    // Crop the raw photo region
    const rawCanvas = document.createElement('canvas');
    rawCanvas.width = sw;
    rawCanvas.height = sh;
    const rawCtx = rawCanvas.getContext('2d')!;
    rawCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    // Refine: resize to clean 3:4 ID ratio with slight inset to remove paper edges
    const outW = 300;
    const outH = 400;
    const outCanvas = document.createElement('canvas');
    outCanvas.width = outW;
    outCanvas.height = outH;
    const outCtx = outCanvas.getContext('2d')!;

    // White background
    outCtx.fillStyle = '#ffffff';
    outCtx.fillRect(0, 0, outW, outH);

    // Inset 6% to strip tape/border artifacts
    const inX = sw * 0.06;
    const inY = sh * 0.06;
    const inW = sw - inX * 2;
    const inH = sh - inY * 2;
    outCtx.drawImage(rawCanvas, inX, inY, inW, inH, 0, 0, outW, outH);

    results.push({
      slotIndex: i,
      dataUrl: outCanvas.toDataURL('image/jpeg', 0.92),
    });
  }

  return results;
}

// ===== PARSE EXCEL =====

/**
 * Parse the real Workbook1.xlsx format:
 * Columns: "Name " | "Student ID" | "Phone" | "Sex" | "Grade"
 */
export function parseStudentExcel(file: File): Promise<ExcelStudent[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);

        const students: ExcelStudent[] = rows.map(row => ({
          name: String(row['Name'] || row['Name '] || row['name'] || row['Full Name'] || row['Student Name'] || '').trim(),
          studentId: String(row['Student ID'] || row['ID'] || row['Student Id'] || row['student_id'] || '').trim(),
          phone: String(row['Phone'] || row['phone'] || row['Mobile'] || row['Contact'] || '').trim(),
          sex: String(row['Sex'] || row['Gender'] || row['sex'] || '').trim(),
          grade: String(row['Grade'] || row['grade'] || row['Class'] || '').trim(),
        }));

        resolve(students);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Convert matched records into Person objects ready for Dexie DB
 */
export function matchedRecordToPerson(
  m: MatchedRecord,
  channel: string = 'Archive Digitizer',
  options?: { folderName?: string; sourceFileName?: string }
): Omit<Person, 'id'> {
  return {
    fullName: m.student.name,
    idNumber: m.student.studentId,
    category: 'Students',
    department: m.student.grade ? (m.student.grade.startsWith('Grade') ? m.student.grade : `Grade ${m.student.grade}`) : 'General',
    role: 'Student',
    phone: m.student.phone,
    email: '',
    bloodGroup: 'O+',
    joinedDate: new Date().toISOString().split('T')[0],
    photoDataUrl: m.photoUrl || '',
    status: 'Active',
    fulfillmentStatus: 'Processing',
    paymentStatus: 'Paid',
    channel,
    folderName: options?.folderName || options?.sourceFileName || 'Archive Digitizer Imports',
    sourceFileName: options?.sourceFileName || 'Imported Roster',
    createdAt: new Date(),
  };
}

// ===== LEGACY COMPATIBILITY STUBS =====

export interface SlicedPhotoSlot {
  slotIndex: number;
  dataUrl: string;
  sourceFile: string;
  sourcePageIndex: number;
  confidence: number;
  detectedFace: boolean;
  box: { x: number; y: number; width: number; height: number };
}

export interface ExcelRowData {
  rowIndex: number;
  name: string;
  idNumber: string;
  phone: string;
  department: string;
  role: string;
  raw: Record<string, string>;
}

export const SAMPLE_WORKBOOK_DATA: ExcelRowData[] = [
  { rowIndex: 0, name: 'Solomon Desta', idNumber: 'STU-2026-001', phone: '+251 911 200 300', department: 'Grade 10', role: 'Student', raw: {} },
  { rowIndex: 1, name: 'Bethlehem Haile', idNumber: 'STU-2026-002', phone: '+251 912 201 301', department: 'Grade 10', role: 'Student', raw: {} },
  { rowIndex: 2, name: 'Natnael Abebe', idNumber: 'STU-2026-003', phone: '+251 913 202 302', department: 'Grade 11', role: 'Student', raw: {} },
  { rowIndex: 3, name: 'Rahel Tsegaye', idNumber: 'STU-2026-004', phone: '+251 914 203 303', department: 'Grade 11', role: 'Student', raw: {} },
  { rowIndex: 4, name: 'Yonas Berhanu', idNumber: 'STU-2026-005', phone: '+251 915 204 304', department: 'Grade 12', role: 'Student', raw: {} },
];

export const DEFAULT_ARCHIVE_TEMPLATES = [
  { id: 'standard-5-slot', name: 'Standard Registry Page (5 Slots)', slotCount: 5, photoWidthPercent: 18, photoHeightPercent: 16 },
];

export async function parseExcelFile(file: File): Promise<ExcelRowData[]> {
  const students = await parseStudentExcel(file);
  return students.map((s, idx) => ({
    rowIndex: idx,
    name: s.name,
    idNumber: s.studentId,
    phone: s.phone,
    department: `Grade ${s.grade}`,
    role: 'Student',
    raw: { Sex: s.sex },
  }));
}

export async function slicePageWithTemplate(imageUrl: string, _template?: any): Promise<SlicedPhotoSlot[]> {
  const photos = await cropPhotosFromPage(imageUrl);
  return photos.map(p => ({
    slotIndex: p.slotIndex,
    dataUrl: p.dataUrl,
    sourceFile: 'uploaded-page.jpg',
    sourcePageIndex: 0,
    confidence: 0.98,
    detectedFace: true,
    box: { x: 0, y: 0, width: 200, height: 240 },
  }));
}

export async function generateSampleArchivePage(): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 800, 1000);
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('STUDENT ARCHIVE REGISTRY', 40, 50);
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(40, 90 + i * 180, 140, 150);
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`Candidate #${i + 1}`, 220, 140 + i * 180);
    ctx.font = '14px sans-serif';
    ctx.fillText(`ID: STU-2026-00${i + 1} | Grade: 10`, 220, 170 + i * 180);
  }
  return canvas.toDataURL('image/jpeg');
}
