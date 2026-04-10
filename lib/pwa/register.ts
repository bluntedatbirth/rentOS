/**
 * Registers the RentOS service worker for PWA caching and push notifications.
 * Call this once from a client component that mounts on every page.
 */
export function registerServiceWorker(): void {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((registration) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[PWA] Service worker registered:', registration.scope);
        }

        // Check for updates on each page load
        registration.update().catch(() => {
          // Silently ignore update errors (e.g. offline)
        });
      })
      .catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[PWA] Service worker registration failed:', err);
        }
      });
  });
}
