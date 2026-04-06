'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/supabase/useAuth';
import { useI18n } from '@/lib/i18n/context';
import { createClient } from '@/lib/supabase/client';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState('');
  const [state, setState] = useState<UploadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const supabase = createClient();

  // Load properties
  useEffect(() => {
    if (!user) return;
    const loadProperties = async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, name')
        .eq('landlord_id', user.id)
        .eq('is_active', true);
      if (data && data.length > 0) {
        setProperties(data);
        setSelectedProperty(data[0]?.id ?? '');
      }
    };
    loadProperties();
  }, [user, supabase]);

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      setErrorMessage('Unsupported file type');
      return;
    }
    if (selectedFile.size > MAX_SIZE) {
      setErrorMessage('File too large (max 20MB)');
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
  }, []);

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
    if (!file || !selectedProperty || !user) return;

    setState('uploading');
    setErrorMessage('');

    try {
      // Generate unique path
      const ext = file.name.split('.').pop() ?? 'jpg';
      const storagePath = `${selectedProperty}/${crypto.randomUUID()}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw new Error('Upload failed: ' + uploadError.message);
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('contracts').getPublicUrl(storagePath);

      // Create contract record
      const fileType = file.type === 'application/pdf' ? 'pdf' : 'image';
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          property_id: selectedProperty,
          landlord_id: user.id,
          original_file_url: urlData.publicUrl,
          file_type: fileType as 'image' | 'pdf',
        })
        .select()
        .single();

      if (contractError || !contract) {
        throw new Error('Failed to create contract: ' + (contractError?.message ?? 'unknown'));
      }

      // Start OCR processing
      setState('processing');

      const ocrResponse = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_id: contract.id,
          file_url: storagePath,
          file_type: fileType,
        }),
      });

      if (!ocrResponse.ok) {
        const errData = await ocrResponse.json().catch(() => ({}));
        throw new Error((errData as { error?: string }).error ?? 'OCR processing failed');
      }

      setState('success');

      // Redirect to review page after short delay
      setTimeout(() => {
        router.push(`/landlord/contracts/${contract.id}`);
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
      <h2 className="mb-2 text-xl font-bold text-gray-900">{t('upload.title')}</h2>
      <p className="mb-6 text-sm text-gray-500">{t('upload.description')}</p>

      {/* Property selector */}
      {properties.length === 0 ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {t('upload.no_properties')}
        </div>
      ) : (
        <div className="mb-6">
          <label htmlFor="property" className="mb-1 block text-sm font-medium text-gray-700">
            {t('upload.select_property')}
          </label>
          <select
            id="property"
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Processing state */}
      {state === 'processing' && (
        <div className="mb-6 flex flex-col items-center rounded-lg border border-blue-200 bg-blue-50 p-8">
          <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-lg font-semibold text-blue-900">{t('upload.processing')}</p>
          <p className="mt-1 text-sm text-blue-700">{t('upload.processing_description')}</p>
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
              dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
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
            disabled={!file || !selectedProperty || state === 'uploading'}
            onClick={handleUploadAndProcess}
            className="min-h-[44px] w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {state === 'uploading' ? t('upload.uploading') : t('upload.upload_button')}
          </button>
        </>
      )}
    </div>
  );
}
