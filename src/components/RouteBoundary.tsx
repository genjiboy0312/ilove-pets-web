import { Component } from "react"
import type { ReactNode } from "react"
export class RouteBoundary extends Component<
  { readonly children: ReactNode; readonly fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
