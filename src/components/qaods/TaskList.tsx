import React, { memo } from 'react'
import { Task, TaskPriority, TaskStatus } from '../../lib/qaods/types'
import StatusBadge from './StatusBadge'

interface TaskListProps {
  tasks: Task[]
  totalCount: number
  selectedId: string | null
  onSelect: (id: string) => void
  searchQuery: string
  onSearchQueryChange: (value: string) => void
  statusFilter: 'all' | TaskStatus
  onStatusFilterChange: (value: 'all' | TaskStatus) => void
  priorityFilter: 'all' | TaskPriority
  onPriorityFilterChange: (value: 'all' | TaskPriority) => void
}

function TaskList({
  tasks,
  totalCount,
  selectedId,
  onSelect,
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
}: TaskListProps) {
  const inputClass =
    'w-full bg-gray-900 border border-gray-800 text-xs text-slate-300 rounded px-2 py-1.5 focus:outline-none focus:border-blue-800 placeholder:text-gray-700'

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="px-3 py-3 border-b border-gray-900 space-y-2 shrink-0">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Search by title..."
          className={inputClass}
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as 'all' | TaskStatus)}
            className={`${inputClass} cursor-pointer`}
          >
            <option value="all">All statuses</option>
            <option value="todo">todo</option>
            <option value="active">active</option>
            <option value="done">done</option>
            <option value="blocked">blocked</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => onPriorityFilterChange(e.target.value as 'all' | TaskPriority)}
            className={`${inputClass} cursor-pointer`}
          >
            <option value="all">All priorities</option>
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
        </div>
        <div className="text-[11px] text-gray-500 font-mono">
          {tasks.length} of {totalCount}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
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
    </div>
  )
}

export default memo(TaskList)
