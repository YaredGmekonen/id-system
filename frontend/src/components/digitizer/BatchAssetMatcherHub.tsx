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
  FolderOpen,
  Eye,
  Trash2,
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
  name: string;
  cleanName: string;
  dataUrl: string;
  category: 'photo' | 'qr';
}

interface MatchPair {
  row: ParsedSpreadsheetRow;
  photoAsset?: UploadedAsset;
  qrAsset?: UploadedAsset;
  photoStatus: 'matched' | 'missing' | 'custom';
  qrStatus: 'matched' | 'missing' | 'custom';
}

interface BatchAssetMatcherHubProps {
  onSuccess?: () => void;
}

// Helper to extract clean filename from Windows or Unix path
function extractBasename(pathStr: string): { filename: string; cleanName: string } {
  if (!pathStr) return { filename: '', cleanName: '' };
  const segments = String(pathStr).split(/[/\\]/);
  const filename = segments[segments.length - 1]?.trim() || '';
  const cleanName = filename.replace(/\.[^/.]+$/, '').trim().toLowerCase();
  return { filename, cleanName };
}

/**
 * Multi-Strategy Matcher: Matches a spreadsheet row against uploaded assets
 * Strategy 1: Explicit expected column filename
 * Strategy 2: ID Number (exact, case-insensitive, sanitized without dashes/underscores)
 * Strategy 3: Full Name or First_Last Name
 * Strategy 4: Row sequence index (e.g. 1.jpg, 01.jpg, 001.jpg, photo1.jpg)
 */
function findBestAssetMatch(
  row: ParsedSpreadsheetRow,
  assets: UploadedAsset[],
  expectedBasename?: string,
  manualId?: string
): UploadedAsset | undefined {
  if (manualId) {
    return assets.find(a => a.id === manualId);
  }

  if (assets.length === 0) return undefined;

  // 1. Explicit expected filename from spreadsheet column (e.g. @photo / @qr)
  if (expectedBasename) {
    const { cleanName, filename } = extractBasename(expectedBasename);
    const direct = assets.find(
      a => a.cleanName === cleanName || a.name.toLowerCase() === filename.toLowerCase()
    );
    if (direct) return direct;
  }

  // 2. Match by Student ID (e.g. STU-001 -> stu-001.jpg, stu_001.png, stu001.jpg, 001.jpg)
  if (row.idNumber) {
    const idClean = row.idNumber.trim().toLowerCase();
    const idSanitized = idClean.replace(/[^a-z0-9]/g, '');

    // Exact match
    const exactIdMatch = assets.find(a => a.cleanName === idClean);
    if (exactIdMatch) return exactIdMatch;

    // Sanitized match (ignoring dashes, underscores, spaces)
    const sanitizedIdMatch = assets.find(
      a => a.cleanName.replace(/[^a-z0-9]/g, '') === idSanitized
    );
    if (sanitizedIdMatch) return sanitizedIdMatch;

    // Substring / partial match
    if (idSanitized.length >= 3) {
      const partialIdMatch = assets.find(a => {
        const aSan = a.cleanName.replace(/[^a-z0-9]/g, '');
        return aSan.includes(idSanitized) || idSanitized.includes(aSan);
      });
      if (partialIdMatch) return partialIdMatch;
    }
  }

  // 3. Match by Full Name (e.g. "Abebe Kebede" -> "abebe_kebede.jpg", "Abebe Kebede.png", "abebe-kebede.webp")
  if (row.fullName) {
    const nameClean = row.fullName.trim().toLowerCase();
    const nameSanitized = nameClean.replace(/[^a-z0-9]/g, '');

    const exactNameMatch = assets.find(
      a => a.cleanName === nameClean || a.cleanName.replace(/[^a-z0-9]/g, '') === nameSanitized
    );
    if (exactNameMatch) return exactNameMatch;

    // Words intersection match (First name + Last name)
    const nameParts = nameClean.split(/\s+/).filter(p => p.length > 2);
    if (nameParts.length >= 2) {
      const bothPartsMatch = assets.find(a => {
        const aLower = a.cleanName.toLowerCase();
        return nameParts.every(part => aLower.includes(part));
      });
      if (bothPartsMatch) return bothPartsMatch;
    }
  }

  // 4. Match by 1-based Row Index (e.g. 1.jpg, 01.jpg, 001.jpg, photo_1.jpg, img-1.png)
  const idx1 = row.rowIndex + 1;
  const str1 = String(idx1);
  const str2 = idx1.toString().padStart(2, '0');
  const str3 = idx1.toString().padStart(3, '0');

  const indexMatch = assets.find(a => {
    const c = a.cleanName.toLowerCase();
    return (
      c === str1 ||
      c === str2 ||
      c === str3 ||
      c === `photo${str1}` ||
      c === `photo_${str1}` ||
      c === `photo-${str1}` ||
      c === `img_${str1}` ||
      c === `image_${str1}` ||
      c === `qr_${str1}` ||
      c === `qr${str1}`
    );
  });
  if (indexMatch) return indexMatch;

  return undefined;
}

