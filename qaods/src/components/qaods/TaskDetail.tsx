import React, { useEffect, useState } from 'react'
import { Task, TaskPriority, TaskStatus } from '../../lib/qaods/types'
import { MAX_TASK_ITERATIONS, validateTaskActivation } from '../../lib/qaods/executionController'
import StatusBadge from './StatusBadge'

export interface TaskUpdateData {
  title: string
  description: string
  component: string
  priority: TaskPriority
  tags: string
}

export type TaskIterateHandler = (taskId: string) => void

interface TaskDetailProps {
  task: Task | null
  onStatusChange: (id: string, status: TaskStatus) => void
  onUpdate: (id: string, updatedData: TaskUpdateData) => void
  onIterate: TaskIterateHandler
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

export default function TaskDetail({ task, onStatusChange, onUpdate, onIterate }: TaskDetailProps) {
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [component, setComponent] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [tags, setTags] = useState('')

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
  const iterationAtLimit = task.iterationCount >= MAX_TASK_ITERATIONS
  const iterationDisplay = Math.min(task.iterationCount + 1, MAX_TASK_ITERATIONS)
  const inputClass =
    'w-full bg-gray-900 border border-gray-800 text-xs text-slate-300 rounded px-3 py-2 focus:outline-none focus:border-blue-800 placeholder:text-gray-700'

  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description ?? '')
    setComponent(task.component ?? '')
    setPriority(task.priority ?? 'medium')
    setTags(task.tags ?? '')
    setIsEditing(false)
    setError(null)
  }, [task.id, task.title, task.description, task.component, task.priority, task.tags])

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-bold text-slate-200">{task.title}</h2>
        <StatusBadge status={task.status} />
        <span className="text-xs text-gray-500 font-mono">
          ({statusDescription(task.status)})
        </span>
        {!isEditing && (
          <button
            type="button"
            onClick={() => {
              setTitle(task.title)
              setDescription(task.description ?? '')
              setComponent(task.component ?? '')
              setPriority(task.priority ?? 'medium')
              setTags(task.tags ?? '')
              setError(null)
              setIsEditing(true)
            }}
            className={`${buttonClass} bg-gray-800 hover:bg-gray-700 text-gray-300`}
          >
            Edit
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3">
          <label className="block text-xs text-gray-500 font-mono mb-1">
            Title
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="Task title"
            />
          </label>

          <label className="block text-xs text-gray-500 font-mono mb-1">
            Description
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={inputClass}
              placeholder="What needs to happen..."
            />
          </label>

          <label className="block text-xs text-gray-500 font-mono mb-1">
            Component
            <input
              value={component}
              onChange={(e) => setComponent(e.target.value)}
              className={inputClass}
              placeholder="AuthModule"
            />
          </label>

          <label className="block text-xs text-gray-500 font-mono mb-1">
            Priority
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>

          <label className="block text-xs text-gray-500 font-mono mb-1">
            Tags
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className={inputClass}
              placeholder="auth, api, bugfix"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (!title.trim()) {
                  setError('Title is required.')
                  return
                }
                onUpdate(task.id, {
                  title: title.trim(),
                  description: description.trim(),
                  component: component.trim(),
                  priority,
                  tags: tags.trim(),
                })
                setIsEditing(false)
                setError(null)
              }}
              className={`${buttonClass} bg-blue-900 hover:bg-blue-800 text-blue-200`}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setTitle(task.title)
                setDescription(task.description ?? '')
                setComponent(task.component ?? '')
                setPriority(task.priority ?? 'medium')
                setTags(task.tags ?? '')
                setError(null)
                setIsEditing(false)
              }}
              className={`${buttonClass} bg-gray-800 hover:bg-gray-700 text-gray-300`}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
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
            Iteration
          </div>
          <div className="text-xs text-slate-400">
            Iteration {iterationDisplay} of {MAX_TASK_ITERATIONS}
          </div>
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
      )}

      <div>
        <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1">
          DESCRIPTION
        </div>
        <div className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
          {task.description?.trim() ? task.description : '—'}
        </div>
      </div>

      {!isEditing && (
        <div>
          <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-2">
            Actions
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button
              type="button"
              disabled={iterationAtLimit}
              onClick={() => {
                setError(null)
                onIterate(task.id)
              }}
              className={`${buttonClass} ${
                iterationAtLimit
                  ? 'bg-gray-900 text-gray-600 cursor-not-allowed'
                  : 'bg-indigo-900 hover:bg-indigo-800 text-indigo-200'
              }`}
            >
              Iterate
            </button>
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

          {iterationAtLimit && (
            <p className="text-xs text-red-400 font-mono mt-2">Iteration limit reached</p>
          )}
          {error && <p className="text-xs text-red-400 font-mono mt-2">{error}</p>}
        </div>
      )}
    </div>
  )
}
