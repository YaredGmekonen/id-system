import React from 'react';
import { X, PenTool, CheckCircle2, Clock, Layers, Sparkles } from 'lucide-react';
import { useTemplates, useBatchFolders } from '../../db/hooks';

interface DesignerMonitoringModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DesignerMonitoringModal({ isOpen, onClose }: DesignerMonitoringModalProps) {
  const templates = useTemplates();
  const batches = useBatchFolders();

  if (!isOpen) return null;

  const designers = [
    {
      id: '1',
      name: 'Selamawit Bekele (Lead)',
      avatar: 'SB',
      team: 'Design Team A',
      status: 'Online',
      inDesignCount: 8,
      completedCount: 14,
      avgSpeed: '18m',
      currentTemplate: 'Corporate Standard (CR80)',
      activeBatch: 'Grade 10 Students 2026',
    },
    {
      id: '2',
      name: 'Yared Mekonen',
      avatar: 'YM',
      team: 'Design Team A',
      status: 'Online',
      inDesignCount: 6,
      completedCount: 9,
      avgSpeed: '22m',
      currentTemplate: 'Academic Pass (Vertical)',
      activeBatch: 'Staff ID – August',
    },
    {
      id: '3',
      name: 'Almaz Ayana',
      avatar: 'AA',
      team: 'Design Team B',
      status: 'Away',
      inDesignCount: 4,
      completedCount: 6,
      avgSpeed: '25m',
      currentTemplate: 'High-Tech Security Badge',
      activeBatch: 'New Employees – 2026',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 select-none font-sans">
      <div
        className="relative w-full max-w-5xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
        style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
      >
        {/* Header */}
        <div className="p-4 md:px-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">Credential Designers Monitoring & Output</h2>
              <p className="text-xs text-slate-400">Track active template design workflows, average turnaround time, and batch approvals.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Designers List */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {designers.map(d => (
              <div
                key={d.id}
                className="rounded-xl border p-4 flex flex-col justify-between gap-3 relative"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-blue-950 border border-blue-800/80 text-blue-400 flex items-center justify-center font-bold text-xs">
                        {d.avatar}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-slate-100">{d.name}</h4>
                        <p className="text-[10px] text-slate-400">{d.team}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase ${
                      d.status === 'Online' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {d.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800 text-center text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">In Design</span>
                      <span className="font-bold font-mono text-blue-400">{d.inDesignCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">Completed</span>
                      <span className="font-bold font-mono text-emerald-400">{d.completedCount}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">Avg Speed</span>
                      <span className="font-bold font-mono text-slate-300">{d.avgSpeed}</span>
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] space-y-1">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-[#84a92c]" />
                      <span>Active Batch: <strong className="text-slate-200">{d.activeBatch}</strong></span>
                    </div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-blue-400" />
                      <span>Template: <strong className="text-slate-200">{d.currentTemplate}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Master Template Library Summary */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <h3 className="font-bold text-xs text-slate-200 mb-3 uppercase tracking-wider font-mono">
              Published Template Assets ({templates.length} Total)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {templates.slice(0, 4).map(t => (
                <div key={t.id} className="p-3 rounded-xl border bg-slate-900/60 border-slate-800 text-xs">
                  <div className="font-bold text-slate-100 truncate">{t.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                    {t.orientation || 'horizontal'} • {(t.frontElements || []).length} Front Layers
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
