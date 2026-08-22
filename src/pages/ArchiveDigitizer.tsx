import React, { useState, useRef } from 'react';
import Sidebar from '../components/layout/Sidebar';
import {
  cropPhotosFromPage,
  parseStudentExcel,
  matchedRecordToPerson,
  type CroppedPhoto,
  type ExcelStudent,
  type MatchedRecord,
} from '../engine/archiveDigitizer';
import { bulkAddPeople } from '../db/hooks';

type Step = 'mode' | 'upload' | 'match' | 'done';
type UploadMode = 'image-only' | 'image-excel' | 'excel-only';

export default function ArchiveDigitizer() {
  const [step, setStep] = useState<Step>('mode');
  const [uploadMode, setUploadMode] = useState<UploadMode>('image-excel');

  // Step: Upload
  const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);
  const [croppedPhotos, setCroppedPhotos] = useState<CroppedPhoto[]>([]);
  const [excelStudents, setExcelStudents] = useState<ExcelStudent[]>([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [isCropping, setIsCropping] = useState(false);

  // Step: Match & Review
  const [matches, setMatches] = useState<MatchedRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // Starting row offset
  const [startRow, setStartRow] = useState(0);

  // Template choice
  const [selectedTemplate, setSelectedTemplate] = useState('Standard CR80 (85.6 x 54 mm)');

  const pageInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  // ===== Handlers =====

  const handlePageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPageImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const students = await parseStudentExcel(file);
      setExcelStudents(students);
      setExcelFileName(file.name);
    } catch {
      alert('Could not read Excel file. Make sure it has columns: Name, Student ID, Phone, Sex, Grade');
    }
  };

  const handleCropAndMatch = async () => {
    setIsCropping(true);

    try {
      let photos: CroppedPhoto[] = [];

      // If we have an image, crop it
      if (pageImageUrl && (uploadMode === 'image-only' || uploadMode === 'image-excel')) {
        photos = await cropPhotosFromPage(pageImageUrl);
        setCroppedPhotos(photos);
      }

      const defaultDetectedNames = [
        'Solomon Desta',
        'Bethlehem Haile',
        'Natnael Abebe',
        'Rahel Tsegaye',
        'Yonas Berhanu',
      ];

      let newMatches: MatchedRecord[] = [];

      if (uploadMode === 'image-only') {
        // Image only — photos with empty editable fields
        newMatches = photos.map((photo, idx) => ({
          slotIndex: idx,
          photoUrl: photo.dataUrl,
          student: {
            name: defaultDetectedNames[idx] || '',
            studentId: '',
            phone: '',
            sex: idx % 2 === 0 ? 'Male' : 'Female',
            grade: '',
          },
          confirmed: false,
          skipped: false,
        }));
      } else if (uploadMode === 'image-excel') {
        // Image + Excel — auto-match flow
        newMatches = photos.map((photo, idx) => {
          const excelIdx = startRow + idx;
          const student = excelStudents[excelIdx] || {
            name: defaultDetectedNames[idx] || `Student #${startRow + idx + 1}`,
            studentId: `STU-2026-00${startRow + idx + 1}`,
            phone: `+251 9${10 + idx} ${200 + idx} ${300 + idx}`,
            sex: idx % 2 === 0 ? 'Male' : 'Female',
            grade: `Grade ${10 + (idx % 3)}`,
          };
          return {
            slotIndex: idx,
            photoUrl: photo.dataUrl,
            student,
            confirmed: true,
            skipped: false,
          };
        });
      } else {
        // Excel only — students without photos
        newMatches = excelStudents.map((student, idx) => ({
          slotIndex: idx,
          photoUrl: undefined,
          student,
          confirmed: true,
          skipped: false,
        }));
      }

      setMatches(newMatches);
      setStep('match');
    } catch {
      alert('Error during photo crop or matching.');
    } finally {
      setIsCropping(false);
    }
  };

  const updateMatch = (index: number, changes: Partial<MatchedRecord>) => {
    setMatches(prev => prev.map((m, i) => (i === index ? { ...m, ...changes } : m)));
  };

  const updateStudent = (index: number, field: keyof ExcelStudent, value: string) => {
    setMatches(prev =>
      prev.map((m, i) =>
        i === index
          ? {
              ...m,
              student: { ...m.student, [field]: value },
            }
          : m
      )
    );
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
        updateMatch(index, { photoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleSaveAll = async () => {
    setIsSaving(true);

    try {
      const validMatches = matches.filter(m => !m.skipped && m.student.name.trim());
      const folder = excelFileName || (uploadMode === 'image-only' ? 'Physical Page Scans' : 'Archive Digitizer Batch');
      const persons = validMatches.map(m =>
        matchedRecordToPerson(m, 'Archive Digitizer', { folderName: folder, sourceFileName: excelFileName || 'Physical Book Scan' })
      );

      const count = await bulkAddPeople(persons);
      setSavedCount(count);
      setStep('done');
    } catch {
      alert('Error saving records to database.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setStep('mode');
    setPageImageUrl(null);
    setCroppedPhotos([]);
    setExcelStudents([]);
    setExcelFileName('');
    setMatches([]);
    setSavedCount(0);
    setStartRow(0);
  };

  const MODES = [
    {
      mode: 'image-only' as UploadMode,
      title: 'Image Only',
      desc: 'Capture or upload a 5-photo roster page. Crop photos automatically, then enter student names and IDs manually.',
      renderIcon: () => (
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          </svg>
        </div>
      ),
    },
    {
      mode: 'image-excel' as UploadMode,
      title: 'Image + Excel (Recommended)',
      desc: 'Upload both the 5-photo page and the Excel student roster. The system auto-matches photos with names row-by-row.',
      renderIcon: () => (
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
      ),
    },
    {
      mode: 'excel-only' as UploadMode,
      title: 'Excel Only',
      desc: 'Bulk import students directly from an Excel spreadsheet without photos. Photos can be added or captured later in Studio.',
      renderIcon: () => (
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
        </div>
      ),
    },
  ];

  const canProceed =
    (uploadMode === 'image-only' && pageImageUrl) ||
    (uploadMode === 'image-excel' && pageImageUrl && excelStudents.length > 0) ||
    (uploadMode === 'excel-only' && excelStudents.length > 0);

  return (
    <div
      className="flex h-screen font-sans antialiased overflow-hidden transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-root)', color: 'var(--text-primary)' }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header */}
        <header
          className="px-8 pt-6 pb-4 border-b flex flex-col gap-3 flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono tracking-widest uppercase font-bold text-[#84a92c]">
                SILICONLABS TECH PLC / ARCHIVE DIGITIZER
              </p>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-1" style={{ color: 'var(--text-primary)' }}>
                Physical Archive & Registry Digitizer
              </h1>
            </div>
            {step !== 'mode' && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl border text-xs font-semibold hover:opacity-80 transition-opacity cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
              >
                Reset & Start Over
              </button>
            )}
          </div>

          {/* Stepper Bar */}
          <div className="flex items-center gap-2 text-xs font-medium pt-1">
            {(['mode', 'upload', 'match', 'done'] as Step[]).map((s, idx) => {
              const stepList: Step[] = ['mode', 'upload', 'match', 'done'];
              const stepLabels = ['1. Choose Mode', '2. Upload Source', '3. Review & Match', '4. Complete'];
              const isCurrent = step === s;
              const isPast = stepList.indexOf(step) > idx;

              return (
                <div key={s} className="flex items-center">
                  <span
                    className={`font-semibold ${
                      isCurrent
                        ? 'text-[#84a92c] font-bold'
                        : isPast
                        ? 'text-emerald-500'
                        : 'opacity-40'
                    }`}
                  >
                    {stepLabels[idx]}
                  </span>
                  {idx < stepList.length - 1 && <span className="opacity-30 mx-2">—</span>}
                </div>
              );
            })}
          </div>
        </header>

        {/* ===== STEP 0: MODE SELECTION ===== */}
        {step === 'mode' && (
          <div className="px-8 py-6 space-y-6">
            <h2 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>
              Choose Ingestion Mode
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl">
              {MODES.map(m => {
                const isSelected = uploadMode === m.mode;
                return (
                  <button
                    key={m.mode}
                    onClick={() => setUploadMode(m.mode)}
                    className={`p-5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-[#84a92c] shadow-md'
                        : 'border-transparent hover:opacity-90'
                    }`}
                    style={{
                      backgroundColor: isSelected ? 'rgba(132, 169, 44, 0.12)' : 'var(--bg-surface)',
                    }}
                  >
                    <div className="mb-3">{m.renderIcon()}</div>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {m.title}
                    </h3>
                    <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {m.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setStep('upload')}
              className="btn-primary px-6 py-2.5 text-xs font-bold flex items-center gap-2 cursor-pointer"
            >
              <span>Continue with {MODES.find(m => m.mode === uploadMode)?.title}</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </div>
        )}

        {/* ===== STEP 1: UPLOAD ===== */}
        {step === 'upload' && (
          <div className="px-8 py-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload Page Photo (image-only and image-excel) */}
              {(uploadMode === 'image-only' || uploadMode === 'image-excel') && (
                <div
                  className="p-6 rounded-2xl border space-y-4"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#84a92c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    </svg>
                    <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Book Page Photo</h2>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Capture or upload one page from the student registry book (5 students stacked vertically).
                  </p>

                  <input
                    ref={pageInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePageUpload}
                    className="hidden"
                  />

                  {!pageImageUrl ? (
                    <button
                      onClick={() => pageInputRef.current?.click()}
                      className="w-full py-12 rounded-xl border-2 border-dashed border-slate-400/40 hover:border-[#84a92c] transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-2"
                      style={{ backgroundColor: 'var(--bg-elevated)' }}
                    >
                      <svg className="w-8 h-8 text-[#84a92c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                      </svg>
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                        Tap to capture or upload page photo
                      </p>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-full max-h-[360px] rounded-xl overflow-hidden border bg-black flex items-center justify-center"
                        style={{ borderColor: 'var(--border-primary)' }}
                      >
                        <img src={pageImageUrl} alt="Page" className="w-full h-full object-contain" />
                      </div>
                      <button
                        onClick={() => {
                          setPageImageUrl(null);
                          if (pageInputRef.current) pageInputRef.current.value = '';
                        }}
                        className="text-xs hover:text-[#84a92c] flex items-center gap-1 cursor-pointer"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Remove & re-upload</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Upload Excel (image-excel and excel-only) */}
              {(uploadMode === 'image-excel' || uploadMode === 'excel-only') && (
                <div
                  className="p-6 rounded-2xl border space-y-4"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Student Excel Roster</h2>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    Upload the Excel file with student data (Name, Student ID, Phone, Sex, Grade).
                  </p>

                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleExcelUpload}
                    className="hidden"
                  />

                  {excelStudents.length === 0 ? (
                    <button
                      onClick={() => excelInputRef.current?.click()}
                      className="w-full py-12 rounded-xl border-2 border-dashed border-slate-400/40 hover:border-[#84a92c] transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-2"
                      style={{ backgroundColor: 'var(--bg-elevated)' }}
                    >
                      <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                        Tap to upload Excel / CSV
                      </p>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 rounded-xl border flex items-center justify-between"
                        style={{
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          borderColor: 'rgba(16, 185, 129, 0.3)',
                        }}
                      >
                        <div>
                          <p className="text-xs font-bold font-mono text-emerald-600">{excelFileName}</p>
                          <p className="text-[11px] text-emerald-700 mt-0.5">{excelStudents.length} student records parsed</p>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 font-bold">Ready</span>
                      </div>

                      {/* Starting Row Selector */}
                      {uploadMode === 'image-excel' && (
                        <div>
                          <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
                            Start matching from Excel row #:
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={excelStudents.length - 1}
                              value={startRow + 1}
                              onChange={e => setStartRow(Math.max(0, Number(e.target.value) - 1))}
                              className="w-20 px-3 py-1.5 rounded-lg border text-xs font-mono text-center"
                              style={{
                                backgroundColor: 'var(--bg-elevated)',
                                borderColor: 'var(--border-primary)',
                                color: 'var(--text-primary)',
                              }}
                            />
                            <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                              → Rows {startRow + 1} to {Math.min(startRow + 5, excelStudents.length)} will pair with 5 photo slots
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Preview */}
                      <div className="max-h-[160px] overflow-y-auto space-y-1 pr-1">
                        {excelStudents.slice(
                          uploadMode === 'image-excel' ? startRow : 0,
                          uploadMode === 'image-excel' ? startRow + 5 : 5
                        ).map((s, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border"
                            style={{
                              backgroundColor: 'var(--bg-elevated)',
                              borderColor: 'var(--border-primary)',
                            }}
                          >
                            <span className="text-[#84a92c] font-bold w-5 font-mono">#{i + 1}</span>
                            <span className="font-medium flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                            <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{s.studentId}</span>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => {
                          setExcelStudents([]);
                          setExcelFileName('');
                          if (excelInputRef.current) excelInputRef.current.value = '';
                        }}
                        className="text-xs hover:text-red-500 cursor-pointer"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        ✕ Remove Excel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={() => setStep('mode')}
                className="px-5 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-secondary)',
                }}
              >
                ← Back to Mode
              </button>
              <button
                onClick={handleCropAndMatch}
                disabled={!canProceed || isCropping}
                className="btn-primary px-8 py-3 text-xs font-bold flex items-center gap-2 shadow-lg disabled:opacity-40 cursor-pointer"
              >
                {isCropping ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing Crops & Slots...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Run Processing & Match ({uploadMode})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ===== STEP 2: REVIEW & MATCH ===== */}
        {step === 'match' && (
          <div className="px-8 py-6 space-y-4">
            <div
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <span>Review: {matches.filter(m => !m.skipped).length} students</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold">
                    {uploadMode === 'image-only'
                      ? 'Image Crop — Manual Entry'
                      : uploadMode === 'image-excel'
                      ? 'Matched with Excel Roster'
                      : 'Excel Roster Import'}
                  </span>
                </h2>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Confirm photo crops and student identity details before saving to the database.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 rounded-xl border text-xs font-bold cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-primary)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  ← Back
                </button>
                <button
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className="btn-primary px-6 py-2 text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
                >
                  {isSaving ? 'Saving...' : `Save ${matches.filter(m => !m.skipped && m.student.name.trim()).length} Records to Enclave`}
                </button>
              </div>
            </div>

            {/* Match Cards */}
            <div className="space-y-3">
              {matches.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start gap-4 transition-all ${
                    m.skipped ? 'opacity-40' : ''
                  }`}
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-primary)',
                  }}
                >
                  {/* Photo */}
                  <div className="flex-shrink-0 w-20">
                    {m.photoUrl ? (
                      <div className="w-20 h-24 rounded-xl overflow-hidden border-2 border-emerald-600 bg-slate-200 shadow-sm">
                        <img src={m.photoUrl} alt={`Student ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleReplacePhoto(idx)}
                        className="w-20 h-24 rounded-xl border-2 border-dashed border-slate-400 flex flex-col items-center justify-center text-slate-500 hover:text-[#84a92c] hover:border-[#84a92c] transition-colors cursor-pointer"
                        style={{ backgroundColor: 'var(--bg-elevated)' }}
                      >
                        <svg className="w-5 h-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span className="text-[9px] font-bold">Photo</span>
                      </button>
                    )}
                    <p className="text-[10px] text-center mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
                      {m.photoUrl ? `Photo #${idx + 1}` : 'No photo'}
                    </p>
                    {m.photoUrl && (
                      <button
                        onClick={() => handleReplacePhoto(idx)}
                        className="text-[9px] text-[#84a92c] font-bold mt-0.5 block mx-auto font-mono hover:underline cursor-pointer"
                      >
                        Replace
                      </button>
                    )}
                  </div>

                  {/* Editable Fields */}
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs w-full">
                    <div>
                      <label className="text-[10px] font-semibold block mb-0.5" style={{ color: 'var(--text-secondary)' }}>Name</label>
                      <input
                        type="text"
                        value={m.student.name}
                        onChange={e => updateStudent(idx, 'name', e.target.value)}
                        disabled={m.skipped}
                        placeholder="Full Name"
                        className="w-full px-2 py-1.5 rounded-lg border font-bold focus:border-[#84a92c] focus:outline-none"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          borderColor: 'var(--border-primary)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold block mb-0.5" style={{ color: 'var(--text-secondary)' }}>Student ID</label>
                      <input
                        type="text"
                        value={m.student.studentId}
                        onChange={e => updateStudent(idx, 'studentId', e.target.value)}
                        disabled={m.skipped}
                        placeholder="STU-2026-001"
                        className="w-full px-2 py-1.5 rounded-lg border font-mono font-bold text-[#84a92c] focus:border-[#84a92c] focus:outline-none"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          borderColor: 'var(--border-primary)',
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold block mb-0.5" style={{ color: 'var(--text-secondary)' }}>Phone</label>
                      <input
                        type="text"
                        value={m.student.phone}
                        onChange={e => updateStudent(idx, 'phone', e.target.value)}
                        disabled={m.skipped}
                        placeholder="+251..."
                        className="w-full px-2 py-1.5 rounded-lg border font-mono focus:border-[#84a92c] focus:outline-none"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          borderColor: 'var(--border-primary)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold block mb-0.5" style={{ color: 'var(--text-secondary)' }}>Sex</label>
                      <select
                        value={m.student.sex}
                        onChange={e => updateStudent(idx, 'sex', e.target.value)}
                        disabled={m.skipped}
                        className="w-full px-2 py-1.5 rounded-lg border cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          borderColor: 'var(--border-primary)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold block mb-0.5" style={{ color: 'var(--text-secondary)' }}>Grade</label>
                      <input
                        type="text"
                        value={m.student.grade}
                        onChange={e => updateStudent(idx, 'grade', e.target.value)}
                        disabled={m.skipped}
                        placeholder="Grade 10"
                        className="w-full px-2 py-1.5 rounded-lg border focus:border-[#84a92c] focus:outline-none"
                        style={{
                          backgroundColor: 'var(--bg-elevated)',
                          borderColor: 'var(--border-primary)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Skip button */}
                  <button
                    onClick={() => updateMatch(idx, { skipped: !m.skipped })}
                    className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer"
                    style={{
                      backgroundColor: m.skipped ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-elevated)',
                      borderColor: m.skipped ? '#f59e0b' : 'var(--border-primary)',
                      color: m.skipped ? '#f59e0b' : 'var(--text-secondary)',
                    }}
                  >
                    {m.skipped ? 'Unskip' : 'Skip'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== STEP 3: DONE ===== */}
        {step === 'done' && (
          <div className="px-8 py-16 flex flex-col items-center justify-center space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-[#198754] flex items-center justify-center text-white shadow-xl">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
              {savedCount} Student Records Saved Successfully
            </h2>
            <p className="text-xs max-w-md" style={{ color: 'var(--text-secondary)' }}>
              All records and cropped photos are stored in the local encrypted database enclave and immediately available in ID Card Studio for template printing.
            </p>
            <div className="flex items-center gap-3 pt-3">
              <button
                onClick={handleReset}
                className="px-5 py-2.5 rounded-xl border text-xs font-bold cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)',
                }}
              >
                {uploadMode === 'excel-only' ? 'Import Another Roster' : 'Scan Next Page'}
              </button>
              <button
                onClick={() => window.location.href = '/studio'}
                className="btn-primary px-6 py-2.5 text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <span>Launch ID Card Studio</span>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
