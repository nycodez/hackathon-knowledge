import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import type { PoolClient } from 'pg'
import { createTascoDemoData, deptId, type TascoDocument, type TascoQuestion, type TascoUser } from '../../../packages/shared/src/index.js'
import { getPool } from '../src/db/pool.js'
import { WORKBOOK_DOCUMENTS, type WorkbookDocumentRecord } from '../src/fixtures/workbook_documents.js'
import { chunkDocument, chunkWorkbookDocument, type KnowledgeChunkInput } from '../src/ingest/chunk_documents.js'
import EmbeddingService from '../src/services/embedding_service.js'

const embeddingService = new EmbeddingService()
const tenantId = 'tasco-demo'
const workbookDocumentsById = new Map(WORKBOOK_DOCUMENTS.map((document) => [document.documentId, document]))

export interface SeedOptions {
  resetDemoState?: boolean
}

async function main() {
  await seedDatabase()
  await getPool().end()
}

export async function seedDatabase(options: SeedOptions = {}): Promise<void> {
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    if (options.resetDemoState) {
      await client.query("SELECT set_config('tasco.allow_audit_mutation', 'on', true)")
      await client.query("DELETE FROM retrieval_audit_events WHERE tenant_id = 'tasco-demo'")
      await client.query("DELETE FROM tasco_threads WHERE tenant_id = 'tasco-demo'")
    }
    const counts = await seedTascoDemoData(client)
    await client.query('COMMIT')
    console.log(`Tasco workspace data seeded: ${JSON.stringify(counts)}`)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function seedTascoDemoData(client: PoolClient): Promise<Record<string, number>> {
  const data = createTascoDemoData()

  await client.query(
    `DELETE FROM tasco_permission_cases WHERE NOT (id = ANY($1::varchar[]))`,
    [data.permissionCases.map((testCase) => testCase.id)]
  )
  await client.query(
    `DELETE FROM tasco_demo_personas WHERE tenant_id = $1 AND NOT (id = ANY($2::varchar[]))`,
    [tenantId, data.personas.map((persona) => persona.id)]
  )
  await client.query(
    `DELETE FROM tasco_users WHERE tenant_id = $1 AND NOT (id = ANY($2::varchar[]))`,
    [tenantId, data.users.map((user) => user.id)]
  )
  await client.query(
    `DELETE FROM tasco_questions WHERE NOT (document_id = ANY($1::varchar[]))`,
    [data.documents.map((document) => document.id)]
  )
  await client.query(
    `DELETE FROM knowledge_sources
     WHERE tenant_id = $1 AND source_type = 'workspace_document'
       AND NOT (source_record_id = ANY($2::varchar[]))`,
    [tenantId, data.documents.map((document) => document.id)]
  )

  for (const subsidiary of data.subsidiaries) {
    await client.query(
      `
        INSERT INTO tasco_subsidiaries (id, name, meta_en, meta_vi)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          meta_en = EXCLUDED.meta_en,
          meta_vi = EXCLUDED.meta_vi,
          updated_at = now()
      `,
      [subsidiary.id, subsidiary.name, subsidiary.metaEn, subsidiary.metaVi]
    )
  }

  for (const department of data.departments) {
    await client.query(
      `
        INSERT INTO tasco_departments (tenant_id, id, name_en, name_vi, metadata)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (tenant_id, id) DO UPDATE SET
          name_en = EXCLUDED.name_en,
          name_vi = EXCLUDED.name_vi,
          metadata = EXCLUDED.metadata,
          updated_at = now()
      `,
      [
        tenantId,
        department.id,
        department.en,
        department.vi,
        {
          source: 'Departments sheet canonical catalog',
          knowledgeSpace: department.knowledgeSpace ?? 'Department Knowledge',
        },
      ]
    )

    for (const alias of [department.id, department.en, department.vi]) {
      await client.query(
        `
          INSERT INTO tasco_department_aliases (tenant_id, normalized_alias, department_id, source)
          VALUES ($1, unaccent(lower(trim($2))), $3, 'Departments sheet canonical catalog')
          ON CONFLICT (tenant_id, normalized_alias) DO UPDATE SET
            department_id = EXCLUDED.department_id,
            source = EXCLUDED.source
        `,
        [tenantId, alias, department.id]
      )
    }
  }

  for (const user of data.users) {
    await client.query(
      `
        INSERT INTO tasco_users (id, tenant_id, full_name, department_id, role, subsidiary_id, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          tenant_id = EXCLUDED.tenant_id,
          full_name = EXCLUDED.full_name,
          department_id = EXCLUDED.department_id,
          role = EXCLUDED.role,
          subsidiary_id = EXCLUDED.subsidiary_id,
          metadata = EXCLUDED.metadata,
          updated_at = now()
      `,
      [
        user.id,
        tenantId,
        user.name,
        deptId(user.department),
        user.role,
        user.subsidiaryId,
        {
          source: 'Users sheet canonical identity',
          email: user.email ?? null,
          status: user.status ?? 'Active',
        },
      ]
    )
  }

  for (const persona of data.personas) {
    await client.query(
      `
        INSERT INTO tasco_demo_personas (
          id, tenant_id, full_name, department_id, display_department, role,
          subsidiary_id, business_unit_id, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          department_id = EXCLUDED.department_id,
          display_department = EXCLUDED.display_department,
          role = EXCLUDED.role,
          subsidiary_id = EXCLUDED.subsidiary_id,
          business_unit_id = EXCLUDED.business_unit_id,
          metadata = EXCLUDED.metadata,
          updated_at = now()
      `,
      [
        persona.id,
        tenantId,
        persona.name,
        deptId(persona.department),
        persona.displayDepartment ?? persona.department,
        persona.role,
        persona.subsidiaryId,
        persona.businessUnitId ?? persona.subsidiaryId,
        { source: persona.provenance, identityType: 'demo_persona', status: persona.status ?? 'Active' },
      ]
    )
  }

  await seedQuestions(client, data.questions)
  await seedKnowledgeChunks(client, data.documents, data.questions)

  await seedKnowledgeGraph(client, data.documents, [...data.users, ...data.personas])

  for (const testCase of data.permissionCases) {
    await client.query(
      `
        INSERT INTO tasco_permission_cases (id, user_id, document_id, expected, rule_text, enforcement_point)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          document_id = EXCLUDED.document_id,
          expected = EXCLUDED.expected,
          rule_text = EXCLUDED.rule_text,
          enforcement_point = EXCLUDED.enforcement_point,
          updated_at = now()
      `,
      [testCase.id, testCase.userId, testCase.documentId, testCase.expected, testCase.ruleEn, testCase.point]
    )
  }

  for (const row of data.publicEvaluation) {
    await client.query(
      `
        INSERT INTO tasco_public_eval_rows (
          id, user_id, document_ids, expected, answer_type,
          category, user_role, user_department, source_user_role, source_user_department,
          question_vi, difficulty, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          document_ids = EXCLUDED.document_ids,
          expected = EXCLUDED.expected,
          answer_type = EXCLUDED.answer_type,
          category = EXCLUDED.category,
          user_role = EXCLUDED.user_role,
          user_department = EXCLUDED.user_department,
          source_user_role = EXCLUDED.source_user_role,
          source_user_department = EXCLUDED.source_user_department,
          question_vi = EXCLUDED.question_vi,
          difficulty = EXCLUDED.difficulty,
          updated_at = now()
      `,
      [
        row.questionId,
        row.userId,
        row.documentIds,
        row.expected,
        row.answerType,
        row.category ?? null,
        row.userRole ?? null,
        row.userDepartment ?? null,
        row.questionVi ?? null,
        row.difficulty ?? null,
        tenantId,
      ]
    )
  }

  const counts = {
      documents: data.documents.length,
      chunks: await countRows(client, 'knowledge_chunks'),
      kgNodes: await countRows(client, 'kg_nodes'),
      kgEdges: await countRows(client, 'kg_edges'),
      departments: await countRows(client, 'tasco_departments'),
      users: data.users.length,
      personas: data.personas.length,
      subsidiaries: data.subsidiaries.length,
      permissionCases: data.permissionCases.length,
      publicEvalRows: data.publicEvaluation.length,
  }
  await client.query(
    `
      INSERT INTO tasco_seed_checksums (id, tenant_id, seed_name, checksum, counts, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (tenant_id, seed_name) DO UPDATE SET
        checksum = EXCLUDED.checksum,
        counts = EXCLUDED.counts,
        metadata = EXCLUDED.metadata,
        updated_at = now()
    `,
    [
      deterministicUuid('tasco-seed-checksum:workspace-demo:v1'),
      tenantId,
      'workspace-demo:v1',
      createHash('sha256').update(JSON.stringify({ data, workbookDocuments: WORKBOOK_DOCUMENTS })).digest('hex'),
      counts,
      {
        embeddingModel: embeddingService.model(),
        embeddingsEnabled: embeddingService.isEnabled(),
        source: 'ai_workspace_dataset_vietnamese_participants.xlsm',
        canonicalDocuments: WORKBOOK_DOCUMENTS.length,
      },
    ]
  )
  return counts
}

async function upsertKnowledgeSource(
  client: PoolClient,
  document: TascoDocument,
  workbookDocument?: WorkbookDocumentRecord
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO knowledge_sources (
        id, track_code, tenant_id, subsidiary_id, source_type, source_record_id, title, summary,
        status, permission_class, department_id, metadata, indexed_at
      )
      VALUES ($1, 'tasco', $2, $3, 'workspace_document', $4, $5, $6, 'indexed', $7, $8, $9, now())
      ON CONFLICT (tenant_id, source_type, source_record_id) DO UPDATE SET
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        subsidiary_id = EXCLUDED.subsidiary_id,
        permission_class = EXCLUDED.permission_class,
        department_id = EXCLUDED.department_id,
        metadata = EXCLUDED.metadata,
        indexed_at = now(),
        updated_at = now()
      RETURNING id
    `,
    [
      deterministicUuid(`tasco-source:${document.id}`),
      tenantId,
      document.subsidiaryId,
      document.id,
      document.titleEn,
      `${document.titleEn} / ${document.titleVi}`,
      document.classification,
      deptId(document.department),
      {
        titleVi: document.titleVi,
        source: workbookDocument
          ? 'ai_workspace_dataset_vietnamese_participants.xlsm'
          : document.provenance ?? 'curated-demo',
        owner: workbookDocument?.owner ?? document.department,
        allowedAccess: workbookDocument?.allowedAccess ?? 'All Employees',
        lastUpdated: workbookDocument?.lastUpdated ?? null,
        tags: workbookDocument?.tags ?? ['property-management', 'accounting', document.provenance ?? 'curated-demo'],
        language: workbookDocument?.language ?? 'vi',
        workbookWordCount: workbookDocument?.wordCount ?? null,
        ingestionProvider: workbookDocument ? 'sponsor-workbook' : document.ingestionProvider ?? 'curated',
        sourceUrls: document.sourceUrls ?? [],
        apifyRunVerified: document.ingestionProvider === 'apify-website-content-crawler'
          ? Boolean(process.env.APIFY_RUN_ID)
          : null,
        apifyRunId: document.ingestionProvider === 'apify-website-content-crawler'
          ? process.env.APIFY_RUN_ID ?? null
          : null,
      },
    ]
  )

  return result.rows[0].id
}

async function seedQuestions(client: PoolClient, questions: TascoQuestion[]): Promise<void> {
  for (const question of questions) {
    await client.query(
      `
        INSERT INTO tasco_questions (
          id, document_id, question_en, question_vi, answer_en, answer_vi,
          normalized_question_en, normalized_question_vi
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (document_id) DO UPDATE SET
          question_en = EXCLUDED.question_en,
          question_vi = EXCLUDED.question_vi,
          answer_en = EXCLUDED.answer_en,
          answer_vi = EXCLUDED.answer_vi,
          normalized_question_en = EXCLUDED.normalized_question_en,
          normalized_question_vi = EXCLUDED.normalized_question_vi,
          updated_at = now()
      `,
      [
        deterministicUuid(`tasco-question:${question.documentId}`),
        question.documentId,
        question.questionEn,
        question.questionVi,
        question.answerEn,
        question.answerVi,
        normalizeQuestion(question.questionEn),
        normalizeQuestion(question.questionVi),
      ]
    )
  }
}

async function seedKnowledgeChunks(client: PoolClient, documents: TascoDocument[], questions: TascoQuestion[]): Promise<void> {
  const records: Array<{ sourceId: string; document: TascoDocument; chunk: KnowledgeChunkInput }> = []
  for (const document of documents) {
    const workbookDocument = workbookDocumentsById.get(document.id)
    const sourceId = await upsertKnowledgeSource(client, document, workbookDocument)
    await client.query('DELETE FROM knowledge_chunks WHERE source_id = $1', [sourceId])
    const question = questions.find((candidate) => candidate.documentId === document.id)
    const chunks = workbookDocument
      ? chunkWorkbookDocument(document, workbookDocument)
      : chunkDocument(document, question)
    for (const chunk of chunks) records.push({ sourceId, document, chunk })
  }

  let embeddings: Array<number[] | null>
  try {
    embeddings = await embeddingService.embedDocumentTexts(records.map((record) => record.chunk.content))
  } catch {
    embeddings = records.map(() => null)
  }

  for (const [index, record] of records.entries()) {
    await upsertKnowledgeChunk(client, record.sourceId, record.document, record.chunk, embeddings[index] ?? null)
  }
}

async function upsertKnowledgeChunk(
  client: PoolClient,
  sourceId: string,
  document: TascoDocument,
  chunk: KnowledgeChunkInput,
  embedding: number[] | null
): Promise<void> {
  const contentHash = createHash('sha256').update(chunk.content).digest('hex')

  await client.query(
    `
      INSERT INTO knowledge_chunks (
        id, source_id, tenant_id, subsidiary_id, chunk_index, heading_path, content, content_hash,
        token_count, search_vector, embedding_provider, embedding_model, embedding_dimensions, embedding, metadata
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, to_tsvector('simple', unaccent($7)),
        'bedrock', $10, 1024, $11::vector, $12
      )
      ON CONFLICT (source_id, content_hash) DO UPDATE SET
        content = EXCLUDED.content,
        search_vector = EXCLUDED.search_vector,
        embedding_provider = EXCLUDED.embedding_provider,
        embedding_model = EXCLUDED.embedding_model,
        embedding_dimensions = EXCLUDED.embedding_dimensions,
        embedding = COALESCE(EXCLUDED.embedding, knowledge_chunks.embedding),
        metadata = EXCLUDED.metadata,
        updated_at = now()
    `,
    [
      deterministicUuid(`tasco-chunk:${document.id}:${chunk.language}:${chunk.chunkIndex}`),
      sourceId,
      tenantId,
      document.subsidiaryId,
      chunk.chunkIndex,
      chunk.headingPath,
      chunk.content,
      contentHash,
      chunk.tokenCount,
      embeddingService.model(),
      embedding ? embeddingService.toVectorLiteral(embedding) : null,
      chunk.metadata,
    ]
  )
}

async function seedKnowledgeGraph(client: PoolClient, documents: TascoDocument[], users: TascoUser[]): Promise<void> {
  const departmentNodeIds = new Map<string, string>()
  const classificationNodeIds = new Map<string, string>()
  const subsidiaryNodeIds = new Map<string, string>()

  for (const document of documents) {
    const departmentId = deptId(document.department)
    const departmentKey = `${document.subsidiaryId}:${departmentId}`
    const classificationKey = `${document.subsidiaryId}:${document.classification}`

    if (!subsidiaryNodeIds.has(document.subsidiaryId)) {
      subsidiaryNodeIds.set(
        document.subsidiaryId,
        await upsertKgNode(client, {
          id: deterministicUuid(`tasco-kg-node:${document.subsidiaryId}:subsidiary`),
          subsidiaryId: document.subsidiaryId,
          nodeType: 'subsidiary',
          externalId: `subsidiary:${document.subsidiaryId}`,
          label: document.subsidiaryId,
          permissionClass: 'Internal',
          departmentId: 'COMP',
          metadata: { source: 'seed', entity: 'subsidiary' },
        })
      )
    }

    if (!departmentNodeIds.has(departmentKey)) {
      departmentNodeIds.set(
        departmentKey,
        await upsertKgNode(client, {
          id: deterministicUuid(`tasco-kg-node:${departmentKey}:department`),
          subsidiaryId: document.subsidiaryId,
          nodeType: 'department',
          externalId: `department:${document.subsidiaryId}:${departmentId}`,
          label: departmentId,
          permissionClass: 'Internal',
          departmentId,
          metadata: { source: 'seed', entity: 'department' },
        })
      )
    }

    if (!classificationNodeIds.has(classificationKey)) {
      classificationNodeIds.set(
        classificationKey,
        await upsertKgNode(client, {
          id: deterministicUuid(`tasco-kg-node:${classificationKey}:classification`),
          subsidiaryId: document.subsidiaryId,
          nodeType: 'classification',
          externalId: `classification:${document.subsidiaryId}:${document.classification}`,
          label: document.classification,
          permissionClass: document.classification,
          departmentId: 'COMP',
          metadata: { source: 'seed', entity: 'classification' },
        })
      )
    }

    const documentNodeId = await upsertKgNode(client, {
      id: deterministicUuid(`tasco-kg-node:${document.id}:document`),
      subsidiaryId: document.subsidiaryId,
      nodeType: 'document',
      externalId: document.id,
      label: document.titleEn,
      permissionClass: document.classification,
      departmentId,
      metadata: {
        titleVi: document.titleVi,
        sourceRecordId: document.id,
        permissionTriple: [document.classification, departmentId, document.subsidiaryId],
      },
    })

    await upsertKgEdge(client, {
      fromNodeId: documentNodeId,
      toNodeId: departmentNodeIds.get(departmentKey)!,
      edgeType: 'OWNED_BY',
      metadata: { documentId: document.id },
    })

    await upsertKgEdge(client, {
      fromNodeId: documentNodeId,
      toNodeId: classificationNodeIds.get(classificationKey)!,
      edgeType: 'CLASSIFIED_AS',
      metadata: { documentId: document.id },
    })

    await upsertKgEdge(client, {
      fromNodeId: documentNodeId,
      toNodeId: subsidiaryNodeIds.get(document.subsidiaryId)!,
      edgeType: 'SCOPED_TO',
      metadata: { documentId: document.id },
    })
  }

  for (const user of users) {
    const departmentId = deptId(user.department)
    const departmentKey = `${user.subsidiaryId}:${departmentId}`
    const departmentNodeId = departmentNodeIds.get(departmentKey)
    if (!departmentNodeId) continue
    const userNodeId = await upsertKgNode(client, {
      id: deterministicUuid(`tasco-kg-node:${user.id}:user`),
      subsidiaryId: user.subsidiaryId,
      nodeType: 'user',
      externalId: `user:${user.id}`,
      label: user.name,
      permissionClass: 'Internal',
      departmentId,
      metadata: { source: 'seed', entity: 'user', role: user.role },
    })
    await upsertKgEdge(client, {
      fromNodeId: userNodeId,
      toNodeId: departmentNodeId,
      edgeType: 'MEMBER_OF',
      metadata: { userId: user.id, role: user.role },
    })
  }
}

interface KgNodeInput {
  id: string
  subsidiaryId: string
  nodeType: string
  externalId: string
  label: string
  permissionClass: string
  departmentId: string
  metadata: Record<string, unknown>
}

async function upsertKgNode(client: PoolClient, input: KgNodeInput): Promise<string> {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO kg_nodes (
        id, tenant_id, subsidiary_id, node_type, external_id, label, permission_class, department_id, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        subsidiary_id = EXCLUDED.subsidiary_id,
        node_type = EXCLUDED.node_type,
        external_id = EXCLUDED.external_id,
        label = EXCLUDED.label,
        permission_class = EXCLUDED.permission_class,
        department_id = EXCLUDED.department_id,
        metadata = EXCLUDED.metadata,
        deleted_at = NULL,
        updated_at = now()
      RETURNING id
    `,
    [
      input.id,
      tenantId,
      input.subsidiaryId,
      input.nodeType,
      input.externalId,
      input.label,
      input.permissionClass,
      input.departmentId,
      input.metadata,
    ]
  )

  return result.rows[0].id
}

interface KgEdgeInput {
  fromNodeId: string
  toNodeId: string
  edgeType: string
  metadata: Record<string, unknown>
}

async function upsertKgEdge(client: PoolClient, input: KgEdgeInput): Promise<void> {
  await client.query(
    `
      INSERT INTO kg_edges (id, tenant_id, from_node_id, to_node_id, edge_type, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        from_node_id = EXCLUDED.from_node_id,
        to_node_id = EXCLUDED.to_node_id,
        edge_type = EXCLUDED.edge_type,
        metadata = EXCLUDED.metadata,
        updated_at = now()
    `,
    [
      deterministicUuid(`tasco-kg-edge:${input.fromNodeId}:${input.edgeType}:${input.toNodeId}`),
      tenantId,
      input.fromNodeId,
      input.toNodeId,
      input.edgeType,
      input.metadata,
    ]
  )
}

async function countRows(client: PoolClient, tableName: 'knowledge_chunks' | 'kg_nodes' | 'kg_edges' | 'tasco_departments'): Promise<number> {
  const result = await client.query<{ count: string }>(`SELECT count(*) FROM ${tableName} WHERE tenant_id = $1`, [tenantId])
  return Number(result.rows[0]?.count ?? 0)
}

function normalizeQuestion(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('vi-VN')
}

function deterministicUuid(seed: string): string {
  const hash = createHash('sha256').update(seed).digest('hex')
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `5${hash.slice(13, 16)}`,
    ((Number.parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hash.slice(18, 20),
    hash.slice(20, 32),
  ].join('-')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
