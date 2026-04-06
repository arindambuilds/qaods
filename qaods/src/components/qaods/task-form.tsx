import React, { useState } from 'react'
import { Task } from '../../lib/qaods/types'

interface TaskFormProps {
  onSubmit: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'iterationCount' | 'status'>) => void
}

export default function TaskForm({ onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState('')
  const [component, setComponent] = useState('')
  const [filePath, setFilePath] = useState('')
  const [description, setDescription] = useState('')

  const inputClass =
    'w-full bg-gray-900 border border-gray-800 text-xs text-slate-300 rounded px-3 py-2 focus:outline-none focus:border-blue-800 placeholder:text-gray-700'

  const handleCreateTask = () => {
    if (!title.trim() || !component.trim() || !filePath.trim()) {
      return
    }

    onSubmit({ title, component, filePath, description })
    setTitle('')
    setComponent('')
    setFilePath('')
    setDescription('')
  }

  return (
    <div className="p-4 space-y-3">
      <label className="block text-xs text-gray-500 font-mono mb-1">
        Title
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          className={inputClass}
        />
      </label>

      <label className="block text-xs text-gray-500 font-mono mb-1">
        Component
        <input
          value={component}
          onChange={(e) => setComponent(e.target.value)}
          placeholder="ComponentName"
          className={inputClass}
        />
      </label>

      <label className="block text-xs text-gray-500 font-mono mb-1">
        File Path
        <input
          value={filePath}
          onChange={(e) => setFilePath(e.target.value)}
          placeholder="src/components/Example.tsx"
          className={inputClass}
        />
      </label>

      <label className="block text-xs text-gray-500 font-mono mb-1">
        Description
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What specifically changes..."
          className={inputClass}
        />
      </label>

      <button
        type="button"
        onClick={handleCreateTask}
        className="w-full bg-blue-900 hover:bg-blue-800 text-blue-200 text-xs font-medium py-2 rounded mt-1 transition-colors"
      >
        Create Task
      </button>
    </div>
  )
}
