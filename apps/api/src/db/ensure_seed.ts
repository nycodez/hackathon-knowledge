import { createHash } from 'node:crypto'
import { createTascoDemoData } from '../../../../packages/shared/src/index.js'
import { getOptionalEnv } from '../config/env.js'
import { WORKBOOK_DOCUMENTS } from '../fixtures/workbook_documents.js'
import { query } from './pool.js'

let seedPromise: Promise<void> | undefined

export class DatabaseSchemaOutdatedError extends Error {
  constructor(public readonly missingMigration: string) {
    super(`Database schema is outdated. Run "pnpm db:migrate" before seeding (missing ${missingMigration}).`)
    this.name = 'DatabaseSchemaOutdatedError'
  }
}

export function ensureSeed(): Promise<void> {
  if (getOptionalEnv('SEED_ON_BOOT') === 'false') return Promise.resolve()
  seedPromise ??= ensureCanonicalSeed().catch((error) => {
    seedPromise = undefined
    throw error
  })
  return seedPromise
}

export async function resetSeed(): Promise<void> {
  const { seedDatabase } = await import('../../scripts/seed.js')
  await seedDatabase({ resetDemoState: true })
  seedPromise = Promise.resolve()
}

async function ensureCanonicalSeed(): Promise<void> {
  const schema = await query<{ personas_table: string | null }>(
    `SELECT to_regclass('public.tasco_demo_personas')::text AS personas_table`
  )
  if (!schema.rows[0]?.personas_table) {
    throw new DatabaseSchemaOutdatedError('006_property_management_personas_and_identity_integrity')
  }

  const expectedChecksum = createHash('sha256')
    .update(JSON.stringify({ data: createTascoDemoData(), workbookDocuments: WORKBOOK_DOCUMENTS }))
    .digest('hex')
  const result = await query<{ checksum: string | null; documents: string }>(
    `
      SELECT
        (SELECT checksum FROM tasco_seed_checksums WHERE tenant_id = 'tasco-demo' AND seed_name = 'workspace-demo:v1') AS checksum,
        (SELECT count(*)::text FROM knowledge_sources WHERE tenant_id = 'tasco-demo' AND source_type = 'workspace_document') AS documents
    `
  )
  const state = result.rows[0]
  if (state?.checksum === expectedChecksum && Number(state.documents) > 0) return

  const { seedDatabase } = await import('../../scripts/seed.js')
  await seedDatabase()
}
