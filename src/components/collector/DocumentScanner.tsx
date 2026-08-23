import { useState, useRef } from 'react';
import {
  parseDocumentImage,
  type ScannedDocumentResult,
} from '../../engine/documentScanner';
import { addPerson, useBatchFolders } from '../../db/hooks';
import Modal from '../shared/Modal';

interface DocumentScannerProps {
  onScanSuccess?: () => void;
  activeFolderId?: number;
  activeFolderName?: string;
}

export default function DocumentScanner({ onScanSuccess, activeFolderId, activeFolderName }: DocumentScannerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanResult, setScanResult] = useState<ScannedDocumentResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Editable confirmation state
  const [editName, setEditName] = useState('');
  const [editId, setEditId] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editBloodGroup, setEditBloodGroup] = useState('');
  const [editPhoto, setEditPhoto] = useState('');

  // Handle uploaded file or camera snapshot
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setSelectedImage(url);
      runScan(url);
    };
    reader.readAsDataURL(file);
  };

  // Handle drag & drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setSelectedImage(url);
      runScan(url);
    };
    reader.readAsDataURL(file);
  };

  // Run AI OCR & Entity Extraction
  const runScan = async (imageUrl: string) => {
    setIsScanning(true);
    setScanProgress(20);
    setSavedSuccess(false);

    const progTimer = setInterval(() => {
      setScanProgress(p => (p < 90 ? p + 15 : p));
    }, 350);

    try {
      const result = await parseDocumentImage(imageUrl);
      clearInterval(progTimer);
      setScanProgress(100);

      setScanResult(result);
      setEditName(result.fullName);
      setEditId(result.idNumber);
      setEditDept(result.department);
      setEditRole(result.role);
      setEditPhone(result.phone);
      setEditEmail(result.email);
      setEditBloodGroup(result.bloodGroup || 'O+');
      setEditPhoto(result.photoDataUrl);

      setTimeout(() => {
        setIsScanning(false);
        setShowConfirmModal(true);
      }, 400);
    } catch {
      clearInterval(progTimer);
      setIsScanning(false);
    }
  };

  // Replace extracted photo with manual upload
  const handleReplacePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditPhoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Confirm and save to IndexedDB
  const handleConfirmSave = async () => {
    try {
      await addPerson({
        fullName: editName.trim() || 'Unknown',
        idNumber: editId.trim() || `SL-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        category: 'Employees',
        department: editDept.trim() || '',
        role: editRole.trim() || '',
        phone: editPhone.trim() || '',
        email: editEmail.trim() || '',
        bloodGroup: editBloodGroup || 'O+',
        joinedDate: new Date().toISOString().split('T')[0],
        photoDataUrl: editPhoto,
        status: 'Active',
        fulfillmentStatus: 'Unfulfilled',
        batchFolderId: activeFolderId,
        folderName: activeFolderName || 'Unclassified',
        sourceFileName: 'Paper Document OCR',
        createdAt: new Date(),
      });

      setShowConfirmModal(false);
      setSavedSuccess(true);
      setSelectedImage(null);
      onScanSuccess?.();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-4 font-sans text-xs" style={{ color: 'var(--text-primary)' }}>
      {/* Top Banner */}
      <div
        className="p-4 rounded-xl border flex items-center justify-between shadow-2xs"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#84a92c]/10 text-[#84a92c] flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Paper & Document OCR Scanner</h3>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Upload or photograph a registration form. The engine extracts fields, crops the photo, and saves after your confirmation.
            </p>
          </div>
        </div>

        {activeFolderName && (
          <span className="text-[10px] font-mono font-bold bg-[#84a92c]/10 text-[#84a92c] px-2.5 py-1 rounded-lg border border-[#84a92c]/20 flex-shrink-0">
            {activeFolderName}
          </span>
        )}
      </div>

      {/* Upload & Camera Trigger Area — Full Width */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        className="p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center space-y-3 flex flex-col items-center justify-center min-h-[220px] hover:border-[#84a92c] group"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />

        {selectedImage && !isScanning ? (
          <div className="w-full max-w-md">
            <img src={selectedImage} alt="Uploaded document" className="w-full h-auto max-h-64 object-contain rounded-xl border border-slate-300" />
            <p className="text-[11px] mt-2 font-semibold" style={{ color: 'var(--text-muted)' }}>
              Click again to upload a different document
            </p>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-[#84a92c]/10 text-[#84a92c] flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Capture or Upload Paper Document</p>
              <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                Click to take a photo with your camera, or drag & drop an image file here.
              </p>
              <p className="text-[10px] mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
                Supports: Registration forms, ID cards, application papers, student registry pages
              </p>
            </div>
          </>
        )}
      </div>

      {/* Live Scanning Progress */}
      {isScanning && (
        <div
          className="p-4 rounded-2xl border space-y-3 animate-fade-in"
          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: '#84a92c' }}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold flex items-center gap-2 text-[#84a92c]">
              <span className="w-3.5 h-3.5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
              Running OCR analysis and entity extraction…
            </span>
            <span className="font-mono font-bold text-[#84a92c]">{scanProgress}%</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Success Notification */}
      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-bold">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>Personnel record verified & saved to {activeFolderName || 'database'}!</span>
          </div>
          <span className="text-[11px] underline cursor-pointer" onClick={() => onScanSuccess?.()}>
            View in Directory →
          </span>
        </div>
      )}

      {/* DATA CONFIRMATION MODAL */}
      {showConfirmModal && (
        <Modal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Verify Extracted Data — Confirm Before Saving"
          size="lg"
        >
          <div className="space-y-4 text-xs font-sans" style={{ color: 'var(--text-primary)' }}>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-600 dark:text-emerald-400 flex items-center gap-2 font-bold">
              <span>✓</span>
              <span>OCR Complete ({scanResult?.confidence || 0}% Confidence) — Verify or correct values below before saving.</span>
            </div>

            {/* Warning if low confidence / empty fields */}
            {(!editName || scanResult?.confidence === 0) && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600 dark:text-amber-400 flex items-center gap-2 text-xs font-bold">
                <span>⚠</span>
                <span>Low OCR confidence — some fields may be empty. Please fill them manually.</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Source Document & Extracted Photo */}
              <div className="md:col-span-5 space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block font-mono mb-1" style={{ color: 'var(--text-muted)' }}>
                    Scanned Source Document
                  </label>
                  <div
                    className="w-full aspect-[3/4] rounded-xl border overflow-hidden flex items-center justify-center"
                    style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                  >
                    {selectedImage ? (
                      <img src={selectedImage} alt="Scanned Document" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No Document</span>
                    )}
                  </div>
                </div>

                {/* Extracted Photo Preview */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider block font-mono mb-1" style={{ color: 'var(--text-muted)' }}>
                    Extracted / Portrait Photo
                  </label>
                  <div className="relative w-28 h-32 rounded-xl border overflow-hidden group"
                    style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                  >
                    {editPhoto ? (
                      <img src={editPhoto} alt="Portrait" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px]" style={{ color: 'var(--text-muted)' }}>No Photo</div>
                    )}
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold cursor-pointer transition-opacity">
                      Replace
                      <input type="file" accept="image/*" onChange={handleReplacePhoto} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="md:col-span-7 space-y-3">
                <div>
                  <label className="font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Full Name *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder="Enter full name..."
                    className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c]"
                    style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>ID Number</label>
                    <input
                      type="text"
                      value={editId}
                      onChange={e => setEditId(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border font-mono font-bold text-[#84a92c] focus:outline-none focus:border-[#84a92c]"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Department</label>
                    <input
                      type="text"
                      value={editDept}
                      onChange={e => setEditDept(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c]"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Role / Title</label>
                    <input
                      type="text"
                      value={editRole}
                      onChange={e => setEditRole(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c]"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Blood Group</label>
                    <select
                      value={editBloodGroup}
                      onChange={e => setEditBloodGroup(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border font-bold focus:outline-none focus:border-[#84a92c] cursor-pointer"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                    >
                      {['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Phone Number</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border font-mono focus:outline-none focus:border-[#84a92c]"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1" style={{ color: 'var(--text-secondary)' }}>Email</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#84a92c]"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                {/* Destination folder info */}
                <div className="p-2.5 rounded-xl border flex items-center gap-2" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>Saving to folder:</span>
                  <span className="text-[10px] font-mono font-bold text-[#84a92c]">{activeFolderName || 'Unclassified'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={!editName.trim()}
                className="btn-primary px-6 py-2 text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <span>Confirm & Save to Database</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
