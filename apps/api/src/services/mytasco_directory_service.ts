import { deptId, type TascoDepartment, type TascoUser } from '../../../../packages/shared/src/index.js'
import WorkspaceRepository from '../repositories/workspace_repository.js'

const ROOT_ORGANIZATION_ID = 1
const departmentOrganizationIds = {
  COMP: 10,
  HR: 11,
  FIN: 12,
  PROD: 13,
  ENG: 14,
  OPS: 15,
  LEGAL: 16,
  EXEC: 17,
} as const

export interface MyTascoStaffSummary {
  staffId: number
  staffCode: string
  staffName: string
  title: string
  email: string | null
  phoneNumber: string | null
  status: number
  provinceName: string
  listOrgUnit: Array<{
    orgUnitId: number
    orgUnitCode: string
    orgUnitName: string
  }>
}

export interface MyTascoOrganizationNode {
  organizationId: number
  organizationName: string
  organizationCode: string
  parentId: number | null
  children?: MyTascoOrganizationNode[]
}

export default class MyTascoDirectoryService {
  public constructor(private readonly workspace = new WorkspaceRepository()) {}

  public async searchStaff(input: {
    keyword?: string
    orgUnitId?: number
    status?: number
    pageSize: number
    currentPage: number
  }): Promise<{ result: MyTascoStaffSummary[]; pageInfo: { pageSize: number; currentPage: number; totalRecord: number } }> {
    const data = await this.workspace.load()
    const keyword = normalize(input.keyword ?? '')
    const filtered = data.users
      .filter((user) => user.subsidiaryId === 'DNP-WATER')
      .map((user) => toStaffSummary(user, data.departments))
      .filter((staff) => input.status === undefined || staff.status === input.status)
      .filter((staff) => input.orgUnitId === undefined || staff.listOrgUnit.some((unit) => unit.orgUnitId === input.orgUnitId))
      .filter((staff) => !keyword || normalize([
        staff.staffCode,
        staff.staffName,
        staff.email ?? '',
        staff.phoneNumber ?? '',
      ].join(' ')).includes(keyword))

    const start = input.currentPage * input.pageSize
    return {
      result: filtered.slice(start, start + input.pageSize),
      pageInfo: {
        pageSize: input.pageSize,
        currentPage: input.currentPage,
        totalRecord: filtered.length,
      },
    }
  }

  public async organizationTree(organizationId?: number, depth = 2): Promise<{ result: MyTascoOrganizationNode[] }> {
    const departments = (await this.workspace.load()).departments
    const root: MyTascoOrganizationNode = {
      organizationId: ROOT_ORGANIZATION_ID,
      organizationName: 'DNP Water',
      organizationCode: 'DNP-WATER',
      parentId: null,
      children: depth > 0 ? departments.map(toOrganizationNode) : undefined,
    }
    if (organizationId === undefined || organizationId === ROOT_ORGANIZATION_ID) return { result: [root] }
    const department = departments.find((candidate) => departmentOrganizationIds[candidate.id] === organizationId)
    return { result: department ? [toOrganizationNode(department)] : [] }
  }
}

function toStaffSummary(user: TascoUser, departments: TascoDepartment[]): MyTascoStaffSummary {
  const departmentId = deptId(user.department)
  const department = departments.find((candidate) => candidate.id === departmentId)
  const numericId = Number.parseInt(user.id.replace(/\D/g, ''), 10)
  return {
    staffId: 10_000 + numericId,
    staffCode: `NS-${String(numericId).padStart(5, '0')}`,
    staffName: user.name,
    title: user.role,
    email: user.email ?? null,
    phoneNumber: null,
    status: user.status === 'Inactive' ? 0 : 1,
    provinceName: 'Hà Nội',
    listOrgUnit: [{
      orgUnitId: departmentOrganizationIds[departmentId],
      orgUnitCode: departmentId,
      orgUnitName: department?.vi ?? departmentId,
    }],
  }
}

function toOrganizationNode(department: TascoDepartment): MyTascoOrganizationNode {
  return {
    organizationId: departmentOrganizationIds[department.id],
    organizationName: department.vi,
    organizationCode: department.id,
    parentId: ROOT_ORGANIZATION_ID,
  }
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi-VN').trim()
}
