'use client'

import React, { useState, useEffect } from 'react'
import { Task, AuditEntry, TaskPriority, TaskStatus } from '../../lib/qaods/types'
import { getTasks, createTask, updateTask } from '../../lib/qaods/taskStore'
import { generatePrompt } from '../../lib/qaods/promptGenerator'
import { logAction, getAuditLog } from '../../lib/qaods/auditLogger'
import { MAX_TASK_ITERATIONS } from '../../lib/qaods/executionController'
import { saveTasks, loadTasks, saveAudit, loadAudit } from '../../lib/qaods/persistence'
import TaskList from '../../components/qaods/task-list'
import TaskForm, { TaskFormSubmitData } from '../../components/qaods/task-form'
import TaskDetail, { TaskIterateHandler, TaskUpdateData } from '../../components/qaods/TaskDetail'
import PromptPanel from '../../components/qaods/PromptPanel'
import AuditLogViewer from '../../components/qaods/AuditLogViewer'
import ExpertButton from '../../components/qaods/ExpertButton'

function defaultFilePathForComponent(component: string): string {
  const comp = component.trim() || 'Module'
  const slug = comp.replace(/[^\w.-]/g, '') || 'Module'
  return `src/components/${slug}.tsx`
}

function statusAuditLabel(status: TaskStatus): string {
  return status === 'active' ? 'in-progress' : status
}

export default function QAODSPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all')

  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null
  const selectedTaskLog = auditLog.filter((e) => e.taskId === selectedId)
  const prompt = selectedTask ? generatePrompt(selectedTask) : null
  const filteredTasks = tasks.filter((task) => {
    const matchesTitle = task.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
    return matchesTitle && matchesStatus && matchesPriority
  })

  useEffect(() => {
    const savedTasks = loadTasks()
    const savedAudit = loadAudit()
    const taskStore = getTasks()
    const auditStore = getAuditLog()

    taskStore.splice(0, taskStore.length, ...savedTasks)
    auditStore.splice(0, auditStore.length, ...savedAudit)

    if (savedTasks.length > 0) {
      setTasks(savedTasks)
    }

    if (savedAudit.length > 0) {
      setAuditLog(savedAudit)
    }
  }, [])

  useEffect(() => {
    saveTasks(tasks)
  }, [tasks])

  useEffect(() => {
    saveAudit(auditLog)
  }, [auditLog])

  const handleCreateTask = (data: TaskFormSubmitData) => {
    const component = data.component.trim() || 'Module'
    const newTask = createTask({
      title: data.title.trim(),
      description: data.description,
      component,
      filePath: defaultFilePathForComponent(component),
      priority: data.priority,
      tags: data.tags,
      status: 'todo',
    })
    setTasks((prev) => [...prev, newTask])
    logAction(newTask.id, 'created', newTask.title)
    setAuditLog([...getAuditLog()])
    setSelectedId(newTask.id)
    setShowForm(false)
  }

  const handleStatusChange = (id: string, status: TaskStatus) => {
    const prev = tasks.find((t) => t.id === id)
    const updated = updateTask(id, { status })

    if (updated) {
      setTasks([...getTasks()])
      const from = prev ? statusAuditLabel(prev.status) : 'unknown'
      const to = statusAuditLabel(status)
      logAction(id, 'status_change', `${from} → ${to}`)
      setAuditLog([...getAuditLog()])
    }
  }

  const handleUpdateTask = (id: string, updatedData: TaskUpdateData) => {
    const prev = tasks.find((t) => t.id === id)
    const component = updatedData.component.trim() || 'Module'
    const updated = updateTask(id, {
      title: updatedData.title,
      description: updatedData.description,
      component,
      filePath: defaultFilePathForComponent(component),
      priority: updatedData.priority,
      tags: updatedData.tags,
    })

    if (updated) {
      setTasks([...getTasks()])
      logAction(id, 'edited', `${prev?.title ?? 'Task'} → ${updated.title}`)
      setAuditLog([...getAuditLog()])
    }
  }

  const handleIterate: TaskIterateHandler = (id) => {
    const prev = tasks.find((t) => t.id === id)
    if (!prev || prev.iterationCount >= MAX_TASK_ITERATIONS) return
    const updated = updateTask(id, { iterationCount: prev.iterationCount + 1 })
    if (updated) {
      setTasks([...getTasks()])
      logAction(
        id,
        'iteration',
        `iteration ${updated.iterationCount} of ${MAX_TASK_ITERATIONS}`
      )
      setAuditLog([...getAuditLog()])
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#040810] text-slate-300 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-900 bg-[#060c18] shrink-0">
        <div>
          <span className="text-xs text-blue-500 font-mono tracking-widest">Q-AODS</span>
          <span className="text-xs text-gray-700 font-mono ml-3">
            Quadrapilot AI-Orchestrated Development System
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ExpertButton tasks={tasks} auditLog={auditLog} />
          <button
            type="button"
            onClick={() => setShowForm((f) => !f)}
            className="text-xs px-3 py-1.5 rounded font-mono bg-blue-900 hover:bg-blue-800 text-blue-200 transition-colors"
          >
            {showForm ? 'Cancel' : '+ New Task'}
          </button>
        </div>
      </div>

      {/* New task form — slides in below header */}
      <div
        className={`grid shrink-0 transition-[grid-template-rows] duration-300 ease-out ${
          showForm ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden border-b border-gray-900 bg-[#060c18]">
          <div
            className={`max-h-[min(70vh,560px)] overflow-y-auto transition duration-300 ease-out ${
              showForm ? 'translate-y-0 opacity-100' : '-translate-y-1 opacity-0 pointer-events-none'
            }`}
            aria-hidden={!showForm}
          >
            <TaskForm onSubmit={handleCreateTask} />
          </div>
        </div>
      </div>

      {/* Main 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left — Task List */}
        <div className="w-64 shrink-0 border-r border-gray-900 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-900">
            <span className="text-xs text-gray-600 font-mono tracking-widest">TASKS</span>
            <span className="ml-2 text-xs text-gray-700">({filteredTasks.length} of {tasks.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <TaskList
              tasks={filteredTasks}
              totalCount={tasks.length}
              selectedId={selectedId}
              onSelect={setSelectedId}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              priorityFilter={priorityFilter}
              onPriorityFilterChange={setPriorityFilter}
            />
          </div>
        </div>

        {/* Center — Task Detail */}
        <div className="flex-1 border-r border-gray-900 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-900 shrink-0">
            <span className="text-xs text-gray-600 font-mono tracking-widest">TASK DETAIL</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <TaskDetail
              task={selectedTask}
              onStatusChange={handleStatusChange}
              onUpdate={handleUpdateTask}
              onIterate={handleIterate}
            />
          </div>
          {selectedTask && (
            <div className="border-t border-gray-900 shrink-0">
              <div className="px-4 py-2">
                <span className="text-xs text-gray-600 font-mono tracking-widest">AUDIT LOG</span>
              </div>
              <AuditLogViewer entries={selectedTaskLog} />
            </div>
          )}
        </div>

        {/* Right — Prompt Panel */}
        <div className="w-80 shrink-0 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-900 shrink-0">
            <span className="text-xs text-gray-600 font-mono tracking-widest">CURSOR PROMPT</span>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            <PromptPanel prompt={prompt} />
          </div>
        </div>
      </div>
    </div>
  )
}
