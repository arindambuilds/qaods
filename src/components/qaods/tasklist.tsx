import React from 'react'
import { Task } from '../../lib/qaods/types'

interface TaskListProps {
  tasks: Task[]
  selectedId: string | null
  onSelect: (id: string) => void
}

const statusColors: Record<string, string> = {
  todo: 'bg-gray-700 text-gray-300',
  active: 'bg-blue-900 text-blue-300',
  done: 'bg-green-900 text-green-300',
  blocked: 'bg-red-900 text-red-300',
}

export default function TaskList({ tasks, selectedId, onSelect }: TaskListProps) {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {tasks.length === 0 ? (
        <p className="text-gray-600 text-xs mt-2">No tasks yet</p>
      ) : (
        tasks.map((task) => (
          <div
            key={task.id}
            onClick={() => onSelect(task.id)}
            className={`cursor-pointer px-3 py-2 mb-1 rounded text-sm border ${
              selectedId === task.id
                ? 'border-gray-500 bg-gray-800'
                : 'border-transparent hover:bg-gray-900'
            }`}
          >
            <p className="text-gray-200 truncate">{task.title}</p>
            <span
              className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[task.status]}`}
            >
              {task.status}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
