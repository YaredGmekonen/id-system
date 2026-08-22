export default function DemoBadge() {
  return (
    <div className="fixed top-3.5 right-4 z-50 pointer-events-none">
      <div className="flex items-center gap-1.5 bg-paper-50/90 text-teal border border-teal/30 backdrop-blur-xs px-2.5 py-1 rounded shadow-xs text-xs font-mono font-bold">
        <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
        <span>DEMO+ (LOCAL ENCLAVE)</span>
      </div>
    </div>
  );
}
