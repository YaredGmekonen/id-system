import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BRAND } from '../../design-tokens';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onPrint?: () => void;
  onDownload?: () => void;
  onNewRecord?: () => void;
  isGenerating?: boolean;
  onToggleMobileMenu?: () => void;
}

export default function Header({
  title = 'Personnel Operations',
  subtitle,
  onPrint,
  onDownload,
  onNewRecord,
  isGenerating = false,
  onToggleMobileMenu,
}: HeaderProps) {
  const navigate = useNavigate();
  const { currentRole } = useAuth();
  const [syncSeconds, setSyncSeconds] = useState(2);
  const [isSyncing, setIsSyncing] = useState(false);

  // Auto-refresh countdown ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSyncSeconds(prev => (prev <= 1 ? 2 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 500);
  };

  return (
    <header className="px-5 sm:px-7 py-3.5 bg-paper-50 border-b border-paper-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-20 font-body text-ink">
      
      {/* Left: Breadcrumb & Title */}
      <div className="flex items-center gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="p-1.5 rounded-md border border-paper-300 text-ink-muted hover:bg-paper-200 lg:hidden"
            title="Toggle Navigation Menu"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
        )}

        <div>
          <div className="flex items-center gap-2 text-[11px] text-ink-muted font-semibold uppercase tracking-wider font-mono">
            <span>{BRAND.SHORT_NAME}</span>
            <span>/</span>
            <span className="text-ink font-bold">{title}</span>
          </div>

          <h1 className="text-lg sm:text-xl font-black text-ink font-display tracking-tight leading-tight mt-0.5">
            {title}
          </h1>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
        
        {/* Auto-refreshing status badge */}
        <div className="hidden md:flex items-center gap-1.5 text-[11px] font-medium text-ink-muted bg-paper-100 px-2.5 py-1 rounded-md border border-paper-300 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-teal animate-pulse" />
          <span>Sync node live ({syncSeconds}s)</span>
        </div>

        {/* Export Action */}
        <button
          onClick={onDownload || onPrint || (() => navigate('/studio'))}
          disabled={isGenerating}
          className="btn-secondary py-1.5 px-3 flex items-center gap-1.5 font-display text-xs"
          title="Export CSV / Print Sheets"
        >
          <svg className="w-3.5 h-3.5 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          <span>Export</span>
        </button>

        {/* Sync Trigger */}
        <button
          onClick={handleManualSync}
          className="btn-secondary py-1.5 px-3 flex items-center gap-1.5 font-display text-xs"
          title="Sync Node Cache"
        >
          <svg className={`w-3.5 h-3.5 text-ink-muted ${isSyncing ? 'animate-spin text-teal' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          <span>Sync</span>
        </button>

        {/* Primary Action Button */}
        <button
          onClick={onNewRecord || (() => navigate('/collector'))}
          className="btn-primary py-1.5 px-3.5 flex items-center gap-1.5 font-bold font-display text-xs"
        >
          <svg className="w-3.5 h-3.5 text-teal" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>New Registration</span>
        </button>

      </div>
    </header>
  );
}
