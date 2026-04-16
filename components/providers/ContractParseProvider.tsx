'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useToast } from '@/components/ui/ToastProvider';

// ── Types ──────────────────────────────────────────────────────────────────

export interface ParseJob {
  contractId: string;
  propertyId: string | null;
  progress: number;
  step: string;
  message: string;
  status: 'parsing' | 'done' | 'error';
  errorMessage?: string;
}

interface SseMessage {
  step: string;
  progress?: number;
  message?: string;
  contract_id?: string;
  error?: string;
}

interface ContractParseContextType {
  activeJob: ParseJob | null;
  startParse: (
    contractId: string,
    propertyId: string | null,
    reader: ReadableStreamDefaultReader<Uint8Array>
  ) => void;
  clearJob: () => void;
}

// ── Wake Lock types (minimal — lib.dom doesn't always include them) ────────

interface WakeLockSentinel {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
}
interface WakeLockNavigator {
  wakeLock?: {
    request: (type: 'screen') => Promise<WakeLockSentinel>;
  };
}

// ── Poll parse status after an SSE disconnect ──────────────────────────────

/**
 * Poll the server for the contract's final parse status. Used after the SSE
 * stream dies (mobile screen lock, network drop) — the Vercel OCR function
 * keeps running server-side, so we can recover by checking the DB.
 *
 * Polls every 4s for up to 5 minutes (matches OCR maxDuration=300).
 * Returns 'done' on success, 'parse_failed' on explicit failure, or
 * 'timeout' if the parse never finishes within the window.
 */
async function pollParseStatus(contractId: string): Promise<'done' | 'parse_failed' | 'timeout'> {
  const deadline = Date.now() + 5 * 60 * 1000; // 5 minutes
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`/api/contracts/${contractId}/parse-status`);
      if (res.ok) {
        const data = (await res.json()) as { status: 'parsing' | 'done' | 'parse_failed' };
        if (data.status === 'done') return 'done';
        if (data.status === 'parse_failed') return 'parse_failed';
      }
    } catch {
      // Network still flaky — keep trying
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  return 'timeout';
}

// ── Progress creep caps (below next milestone to avoid overshoot) ──────────

// Server emits discrete milestones: downloading(5) → pass1(15) → pass2(40)
// → saving(85) → done(100). To smooth the long silent gaps during Claude
// Pass 1 (~60s) and Pass 2 (~120s), we creep progress upward between
// milestones, capped a bit below the next one.
const STEP_PROGRESS_CAP: Record<string, number> = {
  downloading: 13,
  pass1: 38, // capped below pass2 milestone (40)
  pass2: 83, // capped below saving milestone (85)
  saving: 98, // capped below done (100)
};

// ── Context ────────────────────────────────────────────────────────────────

const ContractParseContext = createContext<ContractParseContextType | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────

