import {
  deptId,
  type TascoClassification,
  type TascoDocumentChunk,
  type TascoDocument,
} from '../../../../packages/shared/src/index.js'
import { query } from '../db/pool.js'
import type { AuthorizedDocumentRow, AuthorizedDocumentSearch, Principal } from './secure_types.js'

interface DocumentRow {
  id: string
  title_en: string
  title_vi: string | null
  department_id: string
  permission_class: TascoClassification
  subsidiary_id: string
}

interface AuthorizedRow extends DocumentRow {
  chunk_id: string
  content: string
}

interface CountRow {
  total_candidates: string | number
}

function toDocument(row: DocumentRow): TascoDocument {
  return {
    id: row.id,
    titleEn: row.title_en,
    titleVi: row.title_vi ?? row.title_en,
    department: row.department_id,
    classification: row.permission_class,
    subsidiaryId: row.subsidiary_id,
  }
}

export default class DocumentsRepository {
  public async list(
    filters: { subsidiaryId?: string; classification?: TascoClassification; departmentId?: string } = {},
    principal?: Principal
  ): Promise<TascoDocument[]> {
    const result = await query<DocumentRow>(
      `
        SELECT
          source_record_id AS id,
          title AS title_en,
          metadata->>'titleVi' AS title_vi,
          department_id,
          permission_class,
          subsidiary_id
        FROM knowledge_sources
        WHERE tenant_id = 'tasco-demo'
          AND source_type = 'workspace_document'
          AND deleted_at IS NULL
          AND status = 'indexed'
          AND ($1::text IS NULL OR subsidiary_id = $1)
          AND ($2::text IS NULL OR permission_class = $2)
          AND ($3::text IS NULL OR department_id = $3)
          AND ($4::text IS NULL OR subsidiary_id = $4)
          AND (
            $5::text IS NULL
            OR permission_class IN ('Public', 'Internal')
            OR (permission_class = 'Confidential' AND ($5 = 'Executive' OR department_id = $6))
            OR (permission_class = 'Restricted' AND $5 = 'Executive')
          )
        ORDER BY source_record_id
      `,
      [
        filters.subsidiaryId ?? null,
        filters.classification ?? null,
        filters.departmentId ?? null,
        principal?.subsidiaryId ?? null,
        principal?.role ?? null,
        principal?.departmentId ?? null,
      ]
    )
    return result.rows.map(toDocument)
  }

