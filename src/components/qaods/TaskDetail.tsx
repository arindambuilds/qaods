import React from 'react'
import { Task, TaskStatus } from '../../lib/qaods/types'

interface TaskDetailProps {
  task: Task | null
  onStatusChange: (id: string, status: TaskStatus) => void
}

const statusColors: Record<string, string> = {
  todo: 'bg-gray-700 text-gray-300',
  active: 'bg-blue-900 text-blue-300',
  done: 'bg-green-900 text-green-300',
  blocked: 'bg-red-900 text-red-300',
}

export default function TaskDetail({ task, onStatusChange }: TaskDetailProps) {
  if (!task) {
    return <p className="text-gray-600 text-sm">Select a task</p>
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <h2 className="text-gray-100 font-semibold text-base">{task.title}</h2>

      <div>
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-0.5">Component</p>
        <p className="text-gray-300">{task.component}</p>
      </div>

      <div>
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-0.5">File</p>
        <p className="text-gray-300 font-mono text-xs break-all">{task.filePath}</p>
      </div>

      <div>
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-0.5">Description</p>
        <p className="text-gray-300">{task.description || '—'}</p>
      </div>

      <div className="flex items-center gap-3">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-0.5">Status</p>
          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[task.status]}`}>
            {task.status}
          </span>
        </div>
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-widest mb-0.5">Iterations</p>
          <p className="text-gray-300">{task.iterationCount}/2</p>
        </div>
      </div>

      <div>
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-0.5">Created</p>
        <p className="text-gray-500 text-xs">{new Date(task.createdAt).toLocaleString()}</p>
      </div>

      <div className="flex gap-2 flex-wrap pt-1">
        <button
          onClick={() => onStatusChange(task.id, 'active')}
          className="text-xs bg-blue-900 hover:bg-blue-800 text-blue-200 px-3 py-1 rounded"
        >
          Activate
        </button>
        <button
          onClick={() => onStatusChange(task.id, 'done')}
          className="text-xs bg-green-900 hover:bg-green-800 text-green-200 px-3 py-1 rounded"
        >
          Complete
        </button>
        <button
          onClick={() => onStatusChange(task.id, 'blocked')}
          className="text-xs bg-red-900 hover:bg-red-800 text-red-200 px-3 py-1 rounded"
        >
          Block
        </button>
      </div>
    </div>
  )
}

