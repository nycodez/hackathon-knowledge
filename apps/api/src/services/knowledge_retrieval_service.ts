import { createHash } from 'node:crypto'
import {
  buildCitation,
  buildTrace,
  findDocument,
  findUser,
  type TascoAskResponse,
  type TascoAuditReplayEvent,
  type TascoAuditEventType,
  type TascoDocumentDetailResponse,
  type TascoEvalReport,
  type TascoClassification,
  type TascoQuestion,
  type TascoRetrievalTraceReplayResponse,
  type TascoSearchResponse,
  type TascoSeedData,
  type TascoUser,
} from '../../../../packages/shared/src/index.js'
import AuditRepository from '../repositories/audit_repository.js'
import { getOptionalEnv } from '../config/env.js'
import DocumentsRepository from '../repositories/secure_documents_repository.js'
import EmbeddingService from './embedding_service.js'
import EvalRunsRepository from '../repositories/eval_runs_repository.js'
import KgRepository from '../repositories/kg_repository.js'
import UsersRepository from '../repositories/users_repository.js'
import type { AuthorizedDocumentRow, Principal, RetrievalAuditEventRow } from '../repositories/secure_types.js'

export interface TascoByRoleAskResult {
  question: string
  results: Array<{
    user: TascoUser
    response: TascoAskResponse
  }>
}

export default class KnowledgeRetrievalService {
  private readonly audit = new AuditRepository()
  private readonly documents = new DocumentsRepository()
  private readonly embeddings = new EmbeddingService()
  private readonly evalRuns = new EvalRunsRepository()
  private readonly kg = new KgRepository()
  private readonly users = new UsersRepository()

  async answerQuestion(userId: string, question: string, data: TascoSeedData, language: 'en' | 'vi' = 'en'): Promise<TascoAskResponse> {
    const principal = await this.assertUserScope(userId, data)
    const matchedQuestion = this.findQuestion(question, data, principal)
    const response = matchedQuestion
      ? this.answerKnownQuestion(principal, matchedQuestion, data, language)
      : await this.answerRetrievedQuestion(principal, question, data, language)
    const strengthened = await this.withAuthorizedCitation(principal, response, language)
    const generation = await this.withClaudeAnswer(principal, question, strengthened, language)
    const answered = generation.response
    const auditedDocumentId = answered.trace.document?.id ?? null
    const edgePath = auditedDocumentId
      ? await this.kg.permissionPath(auditedDocumentId, principal.userId).catch(() => [])
      : []

    await this.recordAudit({
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      eventType:
        answered.state === 'permission_refusal'
          ? 'permission_denied'
          : answered.answer === strengthened.answer
            ? 'deterministic_answer'
            : 'claude_answer',
      enforcementPoint: answered.trace.enforcementPoint,
      metadata: {
        question,
        matchedQuestion: this.questionLabel(answered.question),
        state: answered.state,
        documentId: auditedDocumentId,
        decision: answered.trace.decision,
        citationChunkId: answered.citation?.chunkId ?? null,
        llm: answered.answer === strengthened.answer ? 'deterministic' : 'claude',
        model: generation.model,
        promptHash: generation.promptHash,
        latencyMs: generation.latencyMs,
        inputTokens: generation.inputTokens,
        outputTokens: generation.outputTokens,
        groundingChunkIds: answered.citation ? [answered.citation.chunkId] : [],
        retrieval: answered.citation ? 'authorized_document_lookup' : 'blocked_before_retrieval',
        sameQuestionByPersona: answered.trace.sameQuestionByPersona.map((item) => ({
          userId: item.user.id,
          decision: item.decision,
        })),
        edgePath,
        contextHash: generation.contextHash,
      },
    })

    return answered.state === 'permission_refusal' ? this.redactDeniedResponse(answered) : answered
  }

  async documentDetail(
    userId: string,
    documentId: string,
    data: TascoSeedData,
    language: 'en' | 'vi' = 'en'
  ): Promise<TascoDocumentDetailResponse> {
    const principal = await this.assertUserScope(userId, data)

    const authorized = await this.documents.findAuthorizedByDocumentId(principal, documentId, language)
    if (authorized) return this.buildDocumentDetail(principal, authorized, data)
    throw new Error(`Unknown Tasco document: ${documentId}`)
  }

