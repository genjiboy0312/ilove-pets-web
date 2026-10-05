// Service worker for the iLove Pets demo PWA.
// Strategy: network-first with cache fallback so users always get the latest shell.
const CACHE_NAME = "ilove-pets-cache-v2"
const APP_SHELL_URLS = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg"]

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
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
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

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (
          networkResponse.ok &&
          new URL(request.url).origin === self.location.origin &&
          (isNavigation || request.destination === "script" || request.destination === "style")
        ) {
          const responseClone = networkResponse.clone()

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
        }

        return networkResponse
      })
      .catch(() =>
        caches
          .match(request)
          .then((cachedResponse) => cachedResponse ?? caches.match("/index.html")),
      ),
  )
})
