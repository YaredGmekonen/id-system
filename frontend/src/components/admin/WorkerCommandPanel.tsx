import { useState } from 'react';
import { X } from 'lucide-react';
import type { Worker } from '../../db/database';
import { addWorker, updateWorker, deleteWorker } from '../../db/hooks';

interface WorkerCommandPanelProps {
  workers: Worker[];
  onSelectWorkerForFilter?: (workerId: number) => void;
}

export default function WorkerCommandPanel({
  workers,
  onSelectWorkerForFilter,
}: WorkerCommandPanelProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Field Registrar');
  const [newLocation, setNewLocation] = useState('District Station #2');
  const [newPhone, setNewPhone] = useState('+1 (555) 000-0000');

  const onlineCount = workers.filter(w => w.status === 'Online').length;
  const inFieldCount = workers.filter(w => w.status === 'In Field').length;
  const offlineCount = workers.filter(w => w.status === 'Offline').length;
  const totalCollectedToday = workers.reduce((acc, w) => acc + (w.recordsCollected || 0), 0);

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newEmail) return;

    await addWorker({
      name: newName,
      email: newEmail,
      role: newRole,
      avatar: newName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      status: 'Online',
      location: newLocation,
      shiftStartTime: '08:00 AM',
      lastActive: 'Just now',
      recordsCollected: 0,
      batteryLevel: 100,
      signalStrength: 'Strong',
      assignedDistrict: newLocation,
      phone: newPhone,
      createdAt: new Date(),
    });

    setNewName('');
    setNewEmail('');
    setShowAddModal(false);
  };

  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);

  const handleStatusToggle = async (worker: Worker) => {
    const nextStatus: Worker['status'] =
      worker.status === 'Online'
        ? 'In Field'
        : worker.status === 'In Field'
        ? 'Offline'
        : 'Online';
    await updateWorker(worker.id!, { status: nextStatus });
  };

  const handleDeleteWorker = (worker: Worker) => {
    setWorkerToDelete(worker);
  };

  return (
    <div className="space-y-6 font-body text-ink">
      
      {/* Top Banner Stats */}
      <div className="bg-paper-50 rounded-lg border border-paper-300 shadow-xs p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-ink font-display tracking-tight">
              Field Registrar Fleet & Live Stations
            </h2>
            <span className="text-[11px] font-mono font-bold text-teal bg-teal-50 px-2.5 py-0.5 rounded border border-teal/30">
              {onlineCount + inFieldCount} Active Deployments
            </span>
          </div>
          <p className="text-xs text-ink-muted mt-1 font-normal">
            Real-time biometric collector telemetry, battery status, and daily intake volume across all operational districts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="flex items-center gap-1 text-teal font-bold">
              <span className="w-2 h-2 rounded-full bg-teal" />
              {onlineCount} Online
            </span>
            <span className="text-ink-muted">•</span>
            <span className="flex items-center gap-1 text-navy font-bold">
              <span className="w-2 h-2 rounded-full bg-navy" />
              {inFieldCount} In Field
            </span>
            <span className="text-ink-muted">•</span>
            <span className="flex items-center gap-1 text-ink-muted font-bold">
              <span className="w-2 h-2 rounded-full bg-paper-400" />
              {offlineCount} Offline
            </span>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary py-2 px-4 text-xs flex items-center justify-center gap-1.5"
          >
            <span>+</span>
            <span>Deploy Registrar Node</span>
          </button>
        </div>
      </div>

      {/* Fleet Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {workers.map(w => (
          <div
            key={w.id}
            className="bg-paper-50 rounded-lg p-5 border border-paper-300 shadow-xs hover:border-ink/20 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-navy text-paper flex items-center justify-center font-bold text-sm font-display flex-shrink-0">
                    {w.avatar || w.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-ink font-display truncate leading-tight">
                      {w.name}
                    </h3>
                    <p className="text-[11px] text-ink-muted truncate">{w.role}</p>
                  </div>
                </div>

                <span
                  onClick={() => handleStatusToggle(w)}
                  className={`cursor-pointer px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    w.status === 'Online'
                      ? 'bg-teal-50 text-teal border border-teal/30'
                      : w.status === 'In Field'
                      ? 'bg-navy-50 text-navy border border-navy/30'
                      : 'bg-paper-200 text-ink-muted border border-paper-300'
                  }`}
                  title="Click to cycle status"
                >
                  {w.status}
                </span>
              </div>

              {/* Details & Telemetry */}
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-ink-muted">
                  <span>Location:</span>
                  <span className="font-semibold text-ink truncate max-w-[140px] text-right">{w.location}</span>
                </div>
                <div className="flex items-center justify-between text-ink-muted">
                  <span>Shift Began:</span>
                  <span className="font-mono text-ink font-semibold">{w.shiftStartTime}</span>
                </div>
                <div className="flex items-center justify-between text-ink-muted">
                  <span>Battery / Signal:</span>
                  <span className="font-mono font-bold text-teal">
                    {w.batteryLevel}% • {w.signalStrength}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom stats & action */}
            <div className="mt-4 pt-3 border-t border-paper-300 flex items-center justify-between">
              <div>
                <span className="text-lg font-black text-ink font-display block leading-none">
                  {w.recordsCollected}
                </span>
                <span className="text-[10px] text-ink-muted font-mono uppercase">Enrolled</span>
              </div>

              <div className="flex items-center gap-1.5">
                {onSelectWorkerForFilter && (
                  <button
                    onClick={() => onSelectWorkerForFilter(w.id!)}
                    className="btn-secondary py-1 px-2 text-[11px] font-bold"
                  >
                    Inspect Records
                  </button>
                )}
                <button
                  onClick={() => handleDeleteWorker(w)}
                  className="p-1 rounded text-ink-muted hover:text-stamp cursor-pointer"
                  title="Remove Worker"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Worker Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/70 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-md bg-paper-50 rounded-lg p-6 text-ink shadow-2xl border border-paper-300 space-y-4">
            <div className="flex items-center justify-between border-b border-paper-300 pb-3">
              <h3 className="text-base font-bold text-ink font-display">Deploy New Field Registrar</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-ink-muted hover:text-ink p-1 cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorker} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Registrar Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dawit Tadesse"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-paper-100 border border-paper-300 rounded-md text-ink focus:outline-none focus:border-teal"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="dawit.t@idplatform.internal"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-paper-100 border border-paper-300 rounded-md text-ink focus:outline-none focus:border-teal"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">Role Title</label>
                  <input
                    type="text"
                    value={newRole}
                    onChange={e => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-paper-100 border border-paper-300 rounded-md text-ink focus:outline-none focus:border-teal"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-ink block mb-1">Phone</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-paper-100 border border-paper-300 rounded-md text-ink focus:outline-none focus:border-teal font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-ink block mb-1">Assigned Station / District</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={e => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-paper-100 border border-paper-300 rounded-md text-ink focus:outline-none focus:border-teal"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-paper-300">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary py-1.5 text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary py-1.5 text-xs font-bold">
                  Deploy Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
