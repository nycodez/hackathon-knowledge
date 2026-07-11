import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import type { TascoAskResponse, TascoDepartmentId, TascoQuestionPrompt, TascoRole, TascoThreadResponse, TascoThreadSummary, TascoWorkspaceBootstrap } from '@hackathon/shared'
import { finalize, forkJoin } from 'rxjs'
import { ApiService, type KnowledgeByRoleAskResponse } from '../core/api.service'

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="page customization-page secure-ask-page">
      <header class="page-header compact-header">
        <div>
          <span class="eyebrow">Accounting · Property management</span>
          <h1>Permission-safe Ask</h1>
          <p>Identity is resolved from PostgreSQL, department names are canonicalized, and unauthorized chunks are removed in SQL before ranking or generation.</p>
        </div>
        <div class="knowledge-controls" aria-label="Demo identity">
          <label>Department
            <select [value]="selectedDepartment()" (change)="selectDepartment($event)" [disabled]="loading()">
              @for (department of world()?.departments ?? []; track department.id) {
                <option [value]="department.id">{{ department.id === 'FIN' ? 'Accounting' : department.en }}</option>
              }
            </select>
          </label>
          <label>Role
            <select [value]="selectedRole()" (change)="selectRole($event)" [disabled]="loading()">
              @for (role of roles; track role) { <option [value]="role">{{ role }}</option> }
            </select>
          </label>
          <label>Language
            <select [value]="language()" (change)="selectLanguage($event)">
              <option value="en">English</option><option value="vi">Tiếng Việt</option>
            </select>
          </label>
        </div>
      </header>

      @if (loading()) {
        <div class="state-card" role="status">Loading the secure workspace…</div>
      } @else if (error()) {
        <div class="state-card error" role="alert">{{ error() }} <button class="button secondary" type="button" (click)="load()">Retry</button></div>
      } @else {
        <div class="identity-banner">
          <span class="status-chip neutral">Server-resolved identity</span>
          <strong>{{ activeUser()?.name }}</strong>
          <small>{{ activeUser()?.role }} · {{ activeUser()?.displayDepartment }} · {{ activeUser()?.businessUnitName }}</small>
          <span class="memory-status">{{ threads().length }} remembered thread{{ threads().length === 1 ? '' : 's' }}</span>
        </div>

        <div class="secure-workspace-grid">
          <section class="scope-card secure-conversation">
            <div class="conversation-scroll">
              @if (history(); as thread) {
                <div class="sticky-history">
                  <span class="eyebrow">Remembered for {{ activeUser()?.name }}</span>
                  @for (message of thread.messages; track message.id) {
                    <div class="history-message" [class.assistant]="message.role !== 'user'">
                      <strong>{{ message.role === 'user' ? 'You' : 'Knowledge AI' }}</strong><p>{{ message.content }}</p>
                    </div>
                  }
                </div>
              }

              @if (!response() && !history()) {
                <div class="secure-empty">
                  <span class="chat-orb">✦</span>
                  <h2>Ask a property-accounting question</h2>
                  <p>Use the portfolio question to compare role-scoped depth, then prove that the M&A source is invisible to an Employee.</p>
                  <div class="suggestion-list">
                    @for (question of suggestedQuestions(); track question.questionEn) {
                      <button type="button" (click)="useQuestion(question)">{{ questionText(question) }}</button>
                    }
                  </div>
                </div>
              }

              @if (response(); as result) {
                <article class="secure-answer" [class.denied-answer]="result.state === 'permission_refusal'">
                  <span class="status-chip" [class.allowed]="result.state === 'answered'" [class.denied]="result.state !== 'answered'">
                    {{ result.state === 'answered' ? 'Authorized answer' : 'Permission-safe refusal' }}
                  </span>
                  <h2>{{ lastQuestion() }}</h2><p>{{ result.answer }}</p>
                  @if (result.citation; as citation) {
                    <div class="citation-card"><span>Authorized citation</span><strong>{{ citation.sourceId }} · {{ citation.title }}</strong><small>{{ citation.permissionClass }} · {{ citation.departmentId }} · {{ citation.subsidiaryId }}</small></div>
                  } @else if (result.state === 'permission_refusal') {
                    <div class="redaction-proof"><strong>Protected source is provably invisible</strong><span>No source ID · no title · no snippet · no citation</span></div>
                  }
                </article>
              }
            </div>

            <form class="secure-composer" (submit)="submit(); $event.preventDefault()">
              <textarea [formControl]="questionControl" rows="2" placeholder="Ask the property-management knowledge base…" aria-label="Enterprise question"></textarea>
              <button class="button primary" type="submit" [disabled]="questionControl.invalid || sending()">{{ sending() ? 'Checking policy…' : 'Ask securely' }}</button>
            </form>
          </section>

          <aside class="scope-card enforcement-panel">
            <span class="eyebrow">Live enforcement proof</span>
            @if (response(); as result) {
              <dl>
                <dt>Canonical user</dt><dd>{{ result.trace.user.id }} · {{ result.trace.user.role }} · {{ result.trace.user.department }}</dd>
                <dt>Target</dt><dd>{{ result.trace.document ? result.trace.document.id + ' · ' + result.trace.document.classification : 'Protected source redacted' }}</dd>
                <dt>Rule</dt><dd>{{ result.trace.rule }}</dd>
                <dt>Enforcement</dt><dd>{{ result.trace.proof.retrievalFilter }}</dd>
                <dt>Authorized chunks</dt><dd>{{ result.trace.proof.authorizedChunks }}</dd>
                <dt>Restricted → model</dt><dd>{{ result.trace.proof.restrictedContextSentToModel }}</dd>
                <dt>Decision</dt><dd><span class="status-chip" [class.allowed]="result.trace.decision === 'allow'" [class.denied]="result.trace.decision === 'deny'">{{ result.trace.decision }}</span></dd>
              </dl>

              <h3>Same question · Employee vs Executive</h3>
              @if (comparison(); as rows) {
                <div class="persona-comparison">
                  @for (row of rows.results; track row.user.id) {
                    <div><span><strong>{{ row.user.role }}</strong><small>{{ row.user.displayDepartment }}</small></span><b [class.allow]="row.response.state === 'answered'">{{ row.response.state === 'answered' ? 'allow' : 'deny' }}</b></div>
                  }
                </div>
              } @else { <p class="muted-copy">Ask a question to generate the side-by-side proof.</p> }

              @if (threads().length) {
                <h3 class="history-heading">Sticky per-user history</h3>
                <div class="thread-list">
                  @for (thread of threads(); track thread.id) {
                    <button type="button" (click)="openThread(thread)"><strong>{{ thread.title }}</strong><small>{{ thread.messageCount }} messages · {{ thread.preview }}</small></button>
                  }
                </div>
              }
            } @else {
              <div class="trace-placeholder"><span>◇</span><p>The canonical principal, SQL pre-filter, decision, and zero-leak proof will appear here.</p></div>
            }
          </aside>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecureAskPage implements OnInit {
  private readonly api = inject(ApiService)
  private readonly destroyRef = inject(DestroyRef)
  protected readonly roles: TascoRole[] = ['Employee', 'Manager', 'Director', 'Executive']
  protected readonly world = signal<TascoWorkspaceBootstrap | null>(null)
  protected readonly selectedDepartment = signal<TascoDepartmentId>('FIN')
  protected readonly selectedRole = signal<TascoRole>('Employee')
  protected readonly language = signal<'en' | 'vi'>('en')
  protected readonly response = signal<TascoAskResponse | null>(null)
  protected readonly comparison = signal<KnowledgeByRoleAskResponse | null>(null)
  protected readonly threads = signal<TascoThreadSummary[]>([])
  protected readonly history = signal<TascoThreadResponse | null>(null)
  protected readonly activeThreadId = signal<string | undefined>(undefined)
  protected readonly loading = signal(true)
  protected readonly sending = signal(false)
  protected readonly error = signal('')
  protected readonly lastQuestion = signal('')
  protected readonly questionControl = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(2000)] })
  protected readonly selectedUserId = computed(() => `PM-${this.selectedDepartment()}-${this.selectedRole() === 'Employee' ? 'EMP' : this.selectedRole() === 'Manager' ? 'MGR' : this.selectedRole() === 'Director' ? 'DIR' : 'EXEC'}`)
  protected readonly activeUser = computed(() => this.world()?.personas.find((user) => user.id === this.selectedUserId()) ?? null)
  protected readonly suggestedQuestions = computed(() => {
    const questions = this.world()?.questions ?? []
    const wanted = ['What is the property month-end close sequence?', 'How is the property portfolio performing this month?', 'What property acquisition or M&A targets are under review?']
    return wanted.flatMap((text) => questions.find((question) => question.questionEn === text) ?? [])
  })

  ngOnInit(): void { this.load() }

  protected load(): void {
    this.loading.set(true); this.error.set('')
    forkJoin({ world: this.api.knowledgeWorld(), meta: this.api.knowledgeMeta() }).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false))
    ).subscribe({ next: ({ world }) => { this.world.set(world); this.loadThreads() }, error: (error: unknown) => this.error.set(this.api.message(error)) })
  }

  protected selectDepartment(event: Event): void { this.selectedDepartment.set((event.target as HTMLSelectElement).value as TascoDepartmentId); this.identityChanged() }
  protected selectRole(event: Event): void { this.selectedRole.set((event.target as HTMLSelectElement).value as TascoRole); this.identityChanged() }
  protected selectLanguage(event: Event): void { this.language.set((event.target as HTMLSelectElement).value === 'vi' ? 'vi' : 'en') }
  protected useQuestion(question: TascoQuestionPrompt): void { this.questionControl.setValue(this.questionText(question)); this.submit() }
  protected questionText(question: TascoQuestionPrompt): string { return this.language() === 'vi' ? question.questionVi : question.questionEn }

  protected submit(): void {
    const question = this.questionControl.value.trim()
    if (!question || this.sending()) return
    this.sending.set(true); this.error.set(''); this.lastQuestion.set(question); this.response.set(null); this.comparison.set(null)
    this.api.secureAsk({ userId: this.selectedUserId(), question, language: this.language(), threadId: this.activeThreadId() }).pipe(
      takeUntilDestroyed(this.destroyRef), finalize(() => this.sending.set(false))
    ).subscribe({
      next: (response) => {
        this.response.set(response); this.activeThreadId.set(response.threadId); this.loadThreads(response.threadId)
        this.api.secureAskByRole(this.selectedUserId(), question, this.language()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (comparison) => this.comparison.set(comparison), error: () => this.comparison.set(null) })
      },
      error: (error: unknown) => this.error.set(this.api.message(error)),
    })
  }

  protected openThread(thread: TascoThreadSummary): void { this.activeThreadId.set(thread.id); this.loadThread(thread.id) }

  private identityChanged(): void { this.response.set(null); this.comparison.set(null); this.history.set(null); this.activeThreadId.set(undefined); this.loadThreads() }

  private loadThreads(preferredThreadId?: string): void {
    this.api.knowledgeThreads(this.selectedUserId()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (threads) => {
        this.threads.set(threads)
        const threadId = preferredThreadId ?? threads[0]?.id
        this.activeThreadId.set(threadId)
        if (threadId) this.loadThread(threadId); else this.history.set(null)
      },
      error: () => { this.threads.set([]); this.history.set(null) },
    })
  }

  private loadThread(threadId: string): void {
    this.api.knowledgeThread(this.selectedUserId(), threadId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: (thread) => this.history.set(thread), error: () => this.history.set(null) })
  }
}
