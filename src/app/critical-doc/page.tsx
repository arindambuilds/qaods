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

// States where the pipeline is actively running
const RUNNING_STATES = new Set(['STRATEGIST', 'RESEARCHER', 'EXECUTOR', 'AUDITOR', 'ITERATE'])

export default function CriticalDocPage() {
  const [state, send] = useMachine(criticalDocMachine)

  const ctx = state.context
  const fsmState = typeof state.value === 'string' ? state.value : JSON.stringify(state.value)
  const isRunning = RUNNING_STATES.has(fsmState)
  const isMerged  = fsmState === 'MERGED'
  const isFailed  = fsmState === 'FAILED'
  const hasDocType = ctx.docType !== null
  const hasFields  = ctx.fieldsManifest.length > 0

  // Derive stepper step
  const stepperStep = (() => {
    if (!hasDocType)  return 'select'
    if (isMerged)     return 'print'
    if (isFailed)     return 'fix'
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

  return (
    <div className="flex flex-col h-screen bg-[#040810] text-slate-300 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-900 bg-[#060c18] shrink-0">
        <div>
          <span className="text-xs text-blue-500 font-mono tracking-widest">Q-AODS</span>
          <span className="text-xs text-gray-700 font-mono ml-3">Critical Document Pipeline</span>
          {ctx.docType && (
            <span className="text-xs text-gray-600 font-mono ml-3">· {ctx.docType}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-600 font-mono">{fsmState}</span>
          {(hasDocType) && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs px-3 py-1.5 rounded font-mono bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Stepper */}
      <DocStepper current={stepperStep} />

      {/* Main content */}
      {!hasDocType ? (
        // Step 1: Select doc type
        <DocTypeSelector onSelect={handleSelectDocType} />
      ) : isMerged && ctx.generatedDoc ? (
        // Step 4: Print preview
        <DocPrintPreview generatedDoc={ctx.generatedDoc} />
      ) : (
        // Steps 2–3: Fill + Review
        <div className="flex flex-1 overflow-hidden">
          {/* Left: form */}
          <div className="w-[420px] shrink-0 border-r border-gray-900 overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-900">
              <span className="text-xs text-gray-600 font-mono tracking-widest">FORM FIELDS</span>
              {ctx.iterationCount > 0 && (
                <span className="ml-2 text-xs text-amber-500 font-mono">
                  iteration {ctx.iterationCount}/{MAX_DOC_ITERATIONS}
                </span>
              )}
            </div>
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
              <div className="p-4 text-xs text-gray-600 font-mono animate-pulse">
                Loading fields…
              </div>
            )}
          </div>

          {/* Right: issues + preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-900 shrink-0">
              <span className="text-xs text-gray-600 font-mono tracking-widest">
                {ctx.auditResult ? 'AUDIT RESULTS' : 'VALIDATION'}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <DocIssuesPanel
                auditResult={ctx.auditResult}
                fsmState={fsmState}
                iterationCount={ctx.iterationCount}
                maxIterations={MAX_DOC_ITERATIONS}
                failureReason={ctx.failureReason}
              />
            </div>

            {/* Inline HTML preview (collapsed until there's a doc) */}
            {ctx.generatedDoc && !isMerged && (
              <div className="border-t border-gray-900 shrink-0" style={{ height: '40%' }}>
                <div className="px-4 py-2 border-b border-gray-900">
                  <span className="text-xs text-gray-600 font-mono tracking-widest">PREVIEW</span>
                </div>
                <iframe
                  title="Form preview"
                  srcDoc={ctx.generatedDoc}
                  sandbox="allow-same-origin"
                  className="w-full h-full border-0 bg-white"
                  style={{ height: 'calc(100% - 33px)' }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
