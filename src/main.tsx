import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router"

import { App } from "./App"
import { initializeI18n } from "./i18n/i18n"
import "./styles/theme.css"
import "./styles/base.css"
import "./styles/navigation.css"

export class RootElementMissingError extends Error {
  constructor() {
    super("Root element #root was not found")
    this.name = "RootElementMissingError"
  }
}

if (import.meta.env.DEV) {
  void import("./devtools/reactDevTools").then(({ loadReactDevTools }) => loadReactDevTools())
}

const rootElement = document.getElementById("root")

if (rootElement === null) {
  throw new RootElementMissingError()
}

await initializeI18n()

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
