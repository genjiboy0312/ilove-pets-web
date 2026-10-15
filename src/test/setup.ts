import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { afterEach } from "vitest"

// jsdom has no layout scrolling; browser tests verify the actual viewport movement.
Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value: () => {
    /* Layout scrolling is exercised in Playwright. */
  },
})

afterEach(() => {
  cleanup()
})
