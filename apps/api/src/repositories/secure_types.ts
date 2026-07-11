import type {
  TascoAuditEventType,
  TascoClassification,
  TascoDepartmentId,
  TascoDocument,
  TascoRole,
  TascoUser,
} from '@hackathon/shared'

export interface Principal {
  userId: string
  role: TascoRole
  departmentId: TascoDepartmentId
  subsidiaryId: string
  tenantId: string
}

export interface DatasetCounts {
  documents: number
  chunks: number
  kgNodes?: number
  kgEdges?: number
  departments: number
  users: number
  subsidiaries: number
  permissionCases: number
  publicEvalRows: number
  evalRuns?: number
  seedChecksums?: number
}

export interface RuntimeMeta {
  track: string
  title: string
  apiPrefix: string
  stack: string
  counts: DatasetCounts
  llm: 'deterministic' | 'claude'
  embeddings: string
  locale: string
  source: 'database' | 'seed'
}

export interface HealthStatus {
  service: string
  track: string
  title: string
  status: 'ok' | 'degraded'
  runtime: 'express'
  version: string
  uptime_s: number
  db: {
    ok: boolean
    latency_ms: number | null
    error?: string
  }
  llm: 'deterministic' | 'claude'
  embeddings: string
  seed_checksum: string | null
  time: string
}

export interface AuthorizedDocumentRow {
  document: TascoDocument
  chunkId: string
  content: string
}

export interface AuthorizedDocumentSearch {
  rows: AuthorizedDocumentRow[]
  totalCandidates: number
}

export interface RetrievalAuditEventInput {
  tenantId: string
  actorUserId: string | null
  eventType: TascoAuditEventType
  enforcementPoint: string | null
  metadata: Record<string, unknown>
}

export interface RetrievalAuditEventRow {
  id: string
  tenant_id: string
  actor_user_id: string | null
  event_type: TascoAuditEventType
  enforcement_point: string | null
  metadata: Record<string, unknown>
  created_at: Date | string
}

export interface RetrievalAuditReplayFilters {
  tenantId: string
  actorUserId?: string
  documentId?: string
  eventType?: TascoAuditEventType
  limit: number
}
