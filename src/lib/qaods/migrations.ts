import type { Task } from './types'

export const CURRENT_SCHEMA_VERSION = 1

type MigrationFn = (raw: Record<string, unknown>) => Record<string, unknown>

const migrations: Record<number, MigrationFn> = {
  // v0 → v1: add userId and teamId defaults
  1: (raw) => ({
    ...raw,
    userId: raw.userId ?? 'default',
    teamId: raw.teamId ?? 'default',
  }),
}

export function migrateTask(raw: Record<string, unknown>): Task {
  let version = (raw.schemaVersion as number) ?? 0
  let data = (raw.data as Record<string, unknown>) ?? raw

  while (version < CURRENT_SCHEMA_VERSION) {
    data = migrations[version + 1](data)
    version++
  }

  return data as Task
}
