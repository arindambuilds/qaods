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

// Visual field groups — purely cosmetic, does not affect data flow
const FIELD_GROUPS: { label: string; ids: string[] }[] = [
  {
    label: 'Personal details',
    ids: ['candidateName', 'fatherName', 'motherName', 'dob', 'gender'],
  },
  {
    label: 'Academic & exam details',
    ids: ['classLevel', 'stream', 'rollNumber', 'schoolCode', 'subjects', 'examCentre', 'examCentreCode'],
  },
  {
    label: 'Category & reservation',
    ids: ['category', 'certificateType'],
  },
  {
    label: 'Declarations',
    ids: ['photoUploaded', 'signatureConfirmed'],
  },
]

export default memo(function DocForm({
  fields, values, issues, disabled, onFieldChange, onRunChecks,
}: Props) {
  // Build issue lookup
  const issueMap = new Map<string, { severity: 'error' | 'warn'; message: string }[]>()
  for (const iss of issues) {
    if (!iss.fieldId) continue
    const existing = issueMap.get(iss.fieldId) ?? []
    existing.push(iss)
    issueMap.set(iss.fieldId, existing)
  }

  // Index fields by id for O(1) lookup
  const fieldById = new Map(fields.map(f => [f.id, f]))

  // Fields not in any group (fallback group)
  const groupedIds = new Set(FIELD_GROUPS.flatMap(g => g.ids))
  const ungrouped  = fields.filter(f => !groupedIds.has(f.id))

  function renderField(field: DocField) {
    const value      = values[field.id] ?? ''
    const fieldIssues = issueMap.get(field.id) ?? []
    const hasError   = fieldIssues.some(i => i.severity === 'error')
    const hasWarn    = fieldIssues.some(i => i.severity === 'warn')

    const inputCls = [
      'w-full rounded-lg border px-3 py-2 text-sm text-slate-900',
      'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
      'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
      hasError ? 'border-red-400 bg-red-50'
        : hasWarn ? 'border-amber-400 bg-amber-50'
        : 'border-slate-200 bg-white',
    ].join(' ')

    const inputId = `field-${field.id}`

    return (
      <div key={field.id} className="flex flex-col gap-1">
        <label htmlFor={inputId} className="text-xs font-medium text-slate-600">
          {field.label}
          {field.required && <span className="text-red-500 ml-0.5" aria-hidden>*</span>}
        </label>

        {field.type === 'select' && field.options ? (
          <select
            id={inputId}
            value={value}
            disabled={disabled}
            onChange={e => onFieldChange(field.id, e.target.value)}
            className={`${inputCls} cursor-pointer`}
          >
            <option value="">— select —</option>
            {field.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : (
          <input
            id={inputId}
            type="text"
            value={value}
            disabled={disabled}
            placeholder={field.type === 'date' ? 'dd/mm/yyyy' : undefined}
            onChange={e => onFieldChange(field.id, e.target.value)}
            className={inputCls}
          />
        )}

        {fieldIssues.map((iss, i) => (
          <p key={i} className={`text-xs ${iss.severity === 'error' ? 'text-red-500' : 'text-amber-600'}`}>
            {iss.message}
          </p>
        ))}
      </div>
    )
  }

  function renderGroup(groupLabel: string, groupIds: string[]) {
    const groupFields = groupIds.map(id => fieldById.get(id)).filter(Boolean) as DocField[]
    if (groupFields.length === 0) return null
    return (
      <fieldset key={groupLabel} className="mb-6">
        <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
          {groupLabel}
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {groupFields.map(renderField)}
        </div>
      </fieldset>
    )
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-slate-800 mb-6">Form details</h2>

      {FIELD_GROUPS.map(g => renderGroup(g.label, g.ids))}

      {/* Ungrouped fallback */}
      {ungrouped.length > 0 && (
        <fieldset className="mb-6">
          <legend className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">
            Other
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ungrouped.map(renderField)}
          </div>
        </fieldset>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={onRunChecks}
        className={[
          'mt-2 w-full rounded-lg px-4 py-3 text-sm font-semibold text-white transition-colors min-h-[44px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
          disabled
            ? 'bg-indigo-400 cursor-not-allowed opacity-70'
            : 'bg-indigo-600 hover:bg-indigo-700',
        ].join(' ')}
      >
        {disabled ? 'Checking…' : 'Check my form'}
      </button>
    </div>
  )
})
