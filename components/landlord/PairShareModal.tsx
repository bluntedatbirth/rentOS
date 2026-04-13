'use client';

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useI18n } from '@/lib/i18n/context';

interface PairShareModalProps {
  pairCode: string;
  qrUrl: string;
  propertyName: string;
  onClose: () => void;
}

export function PairShareModal({ pairCode, qrUrl, propertyName, onClose }: PairShareModalProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Prevent body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(pairCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select text
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('pairing.share_title').replace('{property}', propertyName),
          text: t('pairing.share_text').replace('{code}', pairCode),
          url: qrUrl,
        });
        return;
      } catch {
        // User cancelled or share failed — fall through to copy
      }
    }
    // Fallback: copy the link
    try {
      await navigator.clipboard.writeText(qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently ignore
    }
  }

  function handleOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={t('pairing.share_modal_title')}
    >
      {/* Card */}
      <div className="relative w-full max-w-sm rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-charcoal-400 hover:bg-warm-100 hover:text-charcoal-700"
          aria-label={t('common.close')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        <h2 className="mb-1 text-base font-semibold text-charcoal-900">
          {t('pairing.share_modal_title')}
        </h2>
        <p className="mb-5 text-xs text-charcoal-500">{propertyName}</p>

        {/* QR code */}
        <div className="mb-5 flex justify-center">
          <div className="rounded-xl border border-warm-200 bg-white p-3 shadow-sm">
            <QRCodeSVG value={qrUrl} size={240} />
          </div>
        </div>

        {/* Pair code — tap to copy */}
        <div className="mb-5">
          <p className="mb-1 text-xs font-medium text-charcoal-500">{t('pairing.code_label')}</p>
          <button
            type="button"
            onClick={handleCopy}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-warm-200 bg-warm-50 px-4 py-3 text-left hover:bg-warm-100 active:scale-[0.99]"
            title={t('pairing.tap_to_copy')}
          >
            <span className="font-mono text-2xl font-bold tracking-widest text-charcoal-900">
              {pairCode}
            </span>
            <span className="shrink-0 text-xs font-medium text-saffron-600">
              {copied ? t('pairing.copied') : t('pairing.tap_to_copy')}
            </span>
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 min-h-[44px] rounded-xl bg-saffron-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-saffron-600 active:scale-[0.98]"
          >
            {t('pairing.share_button')}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="min-h-[44px] rounded-xl border border-warm-200 px-4 py-2.5 text-sm font-medium text-charcoal-700 hover:bg-warm-50 active:scale-[0.98]"
          >
            {copied ? t('pairing.copied') : t('pairing.copy_code')}
          </button>
        </div>
      </div>
    </div>
  );
}