  public async searchAuthorized(
    principal: Principal,
    searchText: string,
    queryEmbedding: string | null = null,
    scope: { classification?: TascoClassification; departmentId?: string; language?: 'en' | 'vi' } = {}
  ): Promise<AuthorizedDocumentSearch> {
    const normalized = searchText.trim()
    const countResult = await query<CountRow>(
      `
        WITH params AS (
          SELECT
            NULLIF(trim($3), '') AS q,
            CASE
              WHEN NULLIF(trim($3), '') IS NULL THEN NULL
              ELSE websearch_to_tsquery('simple', unaccent($3))
            END AS tsq
        )
        SELECT count(DISTINCT s.id) AS total_candidates
        FROM knowledge_sources s
        JOIN knowledge_chunks c ON c.source_id = s.id
        CROSS JOIN params
        WHERE s.tenant_id = $1
          AND c.tenant_id = $1
          AND s.source_type = 'workspace_document'
          AND s.status = 'indexed'
          AND s.deleted_at IS NULL
          AND c.deleted_at IS NULL
          AND s.subsidiary_id = $2
          AND ($4::text IS NULL OR s.permission_class = $4)
          AND ($5::text IS NULL OR s.department_id = $5)
          AND (
            $6::text IS NULL
            OR c.metadata->>'language' = $6
            OR c.metadata->>'source' = 'ai_workspace_dataset_vietnamese_participants.xlsm'
          )
          AND (
            s.permission_class IN ('Public', 'Internal')
            OR (s.permission_class = 'Confidential' AND ($7 = 'Executive' OR s.department_id = $8))
            OR (s.permission_class = 'Restricted' AND $7 = 'Executive')
          )
          AND (
            params.q IS NULL
            OR coalesce(c.search_vector, to_tsvector('simple', unaccent(c.content))) @@ params.tsq
            OR s.source_record_id ILIKE '%' || params.q || '%'
            OR s.title ILIKE '%' || params.q || '%'
            OR s.metadata->>'titleVi' ILIKE '%' || params.q || '%'
            OR s.permission_class ILIKE '%' || params.q || '%'
            OR s.department_id ILIKE '%' || params.q || '%'
            OR c.content ILIKE '%' || params.q || '%'
          )
      `,
      [
        principal.tenantId,
        principal.subsidiaryId,
        normalized,
        scope.classification ?? null,
        scope.departmentId ?? null,
        scope.language ?? null,
        principal.role,
        deptId(principal.departmentId),
      ]
    )
    const result = await query<AuthorizedRow>(
      `
        WITH params AS (
          SELECT
            NULLIF(trim($3), '') AS q,
            CASE
              WHEN NULLIF(trim($3), '') IS NULL THEN NULL
              ELSE websearch_to_tsquery('simple', unaccent($3))
            END AS tsq
        ),
        authorized AS (
          SELECT
            s.source_record_id AS id,
            s.title AS title_en,
            s.metadata->>'titleVi' AS title_vi,
            s.department_id,
            s.permission_class,
            s.subsidiary_id,
            c.id::text AS chunk_id,
            c.content,
            params.q,
            params.tsq,
            c.search_vector,
            c.embedding
          FROM knowledge_sources s
          JOIN knowledge_chunks c ON c.source_id = s.id
          CROSS JOIN params
          WHERE s.tenant_id = $1
            AND c.tenant_id = $1
            AND s.source_type = 'workspace_document'
            AND s.status = 'indexed'
            AND s.deleted_at IS NULL
            AND c.deleted_at IS NULL
            AND s.subsidiary_id = $2
            AND ($6::text IS NULL OR s.permission_class = $6)
            AND ($7::text IS NULL OR s.department_id = $7)
            AND (
              $8::text IS NULL
              OR c.metadata->>'language' = $8
              OR c.metadata->>'source' = 'ai_workspace_dataset_vietnamese_participants.xlsm'
            )
            AND (
              s.permission_class IN ('Public', 'Internal')
              OR (s.permission_class = 'Confidential' AND ($4 = 'Executive' OR s.department_id = $5))
              OR (s.permission_class = 'Restricted' AND $4 = 'Executive')
            )
        ),
        lexical AS (
          SELECT
            *, row_number() OVER (
              ORDER BY
                CASE WHEN id ILIKE q || '%' THEN 0 WHEN title_en ILIKE '%' || q || '%' THEN 1 ELSE 2 END,
                ts_rank_cd(coalesce(search_vector, to_tsvector('simple', unaccent(content))), tsq) DESC,
                id, chunk_id
            ) AS position
          FROM authorized
          WHERE q IS NULL
             OR coalesce(search_vector, to_tsvector('simple', unaccent(content))) @@ tsq
             OR id ILIKE '%' || q || '%'
             OR title_en ILIKE '%' || q || '%'
             OR title_vi ILIKE '%' || q || '%'
             OR department_id ILIKE '%' || q || '%'
             OR content ILIKE '%' || q || '%'
          LIMIT 40
        ),
        semantic AS (
          SELECT *, row_number() OVER (ORDER BY embedding <=> $9::vector, id, chunk_id) AS position
          FROM authorized
          WHERE $9::vector IS NOT NULL AND embedding IS NOT NULL
          ORDER BY embedding <=> $9::vector, id, chunk_id
          LIMIT 40
        ),
        fused AS (
          SELECT id, chunk_id, sum(score) AS score
          FROM (
            SELECT id, chunk_id, 1.0 / (60 + position) AS score FROM lexical
            UNION ALL
            SELECT id, chunk_id, 1.0 / (60 + position) AS score FROM semantic
          ) rankings
          GROUP BY id, chunk_id
        ),
        best_document_chunk AS (
          SELECT DISTINCT ON (a.id)
            a.id, a.title_en, a.title_vi, a.department_id, a.permission_class,
            a.subsidiary_id, a.chunk_id, a.content, f.score
          FROM fused f
          JOIN authorized a ON a.id = f.id AND a.chunk_id = f.chunk_id
          ORDER BY a.id, f.score DESC, a.chunk_id
        )
        SELECT
          id, title_en, title_vi, department_id, permission_class,
          subsidiary_id, chunk_id, content
        FROM best_document_chunk
        ORDER BY score DESC, id, chunk_id
        LIMIT 20
      `,
      [
        principal.tenantId,
        principal.subsidiaryId,
        normalized,
        principal.role,
        deptId(principal.departmentId),
        scope.classification ?? null,
        scope.departmentId ?? null,
        scope.language ?? null,
        queryEmbedding,
      ]
    )

    return {
      totalCandidates: Number(countResult.rows[0]?.total_candidates ?? 0),
      rows: result.rows.map((row) => ({
        document: toDocument(row),
        chunkId: row.chunk_id,
        content: row.content,
      })),
    }
  }

