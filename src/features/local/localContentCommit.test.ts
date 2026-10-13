import { afterEach, describe, expect, it, vi } from "vitest"

import { commitMetadata } from "./localContentCommit"
import { metadataStorageKey } from "./localContentMetadata"

describe("commitMetadata", () => {
  afterEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  it("uses navigator.locks for metadata commits when the browser provides it", async () => {
    const request = vi.fn((_name: string, callback: () => void) => {
      callback()
      return Promise.resolve()
    })
    vi.stubGlobal(
      "navigator",
      Object.create(navigator, {
        locks: { value: { request } },
      }),
    )

    await commitMetadata(() => ({ pets: [], posts: [] }))

    expect(request).toHaveBeenCalledWith("ilove-pets-local-content-metadata", expect.any(Function))
    expect(localStorage.getItem(metadataStorageKey)).toBe(
      '{"schemaVersion":1,"pets":[],"posts":[]}',
    )
  })
})
