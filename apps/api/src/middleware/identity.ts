import type { RequestHandler } from 'express'
import UsersRepository from '../repositories/users_repository.js'

const users = new UsersRepository()

export function resolveIdentity(source: 'body' | 'query' = 'body'): RequestHandler {
  return async (req, res, next) => {
    try {
      const container = source === 'body' ? req.body : req.query
      const requested = typeof container?.userId === 'string' ? container.userId : req.header('x-demo-user')
      const userId = requested || 'U001'
      const principal = await users.findPrincipal(userId)
      if (!principal) {
        res.status(401).json({
          success: false,
          errors: [{ rule: 'identity', field: 'userId', message: 'Unknown Tasco user' }],
        })
        return
      }
      res.locals.principal = principal
      next()
    } catch (error) {
      next(error)
    }
  }
}
