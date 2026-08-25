import { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Modal from '../components/shared/Modal';
import { useAuth } from '../context/AuthContext';
import { usePeople, useTemplates } from '../db/hooks';
import { db } from '../db/database';
import { seedDatabase } from '../db/seed';
import {
  AlertTriangle,
  CheckCircle2,
  Building2,
  Printer,
  Camera,
  PenTool,
  Database,
  UserCheck,
} from 'lucide-react';

export default function SystemSettings() {
  const { currentUser, currentRole, logout } = useAuth();
  const dbPeople = usePeople();
  const dbTemplates = useTemplates();
  const role = currentRole || 'admin';

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Active Settings Tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (role === 'collector') return 'collector-config';
    if (role === 'designer') return 'designer-config';
    return 'organization';
  });

  // Organization Settings
  const [orgName, setOrgName] = useState(() => localStorage.getItem('sl_org_name') || 'SiliconLabs Tech PLC');
  const [licenseCode, setLicenseCode] = useState(() => localStorage.getItem('sl_license') || 'ETH-SEC-2026-9921');
  const [hqAddress, setHqAddress] = useState(() => localStorage.getItem('sl_hq_address') || 'Ayat Commercial Zone, Addis Ababa, Ethiopia');
  const [contactPhone, setContactPhone] = useState(() => localStorage.getItem('sl_contact_phone') || '+251 906 634 621');
  const [securityEmail, setSecurityEmail] = useState(() => localStorage.getItem('sl_security_email') || 'security@siliconlabs.internal');

  // Print & Imposition Defaults
  const [defaultPaperSize, setDefaultPaperSize] = useState(() => localStorage.getItem('sl_paper_size') || 'a4');
  const [printDpi, setPrintDpi] = useState(() => localStorage.getItem('sl_print_dpi') || '300');
  const [bleedMarginMm, setBleedMarginMm] = useState(() => localStorage.getItem('sl_bleed_mm') || '2.0');
  const [enableCropMarks, setEnableCropMarks] = useState(() => localStorage.getItem('sl_crop_marks') !== 'false');
  const [enableFoldLine, setEnableFoldLine] = useState(() => localStorage.getItem('sl_fold_line') !== 'false');

  // Collector-Specific Preferences
  const [defaultCategory, setDefaultCategory] = useState(() => localStorage.getItem('sl_default_category') || 'Students');
  const [autoOcrEnhance, setAutoOcrEnhance] = useState(() => localStorage.getItem('sl_auto_ocr') !== 'false');
  const [cameraFacing, setCameraFacing] = useState(() => localStorage.getItem('sl_camera_facing') || 'user');

  // Designer-Specific Preferences
  const [defaultFontFamily, setDefaultFontFamily] = useState(() => localStorage.getItem('sl_default_font') || 'Inter');
  const [enableGridSnap, setEnableGridSnap] = useState(() => localStorage.getItem('sl_grid_snap') !== 'false');

  // Status message
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Save changes
  const handleSaveOrganization = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('sl_org_name', orgName);
    localStorage.setItem('sl_license', licenseCode);
    localStorage.setItem('sl_hq_address', hqAddress);
    localStorage.setItem('sl_contact_phone', contactPhone);
    localStorage.setItem('sl_security_email', securityEmail);

    setSaveSuccessMsg('Organization branding and credential authority updated.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleSavePrintConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('sl_paper_size', defaultPaperSize);
    localStorage.setItem('sl_print_dpi', printDpi);
    localStorage.setItem('sl_bleed_mm', bleedMarginMm);
    localStorage.setItem('sl_crop_marks', String(enableCropMarks));
    localStorage.setItem('sl_fold_line', String(enableFoldLine));

    setSaveSuccessMsg('Print imposition and DPI configuration saved.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleSaveCollectorConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('sl_default_category', defaultCategory);
    localStorage.setItem('sl_auto_ocr', String(autoOcrEnhance));
    localStorage.setItem('sl_camera_facing', cameraFacing);

    setSaveSuccessMsg('Intake camera and OCR settings saved.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleSaveDesignerConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('sl_default_font', defaultFontFamily);
    localStorage.setItem('sl_grid_snap', String(enableGridSnap));

    setSaveSuccessMsg('Canvas Vector Studio design defaults saved.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Export Full Enclave Database JSON Backup
  const handleExportBackup = async () => {
    try {
      const allPeople = await db.people.toArray();
      const allTemplates = await db.templates.toArray();
      const backupData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        organization: orgName,
        totalRecords: allPeople.length,
        people: allPeople,
        templates: allTemplates,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SiliconLabs_Enclave_Backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
      setSaveSuccessMsg('Database backup exported successfully!');
    } catch (err) {
      console.error('Backup error:', err);
      setSaveSuccessMsg('Failed to export database backup.');
    }
  };

  // Restore Database from JSON
  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (Array.isArray(parsed.people)) {
          setConfirmModal({
            isOpen: true,
            title: 'Restore Database Backup',
            message: `Restoring this backup will replace current database with ${parsed.people.length} personnel records and ${parsed.templates?.length || 0} templates. Proceed?`,
            confirmText: 'Restore Backup',
            onConfirm: async () => {
              await db.people.clear();
              await db.people.bulkAdd(parsed.people);
              if (Array.isArray(parsed.templates)) {
                await db.templates.clear();
                await db.templates.bulkAdd(parsed.templates);
              }
              window.location.reload();
            },
          });
        } else {
          setSaveSuccessMsg('Invalid backup JSON format.');
        }
      } catch {
        setSaveSuccessMsg('Could not parse backup file.');
      }
    };
    reader.readAsText(file);
  };

  // Reset Database
  const handleResetDatabase = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Reset Local Database',
      message: 'WARNING: Are you sure you want to reset all database records back to the default seed? All newly imported personnel records will be replaced with standard test records.',
      confirmText: 'Yes, Reset Database',
      onConfirm: async () => {
        setIsResetting(true);
        try {
          await seedDatabase();
          setSaveSuccessMsg('Database reset to standard seed state.');
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch {
          setSaveSuccessMsg('Failed to reset database.');
        } finally {
          setIsResetting(false);
        }
      },
    });
  };

  return (
    <div
      className="flex h-screen font-sans antialiased overflow-hidden transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-root)', color: 'var(--text-primary)' }}
    >
      <Sidebar />

      <main id="main-content" className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Header */}
        <header
          className="h-14 sm:h-16 pl-14 pr-4 sm:px-8 border-b flex items-center justify-between z-20 flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase font-bold text-[#84a92c] truncate">
                SILICONLABS TECH PLC / {role.toUpperCase()} PREFERENCES
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight truncate" style={{ color: 'var(--text-primary)' }}>
              System & Workspace Settings
            </h1>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-300 flex-shrink-0">
            <span>PWA Enabled • Offline-First</span>
          </div>
        </header>

        {/* Content Body */}
        <div className="px-4 sm:px-8 py-4 sm:py-6 max-w-5xl space-y-6">
          
          {/* Sub-Tabs Tailored to Role */}
          <div className="flex items-center gap-1.5 sm:gap-2 border-b pb-2 overflow-x-auto" style={{ borderColor: 'var(--border-primary)' }}>
            {(role === 'admin' || role === 'guest') && (
              <button
                onClick={() => setActiveTab('organization')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'organization' ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: activeTab === 'organization' ? '#198754' : 'var(--bg-elevated)',
                  color: activeTab === 'organization' ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Organization & Authority</span>
                <span className="sm:hidden">Authority</span>
              </button>
            )}

            {(role === 'admin' || role === 'designer') && (
              <button
                onClick={() => setActiveTab('printer')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'printer' ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: activeTab === 'printer' ? '#198754' : 'var(--bg-elevated)',
                  color: activeTab === 'printer' ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Printer & Imposition Config</span>
                <span className="sm:hidden">Printer</span>
              </button>
            )}

            {role === 'collector' && (
              <button
                onClick={() => setActiveTab('collector-config')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'collector-config' ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: activeTab === 'collector-config' ? '#198754' : 'var(--bg-elevated)',
                  color: activeTab === 'collector-config' ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Intake & Camera Defaults</span>
                <span className="sm:hidden">Intake</span>
              </button>
            )}

            {role === 'designer' && (
              <button
                onClick={() => setActiveTab('designer-config')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'designer-config' ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: activeTab === 'designer-config' ? '#198754' : 'var(--bg-elevated)',
                  color: activeTab === 'designer-config' ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vector Studio Preferences</span>
                <span className="sm:hidden">Designer</span>
              </button>
            )}

            {role === 'admin' && (
              <button
                onClick={() => setActiveTab('database')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'database' ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: activeTab === 'database' ? '#198754' : 'var(--bg-elevated)',
                  color: activeTab === 'database' ? '#ffffff' : 'var(--text-secondary)',
                }}
              >
                <Database className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Database Enclave & Backups</span>
                <span className="sm:hidden">Database</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('profile')}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                activeTab === 'profile' ? 'bg-[#198754] text-white shadow-xs' : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: activeTab === 'profile' ? '#198754' : 'var(--bg-elevated)',
                color: activeTab === 'profile' ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">User Profile & Session</span>
              <span className="sm:hidden">Profile</span>
            </button>
          </div>

          {/* Success Banner */}
          {saveSuccessMsg && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* TAB 1: ORGANIZATION */}
          {activeTab === 'organization' && (
            <form onSubmit={handleSaveOrganization} className="space-y-4">
              <div
                className="p-6 rounded-2xl border space-y-4 shadow-xs"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              >
                <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Credential Issuance Authority
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="org-name-input" className="text-xs font-semibold block mb-1 text-slate-300">
                      Organization Name
                    </label>
                    <input
                      id="org-name-input"
                      name="orgName"
                      type="text"
                      value={orgName}
                      onChange={e => setOrgName(e.target.value)}
                      className="w-full text-xs py-2 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c]"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-primary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  <div>
                    <label htmlFor="license-code-input" className="text-xs font-semibold block mb-1 text-slate-300">
                      Licensing / Enclave Code
                    </label>
                    <input
                      id="license-code-input"
                      name="licenseCode"
                      type="text"
                      value={licenseCode}
                      onChange={e => setLicenseCode(e.target.value)}
                      className="w-full text-xs py-2 px-3 rounded-xl border font-mono focus:outline-none focus:border-[#84a92c]"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-primary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="hq-address-input" className="text-xs font-semibold block mb-1 text-slate-300">
                    Headquarters / Official Address
                  </label>
                  <input
                    id="hq-address-input"
                    name="hqAddress"
                    type="text"
                    value={hqAddress}
                    onChange={e => setHqAddress(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c]"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-primary)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-phone-input" className="text-xs font-semibold block mb-1 text-slate-300">
                      Security Hotline Phone
                    </label>
                    <input
                      id="contact-phone-input"
                      name="contactPhone"
                      type="text"
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                      className="w-full text-xs py-2 px-3 rounded-xl border font-mono focus:outline-none focus:border-[#84a92c]"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-primary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>

                  <div>
                    <label htmlFor="security-email-input" className="text-xs font-semibold block mb-1 text-slate-300">
                      Security Operations Email
                    </label>
                    <input
                      id="security-email-input"
                      name="securityEmail"
                      type="email"
                      value={securityEmail}
                      onChange={e => setSecurityEmail(e.target.value)}
                      className="w-full text-xs py-2 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c]"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-primary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <button type="submit" className="btn-primary py-2.5 px-6 font-bold text-xs cursor-pointer">
                    Save Authority Information
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 2: PRINTER & IMPOSITION */}
          {activeTab === 'printer' && (
            <form onSubmit={handleSavePrintConfig} className="space-y-4">
              <div
                className="p-6 rounded-2xl border space-y-4 shadow-xs"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              >
                <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Default Print Sheet & Imposition Parameters
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="default-paper-size-select" className="text-xs font-semibold block mb-1 text-slate-300">
                      Default Paper Format
                    </label>
                    <select
                      id="default-paper-size-select"
                      name="defaultPaperSize"
                      value={defaultPaperSize}
                      onChange={e => setDefaultPaperSize(e.target.value)}
                      className="w-full text-xs py-2 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c] cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-primary)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="a4">A4 Standard (210 × 297 mm)</option>
                      <option value="a3">A3 Production (297 × 420 mm)</option>
                      <option value="letter">US Letter (8.5" × 11")</option>
                      <option value="legal">US Legal (8.5" × 14")</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="print-dpi-select" className="text-xs font-semibold block mb-1 text-slate-300">
                      Vector Output DPI
                    </label>
                    <select
                      id="print-dpi-select"
                      name="printDpi"
                      value={printDpi}
                      onChange={e => setPrintDpi(e.target.value)}
                      className="w-full text-xs py-2 px-3 rounded-xl border font-mono focus:outline-none focus:border-[#84a92c] cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-primary)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <option value="300">300 DPI (High-Resolution Print)</option>
                      <option value="600">600 DPI (Ultra-Sharp Microprint)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="bleed-margin-input" className="text-xs font-semibold block mb-1 text-slate-300">
                      Bleed Safe Margin (mm)
                    </label>
                    <input
                      id="bleed-margin-input"
                      name="bleedMargin"
                      type="number"
                      step="0.5"
                      value={bleedMarginMm}
                      onChange={e => setBleedMarginMm(e.target.value)}
                      className="w-full text-xs py-2 px-3 rounded-xl border font-mono focus:outline-none focus:border-[#84a92c]"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        borderColor: 'var(--border-primary)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label htmlFor="crop-marks-toggle" className="flex items-center gap-2 cursor-pointer font-medium text-slate-200">
                    <input
                      id="crop-marks-toggle"
                      name="enableCropMarks"
                      type="checkbox"
                      checked={enableCropMarks}
                      onChange={e => setEnableCropMarks(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#84a92c]"
                    />
                    <span>Automatically draw corner crop marks and cut crosshairs on PDF sheets</span>
                  </label>

                  <label htmlFor="fold-line-toggle" className="flex items-center gap-2 cursor-pointer font-medium text-slate-200">
                    <input
                      id="fold-line-toggle"
                      name="enableFoldLine"
                      type="checkbox"
                      checked={enableFoldLine}
                      onChange={e => setEnableFoldLine(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#84a92c]"
                    />
                    <span>Draw center fold & cut guideline on 8-Up Duplex sheets</span>
                  </label>
                </div>

                <div className="pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <button type="submit" className="btn-primary py-2.5 px-6 font-bold text-xs cursor-pointer">
                    Save Imposition Defaults
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: COLLECTOR SPECIFIC */}
          {activeTab === 'collector-config' && (
            <form onSubmit={handleSaveCollectorConfig} className="space-y-4">
              <div
                className="p-6 rounded-2xl border space-y-4 shadow-xs"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              >
                <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Field Registrar & Intake Configurations
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="default-category-select" className="text-xs font-semibold block mb-1 text-slate-300">
                      Default Registration Category
                    </label>
                    <select
                      id="default-category-select"
                      name="defaultCategory"
                      value={defaultCategory}
                      onChange={e => setDefaultCategory(e.target.value)}
                      className="w-full text-xs py-2 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c] cursor-pointer"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                    >
                      <option value="Students">Students (Academic Pass)</option>
                      <option value="Employees">Corporate Employees</option>
                      <option value="Staff">Staff & Faculty</option>
                      <option value="Contractors">Contractors & Guests</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="camera-facing-select" className="text-xs font-semibold block mb-1 text-slate-300">
                      Webcam Camera Mode
                    </label>
                    <select
                      id="camera-facing-select"
                      name="cameraFacing"
                      value={cameraFacing}
                      onChange={e => setCameraFacing(e.target.value)}
                      className="w-full text-xs py-2 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c] cursor-pointer"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                    >
                      <option value="user">Front / Selfie Camera</option>
                      <option value="environment">Rear / Document Scanner Camera</option>
                    </select>
                  </div>
                </div>

                <label htmlFor="auto-ocr-toggle" className="flex items-center gap-2 cursor-pointer font-medium pt-2 text-slate-200">
                  <input
                    id="auto-ocr-toggle"
                    name="autoOcrEnhance"
                    type="checkbox"
                    checked={autoOcrEnhance}
                    onChange={e => setAutoOcrEnhance(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#84a92c]"
                  />
                  <span>Enable Real-time Optical Contrast Enhancement on Paper Scans</span>
                </label>

                <div className="pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <button type="submit" className="btn-primary py-2.5 px-6 font-bold text-xs cursor-pointer">
                    Save Intake Defaults
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 4: DESIGNER SPECIFIC */}
          {activeTab === 'designer-config' && (
            <form onSubmit={handleSaveDesignerConfig} className="space-y-4">
              <div
                className="p-6 rounded-2xl border space-y-4 shadow-xs"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              >
                <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Canvas Vector Studio Defaults
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="default-font-select" className="text-xs font-semibold block mb-1 text-slate-300">
                      Default Typography
                    </label>
                    <select
                      id="default-font-select"
                      name="defaultFont"
                      value={defaultFontFamily}
                      onChange={e => setDefaultFontFamily(e.target.value)}
                      className="w-full text-xs py-2 px-3 rounded-xl border focus:outline-none focus:border-[#84a92c] cursor-pointer"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                    >
                      <option value="Inter">Inter (Clean Modern)</option>
                      <option value="Outfit">Outfit (Geometric)</option>
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans (Corporate)</option>
                      <option value="JetBrains Mono">JetBrains Mono (Monospace)</option>
                    </select>
                  </div>
                </div>

                <label htmlFor="grid-snap-toggle" className="flex items-center gap-2 cursor-pointer font-medium pt-2 text-slate-200">
                  <input
                    id="grid-snap-toggle"
                    name="enableGridSnap"
                    type="checkbox"
                    checked={enableGridSnap}
                    onChange={e => setEnableGridSnap(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#84a92c]"
                  />
                  <span>Enable Magnetic Snap-to-Grid on Canvas Layers</span>
                </label>

                <div className="pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
                  <button type="submit" className="btn-primary py-2.5 px-6 font-bold text-xs cursor-pointer">
                    Save Vector Studio Defaults
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 5: DATABASE ENCLAVE */}
          {activeTab === 'database' && (
            <div className="space-y-4">
              <div
                className="p-6 rounded-2xl border space-y-4 shadow-xs"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              >
                <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Offline Enclave Storage Metrics
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                    <p className="text-[10px] uppercase font-mono text-slate-400 font-bold">Total Personnel</p>
                    <p className="text-2xl font-black mt-1" style={{ color: 'var(--text-primary)' }}>{dbPeople.length}</p>
                    <p className="text-[10px] text-emerald-400 font-mono mt-0.5">Stored Offline in Browser</p>
                  </div>

                  <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                    <p className="text-[10px] uppercase font-mono text-slate-400 font-bold">Custom Templates</p>
                    <p className="text-2xl font-black mt-1" style={{ color: 'var(--text-primary)' }}>{dbTemplates.length}</p>
                    <p className="text-[10px] text-blue-400 font-mono mt-0.5">Vector Canvas Designs</p>
                  </div>

                  <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                    <p className="text-[10px] uppercase font-mono text-slate-400 font-bold">Database Engine</p>
                    <p className="text-sm font-black mt-1 text-[#84a92c]">Dexie IndexedDB</p>
                    <p className="text-[10px] text-slate-300 font-mono mt-0.5">Client Encrypted</p>
                  </div>
                </div>

                {/* Backup & Restore Buttons */}
                <div className="pt-4 border-t space-y-3" style={{ borderColor: 'var(--border-primary)' }}>
                  <h3 className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                    Data Portability & Backup
                  </h3>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleExportBackup}
                      className="px-5 py-2.5 bg-[#198754] hover:bg-[#157347] text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      <span>Download Enclave Backup (.json)</span>
                    </button>

                    <label htmlFor="restore-file-input" className="px-5 py-2.5 border font-bold rounded-xl text-xs transition-all cursor-pointer flex items-center gap-2 text-slate-200"
                      style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
                    >
                      <svg className="w-4 h-4 text-[#84a92c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <span>Restore Backup File</span>
                      <input id="restore-file-input" name="restoreBackupFile" type="file" accept=".json" onChange={handleRestoreBackup} className="sr-only" aria-label="Upload JSON backup file to restore database" />
                    </label>
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--border-primary)' }}>
                  <h3 className="font-bold text-xs text-red-500">
                    Danger Zone
                  </h3>
                  <p className="text-xs text-slate-400">
                    Resetting will clear all data and restore the database to factory defaults.
                  </p>
                  <button
                    onClick={handleResetDatabase}
                    disabled={isResetting}
                    className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    {isResetting ? 'Resetting...' : 'Reset Database to Default Clean State'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: PROFILE */}
          {activeTab === 'profile' && (
            <div
              className="p-6 rounded-2xl border space-y-4 shadow-xs"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              <h2 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                Active Session & Identity
              </h2>

              <div className="flex items-center gap-4 p-4 rounded-xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                <div className="w-12 h-12 rounded-full bg-[#84a92c]/20 text-[#84a92c] font-black flex items-center justify-center text-base border border-[#84a92c]">
                  {currentUser?.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AK'}
                </div>
                <div>
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{currentUser?.name || 'Abenezer Kaleab'}</h3>
                  <p className="text-xs text-slate-400">{currentUser?.email || 'admin@siliconlabs.internal'}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#84a92c]/15 text-[#84a92c] border border-[#84a92c]/30 uppercase">
                    Role: {role}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    logout();
                    window.location.href = '/';
                  }}
                  className="px-5 py-2 rounded-xl bg-red-600 text-white font-bold text-xs shadow-xs hover:bg-red-700 transition-all cursor-pointer"
                >
                  Sign Out of Session
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <Modal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          title={confirmModal.title}
          size="sm"
        >
          <div className="space-y-4 text-xs font-sans" style={{ color: 'var(--text-primary)' }}>
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
              <p className="leading-relaxed">{confirmModal.message}</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-bold rounded-xl border hover:opacity-80 cursor-pointer"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmModal.onConfirm()}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm cursor-pointer"
              >
                {confirmModal.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
