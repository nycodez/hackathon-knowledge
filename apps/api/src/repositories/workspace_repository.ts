import {
  deptId,
  type TascoDepartment,
  type TascoDocument,
  type TascoPermissionCase,
  type TascoPublicEvalRow,
  type TascoQuestion,
  type TascoSeedData,
  type TascoSubsidiary,
} from '../../../../packages/shared/src/index.js'
import { query } from '../db/pool.js'
import UsersRepository from './users_repository.js'

interface QuestionRow {
  document_id: string
  question_en: string
  question_vi: string
  answer_en: string
  answer_vi: string
}

interface DepartmentRow {
  id: TascoDepartment['id']
  name_en: string
  name_vi: string
  knowledge_space: TascoDepartment['knowledgeSpace'] | null
}

interface SubsidiaryRow {
  id: string
  name: string
  meta_en: string
  meta_vi: string
}

interface PermissionCaseRow {
  id: string
  user_id: string
  document_id: string
  expected: 'Allow' | 'Deny'
  rule_text: string
  enforcement_point: 'pre-filter' | 'subsidiary pre-filter'
}

interface EvalRow {
  id: string
  user_id: string
  document_ids: string[]
  expected: 'Allow' | 'Deny'
  answer_type: TascoPublicEvalRow['answerType']
  category: string | null
  user_role: TascoPublicEvalRow['userRole'] | null
  user_department: string | null
  question_vi: string | null
  difficulty: TascoPublicEvalRow['difficulty'] | null
  canonical_role: TascoPublicEvalRow['canonicalRole'] | null
  canonical_department: string | null
}

export default class WorkspaceRepository {
  private readonly users = new UsersRepository()

  public async load(): Promise<TascoSeedData> {
    const [departments, users, personas, documents, questions, subsidiaries, permissionCases, publicEvaluation] = await Promise.all([
      this.listDepartments(),
      this.users.list(),
      this.users.listPersonas(),
      this.listDocuments(),
      this.listQuestions(),
      this.listSubsidiaries(),
      this.listPermissionCases(),
      this.listPublicEvaluation(),
    ])
    return {
      departments,
      users,
      personas,
      documents,
      questions,
      subsidiaries,
      personaIds: ['PM-FIN-EMP', 'PM-FIN-EXEC'],
      permissionCases,
      publicEvaluation,
    }
  }

  private async listDepartments(): Promise<TascoDepartment[]> {
    const result = await query<DepartmentRow>(
      `
        SELECT id, name_en, name_vi, metadata->>'knowledgeSpace' AS knowledge_space
        FROM tasco_departments
        WHERE tenant_id = 'tasco-demo'
        ORDER BY id
      `
    )
    return result.rows.map((row) => ({
      id: row.id,
      en: row.name_en,
      vi: row.name_vi,
      knowledgeSpace: row.knowledge_space ?? undefined,
    }))
  }

  public async findQuestion(rawQuestion: string): Promise<TascoQuestion | null> {
    const normalized = normalizeQuestion(rawQuestion)
    const result = await query<QuestionRow>(
      `
        SELECT document_id, question_en, question_vi, answer_en, answer_vi
        FROM tasco_questions
        WHERE normalized_question_en = $1 OR normalized_question_vi = $1
        LIMIT 1
      `,
      [normalized]
    )
    return result.rows[0] ? toQuestion(result.rows[0]) : null
  }

  private async listDocuments(): Promise<TascoDocument[]> {
    const result = await query<{
      id: string
      title_en: string
      title_vi: string
      department_id: string
      permission_class: TascoDocument['classification']
      subsidiary_id: string
    }>(
      `
        SELECT source_record_id AS id, title AS title_en, metadata->>'titleVi' AS title_vi,
               department_id, permission_class, subsidiary_id
        FROM knowledge_sources
        WHERE tenant_id = 'tasco-demo' AND source_type = 'workspace_document'
          AND status = 'indexed' AND deleted_at IS NULL
        ORDER BY source_record_id
      `
    )
    return result.rows.map((row) => ({
      id: row.id,
      titleEn: row.title_en,
      titleVi: row.title_vi ?? row.title_en,
      department: row.department_id,
      classification: row.permission_class,
      subsidiaryId: row.subsidiary_id,
    }))
  }

  private async listQuestions(): Promise<TascoQuestion[]> {
    const result = await query<QuestionRow>(
      'SELECT document_id, question_en, question_vi, answer_en, answer_vi FROM tasco_questions ORDER BY document_id'
    )
    return result.rows.map(toQuestion)
  }

  private async listSubsidiaries(): Promise<TascoSubsidiary[]> {
    const result = await query<SubsidiaryRow>('SELECT id, name, meta_en, meta_vi FROM tasco_subsidiaries ORDER BY id')
    return result.rows.map((row) => ({ id: row.id, name: row.name, metaEn: row.meta_en, metaVi: row.meta_vi }))
  }

  private async listPermissionCases(): Promise<TascoPermissionCase[]> {
    const result = await query<PermissionCaseRow>(
      'SELECT id, user_id, document_id, expected, rule_text, enforcement_point FROM tasco_permission_cases ORDER BY id'
    )
    return result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      documentId: row.document_id,
      expected: row.expected,
      ruleEn: row.rule_text,
      ruleVi: row.rule_text,
      point: row.enforcement_point,
    }))
  }

  private async listPublicEvaluation(): Promise<TascoPublicEvalRow[]> {
    const result = await query<EvalRow>(
      `
        SELECT e.id, e.user_id, e.document_ids, e.expected, e.answer_type,
               e.category, COALESCE(e.source_user_role, e.user_role) AS user_role,
               COALESCE(e.source_user_department, e.user_department) AS user_department,
               e.question_vi, e.difficulty, u.role AS canonical_role,
               u.department_id AS canonical_department
        FROM tasco_public_eval_rows e
        JOIN tasco_users u ON u.tenant_id = e.tenant_id AND u.id = e.user_id
        ORDER BY e.id
      `
    )
    return result.rows.map((row) => ({
      questionId: row.id,
      userId: row.user_id,
      documentIds: row.document_ids,
      expected: row.expected,
      answerType: row.answer_type,
      category: row.category ?? undefined,
      userRole: row.user_role ?? undefined,
      userDepartment: row.user_department ?? undefined,
      canonicalRole: row.canonical_role ?? undefined,
      canonicalDepartment: row.canonical_department ?? undefined,
      identityMismatch: row.user_role !== row.canonical_role || (
        row.user_department ? deptId(row.user_department) !== deptId(row.canonical_department ?? '') : false
      ),
      questionVi: row.question_vi ?? undefined,
      difficulty: row.difficulty ?? undefined,
    }))
  }
}

function toQuestion(row: QuestionRow): TascoQuestion {
  return {
    documentId: row.document_id,
    questionEn: row.question_en,
    questionVi: row.question_vi,
    answerEn: row.answer_en,
    answerVi: row.answer_vi,
  }
}

function normalizeQuestion(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('vi-VN')
}
