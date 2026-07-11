import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { buildCitation, deptId, type TascoAuditEventType, type TascoExampleQa } from '../../../../packages/shared/src/index.js'
import { getOptionalEnv } from '../config/env.js'
import { resetSeed } from '../db/ensure_seed.js'
import { query } from '../db/pool.js'
import { resolveIdentity } from '../middleware/identity.js'
import { validate } from '../middleware/validate.js'
import EvalRunsRepository from '../repositories/eval_runs_repository.js'
import MetaRepository from '../repositories/meta_repository.js'
import ThreadRepository from '../repositories/thread_repository.js'
import WorkspaceRepository from '../repositories/workspace_repository.js'
import KnowledgeRetrievalService from '../services/knowledge_retrieval_service.js'
import EvaluationService from '../services/evaluation_service.js'
import PermissionPolicyService from '../services/permission_policy_service.js'

const router = Router()
const retrieval = new KnowledgeRetrievalService()
const permissionPolicy = new PermissionPolicyService()
const meta = new MetaRepository()
const workspace = new WorkspaceRepository()
const threads = new ThreadRepository()
const evalRuns = new EvalRunsRepository()
const evaluation = new EvaluationService()

const emptyObject = z.object({}).passthrough()
const identityQuery = z.object({ userId: z.string().min(1).default('U001') }).passthrough()
const language = z.enum(['en', 'vi']).default('en')

router.get('/meta', asyncRoute(async (_req, res) => {
  res.json({ success: true, data: await meta.meta() })
}))

router.get('/warm', asyncRoute(async (_req, res) => {
  const started = Date.now()
  await query('SELECT 1')
  res.json({ success: true, data: { warmed: true, db: true, latencyMs: Date.now() - started } })
}))

router.get('/workspace/summary', asyncRoute(async (_req, res) => {
  const [runtime, data] = await Promise.all([meta.meta(), workspace.load()])
  res.json({
    success: true,
    data: {
      track: runtime.track,
      title: runtime.title,
      documents: runtime.counts.documents,
      users: runtime.counts.users,
      subsidiaries: runtime.counts.subsidiaries,
      publicEvalRows: data.publicEvaluation.length,
      permissionCases: data.permissionCases.length,
      stack: runtime.stack,
    },
  })
}))

router.get('/workspace/seed-world', asyncRoute(async (_req, res) => {
  const data = await workspace.load()
  const visibleDocuments = data.documents.filter((document) => document.classification !== 'Restricted')
  res.json({
    success: true,
    data: {
      departments: data.departments,
      users: data.users,
      personas: data.personas,
      documents: visibleDocuments,
      questions: data.questions.map(({ documentId, questionEn, questionVi }) => ({
        documentId: data.documents.find((document) => document.id === documentId)?.classification === 'Restricted' ? 'REDACTED' : documentId,
        questionEn,
        questionVi,
      })),
      subsidiaries: data.subsidiaries,
      personaIds: data.personaIds,
    },
    meta: {
      source: 'database',
      documents: data.documents.length,
      users: data.users.length,
      questions: data.questions.length,
    },
  })
}))

router.get('/workspace/personas', asyncRoute(async (_req, res) => {
  const data = await workspace.load()
  res.json({
    success: true,
    data: { users: data.users, personas: data.personas, personaIds: data.personaIds, subsidiaries: data.subsidiaries },
  })
}))

router.get('/workspace/examples', asyncRoute(async (_req, res) => {
  const data = await workspace.load()
  const examples: TascoExampleQa[] = data.questions
    .filter((question) => question.documentId.startsWith('AUTO-') || question.documentId.startsWith('ACC-AUTO-'))
    .flatMap((question) => {
      const document = data.documents.find((candidate) => candidate.id === question.documentId)
      if (!document || document.classification === 'Restricted') return []
      return [{
        id: `QA-${question.documentId}`,
        departmentId: deptId(document.department),
        classification: document.classification,
        question: question.questionEn,
        answer: question.answerEn,
        citation: buildCitation(document),
      }]
    })
  res.json({ success: true, data: examples, meta: { count: examples.length, renderedRequirement: '>=10' } })
}))

