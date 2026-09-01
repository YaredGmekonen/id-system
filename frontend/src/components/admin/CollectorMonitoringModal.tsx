import React, { useState } from 'react';
import { X, Battery, Wifi, MapPin, UserCheck, AlertCircle, RefreshCw, Check } from 'lucide-react';
import { useWorkers, useBatchFolders } from '../../db/hooks';

interface CollectorMonitoringModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CollectorMonitoringModal({ isOpen, onClose }: CollectorMonitoringModalProps) {
  const workers = useWorkers();
  const batches = useBatchFolders();
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [assignBatchModal, setAssignBatchModal] = useState<number | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const collectors = workers.filter(w =>
    w.role.toLowerCase().includes('collector') || w.role.toLowerCase().includes('registrar') || w.role.toLowerCase().includes('field')
  );

  const handleAssignBatch = (workerId: number) => {
    if (!selectedBatchId) return;
    const batch = batches.find(b => String(b.id) === selectedBatchId);
    setToastMsg(`Batch "${batch?.name || 'Selected Batch'}" assigned successfully to field collector.`);
    setAssignBatchModal(null);
    setSelectedBatchId('');
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none font-sans">
      <div
        className="relative w-full max-w-5xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
      >
        {/* Header */}
        <div className="p-4 md:px-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">Live Field Collectors Telemetry & Assignments</h2>
              <p className="text-xs text-slate-400">Monitor active field staff, battery levels, signal status, and assigned intake batches.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className="px-6 py-2 bg-[#84a92c]/20 border-b border-[#84a92c]/30 text-[#84a92c] text-xs font-bold flex items-center gap-2">
            <Check className="w-3.5 h-3.5" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Grid List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collectors.map(c => {
            const isOnline = c.status === 'Online' || c.status === 'In Field';
            return (
              <div
                key={c.id}
                className="rounded-xl border p-4 flex flex-col justify-between gap-3 relative transition-all hover:border-slate-600"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-bold text-xs">
                        {c.avatar}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-100">{c.name}</h4>
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{c.location || 'District Hub'}</span>
                        </p>
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase ${
                      isOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  {/* Telemetry Stats */}
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800 text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">Collected</span>
                      <span className="font-bold font-mono text-slate-100">{c.recordsCollected || 0} Records</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">Shift Started</span>
                      <span className="font-mono text-slate-300 text-[10px]">{c.shiftStartTime || '08:00 AM'}</span>
                    </div>
                  </div>

                  {/* Device Metrics */}
                  <div className="flex items-center justify-between mt-3 text-[10px] font-mono text-slate-400">
                    <div className="flex items-center gap-1">
                      <Battery className={`w-3.5 h-3.5 ${(c.batteryLevel || 100) < 25 ? 'text-rose-400' : 'text-emerald-400'}`} />
                      <span>{c.batteryLevel || 100}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Wifi className="w-3.5 h-3.5 text-blue-400" />
                      <span>{c.signalStrength || 'Good'}</span>
                    </div>
                    <div className="text-slate-500">
                      <span>Last: {c.lastActive || '5m ago'}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">{c.phone || '+1 555-0192'}</span>
                  <button
                    onClick={() => setAssignBatchModal(c.id || 0)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold hover:bg-amber-500/30 transition-colors cursor-pointer"
                  >
                    Assign Batch
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Assign Modal Sub-dialog */}
        {assignBatchModal !== null && (
          <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-xl border p-5 bg-slate-900 border-slate-700 shadow-2xl space-y-4">
              <h3 className="font-bold text-sm text-slate-100">Assign Roster Batch to Collector</h3>
              <p className="text-xs text-slate-400">Select which intake folder this field registrar will gather biometric cards for.</p>

              <select
                value={selectedBatchId}
                onChange={e => setSelectedBatchId(e.target.value)}
                className="w-full p-2 rounded-lg border bg-slate-800 border-slate-700 text-xs text-slate-100"
              >
                <option value="">-- Choose Batch Folder --</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.totalRecords} records)
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setAssignBatchModal(null)}
                  className="px-3 py-1.5 rounded-lg border text-xs text-slate-400 hover:text-white"
                  style={{ borderColor: 'var(--border-primary)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleAssignBatch(assignBatchModal)}
                  className="btn-primary py-1.5 px-4 text-xs font-bold"
                >
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
