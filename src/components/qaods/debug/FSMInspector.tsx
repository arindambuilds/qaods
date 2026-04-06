import type { QAODSContext } from '../../../lib/qaods/types'

interface FSMInspectorProps {
  state: string
  context: QAODSContext
}

export default function FSMInspector({ state, context }: FSMInspectorProps) {
  if (process.env.NODE_ENV !== 'development') return null
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black/90 text-green-400 font-mono text-xs p-3 rounded border border-green-900 max-w-sm max-h-64 overflow-auto">
      <div className="font-bold mb-1">FSM: {state}</div>
      <pre>{JSON.stringify(context, null, 2)}</pre>
    </div>
  )
}
