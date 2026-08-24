import { useState, useEffect } from 'react';
import { Award } from 'lucide-react';
import { BRAND, type CARD_THEMES } from '../../design-tokens';
import type { Person } from '../../db/database';
import BrandLogo from '../shared/BrandLogo';
import { generateQrDataUrl, generateBarcodeDataUrl } from '../../engine/barcodeQr';

interface CardPreviewProps {
  person: Person | null;
  theme: typeof CARD_THEMES[number];
  layout: string;
  orientation: 'horizontal' | 'vertical';
  showQr: boolean;
  showBarcode: boolean;
  showChip: boolean;
  showSeal: boolean;
  visibleFields: Set<string>;
}

export default function CardPreview({
  person,
  theme,
  layout,
  orientation,
  showQr,
  showBarcode,
  showChip,
  showSeal,
  visibleFields,
}: CardPreviewProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string>('');

  // Dynamically generate real scannable QR and Code 128 barcode when person changes
  useEffect(() => {
    if (!person) return;
    let isMounted = true;

    generateQrDataUrl(person.idNumber, 200).then(url => {
      if (isMounted) setQrDataUrl(url);
    });

    generateBarcodeDataUrl(person.idNumber, 260, 50).then(url => {
      if (isMounted) setBarcodeDataUrl(url);
    });

    return () => {
      isMounted = false;
    };
  }, [person?.idNumber]);

  if (!person) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-ink-muted p-8 text-center bg-paper-50 rounded-lg border border-paper-300 shadow-xs font-body">
        <svg className="w-16 h-16 mb-3 text-paper-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm-3.375 3.375h.008v.008H7.125v-.008z" />
        </svg>
        <p className="text-sm font-bold text-ink font-display">No Record Selected</p>
        <p className="text-xs text-ink-muted mt-1 font-body">Select a personnel record from the directory to inspect credential rendering.</p>
      </div>
    );
  }

  const isVertical = orientation === 'vertical';

  return (
    <div className="flex flex-col h-full bg-paper-50 rounded-lg border border-paper-300 shadow-xs p-5 overflow-hidden font-body text-ink">
      
      {/* Top Header Controls */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-paper-300">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-extrabold text-ink font-display tracking-tight">Interactive ID Card Preview</h2>
          <span className="text-[10px] font-mono font-bold text-teal bg-teal-50 px-2 py-0.5 rounded border border-teal/30">
            {orientation.toUpperCase()} • CR80 (Ratio 1.586:1)
          </span>
        </div>

        {/* Flip Card Button */}
        <button
          onClick={() => setIsFlipped(!isFlipped)}
          className="btn-secondary py-1.5 px-3 flex items-center gap-1.5 font-display text-xs"
        >
          <svg className="w-3.5 h-3.5 text-ink-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          <span>{isFlipped ? 'View Front Side' : 'View Back Side'}</span>
        </button>
      </div>

      {/* Main Canvas Viewport Container */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 bg-paper-200 rounded-lg border border-paper-300 overflow-auto">
        <div
          className={`relative rounded-xl overflow-hidden shadow-xl border border-paper-400 select-none transition-all duration-300 ${
            isVertical
              ? 'w-[310px] h-[492px]'
              : 'w-[492px] h-[310px]'
          }`}
          style={{
            backgroundColor: theme.cardBg,
            borderColor: theme.border,
          }}
        >
          {!isFlipped ? (
            /* ===== FRONT SIDE ===== */
            <div className="h-full w-full flex flex-col justify-between relative overflow-hidden bg-paper-50">
              
              {/* Header Banner */}
              <div
                className="px-4 py-3 text-white flex items-center justify-between"
                style={{ background: theme.headerBg }}
              >
                <div className="flex items-center gap-2">
                  <BrandLogo size="sm" variant="light" showText={false} />
                  <div>
                    <h3 className="font-display font-black text-xs tracking-wider uppercase leading-none">
                      {BRAND.COMPANY_NAME}
                    </h3>
                    <p className="text-[8px] text-paper-300 font-mono tracking-widest mt-0.5">
                      {BRAND.TAGLINE}
                    </p>
                  </div>
                </div>

                {showSeal && (
                  <div className="w-6 h-6 rounded-full bg-paper-50/20 border border-paper-50/40 flex items-center justify-center text-white">
                    <Award className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Main Body with Portrait, Details and Real Scannable QR Code */}
              <div className="flex-1 p-4 flex items-center gap-3.5">
                
                {/* Photo frame */}
                <div className="relative flex-shrink-0">
                  <div className="w-24 h-28 rounded-lg overflow-hidden bg-paper-300 border-2 border-paper-400 shadow-sm flex items-center justify-center">
                    {person.photoDataUrl ? (
                      <img
                        src={person.photoDataUrl}
                        alt={person.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-ink-muted">
                        <span className="font-display font-bold text-2xl">
                          {person.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </span>
                        <span className="text-[8px] font-mono mt-1">NO PHOTO</span>
                      </div>
                    )}
                  </div>

                  {showChip && (
                    <div className="absolute -bottom-2 -right-2 w-7 h-5 rounded bg-amber-200 border border-amber-400 flex items-center justify-center shadow-xs">
                      <div className="w-4 h-3 border border-amber-600/50 rounded-xs grid grid-cols-2 gap-0.5 p-0.5">
                        <div className="bg-amber-600/30" />
                        <div className="bg-amber-600/30" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Personnel Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div>
                    <h4 className="font-display font-bold text-sm text-ink truncate leading-tight">
                      {person.fullName}
                    </h4>
                    <p className="text-[11px] font-semibold text-teal truncate">
                      {person.role}
                    </p>
                  </div>

                  <div className="text-[10px] space-y-0.5 pt-1 text-ink-muted font-body">
                    {visibleFields.has('department') && (
                      <p className="truncate">
                        <span className="font-bold text-ink">Dept:</span> {person.department}
                      </p>
                    )}
                    {visibleFields.has('idNumber') && (
                      <p className="font-mono">
                        <span className="font-bold text-ink">ID:</span> <span className="text-teal font-bold">{person.idNumber}</span>
                      </p>
                    )}
                    {visibleFields.has('phone') && (
                      <p className="font-mono">
                        <span className="font-bold text-ink">Tel:</span> {person.phone}
                      </p>
                    )}
                    {visibleFields.has('bloodGroup') && (
                      <p>
                        <span className="font-bold text-ink">Blood Group:</span>{' '}
                        <span className="text-stamp font-bold">{person.bloodGroup}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Real Scannable QR Code */}
                {showQr && !isVertical && (
                  <div className="flex-shrink-0 flex flex-col items-center gap-1 p-1.5 bg-paper-50 rounded-lg shadow-sm border border-paper-300">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="QR Matrix"
                        className="w-14 h-14 object-contain"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-paper-200 animate-pulse rounded" />
                    )}
                    <span className="text-[7px] font-mono text-ink font-bold uppercase">VERIFY ID</span>
                  </div>
                )}
              </div>

              {/* Bottom Footer Bar with Real Barcode */}
              <div className="px-4 py-2 bg-paper-200 border-t border-paper-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-mono text-ink-muted">
                    JOINED: {person.joinedDate}
                  </span>
                  <span className="text-[8px] font-mono text-teal font-semibold">
                    VALIDATED
                  </span>
                </div>

                {showBarcode && (
                  <div className="flex items-center h-6 bg-paper-50 px-2 py-0.5 rounded border border-paper-300">
                    {barcodeDataUrl ? (
                      <img
                        src={barcodeDataUrl}
                        alt="Code 128 Barcode"
                        className="h-full w-auto object-contain"
                      />
                    ) : (
                      <div className="h-full w-24 bg-paper-300 animate-pulse rounded" />
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ===== BACK SIDE ===== */
            <div className="h-full w-full flex flex-col justify-between p-4 relative overflow-hidden bg-paper-100 text-ink">
              <div
                className="p-2.5 rounded-md text-center shadow-xs text-white"
                style={{ background: theme.headerBg }}
              >
                <p className="text-xs font-display font-bold uppercase tracking-wider">
                  {BRAND.COMPANY_NAME} — OFFICIAL CREDENTIAL
                </p>
                <p className="text-[8px] text-paper-300 font-mono">{BRAND.TAGLINE}</p>
              </div>

              {/* Magnetic Stripe / Security info */}
              <div className="w-full h-8 bg-navy rounded my-1 flex items-center px-4 justify-between">
                <span className="text-[7px] font-mono text-paper-400">ENCODED CREDENTIAL CHIP</span>
                <span className="text-[8px] font-mono text-teal font-bold">{person.idNumber}</span>
              </div>

              <div className="text-[9px] leading-relaxed space-y-1 text-ink-muted">
                <p className="font-bold text-ink">Security & Operational Terms:</p>
                <p>1. This credential card remains the property of the issuing authority.</p>
                <p>2. If found, return immediately to security operations or administration.</p>
                <p className="pt-0.5">
                  <strong className="text-ink">Operations Desk:</strong> {BRAND.PHONE} • {BRAND.EMAIL}
                </p>
              </div>

              <div className="pt-2 border-t border-paper-300 flex items-center justify-between text-ink-muted">
                <div className="text-[8px] font-mono">
                  SERIAL: {person.idNumber}
                </div>
                <div className="text-[9px] font-bold text-teal font-mono">
                  AUTHENTICATED
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
