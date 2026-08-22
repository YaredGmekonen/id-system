// DEMO ONLY — simulated, not connected to real logic
// This component shows a fake multi-device sync status.
// No actual sync is happening — this is purely cosmetic for the sales demo.

export default function SyncIndicator() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
      {/* Animated green dot */}
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
      </span>
      <span className="text-xs font-medium text-emerald-300">3 devices connected</span>
    </div>
  );
}
