'use client'
import React, { memo } from 'react'
import type { DocAuditResult } from '../../lib/qaods/types'

interface Props {
  auditResult: DocAuditResult | null
  fsmState: string
  iterationCount: number
  maxIterations: number
  failureReason?: string
}

export default memo(function DocIssuesPanel({
  auditResult, fsmState, iterationCount, maxIterations, failureReason,
}: Props) {
  const isRunning = ['STRATEGIST', 'RESEARCHER', 'EXECUTOR', 'AUDITOR', 'ITERATE'].includes(fsmState)
  const isMerged  = fsmState === 'MERGED'
  const isFailed  = fsmState === 'FAILED'

  if (isRunning) {
    return (
      <div className="p-4">
        <div className="rounded border border-blue-900/40 bg-blue-950/20 px-3 py-2">
          <p className="text-xs text-blue-400 font-mono animate-pulse">
            ⟳ {fsmState} — running checks…
          </p>
        </div>
      </div>
    )
  }

  if (isMerged && auditResult) {
    return (
      <div className="p-4">
        <div className="rounded border border-green-900/60 bg-green-950/30 p-3">
          <p className="text-xs text-green-400 font-mono font-semibold mb-1">
            ✓ All checks passed — score {auditResult.score}/100
          </p>
          <p className="text-xs text-green-300/70 font-mono">
            Your form is ready to print. Scroll down to the preview.
          </p>
        </div>
      </div>
    )
  }

  if (!auditResult) return null

  const errors = auditResult.issues.filter(i => i.severity === 'error')
  const warns  = auditResult.issues.filter(i => i.severity === 'warn')

  return (
    <div className="p-4 space-y-3">
      {/* Score bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500 font-mono">Score</span>
          <span className={`text-xs font-mono font-semibold ${
            auditResult.passed ? 'text-green-400' : 'text-red-400'
          }`}>
            {auditResult.score}/100
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              auditResult.passed ? 'bg-green-500' : auditResult.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${auditResult.score}%` }}
          />
        </div>
      </div>

      {/* Failure reason */}
      {isFailed && failureReason && (
        <div className="rounded border border-red-900/60 bg-red-950/30 p-3">
          <p className="text-xs text-red-400 font-mono font-semibold mb-1">✗ Budget exhausted</p>
          <p className="text-xs text-red-300/80 font-mono">{failureReason}</p>
        </div>
      )}

      {/* Iteration hint */}
      {!isFailed && !isMerged && iterationCount > 0 && (
        <p className="text-xs text-amber-400 font-mono">
          Iteration {iterationCount}/{maxIterations} — fix the issues below and click "Check again".
        </p>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div>
          <p className="text-[10px] text-red-400 font-mono uppercase tracking-wider mb-1">
            Errors ({errors.length})
          </p>
          <ul className="space-y-1">
            {errors.map((iss, i) => (
              <li key={i} className="text-xs text-red-300 font-mono flex gap-2">
                <span className="text-red-600 shrink-0">✗</span>
                <span>{iss.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warns.length > 0 && (
        <div>
          <p className="text-[10px] text-amber-400 font-mono uppercase tracking-wider mb-1">
            Warnings ({warns.length})
          </p>
          <ul className="space-y-1">
            {warns.map((iss, i) => (
              <li key={i} className="text-xs text-amber-300/80 font-mono flex gap-2">
                <span className="text-amber-600 shrink-0">⚠</span>
                <span>{iss.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Re-run hint */}
      {(isFailed || (!isMerged && errors.length > 0)) && (
        <p className="text-xs text-gray-500 font-mono pt-1">
          Fix the fields above and click <span className="text-blue-400">Check my form</span> to try again.
        </p>
      )}
    </div>
  )
})
