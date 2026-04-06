import React from 'react'
import { TaskStatus } from '../../lib/qaods/types'

const statusClasses: Record<TaskStatus, string> = {
  todo: 'bg-gray-800 text-gray-400 border border-gray-700',
  active: 'bg-blue-950 text-blue-400 border border-blue-800',
  done: 'bg-green-950 text-green-400 border border-green-800',
  blocked: 'bg-red-950 text-red-400 border border-red-800',
}

export default function StatusBadge({ status }: { status: TaskStatus }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1)

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusClasses[status]}`}
    >
      {label}
    </span>
  )
}