  public async findAuthorizedByDocumentId(principal: Principal, documentId: string, language: 'en' | 'vi' = 'en'): Promise<AuthorizedDocumentRow | null> {
    const result = await query<AuthorizedRow>(
      `
        SELECT
          s.source_record_id AS id,
          s.title AS title_en,
          s.metadata->>'titleVi' AS title_vi,
          s.department_id,
          s.permission_class,
          s.subsidiary_id,
          c.id::text AS chunk_id,
          c.content
        FROM knowledge_sources s
        JOIN knowledge_chunks c ON c.source_id = s.id
        WHERE s.tenant_id = $1
          AND c.tenant_id = $1
          AND s.source_type = 'workspace_document'
          AND s.status = 'indexed'
          AND s.deleted_at IS NULL
          AND c.deleted_at IS NULL
          AND s.subsidiary_id = $2
          AND s.source_record_id = $3
          AND (
            c.metadata->>'language' = $6
            OR c.metadata->>'source' = 'ai_workspace_dataset_vietnamese_participants.xlsm'
          )
          AND (
            s.permission_class IN ('Public', 'Internal')
            OR (s.permission_class = 'Confidential' AND ($4 = 'Executive' OR s.department_id = $5))
            OR (s.permission_class = 'Restricted' AND $4 = 'Executive')
          )
        ORDER BY CASE WHEN c.metadata->>'language' = $6 THEN 0 ELSE 1 END, c.chunk_index ASC
        LIMIT 1
      `,
      [principal.tenantId, principal.subsidiaryId, documentId, principal.role, deptId(principal.departmentId), language]
    )

    const row = result.rows[0]
    if (!row) return null
    return {
      document: toDocument(row),
      chunkId: row.chunk_id,
      content: row.content,
    }
  }

  public async findMetadataByDocumentId(tenantId: string, documentId: string): Promise<TascoDocument | null> {
    const result = await query<DocumentRow>(
      `
        SELECT source_record_id AS id, title AS title_en, metadata->>'titleVi' AS title_vi,
               department_id, permission_class, subsidiary_id
        FROM knowledge_sources
        WHERE tenant_id = $1 AND source_type = 'workspace_document'
          AND status = 'indexed' AND deleted_at IS NULL AND source_record_id = $2
        LIMIT 1
      `,
      [tenantId, documentId]
    )
    return result.rows[0] ? toDocument(result.rows[0]) : null
  }

  public async listChunkMetadata(tenantId: string, documentId: string): Promise<TascoDocumentChunk[]> {
    const result = await query<{
      id: string
      heading_path: string | null
      language: string | null
      token_count: number | null
      permission_class: TascoClassification
    }>(
      `
        SELECT c.id::text, c.heading_path, c.metadata->>'language' AS language,
               c.token_count, s.permission_class
        FROM knowledge_sources s
        JOIN knowledge_chunks c ON c.source_id = s.id AND c.deleted_at IS NULL
        WHERE s.tenant_id = $1 AND s.source_record_id = $2 AND s.deleted_at IS NULL
        ORDER BY c.chunk_index
      `,
      [tenantId, documentId]
    )
    return result.rows.map((row) => ({
      id: row.id,
      headingPath: row.heading_path ?? 'Source section',
      language: row.language === 'vi' ? 'vi' : 'en',
      tokenCount: row.token_count ?? 0,
      classification: row.permission_class,
    }))
  }

  public async findByDocumentId(tenantId: string, documentId: string): Promise<AuthorizedDocumentRow | null> {
    const result = await query<AuthorizedRow>(
      `
        SELECT
          s.source_record_id AS id,
          s.title AS title_en,
          s.metadata->>'titleVi' AS title_vi,
          s.department_id,
          s.permission_class,
          s.subsidiary_id,
          c.id::text AS chunk_id,
          c.content
        FROM knowledge_sources s
        LEFT JOIN knowledge_chunks c
          ON c.source_id = s.id
          AND c.tenant_id = s.tenant_id
          AND c.deleted_at IS NULL
        WHERE s.tenant_id = $1
          AND s.source_type = 'workspace_document'
          AND s.status = 'indexed'
          AND s.deleted_at IS NULL
          AND s.source_record_id = $2
        ORDER BY c.chunk_index ASC NULLS LAST
        LIMIT 1
      `,
      [tenantId, documentId]
    )

    const row = result.rows[0]
    if (!row) return null
    return {
      document: toDocument(row),
      chunkId: row.chunk_id ?? `${row.id}-chunk-001`,
      content: row.content ?? '',
    }
  }
}
