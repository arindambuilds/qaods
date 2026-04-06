import React, { useState } from 'react'
import { PromptPayload } from '../../lib/qaods/types'

interface PromptPanelProps {
  prompt: PromptPayload | null
}

const COPIED_MS = 2000

export default React.memo(function PromptPanel({ prompt }: PromptPanelProps) {
  const [copied, setCopied] = useState(false)

  if (prompt === null) {
    return (
      <div className="p-4 text-xs text-gray-600 font-mono">
        Select a task to show its generated Cursor prompt
      </div>
    )
  }

  const fullText = [
    `[SYSTEM]\n${prompt.systemPrompt}`,
    `[USER]\n${prompt.userPrompt}`,
    prompt.constraints.length > 0
      ? `[CONSTRAINTS]\n${prompt.constraints.map((c, i) => `${i + 1}. ${c}`).join('\n')}`
      : null,
  ]
    .filter(Boolean)
    .join('\n\n')

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-900 shrink-0">
        <span className="text-xs text-gray-500 font-mono">CURSOR PROMPT</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(fullText)
            setCopied(true)
            window.setTimeout(() => setCopied(false), COPIED_MS)
          }}
          className={`text-xs px-3 py-1 rounded font-mono transition-colors ${
            copied
              ? 'bg-green-900 text-green-300'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-400'
          }`}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      <div className="flex-1 min-h-0 p-4 space-y-3 overflow-y-auto">
        {/* System Prompt */}
        <div>
          <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-1">
            System Prompt
          </div>
          <div className="rounded border border-gray-800 bg-gray-950/80 p-3">
            <pre className="text-xs text-slate-400 font-mono leading-relaxed whitespace-pre-wrap break-words">
              {prompt.systemPrompt}
            </pre>
          </div>
        </div>

        {/* User Prompt */}
        <div>
          <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-1">
            User Prompt
          </div>
          <div className="rounded border border-gray-800 bg-gray-950/80 p-3">
            <pre className="text-xs text-slate-400 font-mono leading-relaxed whitespace-pre-wrap break-words">
              {prompt.userPrompt}
            </pre>
          </div>
        </div>

        {/* Constraints */}
        {prompt.constraints.length > 0 && (
          <div>
            <div className="text-[10px] text-gray-600 font-mono uppercase tracking-wider mb-1">
              Constraints
            </div>
            <ul className="rounded border border-gray-800 bg-gray-950/80 p-3 space-y-1">
              {prompt.constraints.map((constraint, index) => (
                <li key={index} className="text-xs text-slate-400 font-mono flex gap-2">
                  <span className="text-gray-600 shrink-0">{index + 1}.</span>
                  <span>{constraint}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
})
