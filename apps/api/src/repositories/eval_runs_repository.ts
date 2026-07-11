import { randomUUID } from 'node:crypto'
import { query } from '../db/pool.js'
import type { TascoEvalReport } from '@hackathon/shared'

export interface EvalRunRecordInput {
  tenantId: string
  runType: string
  report: TascoEvalReport
  metadata: Record<string, unknown>
}

export default class EvalRunsRepository {
  public async record(input: EvalRunRecordInput): Promise<string> {
    const id = randomUUID()
    await query(
      `
        INSERT INTO tasco_eval_runs (
          id, tenant_id, track_code, run_type, status, score, total, leaks,
          permission_cases, public_eval_rows, metadata
        )
        VALUES ($1, $2, 'tasco', $3, $4, $5, $6, $7, $8, $9, $10)
      `,
      [
        id,
        input.tenantId,
        input.runType,
        input.report.score === input.report.total && input.report.leaks === 0 ? 'passed' : 'failed',
        input.report.score,
        input.report.total,
        input.report.leaks,
        input.report.caseResults.length,
        input.report.publicResults.length,
        { ...input.metadata, report: input.report },
      ]
    )
    return id
  }

  public async latest(): Promise<{
    id: string
    status: string
    score: number
    total: number
    leaks: number
    report: TascoEvalReport | null
    metadata: Record<string, unknown>
    createdAt: string
  } | null> {
    const result = await query<{
      id: string
      status: string
      score: number
      total: number
      leaks: number
      metadata: Record<string, unknown> & { report?: TascoEvalReport }
      created_at: Date | string
    }>(
      `
        SELECT id, status, score, total, leaks, metadata, created_at
        FROM tasco_eval_runs
        WHERE tenant_id = 'tasco-demo' AND track_code = 'tasco'
        ORDER BY created_at DESC
        LIMIT 1
      `
    )
    const row = result.rows[0]
    if (!row) return null
    return {
      id: row.id,
      status: row.status,
      score: row.score,
      total: row.total,
      leaks: row.leaks,
      report: row.metadata.report ?? null,
      metadata: row.metadata,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    }
  }
}
