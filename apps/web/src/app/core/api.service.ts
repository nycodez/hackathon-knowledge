import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http'
import { Injectable } from '@angular/core'
import type {
  ApiEnvelope,
  AskResult,
  Conversation,
  ConversationSummary,
  DashboardSummary,
  HealthSummary,
  KnowledgeDocument,
  LibraryFolder,
  LibraryListing,
  TascoAskResponse,
  TascoDocumentDetailResponse,
  TascoEvalReport,
  TascoRuntimeMeta,
  TascoExampleQa,
  TascoThreadResponse,
  TascoThreadSummary,
  TascoUser,
  TascoWorkspaceBootstrap,
} from '@hackathon/shared'
import { map, type Observable } from 'rxjs'

export interface KnowledgeByRoleAskResponse {
  question: string
  results: Array<{ user: TascoUser; response: TascoAskResponse }>
}

export interface KnowledgeEvalRun {
  id: string
  status: string
  score: number
  total: number
  leaks: number
  report: TascoEvalReport | null
  metadata: Record<string, unknown>
  createdAt: string
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly headers = new HttpHeaders({ 'x-workspace-id': 'hackathon-demo' })

  constructor(private readonly http: HttpClient) {}

  health(): Observable<HealthSummary> {
    return this.get<HealthSummary>('/api/health')
  }

  dashboard(): Observable<DashboardSummary> {
    return this.get<DashboardSummary>('/api/dashboard')
  }

  conversations(): Observable<ConversationSummary[]> {
    return this.get<ConversationSummary[]>('/api/conversations')
  }

  conversation(id: string): Observable<Conversation> {
    return this.get<Conversation>(`/api/conversations/${id}`)
  }

  deleteConversation(id: string): Observable<void> {
    return this.http.delete<void>(`/api/conversations/${id}`, { headers: this.headers })
  }

  ask(message: string, conversationId?: string): Observable<AskResult> {
    return this.unwrap(this.http.post<ApiEnvelope<AskResult>>('/api/query', { message, conversationId }, { headers: this.headers }))
  }

  documents(): Observable<KnowledgeDocument[]> {
    return this.get<KnowledgeDocument[]>('/api/documents')
  }

  library(folderId: string | null): Observable<LibraryListing> {
    const query = folderId ? `?folderId=${encodeURIComponent(folderId)}` : ''
    return this.get<LibraryListing>(`/api/library${query}`)
  }

  createFolder(name: string, parentId: string | null): Observable<LibraryFolder> {
    return this.unwrap(this.http.post<ApiEnvelope<LibraryFolder>>(
      '/api/library/folders',
      { name, parentId },
      { headers: this.headers }
    ))
  }

  deleteFolder(id: string): Observable<void> {
    return this.http.delete<void>(`/api/library/folders/${id}`, { headers: this.headers })
  }

  upload(file: File, folderId: string | null = null): Observable<KnowledgeDocument> {
    const form = new FormData()
    form.append('file', file)
    if (folderId) form.append('folderId', folderId)
    return this.unwrap(this.http.post<ApiEnvelope<KnowledgeDocument>>('/api/documents', form, { headers: this.headers }))
  }

  processDocument(id: string): Observable<KnowledgeDocument> {
    return this.unwrap(this.http.post<ApiEnvelope<KnowledgeDocument>>(`/api/documents/${id}/process`, {}, { headers: this.headers }))
  }

  deleteDocument(id: string): Observable<void> {
    return this.http.delete<void>(`/api/documents/${id}`, { headers: this.headers })
  }

  knowledgeWorld(): Observable<TascoWorkspaceBootstrap> {
    return this.get<TascoWorkspaceBootstrap>('/api/v1/workspace/seed-world')
  }

  knowledgeMeta(): Observable<TascoRuntimeMeta> {
    return this.get<TascoRuntimeMeta>('/api/v1/meta')
  }

  secureAsk(input: { userId: string; question: string; language: 'en' | 'vi'; threadId?: string }): Observable<TascoAskResponse> {
    return this.unwrap(this.http.post<ApiEnvelope<TascoAskResponse>>('/api/v1/workspace/ask', input, { headers: this.headers }))
  }

  secureAskByRole(userId: string, question: string, language: 'en' | 'vi'): Observable<KnowledgeByRoleAskResponse> {
    return this.unwrap(this.http.post<ApiEnvelope<KnowledgeByRoleAskResponse>>(
      '/api/v1/workspace/ask/by-role',
      { userId, question, language },
      { headers: this.headers }
    ))
  }

  knowledgeThreads(userId: string): Observable<TascoThreadSummary[]> {
    return this.get<TascoThreadSummary[]>(`/api/v1/workspace/ask?userId=${encodeURIComponent(userId)}`)
  }

  knowledgeThread(userId: string, threadId: string): Observable<TascoThreadResponse> {
    return this.get<TascoThreadResponse>(`/api/v1/workspace/ask/${encodeURIComponent(threadId)}?userId=${encodeURIComponent(userId)}`)
  }

  knowledgeExamples(): Observable<TascoExampleQa[]> {
    return this.get<TascoExampleQa[]>('/api/v1/workspace/examples')
  }

  knowledgeDocumentDetail(userId: string, documentId: string, language: 'en' | 'vi'): Observable<TascoDocumentDetailResponse> {
    const params = new HttpParams().set('userId', userId).set('language', language)
    return this.get<TascoDocumentDetailResponse>(`/api/v1/workspace/documents/${encodeURIComponent(documentId)}?${params.toString()}`)
  }

  knowledgeEval(): Observable<TascoEvalReport> {
    return this.get<TascoEvalReport>('/api/v1/workspace/eval')
  }

  latestKnowledgeEval(): Observable<KnowledgeEvalRun | null> {
    return this.get<KnowledgeEvalRun | null>('/api/v1/workspace/eval/latest')
  }

  runKnowledgeEval(): Observable<TascoEvalReport> {
    return this.unwrap(this.http.post<ApiEnvelope<TascoEvalReport>>('/api/v1/workspace/eval', {}, { headers: this.headers }))
  }

  message(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error as ApiEnvelope<unknown> | undefined
      return payload?.errors?.[0]?.message ?? `Request failed (${error.status || 'network'})`
    }
    return error instanceof Error ? error.message : 'Something went wrong'
  }

  private get<T>(url: string): Observable<T> {
    return this.unwrap(this.http.get<ApiEnvelope<T>>(url, { headers: this.headers }))
  }

  private unwrap<T>(source: Observable<ApiEnvelope<T>>): Observable<T> {
    return source.pipe(map((response) => {
      if (!response.success || response.data === undefined) {
        throw new Error(response.errors?.[0]?.message ?? 'The API returned an invalid response')
      }
      return response.data
    }))
  }
}
