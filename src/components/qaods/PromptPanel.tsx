import React, { useState } from 'react'

interface PromptPanelProps {
  prompt: string | null
}

export default function PromptPanel({ prompt }: PromptPanelProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    if (!prompt) return
    navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col h-full">
      {!prompt ? (
        <p className="text-gray-600 text-sm">Select a task to generate prompt</p>
      ) : (
        <>
          <pre className="flex-1 overflow-y-auto text-xs font-mono text-gray-300 bg-gray-900 border border-gray-800 rounded p-3 whitespace-pre-wrap break-words">
            {prompt}
          </pre>
          <div
            onClick={handleCopy}
            className="cursor-pointer mt-3 text-center text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded px-3 py-1.5 font-medium"
          >
            {copied ? 'Copied!' : 'Copy Prompt'}
          </div>
        </>
      )}
    </div>
  )
}