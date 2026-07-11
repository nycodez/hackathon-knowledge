import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink } from '@angular/router'

@Component({
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="page customization-page">
      <header class="page-header compact-header">
        <div>
          <span class="eyebrow">Enterprise knowledge PoC</span>
          <h1>Secure Ask</h1>
          <p>Prove that identity and access policy are applied before retrieval, ranking, and model context construction.</p>
        </div>
        <a class="button primary" routerLink="/query">Open query workspace</a>
      </header>

      <div class="customization-grid">
        <article class="scope-card featured-card">
          <span class="eyebrow">Killer moment</span>
          <h2>Same question, correctly different outcomes</h2>
          <p>Ask “What are the company’s strategic priorities for 2026?” first as an Employee and then as an Executive.</p>
          <div class="outcome-pair">
            <div>
              <span class="status-chip denied">Employee · denied</span>
              <p>The restricted source is excluded before retrieval and never reaches model context.</p>
            </div>
            <div>
              <span class="status-chip allowed">Executive · allowed</span>
              <p>The answer is grounded in an authorized source and includes a verifiable citation.</p>
            </div>
          </div>
        </article>

        <article class="scope-card">
          <span class="eyebrow">Request contract</span>
          <h2>Trust identity, not browser claims</h2>
          <p>The browser may select a demo user ID. Role, department, and subsidiary must be resolved by the API from server-owned records.</p>
          <ul class="check-list">
            <li>Resolve the canonical principal.</li>
            <li>Apply subsidiary and permission predicates.</li>
            <li>Rank authorized chunks only.</li>
            <li>Validate every generated citation.</li>
          </ul>
        </article>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SecureAskPage {}