  async answerQuestionByRole(
    question: string,
    _requestedUserIds: string[] | undefined,
    data: TascoSeedData,
    language: 'en' | 'vi' = 'en'
  ): Promise<TascoByRoleAskResult> {
    const selectedDepartment = data.personas.find((persona) => persona.id === _requestedUserIds?.[0])?.department ?? 'FIN'
    const uniqueUserIds = [`AUTO-${selectedDepartment}-EMP`, `AUTO-${selectedDepartment}-EXEC`]
    const results = await Promise.all(
      uniqueUserIds.map(async (userId) => {
        await this.assertUserScope(userId, data)
        return {
          user: findUser(userId, data),
          response: this.comparisonSafeResponse(await this.answerQuestion(userId, question, data, language), language),
        }
      })
    )

    return { question, results }
  }

  async searchAuthorized(
    userId: string,
    queryText: string,
    _data: TascoSeedData,
    scope: { classification?: TascoClassification; departmentId?: string; language?: 'en' | 'vi' } = {}
  ): Promise<TascoSearchResponse> {
    const principal = await this.users.findPrincipal(userId)
    if (!principal) throw new Error(`Unknown Tasco user: ${userId}`)

    const queryEmbedding = await this.queryEmbeddingLiteral(queryText)
    const search = await this.documents.searchAuthorized(principal, queryText, queryEmbedding, scope)
    const hiddenCount = Math.max(0, search.totalCandidates - search.rows.length)

    await this.recordAudit({
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      eventType: 'retrieval_query',
      enforcementPoint: 'retrieval pre-filter',
      metadata: {
        query: queryText,
        totalCandidates: search.totalCandidates,
        returnedCandidates: search.rows.length,
        hiddenCount,
        chunkIds: search.rows.map((row) => row.chunkId),
        contextHashes: search.rows.map((row) => this.contextHash(row.content)),
        ranker: queryEmbedding
          ? 'permission_prefiltered_hybrid_rrf'
          : 'permission_prefiltered_full_text_rrf',
        embeddingModel: queryEmbedding ? this.embeddings.model() : null,
      },
    })

    return {
      hiddenCount,
      totalCandidates: search.totalCandidates,
      results: search.rows.map((row) => ({
        document: row.document,
        citation: { ...buildCitation(row.document), chunkId: row.chunkId },
        snippet: row.content,
      })),
    }
  }

  async listDocuments(filters: Parameters<DocumentsRepository['list']>[0] = {}, principal?: Principal) {
    return this.documents.list(filters, principal)
  }

  async listUsers() {
    return this.users.list()
  }

  async assertUserScope(userId: string, _data?: TascoSeedData) {
    const principal = await this.users.findPrincipal(userId)
    if (!principal) throw new Error(`Unknown Tasco user: ${userId}`)
    return principal
  }

  async replayRetrievalTrace(filters: {
    userId?: string
    documentId?: string
    eventType?: TascoAuditEventType
    limit?: number
  }, data: TascoSeedData): Promise<TascoRetrievalTraceReplayResponse> {
    const limit = Math.min(Math.max(filters.limit ?? 25, 1), 100)
    const principal = filters.userId ? await this.assertUserScope(filters.userId, data) : null
    const tenantId = principal?.tenantId ?? 'tasco-demo'

    try {
      const rows = await this.audit.listRecent({
        tenantId,
        actorUserId: principal?.userId,
        documentId: principal?.role === 'Executive' ? filters.documentId : undefined,
        eventType: filters.eventType,
        limit,
      })
      return {
        source: 'audit',
        filters: {
          userId: filters.userId,
          documentId: filters.documentId,
          eventType: filters.eventType,
          limit,
        },
        summary: {
          events: rows.length,
          persisted: true,
        },
        events: rows.map((row) => this.toAuditReplayEvent(row, principal)),
      }
    } catch {
      return {
        source: 'seed',
        filters: {
          userId: filters.userId,
          documentId: filters.documentId,
          eventType: filters.eventType,
          limit,
        },
        summary: {
          events: 0,
          persisted: false,
        },
        events: [],
      }
    }
  }

  async recordEvalRun(report: TascoEvalReport, metadata: Record<string, unknown> = {}): Promise<void> {
    let evalRunId: string | null = null
    try {
      evalRunId = await this.evalRuns.record({
        tenantId: 'tasco-demo',
        runType: 'public_eval',
        report,
        metadata,
      })
    } catch {
      evalRunId = null
    }

    await this.recordAudit({
      tenantId: 'tasco-demo',
      actorUserId: null,
      eventType: 'eval_run',
      enforcementPoint: 'public_eval_harness',
      metadata: {
        ...metadata,
        evalRunId,
        status: report.score === report.total && report.leaks === 0 ? 'passed' : 'failed',
        score: report.score,
        total: report.total,
        leaks: report.leaks,
        permissionCases: report.caseResults.length,
        publicEvalRows: report.publicResults.length,
      },
    })
  }

