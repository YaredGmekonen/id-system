import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import BatchAssetMatcherHub from '../components/digitizer/BatchAssetMatcherHub';
import { runGeminiVisionOcr } from '../engine/geminiOcr';
import {
  cropPhotosFromPage,
  runFullPageOcr,
  pairPhotosWithProximityOcr,
  parseRosterSpreadsheet,
  type CroppedPhoto,
  type DigitizedStudent,
  type MatchedRecord,
} from '../engine/archiveDigitizer';
import {
  detectPhotoBoxesOnDocument,
  type DetectedCropBox,
} from '../engine/faceDetector';
import { enhancePhotoImage } from '../engine/photoEnhancer';
import VisualCropCanvas from '../components/digitizer/VisualCropCanvas';
import { addBatchFolder, bulkAddPeople } from '../db/hooks';
import type { Person } from '../db/database';
import {
  Scan,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Upload,
  UserCheck,
  Edit3,
  Trash2,
  Eye,
  Plus,
  School,
  AlertTriangle,
  FolderKanban,
  BookOpen,
  Cpu,
} from 'lucide-react';

type DigitizerHubTab = 'ledger-ocr' | 'asset-matcher';
type Step = 'upload' | 'match' | 'done';
type UploadMode = 'image-only' | 'image-excel' | 'excel-only';
type OcrEngineType = 'gemini' | 'tesseract';

