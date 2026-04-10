'use client';

import { useEffect, useState, useRef } from 'react';

interface TopDownNotificationProps {
  message: string;
  onClick: () => void;
  onDismiss: () => void;
  /** Auto-dismiss delay in ms. Default: 10000 */
  duration?: number;
}

/**
 * A slide-in-from-top notification banner.
 * Slides in on mount, auto-dismisses after `duration` ms unless hovered.
 * Tapping fires `onClick` and then dismisses.
 */
export function TopDownNotification({
  message,
  onClick,
  onDismiss,
  duration = 10000,
}: TopDownNotificationProps) {
  const [visible, setVisible] = useState(false);
  const hoveredRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 350);
  };

  const startTimer = () => {
    timerRef.current = setTimeout(() => {
      if (!hoveredRef.current) dismiss();
    }, duration);
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    startTimer();
    return () => clearTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`fixed left-4 right-4 z-50 mx-auto max-w-lg transition-all duration-300 ease-out ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
      style={{ top: '4.5rem' /* below typical header nav */ }}
      onMouseEnter={() => {
        hoveredRef.current = true;
        clearTimer();
      }}
      onMouseLeave={() => {
        hoveredRef.current = false;
        startTimer();
      }}
    >
      <div className="flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl border border-warm-200 bg-warm-50 shadow-lg">
        {/* Saffron accent bar */}
        <div className="w-1 self-stretch bg-saffron-500 shrink-0" />
        {/* Clickable area to navigate */}
        <button
          type="button"
          onClick={() => {
            onClick();
            dismiss();
          }}
          className="flex min-w-0 flex-1 items-center gap-2 py-3 text-left focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-1"
        >
          <span className="shrink-0 text-xl text-saffron-500" aria-hidden="true">
            ✓
          </span>
          <span className="truncate text-sm font-semibold text-charcoal-900">{message}</span>
        </button>
        {/* Dismiss button */}
        <button
          type="button"
          aria-label="Dismiss"
          onClick={dismiss}
          className="mr-3 shrink-0 text-charcoal-500 hover:text-charcoal-900 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-1"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
