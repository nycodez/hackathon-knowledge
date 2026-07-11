import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import type { TascoEvalReport } from '@hackathon/shared'
import { finalize, forkJoin } from 'rxjs'
import { ApiService, type KnowledgeEvalRun } from '../core/api.service'

@Component({
  standalone: true,
  template: `
    <section class="page customization-page">
      <header class="page-header compact-header">
        <div>
          <span class="eyebrow">Evidence, not claims</span>
          <h1>Evaluation</h1>
          <p>Run the permission and retrieval gates through the live HTTP API and persist the resulting evidence in PostgreSQL.</p>
        </div>
        <button class="button primary" type="button" (click)="run()" [disabled]="running() || loading()">
          {{ running() ? 'Running gates…' : 'Run evaluation' }}
        </button>
      </header>

      @if (loading()) {
        <div class="state-card" role="status">Loading the latest evaluation evidence…</div>
      } @else if (error()) {
        <div class="state-card error" role="alert">{{ error() }} <button class="button secondary" type="button" (click)="load()">Retry</button></div>
      } @else if (report(); as result) {
        <div class="metric-grid evaluation-metrics">
          <article class="metric-card"><span>Public evaluation</span><strong>{{ result.score }}/{{ result.total }}</strong><small>48/{{ result.total }} minimum gate</small></article>
          <article class="metric-card"><span>Permission cases</span><strong>{{ passedCases(result) }}/{{ result.caseResults.length }}</strong><small>T1–T8 expected</small></article>
          <article class="metric-card"><span>Unauthorized leaks</span><strong>{{ result.leaks }}</strong><small>Chunks and citations</small></article>
          <article class="metric-card"><span>Restricted context</span><strong>{{ result.metrics?.restrictedContextHits ?? 0 }}</strong><small>Model-context hits</small></article>
        </div>

        @if (latest(); as run) {
          <div class="evaluation-run-meta">
            <span class="status-chip" [class.allowed]="run.status === 'passed'" [class.denied]="run.status !== 'passed'">{{ run.status }}</span>
            <span>Run {{ run.id }}</span>
            <span>{{ run.createdAt }}</span>
            <span>Git {{ run.metadata['gitSha'] ?? 'local' }}</span>
          </div>
        }

        <article class="scope-card evaluation-card">
          <div class="section-heading">
            <div><span class="eyebrow">T1–T8</span><h2>Permission cases</h2></div>
            <span class="status-chip" [class.allowed]="passedCases(result) === result.caseResults.length" [class.denied]="passedCases(result) !== result.caseResults.length">
              {{ passedCases(result) === result.caseResults.length ? 'All passing' : 'Gate failed' }}
            </span>
          </div>
          <div class="table-scroll">
            <table class="policy-table evaluation-table">
              <thead><tr><th>Case</th><th>User</th><th>Source</th><th>Expected</th><th>Actual</th><th>Result</th></tr></thead>
              <tbody>
                @for (item of result.caseResults; track item.id) {
                  <tr>
                    <td>{{ item.id }}</td>
                    <td>{{ item.user.id }} · {{ item.user.role }}</td>
                    <td>{{ item.document.id }} · {{ item.document.classification }}</td>
                    <td>{{ item.expected }}</td>
                    <td>{{ item.actual }}</td>
                    <td><span class="status-chip" [class.allowed]="item.passed" [class.denied]="!item.passed">{{ item.passed ? 'pass' : 'fail' }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </article>

        <article class="scope-card evaluation-card">
          <div class="section-heading">
            <div><span class="eyebrow">Public evaluation</span><h2>Question-by-question evidence</h2></div>
            <span class="status-chip neutral">{{ result.publicResults.length }} rows</span>
          </div>
          <div class="table-scroll public-eval-scroll">
            <table class="policy-table evaluation-table">
              <thead><tr><th>Question</th><th>User</th><th>Sources</th><th>Type</th><th>Expected</th><th>Result</th></tr></thead>
              <tbody>
                @for (item of result.publicResults; track item.questionId) {
                  <tr>
                    <td class="eval-question"><strong>{{ item.questionId }}</strong><small>{{ item.questionVi ?? item.category ?? 'Workbook evaluation prompt' }}</small></td>
                    <td>{{ item.user.id }}</td>
                    <td>{{ sourceIds(item) }}</td>
                    <td>{{ item.answerType }}</td>
                    <td>{{ item.expected }}</td>
                    <td><span class="status-chip" [class.allowed]="item.passed && !item.leak" [class.denied]="!item.passed || item.leak">{{ item.leak ? 'leak' : item.passed ? 'pass' : 'fail' }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </article>
      }
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluationPage implements OnInit {
  private readonly api = inject(ApiService)
  private readonly destroyRef = inject(DestroyRef)
  protected readonly report = signal<TascoEvalReport | null>(null)
  protected readonly latest = signal<KnowledgeEvalRun | null>(null)
  protected readonly loading = signal(true)
  protected readonly running = signal(false)
  protected readonly error = signal('')

  ngOnInit(): void {
    this.load()
  }

  protected load(): void {
    this.loading.set(true)
    this.error.set('')
    forkJoin({ report: this.api.knowledgeEval(), latest: this.api.latestKnowledgeEval() }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: ({ report, latest }) => {
        this.latest.set(latest)
        this.report.set(latest?.report ?? report)
      },
      error: (error: unknown) => this.error.set(this.api.message(error)),
    })
  }

  protected run(): void {
    this.running.set(true)
    this.error.set('')
    this.api.runKnowledgeEval().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.running.set(false))
    ).subscribe({
      next: (report) => {
        this.report.set(report)
        this.load()
      },
      error: (error: unknown) => this.error.set(this.api.message(error)),
    })
  }

  protected passedCases(report: TascoEvalReport): number {
    return report.caseResults.filter((item) => item.passed).length
  }

  protected sourceIds(item: TascoEvalReport['publicResults'][number]): string {
    return item.documents.map((document) => document.id).join(', ')
  }
}
