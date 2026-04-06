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

  const errors = auditResult?.issues.filter(i => i.severity === 'error') ?? []
  const warns  = auditResult?.issues.filter(i => i.severity === 'warn')  ?? []

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800 mb-4">Validation results</h2>

      {/* Status chip */}
      {isRunning && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 animate-pulse">
          ● {fsmState} — running…
        </span>
      )}
      {isMerged && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          ● Ready to print
        </span>
      )}
      {isFailed && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
          ✕ Not ready — failed after {maxIterations} attempt{maxIterations !== 1 ? 's' : ''}
        </span>
      )}
      {!isRunning && !isMerged && !isFailed && auditResult && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
          ⚠ Issues found — fix and recheck
        </span>
      )}

      {/* Score bar */}
      {auditResult && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">Score</span>
            <span className={`text-xs font-semibold ${
              auditResult.passed ? 'text-green-600' : 'text-red-500'
            }`}>
              {auditResult.score}/100
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                auditResult.passed ? 'bg-green-500'
                  : auditResult.score >= 60 ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${auditResult.score}%` }}
            />
          </div>
        </div>
      )}

      {/* Failure reason */}
      {isFailed && failureReason && (
        <p className="mt-3 text-xs text-red-600">{failureReason}</p>
      )}

      {/* Iteration hint */}
      {!isFailed && !isMerged && iterationCount > 0 && (
        <p className="mt-3 text-xs text-amber-600">
          Iteration {iterationCount}/{maxIterations} — fix the issues below and click "Check my form".
        </p>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mt-4" role="alert" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Errors ({errors.length})
          </p>
          <ul className="flex flex-col gap-2">
            {errors.map((iss, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2">
                <span className="text-red-500 mt-0.5 shrink-0" aria-hidden>✕</span>
                <p className="text-xs text-red-700">{iss.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {warns.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
            Warnings ({warns.length})
          </p>
          <ul className="flex flex-col gap-2">
            {warns.map((iss, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                <span className="text-amber-500 mt-0.5 shrink-0" aria-hidden>⚠</span>
                <p className="text-xs text-amber-700">{iss.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Empty state */}
      {!isRunning && !auditResult && (
        <p className="text-xs text-slate-400 text-center py-6">
          No issues found yet — run a check first.
        </p>
      )}

      {/* Re-run hint */}
      {(isFailed || (!isMerged && !isRunning && errors.length > 0)) && (
        <p className="mt-4 text-xs text-slate-500">
          Fix the highlighted fields and click <span className="font-medium text-indigo-600">Check my form</span> to try again.
        </p>
      )}
    </div>
  )
})
