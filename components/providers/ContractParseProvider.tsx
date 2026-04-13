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

  // Cleanup on unmount: cancel any pending timer and release the reader
  useEffect(() => {
    return () => {
      if (clearTimerRef.current) {
        clearTimeout(clearTimerRef.current);
      }
      const reader = readerRef.current;
      if (reader) {
        reader.cancel().catch(() => {
          // Ignore errors on cleanup
        });
        readerRef.current = null;
      }
    };
  }, []);

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

      // Drain the SSE stream asynchronously
      async function drainStream() {
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

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
                  clearTimerRef.current = setTimeout(() => {
                    setActiveJob(null);
                    clearTimerRef.current = null;
                  }, 5000);
                  readerRef.current = null;
                  return;
                }

                setActiveJob((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    progress: typeof msg.progress === 'number' ? msg.progress : prev.progress,
                    step: msg.step ?? prev.step,
                    message: msg.message ?? prev.message,
                  };
                });

                if (msg.step === 'done') {
                  setActiveJob((prev) =>
                    prev ? { ...prev, status: 'done', progress: 100 } : prev
                  );
                  toast.success('Contract parsed successfully');
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
        } catch (err) {
          // Stream was cancelled (e.g. component unmount) — do not surface as error
          if (err instanceof Error && err.name === 'AbortError') return;

          const errText = err instanceof Error ? err.message : 'Processing failed';
          setActiveJob((prev) =>
            prev ? { ...prev, status: 'error', errorMessage: errText } : prev
          );
          toast.error(`Contract parsing failed: ${errText}`);
          clearTimerRef.current = setTimeout(() => {
            setActiveJob(null);
            clearTimerRef.current = null;
          }, 5000);
          readerRef.current = null;
        }
      }

      void drainStream();
    },
    [toast]
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
