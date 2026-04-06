'use client'

import React, { useCallback } from 'react'
import { useMachine } from '@xstate/react'
import { criticalDocMachine, MAX_DOC_ITERATIONS } from '../../lib/qaods/criticalDocMachine'
import type { DocType } from '../../lib/qaods/types'
import DocTypeSelector from '../../components/critical-doc/DocTypeSelector'
import DocForm from '../../components/critical-doc/DocForm'
import DocIssuesPanel from '../../components/critical-doc/DocIssuesPanel'
import DocPrintPreview from '../../components/critical-doc/DocPrintPreview'
import DocStepper from '../../components/critical-doc/DocStepper'

// States where the pipeline is actively running — unchanged
const RUNNING_STATES = new Set(['STRATEGIST', 'RESEARCHER', 'EXECUTOR', 'AUDITOR', 'ITERATE'])

export default function CriticalDocPage() {
  // ── All hooks, state, and event handlers are byte-for-byte unchanged ──
  const [state, send] = useMachine(criticalDocMachine)

  const ctx      = state.context
  const fsmState = typeof state.value === 'string' ? state.value : JSON.stringify(state.value)
  const isRunning  = RUNNING_STATES.has(fsmState)
  const isMerged   = fsmState === 'MERGED'
  const isFailed   = fsmState === 'FAILED'
  const hasDocType = ctx.docType !== null
  const hasFields  = ctx.fieldsManifest.length > 0

  const stepperStep = (() => {
    if (!hasDocType)     return 'select'
    if (isMerged)        return 'print'
    if (isFailed)        return 'fix'
    if (ctx.auditResult) return 'review'
    return 'fill'
  })() as 'select' | 'fill' | 'review' | 'print' | 'fix'

  const handleSelectDocType = useCallback((docType: DocType) => {
    send({ type: 'CREATE_SESSION', docType })
  }, [send])

  const handleFieldChange = useCallback((fieldId: string, value: string) => {
    send({ type: 'UPDATE_FIELD', fieldId, value })
  }, [send])

  const handleRunChecks = useCallback(() => {
    send({ type: 'RUN_CHECKS' })
  }, [send])

  const handleReset = useCallback(() => {
    send({ type: 'RESET' })
  }, [send])
  // ── End unchanged logic ──

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Top header bar ── */}
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Critical Docs</h1>
          <p className="text-xs text-slate-500 mt-0.5">Check exam forms before printing</p>
        </div>
        <div className="flex items-center gap-3">
          {ctx.docType && (
            <span className="text-xs text-slate-400 font-mono">{ctx.docType}</span>
          )}
          <span className="text-xs text-slate-400 font-mono">{fsmState}</span>
          {hasDocType && (
            <button
              type="button"
              onClick={handleReset}
              className={[
                'rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600',
                'hover:bg-slate-100 transition-colors min-h-[44px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              ].join(' ')}
            >
              Reset
            </button>
          )}
        </div>
      </header>

      {/* ── Stepper ── */}
      <div className="border-b border-slate-200 bg-white px-6 py-3">
        <DocStepper current={stepperStep} />
      </div>

      {/* ── Main content ── */}
      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* Step 1: Select doc type */}
        {!hasDocType && (
          <div className="max-w-lg mx-auto">
            <DocTypeSelector onSelect={handleSelectDocType} />
          </div>
        )}

        {/* Step 4: Print preview (full width) */}
        {isMerged && ctx.generatedDoc && (
          <DocPrintPreview generatedDoc={ctx.generatedDoc} />
        )}

        {/* Steps 2–3: Fill + Review (two-column grid) */}
        {hasDocType && !isMerged && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

            {/* Left column — form */}
            <div className="flex flex-col gap-6">
              {hasFields ? (
                <DocForm
                  fields={ctx.fieldsManifest}
                  values={ctx.userInputs}
                  issues={ctx.auditResult?.issues ?? []}
                  disabled={isRunning}
                  onFieldChange={handleFieldChange}
                  onRunChecks={handleRunChecks}
                />
              ) : (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-slate-400 animate-pulse">Loading fields…</p>
                </div>
              )}
            </div>

            {/* Right column — issues */}
            <div className="flex flex-col gap-6">
              <DocIssuesPanel
                auditResult={ctx.auditResult}
                fsmState={fsmState}
                iterationCount={ctx.iterationCount}
                maxIterations={MAX_DOC_ITERATIONS}
                failureReason={ctx.failureReason}
              />

              {/* Inline preview while not yet merged */}
              {ctx.generatedDoc && (
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-4 py-2 border-b border-slate-200 bg-slate-50">
                    <span className="text-xs font-semibold text-slate-600">Preview</span>
                  </div>
                  <iframe
                    title="Form preview"
                    srcDoc={ctx.generatedDoc}
                    sandbox="allow-same-origin"
                    className="w-full border-0 bg-white"
                    style={{ height: '400px' }}
                  />
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  )
}
