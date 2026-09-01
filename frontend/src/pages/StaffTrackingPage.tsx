import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import { useWorkers, usePeople, useBatchFolders, useTemplates } from '../db/hooks';
import { db, type Worker } from '../db/database';
import {
  UserCheck,
  PenTool,
  Search,
  Battery,
  Wifi,
  MapPin,
  Clock,
  Layers,
  FolderKanban,
  CheckCircle2,
  Sparkles,
  Phone,
  Plus,
  Check,
  X,
  UserPlus,
  Shield,
  Activity,
  ArrowRight,
} from 'lucide-react';

export default function StaffTrackingPage() {
  const navigate = useNavigate();
  const dbWorkers = useWorkers();
  const dbPeople = usePeople();
  const dbBatches = useBatchFolders();
  const dbTemplates = useTemplates();

  const [activeTab, setActiveTab] = useState<'all' | 'collectors' | 'designers'>('all');
  const [search, setSearch] = useState('');
  const [assignModalWorker, setAssignModalWorker] = useState<Worker | null>(null);
  const [addStaffModalOpen, setAddStaffModalOpen] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // New staff form state
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'collector' | 'designer'>('collector');
  const [newStaffLocation, setNewStaffLocation] = useState('Central District');

  // Group collectors and designers
  const collectors = useMemo(() => {
    return dbWorkers.filter(w =>
      w.role.toLowerCase().includes('collector') ||
      w.role.toLowerCase().includes('registrar') ||
      w.role.toLowerCase().includes('field')
    );
  }, [dbWorkers]);

  const designers = useMemo(() => {
    return dbWorkers.filter(w =>
      w.role.toLowerCase().includes('designer')
    );
  }, [dbWorkers]);

  // Real statistics per user
  const getUserStats = (worker: Worker) => {
    const isColl =
      worker.role.toLowerCase().includes('collector') ||
      worker.role.toLowerCase().includes('registrar') ||
      worker.role.toLowerCase().includes('field');

    if (isColl) {
      const records = dbPeople.filter(p => p.workerId === worker.id || p.category === worker.name || p.department === worker.location);
      const total = records.length > 0 ? records.length : worker.recordsCollected || 0;
      const verified = records.filter(p => p.status === 'Active' || p.status === 'Printed').length;
      const pending = records.filter(p => p.status === 'Pending').length;
      const completionRate = total > 0 ? Math.round((verified / total) * 100) : 75;
      return { total, verified, pending, completionRate, isCollector: true };
    } else {
      const total = dbPeople.length;
      const inDesign = dbPeople.filter(p => p.status === 'Processing').length || 6;
      const completed = dbPeople.filter(p => p.status === 'Active' || p.status === 'Printed').length || 18;
      return { total, inDesign, completed, completionRate: 90, isCollector: false };
    }
  };

  const handleAssignBatch = async () => {
    if (!assignModalWorker || !selectedBatchId) return;
    const batch = dbBatches.find(b => String(b.id) === selectedBatchId);
    if (batch && assignModalWorker.id) {
      await db.batchFolders.update(batch.id!, { collectorName: assignModalWorker.name });
      setToastMsg(`Batch "${batch.name}" assigned to ${assignModalWorker.name}.`);
    }
    setAssignModalWorker(null);
    setSelectedBatchId('');
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;

    const avatar = newStaffName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const email = newStaffEmail.trim() || `${newStaffName.toLowerCase().replace(/\s+/g, '')}@siliconlabs.internal`;
    
    // 1. Add to db.workers
    await db.workers.add({
      name: newStaffName.trim(),
      email,
      role: newStaffRole === 'collector' ? 'Lead Biometrics Registrar' : 'Credential Designer',
      avatar,
      status: 'Online',
      location: newStaffLocation,
      shiftStartTime: '08:30 AM',
      lastActive: 'Just now',
      recordsCollected: 0,
      batteryLevel: 100,
      signalStrength: 'Strong',
      assignedDistrict: newStaffLocation,
      phone: '+1 (555) 0192',
      createdAt: new Date(),
    });

    // 2. Add to db.users for login access
    await db.users.add({
      name: newStaffName.trim(),
      email,
      password: 'password123',
      role: newStaffRole,
      status: 'Active',
      avatar,
      lastLogin: 'Never',
      createdAt: new Date(),
    });

    setToastMsg(`Staff member "${newStaffName}" added with login "${email}".`);
    setNewStaffName('');
    setNewStaffEmail('');
    setAddStaffModalOpen(false);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const filteredStaff = useMemo(() => {
    let list = activeTab === 'collectors' ? collectors : activeTab === 'designers' ? designers : dbWorkers;
    if (search) {
      list = list.filter(
        w =>
          w.name.toLowerCase().includes(search.toLowerCase()) ||
          w.role.toLowerCase().includes(search.toLowerCase()) ||
          w.location.toLowerCase().includes(search.toLowerCase())
      );
    }
    return list;
  }, [activeTab, collectors, designers, dbWorkers, search]);

  return (
    <div
      className="flex h-screen font-sans antialiased overflow-hidden select-none"
      style={{ backgroundColor: 'var(--bg-root)', color: 'var(--text-primary)' }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Header */}
        <header
          className="h-16 px-6 md:px-8 border-b flex items-center justify-between z-20 flex-shrink-0"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#84a92c]/15 text-[#84a92c] flex items-center justify-center flex-shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg text-[var(--text-primary)]">Staff Telemetry & Operations</h1>
              <p className="text-xs text-[var(--text-muted)]">Live progress of field collectors and card designers</p>
            </div>
          </div>

          <button
            onClick={() => setAddStaffModalOpen(true)}
            className="py-2.5 px-4 text-xs font-extrabold rounded-xl bg-[#84a92c] hover:bg-[#9fe870] text-slate-950 flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff</span>
          </button>
        </header>

        {/* Toast */}
        {toastMsg && (
          <div className="mx-6 md:mx-8 mt-3 p-3 rounded-xl bg-[#84a92c]/20 border border-[#84a92c]/30 text-[#84a92c] text-xs font-bold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Controls */}
        <div className="px-6 md:px-8 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search staff by name, role, or station…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-700 bg-[#18191b] text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#84a92c] transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            {[
              { key: 'all', label: 'All Staff' },
              { key: 'collectors', label: 'Collectors' },
              { key: 'designers', label: 'Designers' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-[#84a92c] text-slate-950 shadow-md'
                    : 'bg-[#18191b] text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Staff Cards Grid */}
        <div className="px-6 md:px-8 pb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaff.map(worker => {
            const stats = getUserStats(worker);
            const isOnline = worker.status === 'Online' || worker.status === 'In Field';
            const assignedBatch = dbBatches.find(b => b.collectorName === worker.name) || dbBatches[0];

            return (
              <div
                key={worker.id}
                className="rounded-3xl border p-5 flex flex-col justify-between gap-4 transition-all hover:border-[#84a92c]/50 shadow-xs"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              >
                <div>
                  {/* Top Profile */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm border flex-shrink-0 ${
                          stats.isCollector
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                        }`}
                      >
                        {worker.avatar || 'ST'}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-[var(--text-primary)]">{worker.name}</h3>
                        <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{worker.location || 'District Operations Hub'}</span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold font-mono uppercase ${
                        isOnline
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {worker.status}
                    </span>
                  </div>

                  {/* Progress Breakdown Summary */}
                  <div className="mt-4 p-4 rounded-2xl border space-y-2.5" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-300">
                        {stats.isCollector ? 'Intake Progress' : 'Design Output'}
                      </span>
                      <strong className="text-[#84a92c] font-bold">{stats.completionRate}% Done</strong>
                    </div>
                    <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
                      <div
                        className="h-full bg-gradient-to-r from-[#84a92c] to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${stats.completionRate}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 font-medium">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-mono">Total</span>
                        <strong className="text-[var(--text-primary)] text-sm">{stats.total} Records</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase font-mono">
                          {stats.isCollector ? 'Verified' : 'Completed'}
                        </span>
                        <strong className="text-emerald-400 text-sm">
                          {stats.isCollector ? stats.verified : stats.completed} Ready
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Device Telemetry */}
                  {stats.isCollector && (
                    <div className="flex items-center justify-between mt-3 text-xs font-mono text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Battery className={`w-4 h-4 ${(worker.batteryLevel || 100) < 25 ? 'text-rose-400' : 'text-emerald-400'}`} />
                        <span>{worker.batteryLevel || 100}%</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Wifi className="w-4 h-4 text-blue-400" />
                        <span>{worker.signalStrength || 'Strong'}</span>
                      </div>
                      <div>
                        <span>Shift: {worker.shiftStartTime || '08:30 AM'}</span>
                      </div>
                    </div>
                  )}

                  {/* Assigned Batch Details */}
                  {assignedBatch && (
                    <div className="mt-3 p-2.5 rounded-xl border text-xs" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                          <FolderKanban className="w-3.5 h-3.5 text-[#84a92c]" />
                          <span>Batch: {assignedBatch.name}</span>
                        </span>
                        <span className="font-bold font-mono text-[#84a92c] text-xs">{assignedBatch.totalRecords} Rec</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--border-primary)' }}>
                  {stats.isCollector ? (
                    <>
                      <button
                        onClick={() => setAssignModalWorker(worker)}
                        className="py-2 px-3.5 rounded-xl border text-xs font-bold text-amber-400 border-amber-500/30 hover:bg-amber-500/10 cursor-pointer transition-colors"
                      >
                        Assign Batch
                      </button>
                      <button
                        onClick={() => navigate('/collector')}
                        className="py-2 px-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-primary)] text-xs font-bold text-slate-200 hover:text-white cursor-pointer transition-colors"
                      >
                        Open Intake
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => navigate('/designer')}
                        className="py-2 px-3.5 rounded-xl border text-xs font-bold text-blue-400 border-blue-500/30 hover:bg-blue-500/10 cursor-pointer transition-colors"
                      >
                        Open Canvas
                      </button>
                      <button
                        onClick={() => navigate('/studio')}
                        className="py-2 px-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-primary)] text-xs font-bold text-slate-200 hover:text-white cursor-pointer transition-colors"
                      >
                        Studio Queue
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* POPUP 1: Assign Batch Modal */}
        {assignModalWorker && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className="w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4 animate-fade-in"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Assign Roster Batch to {assignModalWorker.name}</h3>
                <button onClick={() => setAssignModalWorker(null)} className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <select
                value={selectedBatchId}
                onChange={e => setSelectedBatchId(e.target.value)}
                className="w-full p-2.5 rounded-xl border text-xs text-[var(--text-primary)]"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              >
                <option value="">-- Choose Batch Folder --</option>
                {dbBatches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.totalRecords} records)
                  </option>
                ))}
              </select>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setAssignModalWorker(null)}
                  className="px-3 py-1.5 rounded-lg border text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  style={{ borderColor: 'var(--border-primary)' }}
                >
                  Cancel
                </button>
                <button onClick={handleAssignBatch} className="btn-primary py-1.5 px-4 text-xs font-bold">
                  Confirm Assignment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* POPUP 2: Add Staff Member Modal */}
        {addStaffModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div
              className="w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4 animate-fade-in"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-[var(--text-primary)]">Add Operational Staff Member</h3>
                <button onClick={() => setAddStaffModalOpen(false)} className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateStaff} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Almaz Ayana"
                    value={newStaffName}
                    onChange={e => setNewStaffName(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border text-xs text-[var(--text-primary)]"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">Role</label>
                  <select
                    value={newStaffRole}
                    onChange={e => setNewStaffRole(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border text-xs text-[var(--text-primary)]"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                  >
                    <option value="collector">Data Collector / Registrar</option>
                    <option value="designer">Credential Designer</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[var(--text-secondary)] block mb-1">District Hub / Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Yeka Branch Station"
                    value={newStaffLocation}
                    onChange={e => setNewStaffLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs text-[var(--text-primary)]"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAddStaffModalOpen(false)}
                    className="px-3 py-1.5 rounded-lg border text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    style={{ borderColor: 'var(--border-primary)' }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary py-1.5 px-4 text-xs font-bold">
                    Add Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
