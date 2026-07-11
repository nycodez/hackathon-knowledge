import { randomUUID } from 'node:crypto'
import { query } from '../db/pool.js'
import type {
  RetrievalAuditEventInput,
  RetrievalAuditEventRow,
  RetrievalAuditReplayFilters,
} from './secure_types.js'

export default class AuditRepository {
  public async record(event: RetrievalAuditEventInput): Promise<string> {
    const id = randomUUID()
    await query(
      `
        INSERT INTO retrieval_audit_events (
          id, tenant_id, track_code, actor_user_id, event_type, enforcement_point, metadata
        )
        VALUES ($1, $2, 'tasco', $3, $4, $5, $6)
      `,
      [
        id,
        event.tenantId,
        event.actorUserId,
        event.eventType,
        event.enforcementPoint,
        event.metadata,
      ]
    )
    return id
  }

  public async listRecent(filters: RetrievalAuditReplayFilters): Promise<RetrievalAuditEventRow[]> {
    const limit = Math.min(Math.max(filters.limit, 1), 100)
    const values: unknown[] = [filters.tenantId]
    const where = ["tenant_id = $1", "track_code = 'tasco'"]

    if (filters.actorUserId) {
      values.push(filters.actorUserId)
      where.push(`actor_user_id = $${values.length}`)
    }

    if (filters.documentId) {
      values.push(filters.documentId)
      where.push(`metadata->>'documentId' = $${values.length}`)
    }

    if (filters.eventType) {
      values.push(filters.eventType)
      where.push(`event_type = $${values.length}`)
    }

    values.push(limit)

    const result = await query<RetrievalAuditEventRow>(
      `
        SELECT
          id::text,
          tenant_id,
          actor_user_id,
          event_type,
          enforcement_point,
          metadata,
          created_at
        FROM retrieval_audit_events
        WHERE ${where.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${values.length}
      `,
      values
    )
    return result.rows
  }

  public async findByMessageId(messageId: string): Promise<RetrievalAuditEventRow[]> {
    const result = await query<RetrievalAuditEventRow>(
      `
        SELECT id::text, tenant_id, actor_user_id, event_type, enforcement_point, metadata, created_at
        FROM retrieval_audit_events
        WHERE tenant_id = 'tasco-demo' AND track_code = 'tasco' AND metadata->>'messageId' = $1
        ORDER BY created_at
      `,
      [messageId]
    )
    return result.rows
  }
}
