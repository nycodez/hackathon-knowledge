import type { RequestHandler } from 'express'
import type { ZodTypeAny } from 'zod'

export function validate(schema: ZodTypeAny): RequestHandler {
  return (req, res, next) => {
    const parsed = schema.safeParse({ body: req.body, query: req.query, params: req.params })
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        errors: parsed.error.issues.map((issue) => ({
          rule: issue.code,
          field: issue.path.join('.'),
          message: issue.message,
        })),
      })
      return
    }
    const value = parsed.data as { body?: unknown; query?: unknown; params?: unknown }
    if (value.body !== undefined) req.body = value.body
    if (value.query !== undefined) Object.assign(req.query, value.query)
    if (value.params !== undefined) Object.assign(req.params, value.params)
    next()
  }
}
