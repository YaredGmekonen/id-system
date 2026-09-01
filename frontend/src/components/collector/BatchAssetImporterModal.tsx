import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import type { Person } from '../../db/database';
import { addBatchFolder, bulkAddPeople } from '../../db/hooks';
import {
  Upload,
  FileSpreadsheet,
  Image as ImageIcon,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  Sparkles,
  ArrowRight,
  FolderKanban,
  RefreshCw,
  Search,
  Check,
  Zap,
  HelpCircle,
  FileArchive,
} from 'lucide-react';

interface ParsedSpreadsheetRow {
  rowIndex: number;
  fullName: string;
  idNumber: string;
  gender: string;
  grade: string;
  phone: string;
  expectedPhotoBasename: string;
  expectedQrBasename: string;
  raw: Record<string, any>;
}

interface UploadedAsset {
  id: string;
  file: File | Blob;
  name: string; // e.g. "photo_55_2026-08-22_09-39-39.jpg"
  cleanName: string; // normalized without extension, lowercase
  dataUrl: string;
  category: 'photo' | 'qr';
  suspiciousType?: 'likely-qr-in-photos' | 'likely-photo-in-qr';
}

interface MatchPair {
  row: ParsedSpreadsheetRow;
  photoAsset?: UploadedAsset;
  qrAsset?: UploadedAsset;
  photoStatus: 'matched' | 'missing' | 'custom';
  qrStatus: 'matched' | 'missing' | 'custom';
}

interface BatchAssetImporterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Helper to extract clean filename from Windows or Unix path
function extractBasename(pathStr: string): { filename: string; cleanName: string } {
  if (!pathStr) return { filename: '', cleanName: '' };
  // Split on both / and \
  const segments = String(pathStr).split(/[/\\]/);
  const filename = segments[segments.length - 1]?.trim() || '';
  // Clean name without extension and lowercase
  const cleanName = filename.replace(/\.[^/.]+$/, '').trim().toLowerCase();
  return { filename, cleanName };
}

// Quick image check for QR vs Photo sanity check
async function inspectImageCharacteristics(file: File | Blob, name: string): Promise<'photo' | 'qr'> {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('qr') || lowerName.includes('barcode') || lowerName.includes('code')) {
    return 'qr';
  }
  if (lowerName.includes('photo') || lowerName.includes('pic') || lowerName.includes('img') || lowerName.includes('student')) {
    return 'photo';
  }
  return 'photo';
}

