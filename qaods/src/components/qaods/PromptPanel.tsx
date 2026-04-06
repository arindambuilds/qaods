import React, { useState } from 'react'

interface PromptPanelProps {
  prompt: string | null
}

const COPIED_MS = 2000

export default function PromptPanel({ prompt }: PromptPanelProps) {
  const [copied, setCopied] = useState(false)

  if (prompt === null) {
    return (
      <div className="p-4 text-xs text-gray-600 font-mono">
        Select a task to show its generated Cursor prompt
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-900 shrink-0">
        <span className="text-xs text-gray-500 font-mono">CURSOR PROMPT</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(prompt)
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

      <div className="flex-1 min-h-0 p-4">
        <div className="h-full min-h-[120px] max-h-full overflow-y-auto rounded border border-gray-800 bg-gray-950/80 p-3">
          <pre className="text-xs text-slate-400 font-mono leading-relaxed whitespace-pre-wrap break-words">
            {prompt}
          </pre>
        </div>
      </div>
    </div>
  )
}
