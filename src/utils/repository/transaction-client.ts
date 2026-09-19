import type { getDb } from '@/db'

export type RepositoryTransactionClient = Parameters<
  Parameters<Awaited<ReturnType<typeof getDb>>['transaction']>[0]
>[0]