export default function BatchAssetImporterModal({
  isOpen,
  onClose,
  onSuccess,
}: BatchAssetImporterModalProps) {
  // Wizard Steps: 1: Spreadsheet & Folder Name -> 2: Upload Photos & QRs -> 3: Match Review & Manual Pairing -> 4: Commit
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Batch & Spreadsheet
  const [batchName, setBatchName] = useState('');
  const [spreadsheetFileName, setSpreadsheetFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedSpreadsheetRow[]>([]);
  const [spreadsheetError, setSpreadsheetError] = useState<string | null>(null);

  // Step 2: Uploaded Assets
  const [photoAssets, setPhotoAssets] = useState<UploadedAsset[]>([]);
  const [qrAssets, setQrAssets] = useState<UploadedAsset[]>([]);
  const [isDecompressing, setIsDecompressing] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Step 3: Manual match overrides: rowIndex -> assetId
  const [manualPhotoPairs, setManualPhotoPairs] = useState<Record<number, string>>({});
  const [manualQrPairs, setManualQrPairs] = useState<Record<number, string>>({});
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unmatched' | 'complete'>('all');

  // Submitting
  const [isCommitting, setIsCommitting] = useState(false);

  const fileSpreadsheetRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // ===== SPREADSHEET PARSING =====
  const handleSpreadsheetFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSpreadsheetError(null);
    setSpreadsheetFileName(file.name);

    // Auto-suggest batch name from file if empty
    if (!batchName) {
      const suggested = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setBatchName(suggested);
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      // Read as raw 2D array of cells to support multi-line headers (like Column1, Column2 header above real Name, StudentID header)
      const rawMatrix: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

      if (rawMatrix.length < 2) {
        setSpreadsheetError('Spreadsheet contains insufficient rows.');
        return;
      }

      // Determine which row is the actual header (Row 0 or Row 1)
      let headerRowIndex = 0;
      for (let r = 0; r < Math.min(4, rawMatrix.length); r++) {
        const rowStr = rawMatrix[r].map(c => String(c).toLowerCase()).join(' ');
        if (rowStr.includes('name') || rowStr.includes('student') || rowStr.includes('@photo')) {
          headerRowIndex = r;
          break;
        }
      }

      const headers = rawMatrix[headerRowIndex].map(c => String(c).trim());
      const dataRows = rawMatrix.slice(headerRowIndex + 1);

      // Find column indices
      let nameIdx = headers.findIndex(h => /^(?:full\s*name|student\s*name|name)$/i.test(h));
      if (nameIdx === -1) nameIdx = headers.findIndex(h => /name/i.test(h));

      let idIdx = headers.findIndex(h => /^(?:student\s*id|id\s*number|id|code|reg)$/i.test(h));
      if (idIdx === -1) idIdx = headers.findIndex(h => /id|roll|code/i.test(h));

      let genderIdx = headers.findIndex(h => /^(?:sex|gender)$/i.test(h));
      let gradeIdx = headers.findIndex(h => /^(?:grade|class|department|dept)$/i.test(h));
      let phoneIdx = headers.findIndex(h => /^(?:phone|mobile|tel|contact)$/i.test(h));

      // Path columns for @photos and @qr
      let photoPathIdx = headers.findIndex(h => /@photo|photo|picture|image/i.test(h));
      let qrPathIdx = headers.findIndex(h => /@qr|qr|barcode|qrcode/i.test(h));

      const parsed: ParsedSpreadsheetRow[] = [];

      dataRows.forEach((row, i) => {
        // Skip empty rows
        if (!row || row.every(c => !String(c).trim())) return;

        const fullName = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : `Student ${i + 1}`;
        if (!fullName) return;

        const idNumber = idIdx !== -1 ? String(row[idIdx] || '').trim() : `ID-${1000 + i}`;
        const gender = genderIdx !== -1 ? String(row[genderIdx] || '').trim() : '';
        const grade = gradeIdx !== -1 ? String(row[gradeIdx] || '').trim() : 'UKG';
        const phone = phoneIdx !== -1 ? String(row[phoneIdx] || '').trim() : '';

        // Extract raw path strings and compute basenames
        const rawPhotoPath = photoPathIdx !== -1 ? String(row[photoPathIdx] || '').trim() : '';
        const rawQrPath = qrPathIdx !== -1 ? String(row[qrPathIdx] || '').trim() : '';

        const { filename: photoBasename } = extractBasename(rawPhotoPath);
        const { filename: qrBasename } = extractBasename(rawQrPath);

        const rowObj: Record<string, any> = {};
        headers.forEach((h, colIdx) => {
          rowObj[h || `Col_${colIdx}`] = row[colIdx];
        });

        parsed.push({
          rowIndex: i,
          fullName,
          idNumber,
          gender,
          grade,
          phone,
          expectedPhotoBasename: photoBasename,
          expectedQrBasename: qrBasename,
          raw: rowObj,
        });
      });

      if (parsed.length === 0) {
        setSpreadsheetError('Could not parse any valid student records from this spreadsheet.');
        return;
      }

      setParsedRows(parsed);
    } catch (err) {
      console.error(err);
      setSpreadsheetError('Failed to read spreadsheet file. Please check file format.');
    }
  };

  // Helper to read file to base64 data URL
  const readFileDataUrl = (file: File | Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  // ===== BATCH ASSET INGESTION (ZIP / MULTI-FILE) =====
  const processAssetFiles = async (
    files: FileList | File[],
    targetCategory: 'photo' | 'qr'
  ) => {
    setIsDecompressing(true);
    const newAssets: UploadedAsset[] = [];
    const detectedWarnings: string[] = [];

    for (let fIdx = 0; fIdx < files.length; fIdx++) {
      const file = files[fIdx];
      const isZip = file.name.toLowerCase().endsWith('.zip');

      if (isZip) {
        try {
          const zip = await JSZip.loadAsync(file);
          for (const relativePath of Object.keys(zip.files)) {
            const zipEntry = zip.files[relativePath];
            if (zipEntry.dir) continue;

            const lower = zipEntry.name.toLowerCase();
            if (
              lower.endsWith('.jpg') ||
              lower.endsWith('.jpeg') ||
              lower.endsWith('.png') ||
              lower.endsWith('.webp') ||
              lower.endsWith('.svg')
            ) {
              const blob = await zipEntry.async('blob');
              const { filename, cleanName } = extractBasename(zipEntry.name);
              const dataUrl = await readFileDataUrl(blob);

              // Cross-check sanity check
              const likelyType = await inspectImageCharacteristics(blob, filename);
              let suspiciousType: UploadedAsset['suspiciousType'];

              if (targetCategory === 'photo' && likelyType === 'qr') {
                suspiciousType = 'likely-qr-in-photos';
                detectedWarnings.push(`"${filename}" looks like a QR code but was dropped in Photos.`);
              } else if (targetCategory === 'qr' && likelyType === 'photo') {
                suspiciousType = 'likely-photo-in-qr';
                detectedWarnings.push(`"${filename}" looks like a Photo but was dropped in QR codes.`);
              }

              newAssets.push({
                id: `zip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                file: blob,
                name: filename,
                cleanName,
                dataUrl,
                category: targetCategory,
                suspiciousType,
              });
            }
          }
        } catch (err) {
          console.error('ZIP extraction error:', err);
        }
      } else {
        // Individual image file
        const lower = file.name.toLowerCase();
        if (
          lower.endsWith('.jpg') ||
          lower.endsWith('.jpeg') ||
          lower.endsWith('.png') ||
          lower.endsWith('.webp') ||
          lower.endsWith('.svg')
        ) {
          const { filename, cleanName } = extractBasename(file.name);
          const dataUrl = await readFileDataUrl(file);

          const likelyType = await inspectImageCharacteristics(file, filename);
          let suspiciousType: UploadedAsset['suspiciousType'];

          if (targetCategory === 'photo' && likelyType === 'qr') {
            suspiciousType = 'likely-qr-in-photos';
            detectedWarnings.push(`"${filename}" looks like a QR code but was dropped in Photos.`);
          } else if (targetCategory === 'qr' && likelyType === 'photo') {
            suspiciousType = 'likely-photo-in-qr';
            detectedWarnings.push(`"${filename}" looks like a Photo but was dropped in QR codes.`);
          }

          newAssets.push({
            id: `file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            file,
            name: filename,
            cleanName,
            dataUrl,
            category: targetCategory,
            suspiciousType,
          });
        }
      }
    }

    if (targetCategory === 'photo') {
      setPhotoAssets(prev => [...prev, ...newAssets]);
    } else {
      setQrAssets(prev => [...prev, ...newAssets]);
    }

    if (detectedWarnings.length > 0) {
      setWarnings(prev => [...prev, ...detectedWarnings]);
    }
    setIsDecompressing(false);
  };

  // Move misfiled asset from Photos to QR (or vice versa)
  const handleSwapAssetCategory = (assetId: string, fromCat: 'photo' | 'qr') => {
    if (fromCat === 'photo') {
      const asset = photoAssets.find(a => a.id === assetId);
      if (asset) {
        setPhotoAssets(prev => prev.filter(a => a.id !== assetId));
        setQrAssets(prev => [...prev, { ...asset, category: 'qr', suspiciousType: undefined }]);
      }
    } else {
      const asset = qrAssets.find(a => a.id === assetId);
      if (asset) {
        setQrAssets(prev => prev.filter(a => a.id !== assetId));
        setPhotoAssets(prev => [...prev, { ...asset, category: 'photo', suspiciousType: undefined }]);
      }
    }
  };

  // ===== MATCHING LOGIC =====
  const matchedPairs: MatchPair[] = useMemo(() => {
    return parsedRows.map(row => {
      // 1. Photo Match: Check manual override first, then match by expected basename (case-insensitive)
      let photoAsset: UploadedAsset | undefined;
      const manualPhotoId = manualPhotoPairs[row.rowIndex];

      if (manualPhotoId) {
        photoAsset = photoAssets.find(a => a.id === manualPhotoId);
      } else if (row.expectedPhotoBasename) {
        const { cleanName } = extractBasename(row.expectedPhotoBasename);
        photoAsset = photoAssets.find(
          a =>
            a.cleanName === cleanName ||
            a.name.toLowerCase() === row.expectedPhotoBasename.toLowerCase()
        );
      }

      // 2. QR Match: Check manual override first, then match by expected basename
      let qrAsset: UploadedAsset | undefined;
      const manualQrId = manualQrPairs[row.rowIndex];

      if (manualQrId) {
        qrAsset = qrAssets.find(a => a.id === manualQrId);
      } else if (row.expectedQrBasename) {
        const { cleanName } = extractBasename(row.expectedQrBasename);
        qrAsset = qrAssets.find(
          a =>
            a.cleanName === cleanName ||
            a.name.toLowerCase() === row.expectedQrBasename.toLowerCase()
        );
      }

      return {
        row,
        photoAsset,
        qrAsset,
        photoStatus: photoAsset ? 'matched' : 'missing',
        qrStatus: qrAsset ? 'matched' : 'missing',
      };
    });
  }, [parsedRows, photoAssets, qrAssets, manualPhotoPairs, manualQrPairs]);

  // Unmatched assets pool for manual pairing
  const assignedPhotoIds = new Set(matchedPairs.map(p => p.photoAsset?.id).filter(Boolean));
  const assignedQrIds = new Set(matchedPairs.map(p => p.qrAsset?.id).filter(Boolean));

  const unassignedPhotos = photoAssets.filter(a => !assignedPhotoIds.has(a.id));
  const unassignedQrs = qrAssets.filter(a => !assignedQrIds.has(a.id));

  const matchedCount = matchedPairs.filter(p => p.photoAsset && p.qrAsset).length;
  const partialCount = matchedPairs.filter(p => (p.photoAsset && !p.qrAsset) || (!p.photoAsset && p.qrAsset)).length;
  const missingCount = matchedPairs.filter(p => !p.photoAsset && !p.qrAsset).length;

  // Filtered rows in Step 3
  const filteredPairs = matchedPairs.filter(p => {
    const q = searchFilter.toLowerCase();
    const matchesSearch =
      !q ||
      p.row.fullName.toLowerCase().includes(q) ||
      p.row.idNumber.toLowerCase().includes(q) ||
      p.row.expectedPhotoBasename.toLowerCase().includes(q) ||
      p.row.expectedQrBasename.toLowerCase().includes(q);

    if (!matchesSearch) return false;

    if (statusFilter === 'complete') return p.photoAsset && p.qrAsset;
    if (statusFilter === 'unmatched') return !p.photoAsset || !p.qrAsset;
    return true;
  });

  // ===== COMMIT TO DATABASE =====
  const handleCommit = async () => {
    if (!batchName.trim()) {
      alert('Please enter a Batch Folder name before committing.');
      return;
    }

    setIsCommitting(true);
    try {
      // 1. Create BatchFolder in Dexie DB
      const folderId = await addBatchFolder({
        name: batchName.trim(),
        sourceType: 'Excel Import',
        status: 'Ready for Design',
        collectorName: 'Automated Asset Matcher',
        totalRecords: matchedPairs.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 2. Map all matched pairs into full Person records
      const peopleToInsert: Omit<Person, 'id'>[] = matchedPairs.map(pair => {
        const { row, photoAsset, qrAsset } = pair;

        return {
          fullName: row.fullName,
          firstName: row.fullName.split(' ')[0] || row.fullName,
          lastName: row.fullName.split(' ').slice(1).join(' ') || '',
          idNumber: row.idNumber,
          category: 'Students',
          department: row.grade || 'UKG',
          role: 'Student',
          phone: row.phone || '',
          email: `${row.fullName.toLowerCase().replace(/\s+/g, '.')}@school.internal`,
          gender: row.gender === 'Female' ? 'Female' : 'Male',
          bloodGroup: 'O+',
          joinedDate: new Date().toISOString().split('T')[0],
          schoolName: batchName.trim(),
          grade: row.grade || 'UKG',
          photoDataUrl: photoAsset?.dataUrl || '',
          qrCodeUrl: qrAsset?.dataUrl || '',
          qrPayload: row.idNumber,
          status: 'Active',
          fulfillmentStatus: 'Unfulfilled',
          paymentStatus: 'Paid',
          channel: 'Batch Asset Matcher',
          totalAmount: 'Free',
          workerId: 1,
          collectedBy: 'External Asset Importer',
          location: batchName.trim(),
          batchFolderId: folderId,
          folderName: batchName.trim(),
          sourceFileName: spreadsheetFileName,
          createdAt: new Date(),
        };
      });

      await bulkAddPeople(peopleToInsert);
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Failed to commit batch records:', err);
      alert('Error committing batch records to database.');
    } finally {
      setIsCommitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in text-xs font-sans">
      <div
        className="w-full max-w-5xl max-h-[94vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-primary)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Top Header */}
        <div
          className="p-4 md:px-6 border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#84a92c]/20 text-[#84a92c] border border-[#84a92c]/30">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>External Asset Ingestion & Filename Matcher</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#84a92c]/20 text-[#84a92c] font-mono font-bold">
                  STEP {currentStep} OF 3
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Matches `@photos` and `@qr` path basenames from your spreadsheet directly to uploaded image files and ZIP archives.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Navigation Bar */}
        <div
          className="px-6 py-2.5 border-b flex items-center justify-between bg-black/20 text-xs font-bold"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-1.5 cursor-pointer ${
                currentStep === 1 ? 'text-[#84a92c]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                currentStep === 1 ? 'bg-[#84a92c] text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
              }`}>1</span>
              <span>Spreadsheet & Batch Name</span>
            </button>
            <span className="text-slate-600">→</span>
            <button
              onClick={() => parsedRows.length > 0 && setCurrentStep(2)}
              disabled={parsedRows.length === 0}
              className={`flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                currentStep === 2 ? 'text-[#84a92c]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                currentStep === 2 ? 'bg-[#84a92c] text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
              }`}>2</span>
              <span>Upload Photos & QR Files ({photoAssets.length + qrAssets.length})</span>
            </button>
            <span className="text-slate-600">→</span>
            <button
              onClick={() => parsedRows.length > 0 && setCurrentStep(3)}
              disabled={parsedRows.length === 0}
              className={`flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                currentStep === 3 ? 'text-[#84a92c]' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono ${
                currentStep === 3 ? 'bg-[#84a92c] text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
              }`}>3</span>
              <span>Pairing Review ({matchedCount}/{parsedRows.length})</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {/* STEP 1: SPREADSHEET INGESTION & BATCH NAMING */}
          {currentStep === 1 && (
            <div className="max-w-2xl mx-auto space-y-5">
              {/* Mandatory Batch Folder Name Input */}
              <div
                className="p-4 rounded-2xl border space-y-2"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              >
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FolderKanban className="w-4 h-4 text-[#84a92c]" />
                  <span>1. Batch Folder Name * (Required)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HAMMER TANKER FIX UUKG or UKG Section A 2026"
                  value={batchName}
                  onChange={e => setBatchName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border text-xs font-bold focus:outline-none focus:border-[#84a92c]"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
                <p className="text-[10px] text-slate-400">
                  Maps directly into the database `BatchFolder` system for organized print runs and studio batches.
                </p>
              </div>

              {/* Spreadsheet File Drop Zone */}
              <div
                className="p-6 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center space-y-3 cursor-pointer hover:border-[#84a92c] transition-colors"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: parsedRows.length > 0 ? '#84a92c' : 'var(--border-primary)',
                }}
                onClick={() => fileSpreadsheetRef.current?.click()}
              >
                <input
                  ref={fileSpreadsheetRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleSpreadsheetFile}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>

                <div>
                  <h3 className="font-bold text-sm text-white">
                    {spreadsheetFileName ? spreadsheetFileName : 'Click to Upload Excel / CSV Roster'}
                  </h3>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Accepts `.csv` or `.xlsx` files with `@photos` and `@qr` file path columns.
                  </p>
                </div>

                {parsedRows.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#84a92c]/20 text-[#84a92c] font-bold text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Parsed {parsedRows.length} Student Rows</span>
                  </div>
                )}
              </div>

              {spreadsheetError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span>{spreadsheetError}</span>
                </div>
              )}

              {/* Sample Rows Preview */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-xs text-slate-300">Spreadsheet Columns Preview:</span>
                  <div className="rounded-xl border overflow-x-auto max-h-48 divide-y" style={{ borderColor: 'var(--border-primary)' }}>
                    {parsedRows.slice(0, 5).map(r => (
                      <div key={r.rowIndex} className="p-2 flex items-center justify-between text-[11px] font-mono">
                        <div>
                          <strong className="text-white">{r.fullName}</strong> ({r.idNumber}) • {r.grade}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="text-emerald-400">📷 {r.expectedPhotoBasename || 'No photo path'}</span>
                          <span className="text-purple-400">📱 {r.expectedQrBasename || 'No QR path'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: BULK PHOTO & QR UPLOADS (WITH SANITY CROSS-CHECKS) */}
          {currentStep === 2 && (
            <div className="space-y-5">
              {/* Warnings Banner for Misfiled Items */}
              {warnings.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>Upload Zone Sanity Check Warnings ({warnings.length}):</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-200">
                    {warnings.slice(0, 3).map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Zone A: Portrait Photo Files */}
                <div
                  className="p-4 rounded-2xl border flex flex-col justify-between space-y-3"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-white flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-emerald-400" />
                        <span>Zone A: Student Photos (Folder or ZIP)</span>
                      </span>
                      <span className="font-mono text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                        {photoAssets.length} Uploaded
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Upload `.jpg, .png, .webp, .svg` files or a `.zip` archive containing the student portrait photos.
                    </p>
                  </div>

                  <input
                    ref={photoInputRef}
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,.svg,.zip"
                    onChange={e => e.target.files && processAssetFiles(e.target.files, 'photo')}
                    className="hidden"
                  />

                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={isDecompressing}
                    className="w-full py-4 rounded-xl border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-500/5 text-emerald-300 font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <Upload className="w-5 h-5" />
                    <span>Select Photo Files / Folder / ZIP</span>
                  </button>

                  {/* Misfiled in Photos Warnings */}
                  {photoAssets.filter(a => a.suspiciousType === 'likely-qr-in-photos').length > 0 && (
                    <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-[10px] space-y-1">
                      <span className="text-purple-300 font-bold block">QR/Barcode files detected in Photos Zone:</span>
                      {photoAssets
                        .filter(a => a.suspiciousType === 'likely-qr-in-photos')
                        .slice(0, 3)
                        .map(a => (
                          <div key={a.id} className="flex items-center justify-between text-slate-300">
                            <span className="truncate">{a.name}</span>
                            <button
                              onClick={() => handleSwapAssetCategory(a.id, 'photo')}
                              className="text-purple-400 hover:underline font-bold cursor-pointer"
                            >
                              Move to QR Zone →
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Zone B: QR / Barcode Files */}
                <div
                  className="p-4 rounded-2xl border flex flex-col justify-between space-y-3"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-white flex items-center gap-1.5">
                        <QrCode className="w-4 h-4 text-purple-400" />
                        <span>Zone B: QR & Barcodes (Folder or ZIP)</span>
                      </span>
                      <span className="font-mono text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">
                        {qrAssets.length} Uploaded
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Upload `.png, .jpg, .svg` files or a `.zip` archive containing the pre-generated QR code or barcode images.
                    </p>
                  </div>

                  <input
                    ref={qrInputRef}
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,.svg,.zip"
                    onChange={e => e.target.files && processAssetFiles(e.target.files, 'qr')}
                    className="hidden"
                  />

                  <button
                    onClick={() => qrInputRef.current?.click()}
                    disabled={isDecompressing}
                    className="w-full py-4 rounded-xl border-2 border-dashed border-purple-500/40 hover:border-purple-400 bg-purple-500/5 text-purple-300 font-bold flex flex-col items-center justify-center gap-1 cursor-pointer transition-all"
                  >
                    <Upload className="w-5 h-5" />
                    <span>Select QR Files / Folder / ZIP</span>
                  </button>

                  {/* Misfiled in QR Warnings */}
                  {qrAssets.filter(a => a.suspiciousType === 'likely-photo-in-qr').length > 0 && (
                    <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[10px] space-y-1">
                      <span className="text-emerald-300 font-bold block">Portrait photos detected in QR Zone:</span>
                      {qrAssets
                        .filter(a => a.suspiciousType === 'likely-photo-in-qr')
                        .slice(0, 3)
                        .map(a => (
                          <div key={a.id} className="flex items-center justify-between text-slate-300">
                            <span className="truncate">{a.name}</span>
                            <button
                              onClick={() => handleSwapAssetCategory(a.id, 'qr')}
                              className="text-emerald-400 hover:underline font-bold cursor-pointer"
                            >
                              ← Move to Photo Zone
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PAIRING REVIEW TABLE & MANUAL ADJUSTMENTS */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {/* Summary Stats & Filters */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold font-mono text-[11px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{matchedCount} Matched</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 text-amber-400 font-bold font-mono text-[11px] flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    <span>{partialCount} Partial</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-400 font-mono text-[11px] flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                    <span>{missingCount} Missing</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter student / file..."
                      value={searchFilter}
                      onChange={e => setSearchFilter(e.target.value)}
                      className="w-full pl-8 pr-2 py-1 rounded-lg border text-[11px] bg-slate-900 border-slate-700 text-slate-200"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as any)}
                    className="py-1 px-2 rounded-lg border text-[11px] bg-slate-900 border-slate-700 text-slate-200 cursor-pointer"
                  >
                    <option value="all">All ({matchedPairs.length})</option>
                    <option value="unmatched">Unmatched ({partialCount + missingCount})</option>
                    <option value="complete">Complete ({matchedCount})</option>
                  </select>
                </div>
              </div>

              {/* Pairing Table */}
              <div
                className="rounded-2xl border overflow-hidden"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              >
                <div className="p-2.5 border-b font-bold text-[11px] text-slate-400 grid grid-cols-12 gap-2 uppercase font-mono">
                  <div className="col-span-4">Student & ID</div>
                  <div className="col-span-4">Photo Pairing (Basename)</div>
                  <div className="col-span-4">QR Pairing (Basename)</div>
                </div>

                <div className="divide-y max-h-72 overflow-y-auto" style={{ borderColor: 'var(--border-primary)' }}>
                  {filteredPairs.map(p => (
                    <div key={p.row.rowIndex} className="p-2.5 grid grid-cols-12 gap-2 items-center text-xs">
                      {/* Student Info */}
                      <div className="col-span-4 truncate">
                        <span className="font-bold text-white block truncate">{p.row.fullName}</span>
                        <span className="text-[10px] font-mono text-slate-400 block truncate">
                          {p.row.idNumber} • {p.row.grade}
                        </span>
                      </div>

                      {/* Photo Pairing */}
                      <div className="col-span-4 flex items-center gap-2">
                        {p.photoAsset ? (
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-emerald-500 flex-shrink-0 bg-slate-900">
                            <img src={p.photoAsset.dataUrl} alt="Photo" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg border border-dashed border-red-500/50 flex items-center justify-center text-red-400 flex-shrink-0 bg-red-500/5">
                            <X className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <select
                            value={p.photoAsset?.id || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setManualPhotoPairs(prev => ({ ...prev, [p.row.rowIndex]: val }));
                            }}
                            className={`w-full py-1 px-1.5 text-[10px] rounded-lg border font-mono truncate focus:outline-none ${
                              p.photoAsset
                                ? 'bg-slate-900 border-emerald-500/50 text-emerald-300'
                                : 'bg-red-950/40 border-red-500/50 text-red-300'
                            }`}
                          >
                            <option value="">
                              {p.row.expectedPhotoBasename ? `[Missing: ${p.row.expectedPhotoBasename}]` : '(No Photo Matched)'}
                            </option>
                            {photoAssets.map(a => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* QR Pairing */}
                      <div className="col-span-4 flex items-center gap-2">
                        {p.qrAsset ? (
                          <div className="w-8 h-8 rounded-lg overflow-hidden border border-purple-500 flex-shrink-0 bg-slate-900 p-0.5">
                            <img src={p.qrAsset.dataUrl} alt="QR" className="w-full h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg border border-dashed border-red-500/50 flex items-center justify-center text-red-400 flex-shrink-0 bg-red-500/5">
                            <X className="w-3.5 h-3.5" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <select
                            value={p.qrAsset?.id || ''}
                            onChange={e => {
                              const val = e.target.value;
                              setManualQrPairs(prev => ({ ...prev, [p.row.rowIndex]: val }));
                            }}
                            className={`w-full py-1 px-1.5 text-[10px] rounded-lg border font-mono truncate focus:outline-none ${
                              p.qrAsset
                                ? 'bg-slate-900 border-purple-500/50 text-purple-300'
                                : 'bg-red-950/40 border-red-500/50 text-red-300'
                            }`}
                          >
                            <option value="">
                              {p.row.expectedQrBasename ? `[Missing: ${p.row.expectedQrBasename}]` : '(No QR Matched)'}
                            </option>
                            {qrAssets.map(a => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unassigned Files Drawer */}
              {(unassignedPhotos.length > 0 || unassignedQrs.length > 0) && (
                <div
                  className="p-3 rounded-2xl border space-y-2 bg-slate-900/60"
                  style={{ borderColor: 'var(--border-primary)' }}
                >
                  <span className="font-bold text-[11px] text-slate-300 block">
                    Unassigned Uploaded Files Pool ({unassignedPhotos.length} Photos, {unassignedQrs.length} QRs):
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {unassignedPhotos.map(a => (
                      <span key={a.id} className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">
                        📷 {a.name}
                      </span>
                    ))}
                    {unassignedQrs.map(a => (
                      <span key={a.id} className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-mono">
                        📱 {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="p-4 md:px-6 border-t flex items-center justify-between flex-shrink-0"
          style={{ borderColor: 'var(--border-primary)' }}
        >
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep(prev => (prev - 1) as any)}
              className="px-4 py-2 rounded-xl border font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              ← Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              Cancel
            </button>
          )}

          {currentStep < 3 ? (
            <button
              onClick={() => setCurrentStep(prev => (prev + 1) as any)}
              disabled={currentStep === 1 ? parsedRows.length === 0 || !batchName.trim() : false}
              className="btn-primary py-2 px-5 text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Continue to Step {currentStep + 1}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleCommit}
              disabled={isCommitting || parsedRows.length === 0}
              className="btn-primary py-2.5 px-6 text-xs font-bold shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed bg-[#84a92c] hover:bg-[#9fe870] text-slate-950"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>
                {isCommitting ? 'Committing Batch…' : `Commit Batch "${batchName}" (${matchedPairs.length} Records)`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
