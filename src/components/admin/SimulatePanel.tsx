import { useState } from 'react';
import Modal from '../shared/Modal';
import { executeRealBatchGeneration, type BatchProgress } from '../../engine/batchEngine';
import { useTemplates, usePeople } from '../../db/hooks';
import type { Person } from '../../db/database';

export default function SimulatePanel() {
  const templates = useTemplates();
  const people = usePeople();
  const activeTemplate = templates[0];

  const [batchLimit, setBatchLimit] = useState<number>(10000);
  const [targetRecordCount, setTargetRecordCount] = useState<number>(15000);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [showDoneModal, setShowDoneModal] = useState(false);
  const [summary, setSummary] = useState<{ totalBatches: number; totalCards: number } | null>(null);

  const totalBatchesEstimated = Math.ceil(targetRecordCount / batchLimit);

  const handleRunRealBatch = async () => {
    if (!activeTemplate) {
      return;
    }

    setIsRunning(true);
    setProgress({
      totalRecords: targetRecordCount,
      processedRecords: 0,
      currentBatchIndex: 1,
      totalBatches: totalBatchesEstimated,
      status: 'rendering',
      percent: 0,
    });

    try {
      // Build test dataset (if selected count > existing records, expand synthetic records based on real seed)
      const basePeople = people.length > 0 ? people : [
        {
          fullName: 'Alexander Vance',
          idNumber: 'ID-2026-001',
          category: 'Operations',
          department: 'Software Engineering',
          role: 'Principal Engineer',
          phone: '+1 (555) 019-2831',
          email: 'a.vance@idplatform.internal',
          bloodGroup: 'O+',
          joinedDate: '2026-01-15',
          status: 'Active',
          photoDataUrl: '',
        } as Person,
      ];

      const fullDataset: Person[] = [];
      for (let i = 0; i < targetRecordCount; i++) {
        const base = basePeople[i % basePeople.length];
        fullDataset.push({
          ...base,
          id: i + 1,
          fullName: `${base.fullName.split(' ')[0]} ${i + 1}`,
          idNumber: `ID-${new Date().getFullYear()}-${10000 + i}`,
        });
      }

      // Execute true chunked batch generation
      const result = await executeRealBatchGeneration(activeTemplate, fullDataset, {
        batchSizeLimit: batchLimit,
        chunkSize: 100,
        onProgress: (p) => setProgress(p),
      });

      setSummary(result);
      setShowDoneModal(true);
    } catch (err) {
      console.error('Batch generation failed:', err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-4 font-body text-ink">
      <div className="bg-paper-50 rounded-lg border border-paper-300 shadow-xs p-5 sm:p-6 space-y-5">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-paper-300 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-ink font-display tracking-tight">
                High-Throughput Batch Generation Engine
              </h3>
              <span className="text-[11px] font-mono font-bold text-teal bg-teal-50 border border-teal/30 px-2 py-0.5 rounded">
                Real Output Engine
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-1 font-body">
              Client-side chunked rendering engine. Automatically splits datasets exceeding the batch threshold into sequential print sheets and multi-card ZIP archives.
            </p>
          </div>

          {/* Configuration Settings */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div>
              <label className="text-[10px] font-bold text-ink-muted uppercase block mb-1 font-mono">
                Batch Chunk Limit
              </label>
              <select
                value={batchLimit}
                onChange={e => setBatchLimit(Number(e.target.value))}
                disabled={isRunning}
                className="text-xs bg-paper-100 border border-paper-300 rounded px-2.5 py-1.5 font-bold text-ink focus:outline-none focus:border-teal"
              >
                <option value={5000}>5,000 cards / batch</option>
                <option value={10000}>10,000 cards / batch (Default)</option>
                <option value={20000}>20,000 cards / batch</option>
                <option value={50000}>50,000 cards / batch (Max)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Telemetry Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-paper-100 rounded-md border border-paper-300">
            <span className="text-[10px] text-ink-muted font-bold uppercase block font-mono">Target Record Volume</span>
            <div className="flex items-center gap-2 mt-1">
              <select
                value={targetRecordCount}
                onChange={e => setTargetRecordCount(Number(e.target.value))}
                disabled={isRunning}
                className="text-sm font-extrabold text-ink bg-paper-50 border border-paper-300 rounded px-2 py-1 focus:outline-none focus:border-teal"
              >
                <option value={500}>500 Records (Quick Test)</option>
                <option value={2500}>2,500 Records</option>
                <option value={10000}>10,000 Records (1 Full Batch)</option>
                <option value={15000}>15,000 Records (2 Batches: 10k + 5k)</option>
                <option value={60000}>60,000 Records (6 Batches)</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-paper-100 rounded-md border border-paper-300">
            <span className="text-[10px] text-ink-muted font-bold uppercase block font-mono">Auto-Splits Into</span>
            <span className="text-base font-bold text-teal mt-1 block font-display">
              {totalBatchesEstimated} Sequential Batches
            </span>
          </div>

          <div className="p-3 bg-paper-100 rounded-md border border-paper-300">
            <span className="text-[10px] text-ink-muted font-bold uppercase block font-mono">Output Formats</span>
            <span className="text-xs font-semibold text-ink mt-1 block">
              ZIP (PNGs) + 8-Up A4 PDF Sheets
            </span>
          </div>
        </div>

        {/* Trigger Button & Status */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-xs text-ink-muted font-body">
            {isRunning && progress ? (
              <span className="flex items-center gap-2 text-teal font-bold font-mono">
                <span className="w-2 h-2 rounded-full bg-teal animate-ping" />
                Processing Batch {progress.currentBatchIndex}/{progress.totalBatches} ({progress.processedRecords.toLocaleString()} / {progress.totalRecords.toLocaleString()} cards)
              </span>
            ) : (
              <span>Ready to execute real batch generation.</span>
            )}
          </div>

          <button
            onClick={handleRunRealBatch}
            disabled={isRunning}
            className="btn-primary py-2.5 px-4 text-xs flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
                <span>Generating Real Batches…</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
                <span>Generate {targetRecordCount.toLocaleString()} Real Cards</span>
              </>
            )}
          </button>
        </div>

        {/* Live Progress Bar */}
        {isRunning && progress && (
          <div className="space-y-2 pt-2 border-t border-paper-300 animate-fade-in">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-ink">
                Batch {progress.currentBatchIndex} of {progress.totalBatches} ({progress.currentBatchName})
              </span>
              <span className="font-mono text-teal font-bold">
                {progress.percent}% ({progress.processedRecords.toLocaleString()} cards)
              </span>
            </div>

            <div className="w-full h-2.5 bg-paper-200 rounded-full overflow-hidden border border-paper-300">
              <div
                className="h-full bg-teal rounded-full transition-all duration-100 ease-linear"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}

      </div>

      {/* Done Modal */}
      {showDoneModal && summary && (
        <Modal
          isOpen={showDoneModal}
          onClose={() => setShowDoneModal(false)}
          title="Batch Generation Execution Complete"
        >
          <div className="text-center space-y-4 p-2 font-body text-ink">
            <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal/30 text-teal text-xl font-bold mx-auto flex items-center justify-center">
              ✓
            </div>

            <div>
              <h3 className="text-base font-extrabold text-ink font-display">
                {summary.totalCards.toLocaleString()} ID Cards Rendered Across {summary.totalBatches} Batches
              </h3>
              <p className="text-xs text-ink-muted mt-1 max-w-md mx-auto leading-relaxed">
                Real ZIP archives and 8-Up A4 print sheet PDFs were generated and delivered to your downloads directory.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-paper-100 rounded-md border border-paper-300">
                <span className="text-base font-black text-ink font-display block">{summary.totalCards.toLocaleString()}</span>
                <span className="text-[10px] text-ink-muted font-semibold uppercase font-mono">Total Cards</span>
              </div>
              <div className="p-3 bg-paper-100 rounded-md border border-paper-300">
                <span className="text-base font-black text-teal font-display block">{summary.totalBatches}</span>
                <span className="text-[10px] text-ink-muted font-semibold uppercase font-mono">Batches</span>
              </div>
              <div className="p-3 bg-paper-100 rounded-md border border-paper-300">
                <span className="text-base font-black text-ink font-display block">300 DPI</span>
                <span className="text-[10px] text-ink-muted font-semibold uppercase font-mono">Print Ready</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowDoneModal(false)}
                className="btn-primary w-full py-2 text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
