import { randomUUID } from 'node:crypto'
import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { ensureSeed } from '../db/ensure_seed.js'
import MyTascoDirectoryService from '../services/mytasco_directory_service.js'

const router = Router()
const directory = new MyTascoDirectoryService()

const pageInfo = z.object({
  pageSize: z.coerce.number().int().min(1).max(400).default(400),
  currentPage: z.coerce.number().int().min(0).default(0),
}).default({ pageSize: 400, currentPage: 0 })

const staffSearch = z.object({
  example: z.object({
    keyword: z.string().trim().max(200).optional(),
    orgUnitId: z.coerce.number().int().positive().optional(),
    status: z.coerce.number().int().min(0).max(1).optional(),
    sortSpecialId: z.array(z.coerce.number().int().positive()).optional(),
  }).default({}),
  pageInfo,
})

const organizationTree = z.object({
  organizationId: z.coerce.number().int().positive().optional(),
  depth: z.coerce.number().int().min(0).max(8).default(2),
})

router.use((req, res, next) => {
  const requestId = req.header('x-request-id')?.trim() || randomUUID()
  res.locals.requestId = requestId
  res.setHeader('x-request-id', requestId)

  if (req.header('x-app-code') !== 'MYTASCO') {
    copError(res, 400, 'invalid_request', 'X-App-Code must be MYTASCO', 'missing or invalid x-app-code header')
    return
  }

  const authorization = req.header('authorization')
  if (authorization && !/^Bearer demo-U\d{3}$/.test(authorization)) {
    copError(res, 401, 'unauthorized', 'Bearer token is invalid or expired', 'the mock facade accepts demo-U001 through demo-U032')
    return
  }
  next()
})

router.use((_req, res, next) => {
  void ensureSeed().then(() => next()).catch((error: unknown) => {
    console.error(error)
    copError(
      res,
      503,
      'service_unavailable',
      'Directory data is temporarily unavailable',
      error instanceof Error ? error.message : 'seed initialization failed'
    )
  })
})

router.get('/health', (_req, res) => {
  copSuccess(res, { service: 'mytasco-compatibility-facade', deterministic: true })
})

router.post(['/staff/search', '/staff/quick-search'], asyncRoute(async (req, res) => {
  const parsed = staffSearch.safeParse(req.body)
  if (!parsed.success) {
    copError(res, 400, 'invalid_request', 'Invalid staff search request', parsed.error.issues.map((issue) => issue.message).join('; '))
    return
  }
  copSuccess(res, await directory.searchStaff({ ...parsed.data.example, ...parsed.data.pageInfo }))
}))

router.get('/organization/tree', asyncRoute(async (req, res) => {
  const parsed = organizationTree.safeParse(req.query)
  if (!parsed.success) {
    copError(res, 400, 'invalid_request', 'Invalid organization tree request', parsed.error.issues.map((issue) => issue.message).join('; '))
    return
  }
  const body = await directory.organizationTree(parsed.data.organizationId, parsed.data.depth)
  if (parsed.data.organizationId !== undefined && body.result.length === 0) {
    copError(res, 404, 'not_found', 'Organization was not found', `unknown organizationId ${parsed.data.organizationId}`)
    return
  }
  copSuccess(res, body)
}))

function copSuccess(res: Response, body: unknown): void {
  res.json({
    status: 'success',
    message: 'SUCCESS',
    body,
    requestId: res.locals.requestId,
  })
}

function copError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  technicalMessage: string
): void {
  res.status(statusCode).json({
    status: 'error',
    code,
    message,
    technicalMessage,
    requestId: res.locals.requestId,
  })
}

function asyncRoute(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response): void => {
    void handler(req, res).catch((error: unknown) => {
      console.error(error)
      copError(res, 500, 'internal_error', 'Internal server error', error instanceof Error ? error.message : 'unknown error')
    })
  }
}

export default router
