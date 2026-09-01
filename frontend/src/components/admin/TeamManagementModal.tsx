import React, { useState } from 'react';
import { X, Users, Plus, Check, MapPin, Briefcase } from 'lucide-react';

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TeamManagementModal({ isOpen, onClose }: TeamManagementModalProps) {
  const [teams, setTeams] = useState([
    {
      id: '1',
      name: 'Team A (Central District)',
      branch: 'Yeka Branch Station',
      collectorsCount: 12,
      designersCount: 3,
      activeRecords: 850,
      completionRate: 85,
      lead: 'Hanna Mengistu',
    },
    {
      id: '2',
      name: 'Team B (Eastern District)',
      branch: 'Bole Sub-City Center',
      collectorsCount: 10,
      designersCount: 2,
      activeRecords: 620,
      completionRate: 62,
      lead: 'Tewodros Kassahun',
    },
    {
      id: '3',
      name: 'Team C (Commercial & Corporate)',
      branch: 'HQ Central Hub',
      collectorsCount: 8,
      designersCount: 4,
      activeRecords: 420,
      completionRate: 45,
      lead: 'Abenezer Kaleab',
    },
  ]);

  const [isCreating, setIsCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;

    setTeams(prev => [
      ...prev,
      {
        id: String(Date.now()),
        name: newTeamName,
        branch: newBranch || 'Operations Hub',
        collectorsCount: 0,
        designersCount: 0,
        activeRecords: 0,
        completionRate: 0,
        lead: 'Unassigned',
      },
    ]);

    setToastMsg(`Team "${newTeamName}" created.`);
    setNewTeamName('');
    setNewBranch('');
    setIsCreating(false);
    setTimeout(() => setToastMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none font-sans">
      <div
        className="relative w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
      >
        {/* Header */}
        <div className="p-4 md:px-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-[#84a92c] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">Operational Teams & Workload Allocation</h2>
              <p className="text-xs text-slate-400">Organize field collectors and designers into structured operational teams.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCreating(true)}
              className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Team</span>
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast */}
        {toastMsg && (
          <div className="px-6 py-2 bg-[#84a92c]/20 border-b border-[#84a92c]/30 text-[#84a92c] text-xs font-bold flex items-center gap-2">
            <Check className="w-3.5 h-3.5" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Create Sub-form */}
        {isCreating && (
          <form onSubmit={handleCreateTeam} className="p-4 border-b bg-slate-900/60 flex items-center gap-3 flex-wrap" style={{ borderColor: 'var(--border-primary)' }}>
            <input
              type="text"
              placeholder="Team Name (e.g. Team D - West)"
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              required
              className="px-3 py-1.5 rounded-lg border text-xs text-slate-100 flex-1 min-w-[180px]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            />
            <input
              type="text"
              placeholder="Branch / Station Location"
              value={newBranch}
              onChange={e => setNewBranch(e.target.value)}
              className="px-3 py-1.5 rounded-lg border text-xs text-slate-100 flex-1 min-w-[160px]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            />
            <button type="submit" className="btn-primary py-1.5 px-3 text-xs font-bold cursor-pointer">
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 rounded-lg border text-xs text-slate-400 hover:text-white cursor-pointer"
              style={{ borderColor: 'var(--border-primary)' }}
            >
              Cancel
            </button>
          </form>
        )}

        {/* Team Cards Grid */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map(team => (
            <div
              key={team.id}
              className="rounded-xl border p-4 flex flex-col justify-between gap-4"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-slate-100">{team.name}</h3>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>{team.branch}</span>
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#84a92c]/20 text-[#84a92c] font-bold font-mono">
                    Lead: {team.lead}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800 text-center text-[11px]">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Collectors</span>
                    <span className="font-bold font-mono text-amber-400">{team.collectorsCount} Staff</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Designers</span>
                    <span className="font-bold font-mono text-blue-400">{team.designersCount} Staff</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-mono block">Active Records</span>
                    <span className="font-bold font-mono text-slate-200">{team.activeRecords}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Batch Completion Target</span>
                    <span className="font-bold text-[#84a92c]">{team.completionRate}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#84a92c] to-emerald-400 rounded-full"
                      style={{ width: `${team.completionRate}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
