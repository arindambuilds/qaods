'use client'
import React, { memo } from 'react'
import type { DocField } from '../../lib/qaods/types'

interface Props {
  fields: DocField[]
  values: Record<string, string>
  issues: { fieldId: string | null; severity: 'error' | 'warn'; message: string }[]
  disabled: boolean
  onFieldChange: (fieldId: string, value: string) => void
  onRunChecks: () => void
}

const inputBase =
  'w-full bg-gray-900 border text-xs text-slate-300 rounded px-3 py-2 focus:outline-none placeholder:text-gray-700 transition-colors'

export default memo(function DocForm({
  fields, values, issues, disabled, onFieldChange, onRunChecks,
}: Props) {
  const issueMap = new Map<string, { severity: 'error' | 'warn'; message: string }[]>()
  for (const iss of issues) {
    if (!iss.fieldId) continue
    const existing = issueMap.get(iss.fieldId) ?? []
    existing.push(iss)
    issueMap.set(iss.fieldId, existing)
  }

  return (
    <div className="p-4 space-y-3">
      {fields.map(field => {
        const value = values[field.id] ?? ''
        const fieldIssues = issueMap.get(field.id) ?? []
        const hasError = fieldIssues.some(i => i.severity === 'error')
        const hasWarn  = fieldIssues.some(i => i.severity === 'warn')
        const borderColor = hasError
          ? 'border-red-800 focus:border-red-600'
          : hasWarn
          ? 'border-amber-800 focus:border-amber-600'
          : 'border-gray-800 focus:border-blue-800'

        return (
          <div key={field.id}>
            <label className="block text-xs text-gray-500 font-mono mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>

            {field.type === 'select' && field.options ? (
              <select
                value={value}
                disabled={disabled}
                onChange={e => onFieldChange(field.id, e.target.value)}
                className={`${inputBase} ${borderColor} cursor-pointer disabled:opacity-50`}
              >
                <option value="">— select —</option>
                {field.options.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : field.type === 'date' ? (
              <input
                type="text"
                value={value}
                disabled={disabled}
                placeholder="dd/mm/yyyy"
                onChange={e => onFieldChange(field.id, e.target.value)}
                className={`${inputBase} ${borderColor} disabled:opacity-50`}
              />
            ) : (
              <input
                type={field.type === 'number' ? 'text' : 'text'}
                value={value}
                disabled={disabled}
                onChange={e => onFieldChange(field.id, e.target.value)}
                className={`${inputBase} ${borderColor} disabled:opacity-50`}
              />
            )}

            {fieldIssues.map((iss, i) => (
              <p
                key={i}
                className={`text-[11px] font-mono mt-0.5 ${
                  iss.severity === 'error' ? 'text-red-400' : 'text-amber-400'
                }`}
              >
                {iss.message}
              </p>
            ))}
          </div>
        )
      })}

      <button
        type="button"
        disabled={disabled}
        onClick={onRunChecks}
        className="w-full mt-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed text-blue-200 text-xs font-medium py-2 rounded transition-colors"
      >
        {disabled ? 'Checking…' : 'Check my form'}
      </button>
    </div>
  )
})
