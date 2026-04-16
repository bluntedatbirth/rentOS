'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertCircle, CheckCircle, Loader2, Upload } from 'lucide-react';
import { FEATURE_CONTRACT_GENERATE } from '@/lib/features';
import { useI18n } from '@/lib/i18n/context';
import { useContractParse } from '@/components/providers/ContractParseProvider';
import { createClient } from '@/lib/supabase/client';

// ── Types ──────────────────────────────────────────────────────────────────

type PageState = 'ready' | 'uploading' | 'started' | 'done' | 'error';

interface UploadResponse {
  contract_id: string;
  storage_path: string;
  file_type: 'image' | 'pdf';
  property_id: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// ── Component ──────────────────────────────────────────────────────────────

export default function ContractUploadPage() {
  if (!FEATURE_CONTRACT_GENERATE) notFound();

  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { activeJob, startParse } = useContractParse();

  const propertyIdParam = searchParams.get('property_id') ?? undefined;

  const [pageState, setPageState] = useState<PageState>('ready');
  const [propertyName, setPropertyName] = useState<string | null>(null);
  const [startedContractId, setStartedContractId] = useState<string | null>(null);
  const [doneContractId, setDoneContractId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hasActiveContract, setHasActiveContract] = useState(false);
  const [activeContractId, setActiveContractId] = useState<string | null>(null);
  // Block the form while the active-contract check is in-flight so the user
  // can't race ahead and select a file before we know if the guard should fire.
  const [guardChecking, setGuardChecking] = useState(!!propertyIdParam);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch property name + check for existing active/pending contract
  useEffect(() => {
    if (!propertyIdParam) {
      setGuardChecking(false);
      return;
    }

    const supabase = createClient();
    supabase
      .from('properties')
      .select('name')
      .eq('id', propertyIdParam)
      .single()
      .then(({ data }) => {
        if (data?.name) setPropertyName(data.name);
      });

    // Guard: block upload if property already has an active/pending/scheduled contract
    Promise.resolve(
      supabase
        .from('contracts')
        .select('id, status')
        .eq('property_id', propertyIdParam)
        .in('status', ['active', 'pending', 'scheduled'])
        .limit(1)
    )
      .then(({ data }) => {
        if (data && data.length > 0) {
          setHasActiveContract(true);
          setActiveContractId(data[0]!.id);
        }
      })
      .catch(() => {
        // Silent — server guard will catch it anyway
      })
      .finally(() => setGuardChecking(false));
  }, [propertyIdParam]);

  // Watch activeJob for completion/error when user stays on page after parse started
  useEffect(() => {
    if (pageState !== 'started') return;
    if (!activeJob) return;

    if (activeJob.status === 'done') {
      setDoneContractId(activeJob.contractId);
      setPageState('done');
    } else if (activeJob.status === 'error') {
      setErrorMessage(activeJob.errorMessage ?? 'Processing failed');
      setPageState('error');
    }
  }, [activeJob, pageState]);

  // Auto-redirect after done
  useEffect(() => {
    if (pageState === 'done' && doneContractId) {
      const timer = setTimeout(() => {
        router.push(`/landlord/contracts/${doneContractId}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [pageState, doneContractId, router]);

  // ── File validation ──────────────────────────────────────────────────────

  function validateFile(file: File): string | null {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return t('contract.upload_bad_type');
    }
    if (file.size > MAX_SIZE_BYTES) {
      return t('contract.upload_file_too_large');
    }
    return null;
  }

  // ── Upload + SSE pipeline ────────────────────────────────────────────────

  async function processFile(file: File) {
    // Double-check the guard even if the UI hides the form — the user may
    // have dropped a file before the async check completed.
    if (hasActiveContract) {
      setFileError(t('contract.upload_active_exists'));
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setFileError(validationError);
      return;
    }
    setFileError(null);

    // Step 1: upload file
    setPageState('uploading');

    let uploadData: UploadResponse;
    try {
      const form = new FormData();
      form.append('file', file);
      if (propertyIdParam) form.append('property_id', propertyIdParam);

      const res = await fetch('/api/contracts/upload', {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        let detail = `Upload failed (${res.status})`;
        try {
          const json = (await res.json()) as { error?: string; message?: string };
          if (json.error === 'property_has_active_contract') {
            detail = t('contract.upload_active_exists');
          } else {
            detail = json.error ?? json.message ?? detail;
          }
        } catch {
          // ignore
        }
        throw new Error(detail);
      }

      uploadData = (await res.json()) as UploadResponse;
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed');
      setPageState('error');
      return;
    }

    // Step 2: kick off AI extraction — get SSE response
    let sseRes: Response;
    try {
      sseRes = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_id: uploadData.contract_id,
          file_type: uploadData.file_type,
        }),
      });

      if (!sseRes.ok || !sseRes.body) {
        // Parse the error body so we can surface the daily-limit "try again in
        // 24 hours" copy rather than a bare status code.
        let friendly = `OCR request failed (${sseRes.status})`;
        try {
          const body = (await sseRes.json()) as {
            error?: string;
            reason?: string;
            dailyLimit?: number;
            retryAfterSeconds?: number;
          };
          if (sseRes.status === 429 || body.error === 'ai_unavailable') {
            // Any rate-limit reason — show reset time
            const retryHours = body.retryAfterSeconds
              ? Math.max(1, Math.ceil(body.retryAfterSeconds / 3600))
              : 24;
            friendly = t('ocr.error_daily_limit')
              .replace('{limit}', body.dailyLimit ? String(body.dailyLimit) : '')
              .replace('{hours}', String(retryHours));
          }
        } catch {
          // Not JSON — keep the default
        }
        throw new Error(friendly);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Processing failed');
      setPageState('error');
      return;
    }

    // Hand off the reader to the global context — SSE continues even if user navigates away
    const reader = sseRes.body.getReader();
    startParse(uploadData.contract_id, propertyIdParam ?? null, reader);
    setStartedContractId(uploadData.contract_id);
    setPageState('started');
  }

  // ── Event handlers ───────────────────────────────────────────────────────

  function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return;
    void processFile(files[0]!);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handleFileSelect(e.target.files);
    // Reset so same file can be selected again after error
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleReset() {
    setPageState('ready');
    setErrorMessage(null);
    setFileError(null);
    setDoneContractId(null);
    setStartedContractId(null);
  }

  // Derive progress display from the global job (only when user stays on page)
  const jobProgress = activeJob?.contractId === startedContractId ? activeJob : null;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      {/* Page header */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/landlord/contracts"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-warm-200 bg-white text-charcoal-400 hover:bg-warm-100 dark:border-white/10 dark:bg-charcoal-800 dark:text-white/40 dark:hover:bg-white/10"
          aria-label={t('common.back')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path
              fillRule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-charcoal-900 dark:text-white">
            {t('contract.upload_title')}
          </h1>
          <p className="mt-0.5 text-sm text-charcoal-500 dark:text-white/50">
            {t('contract.upload_subtitle')}
          </p>
        </div>
      </div>

      {/* Property banner */}
      {propertyName && (
        <div className="mb-4 rounded-xl border border-saffron-200 bg-saffron-50 px-4 py-2.5 text-sm font-medium text-saffron-800 dark:bg-saffron-500/10 dark:border-saffron-500/20 dark:text-saffron-300">
          For property: {propertyName}
        </div>
      )}

      {/* Guard: property already has an active/pending contract */}
      {hasActiveContract && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-4 dark:border-red-500/20 dark:bg-red-500/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                {t('contract.upload_active_exists')}
              </p>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400/80">
                {t('contract.upload_active_exists_hint')}
              </p>
              {activeContractId && (
                <Link
                  href={`/landlord/contracts/${activeContractId}`}
                  className="mt-2 inline-block text-xs font-medium text-saffron-600 hover:underline"
                >
                  {t('contract.upload_view_existing')} →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main card */}
      <div className="rounded-2xl border border-warm-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-charcoal-800 dark:shadow-black/20">
        {/* ── STATE: READY ── */}
        {guardChecking && (
          <div className="flex items-center justify-center py-14">
            <Loader2 className="h-6 w-6 animate-spin text-charcoal-300 dark:text-white/30" />
          </div>
        )}
        {pageState === 'ready' && !hasActiveContract && !guardChecking && (
          <>
            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              aria-label={t('contract.upload_dropzone_hint')}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
                isDragging
                  ? 'border-saffron-400 bg-saffron-50 dark:bg-saffron-500/10'
                  : 'border-warm-300 bg-warm-50 hover:border-saffron-300 hover:bg-saffron-50 dark:border-white/15 dark:bg-charcoal-900 dark:hover:border-saffron-400 dark:hover:bg-saffron-500/10'
              }`}
            >
              <Upload
                className={`mb-4 h-10 w-10 transition-colors ${
                  isDragging ? 'text-saffron-500' : 'text-charcoal-300 dark:text-white/40'
                }`}
              />
              <p className="text-sm text-charcoal-600 dark:text-white/60">
                {t('contract.upload_dropzone_hint')}{' '}
                <span className="font-semibold text-saffron-600 hover:text-saffron-700">
                  {t('contract.upload_browse')}
                </span>
              </p>
              <p className="mt-2 text-xs text-charcoal-400 dark:text-white/40">
                {t('contract.upload_formats')}
              </p>
            </div>

            {/* File error */}
            {fileError && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/15 dark:text-red-400">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            {/* Hidden input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleInputChange}
            />
          </>
        )}

        {/* ── STATE: UPLOADING ── */}
        {pageState === 'uploading' && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-saffron-500" />
            <p className="text-sm font-medium text-charcoal-700 dark:text-white/70">
              {t('contract.uploading')}
            </p>
          </div>
        )}

        {/* ── STATE: STARTED ── */}
        {pageState === 'started' && startedContractId && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            {/* Pulse ring */}
            <div className="relative mb-6">
              <span className="absolute inset-0 animate-ping rounded-full bg-saffron-200 opacity-60 dark:bg-saffron-500/30" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-saffron-100 dark:bg-saffron-500/15">
                <Loader2 className="h-7 w-7 animate-spin text-saffron-600" />
              </div>
            </div>

            <h2 className="mb-2 text-lg font-bold text-charcoal-900 dark:text-white">
              {t('ocr.parse_started')}
            </h2>
            <p className="mb-6 text-sm text-charcoal-500 dark:text-white/50">
              {t('ocr.parse_started_desc')}
            </p>

            {/* Live progress bar — visible when user stays on page */}
            {jobProgress && jobProgress.status === 'parsing' && (
              <div className="mb-6 w-full max-w-xs">
                <p className="mb-3 text-sm text-charcoal-600 dark:text-white/60">
                  {jobProgress.message ? t(jobProgress.message) : t('ocr.parsing_contract')}
                </p>
                <div className="mb-1.5 flex justify-between text-xs text-charcoal-400 dark:text-white/40">
                  <span>{Math.round(jobProgress.progress)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-warm-200 dark:bg-charcoal-700">
                  <div
                    className="h-full rounded-full bg-saffron-500 transition-all duration-500 ease-out"
                    style={{ width: `${jobProgress.progress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/landlord/properties"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-saffron-500 px-5 text-sm font-semibold text-white hover:bg-saffron-600"
              >
                {t('ocr.back_to_properties')} →
              </Link>
            </div>
          </div>
        )}

        {/* ── STATE: DONE ── */}
        {pageState === 'done' && doneContractId && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-500/15">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mb-1 text-lg font-bold text-charcoal-900 dark:text-white">
              {t('contract.done_title')}
            </h2>
            <p className="mb-6 text-sm text-charcoal-500 dark:text-white/50">
              {t('contract.done_subtitle')}
            </p>
            <Link
              href={`/landlord/contracts/${doneContractId}`}
              className="inline-flex min-h-[44px] items-center rounded-xl bg-saffron-500 px-6 text-sm font-semibold text-white hover:bg-saffron-600"
            >
              {t('contract.view_results')}
            </Link>
          </div>
        )}

        {/* ── STATE: ERROR ── */}
        {pageState === 'error' && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/15">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="mb-1 text-lg font-bold text-charcoal-900 dark:text-white">
              {t('contract.upload_error_title')}
            </h2>
            {errorMessage && (
              <p className="mb-6 max-w-xs text-sm text-charcoal-500 dark:text-white/50">
                {errorMessage}
              </p>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex min-h-[44px] items-center rounded-xl bg-saffron-500 px-6 text-sm font-semibold text-white hover:bg-saffron-600"
            >
              {t('contract.upload_try_again')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
