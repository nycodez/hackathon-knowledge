import { provideHttpClient } from '@angular/common/http'
import { type ApplicationConfig } from '@angular/core'
import { provideRouter, withComponentInputBinding, type Routes } from '@angular/router'

const routes: Routes = [
  { path: '', title: 'Home · Knowledge Workspace', loadComponent: () => import('./pages/home.page').then((module) => module.HomePage) },
  { path: 'secure-ask', title: 'Secure Ask · Hackathon Knowledge', loadComponent: () => import('./pages/secure-ask.page').then((module) => module.SecureAskPage) },
  { path: 'evaluation', title: 'Evaluation · Hackathon Knowledge', loadComponent: () => import('./pages/evaluation.page').then((module) => module.EvaluationPage) },
  { path: 'query', redirectTo: 'secure-ask', pathMatch: 'full' },
  { path: 'query/:conversationId', redirectTo: 'secure-ask' },
  { path: 'results', redirectTo: 'secure-ask', pathMatch: 'full' },
  { path: 'library', redirectTo: 'secure-ask', pathMatch: 'full' },
  { path: 'access-rules', redirectTo: 'evaluation', pathMatch: 'full' },
  { path: 'files', redirectTo: 'secure-ask', pathMatch: 'full' },
  { path: '**', redirectTo: '' },
]

export const appConfig: ApplicationConfig = {
  providers: [provideHttpClient(), provideRouter(routes, withComponentInputBinding())],
}
