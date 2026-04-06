import React from 'react'
import { AuditEntry } from '../../lib/qaods/types'

interface AuditLogViewerProps {
  entries: AuditEntry[]
}

export default function AuditLogViewer({ entries }: AuditLogViewerProps) {
  if (entries.length === 0) {
    return (
      <div className="text-xs text-gray-700 font-mono p-2">
        No activity yet
      </div>
    )
  }

  return (
    <div className="max-h-48 overflow-y-auto">
      {[...entries].reverse().map((entry) => (
        <div
          key={entry.id}
          className="flex gap-2 items-start py-1.5 border-b border-gray-900/50 last:border-0"
        >
          <span className="text-xs text-gray-700 font-mono whitespace-nowrap shrink-0">
            {new Date(entry.timestamp).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
          <span className="text-xs text-blue-500 font-mono shrink-0">
            {entry.action}
          </span>
          <span className="text-xs text-gray-600 truncate">{entry.note}</span>
        </div>
      ))}
    </div>
  )
}
