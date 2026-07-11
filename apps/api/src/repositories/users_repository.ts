import { deptId, type TascoUser } from '@hackathon/shared'
import { query } from '../db/pool.js'
import type { Principal } from './secure_types.js'

interface UserRow {
  id: string
  full_name: string
  department_id: string
  role: TascoUser['role']
  subsidiary_id: string
}

function toUser(row: UserRow): TascoUser {
  return {
    id: row.id,
    name: row.full_name,
    department: row.department_id,
    role: row.role,
    subsidiaryId: row.subsidiary_id,
  }
}

export default class UsersRepository {
  public async list(): Promise<TascoUser[]> {
    const result = await query<UserRow>(
      `
        SELECT id, full_name, department_id, role, subsidiary_id
        FROM tasco_users
        ORDER BY id
      `
    )
    return result.rows.map(toUser)
  }

  public async findPrincipal(userId: string): Promise<Principal | null> {
    const result = await query<UserRow>(
      `
        SELECT id, full_name, department_id, role, subsidiary_id
        FROM tasco_users
        WHERE id = $1
        LIMIT 1
      `,
      [userId]
    )
    const row = result.rows[0]
    if (!row) return null
    return {
      userId: row.id,
      role: row.role,
      departmentId: deptId(row.department_id),
      subsidiaryId: row.subsidiary_id,
      tenantId: 'tasco-demo',
    }
  }
}
