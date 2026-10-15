import { createContext, useContext } from "react"
import type { User } from "@supabase/supabase-js"

export interface AuthState {
  readonly user: User | null
  readonly status: "unconfigured" | "loading" | "ready" | "error"
  readonly recovering: boolean
  readonly clearRecovery: () => void
}
export const AuthContext = createContext<AuthState>({
  user: null,
  status: "unconfigured",
  recovering: false,
  clearRecovery: () => {
    /* No provider means local-only mode. */
  },
})
export function useAuth(): AuthState {
  return useContext(AuthContext)
}
