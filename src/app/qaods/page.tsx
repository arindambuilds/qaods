'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useMachine } from '@xstate/react'
import { Task, TaskStatus, TaskPriority, AuditEntry } from '../../lib/qaods/types'
import { qaodsMachine } from '../../lib/qaods/machine'
import { persistenceAdapter } from '../../lib/qaods/persistence'
import { auditLogger } from '../../lib/qaods/auditLogger'
import { createTask, updateTask, getTasks } from '../../lib/qaods/taskStore'
import { QAODSErrorBoundary } from '../../components/qaods/QAODSErrorBoundary'
import TaskList from '../../components/qaods/TaskList'
import TaskForm, { TaskFormSubmitData } from '../../components/qaods/TaskForm'
import TaskDetail, { TaskUpdateData } from '../../components/qaods/TaskDetail'
import PromptPanel from '../../components/qaods/PromptPanel'
import AuditLogViewer from '../../components/qaods/AuditLogViewer'
import ExpertButton from '../../components/qaods/ExpertButton'
import FSMInspector from '../../components/qaods/debug/FSMInspector'

const USER_ID = 'default'

function defaultFilePathForComponent(component: string): string {
  const comp = component.trim() || 'Module'
  const slug = comp.replace(/[^\w.-]/g, '') || 'Module'
  return `src/components/${slug}.tsx`
}

function QAODSPageInner() {
  const [state, send] = useMachine(qaodsMachine)
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all')

  const fsmStateName = typeof state.value === 'string' ? state.value : JSON.stringify(state.value)
  const fsmContext = state.context
  const isSubmitting = !['IDLE', 'FAILED', 'MERGED'].includes(fsmStateName)

  // Load tasks on mount only
  useEffect(() => {
    persistenceAdapter.loadTasksByUser(USER_ID).then((persisted) => {
      const loaded = persisted.map((p) => p.data)
      loaded.forEach((t) => {
        const store = getTasks()
        if (!store.find((s) => s.id === t.id)) store.push(t)
      })
      setTasks(loaded)
    })

    // Dev-only: seed tasks and wire @xstate/inspect
    if (process.env.NODE_ENV === 'development') {
      import('../../lib/qaods/devSeeds').then(({ seedDevTasks }) => {
        seedDevTasks(persistenceAdapter).then(() => {
          persistenceAdapter.loadTasksByUser(USER_ID).then((persisted) => {
            const loaded = persisted.map((p) => p.data)
            loaded.forEach((t) => {
              const store = getTasks()
              if (!store.find((s) => s.id === t.id)) store.push(t)
            })
            setTasks(loaded)
          })
        })
      })

      import('@xstate/inspect').then(({ inspect }) => {
        inspect({ iframe: false })
      }).catch(() => { /* inspect not critical */ })
    }
  }, [])

  // Refresh audit entries whenever FSM state changes
  useEffect(() => {
    setAuditEntries([...auditLogger.getAll()])
  }, [fsmStateName])

  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null
  const selectedTaskAudit = auditEntries.filter((e) => e.taskId === selectedId)

  const filteredTasks = tasks.filter((task) => {
    const matchesTitle = task.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
    return matchesTitle && matchesStatus && matchesPriority
  })

  const handleCreateTask = useCallback((data: TaskFormSubmitData) => {
    const component = data.component.trim() || 'Module'
    const newTask = createTask({
      title: data.title.trim(),
      description: data.description,
      component,
      filePath: defaultFilePathForComponent(component),
      priority: data.priority,
      tags: data.tags,
      status: 'todo',
      userId: USER_ID,
      teamId: 'default',
    })
    persistenceAdapter.saveTask(newTask)
    setTasks((prev) => [...prev, newTask])
    setSelectedId(newTask.id)
    setShowForm(false)
    send({ type: 'CREATE_TASK', task: newTask })
  }, [send])

  const handleSelectTask = useCallback((id: string) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    setSelectedId(id)
    send({ type: 'SELECT_TASK', task })
  }, [tasks, send])

  const handleStatusChange = useCallback((id: string, status: TaskStatus) => {
    const updated = updateTask(id, { status })
    if (updated) {
      persistenceAdapter.saveTask(updated)
      setTasks([...getTasks()])
    }
  }, [])

  const handleUpdateTask = useCallback((id: string, updatedData: TaskUpdateData) => {
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
      persistenceAdapter.saveTask(updated)
      setTasks([...getTasks()])
    }
  }, [])

  const handleIterate = useCallback((id: string) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return
    const updated = updateTask(id, { iterationCount: task.iterationCount + 1 })
    if (updated) {
      persistenceAdapter.saveTask(updated)
      setTasks([...getTasks()])
    }
  }, [tasks])

  const handleApprove = useCallback(() => send({ type: 'APPROVE' }), [send])
  const handleReject = useCallback(() => send({ type: 'REJECT' }), [send])
  const handleReset = useCallback(() => send({ type: 'RESET' }), [send])

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
          <ExpertButton tasks={tasks} auditLog={auditEntries} />
          <button
            type="button"
            onClick={() => setShowForm((f) => !f)}
            className="text-xs px-3 py-1.5 rounded font-mono bg-blue-900 hover:bg-blue-800 text-blue-200 transition-colors"
          >
            {showForm ? 'Cancel' : '+ New Task'}
          </button>
        </div>
      </div>

      {/* New task form */}
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
            <TaskForm onSubmit={handleCreateTask} isSubmitting={isSubmitting} />
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
              onSelect={handleSelectTask}
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
            <span className="ml-2 text-xs text-blue-600 font-mono">{fsmStateName}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <TaskDetail
              task={selectedTask}
              onStatusChange={handleStatusChange}
              onUpdate={handleUpdateTask}
              onIterate={handleIterate}
              fsmState={fsmStateName}
              fsmContext={fsmContext}
              activeTaskId={fsmContext.taskId}
              onApprove={handleApprove}
              onReject={handleReject}
              onReset={handleReset}
            />
          </div>
          {selectedTask && (
            <div className="border-t border-gray-900 shrink-0">
              <div className="px-4 py-2">
                <span className="text-xs text-gray-600 font-mono tracking-widest">AUDIT LOG</span>
              </div>
              <AuditLogViewer entries={selectedTaskAudit} />
            </div>
          )}
        </div>

        {/* Right — Prompt Panel */}
        <div className="w-80 shrink-0 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-900 shrink-0">
            <span className="text-xs text-gray-600 font-mono tracking-widest">CURSOR PROMPT</span>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            <PromptPanel prompt={fsmContext.promptPayload ?? null} />
          </div>
        </div>
      </div>

      {/* Dev-only FSM inspector */}
      <FSMInspector state={fsmStateName} context={fsmContext} />
    </div>
  )
}

export default function QAODSPage() {
  return (
    <QAODSErrorBoundary>
      <QAODSPageInner />
    </QAODSErrorBoundary>
  )
}
