import React from 'react'
import { AuditEntry } from '../../lib/qaods/types'

interface AuditLogViewerProps {
  entries: AuditEntry[]
}

export default function AuditLogViewer({ entries }: AuditLogViewerProps) {
  const sorted = [...entries].reverse()

  return (
    <div className="mt-4 pt-3 border-t border-gray-800">
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Audit Log</p>
      <div className="overflow-y-auto max-h-48">
        {sorted.length === 0 ? (
          <p className="text-gray-600 text-xs">No activity yet</p>
        ) : (
          sorted.map((entry) => {
            const d = new Date(entry.timestamp)
            const formatted = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
            return (
              <div key={entry.id} className="flex gap-2 text-xs font-mono text-gray-500 py-0.5">
                <span className="text-gray-600 shrink-0">{formatted}</span>
                <span className="text-gray-400">{entry.action}</span>
                {entry.note && <span className="text-gray-600">{entry.note}</span>}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
