'use client';

import { useEffect, useRef, useState } from 'react';

const REFRESH_INTERVAL_MS = 45 * 60 * 1000; // 45 minutes — well within the 1h TTL

/**
 * Fetches and auto-refreshes a signed URL for a contract PDF.
 *
 * The contracts bucket is private (PDPA compliance), so signed URLs expire
 * after 1 hour. This hook fetches a fresh URL on mount and schedules a
 * re-fetch every 45 minutes so the iframe src never hits a 403 on a long
 * open tab.
 *
 * Usage:
 *   const { url, isRefreshing, error } = useSignedContractUrl(contractId, hasFile);
 *
 * @param contractId  The contract UUID. Pass null/undefined to skip entirely.
 * @param enabled     Set to false when there is no file to fetch (e.g.
 *                    contract.original_file_url is null). Avoids a wasted
 *                    network request.
 */
export function useSignedContractUrl(
  contractId: string | null | undefined,
  enabled: boolean
): { url: string | null; isRefreshing: boolean; error: string | null } {
  const [url, setUrl] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use a ref to track whether the component is still mounted so async
  // callbacks don't set state after unmount.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!contractId || !enabled) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchFreshUrl = async () => {
      if (!mountedRef.current) return;
      setIsRefreshing(true);
      setError(null);
      try {
        const res = await fetch(`/api/contracts/${contractId}/file-url`);
        if (!mountedRef.current) return;
        if (res.ok) {
          const data = (await res.json()) as { url: string };
          setUrl(data.url);
        } else {
          setError('Failed to load contract file');
        }
      } catch {
        if (mountedRef.current) setError('Failed to load contract file');
      } finally {
        if (mountedRef.current) setIsRefreshing(false);
      }
    };

    // Fetch immediately on mount so the PDF shows without waiting 45 minutes.
    void fetchFreshUrl();

    // Schedule a refresh every 45 minutes to beat the 1h signed-URL TTL.
    // If the tab sits open, the next scroll/render will use a fresh URL.
    intervalId = setInterval(() => void fetchFreshUrl(), REFRESH_INTERVAL_MS);

    return () => {
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, [contractId, enabled]);

  return { url, isRefreshing, error };
}
