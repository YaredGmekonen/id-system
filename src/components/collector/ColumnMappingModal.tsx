import { useState, useMemo } from 'react';
import Modal from '../shared/Modal';
import type { Person } from '../../db/database';
import { bulkAddPeople } from '../../db/hooks';

interface ColumnMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  headers: string[];
  rawRows: Record<string, any>[];
  fileName: string;
  activeFolderId?: number;
  activeFolderName?: string;
  onImportComplete: (count: number) => void;
}

const SYSTEM_FIELDS: { key: keyof Omit<Person, 'id' | 'createdAt'>; label: string; required?: boolean }[] = [
  { key: 'fullName', label: 'Full Name', required: true },
  { key: 'idNumber', label: 'ID Number', required: true },
  { key: 'department', label: 'Department / Class' },
  { key: 'role', label: 'Role / Designation' },
  { key: 'category', label: 'Category / Group' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'email', label: 'Email Address' },
  { key: 'bloodGroup', label: 'Blood Group' },
  { key: 'joinedDate', label: 'Date Joined / Enrollment' },
  { key: 'emergencyPhone', label: 'Emergency Contact' },
];

export default function ColumnMappingModal({
  isOpen,
  onClose,
  headers,
  rawRows,
  fileName,
  activeFolderId,
  activeFolderName,
  onImportComplete,
}: ColumnMappingModalProps) {
  // Auto-match initial mapping based on fuzzy header names
  const initialMapping = useMemo(() => {
    const map: Record<string, string> = {};

    headers.forEach(header => {
      const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (h.includes('name') || h.includes('studentname') || h.includes('fullname')) {
        map['fullName'] = header;
      } else if (h.includes('id') || h.includes('roll') || h.includes('reg') || h.includes('code') || h.includes('serial')) {
        map['idNumber'] = header;
      } else if (h.includes('dept') || h.includes('grade') || h.includes('class') || h.includes('section')) {
        map['department'] = header;
      } else if (h.includes('role') || h.includes('title') || h.includes('position')) {
        map['role'] = header;
      } else if (h.includes('phone') || h.includes('contact') || h.includes('mobile') || h.includes('tel')) {
        map['phone'] = header;
      } else if (h.includes('email') || h.includes('mail')) {
        map['email'] = header;
      } else if (h.includes('blood') || h.includes('bg')) {
        map['bloodGroup'] = header;
      } else if (h.includes('emergency') || h.includes('guardian') || h.includes('parent')) {
        map['emergencyPhone'] = header;
      }
    });

    return map;
  }, [headers]);

  const [mapping, setMapping] = useState<Record<string, string>>(initialMapping);
  const [importing, setImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFieldChange = (systemKey: string, excelHeader: string) => {
    setMapping(prev => ({
      ...prev,
      [systemKey]: excelHeader,
    }));
  };

  const handleImport = async () => {
    setErrorMsg(null);
    if (!mapping['fullName']) {
      setErrorMsg('Please map at least the Full Name column to continue.');
      return;
    }

    setImporting(true);
    try {
      const recordsToInsert: Omit<Person, 'id'>[] = rawRows.map((row, i) => {
        const nameVal = mapping['fullName'] ? String(row[mapping['fullName']] || '').trim() : '';
        const name = nameVal || `Record ${i + 1}`;
        const idVal = mapping['idNumber'] ? String(row[mapping['idNumber']] || '').trim() : '';
        const idNum = idVal || `ID-${new Date().getFullYear()}-${1000 + i}`;

        return {
          fullName: name,
          idNumber: idNum,
          category: (mapping['category'] ? String(row[mapping['category']] || '') : '') || 'Students',
          department: (mapping['department'] ? String(row[mapping['department']] || '') : '') || 'Grade 10',
          role: (mapping['role'] ? String(row[mapping['role']] || '') : '') || 'Student Member',
          phone: (mapping['phone'] ? String(row[mapping['phone']] || '') : '') || '',
          email: (mapping['email'] ? String(row[mapping['email']] || '') : '') || `${name.toLowerCase().replace(/\s+/g, '.')}@idplatform.internal`,
          bloodGroup: (mapping['bloodGroup'] ? String(row[mapping['bloodGroup']] || '') : '') || 'O+',
          joinedDate: (mapping['joinedDate'] ? String(row[mapping['joinedDate']] || '') : '') || new Date().toISOString().split('T')[0],
          emergencyPhone: (mapping['emergencyPhone'] ? String(row[mapping['emergencyPhone']] || '') : '') || '',
          photoDataUrl: '',
          batchFolderId: activeFolderId,
          folderName: activeFolderName || 'Student Intake',
          sourceFileName: fileName,
          status: 'Active',
          fulfillmentStatus: 'Unfulfilled',
          paymentStatus: 'Paid',
          channel: 'Spreadsheet Import',
          totalAmount: '$100',
          workerId: 1,
          collectedBy: 'Data Import Station',
          location: 'Batch Onboarding Queue',
          createdAt: new Date(),
        };
      });

      await bulkAddPeople(recordsToInsert);
      onImportComplete(recordsToInsert.length);
      onClose();
    } catch (err) {
      console.error('Import failed:', err);
      setErrorMsg('Failed to insert mapped records into the database.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Map Spreadsheet Columns to ID Card Fields"
      size="lg"
    >
      <div className="space-y-5 font-sans text-xs" style={{ color: 'var(--text-primary)' }}>
        
        {errorMsg && (
          <div className="p-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 font-bold">
            {errorMsg}
          </div>
        )}

        {/* File Info */}
        <div className="flex items-center justify-between p-3 rounded-xl border text-xs" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[#84a92c] font-bold">FILE:</span>
            <span className="font-semibold">{fileName}</span>
            {activeFolderName && <span className="font-mono text-[#84a92c] ml-2">({activeFolderName})</span>}
          </div>
          <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
            {rawRows.length.toLocaleString()} records detected
          </span>
        </div>

        {/* Field Mapping Grid */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>
            Field Mapping Configuration
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
            {SYSTEM_FIELDS.map(field => {
              const currentVal = mapping[field.key] || '';
              return (
                <div key={field.key} className="p-2.5 rounded-xl border flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold mb-0">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{field.key}</span>
                  </div>

                  <select
                    value={currentVal}
                    onChange={e => handleFieldChange(field.key, e.target.value)}
                    className="w-full text-xs py-1.5 px-2 rounded-lg border font-medium focus:outline-none focus:border-[#84a92c] cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)' }}
                  >
                    <option value="">-- Do not map --</option>
                    {headers.map(h => (
                      <option key={h} value={h}>
                        Column: {h}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        {/* Preview / Instructions */}
        <div className="p-3 rounded-xl border text-[11px] space-y-1" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)', color: 'var(--text-muted)' }}>
          <p className="font-bold" style={{ color: 'var(--text-primary)' }}>Import Guidelines:</p>
          <p>• Mandatory fields: Full Name</p>
          <p>• Missing photo columns can be added dynamically using the Photo Capture camera station or Archive Digitizer.</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--border-primary)' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl border hover:opacity-80 cursor-pointer"
            style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', color: 'var(--text-secondary)' }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleImport}
            disabled={importing || !mapping['fullName']}
            className="btn-primary py-2 px-6 text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            <span>{importing ? 'Importing records…' : `Import ${rawRows.length} Records`}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
