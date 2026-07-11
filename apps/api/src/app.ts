import cors from 'cors'
import express, { type ErrorRequestHandler, type NextFunction, type Request, type Response } from 'express'
import multer from 'multer'
import { optionalEnv } from './config/env.js'
import { ensureSeed } from './db/ensure_seed.js'
import apiRoutes from './routes/api.routes.js'
import myTascoRoutes from './routes/mytasco.routes.js'
import workspaceRoutes from './routes/workspace.routes.js'

const app = express()
const corsOrigin = optionalEnv('CORS_ORIGIN')

app.disable('x-powered-by')
if (corsOrigin) app.use(cors({ origin: corsOrigin }))
app.use(express.json({ limit: '1mb' }))
app.use('/api/v1', async (req, _res, next) => {
  try {
    await ensureSeed()
    next()
  } catch (error) {
    next(error)
  }
}, workspaceRoutes)
app.use('/mytasco/v1', myTascoRoutes)
app.use('/api', apiRoutes)
app.use((_req, res) => res.status(404).json({
  success: false,
  errors: [{ rule: 'route', field: 'path', message: 'Route not found' }],
}))

const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(error)
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      errors: [{ rule: 'file_size', field: 'file', message: 'Files must be 4 MB or smaller' }],
    })
  }
  return res.status(500).json({
    success: false,
    errors: [{ rule: 'server', field: 'request', message: 'Internal server error' }],
  })
}

app.use(errorHandler)

export default app
