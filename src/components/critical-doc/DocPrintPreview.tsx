'use client'
import React, { memo } from 'react'

interface Props {
  generatedDoc: string   // HTML string from executorCriticalDoc
}

export default memo(function DocPrintPreview({ generatedDoc }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
        <span className="text-sm font-semibold text-slate-700">Print preview</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className={[
              'rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white',
              'hover:bg-indigo-700 transition-colors min-h-[44px]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
            ].join(' ')}
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      {/* Paper area — sandboxed iframe, no scripts */}
      <div className="bg-slate-100 p-6 min-h-[500px] overflow-auto">
        <div
          className="mx-auto bg-white shadow-md"
          style={{ width: '210mm', minHeight: '297mm', padding: '20mm' }}
        >
          <iframe
            title="CBSE Exam Form Preview"
            srcDoc={generatedDoc}
            sandbox="allow-same-origin"
            className="w-full border-0"
            style={{ minHeight: '257mm' }}
          />
        </div>
      </div>
    </div>
  )
})