  async linkMessage(messageId: string, response: TascoAskResponse): Promise<void> {
    const documentId = response.trace.document?.id ?? null
    const edgePath = documentId
      ? await this.kg.permissionPath(documentId, response.trace.user.id).catch(() => [])
      : []
    await this.recordAudit({
      tenantId: 'tasco-demo',
      actorUserId: response.trace.user.id,
      eventType: response.state === 'answered' ? 'deterministic_answer' : 'permission_denied',
      enforcementPoint: response.trace.enforcementPoint,
      metadata: {
        messageId,
        documentId,
        decision: response.trace.decision,
        rule: response.trace.rule,
        citationChunkId: response.citation?.chunkId ?? null,
        edgePath,
      },
    })
  }

  async traceForMessage(messageId: string): Promise<TascoRetrievalTraceReplayResponse> {
    const rows = await this.audit.findByMessageId(messageId)
    return {
      source: 'audit',
      filters: { limit: rows.length },
      summary: { events: rows.length, persisted: true },
      events: rows.map((row) => this.toAuditReplayEvent(row)),
    }
  }

  private findQuestion(rawQuestion: string, data: TascoSeedData, principal: Principal): TascoQuestion | undefined {
    const normalized = normalizeQuestion(rawQuestion)
    const matches = data.questions.filter((question) =>
      normalizeQuestion(question.questionEn) === normalized || normalizeQuestion(question.questionVi) === normalized
    )
    if (normalized === normalizeQuestion('How is the automotive distribution network performing this month?') ||
        normalized === normalizeQuestion('Mạng lưới phân phối ô tô tháng này hoạt động thế nào?')) {
      return matches.find((question) => question.documentId === (principal.role === 'Executive' ? 'AUTO-EXEC-002' : 'AUTO-DIR-001'))
    }
    return matches[0]
  }

  private answerKnownQuestion(
    principal: Principal,
    question: TascoQuestion,
    data: TascoSeedData,
    language: 'en' | 'vi'
  ): TascoAskResponse {
    const user = this.principalToUser(principal, data)
    const document = findDocument(question.documentId, data)
    const trace = buildTrace(user, document, data)
    if (trace.decision === 'deny') {
      return {
        state: 'permission_refusal',
        answer: language === 'vi'
          ? 'Bạn không có quyền truy cập nguồn này. Nội dung bị chặn trước khi truy xuất và không được gửi tới mô hình.'
          : 'You do not have permission to access this source. Its content was blocked before retrieval and was not sent to the model.',
        question,
        trace,
      }
    }
    return {
      state: 'answered',
      answer: language === 'vi' ? question.answerVi : question.answerEn,
      question,
      citation: buildCitation(document),
      trace,
    }
  }

  private async answerRetrievedQuestion(
    principal: Principal,
    rawQuestion: string,
    data: TascoSeedData,
    language: 'en' | 'vi'
  ): Promise<TascoAskResponse> {
    const queryEmbedding = await this.queryEmbeddingLiteral(rawQuestion)
    const search = await this.documents.searchAuthorized(principal, rawQuestion, queryEmbedding)
    const row = search.rows[0]
    const fallbackDocument = data.documents.find((document) => document.subsidiaryId === principal.subsidiaryId) ?? data.documents[0]
    const document = row?.document ?? fallbackDocument
    const user = this.principalToUser(principal, data)
    const trace = buildTrace(user, document, data)
    const syntheticQuestion: TascoQuestion = {
      documentId: document.id,
      questionEn: rawQuestion,
      questionVi: rawQuestion,
      answerEn: row?.content ?? '',
      answerVi: row?.content ?? '',
    }
    if (!row) {
      return {
        state: 'no_answer',
        answer: language === 'vi'
          ? 'Không tìm thấy câu trả lời có căn cứ trong các nguồn bạn được phép truy cập.'
          : 'No grounded answer was found in the sources you are authorized to access.',
        question: syntheticQuestion,
        trace,
      }
    }
    return {
      state: 'answered',
      answer: language === 'vi'
        ? `Theo ${document.titleVi}, nội dung liên quan đã được tìm thấy trong phần được trích dẫn.`
        : `According to ${document.titleEn}, relevant guidance was found in the cited section.`,
      question: syntheticQuestion,
      citation: { ...buildCitation(document), chunkId: row.chunkId },
      trace,
    }
  }

