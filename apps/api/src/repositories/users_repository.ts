import { deptId, type TascoUser } from '../../../../packages/shared/src/index.js'
import { query } from '../db/pool.js'
import type { Principal } from './secure_types.js'

interface UserRow {
  id: string
  tenant_id: string
  full_name: string
  department_id: string
  role: TascoUser['role']
  subsidiary_id: string
  email: string | null
  status: 'Active' | 'Inactive' | null
  identity_type?: 'sponsor_user' | 'demo_persona'
  display_department?: string | null
  business_unit_id?: string | null
  provenance?: string | null
}

function toUser(row: UserRow): TascoUser {
  return {
    id: row.id,
    name: row.full_name,
    department: row.department_id,
    role: row.role,
    subsidiaryId: row.subsidiary_id,
    email: row.email ?? undefined,
    status: row.status ?? undefined,
    identityType: row.identity_type,
    displayDepartment: row.display_department ?? undefined,
    businessUnitId: row.business_unit_id ?? undefined,
    businessUnitName: row.business_unit_id === 'TASCO-PROPERTY-DEMO' ? 'Tasco Property Management' : undefined,
    provenance: row.provenance ?? undefined,
  }
}

export default class UsersRepository {
  public async list(): Promise<TascoUser[]> {
    const result = await query<UserRow>(
      `
        SELECT id, tenant_id, full_name, department_id, role, subsidiary_id,
               metadata->>'email' AS email, metadata->>'status' AS status,
               'sponsor_user' AS identity_type, NULL AS display_department,
               NULL AS business_unit_id, metadata->>'source' AS provenance
        FROM tasco_users
        WHERE tenant_id = 'tasco-demo'
        ORDER BY id
      `
    )
    return result.rows.map(toUser)
  }

  public async listPersonas(): Promise<TascoUser[]> {
    const result = await query<UserRow>(
      `
        SELECT id, tenant_id, full_name, department_id, role, subsidiary_id,
               NULL AS email, metadata->>'status' AS status,
               'demo_persona' AS identity_type, display_department,
               business_unit_id, metadata->>'source' AS provenance
        FROM tasco_demo_personas
        WHERE tenant_id = 'tasco-demo'
        ORDER BY department_id, role
      `
    )
    return result.rows.map(toUser)
  }

  public async findPrincipal(userId: string): Promise<Principal | null> {
    const result = await query<UserRow>(
      `
        SELECT id, tenant_id, full_name, department_id, role, subsidiary_id
        FROM (
          SELECT id, tenant_id, full_name, department_id, role, subsidiary_id FROM tasco_users
          UNION ALL
          SELECT id, tenant_id, full_name, department_id, role, subsidiary_id FROM tasco_demo_personas
        ) identities
        WHERE tenant_id = 'tasco-demo' AND id = $1
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
      tenantId: row.tenant_id,
    }
  }
}
