import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

type GlobeErrorBoundaryProps = Readonly<{
  fallback: ReactNode
  children: ReactNode
}>

type GlobeErrorBoundaryState = { failed: boolean }

/** Keeps a failing 3D chunk or WebGL context from taking down the whole view. */
class GlobeErrorBoundary extends Component<GlobeErrorBoundaryProps, GlobeErrorBoundaryState> {
  state: GlobeErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): GlobeErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('3D globe failed', error, info.componentStack)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export default GlobeErrorBoundary
