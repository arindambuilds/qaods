'use client'
import React from 'react'
import type { DocType } from '../../lib/qaods/types'

const DOC_OPTIONS: { value: DocType; label: string; description: string }[] = [
  {
    value: 'exam_form_cbse_v1',
    label: 'CBSE Exam Registration Form',
    description: 'Board exam application form',
  },
  {
    value: 'resume_simple_v1',
    label: 'Simple Resume',
    description: 'Coming soon',
  },
]

interface Props {
  onSelect: (docType: DocType) => void
}

export default function DocTypeSelector({ onSelect }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800 mb-4">Document type</h2>
      <div className="flex flex-col gap-3">
        {DOC_OPTIONS.map(opt => {
          const isDisabled = opt.value === 'resume_simple_v1'
          return (
            <button
              key={opt.value}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onSelect(opt.value)}
              className={[
                'w-full text-left rounded-lg border p-4 transition-colors min-h-[44px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                isDisabled
                  ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                  : 'border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50',
              ].join(' ')}
            >
              <p className="text-sm font-medium text-slate-900">{opt.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
