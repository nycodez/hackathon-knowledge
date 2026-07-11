import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { RouterLink } from '@angular/router'
import { deptId, type TascoClassification, type TascoRuntimeMeta, type TascoWorkspaceBootstrap } from '@hackathon/shared'
import { finalize, forkJoin } from 'rxjs'
import { ApiService, type KnowledgeEvalRun } from '../core/api.service'

const classifications: TascoClassification[] = ['Public', 'Internal', 'Confidential', 'Restricted']

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page page-home customization-page">
      <header class="page-header hero-header">
        <div>
          <span class="eyebrow">My Tasco · Automotive Distribution Accounting</span>
          <h1>The right accounting answer for the person asking.</h1>
          <p>Real sponsor identities and evaluation data meet a focused automotive-distribution demo: fast grounded answers, department-aware depth, sticky memory, and provably invisible Restricted knowledge.</p>
        </div>
        <a class="button primary" routerLink="/secure-ask">Try Secure Ask <span aria-hidden="true">→</span></a>
      </header>

      @if (loading()) {
        <div class="state-card" role="status">Loading enterprise knowledge signals…</div>
      } @else if (error()) {
        <div class="state-card error" role="alert">{{ error() }} <button class="button secondary" type="button" (click)="load()">Retry</button></div>
      } @else {
        <div class="metric-grid">
          <article class="metric-card"><span>Knowledge sources</span><strong>{{ meta()?.counts?.documents ?? 0 }}</strong><small>{{ meta()?.counts?.chunks ?? 0 }} permission-scoped chunks</small></article>
          <article class="metric-card"><span>Sponsor identities</span><strong>{{ meta()?.counts?.users ?? 0 }}</strong><small>Real Users sheet · never client-asserted roles</small></article>
          <article class="metric-card"><span>Permission gates</span><strong>{{ permissionScore() }}</strong><small>{{ permissionDetail() }}</small></article>
          <article class="metric-card"><span>Latest evaluation</span><strong>{{ evaluationScore() }}</strong><small>{{ evaluationDetail() }}</small></article>
        </div>

        <div class="home-widget-grid">
          <article class="scope-card featured-card permission-widget">
            <div class="section-heading">
              <div><span class="eyebrow">Permission boundary</span><h2>Same question, different authorization</h2></div>
              <span class="status-chip neutral">SQL pre-filter</span>
            </div>
            <p>Ask how the dealer network is performing and compare the Accounting Employee view with the deeper Executive view—both grounded in only the sources each identity may retrieve.</p>
            <div class="outcome-pair">
              <div><span class="status-chip neutral">Employee</span><strong>Accounting view</strong><small>Vehicle deliveries, collections, margin, and dealer receivables</small></div>
              <div><span class="status-chip allowed">Executive</span><strong>Deeper network view</strong><small>Authorized Restricted context and citation</small></div>
            </div>
            <a class="button primary widget-action" routerLink="/secure-ask">Run the comparison</a>
          </article>

          <article class="scope-card">
            <div class="section-heading">
              <div><span class="eyebrow">Employee discoverability</span><h2>Visible classification mix</h2></div>
              <span class="status-chip neutral">{{ world()?.documents?.length ?? 0 }} discoverable sources</span>
            </div>
            <div class="classification-widget">
              @for (item of classificationSummary(); track item.name) {
                <div>
                  <span class="classification" [class.public]="item.name === 'Public'" [class.internal]="item.name === 'Internal'" [class.confidential]="item.name === 'Confidential'" [class.restricted]="item.name === 'Restricted'">{{ item.name }}</span>
                  <strong>{{ item.count }}</strong>
                </div>
              }
            </div>
            <a class="text-link" routerLink="/evaluation">Inspect the policy evidence <span aria-hidden="true">→</span></a>
          </article>

          <article class="scope-card runtime-widget">
            <div class="section-heading">
              <div><span class="eyebrow">Runtime profile</span><h2>Ready for a live demo</h2></div>
              <span class="status-chip allowed">Database-backed</span>
            </div>
            <dl>
              <div><dt>PostgreSQL source</dt><dd>{{ meta()?.source ?? '—' }}</dd></div>
              <div><dt>Answerer</dt><dd>{{ meta()?.llm ?? '—' }}</dd></div>
              <div><dt>Retrieval index</dt><dd>{{ meta()?.embeddings ?? '—' }}</dd></div>
              <div><dt>Knowledge graph</dt><dd>{{ meta()?.counts?.kgNodes ?? 0 }} nodes · {{ meta()?.counts?.kgEdges ?? 0 }} edges</dd></div>
            </dl>
            <a class="text-link" routerLink="/evaluation">View evaluation evidence <span aria-hidden="true">→</span></a>
          </article>
        </div>

        <article class="scope-card table-card department-directory">
          <div class="section-heading">
            <div><span class="eyebrow">Demo identity matrix</span><h2>Automotive-distribution roles by department</h2></div>
            <span class="status-chip neutral">{{ departmentRoster().length }} departments · {{ world()?.personas?.length ?? 0 }} personas</span>
          </div>
          <div class="table-scroll">
            <table class="policy-table department-table">
              <thead><tr><th>Department</th><th>Vietnamese</th><th>Knowledge space</th><th>Users</th><th>Subsidiary coverage</th></tr></thead>
              <tbody>
                @for (department of departmentRoster(); track department.id) {
                  <tr>
                    <td><span class="department-code">{{ department.id }}</span><strong>{{ department.en }}</strong></td>
                    <td>{{ department.vi }}</td>
                    <td><span class="status-chip neutral">{{ department.knowledgeSpace ?? 'Department Knowledge' }}</span></td>
                    <td>
                      <div class="department-user-list">
                        @for (user of department.users; track user.id) {
                          <span class="department-user"><strong>{{ user.name }}</strong><small>{{ user.id }} · {{ user.role }}</small></span>
                        } @empty {
                          <span class="muted-copy">No assigned users</span>
                        }
                      </div>
                    </td>
                    <td>{{ department.subsidiaries.join(', ') || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </article>

        <div class="home-action-grid" aria-label="Enterprise knowledge tools">
          <a class="home-action-card" routerLink="/secure-ask"><span>◇</span><div><strong>Secure Ask</strong><small>Compare answers across canonical personas.</small></div><b>→</b></a>
          <a class="home-action-card" routerLink="/secure-ask"><span>⌾</span><div><strong>Sticky Memory</strong><small>Switch identities and resume their own question history.</small></div><b>→</b></a>
          <a class="home-action-card" routerLink="/evaluation"><span>✓</span><div><strong>Evaluation</strong><small>Review permission, retrieval, and leak gates.</small></div><b>→</b></a>
        </div>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit {
  private readonly api = inject(ApiService)
  private readonly destroyRef = inject(DestroyRef)
  protected readonly loading = signal(true)
  protected readonly error = signal('')
  protected readonly meta = signal<TascoRuntimeMeta | null>(null)
  protected readonly world = signal<TascoWorkspaceBootstrap | null>(null)
  protected readonly latest = signal<KnowledgeEvalRun | null>(null)
  protected readonly classificationSummary = computed(() => classifications.map((name) => ({
    name,
    count: this.world()?.documents.filter((document) => document.classification === name).length ?? 0,
  })))
  protected readonly departmentRoster = computed(() => (this.world()?.departments ?? []).map((department) => {
    const users = (this.world()?.personas ?? []).filter((user) => deptId(user.department) === department.id)
    return {
      ...department,
      users,
      subsidiaries: [...new Set(users.map((user) => user.subsidiaryId))].sort(),
    }
  }))
  protected readonly evaluationScore = computed(() => {
    const run = this.latest()
    return run ? `${run.score}/${run.total}` : 'Not run'
  })
  protected readonly evaluationDetail = computed(() => {
    const run = this.latest()
    return run ? `${run.leaks} unauthorized leaks · ${run.status}` : 'Run the evidence gates'
  })
  protected readonly permissionScore = computed(() => {
    const cases = this.latest()?.report?.caseResults
    return cases ? `${cases.filter((item) => item.passed).length}/${cases.length}` : `${this.meta()?.counts.permissionCases ?? 0}`
  })
  protected readonly permissionDetail = computed(() => this.latest()?.report ? 'Latest persisted evaluation' : 'Deny-by-default cases configured')

  ngOnInit(): void {
    this.load()
  }

  protected load(): void {
    this.loading.set(true)
    this.error.set('')
    forkJoin({
      meta: this.api.knowledgeMeta(),
      world: this.api.knowledgeWorld(),
      latest: this.api.latestKnowledgeEval(),
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: ({ meta, world, latest }) => {
        this.meta.set(meta)
        this.world.set(world)
        this.latest.set(latest?.report?.caseResults.some((item) => item.id.startsWith('AUT')) ? latest : null)
      },
      error: (error: unknown) => this.error.set(this.api.message(error)),
    })
  }
}
