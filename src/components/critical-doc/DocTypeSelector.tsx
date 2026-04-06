'use client'
import React from 'react'
import type { DocType } from '../../lib/qaods/types'

const DOC_OPTIONS: { value: DocType; label: string; description: string }[] = [
  {
    value: 'exam_form_cbse_v1',
    label: 'CBSE Exam Registration Form',
    description: 'Class 10 / 12 board exam registration — 16 fields, 7 deterministic rules',
  },
  {
    value: 'resume_simple_v1',
    label: 'Simple Resume',
    description: 'Basic resume with name, email, experience, education',
  },
]

interface Props {
  onSelect: (docType: DocType) => void
}

export default function DocTypeSelector({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 gap-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-slate-200 mb-1">Select a document type</h2>
        <p className="text-xs text-gray-500 font-mono">
          The pipeline will load the correct fields and validation rules automatically.
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-md">
        {DOC_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSelect(opt.value)}
            className="text-left rounded border border-gray-800 bg-gray-900/60 hover:bg-gray-800 hover:border-blue-800 px-4 py-3 transition-colors group"
          >
            <div className="text-sm font-medium text-slate-200 group-hover:text-blue-300">
              {opt.label}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
