import React from 'react'
import { Task } from '../../lib/qaods/types'
import StatusBadge from './StatusBadge'

interface TaskListProps {
  tasks: Task[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function TaskList({ tasks, selectedId, onSelect }: TaskListProps) {
  return (
    <div className="h-full overflow-y-auto">
      {tasks.length === 0 ? (
        <div className="p-4 text-xs text-gray-600 font-mono">No tasks yet</div>
      ) : (
        tasks.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => onSelect(task.id)}
            className={`w-full text-left p-3 hover:bg-white/5 ${
              task.id === selectedId
                ? 'bg-blue-950/40 border-l-2 border-blue-500'
                : 'bg-transparent border-l-2 border-transparent'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-slate-300 truncate">
                  {task.title}
                </div>
                <div className="text-xs text-gray-600 font-mono truncate">
                  {task.component || '—'}
                </div>
                <div className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-500">
                  {task.priority ?? 'medium'}
                </div>
              </div>
              <StatusBadge status={task.status} />
            </div>
          </button>
        ))
      )}
    </div>
  )
}

export default TaskList
