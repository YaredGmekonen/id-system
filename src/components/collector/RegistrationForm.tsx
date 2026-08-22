import { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { DEPARTMENTS } from '../../design-tokens';
import { addPerson } from '../../db/hooks';
import type { Person } from '../../db/database';
import PhotoCapture from './PhotoCapture';
import ColumnMappingModal from './ColumnMappingModal';
import { useAuth } from '../../context/AuthContext';

interface RegistrationFormProps {
  onSuccess?: () => void;
  activeFolderId?: number;
  activeFolderName?: string;
}

export default function RegistrationForm({ onSuccess, activeFolderId, activeFolderName }: RegistrationFormProps) {
  const { currentUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState('');
  const [category, setCategory] = useState<Person['category']>('General');
  const [department, setDepartment] = useState<string>(DEPARTMENTS[0]);
  const [role, setRole] = useState('');
  const [phone, setPhone] = useState('+251 9');
  const [email, setEmail] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [idNumber] = useState(() => `SL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState('');

  // Column Mapping Modal State
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSaving(true);
    try {
      await addPerson({
        fullName: fullName.trim(),
        idNumber,
        category,
        department,
        role: role.trim() || 'Staff Member',
        phone: phone.trim() || '+251 900 000 000',
        email: email.trim() || `${fullName.toLowerCase().replace(/\s+/g, '.')}@siliconlabs.internal`,
        bloodGroup,
        joinedDate: new Date().toISOString().split('T')[0],
        photoDataUrl: photoDataUrl || '',
        status: 'Active',
        fulfillmentStatus: 'Unfulfilled',
        paymentStatus: 'Paid',
        channel: 'Field Registration',
        totalAmount: '$100',
        workerId: currentUser?.workerId || 1,
        collectedBy: currentUser?.name || 'Field Officer',
        location: currentUser?.location || 'Registration Terminal #1',
        batchFolderId: activeFolderId,
        folderName: activeFolderName || 'Unclassified',
        sourceFileName: 'Manual Intake',
        createdAt: new Date(),
      });

      setSuccess(true);
      setTimeout(() => {
        setFullName('');
        setRole('');
        setPhone('+251 9');
        setEmail('');
        setPhotoDataUrl('');
        setSuccess(false);
        onSuccess?.();
      }, 1400);
    } finally {
      setSaving(false);
    }
  }, [fullName, idNumber, category, department, role, phone, email, bloodGroup, photoDataUrl, currentUser, onSuccess]);

  // Real Excel (.xlsx, .xls) and CSV Upload Handler via SheetJS
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

        // Convert sheet to JSON objects with header row
        const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        if (!jsonData || jsonData.length === 0) {
          alert('The uploaded spreadsheet contains no data rows.');
          return;
        }

        // Extract column headers
        const headers = Object.keys(jsonData[0]);

        setParsedHeaders(headers);
        setParsedRows(jsonData);
        setUploadedFileName(fileName);
        setMappingModalOpen(true);
      } catch (err) {
        console.error('Failed to parse spreadsheet:', err);
        alert('Failed to parse spreadsheet file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
      }
    };

    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4 font-sans text-xs" style={{ color: 'var(--text-primary)' }}>
      
      {/* Active Registrar Tag Banner */}
      <div
        className="p-3 rounded-xl border flex items-center justify-between shadow-2xs"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#84a92c] animate-pulse" />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
            Attributed to: {currentUser?.name || 'Field Officer'}
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border text-[#84a92c] bg-[#84a92c]/10 border-[#84a92c]/20">
          NODE ONLINE
        </span>
      </div>

      {/* Spreadsheet & Excel Bulk Onboard Action Box */}
      <div
        className="p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-primary)',
        }}
      >
        <div>
          <span className="text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>
            Bulk Onboard Spreadsheets (Excel & CSV)
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Parse client-side .xlsx, .xls, or .csv with column mapping dialog.
          </span>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
            onChange={handleSpreadsheetUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary py-1.5 px-3 flex items-center gap-1.5 font-bold cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-[#84a92c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <span>Import Excel / CSV</span>
          </button>
        </div>
      </div>

      {bulkSuccessMsg && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs font-semibold rounded-xl flex items-center gap-2">
          <span>✓</span>
          <span>{bulkSuccessMsg}</span>
        </div>
      )}

      {/* Manual Data Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        
        {/* Photo capture component */}
        <div>
          <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
            Personnel Biometric Portrait
          </label>
          <PhotoCapture
            value={photoDataUrl}
            onChange={setPhotoDataUrl}
            personName={fullName}
          />
        </div>

        {/* Identity & Basic Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="fullName" className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Full Legal Name *
            </label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Dawit Tadesse"
              className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c] font-medium"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
              System ID Number (Auto)
            </label>
            <input
              type="text"
              readOnly
              value={idNumber}
              className="w-full px-3 py-2 text-xs rounded-xl border font-mono font-bold select-all text-[#84a92c]"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-primary)',
              }}
            />
          </div>
        </div>

        {/* Department & Role */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="department" className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Department / Faculty
            </label>
            <select
              id="department"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c] font-medium cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            >
              {DEPARTMENTS.map(d => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="role" className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Role / Designation
            </label>
            <input
              id="role"
              type="text"
              value={role}
              onChange={e => setRole(e.target.value)}
              placeholder="e.g. Systems Engineer / Student"
              className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c] font-medium"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            />
          </div>
        </div>

        {/* Contact info & Blood group */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="phone" className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Phone Number
            </label>
            <input
              id="phone"
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c] font-mono"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label htmlFor="email" className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c] font-medium"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div>
            <label htmlFor="bloodGroup" className="text-xs font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Blood Group
            </label>
            <select
              id="bloodGroup"
              value={bloodGroup}
              onChange={e => setBloodGroup(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c] font-bold cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)',
              }}
            >
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={saving || !fullName.trim()}
            className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-xs font-bold cursor-pointer shadow-sm"
          >
            {saving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving Record to Database…</span>
              </>
            ) : success ? (
              <span>✓ Record Successfully Enrolled!</span>
            ) : (
              <span>Complete Personnel Registration</span>
            )}
          </button>
        </div>

      </form>

      {/* Column Mapping Dialog Modal */}
      {mappingModalOpen && (
        <ColumnMappingModal
          isOpen={mappingModalOpen}
          onClose={() => setMappingModalOpen(false)}
          headers={parsedHeaders}
          rawRows={parsedRows}
          fileName={uploadedFileName}
          onImportComplete={(count) => {
            setBulkSuccessMsg(`Successfully mapped and imported ${count.toLocaleString()} records!`);
            setTimeout(() => setBulkSuccessMsg(''), 5000);
            onSuccess?.();
          }}
        />
      )}

    </div>
  );
}
