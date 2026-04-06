'use client'
import React, { memo } from 'react'

type Step = 'select' | 'fill' | 'review' | 'print' | 'fix'

interface Props {
  current: Step
}

const STEPS: { id: Step; label: string }[] = [
  { id: 'select', label: 'Select' },
  { id: 'fill',   label: 'Fill'   },
  { id: 'review', label: 'Review' },
  { id: 'print',  label: 'Print'  },
]

const ORDER: Step[] = ['select', 'fill', 'review', 'print']

export default memo(function DocStepper({ current }: Props) {
  const displayStep = current === 'fix' ? 'review' : current
  const currentIdx = ORDER.indexOf(displayStep)

  return (
    <div className="flex items-center gap-0 px-6 py-3 border-b border-gray-900 bg-[#060c18] shrink-0">
      {STEPS.map((step, idx) => {
        const done    = idx < currentIdx
        const active  = idx === currentIdx
        const pending = idx > currentIdx

        return (
          <React.Fragment key={step.id}>
            <div className="flex items-center gap-1.5">
              <span className={`
                w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center shrink-0
                ${done    ? 'bg-green-800 text-green-300' : ''}
                ${active  ? 'bg-blue-800 text-blue-200'   : ''}
                ${pending ? 'bg-gray-800 text-gray-600'   : ''}
              `}>
                {done ? '✓' : idx + 1}
              </span>
              <span className={`text-xs font-mono ${
                active  ? 'text-blue-300' :
                done    ? 'text-green-400' :
                          'text-gray-600'
              }`}>
                {step.label}
                {current === 'fix' && step.id === 'review' && (
                  <span className="text-amber-400 ml-1">(fix)</span>
                )}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-2 ${done ? 'bg-green-800' : 'bg-gray-800'}`} />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
})
