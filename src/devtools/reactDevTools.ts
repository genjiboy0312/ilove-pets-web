export async function loadReactDevTools(): Promise<void> {
  if (!import.meta.env.DEV) {
    return
  }

  if (import.meta.env["VITE_DISABLE_REACT_DEVTOOLS"] === "1") {
    return
  }

  await Promise.all([import("react-grab"), import("react-scan")])
}