export function ContractParseProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [activeJob, setActiveJob] = useState<ParseJob | null>(null);

  // Keep the reader in a ref to avoid stale closures and allow cleanup on unmount
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  // Track auto-clear timers so we can cancel on unmount
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Progress creep tick so the bar doesn't stall between server milestones
  const creepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Screen Wake Lock so the phone doesn't lock mid-parse and kill the SSE stream
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // ── Wake Lock helpers ────────────────────────────────────────────────────

  const releaseWakeLock = useCallback(() => {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    if (lock && !lock.released) {
      lock.release().catch(() => {
        // Ignore — best-effort
      });
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined') return;
    const nav = navigator as unknown as WakeLockNavigator;
    if (!nav.wakeLock) return; // Unsupported browser — silent no-op
    try {
      const lock = await nav.wakeLock.request('screen');
      wakeLockRef.current = lock;
      lock.addEventListener('release', () => {
        if (wakeLockRef.current === lock) {
          wakeLockRef.current = null;
        }
      });
    } catch {
      // Request can fail (page not visible, user denied) — silent no-op
    }
  }, []);

  // Re-request wake lock when tab becomes visible again (locks drop on hide)
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState !== 'visible') return;
      if (!wakeLockRef.current && activeJob?.status === 'parsing') {
        void requestWakeLock();
      }
    }
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [activeJob?.status, requestWakeLock]);

  // ── Progress creep ───────────────────────────────────────────────────────

  const stopCreep = useCallback(() => {
    if (creepTimerRef.current) {
      clearInterval(creepTimerRef.current);
      creepTimerRef.current = null;
    }
  }, []);

  const startCreep = useCallback(() => {
    stopCreep();
    // Tick every 1s, ease progress toward the current step's cap.
    creepTimerRef.current = setInterval(() => {
      setActiveJob((prev) => {
        if (!prev || prev.status !== 'parsing') return prev;
        const cap = STEP_PROGRESS_CAP[prev.step] ?? prev.progress;
        if (prev.progress >= cap) return prev;
        // Ease: close 3% of remaining gap per tick (slower as it approaches cap)
        const next = prev.progress + Math.max(0.2, (cap - prev.progress) * 0.03);
        return { ...prev, progress: Math.min(next, cap) };
      });
    }, 1000);
  }, [stopCreep]);

  // Cleanup on unmount: cancel any pending timer and release the reader
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
      stopCreep();
      releaseWakeLock();
      const reader = readerRef.current;
      if (reader) {
        reader.cancel().catch(() => {
          // Ignore errors on cleanup
        });
        readerRef.current = null;
      }
    };
  }, [stopCreep, releaseWakeLock]);

  const clearJob = useCallback(() => {
    setActiveJob(null);
  }, []);

  const startParse = useCallback(
    (
      contractId: string,
      propertyId: string | null,
      reader: ReadableStreamDefaultReader<Uint8Array>
    ) => {
      // Cancel any existing reader before starting a new job
      if (readerRef.current) {
        readerRef.current.cancel().catch(() => {});
      }
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
      stopCreep();

      readerRef.current = reader;

      // Set initial job state
      setActiveJob({
        contractId,
        propertyId,
        progress: 0,
        step: 'downloading',
        message: '',
        status: 'parsing',
      });

      // Keep the screen awake while parsing so the SSE stream doesn't die
      void requestWakeLock();

      // Start the creep ticker so the bar moves between milestones
      startCreep();

      // Drain the SSE stream asynchronously
      async function drainStream() {
        const decoder = new TextDecoder();
        let buffer = '';

        // If we ever hit `done: true` on the reader without having received
        // a `done` or `error` event from the server, fall through to the
        // same polling recovery as the catch branch below.
        let streamClosedCleanly = false;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              streamClosedCleanly = true;
              break;
            }

            buffer += decoder.decode(value, { stream: true });

            // Split on double-newlines (SSE event boundaries)
            const parts = buffer.split('\n\n');
            buffer = parts.pop() ?? '';

            for (const part of parts) {
              for (const line of part.split('\n')) {
                if (!line.startsWith('data: ')) continue;
                const jsonStr = line.slice('data: '.length).trim();
                if (!jsonStr) continue;

                let msg: SseMessage;
                try {
                  msg = JSON.parse(jsonStr) as SseMessage;
                } catch {
                  continue;
                }

                if (msg.step === 'error') {
                  const errText = msg.error ?? 'Processing failed';
                  setActiveJob((prev) =>
                    prev ? { ...prev, status: 'error', errorMessage: errText } : prev
                  );
                  toast.error(`Contract parsing failed: ${errText}`);
                  stopCreep();
                  releaseWakeLock();
                  clearTimerRef.current = setTimeout(() => {
                    setActiveJob(null);
                    clearTimerRef.current = null;
                  }, 5000);
                  readerRef.current = null;
                  return;
                }

                setActiveJob((prev) => {
                  if (!prev) return prev;
                  // Never let a server milestone drag progress backwards
                  // (the creep may have pushed us past the raw milestone value).
                  const targetProgress =
                    typeof msg.progress === 'number'
                      ? Math.max(msg.progress, prev.progress)
                      : prev.progress;
                  return {
                    ...prev,
                    progress: targetProgress,
                    step: msg.step ?? prev.step,
                    message: msg.message ?? prev.message,
                  };
                });

                if (msg.step === 'done') {
                  setActiveJob((prev) =>
                    prev ? { ...prev, status: 'done', progress: 100 } : prev
                  );
                  toast.success('Contract parsed successfully');
                  stopCreep();
                  releaseWakeLock();
                  clearTimerRef.current = setTimeout(() => {
                    setActiveJob(null);
                    clearTimerRef.current = null;
                  }, 3000);
                  readerRef.current = null;
                  return;
                }
              }
            }
          }
          // Stream closed without us ever seeing a terminal event — the
          // SSE connection dropped silently (common on mobile suspend).
          // Fall through to the same polling recovery as the catch block.
          if (streamClosedCleanly) {
            throw new Error('Stream closed without terminal event');
          }
        } catch (err) {
          // Stream was cancelled (e.g. component unmount) — do not surface as error
          if (err instanceof Error && err.name === 'AbortError') return;

          // SSE stream died (mobile screen lock, network hiccup, etc.) but
          // the Vercel OCR function keeps running server-side. Poll the DB
          // to find out whether the parse ultimately succeeded or failed
          // before giving up and surfacing an error to the user.
          const finalStatus = await pollParseStatus(contractId);
          if (finalStatus === 'done') {
            setActiveJob((prev) => (prev ? { ...prev, status: 'done', progress: 100 } : prev));
            toast.success('Contract parsed successfully');
            stopCreep();
            releaseWakeLock();
            clearTimerRef.current = setTimeout(() => {
              setActiveJob(null);
              clearTimerRef.current = null;
            }, 3000);
            readerRef.current = null;
            return;
          }

          const errText =
            finalStatus === 'parse_failed'
              ? 'Parse failed'
              : err instanceof Error
                ? err.message
                : 'Processing failed';
          setActiveJob((prev) =>
            prev ? { ...prev, status: 'error', errorMessage: errText } : prev
          );
          toast.error(`Contract parsing failed: ${errText}`);
          stopCreep();
          releaseWakeLock();
          clearTimerRef.current = setTimeout(() => {
            setActiveJob(null);
            clearTimerRef.current = null;
          }, 5000);
          readerRef.current = null;
        }
      }

      void drainStream();
    },
    [toast, requestWakeLock, releaseWakeLock, startCreep, stopCreep]
  );

  return (
    <ContractParseContext.Provider value={{ activeJob, startParse, clearJob }}>
      {children}
    </ContractParseContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useContractParse() {
  const context = useContext(ContractParseContext);
  if (!context) {
    throw new Error('useContractParse must be used within a ContractParseProvider');
  }
  return context;
}
