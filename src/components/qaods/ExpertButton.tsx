import React from 'react'
import { Task, AuditEntry } from '../../lib/qaods/types'

interface ExportButtonProps {
  tasks: Task[]
  auditLog: AuditEntry[]
}

export default function ExportButton({ tasks, auditLog }: ExportButtonProps) {
  const handleExport = () => {
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
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div
      onClick={handleExport}
      className="cursor-pointer text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded px-3 py-1.5 font-medium"
    >
      Export JSON
    </div>
  )
}
