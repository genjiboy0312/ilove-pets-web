import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readFeedChoice, saveFeedChoice } from "./feedPreferences"
describe("feed preferences", () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => vi.restoreAllMocks())
  it("keeps guest and each account feed choices separate", () => {
    saveFeedChoice("a", "mode", "public")
    saveFeedChoice("a", "filter", "following")
    expect(readFeedChoice("a", "mode", "local")).toBe("public")
    expect(readFeedChoice("a", "filter", "all")).toBe("following")
    expect(readFeedChoice("b", "mode", "local")).toBe("local")
    expect(readFeedChoice(null, "mode", "local")).toBe("local")
  })
  it("keeps a choice across a new read without storing tokens or content", () => {
    saveFeedChoice("a", "mode", "public")
    expect(readFeedChoice("a", "mode", "local")).toBe("public")
    expect(localStorage.length).toBe(1)
    expect(localStorage.getItem("ilove-pets-feed:a:mode")).toBe("public")
  })
  it("uses a default when storage is unavailable and never blocks selection", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full")
    })
    expect(readFeedChoice("a", "mode", "local")).toBe("local")
    expect(() => {
      saveFeedChoice("a", "mode", "public")
    }).not.toThrow()
  })
})
