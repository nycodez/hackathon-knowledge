import { getPool, query } from '../src/db/pool.js'

interface SummaryRow {
  chunks: string
  incomplete_triples: string
  missing_headings: string
  out_of_bounds: string
  documents: string
  bilingual_documents: string
}

const result = await query<SummaryRow>(`
  SELECT
    count(*)::text AS chunks,
    count(*) FILTER (WHERE jsonb_array_length(metadata->'permissionTriple') <> 3)::text AS incomplete_triples,
    count(*) FILTER (WHERE heading_path IS NULL OR heading_path = '')::text AS missing_headings,
    count(*) FILTER (WHERE token_count < 300 OR token_count > 500)::text AS out_of_bounds,
    count(DISTINCT source_id)::text AS documents,
    count(DISTINCT source_id) FILTER (
      WHERE EXISTS (SELECT 1 FROM knowledge_chunks vi WHERE vi.source_id = knowledge_chunks.source_id AND vi.metadata->>'language' = 'vi')
        AND EXISTS (SELECT 1 FROM knowledge_chunks en WHERE en.source_id = knowledge_chunks.source_id AND en.metadata->>'language' = 'en')
    )::text AS bilingual_documents
  FROM knowledge_chunks
  WHERE tenant_id = 'tasco-demo' AND deleted_at IS NULL
`)

const row = result.rows[0]
const doc001 = await query<{ heading: string; language: string }>(`
  SELECT c.heading_path AS heading, c.metadata->>'language' AS language
  FROM knowledge_chunks c
  JOIN knowledge_sources s ON s.id = c.source_id
  WHERE s.source_record_id = 'DOC001'
  ORDER BY c.chunk_index
`)

const expectedHeadings = ['Mục đích', 'Phạm vi', 'Nội dung chính', 'Trách nhiệm', 'Kiểm soát truy cập']
const missingDoc001Headings = expectedHeadings.filter((heading) => !doc001.rows.some((chunk) => chunk.heading.endsWith(heading)))
const failures = [
  Number(row?.chunks) !== 410 ? `expected 410 chunks, got ${row?.chunks}` : '',
  Number(row?.documents) !== 41 ? `expected 41 sources, got ${row?.documents}` : '',
  Number(row?.bilingual_documents) !== 41 ? `expected 41 bilingual sources, got ${row?.bilingual_documents}` : '',
  Number(row?.incomplete_triples) !== 0 ? `${row?.incomplete_triples} chunks have incomplete permission triples` : '',
  Number(row?.missing_headings) !== 0 ? `${row?.missing_headings} chunks have missing headings` : '',
  Number(row?.out_of_bounds) !== 0 ? `${row?.out_of_bounds} chunks are outside 300-500 tokens` : '',
  missingDoc001Headings.length ? `DOC001 missing headings: ${missingDoc001Headings.join(', ')}` : '',
].filter(Boolean)

console.log(JSON.stringify({ status: failures.length ? 'failed' : 'passed', ...row, doc001Chunks: doc001.rows.length, failures }, null, 2))
await getPool().end()
if (failures.length) process.exit(1)
