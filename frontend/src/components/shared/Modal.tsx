import React from 'react';
import { X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none font-sans text-xs">
      {/* Backdrop with dark blur */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      />

      {/* Modal Card - Styled with Dark/Light Theme CSS Variables */}
      <div
        className={`relative w-full ${widthClass} rounded-2xl shadow-2xl border animate-scale-in overflow-hidden z-10`}
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-primary)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Header */}
        {title && (
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <h2 className="text-sm font-bold tracking-tight text-[var(--text-primary)]">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
