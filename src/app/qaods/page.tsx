'use client'

import React, { useState, useEffect } from 'react'
import { Task, AuditEntry, TaskStatus } from '../../lib/qaods/types'
import { getTasks, createTask, updateTask } from '../../lib/qaods/taskStore'
import { generatePrompt } from '../../lib/qaods/promptGenerator'
import { validateTaskActivation } from '../../lib/qaods/executionController'
import { logAction, getAuditLog } from '../../lib/qaods/auditLogger'
import { saveTasks, loadTasks, saveAudit, loadAudit } from '../../lib/qaods/persistence'
import TaskList from '../../components/qaods/tasklist'
import TaskForm from '../../components/qaods/taskform'
import TaskDetail from '../../components/qaods/TaskDetail'
import PromptPanel from '../../components/qaods/PromptPanel'
import AuditLogViewer from '../../components/qaods/AuditLogViewer'
import ExpertButton from '../../components/qaods/ExpertButton'

type TaskInput = Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'iterationCount' | 'status'>

export default function QaodsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activationError, setActivationError] = useState<string | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    const savedTasks = loadTasks()
    const savedAudit = loadAudit()
    if (savedTasks.length > 0) setTasks(savedTasks)
    if (savedAudit.length > 0) setAuditLog(savedAudit)
  }, [])

  // Save tasks on change
  useEffect(() => {
    saveTasks(tasks)
  }, [tasks])

  // Save audit on change
  useEffect(() => {
    saveAudit(auditLog)
  }, [auditLog])

  const selectedTask = tasks.find((t) => t.id === selectedId) ?? null

  const prompt = selectedTask ? generatePrompt(selectedTask) : null

  const taskAuditLog = selectedTask
    ? auditLog.filter((e) => e.taskId === selectedTask.id)
    : []

  const handleCreateTask = (input: TaskInput) => {
    const newTask = createTask({ ...input, status: 'todo' })
    logAction(newTask.id, 'created')
    const updatedTasks = getTasks()
    const updatedLog = getAuditLog()
    setTasks([...updatedTasks])
    setAuditLog([...updatedLog])
    setSelectedId(newTask.id)
  }

  const handleStatusChange = (id: string, newStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === id)
    if (!task) return

    if (newStatus === 'active') {
      const validation = validateTaskActivation(task)
      if (!validation.valid) {
        setActivationError(validation.reason ?? 'Validation failed.')
        return
      }
    }

    setActivationError(null)
    const prevStatus = task.status
    updateTask(id, { status: newStatus })
    logAction(id, 'status_change', `${prevStatus} → ${newStatus}`)
    setTasks([...getTasks()])
    setAuditLog([...getAuditLog()])
  }

  return (
    <div className="flex flex-col h-screen bg-[#040810] text-gray-100 font-mono">

      {/* Header */}
      <header className="w-full px-6 py-3 border-b border-gray-800 flex items-center justify-between shrink-0">
        <div className="flex items-baseline gap-4">
          <span className="text-white font-bold text-lg tracking-widest">Q-AODS</span>
          <span className="text-gray-500 text-xs tracking-wide">
            Quadrapilot AI-Orchestrated Development System
          </span>
        </div>
        <ExpertButton tasks={tasks} auditLog={auditLog} />
      </header>

      {/* 3-column body */}
      <div className="flex flex-row flex-1 overflow-hidden">

        {/* Left — Tasks + Form */}
        <div className="w-1/4 flex flex-col border-r border-gray-800 px-4 py-4 overflow-y-auto">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Tasks</p>
          <TaskList
            tasks={tasks}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id)
              setActivationError(null)
            }}
          />
          <TaskForm onSubmit={handleCreateTask} />
        </div>

        {/* Center — Task Detail + Audit Log */}
        <div className="w-5/12 flex flex-col border-r border-gray-800 px-4 py-4 overflow-y-auto">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Task Detail</p>
          <TaskDetail
            task={selectedTask}
            onStatusChange={handleStatusChange}
          />
          {activationError && (
            <p className="mt-2 text-xs text-red-400">{activationError}</p>
          )}
          <AuditLogViewer entries={taskAuditLog} />
        </div>

        {/* Right — Prompt */}
        <div className="flex-1 flex flex-col px-4 py-4 overflow-y-auto">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">Cursor Prompt</p>
          <PromptPanel prompt={prompt} />
        </div>

      </div>
    </div>
  )
}
