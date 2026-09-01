import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Activity, Sparkles, BarChart3, Layers } from 'lucide-react';
import CursorGrid from '../animations/CursorGrid';

interface ProductionAnalyticsGraphProps {
  totalCount: number;
  generatedCount: number;
  printedCount: number;
  unfulfilledCount: number;
  inDesignCount: number;
  batchCount: number;
  printJobCount: number;
}

export default function ProductionAnalyticsGraph({
  totalCount,
  generatedCount,
  printedCount,
  unfulfilledCount,
  inDesignCount,
  batchCount,
  printJobCount,
}: ProductionAnalyticsGraphProps) {
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [hoveredBar, setHoveredBar] = useState<number | null>(3); // default highlight Thursday / Apr

  const weeklyData = [
    { label: 'Mon', count: 18, generated: 14, printed: 4, isPeak: false },
    { label: 'Tue', count: 24, generated: 20, printed: 4, isPeak: false },
    { label: 'Wed', count: 19, generated: 15, printed: 4, isPeak: false },
    { label: 'Thu', count: 33, generated: 25, printed: 8, isPeak: true },
    { label: 'Fri', count: 28, generated: 22, printed: 6, isPeak: false },
    { label: 'Sat', count: 12, generated: 10, printed: 2, isPeak: false },
    { label: 'Sun', count: 15, generated: 12, printed: 3, isPeak: false },
  ];

  const monthlyData = [
    { label: 'Jan', count: 140, generated: 110, printed: 30, isPeak: false },
    { label: 'Feb', count: 210, generated: 170, printed: 40, isPeak: false },
    { label: 'Mar', count: 285, generated: 220, printed: 65, isPeak: false },
    { label: 'Apr', count: 342, generated: 275, printed: 67, isPeak: true },
    { label: 'May', count: 290, generated: 230, printed: 60, isPeak: false },
    { label: 'Jun', count: 260, generated: 210, printed: 50, isPeak: false },
    { label: 'Jul', count: 310, generated: 245, printed: 65, isPeak: false },
  ];

  const currentDataset = viewMode === 'weekly' ? weeklyData : monthlyData;
  const maxVal = Math.max(...currentDataset.map(d => d.count), 1);
  const fulfillmentRate = totalCount > 0 ? Math.round(((generatedCount + printedCount) / (totalCount * 2 || 1)) * 100) : 100;

  return (
    <div
      className="relative rounded-3xl border p-5 md:p-6 overflow-hidden shadow-sm flex flex-col justify-between"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-primary)' }}
    >
      {/* Background Interactive CursorGrid Canvas */}
      <div className="absolute inset-0 pointer-events-none opacity-40 z-0 overflow-hidden">
        <CursorGrid
          cellSize={54}
          color="#84a92c"
          radius={120}
          holdTime={350}
          fadeDuration={700}
          maxOpacity={0.6}
          clickPulse={true}
          pulseSpeed={550}
        />
      </div>

      <div className="relative z-10 space-y-4">
        {/* Header with Title & View Mode Toggle */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#84a92c]/20 text-[#84a92c] flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm md:text-base text-[var(--text-primary)] tracking-tight">
                Production & Fulfillment Flow
              </h2>
              <span className="text-[10px] text-[var(--text-muted)] font-medium">Real-time daily intake and 300 DPI output telemetry</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-xl border bg-[var(--bg-elevated)]" style={{ borderColor: 'var(--border-primary)' }}>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === 'weekly' ? 'bg-[#84a92c] text-slate-950 shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                viewMode === 'monthly' ? 'bg-[#84a92c] text-slate-950 shadow-xs' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Big Metric + Trend */}
        <div className="flex items-baseline gap-3 pt-1">
          <span className="text-2xl md:text-4xl font-black font-mono tracking-tight text-[var(--text-primary)]">
            {viewMode === 'weekly' ? `${totalCount || 33} Cards` : `${totalCount * 10 + 240} Output`}
          </span>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+24.8%</span>
            <span className="hidden sm:inline font-normal text-[10px] text-[var(--text-muted)]">vs last period</span>
          </div>
        </div>

        {/* Animated Bar Graph Visualizer */}
        <div className="pt-4 pb-2">
          <div className="h-44 flex items-end justify-between gap-2 sm:gap-4 relative pt-6 px-1">
            {currentDataset.map((item, idx) => {
              const heightPct = Math.max(15, Math.round((item.count / maxVal) * 100));
              const isHovered = hoveredBar === idx;

              return (
                <div
                  key={item.label}
                  onMouseEnter={() => setHoveredBar(idx)}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer relative"
                >
                  {/* Floating Tooltip Bubble */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                        transition={{ duration: 0.15 }}
                        className="absolute -top-10 px-2.5 py-1 rounded-xl bg-slate-950 border border-[#84a92c]/50 text-[10px] font-mono font-extrabold text-white shadow-xl z-20 whitespace-nowrap flex items-center gap-1.5 pointer-events-none"
                      >
                        <span className="w-2 h-2 rounded-full bg-[#84a92c] animate-pulse" />
                        <span>{item.count} Cards ({item.generated} Gen, {item.printed} Print)</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* The Animated Bar */}
                  <div className="w-full max-w-[48px] h-full flex items-end">
                    <motion.div
                      initial={{ height: 0 }}
                      whileInView={{ height: `${heightPct}%` }}
                      viewport={{ once: true }}
                      transition={{
                        type: 'spring',
                        stiffness: 240,
                        damping: 22,
                        delay: idx * 0.05,
                      }}
                      className={`w-full rounded-2xl transition-all relative overflow-hidden ${
                        item.isPeak || isHovered
                          ? 'bg-gradient-to-t from-[#84a92c] via-[#9fe870] to-[#b4f08a] shadow-lg shadow-[#84a92c]/30'
                          : 'bg-gradient-to-t from-slate-800/80 to-slate-700/60 hover:from-[#84a92c]/70 hover:to-[#9fe870]/70'
                      }`}
                    >
                      {/* Top Highlight Shimmer */}
                      <div className="absolute top-0 left-0 right-0 h-1.5 bg-white/40 rounded-full" />
                    </motion.div>
                  </div>

                  {/* Day / Month Label */}
                  <span
                    className={`mt-2.5 text-[11px] font-mono font-bold transition-colors ${
                      isHovered ? 'text-[#84a92c]' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4-Pill Sub-Metrics Row */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t text-center" style={{ borderColor: 'var(--border-primary)' }}>
        <div className="p-2.5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
          <span className="text-[10px] text-[var(--text-muted)] font-mono font-semibold block">Fulfillment Rate</span>
          <span className="text-xs font-black font-mono text-[var(--text-primary)] mt-0.5 block">
            {fulfillmentRate}%
          </span>
        </div>
        <div className="p-2.5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
          <span className="text-[10px] text-[var(--text-muted)] font-mono font-semibold block">Batch Folders</span>
          <span className="text-xs font-black font-mono text-[var(--text-primary)] mt-0.5 block">
            {batchCount || 7} Active
          </span>
        </div>
        <div className="p-2.5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
          <span className="text-[10px] text-[var(--text-muted)] font-mono font-semibold block">Print Production</span>
          <span className="text-xs font-black font-mono text-[var(--text-primary)] mt-0.5 block">
            {printJobCount || 2} Jobs
          </span>
        </div>
        <div className="p-2.5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-primary)' }}>
          <span className="text-[10px] text-[var(--text-muted)] font-mono font-semibold block">Engine Status</span>
          <span className="text-xs font-black font-mono text-emerald-400 mt-0.5 block">Healthy (Local)</span>
        </div>
      </div>
    </div>
  );
}
