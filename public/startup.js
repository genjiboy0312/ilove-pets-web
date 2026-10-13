// Runs before the app module, so even a stale/missing bundle can update the worker.
const root = document.getElementById("root")
let failed = false
function showStartupFailure() {
  if (root === null || root.querySelector("main") !== null) return
  failed = true
  const notice = document.createElement("p")
  notice.setAttribute("role", "alert")
  notice.textContent =
    "앱을 불러오지 못했습니다. 서버 연결을 확인한 뒤 다시 시도하세요. / Unable to load the app. Check the server and retry."
  const retry = document.createElement("button")
  retry.type = "button"
  retry.textContent = "다시 불러오기 / Reload"
  retry.addEventListener("click", () => location.reload())
  const panel = document.createElement("section")
  panel.className = "startup-status"
  panel.append(notice, retry)
  root.replaceChildren(panel)
}
window.addEventListener(
  "error",
  (event) => {
    // Optional remote fonts and images can fail while React is starting.
    // Only a failed app script or an uncaught startup exception should replace the loading panel.
    const target = event.target
    if (
      event instanceof ErrorEvent ||
      (target instanceof HTMLScriptElement && new URL(target.src).origin === location.origin)
    )
      showStartupFailure()
  },
  true,
)
window.addEventListener("unhandledrejection", showStartupFailure)
if ("serviceWorker" in navigator && !location.pathname.startsWith("/src/")) {
  window.addEventListener("load", () => {
    // Vite dev includes /@vite/client; only production preview should install a worker.
    if (document.querySelector('script[src*="/@vite/client"]') !== null) return
    void navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((registration) => registration.update())
      .catch(() => {
        /* The app works without a worker. */
      })
  })
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (failed && root?.querySelector("main") === null) location.reload()
  })
}
