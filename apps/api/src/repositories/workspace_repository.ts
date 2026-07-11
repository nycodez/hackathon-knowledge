import {
  DEPARTMENT_LABELS,
  type TascoDepartment,
  type TascoDocument,
  type TascoPermissionCase,
  type TascoPublicEvalRow,
  type TascoQuestion,
  type TascoSeedData,
  type TascoSubsidiary,
} from '@hackathon/shared'
import { query } from '../db/pool.js'
import UsersRepository from './users_repository.js'

interface QuestionRow {
  document_id: string
  question_en: string
  question_vi: string
  answer_en: string
  answer_vi: string
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
}

export default class WorkspaceRepository {
  private readonly users = new UsersRepository()

  public async load(): Promise<TascoSeedData> {
    const [users, documents, questions, subsidiaries, permissionCases, publicEvaluation] = await Promise.all([
      this.users.list(),
      this.listDocuments(),
      this.listQuestions(),
      this.listSubsidiaries(),
      this.listPermissionCases(),
      this.listPublicEvaluation(),
    ])
    return {
      departments: Object.entries(DEPARTMENT_LABELS).map(([id, label]) => ({ id, ...label })) as TascoDepartment[],
      users,
      documents,
      questions,
      subsidiaries,
      personaIds: ['U004', 'U001', 'U002', 'U007'],
      permissionCases,
      publicEvaluation,
    }
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
      'SELECT id, user_id, document_ids, expected, answer_type FROM tasco_public_eval_rows ORDER BY id'
    )
    return result.rows.map((row) => ({
      questionId: row.id,
      userId: row.user_id,
      documentIds: row.document_ids,
      expected: row.expected,
      answerType: row.answer_type,
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
