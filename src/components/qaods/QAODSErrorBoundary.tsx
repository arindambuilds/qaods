import React from 'react'
import type { QAODSContext } from '../../lib/qaods/types'
import { logger } from '../../lib/qaods/logger'

interface Props {
  children: React.ReactNode
  fsmState?: string
  fsmContext?: QAODSContext
}

interface State {
  hasError: boolean
  errorStack?: string
}

export class QAODSErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, errorStack: error.stack }
  }

  componentDidCatch(error: Error): void {
    logger.error('BOUNDARY_CAUGHT', {
      fsmState: this.props.fsmState,
      fsmContext: this.props.fsmContext as Record<string, unknown>,
      errorStack: error.stack,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-red-400 font-mono text-xs">
          <div>Q-AODS encountered an error.</div>
          <div>FSM State: {this.props.fsmState ?? 'unknown'}</div>
          <pre className="mt-2 text-red-600 text-[10px]">{this.state.errorStack}</pre>
        </div>
      )
    }
    return this.props.children
  }
}
