import 'dotenv/config'

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export function optionalEnv(name: string): string | undefined {
  return process.env[name]?.trim() || undefined
}

export const getOptionalEnv = optionalEnv

export const getEnv = requireEnv

export function useDatabaseSsl(): boolean {
  const sslMode = (process.env.PGSSLMODE ?? '').toLowerCase()
  if (['require', 'verify-ca', 'verify-full'].includes(sslMode)) return true
  if (sslMode === 'disable') return false
  return process.env.DATABASE_SSL === 'true'
}

export const shouldUseDatabaseSsl = useDatabaseSsl
