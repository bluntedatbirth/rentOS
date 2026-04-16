export type ErrorKind = 'network' | 'timeout' | 'server';

/**
 * Classify a fetch error into one of three user-visible error kinds.
 *
 * - 'server'  — the server responded with status >= 500
 * - 'timeout' — the fetch was aborted (AbortController timeout)
 * - 'network' — offline, DNS failure, CORS, or any other connectivity error
 */
export function classifyFetchError(err: unknown, response?: Response): ErrorKind {
  if (response && response.status >= 500) return 'server';
  if (err instanceof Error && err.name === 'AbortError') return 'timeout';
  return 'network';
}