export default function BatchAssetMatcherHub({ onSuccess }: BatchAssetMatcherHubProps) {
  // Wizard Steps: 1: Spreadsheet & Folder Name -> 2: Upload Photos & QRs -> 3: Match Review & Commit
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
  const [pickerModalRow, setPickerModalRow] = useState<{ rowIndex: number; type: 'photo' | 'qr' } | null>(null);

  // Submitting
  const [isCommitting, setIsCommitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileSpreadsheetRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoFolderInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const qrFolderInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ===== SPREADSHEET PARSING =====
  const handleSpreadsheetFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSpreadsheetError(null);
    setSpreadsheetFileName(file.name);

    if (!batchName) {
      const suggested = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setBatchName(suggested);
    }

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawMatrix: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });

      if (rawMatrix.length < 2) {
        setSpreadsheetError('Spreadsheet contains insufficient rows.');
        return;
      }

      let headerRowIndex = 0;
      for (let r = 0; r < Math.min(5, rawMatrix.length); r++) {
        const rowStr = rawMatrix[r].map(c => String(c).toLowerCase()).join(' ');
        if (
          rowStr.includes('name') ||
          rowStr.includes('student') ||
          rowStr.includes('id') ||
          rowStr.includes('@photo') ||
          rowStr.includes('photo')
        ) {
          headerRowIndex = r;
          break;
        }
      }

      const headers = rawMatrix[headerRowIndex].map(c => String(c).trim());
      const dataRows = rawMatrix.slice(headerRowIndex + 1);

      let nameIdx = headers.findIndex(h => /^(?:full\s*name|student\s*name|name|person\s*name|full_name)$/i.test(h));
      if (nameIdx === -1) nameIdx = headers.findIndex(h => /name/i.test(h));

      let idIdx = headers.findIndex(h => /^(?:student\s*id|id\s*number|id|code|reg|roll_no|id_number)$/i.test(h));
      if (idIdx === -1) idIdx = headers.findIndex(h => /id|roll|code/i.test(h));

      let genderIdx = headers.findIndex(h => /^(?:sex|gender)$/i.test(h));
      let gradeIdx = headers.findIndex(h => /^(?:grade|class|department|dept|section)$/i.test(h));
      let phoneIdx = headers.findIndex(h => /^(?:phone|mobile|tel|contact|parent_phone)$/i.test(h));

      let photoPathIdx = headers.findIndex(h => /@photo|photo|picture|image|photo_name|photo_path/i.test(h));
      let qrPathIdx = headers.findIndex(h => /@qr|qr|barcode|qrcode|qr_path/i.test(h));

      const parsed: ParsedSpreadsheetRow[] = [];

      dataRows.forEach((row, i) => {
        if (!row || row.every(c => !String(c).trim())) return;

        const fullName = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : `Student ${i + 1}`;
        if (!fullName) return;

        const idNumber = idIdx !== -1 ? String(row[idIdx] || '').trim() : `ID-${1000 + i}`;
        const gender = genderIdx !== -1 ? String(row[genderIdx] || '').trim() : '';
        const grade = gradeIdx !== -1 ? String(row[gradeIdx] || '').trim() : 'General';
        const phone = phoneIdx !== -1 ? String(row[phoneIdx] || '').trim() : '';

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
      showToast(`Parsed ${parsed.length} roster records from "${file.name}"`);
    } catch (err) {
      console.error(err);
      setSpreadsheetError('Failed to read spreadsheet file. Please check file format.');
    }
  };

  const readFileDataUrl = (file: File | Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });
  };

  // ===== BATCH ASSET INGESTION (ZIP / MULTI-FILE / FOLDER) =====
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
            if (!/\.(jpg|jpeg|png|webp|bmp|svg)$/i.test(relativePath)) continue;

            const blob = await zipEntry.async('blob');
            const { filename, cleanName } = extractBasename(relativePath);
            const dataUrl = await readFileDataUrl(blob);

            newAssets.push({
              id: `${targetCategory}-${Date.now()}-${fIdx}-${Math.random().toString(36).substring(2, 6)}`,
              file: blob,
              name: filename,
              cleanName,
              dataUrl,
              category: targetCategory,
            });
          }
        } catch (err) {
          console.error('ZIP extraction error:', err);
          detectedWarnings.push(`Failed to extract ZIP file "${file.name}".`);
        }
      } else if (/\.(jpg|jpeg|png|webp|bmp|svg)$/i.test(file.name)) {
        const { filename, cleanName } = extractBasename(file.name);
        const dataUrl = await readFileDataUrl(file);

        newAssets.push({
          id: `${targetCategory}-${Date.now()}-${fIdx}-${Math.random().toString(36).substring(2, 6)}`,
          file,
          name: filename,
          cleanName,
          dataUrl,
          category: targetCategory,
        });
      }
    }

    if (targetCategory === 'photo') {
      setPhotoAssets(prev => [...prev, ...newAssets]);
      showToast(`Loaded ${newAssets.length} portrait photos!`);
    } else {
      setQrAssets(prev => [...prev, ...newAssets]);
      showToast(`Loaded ${newAssets.length} QR code assets!`);
    }

    if (detectedWarnings.length > 0) {
      setWarnings(prev => [...prev, ...detectedWarnings]);
    }

    setIsDecompressing(false);
  };

  const handleSwapAssetCategories = () => {
    const swappedPhotos = qrAssets.map(a => ({ ...a, category: 'photo' as const }));
    const swappedQrs = photoAssets.map(a => ({ ...a, category: 'qr' as const }));
    setPhotoAssets(swappedPhotos);
    setQrAssets(swappedQrs);
    setWarnings([]);
    showToast('Swapped Photos and QR Code collections!');
  };

  // 1-Click Auto Pair by Row Sequence
  const handleAutoPairByIndex = () => {
    const newPhotoPairs: Record<number, string> = {};
    const newQrPairs: Record<number, string> = {};

    parsedRows.forEach((row, i) => {
      if (photoAssets[i]) {
        newPhotoPairs[row.rowIndex] = photoAssets[i].id;
      }
      if (qrAssets[i]) {
        newQrPairs[row.rowIndex] = qrAssets[i].id;
      }
    });

    setManualPhotoPairs(newPhotoPairs);
    setManualQrPairs(newQrPairs);
    showToast(`Auto-paired ${Object.keys(newPhotoPairs).length} photos by sequential order!`);
  };

  // Build match index maps with resilient multi-strategy matching
  const matchPairs = useMemo<MatchPair[]>(() => {
    return parsedRows.map(row => {
      const matchedPhoto = findBestAssetMatch(
        row,
        photoAssets,
        row.expectedPhotoBasename,
        manualPhotoPairs[row.rowIndex]
      );

      const matchedQr = findBestAssetMatch(
        row,
        qrAssets,
        row.expectedQrBasename,
        manualQrPairs[row.rowIndex]
      );

      return {
        row,
        photoAsset: matchedPhoto,
        qrAsset: matchedQr,
        photoStatus: matchedPhoto ? (manualPhotoPairs[row.rowIndex] ? 'custom' : 'matched') : 'missing',
        qrStatus: matchedQr ? (manualQrPairs[row.rowIndex] ? 'custom' : 'matched') : 'missing',
      };
    });
  }, [parsedRows, photoAssets, qrAssets, manualPhotoPairs, manualQrPairs]);

  const stats = useMemo(() => {
    let total = matchPairs.length;
    let photoMatched = matchPairs.filter(m => m.photoAsset).length;
    let qrMatched = matchPairs.filter(m => m.qrAsset).length;
    let perfect = matchPairs.filter(m => m.photoAsset && m.qrAsset).length;
    let partial = matchPairs.filter(m => (m.photoAsset && !m.qrAsset) || (!m.photoAsset && m.qrAsset)).length;
    let missingBoth = matchPairs.filter(m => !m.photoAsset && !m.qrAsset).length;

    return { total, photoMatched, qrMatched, perfect, partial, missingBoth };
  }, [matchPairs]);

  const filteredMatches = useMemo(() => {
    return matchPairs.filter(pair => {
      const q = searchFilter.toLowerCase();
      const matchSearch =
        pair.row.fullName.toLowerCase().includes(q) ||
        pair.row.idNumber.toLowerCase().includes(q) ||
        pair.row.expectedPhotoBasename.toLowerCase().includes(q) ||
        (pair.photoAsset?.name || '').toLowerCase().includes(q);

      return matchSearch;
    });
  }, [matchPairs, searchFilter]);

  // Commit paired records directly into IndexedDB
  const handleCommitToDatabase = async () => {
    if (!batchName.trim()) {
      showToast('Please enter a Batch Folder name.');
      return;
    }

    if (matchPairs.length === 0) {
      showToast('No records to import.');
      return;
    }

    setIsCommitting(true);

    try {
      // 1. Create BatchFolder in database
      const folderId = await addBatchFolder({
        name: batchName.trim(),
        sourceType: 'Excel Import',
        status: 'Ready for Design',
        collectorName: 'Batch Asset Matcher',
        totalRecords: matchPairs.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 2. Create Person records with matched photos and QRs
      const persons: Omit<Person, 'id'>[] = matchPairs.map((pair, idx) => {
        const r = pair.row;
        const nameParts = r.fullName.trim().split(/\s+/);
        const firstName = nameParts[0] || r.fullName;
        const lastName = nameParts.slice(1).join(' ') || '';

        return {
          fullName: r.fullName,
          firstName,
          lastName,
          idNumber: r.idNumber || `ID-${1000 + idx}`,
          category: 'Students',
          department: r.grade || 'General',
          role: 'Student',
          phone: r.phone || '',
          email: `${firstName.toLowerCase().replace(/[^a-z0-9]/g, '')}.${lastName.toLowerCase().replace(/[^a-z0-9]/g, '')}@organization.internal`,
          gender: r.gender || 'Male',
          bloodGroup: 'O+',
          grade: r.grade || 'General',
          joinedDate: new Date().toISOString().split('T')[0],
          schoolName: batchName.trim(),
          photoDataUrl: pair.photoAsset?.dataUrl || '',
          status: 'Active',
          fulfillmentStatus: 'Unfulfilled',
          paymentStatus: 'Paid',
          channel: 'Batch Asset Matcher',
          totalAmount: 'Free',
          workerId: 1,
          collectedBy: 'Batch Asset Matcher',
          location: batchName.trim(),
          batchFolderId: folderId,
          folderName: batchName.trim(),
          sourceFileName: spreadsheetFileName || 'Imported Roster',
          customFields: {
            ...r.raw,
            qrAssetDataUrl: pair.qrAsset?.dataUrl || '',
          },
          extraData: r.raw,
          createdAt: new Date(),
        };
      });

      await bulkAddPeople(persons);
      showToast(`Successfully saved ${persons.length} personnel records to Batch Folder "${batchName}"!`);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Commit error:', err);
      showToast(err.message || 'Failed to save batch records to database.');
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* STEPPER HEADER */}
      <div className="flex items-center justify-between p-4 rounded-2xl border flex-wrap gap-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
        <div className="flex items-center gap-3 text-xs font-mono font-bold">
          <div
            onClick={() => setCurrentStep(1)}
            className={`px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5 ${
              currentStep === 1 ? 'bg-[#84a92c] text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <span>1</span>
            <span className="text-xs">Spreadsheet & Folder</span>
          </div>
          <span className="text-slate-600">→</span>
          <div
            onClick={() => parsedRows.length > 0 && setCurrentStep(2)}
            className={`px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5 ${
              currentStep === 2 ? 'bg-[#84a92c] text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <span>2</span>
            <span className="text-xs">Upload Photo & QR Packs</span>
          </div>
          <span className="text-slate-600">→</span>
          <div
            onClick={() => parsedRows.length > 0 && (photoAssets.length > 0 || qrAssets.length > 0) && setCurrentStep(3)}
            className={`px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1.5 ${
              currentStep === 3 ? 'bg-[#84a92c] text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
            }`}
          >
            <span>3</span>
            <span className="text-xs">Review & Commit</span>
          </div>
        </div>

        {currentStep === 3 && (
          <button
            onClick={handleCommitToDatabase}
            disabled={isCommitting}
            className="btn-primary py-2 px-6 text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
          >
            {isCommitting ? 'Importing…' : `Commit ${matchPairs.length} Records to Folder`}
          </button>
        )}
      </div>

      {/* STEP 1: SPREADSHEET & FOLDER */}
      {currentStep === 1 && (
        <div className="p-6 rounded-2xl border space-y-5 animate-fade-in" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
          <div className="max-w-2xl space-y-4">
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Step 1: Batch Folder & Master Spreadsheet
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload your client Excel/CSV roster (e.g. <code className="text-[#84a92c] font-mono">roster_full.xlsx</code>).
              </p>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1 text-slate-300">Batch Folder Name *</label>
              <input
                type="text"
                value={batchName}
                onChange={e => setBatchName(e.target.value)}
                placeholder="e.g. SiliconLabs Testing Cohort 2026"
                className="w-full text-xs py-2 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c]"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Spreadsheet Dropzone */}
            <div
              onClick={() => fileSpreadsheetRef.current?.click()}
              className="p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-[#84a92c] transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <FileSpreadsheet className="w-10 h-10 text-emerald-400 mb-2" />
              <p className="text-xs font-bold text-slate-200">Click to Select Excel / CSV Spreadsheet</p>
              <p className="text-[10px] text-slate-400 mt-1">Supports .xlsx, .xls, .csv with automatic column detection</p>
              <input
                ref={fileSpreadsheetRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleSpreadsheetFile}
                className="hidden"
              />
            </div>

            {spreadsheetFileName && (
              <div className="p-3 rounded-xl border flex items-center justify-between" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                <span className="font-mono text-xs text-[#84a92c] font-bold">{spreadsheetFileName}</span>
                <span className="text-xs font-bold text-slate-300">{parsedRows.length} Rows Parsed</span>
              </div>
            )}

            {spreadsheetError && (
              <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
                {spreadsheetError}
              </div>
            )}

            <button
              onClick={() => setCurrentStep(2)}
              disabled={parsedRows.length === 0 || !batchName.trim()}
              className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>Next: Upload Photo & QR Files</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: ASSET PACK UPLOAD (PHOTOS & QRS) */}
      {currentStep === 2 && (
        <div className="p-6 rounded-2xl border space-y-6 animate-fade-in" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
          <div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Step 2: Upload Photo Pack & QR Code Pack
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select multiple photos/QRs, drop a whole folder, or upload a ZIP archive. Files are matched automatically by ID number, student name, or sequence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Zone A: Photos */}
            <div className="space-y-3">
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  if (e.dataTransfer.files) {
                    processAssetFiles(e.dataTransfer.files, 'photo');
                  }
                }}
                className="p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              >
                <ImageIcon className="w-10 h-10 text-blue-400 mb-2" />
                <p className="text-xs font-bold text-slate-200 text-center">Portrait Photos Collection</p>
                <p className="text-[10px] text-slate-400 mt-1 text-center">
                  Drag & Drop JPG/PNG files, folder, or ZIP archive here
                </p>

                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="py-1.5 px-3 rounded-lg border text-xs font-bold cursor-pointer hover:border-blue-400"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                  >
                    Select Photos
                  </button>

                  <button
                    type="button"
                    onClick={() => photoFolderInputRef.current?.click()}
                    className="py-1.5 px-3 rounded-lg border text-xs font-bold cursor-pointer hover:border-blue-400 flex items-center gap-1"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Select Folder</span>
                  </button>
                </div>

                <input
                  ref={photoInputRef}
                  type="file"
                  multiple
                  accept="image/*,.zip"
                  onChange={e => e.target.files && processAssetFiles(e.target.files, 'photo')}
                  className="hidden"
                />
                <input
                  ref={photoFolderInputRef}
                  type="file"
                  multiple
                  // @ts-ignore
                  webkitdirectory=""
                  directory=""
                  onChange={e => e.target.files && processAssetFiles(e.target.files, 'photo')}
                  className="hidden"
                />
              </div>

              {/* Photos Gallery Preview */}
              {photoAssets.length > 0 && (
                <div className="p-3 rounded-xl border space-y-2" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-400">
                      Loaded Photos ({photoAssets.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setPhotoAssets([])}
                      className="text-[10px] text-red-400 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {photoAssets.slice(0, 15).map((a, i) => (
                      <div key={i} className="w-12 h-14 rounded-lg bg-slate-900 border border-slate-700 flex-shrink-0 overflow-hidden relative group">
                        <img src={a.dataUrl} alt={a.name} className="w-full h-full object-cover" />
                        <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[7px] text-white truncate px-0.5 text-center font-mono">
                          {a.name}
                        </span>
                      </div>
                    ))}
                    {photoAssets.length > 15 && (
                      <div className="w-12 h-14 rounded-lg bg-slate-800 border border-slate-700 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-400 font-mono">
                        +{photoAssets.length - 15}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Zone B: QRs */}
            <div className="space-y-3">
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  if (e.dataTransfer.files) {
                    processAssetFiles(e.dataTransfer.files, 'qr');
                  }
                }}
                className="p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-colors"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              >
                <QrCode className="w-10 h-10 text-purple-400 mb-2" />
                <p className="text-xs font-bold text-slate-200 text-center">QR Codes / Barcodes Collection</p>
                <p className="text-[10px] text-slate-400 mt-1 text-center">
                  Drag & Drop QR PNGs, folder, or ZIP archive here
                </p>

                <div className="flex items-center gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => qrInputRef.current?.click()}
                    className="py-1.5 px-3 rounded-lg border text-xs font-bold cursor-pointer hover:border-purple-400"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                  >
                    Select QR Files
                  </button>

                  <button
                    type="button"
                    onClick={() => qrFolderInputRef.current?.click()}
                    className="py-1.5 px-3 rounded-lg border text-xs font-bold cursor-pointer hover:border-purple-400 flex items-center gap-1"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Select Folder</span>
                  </button>
                </div>

                <input
                  ref={qrInputRef}
                  type="file"
                  multiple
                  accept="image/*,.zip"
                  onChange={e => e.target.files && processAssetFiles(e.target.files, 'qr')}
                  className="hidden"
                />
                <input
                  ref={qrFolderInputRef}
                  type="file"
                  multiple
                  // @ts-ignore
                  webkitdirectory=""
                  directory=""
                  onChange={e => e.target.files && processAssetFiles(e.target.files, 'qr')}
                  className="hidden"
                />
              </div>

              {/* QR Gallery Preview */}
              {qrAssets.length > 0 && (
                <div className="p-3 rounded-xl border space-y-2" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-400">
                      Loaded QR Codes ({qrAssets.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => setQrAssets([])}
                      className="text-[10px] text-red-400 hover:underline cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto py-1">
                    {qrAssets.slice(0, 15).map((a, i) => (
                      <div key={i} className="w-12 h-14 rounded-lg bg-white border border-slate-700 flex-shrink-0 overflow-hidden relative group p-0.5">
                        <img src={a.dataUrl} alt={a.name} className="w-full h-full object-contain" />
                        <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[7px] text-white truncate px-0.5 text-center font-mono">
                          {a.name}
                        </span>
                      </div>
                    ))}
                    {qrAssets.length > 15 && (
                      <div className="w-12 h-14 rounded-lg bg-slate-800 border border-slate-700 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-slate-400 font-mono">
                        +{qrAssets.length - 15}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t flex-wrap gap-3" style={{ borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentStep(1)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              >
                Back
              </button>

              <button
                onClick={handleSwapAssetCategories}
                className="px-4 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 hover:border-[#84a92c] cursor-pointer"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Swap Photo & QR Collections</span>
              </button>
            </div>

            <button
              onClick={() => setCurrentStep(3)}
              disabled={photoAssets.length === 0 && qrAssets.length === 0}
              className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>Next: Review Matches ({matchPairs.length} Records)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: MATCH REVIEW & COMMIT */}
      {currentStep === 3 && (
        <div className="space-y-4 animate-fade-in">
          {/* Summary Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
              <p className="text-[10px] uppercase font-mono text-slate-400 font-bold">Total Roster Records</p>
              <p className="text-xl font-bold text-slate-200 mt-0.5">{stats.total}</p>
            </div>
            <div className="p-3.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
              <p className="text-[10px] uppercase font-mono text-emerald-400 font-bold">Photos Matched</p>
              <p className="text-xl font-bold text-emerald-300 mt-0.5">{stats.photoMatched} / {stats.total}</p>
            </div>
            <div className="p-3.5 rounded-2xl border border-purple-500/20 bg-purple-500/5">
              <p className="text-[10px] uppercase font-mono text-purple-400 font-bold">QRs Matched</p>
              <p className="text-xl font-bold text-purple-300 mt-0.5">{stats.qrMatched} / {stats.total}</p>
            </div>
            <div className="p-3.5 rounded-2xl border border-cyan-500/20 bg-cyan-500/5">
              <p className="text-[10px] uppercase font-mono text-cyan-400 font-bold">Complete Pairs</p>
              <p className="text-xl font-bold text-cyan-300 mt-0.5">{stats.perfect} / {stats.total}</p>
            </div>
          </div>

          {/* Table */}
          <div className="p-4 rounded-2xl border space-y-3" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={e => setSearchFilter(e.target.value)}
                  placeholder="Search personnel or filename…"
                  className="text-xs py-1.5 px-3 rounded-lg border font-mono w-60"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="flex items-center gap-2">
                {stats.photoMatched < stats.total && photoAssets.length > 0 && (
                  <button
                    onClick={handleAutoPairByIndex}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 cursor-pointer bg-[#84a92c]/10 text-[#84a92c] border-[#84a92c]/40 hover:bg-[#84a92c]/20"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Auto-Pair 1-to-1 by Row Order</span>
                  </button>
                )}

                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border hover:opacity-80 cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                >
                  Back to Uploads
                </button>
              </div>
            </div>

            <div className="border rounded-xl overflow-x-auto max-h-[500px]" style={{ borderColor: 'var(--border-primary)' }}>
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b text-slate-400 font-mono" style={{ borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-elevated)' }}>
                    <th className="p-2.5">Photo</th>
                    <th className="p-2.5">Full Name</th>
                    <th className="p-2.5">ID Number</th>
                    <th className="p-2.5">Matched Photo File</th>
                    <th className="p-2.5">QR Asset</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredMatches.map(m => (
                    <tr key={m.row.rowIndex} className="hover:bg-slate-800/20">
                      <td className="p-2.5">
                        {m.photoAsset ? (
                          <img src={m.photoAsset.dataUrl} alt={m.row.fullName} className="w-9 h-11 rounded-lg object-cover border border-slate-700 shadow-xs" />
                        ) : (
                          <div className="w-9 h-11 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-mono">None</div>
                        )}
                      </td>
                      <td className="p-2.5 font-bold text-slate-200">{m.row.fullName}</td>
                      <td className="p-2.5 font-mono text-slate-400">{m.row.idNumber}</td>
                      <td className="p-2.5 font-mono text-xs">
                        {m.photoAsset ? (
                          <span className="text-[#84a92c] font-bold">{m.photoAsset.name}</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        {m.qrAsset ? (
                          <div className="flex items-center gap-1.5">
                            <img src={m.qrAsset.dataUrl} alt="QR" className="w-8 h-8 rounded-md bg-white p-0.5" />
                            <span className="text-[10px] text-purple-300 font-mono">{m.qrAsset.name}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500">Auto Generate URL</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        {m.photoAsset ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                            {m.photoStatus === 'custom' ? 'Manual Pair' : 'Auto Matched'}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                            Missing Photo
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setPickerModalRow({ rowIndex: m.row.rowIndex, type: 'photo' })}
                          className="px-2 py-1 text-[10px] font-bold rounded-md border border-slate-700 hover:border-[#84a92c] text-slate-300 cursor-pointer"
                        >
                          {m.photoAsset ? 'Change' : 'Pick Photo'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manual Asset Picker Modal */}
      {pickerModalRow && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div
            className="w-full max-w-xl max-h-[80vh] p-6 rounded-2xl border space-y-4 shadow-2xl flex flex-col"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                Select Photo for {parsedRows[pickerModalRow.rowIndex]?.fullName}
              </h3>
              <button
                type="button"
                onClick={() => setPickerModalRow(null)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-3 p-1">
              {(pickerModalRow.type === 'photo' ? photoAssets : qrAssets).map(a => (
                <div
                  key={a.id}
                  onClick={() => {
                    if (pickerModalRow.type === 'photo') {
                      setManualPhotoPairs(prev => ({ ...prev, [pickerModalRow.rowIndex]: a.id }));
                    } else {
                      setManualQrPairs(prev => ({ ...prev, [pickerModalRow.rowIndex]: a.id }));
                    }
                    setPickerModalRow(null);
                    showToast(`Paired "${a.name}" with ${parsedRows[pickerModalRow.rowIndex]?.fullName}`);
                  }}
                  className="p-2 rounded-xl border border-slate-700 hover:border-[#84a92c] bg-slate-900 flex flex-col items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
                >
                  <img src={a.dataUrl} alt={a.name} className="w-16 h-20 object-cover rounded-lg" />
                  <span className="text-[9px] font-mono text-slate-300 truncate w-full text-center">{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white border border-[#84a92c] shadow-2xl text-xs font-bold animate-fade-in flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#84a92c] animate-pulse" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
