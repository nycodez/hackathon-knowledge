import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import type { TascoAskResponse, TascoQuestionPrompt, TascoWorkspaceBootstrap } from '@hackathon/shared'
import { finalize, forkJoin } from 'rxjs'
import { ApiService, type KnowledgeByRoleAskResponse } from '../core/api.service'

@Component({
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="page customization-page secure-ask-page">
      <header class="page-header compact-header">
        <div>
          <span class="eyebrow">Enterprise knowledge PoC</span>
          <h1>Secure Ask</h1>
          <p>The API resolves the selected identity, filters unauthorized chunks in SQL, and sends only authorized context to the answerer.</p>
        </div>
        <div class="knowledge-controls" aria-label="Knowledge scope">
          <label>Persona
            <select [value]="selectedUserId()" (change)="selectUser($event)" [disabled]="loading()">
              @for (user of world()?.users ?? []; track user.id) {
                <option [value]="user.id" [selected]="user.id === selectedUserId()">{{ user.name }} · {{ user.role }}</option>
              }
            </select>
          </label>
          <label>Language
            <select [value]="language()" (change)="selectLanguage($event)">
              <option value="en" [selected]="language() === 'en'">English</option>
              <option value="vi" [selected]="language() === 'vi'">Tiếng Việt</option>
            </select>
          </label>
        </div>
      </header>

      @if (loading()) {
        <div class="state-card" role="status">Loading the secure knowledge workspace…</div>
      } @else if (error()) {
        <div class="state-card error" role="alert">{{ error() }} <button class="button secondary" type="button" (click)="load()">Retry</button></div>
      } @else {
        <div class="identity-banner">
          <span class="status-chip neutral">Server-resolved identity</span>
          <strong>{{ activeUser()?.name }}</strong>
          <small>{{ activeUser()?.role }} · {{ activeUser()?.department }} · {{ activeUser()?.subsidiaryId }}</small>
        </div>

        <div class="secure-workspace-grid">
          <section class="scope-card secure-conversation">
            @if (!response()) {
              <div class="secure-empty">
                <span class="chat-orb">✦</span>
                <h2>Ask an enterprise question</h2>
                <p>Try the same restricted question under different personas to verify that policy is enforced before retrieval.</p>
                <div class="suggestion-list">
                  @for (question of suggestedQuestions(); track question.documentId) {
                    <button type="button" (click)="useQuestion(question)">{{ questionText(question) }}</button>
                  }
                </div>
              </div>
            } @else if (response(); as result) {
              <article class="secure-answer" [class.denied-answer]="result.state === 'permission_refusal'">
                <span class="status-chip" [class.allowed]="result.state === 'answered'" [class.denied]="result.state !== 'answered'">
                  {{ result.state === 'answered' ? 'Authorized answer' : result.state.replace('_', ' ') }}
                </span>
                <h2>{{ lastQuestion() }}</h2>
                <p>{{ result.answer }}</p>
                @if (result.citation; as citation) {
                  <div class="citation-card">
                    <span>Authorized citation</span>
                    <strong>{{ citation.sourceId }} · {{ citation.title }}</strong>
                    <small>{{ citation.permissionClass }} · {{ citation.departmentId }} · {{ citation.subsidiaryId }}</small>
                  </div>
                }
              </article>
            }

            <form class="secure-composer" (submit)="submit(); $event.preventDefault()">
              <textarea [formControl]="questionControl" rows="2" placeholder="Ask the enterprise knowledge base…" aria-label="Enterprise question"></textarea>
              <button class="button primary" type="submit" [disabled]="questionControl.invalid || sending()">
                {{ sending() ? 'Checking policy…' : 'Ask securely' }}
              </button>
            </form>
          </section>

          <aside class="scope-card enforcement-panel">
            <span class="eyebrow">Enforcement trace</span>
            @if (response(); as result) {
              <dl>
                <dt>Canonical user</dt><dd>{{ result.trace.user.id }} · {{ result.trace.user.role }}</dd>
                <dt>Target source</dt><dd>{{ result.trace.document.id }} · {{ result.trace.document.classification }}</dd>
                <dt>Rule</dt><dd>{{ result.trace.rule }}</dd>
                <dt>Enforcement</dt><dd>{{ result.trace.enforcementPoint }}</dd>
                <dt>Decision</dt><dd><span class="status-chip" [class.allowed]="result.trace.decision === 'allow'" [class.denied]="result.trace.decision === 'deny'">{{ result.trace.decision }}</span></dd>
              </dl>

              <h3>Same question by persona</h3>
              @if (comparison(); as rows) {
                <div class="persona-comparison">
                  @for (row of rows.results; track row.user.id) {
                    <div><span><strong>{{ row.user.role }}</strong><small>{{ row.user.department }}</small></span><b [class.allow]="row.response.state === 'answered'">{{ row.response.state === 'answered' ? 'allow' : 'deny' }}</b></div>
                  }
                </div>
              } @else {
                <p class="muted-copy">Comparison evidence is loading…</p>
              }
            } @else {
              <div class="trace-placeholder"><span>◇</span><p>The resolved principal, target source, policy rule, and decision will appear here.</p></div>
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
  protected readonly world = signal<TascoWorkspaceBootstrap | null>(null)
  protected readonly selectedUserId = signal('U001')
  protected readonly language = signal<'en' | 'vi'>('en')
  protected readonly response = signal<TascoAskResponse | null>(null)
  protected readonly comparison = signal<KnowledgeByRoleAskResponse | null>(null)
  protected readonly loading = signal(true)
  protected readonly sending = signal(false)
  protected readonly error = signal('')
  protected readonly lastQuestion = signal('')
  protected readonly questionControl = new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(2000)] })
  protected readonly activeUser = computed(() => this.world()?.users.find((user) => user.id === this.selectedUserId()) ?? null)
  protected readonly suggestedQuestions = computed(() => {
    const questions = this.world()?.questions ?? []
    const restricted = questions.filter((question) => this.world()?.documents.find((document) => document.id === question.documentId)?.classification === 'Restricted')
    return [...restricted.slice(0, 1), ...questions.filter((question) => !restricted.includes(question)).slice(0, 2)]
  })

  ngOnInit(): void {
    this.load()
  }

  protected load(): void {
    this.loading.set(true)
    this.error.set('')
    forkJoin({ world: this.api.knowledgeWorld(), meta: this.api.knowledgeMeta() }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: ({ world }) => {
        this.world.set(world)
        if (!world.users.some((user) => user.id === this.selectedUserId())) this.selectedUserId.set(world.personaIds[0] ?? world.users[0]?.id ?? '')
      },
      error: (error: unknown) => this.error.set(this.api.message(error)),
    })
  }

  protected selectUser(event: Event): void {
    this.selectedUserId.set((event.target as HTMLSelectElement).value)
    this.response.set(null)
    this.comparison.set(null)
  }

  protected selectLanguage(event: Event): void {
    this.language.set((event.target as HTMLSelectElement).value === 'vi' ? 'vi' : 'en')
  }

  protected useQuestion(question: TascoQuestionPrompt): void {
    this.questionControl.setValue(this.questionText(question))
    this.submit()
  }

  protected questionText(question: TascoQuestionPrompt): string {
    return this.language() === 'vi' ? question.questionVi : question.questionEn
  }

  protected submit(): void {
    const question = this.questionControl.value.trim()
    if (!question || this.sending()) return
    this.sending.set(true)
    this.error.set('')
    this.lastQuestion.set(question)
    this.response.set(null)
    this.comparison.set(null)

    this.api.secureAsk({ userId: this.selectedUserId(), question, language: this.language() }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.sending.set(false))
    ).subscribe({
      next: (response) => {
        this.response.set(response)
        this.api.secureAskByRole(question, this.language()).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (comparison) => this.comparison.set(comparison),
          error: () => this.comparison.set(null),
        })
      },
      error: (error: unknown) => this.error.set(this.api.message(error)),
    })
  }
}
