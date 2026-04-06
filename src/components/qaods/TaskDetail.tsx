import React, { useEffect, useState } from 'react'
import { Task, TaskPriority, TaskStatus, WorkflowState, QAODSContext } from '../../lib/qaods/types'
import { MAX_TASK_ITERATIONS, validateTaskActivation } from '../../lib/qaods/executionController'
import StatusBadge from './StatusBadge'

export interface TaskUpdateData {
  title: string
  description: string
  component: string
  priority: TaskPriority
  tags: string
}

export type TaskIterateHandler = (taskId: string) => void

interface TaskDetailProps {
  task: Task | null
  onStatusChange: (id: string, status: TaskStatus) => void
  onUpdate: (id: string, updatedData: TaskUpdateData) => void
  onIterate: TaskIterateHandler
  fsmState?: string
  fsmContext?: QAODSContext
  activeTaskId?: string | null
  onApprove?: () => void
  onReject?: () => void
  onReset?: () => void
}

// All valid FSM states — must match machine.ts
const VALID_FSM_STATES: WorkflowState[] = [
  'IDLE', 'PENDING', 'STRATEGIST', 'RESEARCHER',
  'EXECUTOR', 'AUDITOR', 'ITERATE', 'MERGED', 'FAILED',
]

// States where the pipeline is actively running (disable manual triggers)
const RUNNING_STATES: WorkflowState[] = [
  'PENDING', 'STRATEGIST', 'RESEARCHER', 'EXECUTOR', 'AUDITOR', 'ITERATE',
]

function parseWorkflowState(raw: string | undefined): WorkflowState | null {
  if (!raw) return null
  return (VALID_FSM_STATES as string[]).includes(raw) ? (raw as WorkflowState) : null
}

function statusDescription(status: TaskStatus): string {
  switch (status) {
    case 'active': return 'in-progress'
    case 'todo': return 'todo'
    case 'done': return 'done'
    case 'blocked': return 'blocked'
    default: return status
  }
}

