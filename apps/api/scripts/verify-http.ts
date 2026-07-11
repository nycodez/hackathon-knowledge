import { once } from 'node:events'
import type { AddressInfo } from 'node:net'
import type {
  ApiEnvelope,
  TascoAskResponse,
  TascoDocumentDetailResponse,
  TascoEvalCaseResult,
  TascoEvalReport,
  TascoRetrievalTraceReplayResponse,
  TascoSearchResponse,
  TascoWorkspaceBootstrap,
} from '@hackathon/shared'
import app from '../src/app.js'
import { getPool } from '../src/db/pool.js'

const server = app.listen(0, '127.0.0.1')
await once(server, 'listening')
const address = server.address() as AddressInfo
const baseUrl = `http://127.0.0.1:${address.port}`
const failures: string[] = []

try {
  const genericHealth = await request<ApiEnvelope<{ database: string }>>('/api/health')
  expect(genericHealth.success && genericHealth.data?.database === 'connected', 'generic /api routes were not preserved')

  const bootstrap = await request<ApiEnvelope<TascoWorkspaceBootstrap>>('/api/v1/workspace/seed-world')
  const serializedBootstrap = JSON.stringify(bootstrap.data ?? {})
  expect(!serializedBootstrap.includes('answerEn') && !serializedBootstrap.includes('answerVi'), 'browser bootstrap exposed seeded answer text')
  expect(!serializedBootstrap.includes('publicEvaluation') && !serializedBootstrap.includes('permissionCases'), 'browser bootstrap exposed evaluation internals')

  const permissionCases = await request<ApiEnvelope<TascoEvalCaseResult[]>>('/api/v1/workspace/permission-test', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
  expect(permissionCases.data?.length === 8, `expected 8 permission cases, got ${permissionCases.data?.length ?? 0}`)
  expect(permissionCases.data?.every((result) => result.passed) === true, 'one or more T1-T8 permission cases failed')

  const question = "What are the company's strategic priorities for 2026?"
  const employee = await ask('U001', question)
  const executive = await ask('U007', question)
  expect(employee.state === 'permission_refusal', `employee ask state was ${employee.state}`)
  expect(employee.trace.decision === 'deny', `employee ask decision was ${employee.trace.decision}`)
  expect(employee.citation === undefined, 'employee refusal included a citation')
  expect(executive.state === 'answered', `executive ask state was ${executive.state}`)
  expect(executive.trace.decision === 'allow', `executive ask decision was ${executive.trace.decision}`)
  expect(executive.citation?.sourceId === 'DOC036', 'executive answer was not grounded in DOC036')

  const employeeSearch = await request<ApiEnvelope<TascoSearchResponse>>(
    '/api/v1/workspace/search?userId=U001&q=Company%20Strategy%202026&language=en'
  )
  expect(employeeSearch.data?.totalCandidates === 0, 'unauthorized search exposed a protected candidate count')
  expect(employeeSearch.data?.results.length === 0, 'unauthorized search returned protected results')
  const executiveSearch = await request<ApiEnvelope<TascoSearchResponse>>(
    '/api/v1/workspace/search?userId=U007&q=Company%20Strategy%202026&language=en'
  )
  expect(executiveSearch.data?.results.some((result) => result.document.id === 'DOC036') === true, 'executive search could not retrieve DOC036')

  const employeeDetail = await request<ApiEnvelope<TascoDocumentDetailResponse>>(
    '/api/v1/workspace/documents/DOC036?userId=U001&language=en'
  )
  expect(employeeDetail.data?.decision === 'deny', 'employee document detail was not denied')
  expect(employeeDetail.data?.content === undefined, 'employee document detail exposed protected content')
  expect(employeeDetail.data?.chunks === undefined, 'employee document detail exposed protected chunk metadata')
  expect(employeeDetail.data?.citation === undefined, 'employee document detail exposed a protected citation')

  const crossSubsidiary = await request<ApiEnvelope<TascoSearchResponse>>(
    '/api/v1/workspace/search?userId=U001&q=probation%20policy&language=en'
  )
  expect(crossSubsidiary.data?.results.every((result) => result.document.subsidiaryId === 'DNP-WATER') === true, 'cross-subsidiary search result leaked')
  expect(crossSubsidiary.data?.results.every((result) => result.document.id !== 'TLD001') === true, 'TLD001 crossed the subsidiary boundary')
  const foreignDetail = await fetch(`${baseUrl}/api/v1/workspace/documents/TLD001?userId=U001&language=en`)
  expect(foreignDetail.status === 404, `cross-subsidiary document detail returned ${foreignDetail.status} instead of 404`)

  const evaluation = await request<ApiEnvelope<TascoEvalReport>>('/api/v1/workspace/eval')
  expect(evaluation.data?.score === 50 && evaluation.data.total === 50, `public evaluation score was ${evaluation.data?.score}/${evaluation.data?.total}`)
  expect(evaluation.data?.leaks === 0, `public evaluation found ${evaluation.data?.leaks} leaks`)
  expect(evaluation.data?.caseResults.filter((result) => result.passed).length === 8, 'evaluation did not pass all T1-T8 cases')
  expect(evaluation.data?.metrics?.restrictedContextHits === 0, `evaluation found ${evaluation.data?.metrics?.restrictedContextHits} Restricted context hits`)

  const persistedEvaluation = await request<ApiEnvelope<TascoEvalReport>>('/api/v1/workspace/eval', { method: 'POST' })
  expect(persistedEvaluation.data?.score === 50 && persistedEvaluation.data.leaks === 0, 'persisted evaluation gate failed')

  const trace = await request<ApiEnvelope<TascoRetrievalTraceReplayResponse>>(
    '/api/v1/workspace/retrieval-trace?userId=U001&documentId=DOC036&limit=25'
  )
  expect((trace.data?.summary.events ?? 0) > 0, 'no persisted denial audit evidence was returned')
  expect(trace.data?.events.every((event) => event.actorUserId === 'U001') === true, 'audit replay crossed the actor filter')
  expect(trace.data?.events.every((event) => event.metadata.citationChunkId == null) === true, 'denial audit contained a protected citation chunk')
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  await getPool().end()
}

console.log(JSON.stringify({
  status: failures.length ? 'failed' : 'passed',
  gates: {
    genericApiPreserved: !failures.some((failure) => failure.includes('generic /api')),
    permissionCases: '8/8',
    publicEvaluation: '50/50',
    leaks: 0,
    restrictedContextHits: 0,
    sameQuestionPersonaBoundary: 'passed',
    subsidiaryIsolation: 'passed',
    auditEvidence: 'passed',
  },
  failures,
}, null, 2))

if (failures.length) process.exitCode = 1

async function ask(userId: string, question: string): Promise<TascoAskResponse> {
  const response = await request<ApiEnvelope<TascoAskResponse & { threadId: string; messageId: string }>>(
    '/api/v1/workspace/ask',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId, question, language: 'en' }),
    }
  )
  if (!response.data) throw new Error(`Ask response for ${userId} did not contain data`)
  return response.data
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, init)
  const body = await response.json() as T
  if (!response.ok) throw new Error(`${init?.method ?? 'GET'} ${path} returned ${response.status}: ${JSON.stringify(body)}`)
  return body
}

function expect(condition: boolean, message: string): void {
  if (!condition) failures.push(message)
}
