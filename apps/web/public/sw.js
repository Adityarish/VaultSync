const CACHE = "vaultsync-shell-v1";
const SHELL = ["/", "/gallery", "/files", "/restore", "/settings", "/manifest.webmanifest"];
self.addEventListener("install", (event) => { event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin || request.url.includes("/api/")) return;
  event.respondWith(fetch(request).then((response) => { if (response.ok && request.mode === "navigate") { const copy = response.clone(); void caches.open(CACHE).then((cache) => cache.put(request, copy)); } return response; }).catch(async () => (await caches.match(request)) || (request.mode === "navigate" ? (await caches.match("/")) : Response.error())));
});
