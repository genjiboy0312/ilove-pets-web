import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { App } from "./App"
import "./styles/theme.css"
import "./styles/base.css"

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

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