  private async withAuthorizedCitation(principal: Principal, response: TascoAskResponse, language: 'en' | 'vi'): Promise<TascoAskResponse> {
    if (response.state !== 'answered') return response

    try {
      const row = await this.documents.findAuthorizedByDocumentId(principal, response.question.documentId, language)
      if (!row) return response

      return {
        ...response,
        citation: {
          ...buildCitation(row.document),
          chunkId: row.chunkId,
        },
      }
    } catch {
      return response
    }
  }

  private async withClaudeAnswer(
    principal: Principal,
    rawQuestion: string,
    response: TascoAskResponse,
    language: 'en' | 'vi'
  ): Promise<{
    response: TascoAskResponse
    model: string
    promptHash: string | null
    latencyMs: number
    inputTokens: number
    outputTokens: number
    contextHash: string | null
  }> {
    const apiKey = getOptionalEnv('ANTHROPIC_API_KEY') ?? getOptionalEnv('CLAUDE_API_KEY')
    const enabled = getOptionalEnv('LLM_PROVIDER') === 'claude' || getOptionalEnv('CLAUDE_ENABLED') === 'true'
    const deterministic = {
      response,
      model: 'deterministic',
      promptHash: null,
      latencyMs: 0,
      inputTokens: 0,
      outputTokens: 0,
      contextHash: null,
    }
    if (!enabled || !apiKey || response.state !== 'answered' || !response.citation) return deterministic

    try {
      const row = await this.documents.findAuthorizedByDocumentId(principal, response.question.documentId, language)
      if (!row) return deterministic

      const generated = await this.callClaude({
        apiKey,
        question: rawQuestion,
        document: row.document.titleEn,
        citation: response.citation.sourceId,
        chunk: row.content,
        language,
      })

      return generated
        ? { ...generated, response: { ...response, answer: generated.answer } }
        : deterministic
    } catch {
      return deterministic
    }
  }

