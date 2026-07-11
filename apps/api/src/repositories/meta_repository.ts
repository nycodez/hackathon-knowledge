import {
  PRIMARY_LOCALE,
  TRACK_CODE,
  TRACK_TITLE,
} from '@hackathon/shared'
import { getOptionalEnv } from '../config/env.js'
import { query } from '../db/pool.js'
import type { DatasetCounts, HealthStatus, RuntimeMeta } from './secure_types.js'

const startedAt = Date.now()

interface CountRow {
  documents: string
  chunks: string
  kg_nodes: string
  kg_edges: string
  departments: string
  users: string
  subsidiaries: string
  permission_cases: string
  public_eval_rows: string
  eval_runs: string
  seed_checksums: string
}

export default class MetaRepository {
  public async health(): Promise<HealthStatus> {
    const started = Date.now()
    let db: HealthStatus['db'] = { ok: false, latency_ms: null }
    let seedChecksum: string | null = null
    try {
      const result = await query<{ checksum: string | null }>(`
        SELECT (SELECT checksum FROM tasco_seed_checksums WHERE tenant_id = 'tasco-demo' AND seed_name = 'workspace-demo:v1') AS checksum
      `)
      seedChecksum = result.rows[0]?.checksum ?? null
      db = { ok: true, latency_ms: Date.now() - started }
    } catch (error) {
      db = {
        ok: false,
        latency_ms: Date.now() - started,
        error: error instanceof Error ? error.message : 'Database ping failed',
      }
    }

    return {
      service: 'hackathon-knowledge',
      track: TRACK_CODE,
      title: TRACK_TITLE,
      status: db.ok ? 'ok' : 'degraded',
      runtime: 'express',
      version: getOptionalEnv('GIT_SHA') ?? getOptionalEnv('VERCEL_GIT_COMMIT_SHA') ?? 'turn2-pass1',
      uptime_s: Math.round((Date.now() - startedAt) / 1000),
      db,
      llm: this.llmMode(),
      embeddings: this.embeddingStatus(),
      seed_checksum: seedChecksum,
      time: new Date().toISOString(),
    }
  }

  public async meta(): Promise<RuntimeMeta> {
    const counts = await this.databaseCounts()
    return this.runtimeMeta(counts, 'database')
  }

  private async databaseCounts(): Promise<DatasetCounts> {
    const result = await query<CountRow>(
      `
        SELECT
          (SELECT count(*) FROM knowledge_sources WHERE tenant_id = 'tasco-demo' AND source_type = 'workspace_document' AND deleted_at IS NULL) AS documents,
          (SELECT count(*) FROM knowledge_chunks WHERE tenant_id = 'tasco-demo' AND deleted_at IS NULL) AS chunks,
          (SELECT count(*) FROM kg_nodes WHERE tenant_id = 'tasco-demo' AND deleted_at IS NULL) AS kg_nodes,
          (SELECT count(*) FROM kg_edges WHERE tenant_id = 'tasco-demo') AS kg_edges,
          (SELECT count(DISTINCT department_id) FROM knowledge_sources WHERE tenant_id = 'tasco-demo' AND deleted_at IS NULL) AS departments,
          (SELECT count(*) FROM tasco_users) AS users,
          (SELECT count(DISTINCT subsidiary_id) FROM knowledge_sources WHERE tenant_id = 'tasco-demo' AND deleted_at IS NULL) AS subsidiaries,
          (SELECT count(*) FROM tasco_permission_cases) AS permission_cases,
          (SELECT count(*) FROM tasco_public_eval_rows) AS public_eval_rows,
          (SELECT count(*) FROM tasco_eval_runs WHERE tenant_id = 'tasco-demo') AS eval_runs,
          (SELECT count(*) FROM tasco_seed_checksums WHERE tenant_id = 'tasco-demo') AS seed_checksums
      `
    )
    const row = result.rows[0]
    if (!row || Number(row.documents) === 0) {
      throw new Error('Tasco database is not seeded')
    }
    return {
      documents: Number(row.documents),
      chunks: Number(row.chunks),
      kgNodes: Number(row.kg_nodes),
      kgEdges: Number(row.kg_edges),
      departments: Number(row.departments),
      users: Number(row.users),
      subsidiaries: Number(row.subsidiaries),
      permissionCases: Number(row.permission_cases),
      publicEvalRows: Number(row.public_eval_rows),
      evalRuns: Number(row.eval_runs),
      seedChecksums: Number(row.seed_checksums),
    }
  }

  private runtimeMeta(counts: DatasetCounts, source: RuntimeMeta['source']): RuntimeMeta {
    return {
      track: TRACK_CODE,
      title: TRACK_TITLE,
      apiPrefix: '/api/v1',
      stack: 'Angular + Express + Neon Postgres/pgvector + Claude-ready retrieval',
      counts,
      llm: this.llmMode(),
      embeddings: this.embeddingStatus(),
      locale: PRIMARY_LOCALE,
      source,
    }
  }

  private embeddingStatus(): string {
    return getOptionalEnv('EMBEDDINGS_ENABLED') === 'true'
      ? `bedrock:${getOptionalEnv('EMBEDDING_MODEL') ?? 'cohere.embed-multilingual-v3'}`
      : 'absent'
  }

  private llmMode(): 'deterministic' | 'claude' {
    return getOptionalEnv('LLM_PROVIDER') === 'claude' && Boolean(getOptionalEnv('ANTHROPIC_API_KEY'))
      ? 'claude'
      : 'deterministic'
  }
}
