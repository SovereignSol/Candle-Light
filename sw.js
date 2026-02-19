// Minimal service worker: no fetch caching by default (avoids stale JS/auth issues).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