  private async callClaude(input: {
    apiKey: string
    question: string
    document: string
    citation: string
    chunk: string
    language: 'en' | 'vi'
  }): Promise<{
    answer: string
    model: string
    promptHash: string
    latencyMs: number
    inputTokens: number
    outputTokens: number
    contextHash: string
  } | null> {
    const model = getOptionalEnv('ANTHROPIC_MODEL') ?? getOptionalEnv('CLAUDE_MODEL') ?? 'claude-3-5-sonnet-latest'
    const started = performance.now()
    const response = await fetch(getOptionalEnv('ANTHROPIC_API_URL') ?? 'https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'anthropic-version': getOptionalEnv('ANTHROPIC_VERSION') ?? '2023-06-01',
        'content-type': 'application/json',
        'x-api-key': input.apiKey,
      },
      body: JSON.stringify({
        model,
        max_tokens: 420,
        temperature: 0,
        system: [
          'You answer Tasco internal knowledge questions only from the supplied permission-checked context.',
          'Every factual claim must cite the supplied source id. Never infer or reveal content outside the context.',
          'If the context is insufficient, return a concise no-answer statement.',
          `Respond in ${input.language === 'vi' ? 'Vietnamese' : 'English'}.`,
        ].join(' '),
        messages: [
          {
            role: 'user',
            content: [
              'Question:',
              input.question,
              '',
              'Permission-checked context:',
              `Source ${input.citation}: ${input.document}`,
              input.chunk,
            ].join('\n'),
          },
        ],
      }),
    })

    if (!response.ok) return null
    const body = (await response.json()) as {
      content?: Array<{ type?: string; text?: string }>
      usage?: { input_tokens?: number; output_tokens?: number }
    }
    const answer = body.content?.find((part) => part.type === 'text' && part.text)?.text?.trim() ?? null
    if (!answer || !answer.includes(input.citation)) return null
    const citedSourceIds = [...answer.matchAll(/DOC\d{3}|TLD\d{3}/g)].map((match) => match[0])
    if (!citedSourceIds.every((sourceId) => sourceId === input.citation)) return null
    return {
      answer,
      model,
      promptHash: this.contextHash({ question: input.question, citation: input.citation, language: input.language }),
      latencyMs: Math.round((performance.now() - started) * 100) / 100,
      inputTokens: body.usage?.input_tokens ?? 0,
      outputTokens: body.usage?.output_tokens ?? 0,
      contextHash: this.contextHash(input.chunk),
    }
  }

  private async buildDocumentDetail(
    principal: Principal,
    row: AuthorizedDocumentRow,
    data: TascoSeedData
  ): Promise<TascoDocumentDetailResponse> {
    const user = this.principalToUser(principal, data)
    const trace = buildTrace(user, row.document, data)
    const allowed = trace.decision === 'allow'
    const chunks = allowed
      ? await this.documents.listChunkMetadata(principal.tenantId, row.document.id)
      : undefined
    const citation = {
      ...buildCitation(row.document),
      chunkId: row.chunkId,
    }
    const detail: TascoDocumentDetailResponse = {
      document: row.document,
      decision: trace.decision,
      trace,
      citation: allowed ? citation : undefined,
      content: allowed ? row.content : undefined,
      deniedReason: allowed
        ? undefined
        : 'Document metadata was resolved, but protected content was blocked before retrieval.',
      chunks,
      accessMatrix: trace.sameQuestionByPersona.map((item) => ({
        user: item.user,
        decision: item.decision,
        rule: trace.rule,
      })),
    }

    await this.recordAudit({
      tenantId: principal.tenantId,
      actorUserId: principal.userId,
      eventType: allowed ? 'document_detail' : 'permission_denied',
      enforcementPoint: trace.enforcementPoint,
      metadata: {
        operation: 'document_detail',
        documentId: row.document.id,
        decision: trace.decision,
        citationChunkId: allowed ? citation.chunkId : null,
        retrieval: allowed ? 'authorized_document_detail' : 'blocked_before_retrieval',
        sameQuestionByPersona: trace.sameQuestionByPersona.map((item) => ({
          userId: item.user.id,
          decision: item.decision,
        })),
        contextHash: this.contextHash({
          actorUserId: principal.userId,
          documentId: row.document.id,
          chunkId: allowed ? citation.chunkId : null,
          decision: trace.decision,
        }),
      },
    })

    return detail
  }

  private redactDeniedResponse(response: TascoAskResponse): TascoAskResponse {
    return {
      ...response,
      question: {
        ...response.question,
        documentId: 'REDACTED',
        answerEn: '',
        answerVi: '',
      },
      citation: undefined,
      trace: {
        ...response.trace,
        document: undefined,
        target: 'protected_source_redacted',
        proof: {
          ...response.trace.proof,
          authorizedChunks: 0,
          restrictedContextSentToModel: 0,
          targetDisclosed: false,
        },
      },
    }
  }

  private comparisonSafeResponse(response: TascoAskResponse, language: 'en' | 'vi'): TascoAskResponse {
    if (response.state !== 'answered') return response
    return {
      ...response,
      answer: language === 'vi'
        ? 'Có câu trả lời được phép khi chuyển sang danh tính này.'
        : 'An authorized answer is available after switching to this identity.',
      question: { ...response.question, documentId: 'REDACTED', answerEn: '', answerVi: '' },
      citation: undefined,
      trace: {
        ...response.trace,
        document: undefined,
        proof: { ...response.trace.proof, targetDisclosed: false },
      },
    }
  }

  private async recordAudit(event: Parameters<AuditRepository['record']>[0]): Promise<void> {
    // Retrieval evidence is part of the security boundary. If it cannot be
    // persisted, fail the operation instead of returning an unaudited answer.
    await this.audit.record(event)
  }

  private async queryEmbeddingLiteral(queryText: string): Promise<string | null> {
    try {
      const embedding = await this.embeddings.embedSearchText(queryText)
      return embedding ? this.embeddings.toVectorLiteral(embedding) : null
    } catch {
      return null
    }
  }

  private questionLabel(question: TascoQuestion): string {
    return question.questionEn
  }

  private principalToUser(principal: Principal, data: TascoSeedData): TascoUser {
    try {
      return findUser(principal.userId, data)
    } catch {
      return {
        id: principal.userId,
        name: principal.userId,
        department: principal.departmentId,
        role: principal.role,
        subsidiaryId: principal.subsidiaryId,
      }
    }
  }

  private toAuditReplayEvent(row: RetrievalAuditEventRow, principal: Principal | null = null): TascoAuditReplayEvent {
    const metadata = principal?.role !== 'Executive' && row.event_type === 'permission_denied'
      ? {
          state: 'permission_refusal',
          decision: 'deny',
          retrieval: 'blocked_before_retrieval',
          authorizedChunks: 0,
          restrictedContextSentToModel: 0,
        }
      : row.metadata
    return {
      id: row.id,
      tenantId: row.tenant_id,
      actorUserId: row.actor_user_id,
      eventType: row.event_type,
      enforcementPoint: row.enforcement_point,
      metadata,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    }
  }

  private contextHash(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value)).digest('hex')
  }
}

function normalizeQuestion(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('vi-VN')
}
