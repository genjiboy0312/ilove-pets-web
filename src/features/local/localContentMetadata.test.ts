import { beforeEach, describe, expect, it } from "vitest"

import type { IsoDateTimeString } from "../../types/domain"
import { LocalContentMetadataError } from "./localContentErrors"
import {
  canPrunePhotos,
  metadataStorageKey,
  readMetadata,
  toIsoDateTimeString,
} from "./localContentMetadata"

describe("local content metadata", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("normalizes dates to padded millisecond ISO strings when creating local records", () => {
    // Given: a date that JavaScript serializes with zero padding.
    const date = new Date(Date.UTC(2026, 0, 2, 3, 4, 5, 6))

    // When: it is converted for local metadata storage.
    const isoDateTime = toIsoDateTimeString(date)

    // Then: the stored value preserves lexical date ordering semantics.
    expect(isoDateTime).toBe("2026-01-02T03:04:05.006Z" satisfies IsoDateTimeString)
  })

  it("surfaces corrupt metadata as a recoverable storage error instead of resetting it", () => {
    // Given: browser metadata that cannot be parsed.
    localStorage.setItem(metadataStorageKey, "{not-json")

    // When / Then: loading metadata reports the corruption and leaves the value in place.
    expect(() => readMetadata()).toThrow(LocalContentMetadataError)
    expect(localStorage.getItem(metadataStorageKey)).toBe("{not-json")
  })

  it("drops records with unpadded ISO dates at the storage boundary", () => {
    // Given: legacy-shaped metadata with an invalid unpadded date.
    localStorage.setItem(
      metadataStorageKey,
      JSON.stringify({
        pets: [
          {
            id: "pet_local_mochi",
            name: "Mochi",
            category: "CAT",
            breed: "Korean shorthair",
            createdAt: "2026-1-2T03:04:05.006Z",
          },
        ],
        posts: [],
      }),
    )

    // When: metadata is read through the parser boundary.
    const metadata = readMetadata()

    // Then: the invalid record is not allowed into typed app state.
    expect(metadata.pets).toEqual([])
    expect(canPrunePhotos(metadata)).toBe(false)
  })
})
