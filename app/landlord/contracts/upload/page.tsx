'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';
import { ProRibbon } from '@/components/ui/ProRibbon';
import { useToast } from '@/components/ui/ToastProvider';

const supabase = createClient();

interface Property {
  id: string;
  name: string;
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

export default function ContractUploadPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('auto');
  const [state, setState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stepMessage, setStepMessage] = useState('');

  // Load properties
  useEffect(() => {
    if (!user) return;
    const loadProperties = async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, name')
        .eq('landlord_id', user.id)
        .eq('is_active', true);
      if (data) {
        setProperties(data);
      }
    };
    loadProperties();
  }, [user]);

  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
        setErrorMessage(t('upload.error_type'));
        return;
      }
      if (selectedFile.size > MAX_SIZE) {
        setErrorMessage(t('upload.error_size'));
        return;
      }
      setFile(selectedFile);
      setErrorMessage('');

      if (selectedFile.type.startsWith('image/')) {
        const url = URL.createObjectURL(selectedFile);
        setPreview(url);
      } else {
        setPreview(null);
      }
    },
    [t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFileSelect(dropped);
    },
    [handleFileSelect]
  );

  const handleUploadAndProcess = async () => {
    if (!file || !user) return;

    setState('uploading');
    setErrorMessage('');
    setProgress(0);
    setStepMessage(t('ocr.step_uploading'));

    try {
      // Step 1: Upload file + create contract via server API
      const formData = new FormData();
      formData.append('file', file);
      formData.append('property_id', selectedProperty);

      const uploadRes = await fetch('/api/contracts/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? t('upload.error'));
      }

      const { contract_id, storage_path, file_type } = (await uploadRes.json()) as {
        contract_id: string;
        storage_path: string;
        file_type: string;
      };

      // Step 2: Start OCR with SSE progress
      setState('processing');
      setProgress(5);

      const ocrResponse = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract_id, file_url: storage_path, file_type }),
      });

      if (!ocrResponse.ok || !ocrResponse.body) {
        // Delete the contract row immediately — no lingering parse_failed rows
        try {
          await supabase.from('contracts').delete().eq('id', contract_id);
        } catch (deleteErr) {
          console.error('[Upload] Failed to delete contract after OCR failure:', deleteErr);
        }
        toast.error(t('contracts.parse_failed_toast'));
        setState('idle');
        return;
      }

      // Read SSE stream
      const reader = ocrResponse.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = '';
      let finalContractId = contract_id;
      let parseFailed = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const sseData = JSON.parse(line.slice(6)) as {
              step: string;
              progress?: number;
              message?: string;
              error?: string;
              contract_id?: string;
            };

            if (sseData.progress != null) setProgress(sseData.progress);
            if (sseData.message) setStepMessage(t(sseData.message));

            if (sseData.step === 'error') {
              parseFailed = true;
              // Delete the contract row immediately — no lingering parse_failed rows
              supabase
                .from('contracts')
                .delete()
                .eq('id', contract_id)
                .then(({ error }) => {
                  if (error)
                    console.error('[Upload] Failed to delete contract after SSE error:', error);
                });
              toast.error(t('contracts.parse_failed_toast'));
              setState('idle');
              return;
            }

            if (sseData.step === 'done') {
              finalContractId = sseData.contract_id ?? contract_id;
            }
          } catch (e) {
            if (e instanceof Error && !parseFailed) throw e;
          }
        }
      }

      if (parseFailed) return;

      setState('success');
      setProgress(100);
      setStepMessage(t('ocr.step_done'));

      setTimeout(() => {
        router.push(`/landlord/contracts/${finalContractId}`);
      }, 1500);
    } catch (err) {
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : t('upload.error'));
    }
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('upload.title')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('upload.description')}</p>
        </div>
        <Link
          href="/landlord/contracts/create"
          className="relative overflow-hidden shrink-0 min-h-[36px] flex items-center rounded-lg border border-saffron-300 px-3 py-1.5 text-xs font-medium text-saffron-600 hover:bg-saffron-50"
        >
          {t('upload.or_create_ai')}
          <ProRibbon size="sm" />
        </Link>
      </div>

      {/* Property selector */}
      <div className="mb-6">
        <label htmlFor="property" className="mb-1 block text-sm font-medium text-gray-700">
          {t('upload.select_property')}
        </label>
        <select
          id="property"
          value={selectedProperty}
          onChange={(e) => setSelectedProperty(e.target.value)}
          className="block w-full rounded-lg border border-warm-200 px-3 py-2.5 text-sm text-charcoal-900 focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
        >
          <option value="auto">🔍 {t('upload.auto_detect_property')}</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        {selectedProperty === 'auto' && (
          <p className="mt-1 text-xs text-saffron-600">{t('upload.auto_detect_hint')}</p>
        )}
      </div>

      {/* Processing state */}
      {state === 'processing' && (
        <div className="mb-6 flex flex-col items-center rounded-lg border border-saffron-200 bg-saffron-50 p-8">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-saffron-500 border-t-transparent" />
          <p className="text-lg font-semibold text-saffron-900">{stepMessage}</p>
          <div className="mt-4 w-full max-w-xs">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-saffron-200">
              <div
                className="h-full rounded-full bg-saffron-500 transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs text-saffron-600">{progress}%</p>
          </div>
          <p className="mt-4 text-center text-xs text-charcoal-500">
            {t('upload.background_note')}
          </p>
          <button
            type="button"
            onClick={() => {
              readerRef.current?.cancel().catch(() => {});
              router.push('/landlord/contracts');
            }}
            className="mt-3 min-h-[44px] rounded-lg border border-saffron-300 px-4 py-2 text-sm font-medium text-saffron-700 hover:bg-saffron-100"
          >
            {t('upload.continue_browsing')}
          </button>
        </div>
      )}

      {/* Success state */}
      {state === 'success' && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-lg font-semibold text-green-900">{t('upload.success')}</p>
        </div>
      )}

      {/* Error state */}
      {state === 'error' && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-900">{t('upload.error')}</p>
          {errorMessage && <p className="mt-1 text-sm text-red-700">{errorMessage}</p>}
          <button
            type="button"
            onClick={() => {
              setState('idle');
              setErrorMessage('');
            }}
            className="mt-3 min-h-[44px] rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            {t('upload.retry')}
          </button>
        </div>
      )}

      {/* Upload area - only show when idle */}
      {(state === 'idle' || state === 'uploading') && (
        <>
          {/* Drag and drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`mb-4 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              dragOver ? 'border-saffron-500 bg-saffron-50' : 'border-warm-200 bg-warm-50'
            }`}
          >
            {file ? (
              <div>
                {preview && (
                  <img // eslint-disable-line @next/next/no-img-element
                    src={preview}
                    alt="Contract preview"
                    className="mx-auto mb-3 max-h-48 rounded-lg object-contain"
                  />
                )}
                <p className="text-sm font-medium text-gray-900">
                  {t('upload.file_selected')}: {file.name}
                </p>
                <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                <button
                  type="button"
                  onClick={removeFile}
                  className="mt-2 min-h-[44px] text-sm font-medium text-red-600 hover:text-red-700"
                >
                  {t('upload.remove_file')}
                </button>
              </div>
            ) : (
              <div>
                <p className="mb-2 text-sm text-gray-600">{t('upload.drag_drop')}</p>
                <p className="mb-3 text-xs text-gray-400">{t('upload.or')}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[44px] rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-300 hover:bg-gray-50"
                >
                  {t('upload.browse')}
                </button>
                <p className="mt-3 text-xs text-gray-400">{t('upload.supported')}</p>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) handleFileSelect(selected);
            }}
          />

          {errorMessage && state === 'idle' && (
            <p className="mb-4 text-sm text-red-600">{errorMessage}</p>
          )}

          {/* Upload button */}
          <button
            type="button"
            disabled={!file || state === 'uploading'}
            onClick={handleUploadAndProcess}
            className="min-h-[44px] w-full rounded-lg bg-saffron-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {state === 'uploading' ? t('upload.uploading') : t('upload.upload_button')}
          </button>
        </>
      )}
    </div>
  );
}
