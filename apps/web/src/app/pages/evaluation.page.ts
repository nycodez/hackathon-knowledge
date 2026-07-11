import { ChangeDetectionStrategy, Component } from '@angular/core'

@Component({
  standalone: true,
  template: `
    <section class="page customization-page">
      <header class="page-header compact-header">
        <div>
          <span class="eyebrow">Evidence, not claims</span>
          <h1>Evaluation</h1>
          <p>The implementation is complete only when the same permission and retrieval rules pass through the HTTP API and persist their evidence.</p>
        </div>
      </header>

      <div class="metric-grid evaluation-metrics">
        <article class="metric-card"><span>Public evaluation</span><strong>50/50</strong><small>48/50 minimum gate</small></article>
        <article class="metric-card"><span>Permission cases</span><strong>8/8</strong><small>T1–T8 must pass</small></article>
        <article class="metric-card"><span>Unauthorized leaks</span><strong>0</strong><small>Chunks and citations</small></article>
        <article class="metric-card"><span>Restricted context</span><strong>0</strong><small>Model-context hits</small></article>
      </div>

      <article class="scope-card evaluation-card">
        <div class="section-heading">
          <div><span class="eyebrow">Required gates</span><h2>PoC acceptance checklist</h2></div>
          <span class="status-chip neutral">Implementation pending</span>
        </div>
        <ol class="evaluation-list">
          <li><span>01</span><div><strong>Permission correctness</strong><small>All seeded allow and deny cases match their expected decisions.</small></div></li>
          <li><span>02</span><div><strong>Context isolation</strong><small>Denied chunk IDs and hashes never appear in the model request.</small></div></li>
          <li><span>03</span><div><strong>Citation integrity</strong><small>Every cited source belongs to the authorized retrieval result.</small></div></li>
          <li><span>04</span><div><strong>Provider resilience</strong><small>A clearly labeled deterministic mode preserves the judged permission flow.</small></div></li>
        </ol>
      </article>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvaluationPage {}
