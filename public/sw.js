// Service worker for the iLove Pets demo PWA.
// Strategy: network-first with cache fallback so users always get the latest shell.
const CACHE_NAME = "ilove-pets-cache-v3"
const APP_SHELL_URLS = ["/", "/index.html", "/startup.js", "/manifest.webmanifest", "/icon.svg"]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_URLS)
    }),
  )

  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("ilove-pets-cache-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => {
        return self.clients.claim()
      }),
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request

  if (request.method !== "GET") {
    return
  }

  const isNavigation = request.mode === "navigate"
  const isAsset = request.destination === "script" || request.destination === "style"

  const fallback = async () => {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(request)
    if (cached !== undefined) return cached
    if (isNavigation) return (await cache.match("/index.html")) ?? Response.error()
    return Response.error()
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // A removed Vite asset may receive the SPA's index.html with status 200.
        // Never cache or serve that HTML as JavaScript/CSS.
        if (
          isAsset &&
          (!networkResponse.ok ||
            networkResponse.headers.get("content-type")?.includes("text/html"))
        )
          return fallback()
        if (
          networkResponse.ok &&
          new URL(request.url).origin === self.location.origin &&
          (isNavigation || request.destination === "script" || request.destination === "style")
        ) {
          const responseClone = networkResponse.clone()

          event.waitUntil(
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, responseClone))
              .catch(() => {
                /* Storage failure must not prevent serving the network response. */
              }),
          )
        }

        return networkResponse
      })
      .catch(fallback),
  )
})
