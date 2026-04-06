import React, { useState } from 'react'
import { Task } from '../../lib/qaods/types'

type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'iterationCount' | 'status'>

interface TaskFormProps {
  onSubmit: (data: TaskInput) => void
}

export default function TaskForm({ onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState('')
  const [component, setComponent] = useState('')
  const [filePath, setFilePath] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = () => {
    if (!title.trim() || !component.trim() || !filePath.trim()) return
    onSubmit({ title, component, filePath, description })
    setTitle('')
    setComponent('')
    setFilePath('')
    setDescription('')
  }

  const inputClass =
    'w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500'

  return (
    <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-800">
      <p className="text-xs text-gray-500 uppercase tracking-widest">New Task</p>
      <input
        className={inputClass}
        placeholder="Title *"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className={inputClass}
        placeholder="Component *"
        value={component}
        onChange={(e) => setComponent(e.target.value)}
      />
      <input
        className={inputClass}
        placeholder="File path *"
        value={filePath}
        onChange={(e) => setFilePath(e.target.value)}
      />
      <textarea
        className={inputClass}
        placeholder="Description"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <div
        onClick={handleSubmit}
        className="cursor-pointer text-center text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded px-3 py-1.5 font-medium"
      >
        Create Task
      </div>
    </div>
  )
}
