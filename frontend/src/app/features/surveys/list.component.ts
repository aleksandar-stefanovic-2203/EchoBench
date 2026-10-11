import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { failure, type Failure, type SurveyListItem } from '../../core/models';
import { FeedbackComponent } from '../../shared/feedback.component';
@Component({ selector: 'app-survey-list', imports: [RouterLink, DatePipe, FeedbackComponent], template: `
  <div class="heading"><div><div class="eyebrow">Your feedback workspace</div><h1>My surveys</h1><p class="muted">Listen to your attendees. Make your next event even better.</p></div><a class="button" routerLink="/surveys/new">+ New survey</a></div>
  <app-feedback [error]="error()"/>
  @if(loading()) {<p role="status">Loading surveys…</p>} @else if(error()) {<button class="secondary" (click)="load()">Try again</button>} @else if(!items().length) {<section class="card empty"><h2>Your first survey starts here.</h2><p class="muted">You have no surveys yet. Add questions and share the link with your attendees.</p><a class="button" routerLink="/surveys/new">Create your first survey</a></section>}
  <div class="survey-grid">@for(s of items(); track s.id) {<article class="card"><div><span class="badge">{{s.status === 'draft' ? 'Draft' : 'Published'}}</span></div><h2>{{s.title}}</h2><p class="muted">{{s.responseCount}} responses · {{s.createdAt | date:'MMM d, yyyy'}}</p><div class="actions"><a class="button secondary" [routerLink]="['/surveys', s.id]">View survey</a>@if(s.status === 'draft') {<a [routerLink]="['/surveys', s.id, 'edit']">Edit</a>}</div></article>}</div>` })
export class ListComponent {
  private api = inject(Api); items = signal<SurveyListItem[]>([]); loading = signal(true); error = signal<Failure | null>(null);
  constructor() { void this.load(); }
  async load() { this.loading.set(true); this.error.set(null); try { this.items.set((await this.api.get<{items: SurveyListItem[]}>('/surveys')).items); } catch(e) { this.error.set(failure(e)); } finally { this.loading.set(false); } }
}
