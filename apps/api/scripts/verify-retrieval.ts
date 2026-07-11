import { getPool, query } from '../src/db/pool.js'

const fts = await query<{ matches: boolean }>(`
  SELECT to_tsvector('simple', unaccent('hóa đơn')) @@ plainto_tsquery('simple', unaccent('hoa don')) AS matches
`)
const denied = await query<{ count: string }>(`
  SELECT count(*)::text
  FROM knowledge_sources s
  JOIN knowledge_chunks c ON c.source_id = s.id
  WHERE s.source_record_id = 'DOC036'
    AND s.subsidiary_id = 'DNP-WATER'
    AND (
      s.permission_class IN ('Public', 'Internal')
      OR (s.permission_class = 'Confidential' AND ('Employee' = 'Executive' OR s.department_id = 'HR'))
      OR (s.permission_class = 'Restricted' AND 'Employee' = 'Executive')
    )
`)
const embeddingCoverage = await query<{ total: string; missing: string }>(`
  SELECT count(*)::text AS total, count(*) FILTER (WHERE embedding IS NULL)::text AS missing
  FROM knowledge_chunks WHERE tenant_id = 'tasco-demo' AND deleted_at IS NULL
`)
const plan = await query<{ 'QUERY PLAN': string }>(`
  EXPLAIN (FORMAT TEXT)
  SELECT c.id
  FROM knowledge_sources s
  JOIN knowledge_chunks c ON c.source_id = s.id
  WHERE s.tenant_id = 'tasco-demo'
    AND s.subsidiary_id = 'DNP-WATER'
    AND s.permission_class IN ('Public', 'Internal')
    AND c.search_vector @@ websearch_to_tsquery('simple', unaccent('hoa don'))
  ORDER BY ts_rank_cd(c.search_vector, websearch_to_tsquery('simple', unaccent('hoa don'))) DESC
  LIMIT 20
`)

const failures = [
  !fts.rows[0]?.matches ? 'Vietnamese unaccent FTS parity failed' : '',
  Number(denied.rows[0]?.count) !== 0 ? 'DOC036 reached the Employee candidate set' : '',
].filter(Boolean)

console.log(JSON.stringify({
  status: failures.length ? 'failed' : 'passed',
  vietnameseFtsParity: fts.rows[0]?.matches ?? false,
  employeeRestrictedCandidates: Number(denied.rows[0]?.count ?? 0),
  embeddings: { total: Number(embeddingCoverage.rows[0]?.total ?? 0), missing: Number(embeddingCoverage.rows[0]?.missing ?? 0) },
  plan: plan.rows.map((row) => row['QUERY PLAN']),
  failures,
}, null, 2))

await getPool().end()
if (failures.length) process.exit(1)
