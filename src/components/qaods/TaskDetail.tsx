import React, { useState } from 'react'
import { Task, TaskStatus } from '../../lib/qaods/types'
import { validateTaskActivation } from '../../lib/qaods/executionController'
import StatusBadge from './StatusBadge'

interface TaskDetailProps {
  task: Task | null
  onStatusChange: (id: string, status: TaskStatus) => void
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

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-bold text-slate-200">{task.title}</h2>
        <StatusBadge status={task.status} />
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
          <div className="text-xs text-slate-400">{task.filePath}</div>
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
      </div>

      <div>
        <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1">
          DESCRIPTION
        </div>
        <div className="text-xs text-slate-400 leading-relaxed">{task.description}</div>
      </div>

      <div>
        <div className="flex gap-2 flex-wrap">
          {task.status === 'todo' && (
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

          {task.status === 'active' && (
            <>
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
            </>
          )}

          {task.status === 'blocked' && (
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

