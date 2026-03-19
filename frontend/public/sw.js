// Konekt PWA Service Worker
// Minimal for launch - expand later for offline caching

const CACHE_NAME = "konekt-v1";

self.addEventListener("install", (event) => {
  console.log("Service Worker: Installing...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activating...");
  event.waitUntil(self.clients.claim());
});

// For now, just pass through all fetch requests
// Later: add caching strategy for static assets and API responses
self.addEventListener("fetch", (event) => {
  // Network-first strategy for now
  event.respondWith(
    fetch(event.request).catch(() => {
      // Could return cached response here for offline support
      return new Response("Offline - please check your connection", {
        status: 503,
        statusText: "Service Unavailable",
      });
    })
  );
});
