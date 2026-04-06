import React from 'react'
import { Task, AuditEntry } from '../../lib/qaods/types'

interface ExpertButtonProps {
  tasks: Task[]
  auditLog: AuditEntry[]
}

export default function ExpertButton({ tasks, auditLog }: ExpertButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        const data = {
          tasks,
          auditLog,
          exportedAt: new Date().toISOString(),
        }
        const json = JSON.stringify(data, null, 2)
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'qaods-export.json'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }}
      className="text-xs px-3 py-1.5 rounded font-mono bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors border border-gray-700"
    >
      Export JSON
    </button>
  )
}
