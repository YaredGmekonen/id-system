import { useState, useCallback } from 'react';
import { db, type Person } from '../../db/database';
import { addPerson } from '../../db/hooks';
import PhotoCapture from './PhotoCapture';
import { useAuth } from '../../context/AuthContext';
import {
  User,
  GraduationCap,
  School,
  Calendar,
  Phone,
  Hash,
  Droplet,
  CheckCircle2,
  Plus,
  AlertCircle,
  X,
  Upload,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface RegistrationFormProps {
  onSuccess?: () => void;
  activeFolderId?: number;
  activeFolderName?: string;
}

export default function RegistrationForm({ onSuccess, activeFolderId, activeFolderName }: RegistrationFormProps) {
  const { currentUser } = useAuth();

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
  const [bloodGroup, setBloodGroup] = useState('O+ (Universal Donor)');
  const [category, setCategory] = useState<Person['category']>('Students');
  const [role, setRole] = useState('Student');
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerateId = () => {
    setIdNumber(`SL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const computedFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!computedFullName) {
      setErrorMessage('Please provide both First Name and Last Name.');
      return;
    }

    const trimmedId = idNumber.trim() || `SL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    setSaving(true);
    try {
      // Check for duplicate ID in database
      const existingPerson = await db.people.where('idNumber').equals(trimmedId).first();
      if (existingPerson) {
        setErrorMessage(`ID Number "${trimmedId}" is already assigned to "${existingPerson.fullName}". Please generate a new ID.`);
        setSaving(false);
        return;
      }

      await addPerson({
        fullName: computedFullName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        idNumber: trimmedId,
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
        qrCodeDataUrl: qrCodeDataUrl || '',
        status: 'Active',
        fulfillmentStatus: 'Unfulfilled',
        paymentStatus: 'Paid',
        channel: 'School Field Enrollment',
        totalAmount: 'Free',
        workerId: currentUser?.workerId || 1,
        collectedBy: currentUser?.name || 'School Registrar',
        location: schoolName,
        batchFolderId: activeFolderId,
        folderName: activeFolderName,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Clear Form Fields
      setFirstName('');
      setLastName('');
      setRollNumber('');
      setPhotoDataUrl('');
      setQrCodeDataUrl('');
      setIdNumber(`SL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to register record:', err);
      setErrorMessage(err.message || 'Failed to save personnel record to database.');
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
    qrCodeDataUrl,
    activeFolderId,
    activeFolderName,
    currentUser,
    onSuccess,
  ]);

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div
        className="p-4 sm:p-5 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs transition-colors"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#10b981]/15 text-[#10b981] flex items-center justify-center flex-shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Personnel Intake & Enrollment
            </h3>
            <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Folder: <strong className="text-[#10b981]">{activeFolderName || 'School Batch (Unclassified)'}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <div className="p-4 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. Biometric Photo Section */}
        <div className="space-y-2">
          <label className="text-xs font-black uppercase font-mono tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
            <User className="w-3.5 h-3.5 text-[#10b981]" />
            <span>Biometric Portrait Photo</span>
          </label>
          <PhotoCapture
            value={photoDataUrl}
            onChange={setPhotoDataUrl}
            personName={`${firstName} ${lastName}`}
          />
        </div>

        {/* 2. QR Code / Barcode Section */}
        <div
          className="p-4 rounded-2xl border space-y-3 transition-colors"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center justify-between">
            <label className="text-xs font-black uppercase font-mono tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
              <Hash className="w-3.5 h-3.5 text-pink-500" />
              <span>QR Code / Barcode Asset</span>
            </label>
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
              Optional (Can attach in folder later)
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* QR Preview Box */}
            <div
              className="w-14 h-14 rounded-xl border bg-white p-1 flex items-center justify-center flex-shrink-0 shadow-xs"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-full object-contain" />
              ) : (
                <span className="text-[9px] font-black text-slate-400 text-center uppercase">No QR</span>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex-1 flex flex-wrap gap-2">
              <label
                className="px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 hover:border-[#10b981]"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
              >
                <Upload className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                <span>Upload QR Image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => setQrCodeDataUrl(reader.result as string);
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>

              <button
                type="button"
                onClick={async () => {
                  const { generateQrDataUrl } = await import('../../engine/barcodeQr');
                  const qr = await generateQrDataUrl(idNumber || 'STU-001', 160);
                  setQrCodeDataUrl(qr);
                }}
                className="px-3.5 py-2 rounded-xl border text-xs font-bold text-[#10b981] transition-all cursor-pointer hover:border-[#10b981]"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              >
                Auto-Generate from ID
              </button>

              {qrCodeDataUrl && (
                <button
                  type="button"
                  onClick={() => setQrCodeDataUrl('')}
                  className="px-2.5 py-2 rounded-xl text-xs text-rose-500 hover:bg-rose-500/10 cursor-pointer font-bold"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. Personal & Academic Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* First Name */}
          <div className="space-y-1.5">
            <label htmlFor="reg-first-name" className="text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>
              First Name *
            </label>
            <input
              id="reg-first-name"
              name="firstName"
              type="text"
              required
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="e.g. Amer / Solomon"
              className="w-full py-2.5 px-3.5 rounded-xl border text-sm font-bold focus:outline-none focus:border-[#10b981] transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Last Name */}
          <div className="space-y-1.5">
            <label htmlFor="reg-last-name" className="text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>
              Last Name / Grandfather *
            </label>
            <input
              id="reg-last-name"
              name="lastName"
              type="text"
              required
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="e.g. Aiguse / Desta"
              className="w-full py-2.5 px-3.5 rounded-xl border text-sm font-bold focus:outline-none focus:border-[#10b981] transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>
              Gender
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGender('Male')}
                className={`py-2.5 rounded-xl border font-black text-xs cursor-pointer transition-all ${
                  gender === 'Male'
                    ? 'bg-[#10b981] text-slate-950 border-[#10b981] shadow-xs'
                    : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: gender === 'Male' ? undefined : 'var(--bg-elevated)',
                  borderColor: gender === 'Male' ? undefined : 'var(--border-primary)',
                  color: gender === 'Male' ? undefined : 'var(--text-secondary)',
                }}
              >
                Male
              </button>
              <button
                type="button"
                onClick={() => setGender('Female')}
                className={`py-2.5 rounded-xl border font-black text-xs cursor-pointer transition-all ${
                  gender === 'Female'
                    ? 'bg-[#10b981] text-slate-950 border-[#10b981] shadow-xs'
                    : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: gender === 'Female' ? undefined : 'var(--bg-elevated)',
                  borderColor: gender === 'Female' ? undefined : 'var(--border-primary)',
                  color: gender === 'Female' ? undefined : 'var(--text-secondary)',
                }}
              >
                Female
              </button>
            </div>
          </div>

          {/* School Name */}
          <div className="space-y-1.5">
            <label htmlFor="reg-school-name" className="text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>
              Institution / School Name
            </label>
            <input
              id="reg-school-name"
              name="schoolName"
              type="text"
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              placeholder="e.g. Maskelegna School"
              className="w-full py-2.5 px-3.5 rounded-xl border text-sm font-bold focus:outline-none focus:border-[#10b981] transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Grade / Class */}
          <div className="space-y-1.5">
            <label htmlFor="reg-grade-select" className="text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>
              Grade / Class
            </label>
            <select
              id="reg-grade-select"
              name="grade"
              value={grade}
              onChange={e => setGrade(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-xl border text-sm font-bold focus:outline-none focus:border-[#10b981] cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            >
              <option value="Grade 9">Grade 9</option>
              <option value="Grade 10">Grade 10</option>
              <option value="Grade 11">Grade 11</option>
              <option value="Grade 12">Grade 12</option>
              <option value="Staff / Faculty">Staff / Faculty</option>
            </select>
          </div>

          {/* Section / Room */}
          <div className="space-y-1.5">
            <label htmlFor="reg-section-select" className="text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>
              Section / Room
            </label>
            <select
              id="reg-section-select"
              name="section"
              value={section}
              onChange={e => setSection(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-xl border text-sm font-bold focus:outline-none focus:border-[#10b981] cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            >
              <option value="Section A">Section A</option>
              <option value="Section B">Section B</option>
              <option value="Section C">Section C</option>
              <option value="Section D">Section D</option>
            </select>
          </div>

          {/* ID / Badge Number */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="reg-id-number" className="text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>
                ID / Badge Number *
              </label>
              <button
                type="button"
                onClick={handleGenerateId}
                className="text-[11px] font-bold text-[#10b981] hover:opacity-80 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Auto-Generate</span>
              </button>
            </div>
            <input
              id="reg-id-number"
              name="idNumber"
              type="text"
              required
              value={idNumber}
              onChange={e => setIdNumber(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-xl border text-sm font-mono font-black focus:outline-none focus:border-[#10b981] transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Contact Phone */}
          <div className="space-y-1.5">
            <label htmlFor="reg-phone" className="text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>
              Contact Phone
            </label>
            <input
              id="reg-phone"
              name="phone"
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+251 9..."
              className="w-full py-2.5 px-3.5 rounded-xl border text-sm font-bold focus:outline-none focus:border-[#10b981] transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Date of Birth / Admission */}
          <div className="space-y-1.5">
            <label htmlFor="reg-dob" className="text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>
              Date of Birth / Admission
            </label>
            <input
              id="reg-dob"
              name="dob"
              type="text"
              value={dob}
              onChange={e => setDob(e.target.value)}
              placeholder="e.g. 03.12.2009"
              className="w-full py-2.5 px-3.5 rounded-xl border text-sm font-bold focus:outline-none focus:border-[#10b981] transition-colors"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Blood Group */}
          <div className="space-y-1.5">
            <label htmlFor="reg-blood-group" className="text-xs font-bold block" style={{ color: 'var(--text-primary)' }}>
              Blood Group
            </label>
            <select
              id="reg-blood-group"
              name="bloodGroup"
              value={bloodGroup}
              onChange={e => setBloodGroup(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-xl border text-sm font-bold focus:outline-none focus:border-[#10b981] cursor-pointer"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
            >
              <option value="O+ (Universal Donor)">O+ (Universal Donor)</option>
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

        {/* Submit Actions */}
        <div className="pt-2 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              setFirstName('');
              setLastName('');
              setPhotoDataUrl('');
              setQrCodeDataUrl('');
              handleGenerateId();
            }}
            className="py-3 px-5 rounded-2xl border font-bold text-xs hover:opacity-80 cursor-pointer transition-all"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
          >
            Clear Form
          </button>

          <button
            type="submit"
            disabled={saving}
            className="py-3 px-8 rounded-2xl bg-[#10b981] hover:bg-[#9fe870] text-slate-950 font-black text-sm shadow-lg shadow-emerald-950/20 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {saving ? (
              <span>Saving Record...</span>
            ) : success ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-slate-950" />
                <span>Enrolled Successfully!</span>
              </>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>Save Personnel Record</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
