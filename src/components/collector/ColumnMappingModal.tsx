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
  onImportComplete: (count: number) => void;
}

const SYSTEM_FIELDS: { key: keyof Omit<Person, 'id' | 'createdAt'>; label: string; required?: boolean }[] = [
  { key: 'fullName', label: 'Full Name', required: true },
  { key: 'idNumber', label: 'ID Number', required: true },
  { key: 'department', label: 'Department' },
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
  onImportComplete,
}: ColumnMappingModalProps) {
  // Auto-match initial mapping based on fuzzy header names
  const initialMapping = useMemo(() => {
    const map: Record<string, string> = {};

    headers.forEach(header => {
      const lower = header.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lower.includes('fullname') || lower === 'name' || lower.includes('studentname') || lower.includes('employeename')) {
        map['fullName'] = header;
      } else if (lower.includes('id') || lower.includes('reg') || lower.includes('roll') || lower.includes('code')) {
        map['idNumber'] = header;
      } else if (lower.includes('dept') || lower.includes('department') || lower.includes('faculty') || lower.includes('major')) {
        map['department'] = header;
      } else if (lower.includes('role') || lower.includes('title') || lower.includes('designation') || lower.includes('class') || lower.includes('grade')) {
        map['role'] = header;
      } else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('tel') || lower.includes('contact')) {
        map['phone'] = header;
      } else if (lower.includes('mail')) {
        map['email'] = header;
      } else if (lower.includes('blood')) {
        map['bloodGroup'] = header;
      } else if (lower.includes('category') || lower.includes('group') || lower.includes('type')) {
        map['category'] = header;
      } else if (lower.includes('date') || lower.includes('join') || lower.includes('enroll')) {
        map['joinedDate'] = header;
      }
    });

    return map;
  }, [headers]);

  const [mapping, setMapping] = useState<Record<string, string>>(initialMapping);
  const [importing, setImporting] = useState(false);

  const handleFieldChange = (systemKey: string, spreadsheetHeader: string) => {
    setMapping(prev => ({
      ...prev,
      [systemKey]: spreadsheetHeader,
    }));
  };

  // Preview mapped data for the first 3 rows
  const previewRows = useMemo(() => {
    return rawRows.slice(0, 3).map((row, idx) => {
      const p: Record<string, any> = { _id: idx };
      SYSTEM_FIELDS.forEach(field => {
        const col = mapping[field.key];
        p[field.key] = col ? row[col] || '' : '';
      });
      return p;
    });
  }, [rawRows, mapping]);

  const handleConfirmImport = async () => {
    if (!mapping['fullName'] && !headers.length) {
      alert('Please map at least the Full Name column.');
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
          category: (mapping['category'] ? String(row[mapping['category']] || '') : '') || 'General',
          department: (mapping['department'] ? String(row[mapping['department']] || '') : '') || 'Standard Operations',
          role: (mapping['role'] ? String(row[mapping['role']] || '') : '') || 'Member',
          phone: (mapping['phone'] ? String(row[mapping['phone']] || '') : '') || '+1 (555) 000-0000',
          email: (mapping['email'] ? String(row[mapping['email']] || '') : '') || `${name.toLowerCase().replace(/\s+/g, '.')}@idplatform.internal`,
          bloodGroup: (mapping['bloodGroup'] ? String(row[mapping['bloodGroup']] || '') : '') || 'O+',
          joinedDate: (mapping['joinedDate'] ? String(row[mapping['joinedDate']] || '') : '') || new Date().toISOString().split('T')[0],
          emergencyPhone: (mapping['emergencyPhone'] ? String(row[mapping['emergencyPhone']] || '') : '') || '',
          photoDataUrl: '',
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
      alert('Failed to insert mapped records.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Map Spreadsheet Columns to ID Card Fields"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5 font-body text-ink">
        
        {/* File Info */}
        <div className="flex items-center justify-between p-3 bg-paper-200 rounded-md text-xs border border-paper-300">
          <div className="flex items-center gap-2">
            <span className="font-mono text-teal font-bold">FILE:</span>
            <span className="font-semibold text-ink">{fileName}</span>
          </div>
          <span className="font-mono text-ink-muted">
            {rawRows.length.toLocaleString()} records detected
          </span>
        </div>

        {/* Field Mapping Grid */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted font-display">
            Field Mapping Configuration
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
            {SYSTEM_FIELDS.map(field => {
              const currentVal = mapping[field.key] || '';
              return (
                <div key={field.key} className="p-2.5 bg-paper-100 rounded-md border border-paper-300 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-ink mb-0">
                      {field.label} {field.required && <span className="text-stamp">*</span>}
                    </label>
                    <span className="text-[10px] font-mono text-ink-muted">{field.key}</span>
                  </div>

                  <select
                    value={currentVal}
                    onChange={e => handleFieldChange(field.key, e.target.value)}
                    className="w-full text-xs py-1.5 px-2 bg-paper-50 border border-paper-300 rounded text-ink font-medium focus:outline-none focus:border-teal"
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

        {/* Live Preview Table */}
        <div className="space-y-2 pt-2 border-t border-paper-300">
          <h4 className="text-xs font-bold uppercase tracking-wider text-ink-muted font-display">
            Sample Data Preview (First 3 Rows)
          </h4>

          <div className="overflow-x-auto border border-paper-300 rounded-md">
            <table className="w-full text-[11px] text-left">
              <thead className="bg-paper-200 text-ink-muted font-mono uppercase text-[10px] border-b border-paper-300">
                <tr>
                  <th className="py-1.5 px-2.5">Full Name</th>
                  <th className="py-1.5 px-2.5">ID Number</th>
                  <th className="py-1.5 px-2.5">Department</th>
                  <th className="py-1.5 px-2.5">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-paper-300 bg-paper-50 font-body">
                {previewRows.map((r, i) => (
                  <tr key={i}>
                    <td className="py-1.5 px-2.5 font-bold text-ink">{r.fullName || <span className="text-ink-muted italic">empty</span>}</td>
                    <td className="py-1.5 px-2.5 font-mono text-teal">{r.idNumber || <span className="text-ink-muted italic">auto-generate</span>}</td>
                    <td className="py-1.5 px-2.5">{r.department || <span className="text-ink-muted italic">empty</span>}</td>
                    <td className="py-1.5 px-2.5">{r.role || <span className="text-ink-muted italic">empty</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-paper-300">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={importing || rawRows.length === 0}
            className="btn-primary flex items-center gap-2"
          >
            {importing ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
                <span>Importing Records…</span>
              </>
            ) : (
              <span>Import {rawRows.length.toLocaleString()} Records into Database</span>
            )}
          </button>
        </div>

      </div>
    </Modal>
  );
}
