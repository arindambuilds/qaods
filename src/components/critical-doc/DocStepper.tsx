'use client'
import React, { memo } from 'react'

type Step = 'select' | 'fill' | 'review' | 'print' | 'fix'

interface Props {
  current: Step
}

const STEPS: { id: Step; label: string }[] = [
  { id: 'select', label: 'Select'  },
  { id: 'fill',   label: 'Fill'    },
  { id: 'review', label: 'Review'  },
  { id: 'print',  label: 'Print'   },
]

const ORDER: Step[] = ['select', 'fill', 'review', 'print']

export default memo(function DocStepper({ current }: Props) {
  const displayStep = current === 'fix' ? 'review' : current
  const currentIdx  = ORDER.indexOf(displayStep)

  return (
    <ol className="flex items-center w-full" aria-label="Progress">
      {STEPS.map((step, idx) => {
        const done    = idx < currentIdx
        const active  = idx === currentIdx
        const isFix   = current === 'fix' && step.id === 'review'

        return (
          <li key={step.id} className="flex flex-1 items-center">
            {/* Circle */}
            <div
              className={[
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none',
                done || active
                  ? 'bg-indigo-600 text-white'
                  : 'border-2 border-slate-300 text-slate-400 bg-white',
              ].join(' ')}
              aria-current={active ? 'step' : undefined}
            >
              {done ? '✓' : idx + 1}
            </div>

            {/* Label */}
            <span className={[
              'ml-2 text-xs whitespace-nowrap',
              active  ? 'font-semibold text-indigo-600' : 'text-slate-400',
            ].join(' ')}>
              {step.label}
              {isFix && <span className="text-amber-500 ml-1">(fix)</span>}
            </span>

            {/* Connector — skip after last step */}
            {idx < STEPS.length - 1 && (
              <div className={[
                'flex-1 h-px mx-3',
                done ? 'bg-indigo-600' : 'bg-slate-200',
              ].join(' ')} />
            )}
          </li>
        )
      })}
    </ol>
  )
})
