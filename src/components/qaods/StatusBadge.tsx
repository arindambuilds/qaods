import React from 'react'
import { TaskStatus } from '../../lib/qaods/types'

interface StatusBadgeProps {
  status: TaskStatus
}

const colorMap: Record<TaskStatus, string> = {
  todo: 'bg-gray-700 text-gray-300',
  active: 'bg-blue-900 text-blue-300',
  done: 'bg-green-900 text-green-300',
  blocked: 'bg-red-900 text-red-300',
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colorMap[status]}`}>
      {status}
    </span>
  )
}
