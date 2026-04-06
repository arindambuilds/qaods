import type { Task } from './types'
import type { PersistenceAdapter } from './persistence'

export async function seedDevTasks(adapter: PersistenceAdapter): Promise<void> {
  if (process.env.NODE_ENV !== 'development') return

  const now = new Date().toISOString()

  const seeds: Task[] = [
    {
      id: 'seed-1',
      title: 'Fix auth token refresh',
      component: 'AuthModule',
      filePath: 'src/lib/auth/tokenRefresh.ts',
      description: 'The token refresh logic silently fails when the refresh token is expired. Add proper error handling and redirect to login.',
      priority: 'high',
      tags: 'auth, bugfix',
      status: 'todo',
      iterationCount: 0,
      userId: 'dev',
      teamId: 'team-a',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'seed-2',
      title: 'Add loading skeleton to TaskList',
      component: 'TaskList',
      filePath: 'src/components/qaods/TaskList.tsx',
      description: 'Show a skeleton placeholder while tasks are loading from the persistence adapter on mount.',
      priority: 'medium',
      tags: 'ui, ux',
      status: 'todo',
      iterationCount: 0,
      userId: 'dev',
      teamId: 'team-a',
      createdAt: now,
      updatedAt: now,
    },
  ]

  for (const task of seeds) {
    await adapter.saveTask(task)
  }
}
