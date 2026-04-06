// Service worker placeholder — will be expanded in Phase 9 (Push Notifications)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
