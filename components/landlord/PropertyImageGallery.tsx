'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useI18n } from '@/lib/i18n/context';

interface PropertyImage {
  id: string;
  public_url: string;
  category: 'move_in' | 'move_out';
  created_at: string;
}

type Category = 'move_in' | 'move_out';

interface PropertyImageGalleryProps {
  propertyId: string;
}

export function PropertyImageGallery({ propertyId }: PropertyImageGalleryProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<Category>('move_in');
  const [images, setImages] = useState<PropertyImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/properties/${propertyId}/images`);
      if (!res.ok) throw new Error('Failed to load images');
      const data = (await res.json()) as PropertyImage[];
      setImages(data);
    } catch {
      setError(t('property.photos_upload_error'));
    } finally {
      setLoading(false);
    }
  }, [propertyId, t]);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', activeTab);

        const res = await fetch(`/api/properties/${propertyId}/images`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) throw new Error('Upload failed');
      }
      await loadImages();
    } catch {
      setError(t('property.photos_upload_error'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (imageId: string) => {
    if (!confirm(t('property.photos_delete_confirm'))) return;

    setError(null);
    try {
      const res = await fetch(`/api/properties/${propertyId}/images/${imageId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch {
      setError(t('property.photos_delete_error'));
    }
  };

  const filteredImages = images.filter((img) => img.category === activeTab);

  const tabs: { key: Category; label: string }[] = [
    { key: 'move_in', label: t('property.photos_move_in') },
    { key: 'move_out', label: t('property.photos_move_out') },
  ];

  return (
    <div className="rounded-lg bg-white p-4 shadow-sm">
      {/* Title */}
      <h3 className="mb-4 text-sm font-semibold text-gray-900">{t('property.photos_title')}</h3>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`min-h-[44px] flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {/* Image thumbnails */}
          {filteredImages.map((img) => (
            <div key={img.id} className="group relative aspect-square">
              <Image
                src={`${img.public_url}?width=400&quality=75`}
                alt=""
                width={400}
                height={400}
                className="h-full w-full rounded-lg object-cover"
              />
              {/* Delete button — visible on hover */}
              <button
                type="button"
                onClick={() => handleDelete(img.id)}
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 focus:opacity-100"
                aria-label="Delete image"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
          ))}

          {/* Add tile */}
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-lg border-2 border-dashed border-gray-300 transition-colors hover:border-blue-400 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Add photo"
          >
            <div className="flex h-full flex-col items-center justify-center gap-1">
              {uploading ? (
                <>
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  <span className="text-xs text-blue-600">{t('property.photos_uploading')}</span>
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="h-8 w-8 text-gray-400"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </>
              )}
            </div>
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredImages.length === 0 && !uploading && (
        <p className="mt-3 text-center text-xs text-gray-400">{t('property.photos_empty')}</p>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
