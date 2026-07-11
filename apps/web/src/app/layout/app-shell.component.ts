import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" routerLink="/" aria-label="Hackathon Knowledge home">
          <span class="brand-mark">H</span>
          <span class="brand-copy"><strong>Hackathon</strong><small>Knowledge</small></span>
        </a>

        <nav aria-label="Primary navigation">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
            <span aria-hidden="true">⌂</span> Home
          </a>
          <a routerLink="/query" routerLinkActive="active">
            <span aria-hidden="true">◌</span> Query
          </a>
          <a routerLink="/results" routerLinkActive="active">
            <span aria-hidden="true">◫</span> Results
          </a>
          <a routerLink="/library" routerLinkActive="active">
            <span aria-hidden="true">▱</span> Library
          </a>

          <hr class="nav-divider" />

          <a routerLink="/secure-ask" routerLinkActive="active">
            <span aria-hidden="true">◇</span> Secure Ask
          </a>
          <a routerLink="/access-rules" routerLinkActive="active">
            <span aria-hidden="true">⌾</span> Access Rules
          </a>
          <a routerLink="/evaluation" routerLinkActive="active">
            <span aria-hidden="true">✓</span> Evaluation
          </a>
        </nav>

        <div class="sidebar-foot">
          <span class="status-dot"></span>
          <span><strong>Demo workspace</strong><small>Neon + pgvector</small></span>
        </div>
      </aside>

      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {}