export default React.memo(function TaskDetail({
  task, onStatusChange, onUpdate, onIterate,
  fsmState, fsmContext, activeTaskId,
  onApprove, onReject, onReset,
}: TaskDetailProps) {
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [component, setComponent] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [tags, setTags] = useState('')

  useEffect(() => {
    if (!task) return
    setTitle(task.title)
    setDescription(task.description ?? '')
    setComponent(task.component ?? '')
    setPriority(task.priority ?? 'medium')
    setTags(task.tags ?? '')
    setIsEditing(false)
    setError(null)
  }, [task?.id, task?.title, task?.description, task?.component, task?.priority, task?.tags])

  if (task === null) {
    return (
      <div className="p-6 text-xs text-gray-600 font-mono">
        Select a task to view details
      </div>
    )
  }

  // Only show live FSM state for the task currently loaded in the machine
  const isActiveFsmTask = activeTaskId != null && task.id === activeTaskId
  const liveState = isActiveFsmTask ? parseWorkflowState(fsmState) : null
  const effectiveState: WorkflowState | undefined = liveState ?? task.workflowState

  const isPipelineRunning = liveState !== null && (RUNNING_STATES as string[]).includes(liveState)
  const isMerged = liveState === 'MERGED'
  const isFailed = liveState === 'FAILED'
  const isInAuditor = liveState === 'AUDITOR'

  const buttonClass = 'text-xs px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
  const inputClass = 'w-full bg-gray-900 border border-gray-800 text-xs text-slate-300 rounded px-3 py-2 focus:outline-none focus:border-blue-800 placeholder:text-gray-700'

  const canActivate = task.status === 'todo'
  const canComplete = task.status === 'active'
  const canBlock = task.status !== 'blocked'
  const canReopen = task.status === 'blocked'
  const iterationAtLimit = task.iterationCount >= MAX_TASK_ITERATIONS
  const iterationDisplay = Math.min(task.iterationCount + 1, MAX_TASK_ITERATIONS)

  // Build a human-readable failure reason
  const failureReason = (() => {
    if (!isFailed) return null
    if (fsmContext?.failureError) {
      return `${fsmContext.failureError.code}: ${fsmContext.failureError.message}`
    }
    if (fsmContext?.finalScore !== undefined) {
      return `Audit score ${fsmContext.finalScore}/100 did not reach the threshold of 85 within ${fsmContext.iterationsUsed ?? MAX_TASK_ITERATIONS} iteration(s).`
    }
    return 'Pipeline failed. Check the audit log for details.'
  })()

  return (
    <div className="p-4 space-y-4">
      {/* Title row */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-sm font-bold text-slate-200">{task.title}</h2>
        <StatusBadge status={task.status} />
        <span className="text-xs text-gray-500 font-mono">
          ({statusDescription(task.status)}
          {effectiveState !== undefined ? ` · FSM: ${effectiveState}` : ''})
        </span>
        {!isEditing && !isPipelineRunning && (
          <button
            type="button"
            onClick={() => {
              setTitle(task.title)
              setDescription(task.description ?? '')
              setComponent(task.component ?? '')
              setPriority(task.priority ?? 'medium')
              setTags(task.tags ?? '')
              setError(null)
              setIsEditing(true)
            }}
            className={`${buttonClass} bg-gray-800 hover:bg-gray-700 text-gray-300`}
          >
            Edit
          </button>
        )}
      </div>

      {/* MERGED success banner */}
      {isMerged && (
        <div className="rounded border border-green-900/60 bg-green-950/30 p-3">
          <div className="text-xs text-green-400 font-mono font-semibold mb-1">
            ✓ MERGED — Pipeline complete
          </div>
          <div className="text-xs text-green-300/70 font-mono">
            Audit score {fsmContext?.auditResult?.score ?? '—'}/100 passed the threshold.
            Use <span className="text-green-200">Reset</span> to run a new task, or select another task from the list.
          </div>
        </div>
      )}

      {/* FAILED error banner */}
      {isFailed && failureReason && (
        <div className="rounded border border-red-900/60 bg-red-950/30 p-3">
          <div className="text-xs text-red-400 font-mono font-semibold mb-1">
            ✗ FAILED — Pipeline exhausted
          </div>
          <div className="text-xs text-red-300/80 font-mono whitespace-pre-wrap break-words">
            {failureReason}
          </div>
          <div className="text-xs text-red-400/60 font-mono mt-1">
            Use <span className="text-red-300">Reset</span> to clear and start over.
          </div>
        </div>
      )}

      {/* Running indicator */}
      {isPipelineRunning && (
        <div className="rounded border border-blue-900/40 bg-blue-950/20 px-3 py-2">
          <div className="text-xs text-blue-400 font-mono animate-pulse">
            ⟳ Pipeline running — {liveState}…
          </div>
        </div>
      )}

      {/* Edit form */}
      {isEditing ? (
        <div className="space-y-3">
          <label className="block text-xs text-gray-500 font-mono mb-1">
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="Task title" />
          </label>
          <label className="block text-xs text-gray-500 font-mono mb-1">
            Description
            <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} placeholder="What needs to happen..." />
          </label>
          <label className="block text-xs text-gray-500 font-mono mb-1">
            Component
            <input value={component} onChange={(e) => setComponent(e.target.value)} className={inputClass} placeholder="AuthModule" />
          </label>
          <label className="block text-xs text-gray-500 font-mono mb-1">
            Priority
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={`${inputClass} cursor-pointer`}>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label className="block text-xs text-gray-500 font-mono mb-1">
            Tags
            <input value={tags} onChange={(e) => setTags(e.target.value)} className={inputClass} placeholder="auth, api, bugfix" />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (!title.trim()) { setError('Title is required.'); return }
                onUpdate(task.id, { title: title.trim(), description: description.trim(), component: component.trim(), priority, tags: tags.trim() })
                setIsEditing(false)
                setError(null)
              }}
              className={`${buttonClass} bg-blue-900 hover:bg-blue-800 text-blue-200`}
            >Save</button>
            <button
              type="button"
              onClick={() => {
                setTitle(task.title); setDescription(task.description ?? ''); setComponent(task.component ?? '')
                setPriority(task.priority ?? 'medium'); setTags(task.tags ?? ''); setError(null); setIsEditing(false)
              }}
              className={`${buttonClass} bg-gray-800 hover:bg-gray-700 text-gray-300`}
            >Cancel</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1">Component</div>
            <div className="text-xs text-slate-400">{task.component}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1">File Path</div>
            <div className="text-xs text-slate-400 break-all font-mono">{task.filePath}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1">Priority</div>
            <div className="text-xs text-slate-400 capitalize">{task.priority}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1">Tags</div>
            <div className="text-xs text-slate-400 font-mono break-all">{task.tags?.trim() ? task.tags : '—'}</div>
          </div>
          <div>
            <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1">Iteration</div>
            <div className="text-xs text-slate-400">
              {iterationDisplay} of {MAX_TASK_ITERATIONS}
              {isActiveFsmTask && fsmContext?.iterationCount !== undefined && fsmContext.iterationCount > 0
                ? ` (${fsmContext.iterationCount} run)`
                : ''}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1">Created</div>
            <div className="text-xs text-slate-400">{new Date(task.createdAt).toLocaleString()}</div>
          </div>
          {fsmContext?.auditResult && isActiveFsmTask && (
            <div className="col-span-2">
              <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1">Last Audit Score</div>
              <div className="text-xs font-mono">
                <span className={fsmContext.auditResult.passed ? 'text-green-400' : 'text-red-400'}>
                  {fsmContext.auditResult.score}/100 — {fsmContext.auditResult.passed ? 'passed' : 'below threshold'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-1">DESCRIPTION</div>
        <div className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
          {task.description?.trim() ? task.description : '—'}
        </div>
      </div>

      {/* Actions */}
      {!isEditing && (
        <div>
          <div className="text-xs text-gray-600 font-mono uppercase tracking-wider mb-2">Actions</div>
          <div className="flex gap-2 flex-wrap items-center">

            {/* FSM override buttons — only shown when relevant */}
            {isInAuditor && onApprove && (
              <button type="button" onClick={onApprove}
                className={`${buttonClass} bg-green-900 hover:bg-green-800 text-green-200`}>
                Approve
              </button>
            )}
            {isInAuditor && onReject && (
              <button type="button" onClick={onReject}
                className={`${buttonClass} bg-red-900/60 hover:bg-red-900 text-red-300`}>
                Reject
              </button>
            )}
            {(isFailed || isMerged) && onReset && (
              <button type="button" onClick={onReset}
                title="Clear pipeline context and return to IDLE"
                className={`${buttonClass} bg-gray-700 hover:bg-gray-600 text-gray-200`}>
                Reset pipeline
              </button>
            )}

            {/* Task status actions — disabled while pipeline is running */}
            {canActivate && (
              <button
                type="button"
                disabled={isPipelineRunning}
                onClick={() => {
                  const result = validateTaskActivation(task)
                  if (result.valid) { onStatusChange(task.id, 'active'); setError(null) }
                  else setError(result.reason ?? null)
                }}
                className={`${buttonClass} bg-blue-900 hover:bg-blue-800 text-blue-200`}>
                Activate
              </button>
            )}
            {canComplete && (
              <button type="button" disabled={isPipelineRunning}
                onClick={() => { setError(null); onStatusChange(task.id, 'done') }}
                className={`${buttonClass} bg-green-900 hover:bg-green-800 text-green-200`}>
                Complete
              </button>
            )}
            {canBlock && (
              <button type="button" disabled={isPipelineRunning}
                onClick={() => { setError(null); onStatusChange(task.id, 'blocked') }}
                className={`${buttonClass} bg-red-900/50 hover:bg-red-900 text-red-400`}>
                Block
              </button>
            )}
            {canReopen && (
              <button type="button"
                onClick={() => { setError(null); onStatusChange(task.id, 'todo') }}
                className={`${buttonClass} bg-gray-800 hover:bg-gray-700 text-gray-300`}>
                Reopen
              </button>
            )}
          </div>

          {iterationAtLimit && !isMerged && !isFailed && (
            <p className="text-xs text-amber-500 font-mono mt-2">Iteration limit reached ({MAX_TASK_ITERATIONS})</p>
          )}
          {error && <p className="text-xs text-red-400 font-mono mt-2">{error}</p>}
        </div>
      )}
    </div>
  )
})
