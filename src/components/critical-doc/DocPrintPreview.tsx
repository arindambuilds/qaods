'use client'
import React, { memo } from 'react'

interface Props {
  generatedDoc: string   // HTML string from executorCriticalDoc
}

export default memo(function DocPrintPreview({ generatedDoc }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-900 shrink-0">
        <span className="text-xs text-green-400 font-mono font-semibold">
          ✓ Form ready — print or save
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="text-xs px-3 py-1.5 rounded bg-green-900 hover:bg-green-800 text-green-200 font-medium transition-colors"
        >
          Print / Save PDF
        </button>
      </div>
      {/* Sandboxed iframe — no scripts, no same-origin access */}
      <iframe
        title="CBSE Exam Form Preview"
        srcDoc={generatedDoc}
        sandbox="allow-same-origin"
        className="flex-1 w-full border-0 bg-white"
      />
    </div>
  )
})
