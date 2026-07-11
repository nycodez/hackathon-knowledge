import {
  canAccess,
  findDocument,
  type TascoEvalReport,
  type TascoSeedData,
} from '../../../../packages/shared/src/index.js'
import KnowledgeRetrievalService from './knowledge_retrieval_service.js'
import PermissionPolicyService from './permission_policy_service.js'
import { query } from '../db/pool.js'

export default class EvaluationService {
  private readonly permissionPolicy = new PermissionPolicyService()
  private readonly retrieval = new KnowledgeRetrievalService()

  public async run(data: TascoSeedData): Promise<TascoEvalReport> {
    const report = this.permissionPolicy.buildEvalReport(data)
    const latencies: number[] = []
    let recalled = 0

    for (const question of data.questions) {
      const document = findDocument(question.documentId, data)
      const user = data.users.find((candidate) => canAccess(candidate, document) && candidate.subsidiaryId === document.subsidiaryId)
      if (!user) continue
      const started = performance.now()
      const result = await this.retrieval.searchAuthorized(user.id, question.questionEn, data, { language: 'en' })
      latencies.push(performance.now() - started)
      if (result.results.slice(0, 5).some((candidate) => candidate.document.id === document.id)) recalled += 1
    }

    let restrictedContextHits = 0
    for (const question of data.questions.filter((candidate) => findDocument(candidate.documentId, data).classification === 'Restricted')) {
      const result = await this.retrieval.searchAuthorized('U001', question.questionEn, data, { language: 'en' })
      restrictedContextHits += result.results.filter((candidate) => candidate.document.classification === 'Restricted').length
    }
    const contextHashCheck = await query<{ hits: string }>(`
      SELECT count(*)::text AS hits
      FROM retrieval_audit_events e
      CROSS JOIN LATERAL jsonb_array_elements_text(coalesce(e.metadata->'contextHashes', '[]'::jsonb)) context_hash
      JOIN knowledge_chunks c ON c.content_hash = context_hash
      JOIN knowledge_sources s ON s.id = c.source_id
      WHERE e.tenant_id = 'tasco-demo'
        AND e.actor_user_id = 'U001'
        AND s.permission_class = 'Restricted'
    `)
    restrictedContextHits += Number(contextHashCheck.rows[0]?.hits ?? 0)

    const sorted = latencies.sort((a, b) => a - b)
    report.metrics = {
      recallAt5: data.questions.length ? recalled / data.questions.length : 0,
      restrictedContextHits,
      latencyP50Ms: percentile(sorted, 0.5),
      latencyP95Ms: percentile(sorted, 0.95),
    }
    return report
  }
}

function percentile(values: number[], fraction: number): number {
  if (!values.length) return 0
  const index = Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * fraction) - 1))
  return Math.round(values[index] * 100) / 100
}
