import React, { useState, useMemo } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { useAuditLogs, usePrintJobs, clearAuditLogs } from '../db/hooks';
import {
  Activity,
  Search,
  Download,
  Clock,
  Shield,
  Filter,
  Printer,
  Trash2,
} from 'lucide-react';

interface FormattedAuditLog {
  id: string;
  time: string;
  actor: string;
  action: string;
  details: string;
  ip: string;
  rawDate: Date;
}

export default function AuditLogsPage() {
  const dbAuditLogs = useAuditLogs();
  const dbPrintJobs = usePrintJobs();
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const mergedLogs = useMemo(() => {
    const list: FormattedAuditLog[] = [];

    // Real audit logs from db.auditLogs
    dbAuditLogs.forEach(l => {
      const d = l.createdAt ? new Date(l.createdAt) : new Date();
      list.push({
        id: `audit-${l.id}`,
        time: d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        actor: l.actor || 'System Operator',
        action: l.action || 'OPERATION',
        details: l.details || '',
        ip: l.ip || '127.0.0.1',
        rawDate: d,
      });
    });

    // Real print job logs from db.printJobs
    dbPrintJobs.forEach(job => {
      const d = job.createdAt ? new Date(job.createdAt) : new Date();
      list.push({
        id: `print-${job.id}`,
        time: d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        actor: job.operatorName || 'Print Operator',
        action: 'PRINT_EXPORTED',
        details: `Commercial 300 DPI Export: ${job.totalCards} cards (${job.totalSheets} sheets, ${job.paperSize}) for Batch: ${job.batchName}`,
        ip: '127.0.0.1',
        rawDate: d,
      });
    });

    // Sort newest first
    list.sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());
    return list;
  }, [dbAuditLogs, dbPrintJobs]);

  const filteredLogs = mergedLogs.filter(l => {
    const matchSearch =
      l.actor.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase());
    const matchFilter = actionFilter === 'all' || l.action.toLowerCase().includes(actionFilter.toLowerCase());
    return matchSearch && matchFilter;
  });

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return;
    const header = 'Timestamp,Actor,Action,Details,IP\n';
    const rows = filteredLogs
      .map(l => `"${l.time}","${l.actor}","${l.action}","${l.details.replace(/"/g, '""')}","${l.ip}"`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div
      className="flex h-screen font-sans antialiased overflow-hidden select-none"
      style={{ backgroundColor: 'var(--bg-root)', color: 'var(--text-primary)' }}
    >
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Header */}
        <header
          className="min-h-16 py-2 pl-14 pr-4 md:px-8 border-b flex items-center justify-between z-20 flex-shrink-0 flex-wrap gap-2"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-[var(--text-primary)]">Enterprise System Audit Logs</h1>
              <p className="text-xs text-[var(--text-muted)]">Real-time chronological security, print runs, and operational telemetry.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              disabled={filteredLogs.length === 0}
              className="btn-primary py-1.5 px-3.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Audit CSV</span>
            </button>
          </div>
        </header>

        {/* Controls */}
        <div className="px-6 md:px-8 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search audit trail by actor, action, or details…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#84a92c]"
              style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {['all', 'PRINT', 'INTAKE', 'BATCH', 'TEMPLATE', 'USER'].map(f => (
              <button
                key={f}
                onClick={() => setActionFilter(f)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer uppercase ${
                  actionFilter === f
                    ? 'bg-[#84a92c] text-slate-950 shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Table */}
        <div className="px-6 md:px-8 pb-8 flex-1 overflow-x-auto">
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
          >
            <table className="w-full text-left text-xs">
              <thead
                className="border-b text-[10px] font-mono uppercase text-[var(--text-muted)]"
                style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}
              >
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3 text-right">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono text-[11px]" style={{ borderColor: 'var(--border-primary)' }}>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-xs text-[var(--text-muted)] font-mono">
                      No audit events recorded yet. Perform actions like creating batches, registering cardholders, saving templates, or printing cards to populate real-time audit logs.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-[var(--bg-surface-hover)] transition-colors">
                      <td className="px-4 py-3 text-[var(--text-muted)] whitespace-nowrap">{log.time}</td>
                      <td className="px-4 py-3 font-bold text-[var(--text-primary)]">{log.actor}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                          log.action.includes('PRINT')
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                            : log.action.includes('INTAKE')
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : log.action.includes('BATCH')
                            ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                            : 'bg-[var(--bg-elevated)] text-[#84a92c] border-[var(--border-primary)]'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] font-sans">{log.details}</td>
                      <td className="px-4 py-3 text-right text-[var(--text-muted)]">{log.ip}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
