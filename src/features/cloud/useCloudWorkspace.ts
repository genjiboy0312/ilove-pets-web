import { useCallback, useEffect, useRef, useState } from "react"
import { CloudError, loadCloud } from "./cloudApi"
import { emptyCloud } from "./cloudTypes"
import type { CloudSnapshot } from "./cloudTypes"

export function useCloudWorkspace(owner: string) {
  const [snapshot, setSnapshot] = useState<CloudSnapshot>(emptyCloud)
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [error, setError] = useState<CloudError["kind"] | null>(null)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const pending = useRef(false)
  const generation = useRef(0)
  const mounted = useRef(false)
  const loaded = useRef(false)
  const refresh = useCallback(async () => {
    const revision = ++generation.current
    try {
      const data = await loadCloud(owner)
      if (mounted.current && revision === generation.current) {
        loaded.current = true
        setSnapshot(data)
        setStatus("ready")
        setError(null)
      }
    } catch (failure) {
      if (mounted.current && revision === generation.current) {
        if (!loaded.current) setStatus("error")
        setError(failure instanceof CloudError ? failure.kind : "request")
      }
      throw failure
    }
  }, [owner])
  useEffect(() => {
    mounted.current = true
    void refresh().catch(() => undefined)
    return () => {
      mounted.current = false
      generation.current += 1
    }
  }, [refresh])
  async function run(action: () => Promise<void>): Promise<boolean> {
    if (pending.current) return false
    pending.current = true
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await action()
      await refresh()
      if (mounted.current) setSaved(true)
      return mounted.current
    } catch (failure) {
      if (mounted.current) setError(failure instanceof CloudError ? failure.kind : "request")
      return false
    } finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }
  return { snapshot, status, error, busy, saved, run, refresh }
}