router.get(
  '/workspace/documents',
  validate(z.object({
    body: emptyObject.optional(),
    params: emptyObject,
    query: z.object({
      userId: z.string().min(1).default('U001'),
      subsidiary: z.string().optional(),
      classification: z.enum(['Public', 'Internal', 'Confidential', 'Restricted']).optional(),
      department: z.string().optional(),
    }).passthrough(),
  })),
  resolveIdentity('query'),
  asyncRoute(async (req, res) => {
    const documents = await retrieval.listDocuments({
      subsidiaryId: req.query.subsidiary as string | undefined,
      classification: req.query.classification as import('../../../../packages/shared/src/index.js').TascoClassification | undefined,
      departmentId: req.query.department as string | undefined,
    }, res.locals.principal)
    res.json({ success: true, data: documents, meta: { count: documents.length, source: 'database' } })
  })
)

router.get(
  '/workspace/documents/:documentId',
  validate(z.object({
    body: emptyObject.optional(),
    params: z.object({ documentId: z.string().min(1) }),
    query: identityQuery.extend({ language }),
  })),
  resolveIdentity('query'),
  asyncRoute(async (req, res) => {
    const data = await workspace.load()
    try {
      res.json({
        success: true,
        data: await retrieval.documentDetail(res.locals.principal.userId, req.params.documentId, data, req.query.language as 'en' | 'vi'),
      })
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Unknown Tasco document:')) {
        res.status(404).json({
          success: false,
          errors: [{ rule: 'not_found', field: 'documentId', message: 'Document not found' }],
        })
        return
      }
      throw error
    }
  })
)

router.get(
  '/workspace/search',
  validate(z.object({
    body: emptyObject.optional(),
    params: emptyObject,
    query: identityQuery.extend({
      q: z.string().default(''),
      classification: z.enum(['Public', 'Internal', 'Confidential', 'Restricted']).optional(),
      department: z.string().optional(),
      language: z.enum(['en', 'vi']).optional(),
    }),
  })),
  resolveIdentity('query'),
  asyncRoute(async (req, res) => {
    const data = await workspace.load()
    res.json({
      success: true,
      data: await retrieval.searchAuthorized(res.locals.principal.userId, String(req.query.q ?? ''), data, {
        classification: req.query.classification as import('../../../../packages/shared/src/index.js').TascoClassification | undefined,
        departmentId: req.query.department as string | undefined,
        language: req.query.language as 'en' | 'vi' | undefined,
      }),
    })
  })
)

router.get(
  '/workspace/retrieval-trace',
  validate(z.object({
    body: emptyObject.optional(),
    params: emptyObject,
    query: z.object({
      userId: z.string().min(1),
      documentId: z.string().optional(),
      eventType: z.enum(['retrieval_query', 'permission_denied', 'deterministic_answer', 'claude_answer', 'document_detail', 'eval_run']).optional(),
      limit: z.coerce.number().int().min(1).max(100).default(25),
    }),
  })),
  resolveIdentity('query'),
  asyncRoute(async (req, res) => {
    const data = await workspace.load()
    res.json({
      success: true,
      data: await retrieval.replayRetrievalTrace({
        userId: req.query.userId as string | undefined,
        documentId: req.query.documentId as string | undefined,
        eventType: req.query.eventType as TascoAuditEventType | undefined,
        limit: Number(req.query.limit),
      }, data),
    })
  })
)

router.post(
  '/workspace/ask',
  validate(z.object({
    params: emptyObject,
    query: emptyObject,
    body: z.object({
      userId: z.string().min(1).default('U001'),
      question: z.string().trim().min(1).max(8_000),
      language,
      threadId: z.string().uuid().optional(),
    }),
  })),
  resolveIdentity('body'),
  asyncRoute(async (req, res) => {
    const data = await workspace.load()
    const answer = await retrieval.answerQuestion(res.locals.principal.userId, req.body.question, data, req.body.language)
    const persisted = await threads.appendExchange({
      threadId: req.body.threadId,
      userId: res.locals.principal.userId,
      language: req.body.language,
      question: req.body.question,
      response: answer,
    })
    await retrieval.linkMessage(persisted.messageId, answer)
    res.json({ success: true, data: { ...answer, ...persisted } })
  })
)

