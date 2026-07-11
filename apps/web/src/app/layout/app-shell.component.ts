import { ChangeDetectionStrategy, Component } from '@angular/core'
import { RouterLink, RouterLinkActive, RouterOutlet, type IsActiveMatchOptions } from '@angular/router'

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
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="routeMatch">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z"/></svg>
            <span class="nav-label">Home</span>
          </a>
          <a routerLink="/secure-ask" routerLinkActive="active" [routerLinkActiveOptions]="routeMatch">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.3-4.3m2.3-5.2a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z"/><path d="M11.5 7.8v7.4M7.8 11.5h7.4"/></svg>
            <span class="nav-label">Ask</span>
          </a>
          <a routerLink="/evaluation" routerLinkActive="active" [routerLinkActiveOptions]="routeMatch">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3 4.5 6v5.3c0 4.5 3.1 8.6 7.5 9.7 4.4-1.1 7.5-5.2 7.5-9.7V6L12 3Z"/><path d="m8.6 12 2.2 2.2 4.7-4.7"/></svg>
            <span class="nav-label">Evidence</span>
          </a>
        </nav>

        <div class="sidebar-foot">
          <span class="status-dot"></span>
          <span><strong>Automotive Accounting</strong><small>Neon + pgvector</small></span>
        </div>
      </aside>

      <main class="main-content">
        <router-outlet />
      </main>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  protected readonly routeMatch: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  }
}
