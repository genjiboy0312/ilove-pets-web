import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import type { User } from "@supabase/supabase-js"
import { getSupabaseClient } from "../../services/supabaseClient"
import { AuthContext } from "./AuthContext"
import type { AuthState } from "./AuthContext"

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthState["status"]>(() =>
    getSupabaseClient() === null ? "unconfigured" : "loading",
  )
  const [recovering, setRecovering] = useState(false)
  useEffect(() => {
    const client = getSupabaseClient()
    if (client === null) return undefined
    let active = true
    let revision = 0
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return
      revision += 1
      setUser(session?.user ?? null)
      setStatus("ready")
      if (event === "PASSWORD_RECOVERY") setRecovering(true)
      if (event === "SIGNED_OUT" || event === "SIGNED_IN") setRecovering(false)
    })
    const initialRevision = revision
    void client.auth
      .getSession()
      .then(async ({ data: sessionData, error }) => {
        if (error !== null) throw error
        if (sessionData.session === null) return null
        const result = await client.auth.getUser()
        if (result.error !== null) throw result.error
        return result.data.user
      })
      .then((verified) => {
        if (!active || revision !== initialRevision) return
        setUser(verified)
        setStatus("ready")
      })
      .catch(() => {
        if (active && revision === initialRevision) {
          setUser(null)
          setStatus("error")
        }
      })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])
  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        recovering,
        clearRecovery: () => {
          setRecovering(false)
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
