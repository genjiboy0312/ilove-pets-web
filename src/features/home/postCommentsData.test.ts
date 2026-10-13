import { afterEach, expect, it } from "vitest"
import { getPostComments, isLocalPostId } from "./postCommentsData"
import { metadataStorageKey } from "../local/localContentMetadata"
afterEach(() => {
  localStorage.clear()
})
it("recognizes restored local posts by stored membership rather than an ID naming convention", () => {
  localStorage.setItem(
    metadataStorageKey,
    JSON.stringify({
      schemaVersion: 1,
      pets: [],
      posts: [
        {
          id: "post_restored",
          petId: "pet_bori",
          photoKey: "photo",
          content: "Imported",
          tags: [],
          createdAt: "2026-10-10T00:00:00.000Z",
          comments: [{ id: "one", content: "Saved", createdAt: "2026-10-10T00:00:00.000Z" }],
        },
      ],
    }),
  )
  expect(isLocalPostId("post_restored")).toBe(true)
  expect(getPostComments("post_restored")[0]?.content).toBe("Saved")
  expect(isLocalPostId("post_bori_hike")).toBe(false)
  localStorage.setItem(metadataStorageKey, "{broken")
  expect(isLocalPostId("post_bori_hike")).toBe(false)
})
