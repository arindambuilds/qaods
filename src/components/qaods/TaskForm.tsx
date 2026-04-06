import React, { useState } from 'react'
import { TaskPriority } from '../../lib/qaods/types'

export interface TaskFormSubmitData {
  title: string
  description: string
  component: string
  priority: TaskPriority
  tags: string
}

interface TaskFormProps {
  onSubmit: (data: TaskFormSubmitData) => void
  isSubmitting?: boolean
}

export default function TaskForm({ onSubmit, isSubmitting = false }: TaskFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [component, setComponent] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [tags, setTags] = useState('')

  const inputClass =
    `w-full bg-gray-900 border border-gray-800 text-xs text-slate-300 rounded px-3 py-2 focus:outline-none focus:border-blue-800 placeholder:text-gray-700 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`

  const handleSubmit = () => {
    if (!title.trim() || isSubmitting) return

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      component: component.trim(),
      priority,
      tags: tags.trim(),
    })
    setTitle('')
    setDescription('')
    setComponent('')
    setPriority('medium')
    setTags('')
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
          disabled={isSubmitting}
          className={inputClass}
        />
      </label>

      <label className="block text-xs text-gray-500 font-mono mb-1">
        Description
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What needs to happen…"
          disabled={isSubmitting}
          className={inputClass}
        />
      </label>

      <label className="block text-xs text-gray-500 font-mono mb-1">
        Component
        <input
          value={component}
          onChange={(e) => setComponent(e.target.value)}
          placeholder="AuthModule"
          disabled={isSubmitting}
          className={inputClass}
        />
      </label>

      <label className="block text-xs text-gray-500 font-mono mb-1">
        Priority
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          disabled={isSubmitting}
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
          placeholder="auth, api, bugfix"
          disabled={isSubmitting}
          className={inputClass}
        />
      </label>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className={`w-full bg-blue-900 text-blue-200 text-xs font-medium py-2 rounded mt-1 transition-colors ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-800'}`}
      >
        {isSubmitting ? 'Submitting…' : 'Create Task'}
      </button>
    </div>
  )
}
