import { useEffect, useState } from "react"

import type { LocalContentSnapshot } from "./localContentTypes"
import { localContentChangedEvent } from "./localContentTypes"
import { loadLocalContent } from "./localContentStore"

const initialSnapshot: LocalContentSnapshot = {
  content: { pets: [], posts: [] },
  errorMessage: null,
  status: "idle",
}

export function useLocalContent(): LocalContentSnapshot {
  const [snapshot, setSnapshot] = useState<LocalContentSnapshot>(initialSnapshot)

  useEffect(() => {
    const objectUrls: string[] = []
    let isActive = true
    let refreshSequence = 0

    async function refreshLocalContent() {
      const sequence = ++refreshSequence
      setSnapshot((current) => ({ ...current, status: "loading" }))

      try {
        const result = await loadLocalContent()

        if (!isActive || sequence !== refreshSequence) {
          revokeContentUrls(result.content)
          return
        }

        objectUrls.splice(0).forEach((objectUrl) => {
          URL.revokeObjectURL(objectUrl)
        })
        objectUrls.push(...collectBlobUrls(result.content.pets.map((pet) => pet.avatarUrl)))
        objectUrls.push(...collectBlobUrls(result.content.posts.map((post) => post.imageUrl)))
        setSnapshot({
          content: result.content,
          errorMessage: result.warningMessage,
          status: "ready",
        })
      } catch (error) {
        if (!isActive || sequence !== refreshSequence) {
          return
        }

        setSnapshot({
          content: { pets: [], posts: [] },
          errorMessage:
            error instanceof Error
              ? error.message
              : "Local storage failed. Clear site data or try again in this browser.",
          status: "error",
        })
      }
    }

    const handleRefreshRequest = () => {
      void refreshLocalContent()
    }

    void refreshLocalContent()
    window.addEventListener(localContentChangedEvent, handleRefreshRequest)
    window.addEventListener("focus", handleRefreshRequest)
    window.addEventListener("storage", handleRefreshRequest)

    return () => {
      isActive = false
      window.removeEventListener(localContentChangedEvent, handleRefreshRequest)
      window.removeEventListener("focus", handleRefreshRequest)
      window.removeEventListener("storage", handleRefreshRequest)
      objectUrls.splice(0).forEach((objectUrl) => {
        URL.revokeObjectURL(objectUrl)
      })
    }
  }, [])

  return snapshot
}

function collectBlobUrls(urls: readonly string[]): readonly string[] {
  return urls.filter((url) => url.startsWith("blob:"))
}

function revokeContentUrls(content: LocalContentSnapshot["content"]): void {
  collectBlobUrls(content.pets.map((pet) => pet.avatarUrl)).forEach((objectUrl) => {
    URL.revokeObjectURL(objectUrl)
  })
  collectBlobUrls(content.posts.map((post) => post.imageUrl)).forEach((objectUrl) => {
    URL.revokeObjectURL(objectUrl)
  })
}