export default function ArchiveDigitizer() {
  const navigate = useNavigate();
  const [hubTab, setHubTab] = useState<DigitizerHubTab>('ledger-ocr');
  const [step, setStep] = useState<Step>('upload');
  const [uploadMode, setUploadMode] = useState<UploadMode>('image-only');
  const [ocrEngine, setOcrEngine] = useState<OcrEngineType>('gemini');

  // Step: Upload & Face Crop
  const [batchFolderName, setBatchFolderName] = useState('');
  const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);
  const [cropBoxes, setCropBoxes] = useState<DetectedCropBox[]>([]);
  const [croppedPhotos, setCroppedPhotos] = useState<CroppedPhoto[]>([]);
  const [excelStudents, setExcelStudents] = useState<DigitizedStudent[]>([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [isCropping, setIsCropping] = useState(false);
  const [cropProgressMsg, setCropProgressMsg] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Step: Match & Review
  const [matches, setMatches] = useState<MatchedRecord[]>([]);
  const [detectedCategories, setDetectedCategories] = useState<string[]>([]);
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // Starting row offset
  const [startRow, setStartRow] = useState(0);

  const pageInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // When image is uploaded, trigger dynamic 2D face & photo box detection
  useEffect(() => {
    if (pageImageUrl) {
      detectPhotoBoxesOnDocument(pageImageUrl).then(boxes => {
        setCropBoxes(boxes);
      });
    }
  }, [pageImageUrl]);

  // Handlers
  const handlePageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!batchFolderName) {
      const suggested = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      setBatchFolderName(suggested);
    }

    const reader = new FileReader();
    reader.onload = () => setPageImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const students = parseRosterSpreadsheet(buffer);
      setExcelStudents(students);
      setExcelFileName(file.name);
      if (!batchFolderName) {
        setBatchFolderName(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch {
      showToast('Could not read Excel file. Please ensure valid column headers.');
    }
  };

  const handleCropAndMatch = async () => {
    setIsCropping(true);
    setCropProgressMsg('Running AI Vision Analysis on Document…');

    try {
      if (ocrEngine === 'gemini' && pageImageUrl) {
        setCropProgressMsg('Analyzing handwriting, labels, and photo boundaries with Gemini 3.6 Flash Vision…');
        const geminiResult = await runGeminiVisionOcr(pageImageUrl);
        setCropBoxes(geminiResult.cropBoxes);
        setCroppedPhotos(geminiResult.croppedPhotos);
        setMatches(geminiResult.matches);
        setDetectedCategories(geminiResult.detectedCategories || ['Full Name', 'ID Number']);
        if (geminiResult.schoolName && !batchFolderName) {
          setBatchFolderName(`${geminiResult.schoolName} Ledger Intake`);
        }
        showToast(`Gemini AI Vision extracted ${geminiResult.matches.length} personnel records with dynamic schema!`);
        setStep('match');
        return;
      }

      let photos: CroppedPhoto[] = [];

      // 1. Crop all detected boxes
      if (pageImageUrl) {
        photos = await cropPhotosFromPage(pageImageUrl, cropBoxes);
        setCroppedPhotos(photos);
      }

      // Local Tesseract OCR
      setCropProgressMsg('Running optical character recognition (OCR) on document…');
      const ocrLines = pageImageUrl ? await runFullPageOcr(pageImageUrl) : [];

      setCropProgressMsg('Pairing photos with adjacent card records…');
      const detectedStudents = pairPhotosWithProximityOcr(
        cropBoxes,
        ocrLines,
        batchFolderName || 'School Archive'
      );

      const newMatches = photos.map((photo, idx) => {
        const student = detectedStudents[idx] || {
          name: '',
          studentId: '',
          phone: '',
          sex: 'Male',
          grade: 'KG 2B',
          confidence: 0,
          flagged: true,
          flagReasons: ['Unassigned card slot — please enter student details'],
        };

        return {
          slotIndex: idx,
          photoUrl: photo.dataUrl,
          rawPhotoUrl: photo.rawPhotoUrl,
          isEnhanced: false,
          student,
          confirmed: true,
          skipped: false,
          box: cropBoxes[idx],
        };
      });

      setMatches(newMatches);
      setDetectedCategories(['Full Name', 'ID Number', 'Grade / Class', 'Phone']);
      setStep('match');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error during photo crop or data matching.');
    } finally {
      setIsCropping(false);
      setCropProgressMsg('');
    }
  };

  const updateMatch = (index: number, updates: Partial<MatchedRecord>) => {
    setMatches(prev =>
      prev.map((m, idx) => (idx === index ? { ...m, ...updates } : m))
    );
  };

  const updateStudent = (
    index: number,
    field: keyof DigitizedStudent,
    value: any
  ) => {
    setMatches(prev =>
      prev.map((m, idx) =>
        idx === index
          ? {
              ...m,
              student: {
                ...m.student,
                [field]: value,
                // Clear flagging if user fixed name/id
                flagged: field === 'name' ? !value.trim() : m.student.flagged,
              },
            }
          : m
      )
    );
  };

  const updateCustomField = (index: number, key: string, value: string) => {
    setMatches(prev =>
      prev.map((m, idx) => {
        if (idx !== index) return m;
        return {
          ...m,
          student: {
            ...m.student,
            customFields: {
              ...(m.student.customFields || {}),
              [key]: value,
            },
          },
        };
      })
    );
  };

  const handleAddCategoryToBatch = (categoryName: string) => {
    const clean = categoryName.trim();
    if (!clean) return;
    if (!detectedCategories.includes(clean)) {
      setDetectedCategories(prev => [...prev, clean]);
    }
    setMatches(prev =>
      prev.map(m => ({
        ...m,
        student: {
          ...m.student,
          customFields: {
            ...(m.student.customFields || {}),
            [clean]: m.student.customFields?.[clean] || '',
          },
        },
      }))
    );
    setNewCategoryInput('');
    setNewCategoryModalOpen(false);
    showToast(`Added custom category "${clean}" to all records!`);
  };

  // Non-destructive photo enhancement toggle (default OFF)
  const handleToggleEnhancePhoto = async (index: number) => {
    const match = matches[index];
    if (!match || !match.photoUrl) return;

    if (match.isEnhanced) {
      // Revert to raw photo
      updateMatch(index, {
        photoUrl: match.rawPhotoUrl || match.photoUrl,
        isEnhanced: false,
      });
      showToast(`Photo #${index + 1} reverted to original`);
    } else {
      // Enhance
      const original = match.rawPhotoUrl || match.photoUrl;
      const enhanced = await enhancePhotoImage(original);
      updateMatch(index, {
        rawPhotoUrl: original,
        photoUrl: enhanced,
        isEnhanced: true,
      });
      showToast(`Photo #${index + 1} enhanced`);
    }
  };

  const handleReplacePhoto = (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        updateMatch(index, {
          photoUrl: url,
          rawPhotoUrl: url,
          isEnhanced: false,
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleSaveAll = async () => {
    if (!batchFolderName.trim()) {
      showToast('Please specify a Batch Folder name before saving.');
      return;
    }

    setIsSaving(true);

    try {
      const validMatches = matches.filter(m => !m.skipped && m.student.name.trim());
      if (validMatches.length === 0) {
        showToast('No valid records with student names to save.');
        setIsSaving(false);
        return;
      }

      // 1. Create BatchFolder in Dexie DB
      const folderId = await addBatchFolder({
        name: batchFolderName.trim(),
        sourceType: 'Archive Digitizer',
        status: 'Ready for Design',
        collectorName: 'Archive Digitizer Station',
        totalRecords: validMatches.length,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // 2. Map to Person records with full dynamic custom fields
      const persons: Omit<Person, 'id'>[] = validMatches.map((m, idx) => {
        const s = m.student;
        const nameParts = s.name.trim().split(/\s+/);
        const firstName = s.firstName || nameParts[0] || s.name;
        const lastName = s.lastName || nameParts.slice(1).join(' ') || '';

        return {
          fullName: s.name.trim(),
          firstName,
          lastName,
          fatherName: s.fatherName || s.customFields?.['Father Name'] || '',
          motherName: s.motherName || s.customFields?.['Mother Name'] || '',
          parentName: s.parentName || s.guardianName || s.customFields?.['Parent Name'] || '',
          idNumber: s.studentId || `SL-${new Date().getFullYear()}-${1000 + idx}`,
          category: 'Students',
          department: s.grade || s.customFields?.['Department'] || s.customFields?.['Class'] || 'General',
          role: 'Student',
          phone: s.phone || '',
          email: `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}@school.internal`,
          gender: s.sex === 'Female' ? 'Female' : 'Male',
          bloodGroup: s.bloodGroup || s.customFields?.['Blood Group'] || 'O+',
          dateOfBirth: s.dob || s.customFields?.['Date of Birth'] || '',
          dob: s.dob || s.customFields?.['Date of Birth'] || '',
          address: s.address || s.customFields?.['Address'] || '',
          academicYear: s.academicYear || s.customFields?.['Academic Year'] || '',
          section: s.section || s.customFields?.['Section'] || '',
          rollNumber: s.rollNumber || s.customFields?.['Roll No'] || '',
          joinedDate: new Date().toISOString().split('T')[0],
          schoolName: s.schoolName || batchFolderName.trim(),
          grade: s.grade || 'Grade 10',
          guardianName: s.guardianName || s.parentName || '',
          photoDataUrl: m.photoUrl || '',
          status: 'Active',
          fulfillmentStatus: 'Unfulfilled',
          paymentStatus: 'Paid',
          channel: 'Physical Ledger Scan',
          totalAmount: 'Free',
          workerId: 1,
          collectedBy: 'Archive Digitizer Station',
          location: batchFolderName.trim(),
          batchFolderId: folderId,
          folderName: batchFolderName.trim(),
          sourceFileName: excelFileName || 'Booklet Scan',
          customFields: s.customFields || {},
          extraData: s.customFields || {},
          createdAt: new Date(),
        };
      });

      await bulkAddPeople(persons);
      setSavedCount(persons.length);
      setStep('done');
    } catch (err) {
      console.error(err);
      showToast('Error saving records to database.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setPageImageUrl(null);
    setCropBoxes([]);
    setCroppedPhotos([]);
    setExcelStudents([]);
    setExcelFileName('');
    setMatches([]);
    setSavedCount(0);
    setStartRow(0);
  };

  return (
    <div
      className="flex h-screen font-sans antialiased overflow-hidden transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-root)', color: 'var(--text-primary)' }}
    >
      <Sidebar />

      <main id="main-content" className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header */}
        <header
          className="pl-14 pr-4 sm:px-8 py-3.5 border-b flex-shrink-0 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <div>
            <p className="text-[10px] font-mono tracking-widest uppercase font-bold text-[#84a92c]">
              ARCHIVE DIGITIZATION & INGESTION HUB
            </p>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight mt-0.5" style={{ color: 'var(--text-primary)' }}>
              Bulk Roster Digitizer & Asset Ingestion
            </h1>
          </div>

          {/* Subsystem Switcher Tabs */}
          <div
            className="flex items-center p-1 rounded-xl border w-full sm:w-auto justify-center"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
          >
            <button
              onClick={() => setHubTab('ledger-ocr')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                hubTab === 'ledger-ocr' ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: hubTab === 'ledger-ocr' ? '#198754' : 'transparent',
                color: hubTab === 'ledger-ocr' ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              <BookOpen className="w-4 h-4" />
              <span>Physical Ledger Digitizer</span>
            </button>

            <button
              onClick={() => setHubTab('asset-matcher')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                hubTab === 'asset-matcher' ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: hubTab === 'asset-matcher' ? '#198754' : 'transparent',
                color: hubTab === 'asset-matcher' ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              <Sparkles className="w-4 h-4" />
              <span>Batch Asset Matcher (CSV+Photos+QR)</span>
            </button>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-6">
          {hubTab === 'asset-matcher' ? (
            <BatchAssetMatcherHub
              onSuccess={() => {
                navigate('/studio');
              }}
            />
          ) : (
            <>
              {/* Stepper Header for Ledger OCR */}
              <div className="flex items-center justify-between p-3 rounded-2xl border flex-wrap gap-2" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                <div className="flex items-center gap-2 text-xs font-mono font-bold">
                  <span className={`px-2.5 py-1 rounded-lg ${step === 'upload' ? 'bg-[#84a92c] text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                    1. Scan & Crop Document
                  </span>
                  <span className="text-slate-600">→</span>
                  <span className={`px-2.5 py-1 rounded-lg ${step === 'match' ? 'bg-[#84a92c] text-slate-950 font-black' : 'bg-slate-800 text-slate-400'}`}>
                    2. Review Extracted Records ({matches.length})
                  </span>
                </div>

                {step !== 'upload' && (
                  <button
                    onClick={handleReset}
                    className="text-[10px] font-mono text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Reset & Start Over
                  </button>
                )}
              </div>

          {/* ================= STEP 2: UPLOAD & CROP ================= */}
          {step === 'upload' && (
            <div className="space-y-5 animate-fade-in">
              {/* Batch Folder Name Input */}
              <div
                className="p-4 rounded-2xl border space-y-1.5"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              >
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FolderKanban className="w-4 h-4 text-[#84a92c]" />
                  <span>Batch Folder Name * (Required)</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Warka Academy - Grade KG 2B Ledger Book 1"
                  value={batchFolderName}
                  onChange={e => setBatchFolderName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border text-xs font-bold focus:outline-none focus:border-[#84a92c]"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
                <p className="text-[10px] text-slate-400">
                  All extracted student records will be organized under this Batch Folder in the database.
                </p>
              </div>

              {/* OCR Engine Selection Bar */}
              <div
                className="p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#84a92c]/20 text-[#84a92c] flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 fill-current" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                      OCR Intelligence & Vision Engine
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Powered by Google Gemini 3.6 Flash Multimodal AI Vision
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setOcrEngine('gemini')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                      ocrEngine === 'gemini'
                        ? 'bg-[#198754] text-white border-transparent shadow-xs'
                        : 'hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: ocrEngine === 'gemini' ? '#198754' : 'var(--bg-elevated)',
                      borderColor: ocrEngine === 'gemini' ? 'transparent' : 'var(--border-primary)',
                      color: ocrEngine === 'gemini' ? '#ffffff' : 'var(--text-secondary)',
                    }}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Gemini 3.6 Vision (Intelligent)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOcrEngine('tesseract')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all ${
                      ocrEngine === 'tesseract'
                        ? 'bg-[#198754] text-white border-transparent shadow-xs'
                        : 'hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: ocrEngine === 'tesseract' ? '#198754' : 'var(--bg-elevated)',
                      borderColor: ocrEngine === 'tesseract' ? 'transparent' : 'var(--border-primary)',
                      color: ocrEngine === 'tesseract' ? '#ffffff' : 'var(--text-secondary)',
                    }}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Tesseract (Offline Local)</span>
                  </button>
                </div>
              </div>

              {/* Upload Dropzones */}
              <div className="grid grid-cols-1 gap-4">
                {/* 1. Image Scan Upload */}
                {(uploadMode === 'image-only' || uploadMode === 'image-excel') && (
                  <div
                    className="p-5 rounded-2xl border space-y-3"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                  >
                    <div className="flex items-center justify-between">
                      <label htmlFor="document-page-upload-input" className="text-xs font-bold uppercase font-mono tracking-wider flex items-center gap-1.5 text-[#84a92c]">
                        <Scan className="w-4 h-4" />
                        <span>Document Sheet / Booklet Scan</span>
                      </label>
                      <input
                        id="document-page-upload-input"
                        name="documentPageFile"
                        ref={pageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePageUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => pageInputRef.current?.click()}
                        className="px-3 py-1 text-xs font-bold rounded-lg border hover:border-[#84a92c] cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                      >
                        {pageImageUrl ? 'Replace Scan' : 'Choose Scan File'}
                      </button>
                    </div>

                    {!pageImageUrl && (
                      <div
                        onClick={() => pageInputRef.current?.click()}
                        className="w-full py-12 rounded-xl border-2 border-dashed border-slate-700 hover:border-[#84a92c] transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
                      >
                        <Upload className="w-8 h-8 text-slate-500" />
                        <p className="text-xs font-bold text-slate-300">Click or Drag & Drop Document Scan</p>
                        <p className="text-[10px] text-slate-400">JPG, PNG, WebP (e.g. 8-card Warka Academy booklet)</p>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Excel Upload */}
                {(uploadMode === 'excel-only' || uploadMode === 'image-excel') && (
                  <div
                    className="p-5 rounded-2xl border space-y-3"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                  >
                    <div className="flex items-center justify-between">
                      <label htmlFor="student-excel-upload-input" className="text-xs font-bold uppercase font-mono tracking-wider flex items-center gap-1.5 text-emerald-500">
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Student Excel / CSV Roster</span>
                      </label>
                      <input
                        id="student-excel-upload-input"
                        name="studentExcelFile"
                        ref={excelInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleExcelUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => excelInputRef.current?.click()}
                        className="px-3 py-1 text-xs font-bold rounded-lg border hover:border-emerald-500 cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                      >
                        {excelStudents.length > 0 ? 'Replace Excel' : 'Choose File'}
                      </button>
                    </div>

                    {excelStudents.length === 0 ? (
                      <div
                        onClick={() => excelInputRef.current?.click()}
                        className="w-full py-12 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-8 h-8 text-slate-500" />
                        <p className="text-xs font-bold text-slate-300">Upload Student Spreadsheet (.xlsx, .csv)</p>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-emerald-400 font-mono truncate">{excelFileName}</p>
                          <p className="text-[10px] text-emerald-600 font-mono">{excelStudents.length} student records loaded</p>
                        </div>
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">Ready</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Interactive Visual Draggable Crop Canvas */}
              {pageImageUrl && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white">
                      Detected Photo Boxes ({cropBoxes.length}):
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Drag or resize any box to adjust crop boundary
                    </span>
                  </div>
                  <VisualCropCanvas
                    pageImageUrl={pageImageUrl}
                    cropBoxes={cropBoxes}
                    onCropBoxesChange={setCropBoxes}
                  />
                </div>
              )}

              {/* Next Button */}
              <div className="pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={!pageImageUrl}
                  className="py-2 px-4 rounded-xl border text-xs font-bold cursor-pointer disabled:opacity-40"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                >
                  Clear Document
                </button>

                <button
                  type="button"
                  onClick={handleCropAndMatch}
                  disabled={isCropping || (!pageImageUrl && excelStudents.length === 0)}
                  className="btn-primary py-2.5 px-6 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-40"
                >
                  <span>{isCropping ? cropProgressMsg || 'Processing…' : `Extract ${cropBoxes.length} Faces & Run OCR`}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 3: MATCH & REVIEW ================= */}
          {step === 'match' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Review & Verify Extracted Records ({matches.length})</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#84a92c]/20 text-[#84a92c] font-mono font-bold">
                      {batchFolderName}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Verify extracted names, IDs, dynamic categories, and cropped photos. All detected form fields are editable below.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCategoryModalOpen(true)}
                    className="py-1.5 px-3 rounded-lg border text-xs font-bold flex items-center gap-1.5 cursor-pointer bg-[#84a92c]/10 border-[#84a92c]/40 text-[#84a92c] hover:bg-[#84a92c]/20"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Category</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className="py-1.5 px-3 rounded-lg border text-xs font-bold cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                  >
                    Adjust Crop Boxes
                  </button>
                </div>
              </div>

              {/* Dynamic Categories Schema Bar */}
              <div
                className="p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-2.5 shadow-xs"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#84a92c]" />
                    <span>Adaptive Form Categories ({detectedCategories.length}):</span>
                  </span>
                  {detectedCategories.map(cat => (
                    <span
                      key={cat}
                      className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-slate-200 text-[10px] font-mono font-bold border border-slate-700 flex items-center gap-1"
                    >
                      <span>{cat}</span>
                    </span>
                  ))}
                </div>

                <span className="text-[10px] text-slate-400">
                  Auto-adapted to document structure
                </span>
              </div>

              {/* Student Cards List */}
              <div className="space-y-3">
                {matches.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                      m.skipped
                        ? 'opacity-40 bg-slate-900/40'
                        : m.student.flagged
                        ? 'bg-amber-950/20 border-amber-500/40 shadow-xs'
                        : 'bg-slate-900/70 border-slate-700 shadow-xs'
                    }`}
                  >
                    {/* Photo + Replace + Non-destructive Enhance */}
                    <div className="flex items-center gap-3.5 flex-shrink-0">
                      <div className="w-16 h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 flex items-center justify-center shadow-inner relative group">
                        {m.photoUrl ? (
                          <img src={m.photoUrl} alt={m.student.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-slate-600 font-mono">No Photo</span>
                        )}

                        {m.isEnhanced && (
                          <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-[#84a92c] text-slate-950 font-mono font-black text-[6px]">
                            ENHANCED
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleReplacePhoto(idx)}
                          className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold text-white transition-opacity cursor-pointer"
                        >
                          Replace
                        </button>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-[#84a92c] font-bold block">
                          Card #{idx + 1}
                        </span>

                        {/* Non-destructive Enhance Toggle (Default OFF) */}
                        {m.photoUrl && (
                          <button
                            type="button"
                            onClick={() => handleToggleEnhancePhoto(idx)}
                            className={`py-0.5 px-1.5 rounded text-[9px] font-bold border flex items-center gap-1 cursor-pointer transition-all ${
                              m.isEnhanced
                                ? 'bg-[#84a92c]/20 border-[#84a92c] text-[#84a92c]'
                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                            }`}
                            title="Toggle non-destructive contrast and sharpness enhancement"
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>{m.isEnhanced ? 'Enhanced' : 'Enhance'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleReplacePhoto(idx)}
                          className="text-[10px] text-slate-400 hover:text-white cursor-pointer block"
                        >
                          Change
                        </button>
                      </div>
                    </div>

                    {/* Editable Fields Grid */}
                    <div className="flex-1 space-y-2.5 w-full">
                      {m.student.flagged && m.student.flagReasons.length > 0 && (
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-medium">
                          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                          <span>{m.student.flagReasons.join(' • ')}</span>
                        </div>
                      )}

                      {/* Primary Fields Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
                        {/* Name */}
                        <div>
                          <label htmlFor={`student-name-input-${idx}`} className="text-[10px] font-bold text-slate-300 block mb-0.5">
                            Full Name *
                          </label>
                          <input
                            id={`student-name-input-${idx}`}
                            name={`studentName_${idx}`}
                            type="text"
                            placeholder="(Enter full name)"
                            value={m.student.name}
                            onChange={e => updateStudent(idx, 'name', e.target.value)}
                            className={`w-full py-1.5 px-2.5 rounded-lg border font-bold text-xs focus:outline-none ${
                              !m.student.name.trim()
                                ? 'border-amber-500/60 bg-amber-950/20 text-amber-200 focus:border-amber-400'
                                : 'border-slate-700 bg-slate-900 text-white focus:border-[#84a92c]'
                            }`}
                          />
                        </div>

                        {/* ID Number */}
                        <div>
                          <label htmlFor={`student-id-input-${idx}`} className="text-[10px] font-bold text-slate-300 block mb-0.5">
                            ID / Roll Number
                          </label>
                          <input
                            id={`student-id-input-${idx}`}
                            name={`studentId_${idx}`}
                            type="text"
                            placeholder="e.g. WA/002/2019"
                            value={m.student.studentId}
                            onChange={e => updateStudent(idx, 'studentId', e.target.value)}
                            className="w-full py-1.5 px-2.5 rounded-lg border font-mono text-xs focus:outline-none focus:border-[#84a92c] bg-slate-900 border-slate-700 text-white"
                          />
                        </div>

                        {/* Grade / Role */}
                        <div>
                          <label htmlFor={`student-grade-input-${idx}`} className="text-[10px] font-bold text-slate-300 block mb-0.5">
                            Grade / Class / Role
                          </label>
                          <input
                            id={`student-grade-input-${idx}`}
                            name={`studentGrade_${idx}`}
                            type="text"
                            value={m.student.grade}
                            onChange={e => updateStudent(idx, 'grade', e.target.value)}
                            className="w-full py-1.5 px-2.5 rounded-lg border text-xs focus:outline-none focus:border-[#84a92c] bg-slate-900 border-slate-700 text-white font-bold"
                          />
                        </div>

                        {/* Phone */}
                        <div>
                          <label htmlFor={`student-phone-input-${idx}`} className="text-[10px] font-bold text-slate-300 block mb-0.5">
                            Phone Number
                          </label>
                          <input
                            id={`student-phone-input-${idx}`}
                            name={`studentPhone_${idx}`}
                            type="text"
                            placeholder="e.g. 0911028450"
                            value={m.student.phone}
                            onChange={e => updateStudent(idx, 'phone', e.target.value)}
                            className="w-full py-1.5 px-2.5 rounded-lg border text-xs focus:outline-none focus:border-[#84a92c] bg-slate-900 border-slate-700 text-white font-mono"
                          />
                        </div>
                      </div>

                      {/* Adaptive Dynamic Fields Row (DOB, Parent Name, Custom Fields) */}
                      {((m.student.customFields && Object.keys(m.student.customFields).length > 0) || m.student.dob || m.student.parentName) && (
                        <div className="pt-1.5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                          {m.student.dob && !m.student.customFields?.['Date of Birth'] && (
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Date of Birth</label>
                              <input
                                type="text"
                                value={m.student.dob}
                                onChange={e => updateStudent(idx, 'dob', e.target.value)}
                                className="w-full py-1 px-2 rounded border text-xs bg-slate-950/60 border-slate-800 text-slate-300 focus:border-[#84a92c] focus:outline-none"
                              />
                            </div>
                          )}

                          {m.student.parentName && !m.student.customFields?.['Parent Name'] && (
                            <div>
                              <label className="text-[9px] font-bold text-slate-400 block mb-0.5">Parent / Guardian Name</label>
                              <input
                                type="text"
                                value={m.student.parentName}
                                onChange={e => updateStudent(idx, 'parentName', e.target.value)}
                                className="w-full py-1 px-2 rounded border text-xs bg-slate-950/60 border-slate-800 text-slate-300 focus:border-[#84a92c] focus:outline-none"
                              />
                            </div>
                          )}

                          {m.student.customFields &&
                            Object.entries(m.student.customFields).map(([key, val]) => (
                              <div key={key}>
                                <label className="text-[9px] font-bold text-slate-400 block mb-0.5 truncate" title={key}>
                                  {key}
                                </label>
                                <input
                                  type="text"
                                  value={val}
                                  onChange={e => updateCustomField(idx, key, e.target.value)}
                                  className="w-full py-1 px-2 rounded border text-xs bg-slate-950/60 border-slate-800 text-slate-200 focus:border-[#84a92c] focus:outline-none"
                                />
                              </div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() => updateMatch(idx, { skipped: !m.skipped })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer ${
                          m.skipped
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
                        }`}
                      >
                        {m.skipped ? 'Include' : 'Skip'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Action Bar */}
              <div className="pt-4 flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="py-2 px-4 rounded-xl border text-xs font-bold cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
                >
                  Back to Crop
                </button>

                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="btn-primary py-3 px-8 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg bg-[#84a92c] hover:bg-[#9fe870] text-slate-950"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>
                    {isSaving
                      ? 'Saving to Database…'
                      : `Save ${matches.filter(m => !m.skipped && m.student.name.trim()).length} Students to Batch "${batchFolderName || 'Archive'}"`}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ================= STEP 4: COMPLETED ================= */}
          {step === 'done' && (
            <div className="text-center py-12 space-y-6 animate-fade-in max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-full bg-[#84a92c]/20 text-[#84a92c] flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-extrabold text-white">
                  Digitization Complete!
                </h2>
                <p className="text-xs text-slate-400">
                  Successfully saved <strong className="text-[#84a92c]">{savedCount} student records</strong> into Batch Folder <strong className="text-white">"{batchFolderName}"</strong>.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/studio')}
                  className="btn-primary py-2.5 px-5 text-xs font-bold cursor-pointer shadow-md"
                >
                  Open in ID Card Studio
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/print')}
                  className="py-2.5 px-5 rounded-xl border text-xs font-bold cursor-pointer hover:border-[#84a92c]"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                >
                  Print Imposition Sheets
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="py-2.5 px-4 rounded-xl border text-xs font-bold cursor-pointer text-slate-400 hover:text-white"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                >
                  Digitize Another Page
                </button>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </main>

      {/* Modal: Add Custom Category to Batch */}
      {newCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div
            className="w-full max-w-md p-6 rounded-2xl border space-y-4 shadow-2xl animate-scale-in"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#84a92c]" />
                <span>Add Custom Category to Batch</span>
              </h3>
              <button
                type="button"
                onClick={() => setNewCategoryModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Enter the field name to add to all <strong>{matches.length}</strong> records in this batch (e.g. <em>Parent Name, Blood Group, Address, DOB, Mother Name, Section</em>).
            </p>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleAddCategoryToBatch(newCategoryInput);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Blood Group, Emergency Contact, Mother Name"
                  value={newCategoryInput}
                  onChange={e => setNewCategoryInput(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl border text-xs font-bold focus:outline-none focus:border-[#84a92c]"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Quick Suggestions Chips */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-mono text-slate-500 font-bold block uppercase">
                  Quick Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Parent Name',
                    'Mother Name',
                    'Date of Birth',
                    'Blood Group',
                    'Address',
                    'Section',
                    'Roll Number',
                    'Academic Year',
                    'Emergency Phone',
                  ].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleAddCategoryToBatch(preset)}
                      className="px-2 py-0.5 rounded-md border text-[10px] font-bold text-slate-300 hover:text-[#84a92c] hover:border-[#84a92c] cursor-pointer"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewCategoryModalOpen(false)}
                  className="py-2 px-4 rounded-xl border text-xs font-bold cursor-pointer text-slate-400 hover:text-white"
                  style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCategoryInput.trim()}
                  className="btn-primary py-2 px-5 text-xs font-bold cursor-pointer shadow-md disabled:opacity-40"
                >
                  Add to All Records
                </button>
              </div>
            </form>
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
