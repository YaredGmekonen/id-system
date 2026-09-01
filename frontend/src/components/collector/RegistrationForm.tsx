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
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [category, setCategory] = useState<Person['category']>('Students');
  const [role, setRole] = useState('Student');
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const computedFullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (!computedFullName) {
      setErrorMessage('WHAT: Personnel name is empty.\nWHY: Every credential record requires a first and last name.\nNEXT: Fill in First Name and Last Name fields.');
      return;
    }

    const trimmedId = idNumber.trim() || `SL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    setSaving(true);
    try {
      // Check for duplicate ID in database
      const existingPerson = await db.people.where('idNumber').equals(trimmedId).first();
      if (existingPerson) {
        setErrorMessage(`WHAT: ID Number "${trimmedId}" is already assigned to "${existingPerson.fullName}".\nWHY: ID numbers must be unique across the credential system.\nNEXT: Enter a different ID number or click the refresh button next to the ID field to generate a new unique ID.`);
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
    } catch (err) {
      console.error('Registration failed:', err);
      setErrorMessage(`WHAT: Failed to save record.\nWHY: ${err instanceof Error ? err.message : 'Database error'}\nNEXT: Check your browser storage and try again.`);
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

  return (
    <div className="space-y-5">
      {/* Top Banner with Active Folder Info */}
      <div
        className="p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#84a92c]/15 text-[#84a92c] flex items-center justify-center flex-shrink-0">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>
              Personnel Intake & Enrollment
            </h3>
            <p className="text-xs font-mono text-slate-400 mt-0.5">
              Folder: <strong className="text-[#84a92c]">{activeFolderName || 'School Batch (Unclassified)'}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {errorMessage && (
          <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer p-0.5 rounded"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 1. Biometric Photo Section */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase font-mono tracking-wider text-slate-300 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#84a92c]" />
            <span>Biometric Portrait Photo</span>
          </label>
          <PhotoCapture
            value={photoDataUrl}
            onChange={setPhotoDataUrl}
            personName={`${firstName} ${lastName}`}
          />
        </div>

        {/* 1B. QR Code / Barcode Section (Optional / Upload or Auto-Generate) */}
        <div className="p-3.5 rounded-xl border border-slate-700/80 bg-[#18191b] space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase font-mono tracking-wider text-slate-300 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-pink-400" />
              <span>QR Code / Barcode Asset</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">Optional (Can attach in folder later)</span>
          </div>

          <div className="flex items-center gap-3">
            {/* QR Preview Box */}
            <div className="w-14 h-14 rounded-lg border border-slate-700 bg-white p-1 flex items-center justify-center flex-shrink-0">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-full object-contain" />
              ) : (
                <span className="text-[9px] font-bold text-slate-400 text-center uppercase">No QR</span>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex-1 flex flex-wrap gap-2">
              <label className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-pink-400 bg-slate-900 text-xs font-bold text-slate-200 hover:text-white cursor-pointer transition-colors flex items-center gap-1.5">
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
                className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-[#84a92c] bg-slate-900 text-xs font-bold text-[#84a92c] transition-colors cursor-pointer"
              >
                Auto-Generate from ID
              </button>

              {qrCodeDataUrl && (
                <button
                  type="button"
                  onClick={() => setQrCodeDataUrl('')}
                  className="px-2 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2. Personal & Academic Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* First Name */}
          <div className="space-y-1.5">
            <label htmlFor="reg-first-name" className="text-xs font-bold text-slate-300 block">
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
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-700 bg-[#18191b] text-sm text-white focus:outline-none focus:border-[#84a92c] transition-colors placeholder:text-slate-500"
            />
          </div>

          {/* Last Name */}
          <div className="space-y-1.5">
            <label htmlFor="reg-last-name" className="text-xs font-bold text-slate-300 block">
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
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-700 bg-[#18191b] text-sm text-white focus:outline-none focus:border-[#84a92c] transition-colors placeholder:text-slate-500"
            />
          </div>

          {/* Gender */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-300 block">
              Gender
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGender('Male')}
                className={`py-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                  gender === 'Male' ? 'bg-[#84a92c] text-slate-950 border-[#84a92c]' : 'bg-[#18191b] text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                Male
              </button>
              <button
                type="button"
                onClick={() => setGender('Female')}
                className={`py-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-colors ${
                  gender === 'Female' ? 'bg-[#84a92c] text-slate-950 border-[#84a92c]' : 'bg-[#18191b] text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                Female
              </button>
            </div>
          </div>

          {/* School Name */}
          <div className="space-y-1.5">
            <label htmlFor="reg-school-name" className="text-xs font-bold text-slate-300 block">
              Institution / School Name
            </label>
            <input
              id="reg-school-name"
              name="schoolName"
              type="text"
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              placeholder="e.g. Maskelegna School"
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-700 bg-[#18191b] text-sm text-white focus:outline-none focus:border-[#84a92c] transition-colors placeholder:text-slate-500"
            />
          </div>

          {/* Grade / Class */}
          <div className="space-y-1.5">
            <label htmlFor="reg-grade-select" className="text-xs font-bold text-slate-300 block">
              Grade / Class
            </label>
            <select
              id="reg-grade-select"
              name="grade"
              value={grade}
              onChange={e => setGrade(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-700 bg-[#18191b] text-sm text-white focus:outline-none focus:border-[#84a92c] transition-colors cursor-pointer"
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
          <div className="space-y-1.5">
            <label htmlFor="reg-section" className="text-xs font-bold text-slate-300 block">
              Section / Room
            </label>
            <input
              id="reg-section"
              name="section"
              type="text"
              value={section}
              onChange={e => setSection(e.target.value)}
              placeholder="e.g. Section A"
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-700 bg-[#18191b] text-sm text-white focus:outline-none focus:border-[#84a92c] transition-colors placeholder:text-slate-500"
            />
          </div>

          {/* Student ID / Roll Number */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="reg-id-number" className="text-xs font-bold text-slate-300 block">
                ID / Badge Number
              </label>
              <button
                type="button"
                onClick={() => setIdNumber(`SL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`)}
                className="text-xs text-[#84a92c] font-bold hover:underline cursor-pointer"
              >
                Auto-Generate
              </button>
            </div>
            <input
              id="reg-id-number"
              name="idNumber"
              type="text"
              value={idNumber}
              onChange={e => setIdNumber(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-700 bg-[#18191b] text-sm text-white font-mono font-bold focus:outline-none focus:border-[#84a92c] transition-colors"
            />
          </div>

          {/* Contact / Phone */}
          <div className="space-y-1.5">
            <label htmlFor="reg-phone" className="text-xs font-bold text-slate-300 block">
              Contact Phone
            </label>
            <input
              id="reg-phone"
              name="phone"
              type="text"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. +251 9..."
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-700 bg-[#18191b] text-sm text-white font-mono focus:outline-none focus:border-[#84a92c] transition-colors placeholder:text-slate-500"
            />
          </div>

          {/* Date of Birth / Admission */}
          <div className="space-y-1.5">
            <label htmlFor="reg-dob" className="text-xs font-bold text-slate-300 block">
              Date of Birth / Admission
            </label>
            <input
              id="reg-dob"
              name="dob"
              type="text"
              value={dob}
              onChange={e => setDob(e.target.value)}
              placeholder="e.g. 03.12.2009"
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-700 bg-[#18191b] text-sm text-white font-mono focus:outline-none focus:border-[#84a92c] transition-colors placeholder:text-slate-500"
            />
          </div>

          {/* Blood Group */}
          <div className="space-y-1.5">
            <label htmlFor="reg-blood-group" className="text-xs font-bold text-slate-300 block">
              Blood Group
            </label>
            <select
              id="reg-blood-group"
              name="bloodGroup"
              value={bloodGroup}
              onChange={e => setBloodGroup(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-700 bg-[#18191b] text-sm text-white focus:outline-none focus:border-[#84a92c] transition-colors cursor-pointer"
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
        <div className="pt-3">
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 px-6 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all bg-[#84a92c] hover:bg-[#9fe870] text-slate-950 active:scale-98"
          >
            {success ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-slate-950" />
                <span>Enrolled Successfully!</span>
              </>
            ) : saving ? (
              <span>Saving Record…</span>
            ) : (
              <>
                <Plus className="w-5 h-5" />
                <span>Save Personnel Record to Folder</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
