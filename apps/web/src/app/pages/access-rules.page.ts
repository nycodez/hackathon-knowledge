import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import type { TascoDocumentDetailResponse, TascoWorkspaceBootstrap } from '@hackathon/shared'
import { finalize } from 'rxjs'
import { ApiService } from '../core/api.service'

@Component({
  standalone: true,
  template: `
    <section class="page customization-page">
      <header class="page-header compact-header">
        <div>
          <span class="eyebrow">Policy model</span>
          <h1>Access Rules</h1>
          <p>Inspect the deny-by-default policy and replay a server-side access decision for any seeded persona and source.</p>
        </div>
      </header>

      <article class="scope-card table-card">
        <div class="section-heading">
          <div><span class="eyebrow">Permission matrix</span><h2>Classification rules</h2></div>
          <span class="status-chip neutral">SQL pre-filter</span>
        </div>
        <div class="table-scroll">
          <table class="policy-table">
            <thead><tr><th>Classification</th><th>Who can access</th><th>Required boundary</th></tr></thead>
            <tbody>
              <tr><td><span class="classification public">Public</span></td><td>All canonical users</td><td>Same subsidiary</td></tr>
              <tr><td><span class="classification internal">Internal</span></td><td>All employees</td><td>Same subsidiary</td></tr>
              <tr><td><span class="classification confidential">Confidential</span></td><td>Owning department or Executive</td><td>Same subsidiary</td></tr>
              <tr><td><span class="classification restricted">Restricted</span></td><td>Executive only</td><td>Same subsidiary</td></tr>
            </tbody>
          </table>
        </div>
      </article>

      <article class="scope-card decision-replay-card">
        <div class="section-heading">
          <div><span class="eyebrow">Live decision replay</span><h2>Test a canonical principal</h2></div>
          @if (detail(); as result) {
            <span class="status-chip" [class.allowed]="result.decision === 'allow'" [class.denied]="result.decision === 'deny'">{{ result.decision }}</span>
          }
        </div>

        @if (loading()) {
          <div class="state-card" role="status">Loading policy data…</div>
        } @else if (error()) {
          <div class="state-card error" role="alert">{{ error() }} <button class="button secondary" type="button" (click)="load()">Retry</button></div>
        } @else {
          <div class="decision-controls">
            <label>Persona
              <select [value]="selectedUserId()" (change)="selectUser($event)">
                @for (user of world()?.users ?? []; track user.id) {
                  <option [value]="user.id" [selected]="user.id === selectedUserId()">{{ user.id }} · {{ user.name }} · {{ user.role }}</option>
                }
              </select>
            </label>
            <label>Knowledge source
              <select [value]="selectedDocumentId()" (change)="selectDocument($event)">
                @for (document of world()?.documents ?? []; track document.id) {
                  <option [value]="document.id" [selected]="document.id === selectedDocumentId()">{{ document.id }} · {{ document.titleEn }} · {{ document.classification }}</option>
                }
              </select>
            </label>
          </div>

          @if (decisionLoading()) {
            <div class="state-card" role="status">Resolving identity and policy…</div>
          } @else if (detail(); as result) {
            <div class="decision-evidence-grid">
              <div>
                <span class="eyebrow">Resolved identity</span>
                <strong>{{ activeUser()?.name }}</strong>
                <small>{{ activeUser()?.role }} · {{ activeUser()?.department }} · {{ activeUser()?.subsidiaryId }}</small>
              </div>
              <div>
                <span class="eyebrow">Source permission triple</span>
                <strong>{{ result.document.classification }}</strong>
                <small>{{ result.document.department }} · {{ result.document.subsidiaryId }}</small>
              </div>
              <div>
                <span class="eyebrow">Enforced rule</span>
                <strong>{{ result.trace.rule }}</strong>
                <small>{{ result.trace.enforcementPoint }}</small>
              </div>
            </div>

            @if (result.decision === 'allow') {
              <div class="info-banner allowed-banner">The source passed the SQL pre-filter. Only its authorized chunk may proceed to ranking and answer construction.</div>
            } @else {
              <div class="info-banner denied-banner">{{ result.deniedReason ?? 'The source was excluded before retrieval and cannot enter model context.' }}</div>
            }

            <div class="access-matrix-list">
              <h3>Same source by canonical persona</h3>
              @for (row of result.accessMatrix ?? []; track row.user.id) {
                <div><span><strong>{{ row.user.role }}</strong><small>{{ row.user.department }} · {{ row.user.subsidiaryId }}</small></span><b [class.allow]="row.decision === 'allow'">{{ row.decision }}</b></div>
              }
            </div>
          }
        }
      </article>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessRulesPage implements OnInit {
  private readonly api = inject(ApiService)
  private readonly destroyRef = inject(DestroyRef)
  protected readonly world = signal<TascoWorkspaceBootstrap | null>(null)
  protected readonly detail = signal<TascoDocumentDetailResponse | null>(null)
  protected readonly selectedUserId = signal('U001')
  protected readonly selectedDocumentId = signal('DOC036')
  protected readonly loading = signal(true)
  protected readonly decisionLoading = signal(false)
  protected readonly error = signal('')
  protected readonly activeUser = computed(() => this.world()?.users.find((user) => user.id === this.selectedUserId()) ?? null)

  ngOnInit(): void {
    this.load()
  }

  protected load(): void {
    this.loading.set(true)
    this.error.set('')
    this.api.knowledgeWorld().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (world) => {
        this.world.set(world)
        if (!world.users.some((user) => user.id === this.selectedUserId())) this.selectedUserId.set(world.personaIds[0] ?? world.users[0]?.id ?? '')
        if (!world.documents.some((document) => document.id === this.selectedDocumentId())) this.selectedDocumentId.set(world.documents[0]?.id ?? '')
        this.resolveDecision()
      },
      error: (error: unknown) => this.error.set(this.api.message(error)),
    })
  }

  protected selectUser(event: Event): void {
    this.selectedUserId.set((event.target as HTMLSelectElement).value)
    this.resolveDecision()
  }

  protected selectDocument(event: Event): void {
    this.selectedDocumentId.set((event.target as HTMLSelectElement).value)
    this.resolveDecision()
  }

  private resolveDecision(): void {
    if (!this.selectedUserId() || !this.selectedDocumentId()) return
    this.decisionLoading.set(true)
    this.detail.set(null)
    this.api.knowledgeDocumentDetail(this.selectedUserId(), this.selectedDocumentId(), 'en').pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.decisionLoading.set(false))
    ).subscribe({
      next: (detail) => this.detail.set(detail),
      error: (error: unknown) => this.error.set(this.api.message(error)),
    })
  }
}
