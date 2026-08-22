interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  maxWidth?: string;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  maxWidth,
}: ModalProps) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const widthClass = maxWidth || sizeClasses[size];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none font-body text-ink">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy/70 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className={`relative w-full ${widthClass} bg-paper-50 rounded-lg shadow-2xl border border-paper-300 animate-scale-in overflow-hidden`}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-paper-300 bg-paper-100/60">
            <h2 className="text-sm font-extrabold text-ink font-display">{title}</h2>
            <button onClick={onClose} className="p-1 rounded text-ink-muted hover:text-ink hover:bg-paper-200">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
