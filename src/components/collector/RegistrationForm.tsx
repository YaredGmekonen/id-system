import { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { addPerson } from '../../db/hooks';
import type { Person } from '../../db/database';
import PhotoCapture from './PhotoCapture';
import ColumnMappingModal from './ColumnMappingModal';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  GraduationCap,
  School,
  Calendar,
  Phone,
  Hash,
  Droplet,
  FileSpreadsheet,
  CheckCircle2,
  Plus,
  Layers,
  Sparkles,
} from 'lucide-react';

interface RegistrationFormProps {
  onSuccess?: () => void;
  activeFolderId?: number;
  activeFolderName?: string;
}

export default function RegistrationForm({ onSuccess, activeFolderId, activeFolderName }: RegistrationFormProps) {
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form Fields (School / Student & Staff Focused)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female'>('Male');
  const [schoolName, setSchoolName] = useState('Maskelegna School');
  const [grade, setGrade] = useState('Grade 10');
  const [section, setSection] = useState('Section A');
  const [rollNumber, setRollNumber] = useState('');
  const [idNumber, setIdNumber] = useState(() => `SL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [phone, setPhone] = useState('+251 9');
  const [guardianName, setGuardianName] = useState('');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [category, setCategory] = useState<Person['category']>('Students');
  const [role, setRole] = useState('Student');
  const [photoDataUrl, setPhotoDataUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Column Mapping Modal State
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const computedFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!computedFullName) {
      alert('Please enter First Name and Last Name.');
      return;
    }

    setSaving(true);
    try {
      await addPerson({
        fullName: computedFullName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        idNumber: idNumber.trim() || `ID-${Date.now().toString().slice(-6)}`,
        category,
        department: grade,
        role: role.trim() || (category === 'Students' ? 'Student' : 'Staff'),
        phone: phone.trim(),
        email: `${firstName.toLowerCase().replace(/\s+/g, '')}.${lastName.toLowerCase().replace(/\s+/g, '')}@school.internal`,
        bloodGroup,
        joinedDate: dob || new Date().toISOString().split('T')[0],
        gender,
        schoolName,
        grade,
        section,
        rollNumber: rollNumber.trim(),
        guardianName: guardianName.trim(),
        photoDataUrl: photoDataUrl || '',
        status: 'Active',
        fulfillmentStatus: 'Unfulfilled',
        paymentStatus: 'Paid',
        channel: 'School Field Enrollment',
        totalAmount: 'Free',
        workerId: currentUser?.workerId || 1,
        collectedBy: currentUser?.name || 'School Registrar',
        location: schoolName,
        batchFolderId: activeFolderId,
        folderName: activeFolderName || 'Student Intake 2026',
        sourceFileName: 'Manual Registration',
        createdAt: new Date(),
      });

      setSuccess(true);
      setTimeout(() => {
        setFirstName('');
        setLastName('');
        setRollNumber('');
        setIdNumber(`SL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
        setPhone('+251 9');
        setGuardianName('');
        setDob('');
        setPhotoDataUrl('');
        setSuccess(false);
        onSuccess?.();
      }, 1200);
    } finally {
      setSaving(false);
    }
  }, [
    firstName,
    lastName,
    idNumber,
    category,
    grade,
    role,
    phone,
    bloodGroup,
    dob,
    gender,
    schoolName,
    section,
    rollNumber,
    guardianName,
    photoDataUrl,
    activeFolderId,
    activeFolderName,
    currentUser,
    onSuccess,
  ]);

  // Spreadsheet Upload Handler via SheetJS
  const handleSpreadsheetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        if (!jsonData || jsonData.length === 0) {
          alert('The uploaded spreadsheet contains no data rows.');
          return;
        }

        const headers = Object.keys(jsonData[0]);
        setParsedHeaders(headers);
        setParsedRows(jsonData);
        setUploadedFileName(fileName);
        setMappingModalOpen(true);
      } catch (err) {
        console.error('Failed to parse spreadsheet:', err);
        alert('Failed to parse spreadsheet file. Please ensure it is a valid .xlsx or .csv file.');
      }
    };

    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      {/* Top Banner with Excel Batch Import & Active Folder Info */}
      <div
        className="p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#84a92c]/10 text-[#84a92c] flex items-center justify-center flex-shrink-0">
            <School className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              School & Student Biometric Intake
            </h3>
            <p className="text-[10px] font-mono text-slate-400">
              Active Folder: <strong className="text-[#84a92c]">{activeFolderName || 'School Batch (Unclassified)'}</strong>
            </p>
          </div>
        </div>

        {/* Batch Spreadsheet Upload */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleSpreadsheetUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full sm:w-auto px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 hover:border-[#84a92c] cursor-pointer transition-colors"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span>Import Excel / CSV Roster</span>
          </button>
        </div>
      </div>

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Biometric Photo Section */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase font-mono tracking-wider text-slate-400 flex items-center gap-1">
            <User className="w-3 h-3 text-[#84a92c]" />
            <span>1. Biometric Portrait Photo</span>
          </label>
          <PhotoCapture
            value={photoDataUrl}
            onChange={setPhotoDataUrl}
            personName={`${firstName} ${lastName}`}
          />
        </div>

        {/* 2. Personal & Academic Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          {/* First Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
              First Name *
            </label>
            <input
              type="text"
              required
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="e.g. Amer / Solomon"
              className="w-full py-2 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Last Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
              Last Name / Grandfather *
            </label>
            <input
              type="text"
              required
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="e.g. Aiguse / Desta"
              className="w-full py-2 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Gender */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
              Gender
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGender('Male')}
                className={`py-2 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                  gender === 'Male' ? 'bg-[#198754] text-white border-[#198754]' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: gender === 'Male' ? '#198754' : 'var(--bg-elevated)',
                  borderColor: gender === 'Male' ? '#198754' : 'var(--border-primary)',
                  color: gender === 'Male' ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                Male
              </button>
              <button
                type="button"
                onClick={() => setGender('Female')}
                className={`py-2 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                  gender === 'Female' ? 'bg-[#198754] text-white border-[#198754]' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: gender === 'Female' ? '#198754' : 'var(--bg-elevated)',
                  borderColor: gender === 'Female' ? '#198754' : 'var(--border-primary)',
                  color: gender === 'Female' ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                Female
              </button>
            </div>
          </div>

          {/* School Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
              School Name
            </label>
            <input
              type="text"
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              placeholder="e.g. Maskelegna / Meskelegna School"
              className="w-full py-2 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Grade / Class */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
              Grade / Class
            </label>
            <select
              value={grade}
              onChange={e => setGrade(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c] cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            >
              <option value="Grade 9">Grade 9</option>
              <option value="Grade 10">Grade 10</option>
              <option value="Grade 11">Grade 11</option>
              <option value="Grade 12">Grade 12</option>
              <option value="Kindergarten / Nursery">Kindergarten / Nursery</option>
              <option value="Primary (Grade 1-8)">Primary (Grade 1-8)</option>
              <option value="Teaching Faculty">Teaching Faculty</option>
              <option value="Administration Staff">Administration Staff</option>
            </select>
          </div>

          {/* Section / Stream */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
              Section / Room
            </label>
            <input
              type="text"
              value={section}
              onChange={e => setSection(e.target.value)}
              placeholder="e.g. Section A / Room 102"
              className="w-full py-2 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Student ID / Roll Number */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                Student ID / Badge Number
              </label>
              <button
                type="button"
                onClick={() => setIdNumber(`SL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`)}
                className="text-[10px] text-[#84a92c] font-bold hover:underline cursor-pointer"
              >
                Auto-Generate
              </button>
            </div>
            <input
              type="text"
              value={idNumber}
              onChange={e => setIdNumber(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border font-mono font-bold focus:outline-none focus:border-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Contact / Phone */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
              Contact Number / Guardian Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 0512.226791"
              className="w-full py-2 px-3 rounded-xl border font-mono focus:outline-none focus:border-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Date of Birth / Admission */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
              Date of Birth / Admission Date
            </label>
            <input
              type="text"
              value={dob}
              onChange={e => setDob(e.target.value)}
              placeholder="e.g. 03.12.2009"
              className="w-full py-2 px-3 rounded-xl border font-mono focus:outline-none focus:border-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Blood Group */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold" style={{ color: 'var(--text-secondary)' }}>
              Blood Group
            </label>
            <select
              value={bloodGroup}
              onChange={e => setBloodGroup(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c] cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            >
              <option value="O+">O+ (Universal Donor)</option>
              <option value="A+">A+</option>
              <option value="B+">B+</option>
              <option value="AB+">AB+</option>
              <option value="O-">O-</option>
              <option value="A-">A-</option>
              <option value="B-">B-</option>
              <option value="AB-">AB-</option>
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            {success ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-slate-950" />
                <span>Enrolled Successfully!</span>
              </>
            ) : saving ? (
              <span>Saving Record…</span>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Save Student Record to Folder</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Spreadsheet Mapping Modal */}
      <ColumnMappingModal
        isOpen={mappingModalOpen}
        onClose={() => setMappingModalOpen(false)}
        headers={parsedHeaders}
        rawRows={parsedRows}
        fileName={uploadedFileName}
        activeFolderId={activeFolderId}
        activeFolderName={activeFolderName}
        onImportComplete={() => {
          setMappingModalOpen(false);
          onSuccess?.();
        }}
      />
    </div>
  );
}
