import React, { useState } from 'react'
import { Task, TaskStatus } from '../../lib/qaods/types'
import { validateTaskActivation } from '../../lib/qaods/executionController'
import StatusBadge from './StatusBadge'

interface TaskDetailProps {
  task: Task | null
  onStatusChange: (id: string, status: TaskStatus) => void
}

function statusDescription(status: TaskStatus): string {
  switch (status) {
    case 'active':
      return 'in-progress'
    case 'todo':
      return 'todo'
    case 'done':
      return 'done'
    case 'blocked':
      return 'blocked'
    default:
      return status
  }
}

export default function TaskDetail({ task, onStatusChange }: TaskDetailProps) {
  const [error, setError] = useState<string | null>(null)

  if (task === null) {
    return (
      <div className="p-6 text-xs text-gray-600 font-mono">
        Select a task to view details
      </div>
    )
  }

  const buttonClass = 'text-xs px-3 py-1.5 rounded font-medium transition-colors'

  const canActivate = task.status === 'todo'
  const canComplete = task.status === 'active'
  const canBlock = task.status !== 'blocked'
  const canReopen = task.status === 'blocked'

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-bold text-slate-200">{task.title}</h2>
        <StatusBadge status={task.status} />
        <span className="text-xs text-gray-500 font-mono">
          ({statusDescription(task.status)})
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1">
            Component
          </div>
          <div className="text-xs text-slate-400">{task.component}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1">
            File Path
          </div>
          <div className="text-xs text-slate-400 break-all font-mono">{task.filePath}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1">
            Priority
          </div>
          <div className="text-xs text-slate-400 capitalize">{task.priority}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1">
            Tags
          </div>
          <div className="text-xs text-slate-400 font-mono break-all">
            {task.tags?.trim() ? task.tags : '—'}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1">
            Iterations
          </div>
          <div className="text-xs text-slate-400">{task.iterationCount}/2</div>
        </div>
        <div>
          <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1">
            Created
          </div>
          <div className="text-xs text-slate-400">{new Date(task.createdAt).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1">
            Updated
          </div>
          <div className="text-xs text-slate-400">{new Date(task.updatedAt).toLocaleString()}</div>
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1">
          DESCRIPTION
        </div>
        <div className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
          {task.description?.trim() ? task.description : '—'}
        </div>
      </div>

      <div>
        <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-2">
          Actions
        </div>
        <div className="flex gap-2 flex-wrap">
          {canActivate && (
            <button
              type="button"
              onClick={() => {
                const result = validateTaskActivation(task)
                if (result.valid) {
                  onStatusChange(task.id, 'active')
                  setError(null)
                  return
                }
                setError(result.reason ?? null)
              }}
              className={`${buttonClass} bg-blue-900 hover:bg-blue-800 text-blue-200`}
            >
              Activate
            </button>
          )}

          {canComplete && (
            <button
              type="button"
              onClick={() => {
                setError(null)
                onStatusChange(task.id, 'done')
              }}
              className={`${buttonClass} bg-green-900 hover:bg-green-800 text-green-200`}
            >
              Complete
            </button>
          )}

          {canBlock && (
            <button
              type="button"
              onClick={() => {
                setError(null)
                onStatusChange(task.id, 'blocked')
              }}
              className={`${buttonClass} bg-red-900/50 hover:bg-red-900 text-red-400`}
            >
              Block
            </button>
          )}

          {canReopen && (
            <button
              type="button"
              onClick={() => {
                setError(null)
                onStatusChange(task.id, 'todo')
              }}
              className={`${buttonClass} bg-gray-800 hover:bg-gray-700 text-gray-300`}
            >
              Reopen
            </button>
          )}
        </div>

        {error && <p className="text-xs text-red-400 font-mono mt-2">{error}</p>}
      </div>
    </div>
  )
}
