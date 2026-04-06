import React, { useState } from 'react'

interface PromptPanelProps {
  prompt: string | null
}

export default function PromptPanel({ prompt }: PromptPanelProps) {
  const [copied, setCopied] = useState(false)

  if (prompt === null) {
    return (
      <div className="p-4 text-xs text-gray-600 font-mono">
        Select a task to generate prompt
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-900">
        <span className="text-xs text-gray-500 font-mono">CURSOR PROMPT</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(prompt)
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
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

      <div className="flex-1 overflow-auto p-4">
        <pre className="text-xs text-slate-400 font-mono leading-relaxed whitespace-pre-wrap break-words">
          {prompt}
        </pre>
      </div>
    </div>
  )
}