import { ChangeDetectionStrategy, Component } from '@angular/core'

@Component({
  standalone: true,
  template: `
    <section class="page customization-page">
      <header class="page-header compact-header">
        <div>
          <span class="eyebrow">Policy model</span>
          <h1>Access Rules</h1>
          <p>A small deny-by-default policy surface keeps the proof understandable to judges and testable by the evaluation harness.</p>
        </div>
      </header>

      <article class="scope-card table-card">
        <div class="section-heading">
          <div><span class="eyebrow">Permission matrix</span><h2>Classification rules</h2></div>
          <span class="status-chip neutral">Pre-retrieval enforcement</span>
        </div>

        <div class="table-scroll">
          <table class="policy-table">
            <thead><tr><th>Classification</th><th>Who can access</th><th>Additional boundary</th></tr></thead>
            <tbody>
              <tr><td><span class="classification public">Public</span></td><td>Everyone</td><td>Same subsidiary</td></tr>
              <tr><td><span class="classification internal">Internal</span></td><td>All employees</td><td>Same subsidiary</td></tr>
              <tr><td><span class="classification confidential">Confidential</span></td><td>Owning department or Executive</td><td>Same subsidiary</td></tr>
              <tr><td><span class="classification restricted">Restricted</span></td><td>Executive only</td><td>Same subsidiary</td></tr>
            </tbody>
          </table>
        </div>
      </article>

      <div class="customization-grid compact-grid">
        <article class="scope-card"><span class="eyebrow">Identity</span><h2>Server-resolved</h2><p>Client-provided role, department, and subsidiary claims are discarded.</p></article>
        <article class="scope-card"><span class="eyebrow">Isolation</span><h2>Subsidiary-scoped</h2><p>Cross-subsidiary sources are denied even when their text is nearly identical.</p></article>
        <article class="scope-card"><span class="eyebrow">Fallback</span><h2>Deny by default</h2><p>Unknown classifications and incomplete principals cannot enter retrieval.</p></article>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessRulesPage {}