router.get(
  '/workspace/trace/:messageId',
  validate(z.object({ body: emptyObject.optional(), query: emptyObject, params: z.object({ messageId: z.string().uuid() }) })),
  asyncRoute(async (req, res) => {
    const trace = await retrieval.traceForMessage(req.params.messageId)
    if (trace.summary.events === 0) {
      res.status(404).json({ success: false, errors: [{ rule: 'not_found', field: 'messageId', message: 'Trace not found' }] })
      return
    }
    res.json({ success: true, data: trace })
  })
)

router.get(
  '/workspace/ask/:threadId',
  validate(z.object({
    body: emptyObject.optional(),
    params: z.object({ threadId: z.string().uuid() }),
    query: identityQuery,
  })),
  resolveIdentity('query'),
  asyncRoute(async (req, res) => {
    const thread = await threads.find(req.params.threadId, res.locals.principal.userId)
    if (!thread) {
      res.status(404).json({ success: false, errors: [{ rule: 'not_found', field: 'threadId', message: 'Thread not found' }] })
      return
    }
    res.json({ success: true, data: thread })
  })
)

router.get(
  '/workspace/ask',
  validate(z.object({ body: emptyObject.optional(), params: emptyObject, query: identityQuery })),
  resolveIdentity('query'),
  asyncRoute(async (_req, res) => {
    res.json({ success: true, data: await threads.list(res.locals.principal.userId) })
  })
)

router.post(
  '/workspace/ask/by-role',
  validate(z.object({ params: emptyObject, query: emptyObject, body: z.object({ question: z.string().trim().min(1).max(8_000), language, userId: z.string().min(1) }) })),
  asyncRoute(async (req, res) => {
    const data = await workspace.load()
    res.json({ success: true, data: await retrieval.answerQuestionByRole(req.body.question, [req.body.userId], data, req.body.language) })
  })
)

router.post(
  '/workspace/permission-test',
  validate(z.object({ params: emptyObject, query: emptyObject, body: z.object({ caseId: z.string().optional() }) })),
  asyncRoute(async (req, res) => {
    const data = await workspace.load()
    const results = permissionPolicy.runPermissionCases(data)
    res.json({ success: true, data: req.body.caseId ? results.find((result) => result.id === req.body.caseId) : results })
  })
)

router.get('/workspace/eval', asyncRoute(async (_req, res) => {
  const data = await workspace.load()
  res.json({ success: true, data: await evaluation.run(data) })
}))

router.get('/workspace/eval/latest', asyncRoute(async (_req, res) => {
  res.json({ success: true, data: await evalRuns.latest() })
}))

router.post('/workspace/eval', asyncRoute(async (_req, res) => {
  const data = await workspace.load()
  const report = await evaluation.run(data)
  await retrieval.recordEvalRun(report, {
    trigger: 'workspace_eval_post',
    gitSha: getOptionalEnv('VERCEL_GIT_COMMIT_SHA') ?? getOptionalEnv('GIT_SHA') ?? 'local',
  })
  res.json({ success: true, data: report })
}))

router.post('/demo/reset', asyncRoute(async (req, res) => {
  const configuredToken = getOptionalEnv('DEMO_RESET_TOKEN')
  if (!configuredToken || req.header('x-demo-token') !== configuredToken) {
    res.status(403).json({ success: false, errors: [{ rule: 'authorization', field: 'x-demo-token', message: 'Invalid demo reset token' }] })
    return
  }
  await resetSeed()
  res.json({ success: true, data: { reset: true, checksum: 'workspace-demo:v1' } })
}))

function asyncRoute(handler: (req: Request, res: Response) => Promise<void>): (req: Request, res: Response, next: (error?: unknown) => void) => void {
  return (req, res, next) => {
    void handler(req, res).catch(next)
  }
}

export default router
