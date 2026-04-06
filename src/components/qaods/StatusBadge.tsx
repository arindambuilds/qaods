import React from 'react'
import { TaskStatus } from '../../lib/qaods/types'

const statusConfig: Record<
  TaskStatus,
  { pill: string; dot: string; label: string }
> = {
  todo: {
    pill: 'bg-gray-800 text-gray-300',
    dot: 'bg-gray-400',
    label: 'TODO',
  },
  active: {
    pill: 'bg-blue-900 text-blue-300',
    dot: 'bg-blue-400',
    label: 'IN PROGRESS',
  },
  done: {
    pill: 'bg-green-900 text-green-300',
    dot: 'bg-green-400',
    label: 'DONE',
  },
  blocked: {
    pill: 'bg-red-900 text-red-300',
    dot: 'bg-red-400',
    label: 'BLOCKED',
  },
}

export default function StatusBadge({ status }: { status: TaskStatus }) {
  const cfg = statusConfig[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.pill}`}
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`}
        aria-hidden
      />
      {cfg.label}
    </span>
  )
}
